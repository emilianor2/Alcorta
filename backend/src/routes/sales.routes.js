// backend/src/routes/sales.routes.js
import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { getCurrentCashSession } from "../utils/cash.js";

const router = Router();

// todo lo de ventas requiere login
router.use(authRequired);

/**
 * POST /api/sales
 * body: { items:[{product_id, qty, price}], payment_method }
 */
router.post("/", async (req, res) => {
  const { items, payment_method = "efectivo" } = req.body || {};
  const user_id = req.user.id; // 👈 viene del token

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, error: "NO_ITEMS" });
  }

  // 1) tiene que haber caja abierta
  const currentSession = await getCurrentCashSession(pool);
  if (!currentSession) {
    return res.status(400).json({ ok: false, error: "NO_CASH_OPEN" });
  }

  // 2) calculo total
  const total = items.reduce(
    (acc, it) => acc + Number(it.price) * Number(it.qty),
    0
  );

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 3) insert venta con caja y turno
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
        currentSession.id,          // caja actual
        currentSession.shift_number // turno actual
      ]
    );
    const saleId = saleResult.insertId;

    // 4) insert detalle
    const values = items.map((it) => [
      saleId,
      it.product_id,
      it.qty,
      it.price,
    ]);
    await conn.query(
      "INSERT INTO sale_items (sale_id, product_id, qty, price) VALUES ?",
      [values]
    );

    // 5) movimiento en caja
    await conn.query(
      `
      INSERT INTO cash_movements
        (session_id, type, amount, reference, user_id, created_at)
      VALUES (?,?,?,?,?, NOW())
      `,
      [
        currentSession.id,
        "venta",
        total,
        `Venta #${saleId} (${payment_method})`,
        user_id,
      ]
    );

    await conn.commit();

    res.status(201).json({
      ok: true,
      sale_id: saleId,
      total,
      cash_session_id: currentSession.id,
      shift_number: currentSession.shift_number,
    });
  } catch (e) {
    await conn.rollback();
    console.error("SALE_ERROR", e);
    res.status(500).json({ ok: false, error: "SALE_ERROR" });
  } finally {
    conn.release();
  }
});

/**
 * GET /api/sales
 * permite filtrar por fecha y por turno (lo usa Reportes.jsx)
 */
router.get("/", async (req, res) => {
  const { from, to, shift } = req.query;
  const where = [];
  const params = [];

  if (from) {
    where.push("DATE(s.created_at) >= ?");
    params.push(from);
  }
  if (to) {
    where.push("DATE(s.created_at) <= ?");
    params.push(to);
  }
  if (shift) {
    where.push("s.shift_number = ?");
    params.push(shift);
  }

  const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `
    SELECT
      s.id,
      s.total,
      s.payment_method,
      s.created_at,
      s.cash_session_id,
      s.shift_number,
      u.full_name AS user_name,
      COALESCE(c.razon_social, 'Consumidor Final') AS customer_name
    FROM sales s
    LEFT JOIN users u ON u.id = s.user_id
    LEFT JOIN invoices i ON i.sale_id = s.id
    LEFT JOIN customers c ON c.id = i.customer_id
    ${whereSQL}
    ORDER BY s.created_at DESC
    `,
    params
  );

  res.json({ ok: true, items: rows });
});

/**
 * GET /api/sales/summary
 */
router.get("/summary", async (req, res) => {
  const { from, to, shift } = req.query;
  const where = [];
  const params = [];

  if (from) {
    where.push("DATE(created_at) >= ?");
    params.push(from);
  }
  if (to) {
    where.push("DATE(created_at) <= ?");
    params.push(to);
  }
  if (shift) {
    where.push("shift_number = ?");
    params.push(shift);
  }

  const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `
    SELECT 
      COUNT(*) AS ventas,
      COALESCE(SUM(total),0) AS total,
      SUM(payment_method='efectivo') AS cant_efectivo,
      SUM(payment_method='qr') AS cant_qr
    FROM sales
    ${whereSQL}
    `,
    params
  );

  res.json({ ok: true, ...rows[0] });
});

export default router;
