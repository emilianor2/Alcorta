// src/pages/Usuarios.jsx
import { useEffect, useState } from "react";
import api from "../services/api.js";
import AppHeader from "../components/AppHeader.jsx";

export default function Usuarios() {
  const [activeTab, setActiveTab] = useState("empleados");
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // form empleado
  const [empForm, setEmpForm] = useState({
    apellido: "",
    nombre: "",
    dni: "",
    cuil: "",
    telefono: "",
    email: "",
    direccion: "",
    localidad: "",
    provincia: "",
    puesto: "",
    fecha_ingreso: "",
  });

  // form crear user directo
  const [userForm, setUserForm] = useState({
    email: "",
    full_name: "",
    password: "",
    role: "cajero",
    employee_id: "",
  });

  // form crear user desde empleado
  const [fromEmp, setFromEmp] = useState({
    employee_id: "",
    email: "",
    password: "",
    role: "cajero",
  });

  async function loadEmployees() {
    const { data } = await api.get("/employees");
    setEmployees(data.items || []);
  }

  async function loadUsers() {
    const { data } = await api.get("/users");
    setUsers(data.items || []);
  }

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([loadEmployees(), loadUsers()]);
    } catch (e) {
      console.error(e);
      alert("Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // crear empleado
  async function submitEmpleado(e) {
    e.preventDefault();
    try {
      await api.post("/employees", empForm);
      setEmpForm({
        apellido: "",
        nombre: "",
        dni: "",
        cuil: "",
        telefono: "",
        email: "",
        direccion: "",
        localidad: "",
        provincia: "",
        puesto: "",
        fecha_ingreso: "",
      });
      await loadEmployees();
    } catch (e) {
      alert(e.response?.data?.error || "No se pudo crear el empleado");
    }
  }

  // crear usuario "desde cero"
  async function submitUsuario(e) {
    e.preventDefault();
    try {
      await api.post("/users", {
        ...userForm,
        employee_id: userForm.employee_id || null,
      });
      setUserForm({
        email: "",
        full_name: "",
        password: "",
        role: "cajero",
        employee_id: "",
      });
      await loadUsers();
    } catch (e) {
      alert(e.response?.data?.error || "No se pudo crear el usuario");
    }
  }

  // crear usuario desde empleado existente
  async function submitDesdeEmpleado(e) {
    e.preventDefault();
    if (!fromEmp.employee_id) {
      return alert("Elegí un empleado");
    }
    try {
      await api.post("/users/from-employee", {
        employee_id: fromEmp.employee_id,
        email: fromEmp.email,
        password: fromEmp.password,
        role: fromEmp.role,
      });
      setFromEmp({
        employee_id: "",
        email: "",
        password: "",
        role: "cajero",
      });
      await loadUsers();
    } catch (e) {
      alert(e.response?.data?.error || "No se pudo crear el usuario desde empleado");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <AppHeader title="Usuarios / Empleados" />

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("empleados")}
            className={`px-4 py-2 rounded-lg ${
              activeTab === "empleados"
                ? "bg-black text-white"
                : "bg-white text-gray-700"
            }`}
          >
            Empleados
          </button>
          <button
            onClick={() => setActiveTab("usuarios")}
            className={`px-4 py-2 rounded-lg ${
              activeTab === "usuarios"
                ? "bg-black text-white"
                : "bg-white text-gray-700"
            }`}
          >
            Usuarios del sistema
          </button>
        </div>

        {/* ====================== EMPLEADOS ====================== */}
        {activeTab === "empleados" && (
          <>
            <form
              onSubmit={submitEmpleado}
              className="bg-white p-4 rounded-xl shadow grid md:grid-cols-3 gap-3"
            >
              <div>
                <label className="text-sm">Apellido</label>
                <input
                  className="border rounded-lg px-3 py-2 w-full"
                  value={empForm.apellido}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, apellido: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm">Nombre</label>
                <input
                  className="border rounded-lg px-3 py-2 w-full"
                  value={empForm.nombre}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, nombre: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm">DNI</label>
                <input
                  className="border rounded-lg px-3 py-2 w-full"
                  value={empForm.dni}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, dni: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm">CUIL</label>
                <input
                  className="border rounded-lg px-3 py-2 w-full"
                  value={empForm.cuil}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, cuil: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm">Teléfono</label>
                <input
                  className="border rounded-lg px-3 py-2 w-full"
                  value={empForm.telefono}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, telefono: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm">Email</label>
                <input
                  className="border rounded-lg px-3 py-2 w-full"
                  value={empForm.email}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, email: e.target.value })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm">Dirección</label>
                <input
                  className="border rounded-lg px-3 py-2 w-full"
                  value={empForm.direccion}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, direccion: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm">Localidad</label>
                <input
                  className="border rounded-lg px-3 py-2 w-full"
                  value={empForm.localidad}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, localidad: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm">Provincia</label>
                <input
                  className="border rounded-lg px-3 py-2 w-full"
                  value={empForm.provincia}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, provincia: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm">Puesto</label>
                <input
                  className="border rounded-lg px-3 py-2 w-full"
                  value={empForm.puesto}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, puesto: e.target.value })
                  }
                  placeholder="cajero, mozo, admin..."
                />
              </div>
              <div>
                <label className="text-sm">Fecha ingreso</label>
                <input
                  type="date"
                  className="border rounded-lg px-3 py-2 w-full"
                  value={empForm.fecha_ingreso}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, fecha_ingreso: e.target.value })
                  }
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
                    <th className="py-2 px-2 text-left">Nombre</th>
                    <th className="py-2 px-2 text-left">DNI</th>
                    <th className="py-2 px-2 text-left">CUIL</th>
                    <th className="py-2 px-2 text-left">Puesto</th>
                    <th className="py-2 px-2 text-left">Creado por</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => (
                    <tr key={e.id} className="border-b">
                      <td className="py-2 px-2">{e.id}</td>
                      <td className="py-2 px-2">
                        {e.apellido}, {e.nombre}
                      </td>
                      <td className="py-2 px-2">{e.dni}</td>
                      <td className="py-2 px-2">{e.cuil}</td>
                      <td className="py-2 px-2">{e.puesto || "-"}</td>
                      <td className="py-2 px-2">{e.created_by_name || "-"}</td>
                    </tr>
                  ))}
                  {!employees.length && !loading && (
                    <tr>
                      <td className="py-3 px-2 text-gray-400" colSpan={6}>
                        Sin empleados cargados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ====================== USUARIOS DEL SISTEMA ====================== */}
        {activeTab === "usuarios" && (
          <div className="space-y-6">
            {/* crear usuario directo */}
            <form
              onSubmit={submitUsuario}
              className="bg-white p-4 rounded-xl shadow grid md:grid-cols-4 gap-3"
            >
              <div className="md:col-span-4">
                <h2 className="font-semibold">Crear usuario del sistema</h2>
              </div>
              <div>
                <label className="text-sm">Email</label>
                <input
                  className="border rounded-lg px-3 py-2 w-full"
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm({ ...userForm, email: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm">Nombre completo</label>
                <input
                  className="border rounded-lg px-3 py-2 w-full"
                  value={userForm.full_name}
                  onChange={(e) =>
                    setUserForm({ ...userForm, full_name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm">Contraseña</label>
                <input
                  type="password"
                  className="border rounded-lg px-3 py-2 w-full"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm({ ...userForm, password: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm">Rol</label>
                <select
                  className="border rounded-lg px-3 py-2 w-full"
                  value={userForm.role}
                  onChange={(e) =>
                    setUserForm({ ...userForm, role: e.target.value })
                  }
                >
                  <option value="admin">Admin</option>
                  <option value="cajero">Cajero</option>
                  <option value="mozo">Mozo</option>
                </select>
              </div>
              <div>
                <label className="text-sm">Asociar a empleado (opcional)</label>
                <select
                  className="border rounded-lg px-3 py-2 w-full"
                  value={userForm.employee_id}
                  onChange={(e) =>
                    setUserForm({ ...userForm, employee_id: e.target.value })
                  }
                >
                  <option value="">-- Ninguno --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.apellido}, {e.nombre} ({e.dni})
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-4 flex justify-end">
                <button className="bg-black text-white px-4 py-2 rounded-lg">
                  Crear usuario
                </button>
              </div>
            </form>

            {/* crear usuario desde empleado */}
            <form
              onSubmit={submitDesdeEmpleado}
              className="bg-white p-4 rounded-xl shadow grid md:grid-cols-4 gap-3"
            >
              <div className="md:col-span-4">
                <h2 className="font-semibold">Crear usuario desde empleado</h2>
              </div>
              <div>
                <label className="text-sm">Empleado</label>
                <select
                  className="border rounded-lg px-3 py-2 w-full"
                  value={fromEmp.employee_id}
                  onChange={(e) =>
                    setFromEmp({ ...fromEmp, employee_id: e.target.value })
                  }
                >
                  <option value="">-- Elegir empleado --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.apellido}, {e.nombre} ({e.dni})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm">Email de acceso</label>
                <input
                  className="border rounded-lg px-3 py-2 w-full"
                  value={fromEmp.email}
                  onChange={(e) =>
                    setFromEmp({ ...fromEmp, email: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm">Contraseña</label>
                <input
                  type="password"
                  className="border rounded-lg px-3 py-2 w-full"
                  value={fromEmp.password}
                  onChange={(e) =>
                    setFromEmp({ ...fromEmp, password: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm">Rol</label>
                <select
                  className="border rounded-lg px-3 py-2 w-full"
                  value={fromEmp.role}
                  onChange={(e) =>
                    setFromEmp({ ...fromEmp, role: e.target.value })
                  }
                >
                  <option value="cajero">Cajero</option>
                  <option value="admin">Admin</option>
                  <option value="mozo">Mozo</option>
                </select>
              </div>
              <div className="md:col-span-4 flex justify-end">
                <button className="bg-black text-white px-4 py-2 rounded-lg">
                  Crear desde empleado
                </button>
              </div>
            </form>

            {/* tabla de usuarios */}
            <div className="bg-white p-4 rounded-xl shadow overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="py-2 px-2 text-left">#</th>
                    <th className="py-2 px-2 text-left">Email</th>
                    <th className="py-2 px-2 text-left">Nombre</th>
                    <th className="py-2 px-2 text-left">Rol</th>
                    <th className="py-2 px-2 text-left">Empleado</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b">
                      <td className="py-2 px-2">{u.id}</td>
                      <td className="py-2 px-2">{u.email}</td>
                      <td className="py-2 px-2">{u.full_name}</td>
                      <td className="py-2 px-2">{u.role}</td>
                      <td className="py-2 px-2">
                        {u.apellido
                          ? `${u.apellido}, ${u.nombre}`
                          : u.employee_id
                          ? `#${u.employee_id}`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                  {!users.length && !loading && (
                    <tr>
                      <td className="py-3 px-2 text-gray-400" colSpan={5}>
                        Sin usuarios cargados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
