import { useEffect, useState } from "react";
import api from "../services/api";
import AppHeader from "../components/AppHeader.jsx";

export default function Ventas() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [pay, setPay] = useState("efectivo");
  const [sending, setSending] = useState(false);
  const [cashOpen, setCashOpen] = useState(true);

  // cargar productos + caja
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodsRes, cashRes] = await Promise.all([
          api.get("/products"),
          api.get("/cash/current"),
        ]);
        setProductos(prodsRes.data.items || []);
        setCashOpen(!!cashRes.data.session);
      } catch (err) {
        console.error("Error al cargar productos/caja", err);
        setCashOpen(false);
      }
    };
    fetchData();
  }, []);

  const agregar = (p) => {
    setCarrito((prev) => {
      const existente = prev.find((item) => item.id === p.id);
      if (existente) {
        return prev.map((item) =>
          item.id === p.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, { ...p, cantidad: 1 }];
    });
  };

  const quitar = (id) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  };

  const total = carrito.reduce(
    (acc, item) => acc + Number(item.price) * item.cantidad,
    0
  );

  const finalizarVenta = async () => {
    if (!carrito.length) return;
    if (!cashOpen) {
      alert("No hay caja abierta. Abrí la caja primero.");
      return;
    }
    setSending(true);
    try {
      const items = carrito.map((i) => ({
        product_id: i.id,
        qty: i.cantidad,
        price: Number(i.price),
      }));
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      const { data } = await api.post("/sales", {
        items,
        payment_method: pay,
        user_id: user.id || null,
      });

      if (data.ok) {
        alert(
          `✅ Venta #${data.sale_id} registrada ($${Number(data.total).toFixed(
            2
          )})`
        );
        setCarrito([]);
      } else {
        alert("⚠️ No se pudo registrar la venta.");
      }
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.error === "NO_CASH_OPEN"
          ? "No hay caja abierta. Abrí la caja primero."
          : err.response?.data?.error || "Error al registrar la venta";
      alert(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* header arriba, solo una fila */}
      <div className="max-w-6xl mx-auto mb-6">
        <AppHeader title="Ventas" />
      </div>

      {/* contenido en grid */}
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
        {/* Productos */}
        <section className="md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Productos</h2>
            {!cashOpen && (
              <span className="text-sm text-red-600">
                Caja cerrada – no se puede vender
              </span>
            )}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {productos.map((p) => (
              <div
                key={p.id}
                className="bg-white p-4 rounded-xl shadow hover:shadow-lg transition"
              >
                <h3 className="font-medium">{p.name}</h3>
                <p className="text-gray-600">${Number(p.price).toFixed(2)}</p>
                <button
                  onClick={() => agregar(p)}
                  className="mt-3 w-full bg-black text-white py-2 rounded-lg hover:opacity-90"
                  disabled={!cashOpen}
                >
                  Agregar
                </button>
              </div>
            ))}
            {!productos.length && (
              <p className="text-gray-500 col-span-full">
                No hay productos cargados.
              </p>
            )}
          </div>
        </section>

        {/* Carrito */}
        <aside className="bg-white rounded-xl shadow p-5">
          <h2 className="text-xl font-semibold mb-3">Carrito</h2>
          {carrito.length === 0 ? (
            <p className="text-gray-500">Sin productos aún.</p>
          ) : (
            <ul className="divide-y">
              {carrito.map((item) => (
                <li
                  key={item.id}
                  className="py-2 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <small className="text-gray-500">
                      x{item.cantidad} — ${Number(item.price).toFixed(2)}
                    </small>
                  </div>
                  <button
                    onClick={() => quitar(item.id)}
                    className="text-red-600 hover:underline"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* medio de pago */}
          <div className="mt-4">
            <label className="block text-sm mb-1">Medio de pago</label>
            <select
              className="border rounded-lg px-3 py-2 w-full"
              value={pay}
              onChange={(e) => setPay(e.target.value)}
            >
              <option value="efectivo">Efectivo</option>
              <option value="qr">QR</option>
            </select>
          </div>

          {/* total */}
          <div className="border-t mt-3 pt-3 flex justify-between font-semibold">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>

          {/* botón */}
          <button
            disabled={carrito.length === 0 || !cashOpen || sending}
            className={`mt-4 w-full bg-black text-white py-2 rounded-lg hover:opacity-90
              ${
                carrito.length === 0 || !cashOpen || sending
                  ? "opacity-40 cursor-not-allowed"
                  : ""
              }`}
            onClick={finalizarVenta}
          >
            {!cashOpen
              ? "No hay caja abierta"
              : sending
              ? "Guardando..."
              : "Finalizar Venta"}
          </button>
        </aside>
      </div>
    </div>
  );
}
