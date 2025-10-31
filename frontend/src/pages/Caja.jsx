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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <AppHeader title="Caja" />

        {/* Si no hay caja abierta todavía */}
        {!session ? (
          <div className="bg-white p-6 rounded-xl shadow text-center">
            <h2 className="text-lg mb-2 font-medium">No hay caja abierta</h2>
            <p className="text-gray-500">
              Debés abrir la caja desde el inicio para empezar un nuevo turno.
            </p>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-xl shadow space-y-4">
            {/* Cabecera */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium">
                  Caja #{session.id} — T{session.shift_number} —{" "}
                  {session.status}
                </h2>
                <p className="text-sm text-gray-500">
                  Apertura: {new Date(session.opened_at).toLocaleString()} — $
                  {Number(session.opening_amount).toFixed(2)}
                </p>
              </div>
              {session.status === "abierta" && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="border rounded-lg px-3 py-2"
                    placeholder="Monto cierre"
                    value={montoCierre}
                    onChange={(e) => setMontoCierre(e.target.value)}
                  />
                  <button
                    onClick={cerrarCaja}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>

            {/* ⚠️ Si la caja está abierta pero sin monto */}
            {session.status === "abierta" &&
              Number(session.opening_amount) === 0 && (
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">
                    Registrar monto de apertura
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Ingresá el monto inicial con el que se empieza el turno.
                  </p>
                  <input
                    type="number"
                    placeholder="Monto de apertura"
                    className="border rounded-lg px-3 py-2 mr-2"
                    value={montoApertura}
                    onChange={(e) => setMontoApertura(e.target.value)}
                  />
                  <button
                    onClick={registrarApertura}
                    className="bg-black text-white px-4 py-2 rounded-lg"
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
                    className="px-3 py-2 border rounded-lg"
                  >
                    + Ingreso
                  </button>
                  <button
                    onClick={() => crearMovimiento("egreso")}
                    className="px-3 py-2 border rounded-lg"
                  >
                    – Egreso
                  </button>
                </div>
              )}

            {/* Lista de movimientos */}
            <div>
              <h3 className="font-medium mt-4 mb-2">Movimientos</h3>
              <ul className="divide-y">
                {movs.map((m) => (
                  <li key={m.id} className="py-2 flex justify-between">
                    <span>
                      {m.type} — {m.reference || "sin referencia"}
                    </span>
                    <span>${Number(m.amount).toFixed(2)}</span>
                  </li>
                ))}
                {!movs.length && (
                  <p className="text-gray-400">Sin movimientos.</p>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
