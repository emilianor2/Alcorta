# Alcorta – Sistema de Caja y Ventas

Aplicación web sencilla para un negocio chico (kiosco, rotisería, almacén) que permite:

- Manejo de **usuarios con roles** (`admin` y `cajero`)
- **Login** y protección de rutas
- **Apertura y cierre de caja** por turno (guarda quién abrió y quién cerró)
- **Ventas** solo si hay caja abierta
- **Movimientos de caja** (ingresos / egresos manuales, ej. pagar proveedor)
- **Reportes por día y por turno** que muestran:
  - la caja abierta/cerrada
  - las ventas de ese turno
  - los movimientos de caja
  - y quién hizo cada cosa

Está hecha para practicar **Node.js + Express + MySQL** en el backend y **React** en el frontend.

---

## 1. Requisitos

- Node.js 18+ (vos tenés 22, va bien)
- npm
- MySQL corriendo (local)
- Git

---

## 2. Clonar el repo


git clone https://github.com/emilianor2/Alcorta.git
cd Alcorta


cd backend
npm install

Crear el archivo .env en backend/:

```
PORT=4000
HOST=0.0.0.0        # dejalo así para exponerlo en la red
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_DATABASE=alcorta
JWT_SECRET=supersecreto
```

Levantar el backend:

```
npm run dev
```

Por defecto escucha en todas las interfaces (`http://0.0.0.0:4000/api`). Si solo querés localhost, podés setear `HOST=127.0.0.1`. Recordá permitir el puerto 4000 en el firewall si vas a entrar desde otro dispositivo.
El backend crea las tablas básicas (users, products) si no existen.
Después vos ya tenés las tablas extra que usamos: cash_sessions, cash_movements, sales, sale_items.

4. Frontend
En otra consola:


cd frontend
npm install
npm run dev
Por defecto Vite lo va a levantar en:


http://localhost:5173
El frontend ya está configurado para pegarle al backend en http://localhost:4000/api (en src/services/api.js). Si lo corrés en otro puerto, cambiá ahí.

5. Login y roles
El backend tiene la ruta: POST /api/auth/login

Al loguearte, guarda en localStorage:

token

user (con role: "admin" o "cajero")

Las páginas están protegidas con <ProtectedRoute />:

cajero: puede ver ventas, caja

admin: puede ver todo: productos, reportes, caja, ventas

6. Flujo de caja (lo que hicimos)
Iniciás sesión.

Vas a Inicio (/app).

Si no hay caja abierta, el sistema te deja abrir caja (sin monto en el home).

Vas a Caja (/app/caja) y ahí sí:

cargás monto de apertura

hacés movimientos manuales

cerrás la caja con monto de cierre

Al cerrar, te vuelve al home.

Las ventas (/app/ventas) solo funcionan si hay una caja abierta.

7. Scripts útiles
Backend

npm run dev   
Frontend

npm run dev   # levanta Vite
npm run build # build de producción

8. Estructura (propuesta)

Alcorta/
├── backend/
│   ├── src/
│   │   ├── index.js
│   │   ├── db.js
│   │   ├── middleware/
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── products.routes.js
│   │   │   ├── sales.routes.js
│   │   │   ├── cash.routes.js
│   │   │   └── reports.routes.js
│   │   └── utils/cash.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/
    │   ├── components/
    │   └── services/api.js
    └── package.json
9. Notas
Si el backend te tira NO_TOKEN es porque el frontend no está mandando el token en el header Authorization: Bearer <token>.

Si las ventas te devuelven NO_CASH_OPEN, abrí primero la caja.

En reports ya viene todo agrupado por caja y turno.

-- =========================================
-- 🧾 BASE DE DATOS
-- =========================================
CREATE DATABASE IF NOT EXISTS gastronomia
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE gastronomia;

-- =========================================
-- 👤 USUARIOS
-- =========================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  role ENUM('admin','cajero','mozo','cocina') DEFAULT 'cajero',
  employee_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- =========================================
-- 🛠️ EMPLEADOS
-- =========================================
CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  apellido VARCHAR(100) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  dni VARCHAR(15) NOT NULL,
  cuil VARCHAR(20) NOT NULL,
  fecha_nac DATE NULL,
  telefono VARCHAR(30) NULL,
  email VARCHAR(120) NULL,
  direccion VARCHAR(200) NULL,
  localidad VARCHAR(120) NULL,
  provincia VARCHAR(120) NULL,
  puesto VARCHAR(120) NULL,       
  fecha_ingreso DATE NULL,
  estado ENUM('activo','inactivo') DEFAULT 'activo',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT NULL,
  updated_at TIMESTAMP NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_employees_dni ON employees(dni);

ALTER TABLE users
  ADD CONSTRAINT fk_users_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON DELETE SET NULL;


-- =========================================
-- 🏬 PROVEEDORES
-- =========================================
CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  razon_social VARCHAR(150) NOT NULL,
  cuit VARCHAR(20) NOT NULL,
  iibb VARCHAR(40) NULL,
  condicion_iva ENUM('RI','Monotributo','Exento','CF') DEFAULT 'CF',
  telefono VARCHAR(30) NULL,
  email VARCHAR(120) NULL,
  direccion VARCHAR(200) NULL,
  localidad VARCHAR(120) NULL,
  provincia VARCHAR(120) NULL,
  contacto VARCHAR(120) NULL,
  notas TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT NULL,
  updated_at TIMESTAMP NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_suppliers_cuit ON suppliers(cuit);


