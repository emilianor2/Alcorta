// backend/src/utils/cash.js
import { pool } from "../db.js";

/**
 * Devuelve la caja abierta más reciente (o null)
 */
export async function getCurrentCashSession(connOrPool = pool) {
  const [rows] = await connOrPool.query(
    "SELECT * FROM cash_sessions WHERE status='abierta' ORDER BY id DESC LIMIT 1"
  );
  return rows[0] || null;
}

/**
 * Devuelve el próximo número de turno para HOY.
 * Ej: si hoy hay turnos 1 y 2, devuelve 3.
 * Si hoy no hay turnos, devuelve 1.
 */
export async function getNextShiftNumber(connOrPool = pool) {
  const [rows] = await connOrPool.query(
    `
    SELECT COALESCE(MAX(shift_number), 0) AS last_shift
    FROM cash_sessions
    WHERE DATE(opened_at) = CURDATE()
    `
  );
  const last = rows[0]?.last_shift || 0;
  return last + 1;
}
