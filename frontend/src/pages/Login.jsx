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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8">
        <h2 className="text-2xl font-semibold mb-6 text-center">Ingresar</h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {err && <div className="text-red-600 text-sm">{err}</div>}
          <button className="w-full bg-black text-white rounded-lg py-2 hover:opacity-90">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
