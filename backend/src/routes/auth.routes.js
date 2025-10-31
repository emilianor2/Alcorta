// backend/src/routes/auth.routes.js
import { Router } from "express";
import { pool } from "../db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const router = Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "MISSING_FIELDS" });
  }

  // traemos el user
  const [rows] = await pool.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  const user = rows[0];
  if (!user) {
    return res.status(401).json({ ok: false, error: "BAD_CREDENTIALS" });
  }

  const okPass = await bcrypt.compare(password, user.password_hash);
  if (!okPass) {
    return res.status(401).json({ ok: false, error: "BAD_CREDENTIALS" });
  }

  // si tiene empleado, lo buscamos
  let employee = null;
  if (user.employee_id) {
    const [erows] = await pool.query(
      "SELECT id, nombre, apellido, dni, puesto FROM employees WHERE id = ?",
      [user.employee_id]
    );
    employee = erows[0] || null;
  }

  const payload = {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    employee_id: user.employee_id || null,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "8h",
  });

  res.json({
    ok: true,
    token,
    user: {
      ...payload,
      employee: employee, // 👈 opcional
    },
  });
});

export default router;
