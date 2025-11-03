import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

/** LISTAR */
router.get("/", async (_req, res) => {
  const [rows] = await pool.query(
    "SELECT id, name, category, price, sku, created_at FROM products ORDER BY id DESC"
  );
  res.json({ ok: true, items: rows });
});

/** CREAR */
router.post("/", async (req, res) => {
  const { name, category, price, sku } = req.body || {};
  if (!name || price == null || !category) {
    return res
      .status(400)
      .json({ ok: false, error: "name, category y price son requeridos" });
  }
  const [r] = await pool.query(
    "INSERT INTO products (name, category, price, sku) VALUES (?,?,?,?)",
    [name, String(category).trim(), Number(price), sku || null]
  );
  res.json({ ok: true, id: r.insertId });
});

/** EDITAR */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, category, price, sku } = req.body || {};
  const [r] = await pool.query(
    "UPDATE products SET name=COALESCE(?,name), category=COALESCE(?,category), price=COALESCE(?,price), sku=COALESCE(?,sku) WHERE id=?",
    [
      name ?? null,
      category != null ? String(category).trim() : null,
      price != null ? Number(price) : null,
      sku ?? null,
      id,
    ]
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
