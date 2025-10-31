// backend/src/routes/suppliers.routes.js
import { Router } from "express";
import { pool } from "../db.js";
import { authRequired, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authRequired);

// GET /api/suppliers
router.get("/", async (req, res) => {
  const [rows] = await pool.query(
    `
    SELECT s.*, u.full_name AS created_by_name
    FROM suppliers s
    LEFT JOIN users u ON u.id = s.created_by
    ORDER BY s.created_at DESC
    `
  );
  res.json({ ok: true, items: rows });
});

// POST /api/suppliers
router.post("/", requireRole("admin"), async (req, res) => {
  const {
    razon_social,
    cuit,
    iibb,
    condicion_iva,
    telefono,
    email,
    direccion,
    localidad,
    provincia,
    contacto,
    notas,
  } = req.body || {};

  if (!razon_social || !cuit) {
    return res.status(400).json({ ok: false, error: "MISSING_FIELDS" });
  }

  const userId = req.user.id;

  const [result] = await pool.query(
    `
    INSERT INTO suppliers
      (razon_social, cuit, iibb, condicion_iva, telefono, email, direccion, localidad, provincia, contacto, notas, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `,
    [
      razon_social,
      cuit,
      iibb || null,
      condicion_iva || "CF",
      telefono || null,
      email || null,
      direccion || null,
      localidad || null,
      provincia || null,
      contacto || null,
      notas || null,
      userId,
    ]
  );

  const [row] = await pool.query(
    "SELECT * FROM suppliers WHERE id = ?",
    [result.insertId]
  );

  res.status(201).json({ ok: true, supplier: row[0] });
});

// PUT /api/suppliers/:id
router.put("/:id", requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  const {
    razon_social,
    cuit,
    iibb,
    condicion_iva,
    telefono,
    email,
    direccion,
    localidad,
    provincia,
    contacto,
    notas,
  } = req.body || {};
  const userId = req.user.id;

  await pool.query(
    `
    UPDATE suppliers
    SET razon_social=?, cuit=?, iibb=?, condicion_iva=?, telefono=?, email=?, direccion=?, localidad=?, provincia=?, contacto=?, notas=?, updated_by=?, updated_at=NOW()
    WHERE id = ?
    `,
    [
      razon_social,
      cuit,
      iibb || null,
      condicion_iva || "CF",
      telefono || null,
      email || null,
      direccion || null,
      localidad || null,
      provincia || null,
      contacto || null,
      notas || null,
      userId,
      id,
    ]
  );

  res.json({ ok: true });
});

// DELETE /api/suppliers/:id
router.delete("/:id", requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM suppliers WHERE id = ?", [id]);
  res.json({ ok: true });
});

export default router;
