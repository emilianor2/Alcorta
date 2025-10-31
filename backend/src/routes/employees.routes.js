// backend/src/routes/employees.routes.js
import { Router } from "express";
import { pool } from "../db.js";
import { authRequired, requireRole } from "../middleware/auth.js";

const router = Router();

// todas requieren login
router.use(authRequired);

// GET /api/employees
router.get("/", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM employees ORDER BY apellido, nombre"
  );
  res.json({ ok: true, items: rows });
});

// GET /api/employees/:id
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.query(
    "SELECT * FROM employees WHERE id = ?",
    [id]
  );
  if (!rows.length) {
    return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  }
  res.json({ ok: true, employee: rows[0] });
});

// en employees.routes.js, GET /
const [rows] = await pool.query(`
  SELECT e.*,
         u.full_name AS created_by_name
  FROM employees e
  LEFT JOIN users u ON u.id = e.created_by
  ORDER BY e.apellido, e.nombre
`);

// POST /api/employees  (solo admin)
router.post("/", requireRole("admin"), async (req, res) => {
  const {
    apellido,
    nombre,
    dni,
    cuil,
    fecha_nac,
    telefono,
    email,
    direccion,
    localidad,
    provincia,
    puesto,
    fecha_ingreso,
  } = req.body || {};

  if (!apellido || !nombre || !dni || !cuil) {
    return res.status(400).json({ ok: false, error: "MISSING_FIELDS" });
  }

  const userId = req.user.id;

  const [result] = await pool.query(
    `INSERT INTO employees 
     (apellido, nombre, dni, cuil, fecha_nac, telefono, email, direccion, localidad, provincia, puesto, fecha_ingreso, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      apellido,
      nombre,
      dni,
      cuil,
      fecha_nac || null,
      telefono || null,
      email || null,
      direccion || null,
      localidad || null,
      provincia || null,
      puesto || null,
      fecha_ingreso || null,
      userId,
    ]
  );

  res.status(201).json({ ok: true, id: result.insertId });
});

// PUT /api/employees/:id  (solo admin)
router.put("/:id", requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  const {
    apellido,
    nombre,
    dni,
    cuil,
    fecha_nac,
    telefono,
    email,
    direccion,
    localidad,
    provincia,
    puesto,
    fecha_ingreso,
    estado,
  } = req.body || {};

  const userId = req.user.id;

  await pool.query(
    `UPDATE employees
     SET apellido=?, nombre=?, dni=?, cuil=?, fecha_nac=?, telefono=?, email=?, direccion=?, localidad=?, provincia=?, puesto=?, fecha_ingreso=?, estado=?, updated_by=?, updated_at=NOW()
     WHERE id=?`,
    [
      apellido,
      nombre,
      dni,
      cuil,
      fecha_nac || null,
      telefono || null,
      email || null,
      direccion || null,
      localidad || null,
      provincia || null,
      puesto || null,
      fecha_ingreso || null,
      estado || "activo",
      userId,
      id,
    ]
  );

  res.json({ ok: true });
});

export default router;
