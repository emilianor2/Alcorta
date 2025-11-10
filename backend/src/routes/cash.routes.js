// backend/src/routes/cash.routes.js
import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import {
  getCurrentCashSession,
  getNextShiftNumber,
} from "../utils/cash.js";

const router = Router();

// todas las rutas de caja requieren login
router.use(authRequired);

/**
 * GET /api/cash/current
 * devuelve la caja abierta (si hay)
 */
router.get("/current", async (req, res) => {
  const session = await getCurrentCashSession(pool);
  res.json({ ok: true, session });
});

/**
 * POST /api/cash/open
 * body: { opening_amount }
 * crea caja nueva con turno del día
 */
router.post("/open", async (req, res) => {
  const userId = req.user.id;

  // no permitir abrir si ya hay una abierta
  const current = await getCurrentCashSession(pool);
  if (current) {
    return res.status(400).json({ ok: false, error: "CASH_ALREADY_OPEN", session: current });
  }

  const nextShift = await getNextShiftNumber(pool);

  const [result] = await pool.query(
    `INSERT INTO cash_sessions (opening_amount, status, shift_number, opened_by, opened_at)
     VALUES (0, 'abierta', ?, ?, NOW())`,
    [nextShift, userId]
  );

  res.status(201).json({
    ok: true,
    id: result.insertId,
    shift_number: nextShift,
  });
});


/**
 * POST /api/cash/close/:id
 * body: { closing_amount }
 */
router.post("/close/:id", async (req, res) => {
  const { id } = req.params;
  const { closing_amount } = req.body || {};
  const userId = req.user.id;             // 👈 quién cierra

  if (closing_amount === undefined || closing_amount === null) {
    return res.status(400).json({ ok: false, error: "CLOSING_REQUIRED" });
  }

  // traigo la caja
  const [rows] = await pool.query(
    "SELECT * FROM cash_sessions WHERE id = ?",
    [id]
  );
  const session = rows[0];
  if (!session) {
    return res.status(404).json({ ok: false, error: "CASH_NOT_FOUND" });
  }
  if (session.status === "cerrada") {
    return res.status(400).json({ ok: false, error: "CASH_ALREADY_CLOSED" });
  }

  // calculamos diferencia
  const diff = Number(closing_amount) - Number(session.opening_amount);

  await pool.query(
    `UPDATE cash_sessions
     SET status='cerrada',
         closed_at = NOW(),
         closing_amount = ?,
         difference = ?,
         closed_by = ?              -- 👈 guardamos quién cerró
     WHERE id = ?`,
    [Number(closing_amount), diff, userId, id]
  );

  res.json({ ok: true, id, difference: diff });
});

/**
 * GET /api/cash/movements/:sessionId
 */
router.get("/movements/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  try {
    const [rows] = await pool.query(
      `
      SELECT
        m.*,
        u.full_name AS user_name,
        s.razon_social AS supplier_name,

        -- Solo mostrar cliente cuando el movimiento es una venta
        CASE
          WHEN m.type = 'venta'
            THEN COALESCE(c.razon_social, 'Consumidor Final')
          ELSE NULL
        END AS customer_name

      FROM cash_movements m
      LEFT JOIN users u     ON u.id = m.user_id
      LEFT JOIN suppliers s ON s.id = m.supplier_id

      -- Detectar el sale_id leyendo el número después de '#'
      LEFT JOIN sales sa ON sa.id = CASE
        WHEN m.type = 'venta' AND m.reference LIKE 'Venta #%'
          THEN CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(m.reference, '#', -1), ' ', 1) AS UNSIGNED)
        ELSE NULL
      END

      -- Traer la factura (si existe) y su cliente
      LEFT JOIN invoices  i ON i.sale_id = sa.id
      LEFT JOIN customers c ON c.id = i.customer_id

      WHERE m.session_id = ?
      ORDER BY m.id DESC
      `,
      [sessionId]
    );

    res.json({ ok: true, items: rows });
  } catch (err) {
    console.error("❌ Error en GET /cash/movements:", err);
    res.status(500).json({ ok: false, error: "DB_QUERY_ERROR" });
  }
});



/**
 * POST /api/cash/movement/manual
 * body: { type, amount, reference, supplier_id }
 */
router.post("/movement/manual", async (req, res) => {
  const { type = "ingreso", amount, reference = "", supplier_id = null } = req.body || {};
  const userId = req.user.id;            // 👈 quién hizo el mov

  if (!amount) {
    return res.status(400).json({ ok: false, error: "AMOUNT_REQUIRED" });
  }

  const session = await getCurrentCashSession(pool);
  if (!session) {
    return res.status(400).json({ ok: false, error: "NO_CASH_OPEN" });
  }

  // Verificar si supplier_id existe si se proporciona
  if (supplier_id) {
    const [supplierRows] = await pool.query(
      "SELECT id FROM suppliers WHERE id = ?",
      [supplier_id]
    );
    if (!supplierRows.length) {
      return res.status(400).json({ ok: false, error: "SUPPLIER_NOT_FOUND" });
    }
  }

  // Intentar insertar con supplier_id (si la columna existe) o sin ella
  try {
    await pool.query(
      `INSERT INTO cash_movements (session_id, type, amount, reference, user_id, supplier_id, created_at)
       VALUES (?,?,?,?,?,?, NOW())`,
      [session.id, type, Number(amount), reference, userId, supplier_id || null]
    );
  } catch (err) {
    // Si la columna supplier_id no existe, insertar sin ella
    if (err.code === "ER_BAD_FIELD_ERROR") {
      await pool.query(
        `INSERT INTO cash_movements (session_id, type, amount, reference, user_id, created_at)
         VALUES (?,?,?,?,?, NOW())`,
        [session.id, type, Number(amount), reference, userId]
      );
    } else {
      throw err;
    }
  }

  res.status(201).json({ ok: true });
});

export default router;

/**
 * POST /api/cash/opening/:id
 * body: { amount }
 * Actualiza el monto de apertura de una caja ya creada
 */
router.post("/opening/:id", async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body || {};
  if (!amount) {
    return res.status(400).json({ ok: false, error: "AMOUNT_REQUIRED" });
  }

  await pool.query(
    `UPDATE cash_sessions SET opening_amount = ? WHERE id = ?`,
    [Number(amount), id]
  );

  res.json({ ok: true });
});
