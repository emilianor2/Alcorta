import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data.ok) {
        // guardo todo
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        // si es admin lo mando a /app (dashboard)
        // si es cajero también, porque el home ya va a mostrar lo que le toca
        navigate("/app", { replace: true });
      } else {
        setErr("Credenciales inválidas");
      }
    } catch (e) {
      setErr(e.response?.data?.error || "Error al iniciar sesión");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-surface-100 to-surface-50 px-4">
      <div className="w-full max-w-md bg-surface-200 border border-surface-400 rounded-2xl shadow-card p-8">
        <div className="text-center mb-6">
          <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white font-bold">
            A
          </div>
          <h2 className="text-2xl font-semibold text-white">Alcorta</h2>
          <p className="text-sm text-gray-300">Ingresá a tu cuenta</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <input
              className="w-full border border-surface-400 bg-surface-300 text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <input
              className="w-full border border-surface-400 bg-surface-300 text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {err && <div className="text-danger-500 text-sm">{err}</div>}
          <button className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2 shadow">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
