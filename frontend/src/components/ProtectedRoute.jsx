// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  // no logueado
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // si la ruta pide roles y el usuario no está en la lista
  if (
    Array.isArray(allowedRoles) &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.role)
  ) {
    // lo mando al home
    return <Navigate to="/app" replace />;
  }

  return children;
}
