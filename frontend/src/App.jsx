// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import Ventas from "./pages/Ventas.jsx";
import Reportes from "./pages/Reportes.jsx";
import Productos from "./pages/Productos.jsx";
import Caja from "./pages/Caja.jsx";
import Usuarios from "./pages/Usuarios.jsx";
import Proveedores from "./pages/Proveedores.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function App() {
  return (
    <Routes>
      {/* arranca siempre en login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<Login />} />

      {/* home común */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />

      {/* cajero + admin */}
      <Route
        path="/app/ventas"
        element={
          <ProtectedRoute allowedRoles={["cajero", "admin"]}>
            <Ventas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/caja"
        element={
          <ProtectedRoute allowedRoles={["cajero", "admin"]}>
            <Caja />
          </ProtectedRoute>
        }
      />

      {/* solo admin */}
      <Route
        path="/app/productos"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Productos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/reportes"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Reportes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/usuarios"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Usuarios />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/proveedores"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Proveedores />
          </ProtectedRoute>
        }
      />
      {/* fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
