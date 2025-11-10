// backend/src/routes/invoices.routes.js
import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

/**
 * POST /api/invoices
 * Crea un comprobante para una venta
 * body: { sale_id, customer_id (opcional), tipo_comprobante: 'A'|'B', punto_venta }
 */
router.post("/", async (req, res) => {
  const { sale_id, customer_id, tipo_comprobante, punto_venta = 1 } = req.body || {};
  const userId = req.user.id;

  if (!sale_id || !tipo_comprobante) {
    return res.status(400).json({ ok: false, error: "MISSING_REQUIRED_FIELDS" });
  }
  if (!["A", "B"].includes(tipo_comprobante)) {
    return res.status(400).json({ ok: false, error: "INVALID_INVOICE_TYPE" });
  }
  if (tipo_comprobante === "A" && !customer_id) {
    return res.status(400).json({ ok: false, error: "INVOICE_A_REQUIRES_CUSTOMER" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Venta
    const [saleRows] = await conn.query("SELECT * FROM sales WHERE id = ?", [sale_id]);
    if (!saleRows.length) {
      await conn.rollback();
      return res.status(404).json({ ok: false, error: "SALE_NOT_FOUND" });
    }
    const sale = saleRows[0];

    // 2) Items de la venta
    const [itemsRows] = await conn.query(
      `SELECT si.*, p.name AS product_name
       FROM sale_items si
       LEFT JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = ?`,
      [sale_id]
    );

    // 3) Cliente (si aplica)
    let customer = null;
    if (customer_id) {
      const [customerRows] = await conn.query("SELECT * FROM customers WHERE id = ?", [customer_id]);
      if (!customerRows.length) {
        await conn.rollback();
        return res.status(400).json({ ok: false, error: "CUSTOMER_NOT_FOUND" });
      }
      customer = customerRows[0];
      if (tipo_comprobante === "A" && customer.condicion_iva !== "RI") {
        await conn.rollback();
        return res.status(400).json({ ok: false, error: "INVOICE_A_REQUIRES_RI_CUSTOMER" });
      }
    }

    // 4) IVA/Subtotal/Total
    const precioVenta = Number(sale.total);
    let subtotal, iva, total;

    if (tipo_comprobante === "A") {
      total = precioVenta;
      subtotal = Math.round(precioVenta * 0.79 * 100) / 100; // 79%
      iva = Math.round(precioVenta * 0.21 * 100) / 100;      // 21%
      const diff = total - (subtotal + iva);
      iva = Math.round((iva + diff) * 100) / 100;
    } else {
      subtotal = precioVenta;
      iva = 0;
      total = precioVenta;
    }

    // 5) Próximo número
    const [last] = await conn.query(
      `SELECT numero_comprobante
       FROM invoices
       WHERE punto_venta = ? AND tipo_comprobante = ?
       ORDER BY numero_comprobante DESC
       LIMIT 1`,
      [punto_venta, tipo_comprobante]
    );
    const nextNumber = last.length ? Number(last[0].numero_comprobante) + 1 : 1;

    // 6) Insert comprobante
    const [invoiceResult] = await conn.query(
      `INSERT INTO invoices (
        sale_id, customer_id, tipo_comprobante, punto_venta, numero_comprobante,
        subtotal, iva, total, condicion_venta,
        cliente_razon_social, cliente_documento, cliente_direccion, cliente_condicion_iva,
        created_by, fecha_emision
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, NOW())`,
      [
        sale_id,
        customer_id || null,
        tipo_comprobante,
        punto_venta,
        nextNumber,
        subtotal,
        iva,
        total,
        "Contado",
        customer?.razon_social ||
          (customer ? `${customer.nombre} ${customer.apellido}`.trim() : null) ||
          "Consumidor Final",
        customer?.numero_documento || null,
        customer?.direccion || null,
        customer?.condicion_iva || "CF",
        userId,
      ]
    );

    // 7) Comprobante completo
    const [invoiceRows] = await conn.query(
      `SELECT i.*, s.total AS sale_total, s.created_at AS sale_date,
              c.razon_social AS customer_razon_social, c.nombre AS customer_nombre,
              c.apellido AS customer_apellido, c.direccion AS customer_direccion,
              c.numero_documento AS customer_documento, c.condicion_iva AS customer_condicion_iva
       FROM invoices i
       LEFT JOIN sales s ON s.id = i.sale_id
       LEFT JOIN customers c ON c.id = i.customer_id
       WHERE i.id = ?`,
      [invoiceResult.insertId]
    );

    await conn.commit();

    const invoice = invoiceRows[0];
    invoice.items = itemsRows;

    res.status(201).json({ ok: true, invoice });
  } catch (e) {
    await conn.rollback();
    console.error("Error creando comprobante", e);
    res.status(500).json({ ok: false, error: "ERROR_CREATING_INVOICE" });
  } finally {
    conn.release();
  }
});

/**
 * GET /api/invoices (listado con filtros opcionales)
 * Query: from=YYYY-MM-DD&to=YYYY-MM-DD&tipo=A|B
 */
router.get("/", async (req, res) => {
  const { from, to, tipo } = req.query;
  const where = [];
  const params = [];

  if (from) { where.push("DATE(i.fecha_emision) >= ?"); params.push(from); }
  if (to)   { where.push("DATE(i.fecha_emision) <= ?"); params.push(to); }
  if (tipo) { where.push("i.tipo_comprobante = ?");     params.push(tipo); }

  const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `
    SELECT
      i.*,
      COALESCE(c.razon_social, 'Consumidor Final') AS cliente_razon_social,
      c.numero_documento AS cliente_documento
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    ${whereSQL}
    ORDER BY i.fecha_emision DESC, i.id DESC
    `,
    params
  );

  res.json({ ok: true, items: rows });
});

/**
 * GET /api/invoices/:id
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [invoiceRows] = await pool.query(
      `SELECT i.*, s.total AS sale_total, s.created_at AS sale_date,
              c.razon_social AS customer_razon_social, c.nombre AS customer_nombre,
              c.apellido AS customer_apellido, c.direccion AS customer_direccion,
              c.numero_documento AS customer_documento, c.condicion_iva AS customer_condicion_iva
       FROM invoices i
       LEFT JOIN sales s ON s.id = i.sale_id
       LEFT JOIN customers c ON c.id = i.customer_id
       WHERE i.id = ?`,
      [id]
    );
    if (!invoiceRows.length) return res.status(404).json({ ok: false, error: "INVOICE_NOT_FOUND" });

    const invoice = invoiceRows[0];
    const [itemsRows] = await pool.query(
      `SELECT si.*, p.name AS product_name
       FROM sale_items si
       LEFT JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = ?`,
      [invoice.sale_id]
    );
    invoice.items = itemsRows;

    res.json({ ok: true, invoice });
  } catch (e) {
    console.error("Error cargando comprobante", e);
    res.status(500).json({ ok: false, error: "ERROR_LOADING_INVOICE" });
  }
});

/**
 * GET /api/invoices/sale/:saleId
 */
router.get("/sale/:saleId", async (req, res) => {
  const { saleId } = req.params;
  try {
    const [invoiceRows] = await pool.query(
      `SELECT i.*, s.total AS sale_total, s.created_at AS sale_date,
              c.razon_social AS customer_razon_social, c.nombre AS customer_nombre,
              c.apellido AS customer_apellido, c.direccion AS customer_direccion,
              c.numero_documento AS customer_documento, c.condicion_iva AS customer_condicion_iva
       FROM invoices i
       LEFT JOIN sales s ON s.id = i.sale_id
       LEFT JOIN customers c ON c.id = i.customer_id
       WHERE i.sale_id = ?
       ORDER BY i.created_at DESC
       LIMIT 1`,
      [saleId]
    );
    if (!invoiceRows.length) return res.status(404).json({ ok: false, error: "INVOICE_NOT_FOUND" });

    const invoice = invoiceRows[0];
    const [itemsRows] = await pool.query(
      `SELECT si.*, p.name AS product_name
       FROM sale_items si
       LEFT JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = ?`,
      [saleId]
    );
    invoice.items = itemsRows;

    res.json({ ok: true, invoice });
  } catch (e) {
    console.error("Error cargando comprobante", e);
    res.status(500).json({ ok: false, error: "ERROR_LOADING_INVOICE" });
  }
});

export default router;
