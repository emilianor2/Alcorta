import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

/** LISTAR */
router.get("/", async (_req, res) => {
  const [rows] = await pool.query(
    "SELECT id, name, price, sku, created_at FROM products ORDER BY id DESC"
  );
  res.json({ ok: true, items: rows });
});

/** CREAR */
router.post("/", async (req, res) => {
  const { name, price, sku } = req.body || {};
  if (!name || price == null) {
    return res.status(400).json({ ok: false, error: "name y price son requeridos" });
  }
  const [r] = await pool.query(
    "INSERT INTO products (name, price, sku) VALUES (?,?,?)",
    [name, Number(price), sku || null]
  );
  res.json({ ok: true, id: r.insertId });
});

/** EDITAR */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, price, sku } = req.body || {};
  const [r] = await pool.query(
    "UPDATE products SET name=COALESCE(?,name), price=COALESCE(?,price), sku=COALESCE(?,sku) WHERE id=?",
    [name ?? null, price != null ? Number(price) : null, sku ?? null, id]
  );
  res.json({ ok: true, changed: r.affectedRows });
});

/** ELIMINAR */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const [r] = await pool.query("DELETE FROM products WHERE id=?", [id]);
  res.json({ ok: true, deleted: r.affectedRows });
});

export default router;
