import { useNavigate, Link } from "react-router-dom";

export default function AppHeader({ title = "Panel", showBack = true }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <header className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-1 rounded-lg border bg-white hover:bg-gray-50"
          >
            ← Volver
          </button>
        )}
        <h1 className="text-2xl font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">
          {user?.full_name || user?.email} ({user?.role})
        </span>
        <Link
          to="/app"
          className="text-sm px-3 py-1 rounded-lg border bg-white hover:bg-gray-50"
        >
          Inicio
        </Link>
        <button
          onClick={handleLogout}
          className="text-sm px-3 py-1 rounded-lg bg-black text-white"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
