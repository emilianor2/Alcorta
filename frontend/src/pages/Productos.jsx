import { useEffect, useState } from "react";
import api from "../services/api";
import AppHeader from "../components/AppHeader.jsx";

export default function Productos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({ id: null, name: "", price: "", sku: "" });
  const editing = form.id !== null;

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/products");
      setItems(data.items || []);
    } catch (e) {
      console.error(e);
      alert("Error cargando productos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setForm({ id: null, name: "", price: "", sku: "" });
  }

  function startEdit(p) {
    setForm({
      id: p.id,
      name: p.name,
      price: String(p.price),
      sku: p.sku || "",
    });
  }

  async function save(e) {
    e.preventDefault();
    try {
      if (!form.name || form.price === "") {
        return alert("Completá nombre y precio");
      }
      const payload = {
        name: form.name,
        price: Number(form.price),
        sku: form.sku || null,
      };
      if (editing) {
        await api.put(`/products/${form.id}`, payload);
      } else {
        await api.post("/products", payload);
      }
      await load();
      startNew();
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar");
    }
  }

  async function remove(id) {
    if (!confirm("¿Eliminar producto?")) return;
    try {
      await api.delete(`/products/${id}`);
      await load();
      if (form.id === id) startNew();
    } catch (e) {
      console.error(e);
      alert("No se pudo eliminar");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <AppHeader title="Productos" />

        {/* Formulario */}
        <form
          onSubmit={save}
          className="bg-white rounded-xl shadow p-4 grid sm:grid-cols-4 gap-3 items-end"
        >
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Nombre</label>
            <input
              className="border rounded-lg w-full px-3 py-2"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="Ej: Hamburguesa simple"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Precio</label>
            <input
              type="number"
              step="0.01"
              className="border rounded-lg w-full px-3 py-2"
              value={form.price}
              onChange={(e) =>
                setForm((f) => ({ ...f, price: e.target.value }))
              }
              placeholder="3500.00"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">SKU (opcional)</label>
            <input
              className="border rounded-lg w-full px-3 py-2"
              value={form.sku}
              onChange={(e) =>
                setForm((f) => ({ ...f, sku: e.target.value }))
              }
              placeholder="COD-123"
            />
          </div>

          <div className="sm:col-span-4 flex gap-2 justify-end">
            {editing && (
              <button
                type="button"
                className="px-4 py-2 rounded-lg border"
                onClick={startNew}
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-black text-white hover:opacity-90"
            >
              {editing ? "Guardar cambios" : "Crear producto"}
            </button>
          </div>
        </form>

        {/* Tabla */}
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left border-b bg-gray-50">
              <tr>
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Nombre</th>
                <th className="py-2 px-3">SKU</th>
                <th className="py-2 px-3">Precio</th>
                <th className="py-2 px-3 w-40">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2 px-3">{p.id}</td>
                  <td className="py-2 px-3">{p.name}</td>
                  <td className="py-2 px-3">{p.sku || "-"}</td>
                  <td className="py-2 px-3">
                    ${Number(p.price).toFixed(2)}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-1 rounded-lg border"
                        onClick={() => startEdit(p)}
                      >
                        Editar
                      </button>
                      <button
                        className="px-3 py-1 rounded-lg border border-red-500 text-red-600"
                        onClick={() => remove(p.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && !loading && (
                <tr>
                  <td className="py-3 px-3 text-gray-500" colSpan={5}>
                    No hay productos aún.
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
