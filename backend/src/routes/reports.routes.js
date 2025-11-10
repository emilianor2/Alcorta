// backend/src/routes/reports.routes.js
import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

/**
 * GET /api/reports/cash
 * ?from=YYYY-MM-DD&to=YYYY-MM-DD&shift=1
 *
 * Respuesta:
 * {
 *   ok: true,
 *   items: [
 *     {
 *       cash: {...},
 *       sales: [...],        // ventas con user_name y customer_name
 *       movements: [...],    // movimientos con user_name y supplier_name
 *       invoices: [...]      // comprobantes con cliente
 *     }
 *   ]
 * }
 */
router.get("/cash", async (req, res) => {
  const { from, to, shift } = req.query;

  const where = [];
  const params = [];

  if (from) { where.push("DATE(c.opened_at) >= ?"); params.push(from); }
  if (to)   { where.push("DATE(c.opened_at) <= ?"); params.push(to); }
  if (shift){ where.push("c.shift_number = ?");     params.push(shift); }

  const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // 1️⃣ Cajas dentro del rango
  const [cashRows] = await pool.query(
    `
    SELECT
      c.id,
      c.opening_amount,
      c.closing_amount,
      c.status,
      c.opened_at,
      c.closed_at,
      c.shift_number,
      u1.full_name AS opened_by_name,
      u2.full_name AS closed_by_name
    FROM cash_sessions c
    LEFT JOIN users u1 ON u1.id = c.opened_by
    LEFT JOIN users u2 ON u2.id = c.closed_by
    ${whereSQL}
    ORDER BY c.opened_at ASC
    `,
    params
  );

  if (!cashRows.length) return res.json({ ok: true, items: [] });

  const cashIds = cashRows.map((c) => c.id);
  const placeholders = cashIds.map(() => "?").join(",");

  // 2️⃣ Ventas con cliente (desde invoice si existe)
  const [salesRows] = await pool.query(
    `
    SELECT
      s.id,
      s.total,
      s.payment_method,
      s.created_at,
      s.cash_session_id,
      s.shift_number,
      u.full_name AS user_name,
      COALESCE(cu.razon_social, 'Consumidor Final') AS customer_name
    FROM sales s
    LEFT JOIN users u ON u.id = s.user_id
    LEFT JOIN invoices i ON i.sale_id = s.id
    LEFT JOIN customers cu ON cu.id = i.customer_id
    WHERE s.cash_session_id IN (${placeholders})
    ORDER BY s.created_at ASC
    `,
    cashIds
  );

  // 3️⃣ Movimientos con proveedor
  const [movRows] = await pool.query(
    `
    SELECT
      m.id,
      m.type,
      m.amount,
      m.reference,
      m.created_at,
      m.session_id,
      u.full_name AS user_name,
      s.razon_social AS supplier_name
    FROM cash_movements m
    LEFT JOIN users u ON u.id = m.user_id
    LEFT JOIN suppliers s ON s.id = m.supplier_id
    WHERE m.session_id IN (${placeholders})
    ORDER BY m.created_at ASC
    `,
    cashIds
  );

  // 4️⃣ Comprobantes asociados a esas cajas
  const [invoiceRows] = await pool.query(
    `
    SELECT
      i.id,
      i.sale_id,
      i.tipo_comprobante,
      i.punto_venta,
      i.numero_comprobante,
      i.fecha_emision,
      i.subtotal,
      i.iva,
      i.total,
      s.cash_session_id,
      COALESCE(cu.razon_social, 'Consumidor Final') AS customer_name
    FROM invoices i
    LEFT JOIN customers cu ON cu.id = i.customer_id
    INNER JOIN sales s ON s.id = i.sale_id
    WHERE s.cash_session_id IN (${placeholders})
    ORDER BY i.fecha_emision ASC, i.id ASC
    `,
    cashIds
  );

  // 5️⃣ Armar respuesta final agrupada por caja
  const result = cashRows.map((c) => ({
    cash: c,
    sales: salesRows.filter((s) => s.cash_session_id === c.id),
    movements: movRows.filter((m) => m.session_id === c.id),
    invoices: invoiceRows.filter((inv) => inv.cash_session_id === c.id),
  }));

  res.json({ ok: true, items: result });
});

export default router;