-- =========================================
-- 🛒 PRODUCTOS
-- =========================================
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  sku VARCHAR(40) UNIQUE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- =========================================
-- 💰 SESIONES DE CAJA (turnos)
-- =========================================
CREATE TABLE IF NOT EXISTS cash_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  opening_amount DECIMAL(10,2) DEFAULT 0,
  closing_amount DECIMAL(10,2) DEFAULT NULL,
  difference DECIMAL(10,2) DEFAULT 0,
  status ENUM('abierta','cerrada') DEFAULT 'abierta',
  shift_number INT NOT NULL,
  opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME DEFAULT NULL,
  opened_by INT,
  closed_by INT,
  FOREIGN KEY (opened_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================
-- 📥 MOVIMIENTOS DE CAJA
-- =========================================
CREATE TABLE IF NOT EXISTS cash_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  type ENUM('ingreso','egreso','venta') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reference VARCHAR(255),
  user_id INT NULL,
  supplier_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES cash_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================
-- 🧾 VENTAS
-- =========================================
CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  total DECIMAL(10,2) NOT NULL,
  payment_method ENUM('efectivo','qr','tarjeta') DEFAULT 'efectivo',
  cash_session_id INT NULL,
  shift_number INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id) ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================
-- 🧾 DETALLE DE VENTAS
-- =========================================
CREATE TABLE IF NOT EXISTS sale_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  product_id INT NULL,
  qty INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================
-- 👤 CLIENTES
-- =========================================
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  razon_social VARCHAR(200) NOT NULL,
  nombre VARCHAR(100) NULL,
  apellido VARCHAR(100) NULL,
  tipo_documento ENUM('DNI','CUIL','CUIT','PASAPORTE','LC','LE') DEFAULT 'DNI',
  numero_documento VARCHAR(20) NOT NULL,
  condicion_iva ENUM('RI','Monotributo','Exento','CF') DEFAULT 'CF',
  tipo_cliente ENUM('Fisica','Juridica') DEFAULT 'Fisica',
  direccion VARCHAR(200),
  localidad VARCHAR(120),
  provincia VARCHAR(120),
  codigo_postal VARCHAR(10),
  telefono VARCHAR(30),
  email VARCHAR(120),
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT NULL,
  updated_at TIMESTAMP NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_customers_documento ON customers(numero_documento);


-- =========================================
-- 🧾 FACTURAS / COMPROBANTES
-- =========================================
CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  customer_id INT NULL,
  tipo_comprobante ENUM('A','B') NOT NULL,
  punto_venta INT NOT NULL DEFAULT 1,
  numero_comprobante INT NOT NULL,
  fecha_emision DATETIME DEFAULT CURRENT_TIMESTAMP,
  subtotal DECIMAL(10,2) NOT NULL,
  iva DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  condicion_venta VARCHAR(50) DEFAULT 'Contado',
  cliente_razon_social VARCHAR(200) NULL,
  cliente_documento VARCHAR(20) NULL,
  cliente_direccion VARCHAR(200) NULL,
  cliente_condicion_iva VARCHAR(20) NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_comprobante (punto_venta, numero_comprobante, tipo_comprobante)
) ENGINE=InnoDB;

CREATE INDEX idx_invoices_sale ON invoices(sale_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_fecha ON invoices(fecha_emision);


-- =========================================
-- 🍽️ PEDIDOS
-- =========================================
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cash_session_id INT NOT NULL,
  order_number INT NOT NULL,
  status ENUM('abierto','finalizado') DEFAULT 'abierto',
  prep_status ENUM('abierto','en_preparacion','preparado') DEFAULT 'abierto',
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  was_modified TINYINT(1) DEFAULT 0,
  items_updated_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  closed_at DATETIME NULL,
  FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_orders_cash ON orders(cash_session_id, status, created_at);


-- =========================================
-- 🍽️ ITEMS DE PEDIDOS
-- =========================================
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NULL,
  description VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_order_items_order ON order_items(order_id);


-- =========================================
-- 👤 USUARIOS INICIALES
-- =========================================
INSERT INTO users (id, email, password_hash, full_name, role)
VALUES
(1, 'admin@local.test', '$2b$10$4o0TlXTqhHTWonroyhmtCeSaGgamBQ7tht9lmoafWL/vEGUV71oQ6', 'Admin Local', 'admin'),
(2, 'caja@local.test', '$2b$10$ncBaVgQduxLk.9V0Sau7F.aOa93LTDo8V5cGqHzAdprdjNcZCfMEC', 'Cajero Local', 'cajero'),
(3, 'cocina@local.test', '$2b$10$ncBaVgQduxLk.9V0Sau7F.aOa93LTDo8V5cGqHzAdprdjNcZCfMEC', 'Usuario Cocina', 'cocina')
ON DUPLICATE KEY UPDATE email=email;
