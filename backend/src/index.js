import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db.js';
import authRouter from './routes/auth.routes.js';
import productsRouter from './routes/products.routes.js'; // 🆕 import nuevo
import salesRouter from './routes/sales.routes.js'; 
import cashRouter from "./routes/cash.routes.js";
import reportsRouter from "./routes/reports.routes.js"; // 👈 nuevo
import employeesRouter from "./routes/employees.routes.js";
import suppliersRouter from "./routes/suppliers.routes.js";
import usersRouter from "./routes/users.routes.js";
dotenv.config();

const app = express();

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Rutas base
app.get('/api/ping', (req, res) => res.json({ ok: true, ts: Date.now() }));
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter); // 🆕 Montaje del router de productos
app.use('/api/sales', salesRouter);      
app.use("/api/cash", cashRouter);
app.use("/api/reports", reportsRouter); // 👈 nuevo
app.use("/api/employees", employeesRouter);
app.use("/api/suppliers", suppliersRouter);
app.use("/api/users", usersRouter);
import { authRequired } from './middleware/auth.js';

// --- Inicialización de la base de datos ---
(async () => {
  try {
    // Tabla de usuarios (ya existente)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(120) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(120) NOT NULL,
        role ENUM('admin','cajero','mozo') DEFAULT 'cajero',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Tabla de productos 🆕
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        sku VARCHAR(40) UNIQUE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    console.log('✅ Tablas listas');
  } catch (err) {
    console.error('❌ Error creando tablas:', err);
  }
})();

// --- Arranque del servidor ---
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`🚀 API escuchando en puerto: ${port}`));
app.get('/api/me', authRequired, (req, res) => {
  // viene del token
  res.json({ ok:true, user:req.user });
});

app.get('/api/cash/current', authRequired, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM cash_sessions WHERE status='abierta' ORDER BY id DESC LIMIT 1"
  );
  res.json({ ok:true, session: rows[0] || null });
});