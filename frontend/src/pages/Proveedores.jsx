// src/pages/Proveedores.jsx
import { useEffect, useState } from "react";
import api from "../services/api";
import AppHeader from "../components/AppHeader.jsx";

export default function Proveedores() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    razon_social: "",
    cuit: "",
    iibb: "",
    condicion_iva: "CF",
    telefono: "",
    email: "",
    direccion: "",
    localidad: "",
    provincia: "",
    contacto: "",
    notas: "",
  });

  async function load() {
    try {
      const { data } = await api.get("/suppliers");
      setItems(data.items || []);
    } catch (e) {
      alert("Error cargando proveedores");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    try {
      await api.post("/suppliers", form);
      setForm({
        razon_social: "",
        cuit: "",
        iibb: "",
        condicion_iva: "CF",
        telefono: "",
        email: "",
        direccion: "",
        localidad: "",
        provincia: "",
        contacto: "",
        notas: "",
      });
      await load();
    } catch (e) {
      alert(e.response?.data?.error || "No se pudo crear el proveedor");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <AppHeader title="Proveedores" />

        <form
          onSubmit={onSubmit}
          className="bg-white p-4 rounded-xl shadow grid md:grid-cols-3 gap-3"
        >
          <div className="md:col-span-2">
            <label className="text-sm">Razón social</label>
            <input
              className="border rounded-lg px-3 py-2 w-full"
              value={form.razon_social}
              onChange={(e) =>
                setForm({ ...form, razon_social: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label className="text-sm">CUIT</label>
            <input
              className="border rounded-lg px-3 py-2 w-full"
              value={form.cuit}
              onChange={(e) => setForm({ ...form, cuit: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm">Ing. Brutos</label>
            <input
              className="border rounded-lg px-3 py-2 w-full"
              value={form.iibb}
              onChange={(e) => setForm({ ...form, iibb: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm">Condición IVA</label>
            <select
              className="border rounded-lg px-3 py-2 w-full"
              value={form.condicion_iva}
              onChange={(e) =>
                setForm({ ...form, condicion_iva: e.target.value })
              }
            >
              <option value="RI">Responsable Inscripto</option>
              <option value="Monotributo">Monotributo</option>
              <option value="Exento">Exento</option>
              <option value="CF">Consumidor Final</option>
            </select>
          </div>
          <div>
            <label className="text-sm">Teléfono</label>
            <input
              className="border rounded-lg px-3 py-2 w-full"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm">Email</label>
            <input
              className="border rounded-lg px-3 py-2 w-full"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm">Dirección</label>
            <input
              className="border rounded-lg px-3 py-2 w-full"
              value={form.direccion}
              onChange={(e) =>
                setForm({ ...form, direccion: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-sm">Localidad</label>
            <input
              className="border rounded-lg px-3 py-2 w-full"
              value={form.localidad}
              onChange={(e) =>
                setForm({ ...form, localidad: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-sm">Provincia</label>
            <input
              className="border rounded-lg px-3 py-2 w-full"
              value={form.provincia}
              onChange={(e) =>
                setForm({ ...form, provincia: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-sm">Contacto</label>
            <input
              className="border rounded-lg px-3 py-2 w-full"
              value={form.contacto}
              onChange={(e) => setForm({ ...form, contacto: e.target.value })}
            />
          </div>
          <div className="md:col-span-3">
            <label className="text-sm">Notas</label>
            <textarea
              className="border rounded-lg px-3 py-2 w-full"
              rows={2}
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
            />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button className="bg-black text-white rounded-lg px-4 py-2">
              Guardar
            </button>
          </div>
        </form>

        <div className="bg-white p-4 rounded-xl shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="py-2 px-2 text-left">#</th>
                <th className="py-2 px-2 text-left">Razón social</th>
                <th className="py-2 px-2 text-left">CUIT</th>
                <th className="py-2 px-2 text-left">Teléfono</th>
                <th className="py-2 px-2 text-left">Email</th>
                <th className="py-2 px-2 text-left">Creado por</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2 px-2">{p.id}</td>
                  <td className="py-2 px-2">{p.razon_social}</td>
                  <td className="py-2 px-2">{p.cuit}</td>
                  <td className="py-2 px-2">{p.telefono || "-"}</td>
                  <td className="py-2 px-2">{p.email || "-"}</td>
                  <td className="py-2 px-2">{p.created_by_name || "-"}</td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td className="py-3 px-2 text-gray-400" colSpan={6}>
                    Sin proveedores cargados.
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
