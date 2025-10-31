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

env
Copiar código
PORT=4000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_DATABASE=alcorta
JWT_SECRET=supersecreto
Levantar el backend:


npm run dev
Esto levanta el API en:


http://localhost:4000/api
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
