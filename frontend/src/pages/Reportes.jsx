// src/pages/Reportes.jsx
import { useEffect, useState } from "react";
import api from "../services/api";
import AppHeader from "../components/AppHeader.jsx";

export default function Reportes() {
  const [from, setFrom] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [shift, setShift] = useState("");

  // lo que trae el nuevo endpoint
  const [cajas, setCajas] = useState([]);
  const [loading, setLoading] = useState(false);

  const formatDate = (val) => {
    if (!val) return "-";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
  };

  async function load() {
    setLoading(true);
    try {
      const params = { from, to };
      if (shift) params.shift = shift;

      // pegamos al nuevo endpoint
      const { data } = await api.get("/reports/cash", { params });
      setCajas(data.items || []);
    } catch (e) {
      console.error(e);
      alert("Error cargando reportes de caja");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <AppHeader title="Reportes de caja" />

        {/* Filtros */}
        <div className="bg-white p-4 rounded-xl shadow flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm mb-1">Desde</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Hasta</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Turno</label>
            <select
              className="border rounded-lg px-3 py-2"
              value={shift}
              onChange={(e) => setShift(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="1">Turno 1</option>
              <option value="2">Turno 2</option>
              <option value="3">Turno 3</option>
            </select>
          </div>
          <button
            className="bg-black text-white px-4 py-2 rounded-lg"
            onClick={load}
            disabled={loading}
          >
            {loading ? "Cargando..." : "Aplicar"}
          </button>
        </div>

        {/* LISTA DE CAJAS */}
        {!cajas.length && !loading && (
          <p className="text-gray-500">No hay cajas en ese rango.</p>
        )}

        <div className="space-y-6">
          {cajas.map((box) => (
            <div
              key={box.cash.id}
              className="bg-white rounded-xl shadow p-4 space-y-4"
            >
              {/* encabezado de la caja */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold">
                    Caja #{box.cash.id} — Turno {box.cash.shift_number}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Apertura: {formatDate(box.cash.opened_at)} — $
                    {Number(box.cash.opening_amount).toFixed(2)}
                  </p>
                  {box.cash.status === "cerrada" && (
                    <p className="text-sm text-gray-500">
                      Cierre: {formatDate(box.cash.closed_at)} — $
                      {Number(box.cash.closing_amount || 0).toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="text-right text-sm text-gray-500">
                  <p>Abrió: {box.cash.opened_by_name || "-"}</p>
                  {box.cash.closed_by_name && (
                    <p>Cerró: {box.cash.closed_by_name}</p>
                  )}
                  <p
                    className={
                      box.cash.status === "abierta"
                        ? "text-green-600"
                        : "text-red-500"
                    }
                  >
                    {box.cash.status}
                  </p>
                </div>
              </div>

              {/* ventas de la caja */}
              <div>
                <h3 className="font-medium mb-2">Ventas</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="py-1 px-2 text-left">#</th>
                        <th className="py-1 px-2 text-left">Fecha</th>
                        <th className="py-1 px-2 text-left">Usuario</th>
                        <th className="py-1 px-2 text-left">Medio</th>
                        <th className="py-1 px-2 text-left">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {box.sales.length ? (
                        box.sales.map((s) => (
                          <tr key={s.id} className="border-b">
                            <td className="py-1 px-2">{s.id}</td>
                            <td className="py-1 px-2">
                              {formatDate(s.created_at)}
                            </td>
                            <td className="py-1 px-2">
                              {s.user_name || `#${s.user_id || "-"}`}
                            </td>
                            <td className="py-1 px-2">
                              {s.payment_method || "-"}
                            </td>
                            <td className="py-1 px-2">
                              ${Number(s.total || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="py-2 px-2 text-gray-400" colSpan={5}>
                            Sin ventas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* movimientos de la caja */}
              <div>
                <h3 className="font-medium mb-2">Movimientos de caja</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="py-1 px-2 text-left">#</th>
                        <th className="py-1 px-2 text-left">Fecha</th>
                        <th className="py-1 px-2 text-left">Tipo</th>
                        <th className="py-1 px-2 text-left">Referencia</th>
                        <th className="py-1 px-2 text-left">Usuario</th>
                        <th className="py-1 px-2 text-left">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {box.movements.length ? (
                        box.movements.map((m) => (
                          <tr key={m.id} className="border-b">
                            <td className="py-1 px-2">{m.id}</td>
                            <td className="py-1 px-2">
                              {formatDate(m.created_at)}
                            </td>
                            <td className="py-1 px-2">{m.type}</td>
                            <td className="py-1 px-2">
                              {m.reference || "—"}
                            </td>
                            <td className="py-1 px-2">
                              {m.user_name || `#${m.user_id || "-"}`}
                            </td>
                            <td className="py-1 px-2">
                              ${Number(m.amount || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="py-2 px-2 text-gray-400" colSpan={6}>
                            Sin movimientos.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* mini resumen de la caja */}
              <div className="pt-2 border-t flex gap-6 text-sm text-gray-700">
                <p>
                  Ventas:{" "}
                  <b>
                    $
                    {box.sales
                      .reduce((acc, s) => acc + Number(s.total || 0), 0)
                      .toFixed(2)}
                  </b>
                </p>
                <p>
                  Ingresos manuales:{" "}
                  <b>
                    $
                    {box.movements
                      .filter((m) => m.type === "ingreso")
                      .reduce((acc, m) => acc + Number(m.amount || 0), 0)
                      .toFixed(2)}
                  </b>
                </p>
                <p>
                  Egresos:{" "}
                  <b>
                    $
                    {box.movements
                      .filter((m) => m.type === "egreso")
                      .reduce((acc, m) => acc + Number(m.amount || 0), 0)
                      .toFixed(2)}
                  </b>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
