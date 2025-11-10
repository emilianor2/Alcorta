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
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [lastSaleId, setLastSaleId] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [clienteSel, setClienteSel] = useState("");
  const [tipoComprobante, setTipoComprobante] = useState("B");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    razon_social: "",
    nombre: "",
    apellido: "",
    tipo_documento: "DNI",
    numero_documento: "",
    condicion_iva: "CF",
    tipo_cliente: "Fisica",
    direccion: "",
    localidad: "",
    provincia: "",
    telefono: "",
    email: "",
  });
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [invoice, setInvoice] = useState(null);

  // cargar productos + caja + clientes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodsRes, cashRes, clientesRes] = await Promise.all([
          api.get("/products"),
          api.get("/cash/current"),
          api.get("/customers").catch(() => ({ data: { items: [] } })),
        ]);
        const items = prodsRes.data.items || [];
        setProductos(items);
        const cats = Array.from(
          new Set(items.map((p) => (p.category || "").trim()).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b, "es"));
        setCategorias(cats);
        if (!categoriaSel && cats.length) setCategoriaSel(cats[0]);
        setCashOpen(!!cashRes.data.session);
        setClientes(clientesRes.data.items || []);
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
        setLastSaleId(data.sale_id);
        setShowInvoiceModal(true);
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

  const crearCliente = async () => {
    if (!newCustomer.razon_social || !newCustomer.numero_documento) {
      alert("Completá al menos razón social y número de documento");
      return;
    }
    try {
      const { data } = await api.post("/customers", newCustomer);
      if (data.ok) {
        setClientes([...clientes, data.customer]);
        setClienteSel(data.customer.id.toString());
        setShowNewCustomer(false);
        setNewCustomer({
          razon_social: "",
          nombre: "",
          apellido: "",
          tipo_documento: "DNI",
          numero_documento: "",
          condicion_iva: "CF",
          tipo_cliente: "Fisica",
          direccion: "",
          localidad: "",
          provincia: "",
          telefono: "",
          email: "",
        });
      }
    } catch (err) {
      alert(err.response?.data?.error || "Error al crear cliente");
    }
  };

  const generarComprobante = async () => {
    if (tipoComprobante === "A" && !clienteSel) {
      alert("La factura A requiere un cliente");
      return;
    }
    if (tipoComprobante === "A" && clienteSel) {
      const cliente = clientes.find((c) => c.id.toString() === clienteSel);
      if (cliente && cliente.condicion_iva !== "RI") {
        alert("La factura A solo puede emitirse para clientes Responsables Inscriptos (RI)");
        return;
      }
    }
    setGeneratingInvoice(true);
    try {
      const { data } = await api.post("/invoices", {
        sale_id: lastSaleId,
        customer_id: clienteSel || null,
        tipo_comprobante: tipoComprobante,
        punto_venta: 1,
      });
      if (data.ok) {
        setInvoice(data.invoice);
      } else {
        alert("Error al generar comprobante");
      }
    } catch (err) {
      alert(err.response?.data?.error || "Error al generar comprobante");
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const cerrarModal = () => {
    setShowInvoiceModal(false);
    setInvoice(null);
    setClienteSel("");
    setTipoComprobante("B");
    setShowNewCustomer(false);
    setLastSaleId(null);
  };

  const imprimirComprobante = () => {
    window.print();
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

      {/* Modal de comprobante */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-200 border border-surface-400 rounded-xl shadow-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {!invoice ? (
              <>
                <div className="p-6 border-b border-surface-400">
                  <h2 className="text-xl font-semibold text-white mb-4">
                    Generar Comprobante - Venta #{lastSaleId}
                  </h2>

                  {/* Tipo de comprobante */}
                  <div className="mb-4">
                    <label className="block text-sm mb-2 text-gray-300">Tipo de Comprobante</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="B"
                          checked={tipoComprobante === "B"}
                          onChange={(e) => {
                            setTipoComprobante(e.target.value);
                            if (e.target.value === "B") setClienteSel("");
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-gray-200">Factura B (Consumidor Final)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="A"
                          checked={tipoComprobante === "A"}
                          onChange={(e) => setTipoComprobante(e.target.value)}
                          className="w-4 h-4"
                        />
                        <span className="text-gray-200">Factura A (Responsable Inscripto)</span>
                      </label>
                    </div>
                  </div>

                  {/* Cliente */}
                  <div className="mb-4">
                    <label className="block text-sm mb-2 text-gray-300">Cliente (Opcional)</label>
                    <div className="flex gap-2 mb-2">
                      <select
                        className="flex-1 border border-surface-400 bg-surface-300 text-gray-100 rounded-lg px-3 py-2"
                        value={clienteSel}
                        onChange={(e) => setClienteSel(e.target.value)}
                      >
                        <option value="">Sin cliente (Consumidor Final)</option>
                        {clientes
                          .filter((c) => tipoComprobante === "A" ? c.condicion_iva === "RI" : true)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.razon_social || `${c.nombre} ${c.apellido}`} - {c.numero_documento}
                              {c.condicion_iva ? ` (${c.condicion_iva})` : ""}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => setShowNewCustomer(!showNewCustomer)}
                        className="px-3 py-2 border border-surface-400 bg-surface-300 hover:bg-surface-400 text-gray-100 rounded-lg"
                      >
                        {showNewCustomer ? "Cancelar" : "+ Nuevo"}
                      </button>
                    </div>

                      {/* Formulario nuevo cliente */}
                      {showNewCustomer && (
                        <div className="bg-surface-300/50 p-4 rounded-lg space-y-2 mb-2">
                          <input
                            type="text"
                            placeholder="Razón Social / Nombre Completo"
                            className="w-full border border-surface-400 bg-surface-300 text-gray-100 rounded px-2 py-1 text-sm"
                            value={newCustomer.razon_social}
                            onChange={(e) =>
                              setNewCustomer({ ...newCustomer, razon_social: e.target.value })
                            }
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Nombre"
                              className="border border-surface-400 bg-surface-300 text-gray-100 rounded px-2 py-1 text-sm"
                              value={newCustomer.nombre}
                              onChange={(e) =>
                                setNewCustomer({ ...newCustomer, nombre: e.target.value })
                              }
                            />
                            <input
                              type="text"
                              placeholder="Apellido"
                              className="border border-surface-400 bg-surface-300 text-gray-100 rounded px-2 py-1 text-sm"
                              value={newCustomer.apellido}
                              onChange={(e) =>
                                setNewCustomer({ ...newCustomer, apellido: e.target.value })
                              }
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              className="border border-surface-400 bg-surface-300 text-gray-100 rounded px-2 py-1 text-sm"
                              value={newCustomer.tipo_documento}
                              onChange={(e) =>
                                setNewCustomer({ ...newCustomer, tipo_documento: e.target.value })
                              }
                            >
                              <option value="DNI">DNI</option>
                              <option value="CUIT">CUIT</option>
                              <option value="CUIL">CUIL</option>
                            </select>
                            <input
                              type="text"
                              placeholder="Número Documento"
                              className="border border-surface-400 bg-surface-300 text-gray-100 rounded px-2 py-1 text-sm"
                              value={newCustomer.numero_documento}
                              onChange={(e) =>
                                setNewCustomer({ ...newCustomer, numero_documento: e.target.value })
                              }
                            />
                          </div>
                          <select
                            className="w-full border border-surface-400 bg-surface-300 text-gray-100 rounded px-2 py-1 text-sm"
                            value={newCustomer.condicion_iva}
                            onChange={(e) =>
                              setNewCustomer({ ...newCustomer, condicion_iva: e.target.value })
                            }
                          >
                            <option value="CF">Consumidor Final</option>
                            <option value="RI">Responsable Inscripto</option>
                            <option value="Monotributo">Monotributo</option>
                            <option value="Exento">Exento</option>
                          </select>
                          <button
                            onClick={crearCliente}
                            className="w-full bg-brand-600 hover:bg-brand-700 text-white py-2 rounded text-sm"
                          >
                            Crear Cliente
                          </button>
                        </div>
                      )}
                    </div>

                  <div className="flex gap-2">
                    <button
                      onClick={cerrarModal}
                      className="flex-1 px-4 py-2 border border-surface-400 bg-surface-300 hover:bg-surface-400 text-gray-100 rounded-lg"
                    >
                      Saltear Comprobante
                    </button>
                    <button
                      onClick={generarComprobante}
                      disabled={generatingInvoice || (tipoComprobante === "A" && !clienteSel)}
                      className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingInvoice ? "Generando..." : "Generar Comprobante"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Vista del comprobante */}
                <div className="p-6">
                  <div className="bg-white text-black p-6 rounded-lg" id="comprobante">
                    <div className="text-center mb-4 border-b pb-4">
                      <h1 className="text-2xl font-bold">FACTURA {invoice.tipo_comprobante}</h1>
                      <p className="text-sm mt-2">Punto de Venta: {invoice.punto_venta} - Número: {invoice.numero_comprobante}</p>
                      <p className="text-xs mt-1">
                        Fecha: {new Date(invoice.fecha_emision).toLocaleDateString("es-AR")}
                      </p>
                    </div>

                    <div className="mb-4">
                      <p className="font-semibold">Cliente:</p>
                      <p>{invoice.cliente_razon_social || "Consumidor Final"}</p>
                      {invoice.cliente_documento && (
                        <p className="text-sm">Doc: {invoice.cliente_documento}</p>
                      )}
                      {invoice.cliente_direccion && (
                        <p className="text-sm">{invoice.cliente_direccion}</p>
                      )}
                      <p className="text-sm">Condición IVA: {invoice.cliente_condicion_iva || "CF"}</p>
                    </div>

                    <div className="mb-4 border-t pt-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Producto</th>
                            <th className="text-center py-2">Cant.</th>
                            <th className="text-right py-2">Precio</th>
                            <th className="text-right py-2">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoice.items?.map((item, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="py-2">{item.product_name || "Producto"}</td>
                              <td className="text-center py-2">{item.qty}</td>
                              <td className="text-right py-2">${Number(item.price).toFixed(2)}</td>
                              <td className="text-right py-2">
                                ${(Number(item.price) * item.qty).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="border-t pt-4 space-y-2 text-right">
                      <div className="flex justify-end gap-4">
                        <span>Subtotal:</span>
                        <span>${Number(invoice.subtotal).toFixed(2)}</span>
                      </div>
                      {invoice.iva > 0 && (
                        <div className="flex justify-end gap-4">
                          <span>IVA 21%:</span>
                          <span>${Number(invoice.iva).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-end gap-4 font-bold text-lg border-t pt-2">
                        <span>TOTAL:</span>
                        <span>${Number(invoice.total).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={imprimirComprobante}
                      className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg"
                    >
                      Imprimir
                    </button>
                    <button
                      onClick={cerrarModal}
                      className="flex-1 px-4 py-2 border border-surface-400 bg-surface-300 hover:bg-surface-400 text-gray-100 rounded-lg"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
