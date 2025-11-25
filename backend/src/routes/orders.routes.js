// src/routes/orders.routes.js
import { Router } from "express";
import { pool } from "../db.js";
import { authRequired, requireRole } from "../middleware/auth.js";
import { getCurrentCashSession } from "../utils/cash.js";

const router = Router();
router.use(authRequired);

/** 
 * GET /cash/:cashId/orders
 * Lista pedidos de una caja (opcionalmente filtrados por estado)
 */
router.get("/cash/:cashId/orders", requireRole("admin", "cajero"), async (req, res) => {
  const { cashId } = req.params;
  const { status } = req.query; // ej: ?status=abierto | activos

  const params = [cashId];
  let sql = `
    SELECT o.*
    FROM orders o
    WHERE o.cash_session_id = ?
  `;

  if (status === "activos") {
    sql += " AND o.status = 'abierto'";
  } else if (status) {
    sql += " AND o.status = ?";
    params.push(status);
  }

  sql += " ORDER BY o.created_at DESC";

  const [rows] = await pool.query(sql, params);
  res.json({ ok: true, items: rows });
});

/**
 * GET /orders/kitchen
 * Lista los pedidos activos de la caja abierta para el panel de cocina
 */
router.get(
  "/orders/kitchen",
  requireRole("cocina", "admin", "cajero"),
  async (req, res) => {
  const { prep_status } = req.query;

    const currentSession = await getCurrentCashSession(pool);
    if (!currentSession) {
      return res.status(400).json({ ok: false, error: "NO_CASH_OPEN" });
    }

    const params = [currentSession.id];
    let sql = `
      SELECT o.*
      FROM orders o
      WHERE o.cash_session_id = ?
        AND o.status IN ('abierto','finalizado')
    `;

    if (prep_status) {
      sql += " AND o.prep_status = ?";
      params.push(prep_status);
    }

    sql += " ORDER BY o.created_at ASC";

    let [orders] = await pool.query(sql, params);
    if (!orders.length) {
      return res.json({ ok: true, items: [] });
    }

    orders = orders.map((order) => ({
      ...order,
      prep_status: order.prep_status || "abierto",
    }));

    const ids = orders.map((o) => o.id);
    const [itemsRows] = await pool.query(
      `
        SELECT oi.*, p.name AS product_name
        FROM order_items oi
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id IN (?)
        ORDER BY oi.id ASC
      `,
      [ids]
    );

    const itemsMap = {};
    for (const item of itemsRows) {
      if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
      itemsMap[item.order_id].push(item);
    }

    const enriched = orders.map((order) => ({
      ...order,
      items: itemsMap[order.id] || [],
    }));

    res.json({ ok: true, items: enriched });
  }
);

/**
 * POST /orders
 * Crea un nuevo pedido
 * body: { cash_session_id, items: [...], total }
 */
