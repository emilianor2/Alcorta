import { useEffect, useState } from "react";
import api from "../services/api";
import AppHeader from "../components/AppHeader.jsx";

export default function ReportesComprobantes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/invoices");
      setItems(data.items || []);
    } catch (err) {
      console.error(err);
      alert("Error cargando comprobantes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <AppHeader title="Reportes de Comprobantes" />
        <div className="bg-white rounded-xl shadow p-4 mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="py-2 px-3 text-left">#</th>
                <th className="py-2 px-3 text-left">Tipo</th>
                <th className="py-2 px-3 text-left">Punto Venta</th>
                <th className="py-2 px-3 text-left">Número</th>
                <th className="py-2 px-3 text-left">Cliente</th>
                <th className="py-2 px-3 text-left">CUIT/DNI</th>
                <th className="py-2 px-3 text-left">Fecha</th>
                <th className="py-2 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((inv) => (
                <tr key={inv.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-3">{inv.id}</td>
                  <td className="py-2 px-3">{inv.tipo_comprobante}</td>
                  <td className="py-2 px-3">{inv.punto_venta}</td>
                  <td className="py-2 px-3">{inv.numero_comprobante}</td>
                  <td className="py-2 px-3">
                    {inv.cliente_razon_social || "Consumidor Final"}
                  </td>
                  <td className="py-2 px-3">{inv.cliente_documento || "-"}</td>
                  <td className="py-2 px-3">
                    {new Date(inv.fecha_emision).toLocaleDateString("es-AR")}
                  </td>
                  <td className="py-2 px-3 text-right">
                    ${Number(inv.total).toFixed(2)}
                  </td>
                </tr>
              ))}
              {!items.length && !loading && (
                <tr>
                  <td colSpan="8" className="text-gray-400 py-4 text-center">
                    No hay comprobantes emitidos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
