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
  const [proveedores, setProveedores] = useState([]);
  const [editingRow, setEditingRow] = useState(null); // { type: 'ingreso'|'egreso', amount: '', reference: '', supplier_id: '' }
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

  async function loadProveedores() {
    try {
      const { data } = await api.get("/suppliers");
      setProveedores(data.items || []);
    } catch (e) {
      console.error("Error cargando proveedores", e);
    }
  }

  useEffect(() => {
    loadSession();
    loadProveedores();
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

  function iniciarEdicion(type) {
    setEditingRow({
      type,
      amount: "",
      reference: "",
      supplier_id: "",
    });
  }

  function cancelarEdicion() {
    setEditingRow(null);
  }

  async function guardarMovimiento() {
    if (!editingRow) return;
    if (!editingRow.amount || Number(editingRow.amount) <= 0) {
      return alert("Ingresá un monto válido");
    }
    try {
      await api.post("/cash/movement/manual", {
        type: editingRow.type,
        amount: Number(editingRow.amount),
        reference: editingRow.reference || "",
        supplier_id: editingRow.supplier_id || null,
      });
      setEditingRow(null);
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

            {/* Tabla de movimientos */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-white">Movimientos</h3>
                {session.status === "abierta" &&
                  Number(session.opening_amount) > 0 &&
                  !editingRow && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => iniciarEdicion("ingreso")}
                        className="px-3 py-2 border border-surface-400 bg-surface-300 hover:bg-surface-400 text-gray-100 rounded-lg text-sm"
                      >
                        + Ingreso
                      </button>
                      <button
                        onClick={() => iniciarEdicion("egreso")}
                        className="px-3 py-2 border border-surface-400 bg-surface-300 hover:bg-surface-400 text-gray-100 rounded-lg text-sm"
                      >
                        – Egreso
                      </button>
                    </div>
                  )}
              </div>
              <div className="bg-surface-300/50 border border-surface-400 rounded-lg overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-surface-400/50 border-b border-surface-400">
                    <tr>
                      <th className="py-2 px-3 text-left text-gray-200">Tipo</th>
                      <th className="py-2 px-3 text-left text-gray-200">Referencia</th>
                      <th className="py-2 px-3 text-left text-gray-200">Proveedor</th>
                      <th className="py-2 px-3 text-right text-gray-200">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Fila editable */}
                    {editingRow && (
                      <tr className="bg-brand-500/20 border-b border-surface-400">
                        <td className="py-2 px-3">
                          <span className="text-gray-200 capitalize">{editingRow.type}</span>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="Referencia"
                            className="w-full border border-surface-400 bg-surface-300 text-gray-100 rounded px-2 py-1 text-sm"
                            value={editingRow.reference}
                            onChange={(e) =>
                              setEditingRow({ ...editingRow, reference: e.target.value })
                            }
                            autoFocus
                          />
                        </td>
                        <td className="py-2 px-3">
                          {editingRow.type === "egreso" ? (
                            <select
                              className="w-full border border-surface-400 bg-surface-300 text-gray-100 rounded px-2 py-1 text-sm"
                              value={editingRow.supplier_id}
                              onChange={(e) =>
                                setEditingRow({ ...editingRow, supplier_id: e.target.value })
                              }
                            >
                              <option value="">Sin proveedor</option>
                              {proveedores.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.razon_social}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2 justify-end">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="w-24 border border-surface-400 bg-surface-300 text-gray-100 rounded px-2 py-1 text-sm text-right"
                              value={editingRow.amount}
                              onChange={(e) =>
                                setEditingRow({ ...editingRow, amount: e.target.value })
                              }
                            />
                            <button
                              onClick={guardarMovimiento}
                              className="px-2 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded text-xs"
                            >
                              ✓
                            </button>
                            <button
                              onClick={cancelarEdicion}
                              className="px-2 py-1 bg-danger-600 hover:bg-danger-700 text-white rounded text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {/* Movimientos existentes */}
                    {movs.map((m) => (
                      <tr key={m.id} className="border-b border-surface-400/60 hover:bg-surface-400/30">
                        <td className="py-2 px-3 text-gray-200 capitalize">{m.type}</td>
                        <td className="py-2 px-3 text-gray-200">
                          {m.reference || <span className="text-gray-500">Sin referencia</span>}
                        </td>
                        <td className="py-2 px-3 text-gray-200">
                          {m.supplier_name || <span className="text-gray-500">-</span>}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-100 font-medium">
                          ${Number(m.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {!movs.length && !editingRow && (
                      <tr>
                        <td className="py-4 px-3 text-gray-400 text-center" colSpan={4}>
                          Sin movimientos.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