router.post("/orders", requireRole("admin", "cajero"), async (req, res) => {
  const { cash_session_id, items = [], total } = req.body;

  // 1) obtener siguiente número de pedido para esa caja
  const [rowsNum] = await pool.query(
    "SELECT COALESCE(MAX(order_number), 0) + 1 AS nextNumber FROM orders WHERE cash_session_id = ?",
    [cash_session_id]
  );
  const nextNumber = rowsNum[0].nextNumber;

  // 2) insertar pedido
  const [result] = await pool.query(
    `INSERT INTO orders (cash_session_id, order_number, total, prep_status)
     VALUES (?, ?, ?, 'abierto')`,
    [cash_session_id, nextNumber, total]
  );

  const orderId = result.insertId;

  // 3) opcional: insertar items
  for (const it of items) {
    await pool.query(
      `INSERT INTO order_items (order_id, product_id, description, quantity, unit_price, total)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, it.product_id, it.description, it.quantity, it.unit_price, it.total]
    );
  }

  res.status(201).json({ ok: true, order_id: orderId, order_number: nextNumber });
});

/**
 * GET /orders/:id
 * Devuelve el pedido + sus items
 */
router.get("/orders/:id", async (req, res) => {
  const { id } = req.params;

  const [[order]] = await pool.query("SELECT * FROM orders WHERE id = ?", [id]);
  if (!order) return res.status(404).json({ ok: false, error: "Pedido no encontrado" });

  const [items] = await pool.query("SELECT * FROM order_items WHERE order_id = ?", [id]);

  res.json({ ok: true, order, items });
});

/**
 * PATCH /orders/:id
 * Actualiza estados, total, etc. y opcionalmente los items
 * body: { status?, prep_status?, total?, items? }
 */
router.patch("/orders/:id", requireRole("admin", "cajero"), async (req, res) => {
  const { id } = req.params;
  const { status, prep_status, total, items } = req.body;

  const fields = [];
  const params = [];

  const [[order]] = await pool.query("SELECT status FROM orders WHERE id = ?", [
    id,
  ]);
  if (!order) {
    return res.status(404).json({ ok: false, error: "ORDER_NOT_FOUND" });
  }
  if (order.status === "cerrado") {
    return res.status(400).json({ ok: false, error: "ORDER_CLOSED" });
  }

  if (status) {
    fields.push("status = ?");
    params.push(status);
  }
  if (prep_status) {
    fields.push("prep_status = ?");
    params.push(prep_status);
  }
  if (typeof total === "number") {
    fields.push("total = ?");
    params.push(total);
  }

  // Si no hay nada para actualizar y tampoco items, error
  if (!fields.length && !Array.isArray(items)) {
    return res.status(400).json({ ok: false, error: "Nada para actualizar" });
  }

  // Actualizar campos básicos
  if (fields.length) {
    const sql = `UPDATE orders SET ${fields.join(", ")} WHERE id = ?`;
    params.push(id);
    await pool.query(sql, params);
  }

  // Si vienen items, reseteamos los items del pedido y los volvemos a cargar
  if (Array.isArray(items)) {
    await pool.query("DELETE FROM order_items WHERE order_id = ?", [id]);

    for (const it of items) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, description, quantity, unit_price, total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          it.product_id,
          it.description,
          it.quantity,
          it.unit_price,
          it.total,
        ]
      );
    }

    try {
      await pool.query(
        "UPDATE orders SET was_modified = 1, items_updated_at = NOW() WHERE id = ?",
        [id]
      );
    } catch (err) {
      if (err.code !== "ER_BAD_FIELD_ERROR") {
        throw err;
      }
      await pool.query(
        "UPDATE orders SET was_modified = 1 WHERE id = ?",
        [id]
      );
    }
  }

  res.json({ ok: true });
});

/**
 * PATCH /orders/:id/prep
 * Actualiza únicamente el estado de preparación (panel de cocina)
 */
router.patch(
  "/orders/:id/prep",
  requireRole("cocina", "admin", "cajero"),
  async (req, res) => {
    const { id } = req.params;
    const { prep_status } = req.body || {};

    const allowed = ["en_preparacion", "preparado"];
    if (!allowed.includes(prep_status)) {
      return res.status(400).json({ ok: false, error: "INVALID_PREP_STATUS" });
    }

    const [[order]] = await pool.query(
      "SELECT status FROM orders WHERE id = ?",
      [id]
    );
    if (!order) {
      return res.status(404).json({ ok: false, error: "ORDER_NOT_FOUND" });
    }
    if (order.status === "cerrado") {
      return res.status(400).json({ ok: false, error: "ORDER_CLOSED" });
    }

    try {
      await pool.query(
        "UPDATE orders SET prep_status = ?, updated_at = NOW(), was_modified = 0 WHERE id = ?",
        [prep_status, id]
      );
    } catch (err) {
      if (err.code === "ER_BAD_FIELD_ERROR") {
        await pool.query(
          "UPDATE orders SET prep_status = ?, was_modified = 0 WHERE id = ?",
          [prep_status, id]
        );
      } else {
        throw err;
      }
    }

    res.json({ ok: true });
  }
);


/**
 * POST /orders/:id/charge
 * Marca el pedido como cobrado y genera la venta/comprobante + movimiento de caja.
 * Acá deberías reusar tu lógica actual de "finalizar venta".
 */
router.post("/orders/:id/charge", requireRole("admin", "cajero"), async (req, res) => {
  const { id } = req.params;
  const { payment_method = "efectivo" } = req.body || {};
  const user_id = req.user.id;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[order]] = await conn.query(
      "SELECT * FROM orders WHERE id = ? FOR UPDATE",
      [id]
    );
    if (!order) {
      await conn.rollback();
      return res.status(404).json({ ok: false, error: "ORDER_NOT_FOUND" });
    }
    if (order.status === "cerrado") {
      await conn.rollback();
      return res.status(400).json({ ok: false, error: "ORDER_ALREADY_CLOSED" });
    }

    const [items] = await conn.query(
      "SELECT * FROM order_items WHERE order_id = ?",
      [id]
    );
    if (!items.length) {
      await conn.rollback();
      return res.status(400).json({ ok: false, error: "ORDER_WITHOUT_ITEMS" });
    }

    const [[cashSession]] = await conn.query(
      "SELECT * FROM cash_sessions WHERE id = ? FOR UPDATE",
      [order.cash_session_id]
    );
    if (!cashSession) {
      await conn.rollback();
      return res.status(400).json({ ok: false, error: "CASH_SESSION_NOT_FOUND" });
    }
    if (cashSession.status !== "abierta") {
      await conn.rollback();
      return res
        .status(400)
        .json({ ok: false, error: "CASH_SESSION_CLOSED" });
    }

    const itemsTotal = items.reduce(
      (acc, it) => acc + Number(it.unit_price) * Number(it.quantity),
      0
    );
    const total =
      Number(order.total || 0) > 0 ? Number(order.total) : itemsTotal;

    const [saleResult] = await conn.query(
      `
      INSERT INTO sales
        (user_id, total, payment_method, cash_session_id, shift_number, created_at)
      VALUES (?,?,?,?,?, NOW())
      `,
      [
        user_id,
        total,
        payment_method,
        cashSession.id,
        cashSession.shift_number,
      ]
    );
    const saleId = saleResult.insertId;

    const saleItemsValues = items.map((it) => [
      saleId,
      it.product_id,
      it.quantity,
      Number(it.unit_price),
    ]);
    await conn.query(
      "INSERT INTO sale_items (sale_id, product_id, qty, price) VALUES ?",
      [saleItemsValues]
    );

    await conn.query(
      `
      INSERT INTO cash_movements
        (session_id, type, amount, reference, user_id, created_at)
      VALUES (?,?,?,?,?, NOW())
      `,
      [
        cashSession.id,
        "venta",
        total,
        `Venta #${saleId} (${payment_method})`,
        user_id,
      ]
    );

    await conn.query(
      "UPDATE orders SET status = 'finalizado', prep_status = 'preparado', was_modified = 0, closed_at = NOW() WHERE id = ?",
      [id]
    );

    await conn.commit();
    res.json({
      ok: true,
      message: "Pedido cobrado y cerrado",
      sale_id: saleId,
      total,
    });
  } catch (err) {
    await conn.rollback();
    console.error("ORDER_CHARGE_ERROR", err);
    res.status(500).json({ ok: false, error: "ORDER_CHARGE_ERROR" });
  } finally {
    conn.release();
  }
});

export default router;
