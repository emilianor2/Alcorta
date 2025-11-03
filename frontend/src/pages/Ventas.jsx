import { useEffect, useState } from "react";
import api from "../services/api";
import AppHeader from "../components/AppHeader.jsx";

export default function Ventas() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSel, setCategoriaSel] = useState("");
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
        const items = prodsRes.data.items || [];
        setProductos(items);
        const cats = Array.from(
          new Set(items.map((p) => (p.category || "").trim()).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b, "es"));
        setCategorias(cats);
        if (!categoriaSel && cats.length) setCategoriaSel(cats[0]);
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
    <div className="min-h-screen bg-gradient-to-b from-surface-100 to-surface-50 text-gray-100 p-6">
      {/* header arriba, solo una fila */}
      <div className="max-w-6xl mx-auto mb-6">
        <AppHeader title="Ventas" />
      </div>

      {/* contenido en grid */}
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
        {/* Productos */}
        <section className="md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Productos</h2>
            {!cashOpen && (
              <span className="text-sm text-danger-500">
                Caja cerrada – no se puede vender
              </span>
            )}
          </div>
          {/* Tabs de categorías */}
          {categorias.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {categorias.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoriaSel(cat)}
                    className={`px-3 py-1.5 rounded-lg border text-sm whitespace-nowrap ${
                      categoriaSel === cat
                        ? "bg-brand-600 hover:bg-brand-700 text-white border-brand-600"
                        : "border-surface-400 bg-surface-300 hover:bg-surface-400 text-gray-100"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {productos
              .filter((p) => !categoriaSel || p.category === categoriaSel)
              .map((p) => (
              <div
                key={p.id}
                className="bg-surface-200 border border-surface-400 p-4 rounded-xl shadow-card hover:shadow-lg transition"
              >
                <h3 className="font-medium text-white">{p.name}</h3>
                <p className="text-gray-400 text-xs mb-1">{p.category}</p>
                <p className="text-gray-200">${Number(p.price).toFixed(2)}</p>
                <button
                  onClick={() => agregar(p)}
                  className="mt-3 w-full bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-lg shadow"
                  disabled={!cashOpen}
                >
                  Agregar
                </button>
              </div>
            ))}
            {!productos.length && (
              <p className="text-gray-400 col-span-full">
                No hay productos cargados.
              </p>
            )}
          </div>
        </section>

        {/* Carrito */}
        <aside className="bg-surface-200 border border-surface-400 rounded-xl shadow-card p-5">
          <h2 className="text-xl font-semibold mb-3 text-white">Carrito</h2>
          {carrito.length === 0 ? (
            <p className="text-gray-400">Sin productos aún.</p>
          ) : (
            <ul className="divide-y divide-surface-400/60">
              {carrito.map((item) => (
                <li
                  key={item.id}
                  className="py-2 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-white">{item.name}</p>
                    <small className="text-gray-400">
                      x{item.cantidad} — ${Number(item.price).toFixed(2)}
                    </small>
                  </div>
                  <button
                    onClick={() => quitar(item.id)}
                    className="text-danger-500 hover:underline"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* medio de pago */}
          <div className="mt-4">
            <label className="block text-sm mb-1 text-gray-300">Medio de pago</label>
            <select
              className="border border-surface-400 bg-surface-300 text-gray-100 rounded-lg px-3 py-2 w-full"
              value={pay}
              onChange={(e) => setPay(e.target.value)}
            >
              <option value="efectivo">Efectivo</option>
              <option value="qr">QR</option>
            </select>
          </div>

          {/* total */}
          <div className="border-t border-surface-400 mt-3 pt-3 flex justify-between font-semibold text-white">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>

          {/* botón */}
          <button
            disabled={carrito.length === 0 || !cashOpen || sending}
            className={`mt-4 w-full bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-lg shadow
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
