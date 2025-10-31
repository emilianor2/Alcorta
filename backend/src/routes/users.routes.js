// backend/src/routes/users.routes.js
import { Router } from "express";
import { pool } from "../db.js";
import { authRequired, requireRole } from "../middleware/auth.js";
import bcrypt from "bcryptjs";

const router = Router();

router.use(authRequired);

// GET /api/users  (solo admin)
router.get("/", requireRole("admin"), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.role, u.employee_id,
            e.apellido, e.nombre
     FROM users u
     LEFT JOIN employees e ON e.id = u.employee_id
     ORDER BY u.id DESC`
  );
  res.json({ ok: true, items: rows });
});

// POST /api/users  (solo admin) -> crear usuario del sistema
router.post("/", requireRole("admin"), async (req, res) => {
  const { email, full_name, password, role = "cajero", employee_id = null } =
    req.body || {};

  if (!email || !full_name || !password) {
    return res.status(400).json({ ok: false, error: "MISSING_FIELDS" });
  }

  const passHash = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role, employee_id)
     VALUES (?,?,?,?,?)`,
    [email, passHash, full_name, role, employee_id]
  );

  res.status(201).json({ ok: true, id: result.insertId });
});

// PUT /api/users/:id  (solo admin) -> cambiar rol o asociar empleado
router.put("/:id", requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  const { full_name, role, employee_id } = req.body || {};

  await pool.query(
    `UPDATE users
     SET full_name = COALESCE(?, full_name),
         role = COALESCE(?, role),
         employee_id = ?
     WHERE id = ?`,
    [full_name || null, role || null, employee_id || null, id]
  );

  res.json({ ok: true });
});

// POST /api/users/from-employee  (convierte empleado en user)
router.post("/from-employee", requireRole("admin"), async (req, res) => {
  const { employee_id, email, password, role = "cajero" } = req.body || {};
  if (!employee_id || !email || !password) {
    return res.status(400).json({ ok: false, error: "MISSING_FIELDS" });
  }

  // buscamos datos del empleado
  const [erows] = await pool.query(
    "SELECT * FROM employees WHERE id = ?",
    [employee_id]
  );
  const emp = erows[0];
  if (!emp) {
    return res.status(404).json({ ok: false, error: "EMPLOYEE_NOT_FOUND" });
  }

  const passHash = await bcrypt.hash(password, 10);

  const fullName = `${emp.nombre} ${emp.apellido}`.trim();

  const [result] = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role, employee_id)
     VALUES (?,?,?,?,?)`,
    [email, passHash, fullName, role, employee_id]
  );

  res.status(201).json({ ok: true, id: result.insertId });
});

export default router;
