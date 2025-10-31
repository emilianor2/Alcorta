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

  // 👇👀 ACÁ es lo importante
  const payload = {
    id: user.id,                 // 👈 ESTE nombre tiene que ser "id"
    email: user.email,
    full_name: user.full_name,
    role: user.role,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "8h",
  });

  res.json({
    ok: true,
    token,
    user: payload, // lo mandamos también para el front
  });
});

export default router;
