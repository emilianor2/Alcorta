// backend/src/routes/customers.routes.js
import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

router.use(authRequired);

/**
 * GET /api/customers
 * Lista todos los clientes
 */
router.get("/", async (req, res) => {
  const { search } = req.query;
  let query = `
    SELECT c.*, u.full_name AS created_by_name
    FROM customers c
    LEFT JOIN users u ON u.id = c.created_by
  `;
  const params = [];

  if (search) {
    query += ` WHERE 
      c.razon_social LIKE ? OR 
      c.numero_documento LIKE ? OR
      CONCAT(c.nombre, ' ', c.apellido) LIKE ?
    `;
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  query += " ORDER BY c.created_at DESC";

  try {
    const [rows] = await pool.query(query, params);
    res.json({ ok: true, items: rows });
  } catch (e) {
    console.error("Error cargando clientes", e);
    res.status(500).json({ ok: false, error: "ERROR_LOADING_CUSTOMERS" });
  }
});

/**
 * GET /api/customers/:id
 * Obtiene un cliente por ID
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query("SELECT * FROM customers WHERE id = ?", [id]);
    if (!rows.length) {
      return res.status(404).json({ ok: false, error: "CUSTOMER_NOT_FOUND" });
    }
    res.json({ ok: true, customer: rows[0] });
  } catch (e) {
    console.error("Error cargando cliente", e);
    res.status(500).json({ ok: false, error: "ERROR_LOADING_CUSTOMER" });
  }
});

/**
 * POST /api/customers
 * Crea un nuevo cliente
 */
router.post("/", async (req, res) => {
  const {
    razon_social,
    nombre,
    apellido,
    tipo_documento = "DNI",
    numero_documento,
    condicion_iva = "CF",
    tipo_cliente = "Fisica",
    direccion,
    localidad,
    provincia,
    codigo_postal,
    telefono,
    email,
  } = req.body || {};

  if (!razon_social || !numero_documento) {
    return res.status(400).json({ ok: false, error: "MISSING_REQUIRED_FIELDS" });
  }

  const userId = req.user.id;

  try {
    // Verificar si ya existe un cliente con ese documento
    const [existing] = await pool.query(
      "SELECT id FROM customers WHERE numero_documento = ?",
      [numero_documento]
    );
    if (existing.length > 0) {
      return res.status(400).json({ ok: false, error: "CUSTOMER_ALREADY_EXISTS" });
    }

    const [result] = await pool.query(
      `INSERT INTO customers (
        razon_social, nombre, apellido, tipo_documento, numero_documento,
        condicion_iva, tipo_cliente, direccion, localidad, provincia,
        codigo_postal, telefono, email, created_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        razon_social,
        nombre || null,
        apellido || null,
        tipo_documento,
        numero_documento,
        condicion_iva,
        tipo_cliente,
        direccion || null,
        localidad || null,
        provincia || null,
        codigo_postal || null,
        telefono || null,
        email || null,
        userId,
      ]
    );

    const [newCustomer] = await pool.query("SELECT * FROM customers WHERE id = ?", [
      result.insertId,
    ]);

    res.status(201).json({ ok: true, customer: newCustomer[0] });
  } catch (e) {
    console.error("Error creando cliente", e);
    res.status(500).json({ ok: false, error: "ERROR_CREATING_CUSTOMER" });
  }
});

export default router;

