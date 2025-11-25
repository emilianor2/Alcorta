import { useEffect, useMemo, useRef, useState } from "react";
import AppHeader from "../components/AppHeader.jsx";
import api from "../services/api";

const STATUS_STYLES = {
  abierto: {
    label: "Sin iniciar",
    badge: "bg-amber-500/20 text-amber-100 border border-amber-400/40",
    pill: "from-amber-500/20 to-transparent border-amber-500/40",
    actionLabel: "Comenzar",
    nextStatus: "en_preparacion",
  },
  en_preparacion: {
    label: "En proceso",
    badge: "bg-emerald-500/20 text-emerald-100 border border-emerald-400/40",
    pill: "from-emerald-500/20 to-transparent border-emerald-500/40",
    actionLabel: "Finalizar",
    nextStatus: "preparado",
  },
  preparado: {
    label: "Finalizado",
    badge: "bg-rose-500/20 text-rose-100 border border-rose-400/40",
    pill: "from-rose-500/20 to-transparent border-rose-500/40",
    actionLabel: null,
    nextStatus: null,
  },
};

function diffMinutes(from, to = Date.now()) {
  if (!from) return null;
  const diffMs = to - new Date(from).getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

function formatDiff(mins) {
  if (mins === null) return "-";
  if (mins < 1) return "menos de 1 min";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}

export default function Cocina() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const scrollRestore = useRef(null);

  const loadOrders = async ({ preserveScroll = false } = {}) => {
    try {
      setLoading(true);
      if (preserveScroll) {
        scrollRestore.current = window.scrollY;
      } else {
        scrollRestore.current = null;
      }
      const { data } = await api.get("/orders/kitchen");
      setOrders(data.items || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Error al cargar pedidos");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(() => loadOrders({ preserveScroll: true }), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRestore.current !== null) {
      window.scrollTo({ top: scrollRestore.current });
      scrollRestore.current = null;
    }
  }, [orders]);

  const normalizedOrders = useMemo(
    () => orders.map((o) => ({ ...o, prep_status: o.prep_status || "abierto" })),
    [orders]
  );

  const grouped = useMemo(() => {
    return {
      abierto: normalizedOrders.filter((o) => o.prep_status === "abierto"),
      en_preparacion: normalizedOrders.filter(
        (o) => o.prep_status === "en_preparacion"
      ),
      preparado: normalizedOrders.filter((o) => o.prep_status === "preparado"),
    };
  }, [normalizedOrders]);

  const updatePrepStatus = async (orderId, status) => {
    try {
      setUpdatingId(orderId);
      await api.patch(`/orders/${orderId}/prep`, { prep_status: status });
      await loadOrders();
    } catch (err) {
      alert(err.response?.data?.error || "No se pudo actualizar el pedido");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-100 to-surface-50 text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <AppHeader title="Panel de Cocina" showBack={false} />

        {error && (
          <div className="mb-4 rounded-xl border border-danger-500/40 bg-danger-500/10 p-4 text-danger-200">
            {error === "NO_CASH_OPEN"
              ? "No hay caja abierta, todavía no se cargaron pedidos."
              : error}
          </div>
        )}

        <div className="space-y-5">
          {["abierto", "en_preparacion", "preparado"].map((statusKey) => {
            const lista = grouped[statusKey] || [];
            const meta = STATUS_STYLES[statusKey];

            return (
              <section key={statusKey} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div>
                    <div
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm bg-surface-200 border border-surface-400 ${meta.badge}`}
                    >
                      <span className="font-semibold tracking-wide uppercase text-xs">
                        {meta.label}
                      </span>
                      <span className="text-xs text-gray-300">
                        {lista.length} pedido{lista.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 h-px bg-surface-400/60" />
                </div>

                {loading ? (
                  <p className="text-gray-400 text-sm">Cargando pedidos...</p>
                ) : lista.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    {statusKey === "abierto"
                      ? "No hay pedidos pendientes."
                      : statusKey === "en_preparacion"
                      ? "No hay pedidos en preparación."
                      : "No hay pedidos finalizados."}
                  </p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {lista.map((pedido) => {
                      const createdDiff = formatDiff(
                        diffMinutes(pedido.created_at)
                      );
                      const prepDiff =
                        pedido.prep_status === "en_preparacion"
                          ? formatDiff(
                              diffMinutes(
                                pedido.updated_at ||
                                  pedido.items_updated_at ||
                                  pedido.created_at
                              )
                            )
                          : pedido.prep_status === "preparado"
                          ? formatDiff(
                              diffMinutes(
                                pedido.updated_at ||
                                  pedido.items_updated_at ||
                                  pedido.created_at,
                                new Date(
                                  pedido.closed_at ||
                                    pedido.updated_at ||
                                    pedido.created_at
                                ).getTime()
                              )
                            )
                          : "-";
                      const totalDiff =
                        pedido.prep_status === "preparado"
                          ? formatDiff(
                              diffMinutes(
                                pedido.created_at,
                                new Date(
                                  pedido.closed_at ||
                                    pedido.updated_at ||
                                    pedido.created_at
                                ).getTime()
                              )
                            )
                          : formatDiff(diffMinutes(pedido.created_at));
                      const addedDiff =
                        pedido.was_modified && pedido.items_updated_at
                          ? formatDiff(diffMinutes(pedido.items_updated_at))
                          : null;
                      const cardBorder = pedido.was_modified
                        ? "border-amber-400/60 shadow-[0_0_18px_rgba(251,191,36,0.35)]"
                        : "border-surface-400";

                      return (
                        <article
                          key={pedido.id}
                          className={`rounded-2xl border bg-surface-200/80 backdrop-blur-sm shadow-card p-4 flex flex-col gap-3 ${cardBorder}`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-lg font-semibold text-white">
                                Pedido #{pedido.order_number || pedido.id}
                              </p>
                              <p className="text-xs text-gray-400">
                                Creado hace {createdDiff}
                              </p>
                            </div>
                            <span
                              className={`text-xs px-3 py-1 rounded-full font-semibold ${meta.badge}`}
                            >
                              {meta.label}
                            </span>
                          </div>

                          <div className="rounded-xl border border-surface-400/70 bg-surface-100/40 p-3 space-y-2">
                            {(pedido.items || []).map((item) => (
                              <div
                                key={`${pedido.id}-${item.id}`}
                                className="flex justify-between text-sm text-gray-200"
                              >
                                <div>
                                  <p className="font-medium text-white">
                                    {item.description ||
                                      item.product_name ||
                                      "Producto"}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    x{item.quantity} · $
                                    {Number(item.unit_price).toFixed(2)}
                                  </p>
                                </div>
                                <span className="font-semibold">
                                  $
                                  {Number(
                                    item.total ||
                                      item.unit_price * item.quantity
                                  ).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-col gap-2 text-white">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div>
                                <p className="text-xs uppercase tracking-wide text-gray-400">
                                  Total
                                </p>
                                <p className="text-xl font-semibold">
                                  ${Number(pedido.total || 0).toFixed(2)}
                                </p>
                              </div>
                              {pedido.was_modified && (
                                <div className="flex flex-col sm:items-end">
                                  <span className="text-xs px-3 py-1 rounded-full bg-amber-500/15 text-amber-200 border border-amber-500/30">
                                    Nuevo producto agregado
                                  </span>
                                  {addedDiff && (
                                    <span className="text-[11px] text-amber-100 mt-1">
                                      Hace {addedDiff}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-300">
                              <div className="rounded-lg border border-surface-500/50 bg-surface-100/20 p-2">
                                <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                  Desde creación
                                </p>
                                <p className="text-sm text-white font-semibold">
                                  {createdDiff}
                                </p>
                              </div>
                              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2">
                                <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                  En proceso
                                </p>
                                <p className="text-sm text-white font-semibold">
                                  {prepDiff}
                                </p>
                              </div>
                              <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-2">
                                <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                  Tiempo total
                                </p>
                                <p className="text-sm text-white font-semibold">
                                  {totalDiff}
                                </p>
                              </div>
                            </div>
                          </div>

                          {meta.actionLabel && (
                            <button
                              className="mt-auto w-full rounded-lg bg-brand-600 hover:bg-brand-700 text-white py-2 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                              disabled={updatingId === pedido.id}
                              onClick={() =>
                                updatePrepStatus(pedido.id, meta.nextStatus)
                              }
                            >
                              {meta.actionLabel}
                            </button>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

