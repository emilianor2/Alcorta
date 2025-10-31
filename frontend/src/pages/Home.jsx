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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* header */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Inicio</h1>
            {cash ? (
              <p className="text-sm text-gray-500">
                Caja abierta · turno {cash.shift_number} ·{" "}
                {new Date(cash.opened_at).toLocaleTimeString()}
              </p>
            ) : (
              <p className="text-sm text-red-500">Caja cerrada</p>
            )}
          </div>
          <div className="flex gap-2">
            {role === "admin" && (
              <Link
                to="/app/reportes"
                className="bg-black text-white px-4 py-2 rounded-lg"
              >
                Ver reportes
              </Link>
            )}
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        {/* bloque principal */}
        <div className="bg-white rounded-2xl shadow p-6 space-y-4">
          <p>
            Bienvenido/a{" "}
            <b>{user.full_name || user.name || user.email || "Usuario"}</b>
            <span className="ml-2 inline-block text-xs px-2 py-1 bg-gray-100 rounded">
              {role}
            </span>
          </p>

          {/* SIN CAJA → solo botón (admin y cajero) */}
          {!cash && (
            <div className="border rounded-xl p-4 mb-2">
              <h2 className="font-semibold mb-1">Caja cerrada</h2>
              <p className="text-sm text-gray-500 mb-3">
                Abrí la caja para poder hacer ventas y movimientos. El monto de
                apertura lo cargás después en <b>Caja</b>.
              </p>
              <button
                onClick={abrirCaja}
                className="bg-black text-white px-3 py-2 rounded-lg"
              >
                Abrir caja
              </button>
            </div>
          )}

          {/* ADMIN sin caja → igual puede entrar a todo lo de gestión */}
          {role === "admin" && !cash && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
              <Link
                to="/app/productos"
                className="border rounded-xl p-4 text-center hover:bg-gray-50"
              >
                Productos
              </Link>
              <Link
                to="/app/reportes"
                className="border rounded-xl p-4 text-center hover:bg-gray-50"
              >
                Reportes
              </Link>
              <Link
                to="/app/usuarios"
                className="border rounded-xl p-4 text-center hover:bg-gray-50"
              >
                Usuarios
              </Link>
              <Link
                to="/app/proveedores"
                className="border rounded-xl p-4 text-center hover:bg-gray-50"
              >
                Proveedores
              </Link>
              <div className="border rounded-xl p-4 text-center text-gray-400">
                Ventas (requiere caja)
              </div>
              <Link
                to="/app/caja"
                className="border rounded-xl p-4 text-center hover:bg-gray-50"
              >
                Ir a Caja
              </Link>
            </div>
          )}

          {/* CON CAJA → menú normal */}
          {cash && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* todos */}
              <Link
                to="/app/ventas"
                className="border rounded-xl p-4 text-center hover:bg-gray-50"
              >
                Ventas
              </Link>

              {/* admin extra */}
              {role === "admin" && (
                <Link
                  to="/app/productos"
                  className="border rounded-xl p-4 text-center hover:bg-gray-50"
                >
                  Productos
                </Link>
              )}
              {role === "admin" && (
                <Link
                  to="/app/reportes"
                  className="border rounded-xl p-4 text-center hover:bg-gray-50"
                >
                  Reportes
                </Link>
              )}
              {role === "admin" && (
                <Link
                  to="/app/usuarios"
                  className="border rounded-xl p-4 text-center hover:bg-gray-50"
                >
                  Usuarios
                </Link>
              )}
              {role === "admin" && (
                <Link
                  to="/app/proveedores"
                  className="border rounded-xl p-4 text-center hover:bg-gray-50"
                >
                  Proveedores
                </Link>
              )}

              {/* caja para todos */}
              <Link
                to="/app/caja"
                className="border rounded-xl p-4 text-center hover:bg-gray-50"
              >
                Caja
                <span className="block text-xs text-green-600 mt-1">
                  turno {cash.shift_number}
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
