// src/pages/Reportes.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import AppHeader from "../components/AppHeader.jsx";

export default function Reportes() {
  const [tab, setTab] = useState("cajas"); // 'cajas' | 'comprobantes'
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  // cajas
  const [shift, setShift] = useState("");
  const [cajas, setCajas] = useState([]);
  const [loadingCajas, setLoadingCajas] = useState(false);

  // comprobantes
  const [tipo, setTipo] = useState(""); // A|B|""(todos)
  const [invoices, setInvoices] = useState([]);
  const [loadingInv, setLoadingInv] = useState(false);

  const formatDate = (val) => {
    if (!val) return "-";
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
  };

  async function loadCajas() {
    setLoadingCajas(true);
    try {
      const params = { from, to };
      if (shift) params.shift = shift;
      const { data } = await api.get("/reports/cash", { params });
      setCajas(data.items || []);
    } catch (e) {
      console.error(e);
      alert("Error cargando reportes de caja");
    } finally {
      setLoadingCajas(false);
    }
  }

  async function loadInvoices() {
    setLoadingInv(true);
    try {
      const params = { from, to };
      if (tipo) params.tipo = tipo;
      const { data } = await api.get("/invoices", { params });
      setInvoices(data.items || []);
    } catch (e) {
      console.error(e);
      alert("Error cargando comprobantes");
    } finally {
      setLoadingInv(false);
    }
  }

  useEffect(() => {
    if (tab === "cajas") loadCajas();
    else loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // totales de comprobantes
  const invTotals = useMemo(() => {
    const sumA = invoices
      .filter((i) => i.tipo_comprobante === "A")
      .reduce((acc, i) => acc + Number(i.total || 0), 0);
    const sumB = invoices
      .filter((i) => i.tipo_comprobante === "B")
      .reduce((acc, i) => acc + Number(i.total || 0), 0);
    return {
      countA: invoices.filter((i) => i.tipo_comprobante === "A").length,
      countB: invoices.filter((i) => i.tipo_comprobante === "B").length,
      sumA,
      sumB,
      sumAll: sumA + sumB,
    };
  }, [invoices]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-100 to-surface-50 text-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <AppHeader title="Reportes" />

        {/* selector */}
        <div className="bg-surface-200 border border-surface-400 p-2 rounded-xl shadow-card inline-flex gap-1">
          <button
            onClick={() => setTab("cajas")}
            className={`px-4 py-2 rounded-lg text-sm ${
              tab === "cajas"
                ? "bg-brand-600 text-white"
                : "bg-surface-300 text-gray-100 hover:bg-surface-400"
            }`}
          >
            Cajas
          </button>
          <button
            onClick={() => setTab("comprobantes")}
            className={`px-4 py-2 rounded-lg text-sm ${
              tab === "comprobantes"
                ? "bg-brand-600 text-white"
                : "bg-surface-300 text-gray-100 hover:bg-surface-400"
            }`}
          >
            Comprobantes
          </button>
        </div>

        {/* filtros */}
        <div className="bg-surface-200 border border-surface-400 p-4 rounded-xl shadow-card flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm mb-1 text-gray-300">Desde</label>
            <input
              type="date"
              className="border border-surface-400 bg-surface-300 text-gray-100 rounded-lg px-3 py-2"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-300">Hasta</label>
            <input
              type="date"
              className="border border-surface-400 bg-surface-300 text-gray-100 rounded-lg px-3 py-2"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          {tab === "cajas" ? (
            <>
              <div>
                <label className="block text-sm mb-1 text-gray-300">Turno</label>
                <select
                  className="border border-surface-400 bg-surface-300 text-gray-100 rounded-lg px-3 py-2"
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
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg shadow"
                onClick={loadCajas}
                disabled={loadingCajas}
              >
                {loadingCajas ? "Cargando..." : "Aplicar"}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm mb-1 text-gray-300">Tipo</label>
                <select
                  className="border border-surface-400 bg-surface-300 text-gray-100 rounded-lg px-3 py-2"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="A">Factura A</option>
                  <option value="B">Factura B</option>
                </select>
              </div>
              <button
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg shadow"
                onClick={loadInvoices}
                disabled={loadingInv}
              >
                {loadingInv ? "Cargando..." : "Aplicar"}
              </button>
            </>
          )}
        </div>

        {/* contenido */}
        {tab === "cajas" ? (
          <CajasView cajas={cajas} loading={loadingCajas} formatDate={formatDate} />
        ) : (
          <InvoicesView items={invoices} loading={loadingInv} totals={invTotals} />
        )}
      </div>
    </div>
  );
}

/* ---------- SUBVISTAS ---------- */

function CajasView({ cajas, loading, formatDate }) {
  return (
    <>
      {!cajas.length && !loading && (
        <p className="text-gray-400">No hay cajas en ese rango.</p>
      )}
      <div className="space-y-6">
        {cajas.map((box) => (
          <div
            key={box.cash.id}
            className="bg-surface-200 border border-surface-400 rounded-xl shadow-card p-4 space-y-4"
          >
            {/* header caja */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Caja #{box.cash.id} — Turno {box.cash.shift_number}
                </h2>
                <p className="text-sm text-gray-300">
                  Apertura: {formatDate(box.cash.opened_at)} — $
                  {Number(box.cash.opening_amount).toFixed(2)}
                </p>
                {box.cash.status === "cerrada" && (
                  <p className="text-sm text-gray-300">
                    Cierre: {formatDate(box.cash.closed_at)} — $
                    {Number(box.cash.closing_amount || 0).toFixed(2)}
                  </p>
                )}
              </div>
              <div className="text-right text-sm text-gray-300">
                <p>Abrió: {box.cash.opened_by_name || "-"}</p>
                {box.cash.closed_by_name && <p>Cerró: {box.cash.closed_by_name}</p>}
                <p className={box.cash.status === "abierta" ? "text-green-500" : "text-danger-500"}>
                  {box.cash.status}
                </p>
              </div>
            </div>

            {/* ventas (AHORA CON CLIENTE) */}
            <div>
              <h3 className="font-medium mb-2 text-white">Ventas</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-surface-400 bg-surface-300 text-gray-200">
                    <tr>
                      <th className="py-1 px-2 text-left">#</th>
                      <th className="py-1 px-2 text-left">Fecha</th>
                      <th className="py-1 px-2 text-left">Usuario</th>
                      <th className="py-1 px-2 text-left">Cliente</th>
                      <th className="py-1 px-2 text-left">Medio</th>
                      <th className="py-1 px-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-100">
                    {box.sales.length ? (
                      box.sales.map((s) => (
                        <tr key={s.id} className="border-b border-surface-400/70">
                          <td className="py-1 px-2">{s.id}</td>
                          <td className="py-1 px-2">{formatDate(s.created_at)}</td>
                          <td className="py-1 px-2">{s.user_name || `#${s.user_id || "-"}`}</td>
                          <td className="py-1 px-2">{s.customer_name || "Consumidor Final"}</td>
                          <td className="py-1 px-2">{s.payment_method || "-"}</td>
                          <td className="py-1 px-2 text-right">
                            ${Number(s.total || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-2 px-2 text-gray-400" colSpan={6}>
                          Sin ventas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* movimientos (CON PROVEEDOR) */}
            <div>
              <h3 className="font-medium mb-2 text-white">Movimientos de caja</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-surface-400 bg-surface-300 text-gray-200">
                    <tr>
                      <th className="py-1 px-2 text-left">#</th>
                      <th className="py-1 px-2 text-left">Fecha</th>
                      <th className="py-1 px-2 text-left">Tipo</th>
                      <th className="py-1 px-2 text-left">Referencia</th>
                      <th className="py-1 px-2 text-left">Proveedor</th>
                      <th className="py-1 px-2 text-left">Usuario</th>
                      <th className="py-1 px-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-100">
                    {box.movements.length ? (
                      box.movements.map((m) => (
                        <tr key={m.id} className="border-b border-surface-400/70">
                          <td className="py-1 px-2">{m.id}</td>
                          <td className="py-1 px-2">{formatDate(m.created_at)}</td>
                          <td className="py-1 px-2">{m.type}</td>
                          <td className="py-1 px-2">{m.reference || "—"}</td>
                          <td className="py-1 px-2">{m.supplier_name || "-"}</td>
                          <td className="py-1 px-2">{m.user_name || `#${m.user_id || "-"}`}</td>
                          <td className="py-1 px-2 text-right">
                            ${Number(m.amount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-2 px-2 text-gray-400" colSpan={7}>
                          Sin movimientos.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* mini resumen */}
            <div className="pt-2 border-t border-surface-400 flex gap-6 text-sm text-gray-200">
              <p>
                Ventas:{" "}
                <b>
                  $
                  {box.sales.reduce((acc, s) => acc + Number(s.total || 0), 0).toFixed(2)}
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
    </>
  );
}

function InvoicesView({ items, loading, totals }) {
  return (
    <div className="space-y-4">
      <div className="bg-surface-200 border border-surface-400 rounded-xl shadow-card p-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-surface-400 bg-surface-300 text-gray-200">
            <tr>
              <th className="py-2 px-3 text-left">#</th>
              <th className="py-2 px-3 text-left">Tipo</th>
              <th className="py-2 px-3 text-left">Punto Venta</th>
              <th className="py-2 px-3 text-left">Número</th>
              <th className="py-2 px-3 text-left">Cliente</th>
              <th className="py-2 px-3 text-left">Doc</th>
              <th className="py-2 px-3 text-left">Fecha</th>
              <th className="py-2 px-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="text-gray-100">
            {items.map((inv) => (
              <tr key={inv.id} className="border-b border-surface-400/70 hover:bg-surface-400/30">
                <td className="py-2 px-3">{inv.id}</td>
                <td className="py-2 px-3">{inv.tipo_comprobante}</td>
                <td className="py-2 px-3">{inv.punto_venta}</td>
                <td className="py-2 px-3">{inv.numero_comprobante}</td>
                <td className="py-2 px-3">{inv.cliente_razon_social || "Consumidor Final"}</td>
                <td className="py-2 px-3">{inv.cliente_documento || "-"}</td>
                <td className="py-2 px-3">
                  {new Date(inv.fecha_emision).toLocaleDateString("es-AR")}
                </td>
                <td className="py-2 px-3 text-right">${Number(inv.total).toFixed(2)}</td>
              </tr>
            ))}
            {!items.length && !loading && (
              <tr>
                <td colSpan="8" className="text-gray-400 py-4 text-center">
                  No hay comprobantes para el rango seleccionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* totales A / B / general */}
      <div className="bg-surface-200 border border-surface-400 rounded-xl shadow-card p-4 flex gap-6 text-sm text-gray-100">
        <div>
          <p className="text-gray-300">Facturas A</p>
          <p>
            Cant: <b>{totals.countA}</b> — Monto:{" "}
            <b>${totals.sumA.toFixed(2)}</b>
          </p>
        </div>
        <div>
          <p className="text-gray-300">Facturas B</p>
          <p>
            Cant: <b>{totals.countB}</b> — Monto:{" "}
            <b>${totals.sumB.toFixed(2)}</b>
          </p>
        </div>
        <div className="ml-auto">
          <p className="text-gray-300">Total</p>
          <p className="text-lg">
            <b>${totals.sumAll.toFixed(2)}</b>
          </p>
        </div>
      </div>
    </div>
  );
}
