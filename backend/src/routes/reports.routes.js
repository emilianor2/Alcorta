// src/routes/reports.routes.js
import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

router.use(authRequired);

/**
 * GET /api/reports/cash
 * ?from=YYYY-MM-DD&to=YYYY-MM-DD&shift=1
 *
 * Devuelve:
 * {
 *   ok: true,
 *   items: [
 *     {
 *       cash: {...},
 *       sales: [...],
 *       movements: [...]
 *     }
 *   ]
 * }
 */
router.get("/cash", async (req, res) => {
  const { from, to, shift } = req.query;

  const where = [];
  const params = [];

  if (from) {
    where.push("DATE(c.opened_at) >= ?");
    params.push(from);
  }
  if (to) {
    where.push("DATE(c.opened_at) <= ?");
    params.push(to);
  }
  if (shift) {
    where.push("c.shift_number = ?");
    params.push(shift);
  }

  const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

// 1) Traigo las cajas del rango
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

  // si no hay cajas -> vacío
  if (!cashRows.length) {
    return res.json({ ok: true, items: [] });
  }

  const cashIds = cashRows.map((c) => c.id);

  // 2) Ventas de esas cajas
  let salesRows = [];
  {
    const placeholders = cashIds.map(() => "?").join(",");
    const [rows] = await pool.query(
      `
      SELECT
        s.id,
        s.total,
        s.payment_method,
        s.created_at,
        s.cash_session_id,
        u.full_name AS user_name
      FROM sales s
      LEFT JOIN users u ON u.id = s.user_id
      WHERE s.cash_session_id IN (${placeholders})
      ORDER BY s.created_at ASC
      `,
      cashIds
    );
    salesRows = rows;
  }

  // 3) Movimientos de esas cajas
  let movRows = [];
  {
    const placeholders = cashIds.map(() => "?").join(",");
    const [rows] = await pool.query(
      `
      SELECT
        m.id,
        m.type,
        m.amount,
        m.reference,
        m.created_at,
        m.session_id,
        u.full_name AS user_name
      FROM cash_movements m
      LEFT JOIN users u ON u.id = m.user_id
      WHERE m.session_id IN (${placeholders})
      ORDER BY m.created_at ASC
      `,
      cashIds
    );
    movRows = rows;
  }

  // 4) Armo respuesta agrupada
  const result = cashRows.map((c) => ({
    cash: c,
    sales: salesRows.filter((s) => s.cash_session_id === c.id),
    movements: movRows.filter((m) => m.session_id === c.id),
  }));

  res.json({ ok: true, items: result });
});

export default router;
