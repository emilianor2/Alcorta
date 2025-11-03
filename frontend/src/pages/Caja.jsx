// src/pages/Caja.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import AppHeader from "../components/AppHeader.jsx";

export default function Caja() {
  const [session, setSession] = useState(null);
  const [montoApertura, setMontoApertura] = useState("");
  const [montoCierre, setMontoCierre] = useState("");
  const [movs, setMovs] = useState([]);
  const navigate = useNavigate();

  async function loadSession() {
    const { data } = await api.get("/cash/current");
    setSession(data.session);
    if (data.session) loadMovs(data.session.id);
  }

  async function loadMovs(id) {
    const { data } = await api.get(`/cash/movements/${id}`);
    setMovs(data.items);
  }

  useEffect(() => {
    loadSession();
  }, []);

  // ✅ Nuevo: registrar monto inicial
  async function registrarApertura() {
    if (!montoApertura || Number(montoApertura) <= 0) {
      return alert("Ingresá un monto válido");
    }
    try {
      // crea un movimiento de apertura (para registro histórico)
      await api.post(`/cash/movement/manual`, {
        type: "ingreso",
        amount: Number(montoApertura),
        reference: "Apertura de caja",
      });

      // actualiza el campo opening_amount en la sesión
      await api.post(`/cash/opening/${session.id}`, {
        amount: Number(montoApertura),
      });

      setMontoApertura("");
      await loadSession();
      alert("Monto de apertura guardado correctamente ✅");
    } catch (e) {
      console.error(e);
      alert("Error al guardar el monto inicial");
    }
  }

  async function cerrarCaja() {
    if (!session) return;
    if (montoCierre === "" || montoCierre === null) {
      return alert("Ingresá monto de cierre");
    }
    try {
      await api.post(`/cash/close/${session.id}`, {
        closing_amount: Number(montoCierre),
      });
      setMontoCierre("");
      await loadSession();
      navigate("/app", { replace: true });
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || "No se pudo cerrar la caja");
    }
  }

  async function crearMovimiento(type) {
    const amount = prompt("Monto:");
    if (!amount) return;
    const ref = prompt("Referencia (opcional):") || "";
    try {
      await api.post("/cash/movement/manual", {
        type,
        amount: Number(amount),
        reference: ref,
      });
      await loadMovs(session.id);
    } catch (e) {
      alert(e.response?.data?.error || "No se pudo crear el movimiento");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-100 to-surface-50 text-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <AppHeader title="Caja" />

        {/* Si no hay caja abierta todavía */}
        {!session ? (
          <div className="bg-surface-200 border border-surface-400 p-6 rounded-xl shadow-card text-center">
            <h2 className="text-lg mb-2 font-medium text-white">No hay caja abierta</h2>
            <p className="text-gray-400">
              Debés abrir la caja desde el inicio para empezar un nuevo turno.
            </p>
          </div>
        ) : (
          <div className="bg-surface-200 border border-surface-400 p-6 rounded-xl shadow-card space-y-4">
            {/* Cabecera */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-white">
                  Caja #{session.id} — T{session.shift_number} — {session.status}
                </h2>
                <p className="text-sm text-gray-400">
                  Apertura: {new Date(session.opened_at).toLocaleString()} — $
                  {Number(session.opening_amount).toFixed(2)}
                </p>
              </div>
              {session.status === "abierta" && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="border border-surface-400 bg-surface-300 text-gray-100 rounded-lg px-3 py-2"
                    placeholder="Monto cierre"
                    value={montoCierre}
                    onChange={(e) => setMontoCierre(e.target.value)}
                  />
                  <button
                    onClick={cerrarCaja}
                    className="bg-danger-600 hover:bg-danger-700 text-white px-4 py-2 rounded-lg shadow"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>

            {/* ⚠️ Si la caja está abierta pero sin monto */}
            {session.status === "abierta" &&
              Number(session.opening_amount) === 0 && (
                <div className="bg-surface-300/60 border border-brand-500/30 rounded-lg p-4">
                  <h3 className="font-semibold mb-2 text-white">
                    Registrar monto de apertura
                  </h3>
                  <p className="text-sm text-gray-300 mb-3">
                    Ingresá el monto inicial con el que se empieza el turno.
                  </p>
                  <input
                    type="number"
                    placeholder="Monto de apertura"
                    className="border border-surface-400 bg-surface-300 text-gray-100 rounded-lg px-3 py-2 mr-2"
                    value={montoApertura}
                    onChange={(e) => setMontoApertura(e.target.value)}
                  />
                  <button
                    onClick={registrarApertura}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg shadow"
                  >
                    Guardar apertura
                  </button>
                </div>
              )}

            {/* Botones de movimientos */}
            {session.status === "abierta" &&
              Number(session.opening_amount) > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => crearMovimiento("ingreso")}
                    className="px-3 py-2 border border-surface-400 bg-surface-300 hover:bg-surface-400 text-gray-100 rounded-lg"
                  >
                    + Ingreso
                  </button>
                  <button
                    onClick={() => crearMovimiento("egreso")}
                    className="px-3 py-2 border border-surface-400 bg-surface-300 hover:bg-surface-400 text-gray-100 rounded-lg"
                  >
                    – Egreso
                  </button>
                </div>
              )}

            {/* Lista de movimientos */}
            <div>
              <h3 className="font-medium mt-4 mb-2 text-white">Movimientos</h3>
              <ul className="divide-y divide-surface-400/60">
                {movs.map((m) => (
                  <li key={m.id} className="py-2 flex justify-between">
                    <span className="text-gray-200">
                      {m.type} — {m.reference || "sin referencia"}
                    </span>
                    <span className="text-gray-100">${Number(m.amount).toFixed(2)}</span>
                  </li>
                ))}
                {!movs.length && (
                  <p className="text-gray-500">Sin movimientos.</p>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
