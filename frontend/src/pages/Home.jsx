// src/pages/Home.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Home() {
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "{}")
  );
  const [cash, setCash] = useState(null);
  const navigate = useNavigate();
  const role = user?.role || "cajero";

  async function loadAll() {
    try {
      const { data: me } = await api.get("/me");
      setUser(me.user);
      localStorage.setItem("user", JSON.stringify(me.user));

      const { data: caja } = await api.get("/cash/current");
      setCash(caja.session || null);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (role === "cocina") {
      navigate("/app/cocina", { replace: true });
    }
  }, [role, navigate]);

  if (role === "cocina") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-surface-100 to-surface-50 text-gray-100 flex items-center justify-center">
        <div className="bg-surface-200 border border-surface-400 rounded-2xl shadow-card px-8 py-6 text-center space-y-3">
          <p className="text-white text-lg font-semibold">
            Redirigiendo al panel de Cocina...
          </p>
          <p className="text-sm text-gray-300">
            Si no avanza automáticamente, hacé clic{" "}
            <button
              onClick={() => navigate("/app/cocina", { replace: true })}
              className="text-brand-400 underline"
            >
              aquí
            </button>
            .
          </p>
        </div>
      </div>
    );
  }

  // abre SIEMPRE con 0, monto real se carga en /app/caja
  async function abrirCaja() {
    try {
      await api.post("/cash/open", { opening_amount: 0 });
      await loadAll();
    } catch (e) {
      alert(e.response?.data?.error || "No se pudo abrir la caja");
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-100 to-surface-50 text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* header */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">Inicio</h1>
            {cash ? (
              <p className="text-sm text-gray-300">
                Caja abierta · turno {cash.shift_number} ·{" "}
                {new Date(cash.opened_at).toLocaleTimeString()}
              </p>
            ) : (
              <p className="text-sm text-danger-500">Caja cerrada</p>
            )}
          </div>
          <div className="flex gap-2">
            {role === "admin" && (
              <Link
                to="/app/reportes"
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg shadow"
              >
                Ver reportes
              </Link>
            )}
            <button
              onClick={logout}
              className="bg-danger-600 hover:bg-danger-700 text-white px-4 py-2 rounded-lg shadow"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        {/* bloque principal */}
        <div className="bg-surface-200 border border-surface-400 rounded-2xl shadow-card p-6 space-y-5">
          <p className="text-white">
            Bienvenido/a{" "}
            <b>{user.full_name || user.name || user.email || "Usuario"}</b>
            <span className="ml-2 inline-block text-xs px-2 py-1 bg-brand-500/15 text-brand-300 border border-brand-500/30 rounded">
              {role}
            </span>
          </p>

          {/* SIN CAJA → solo botón (admin y cajero) */}
          {!cash && (
            <div className="border border-surface-400 rounded-xl p-4 mb-2 bg-surface-300/60">
              <h2 className="font-semibold mb-1 text-white">Caja cerrada</h2>
              <p className="text-sm text-gray-300 mb-3">
                Abrí la caja para poder hacer ventas y movimientos. El monto de
                apertura lo cargás después en <b>Caja</b>.
              </p>
              <button
                onClick={abrirCaja}
                className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-lg shadow"
              >
                Abrir caja
              </button>
            </div>
          )}

          {/* MENÚ DE MÓDULOS */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
            {/* Módulos que requieren caja abierta */}
            {!cash ? (
              <div className="border border-surface-400 rounded-xl p-4 text-center text-gray-500 bg-surface-400 cursor-not-allowed">
                Ventas (requiere caja)
              </div>
            ) : (
              <Link
                to="/app/ventas"
                className="border border-surface-400 rounded-xl p-4 text-center hover:shadow-card hover:border-brand-500/50 transition bg-surface-300 text-white"
              >
                Ventas
              </Link>
            )}

            {!cash ? (
              <div className="border border-surface-400 rounded-xl p-4 text-center text-gray-500 bg-surface-400 cursor-not-allowed">
                Caja (requiere caja abierta)
              </div>
            ) : (
              <Link
                to="/app/caja"
                className="border border-surface-400 rounded-xl p-4 text-center hover:shadow-card hover:border-brand-500/50 transition bg-surface-300 text-white"
              >
                Caja
              </Link>
            )}

            {/* Módulos de gestión (siempre disponibles para admin) */}
            {role === "admin" && (
              <Link
                to="/app/productos"
                className="border border-surface-400 rounded-xl p-4 text-center hover:shadow-card hover:border-brand-500/50 transition bg-surface-300 text-white"
              >
                Productos
              </Link>
            )}
            {role === "admin" && (
              <Link
                to="/app/reportes"
                className="border border-surface-400 rounded-xl p-4 text-center hover:shadow-card hover:border-brand-500/50 transition bg-surface-300 text-white"
              >
                Reportes
              </Link>
            )}
            {role === "admin" && (
              <Link
                to="/app/usuarios"
                className="border border-surface-400 rounded-xl p-4 text-center hover:shadow-card hover:border-brand-500/50 transition bg-surface-300 text-white"
              >
                Usuarios
              </Link>
            )}
            {role === "admin" && (
              <Link
                to="/app/proveedores"
                className="border border-surface-400 rounded-xl p-4 text-center hover:shadow-card hover:border-brand-500/50 transition bg-surface-300 text-white"
              >
                Proveedores
              </Link>
            )}
            {role === "admin" && (
              <Link
                to="/app/cocina"
                className="border border-surface-400 rounded-xl p-4 text-center hover:shadow-card hover:border-brand-500/50 transition bg-surface-300 text-white"
              >
                Cocina
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
