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
    <header className="mb-6">
      <div className="flex items-center justify-between rounded-2xl bg-surface-200 shadow-card px-4 py-3 border border-surface-300">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="px-3 py-2 rounded-lg border border-surface-400 bg-surface-300 hover:bg-surface-400 text-gray-100"
            >
              ← Volver
            </button>
          )}
          <h1 className="text-xl sm:text-2xl font-semibold text-white">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center text-sm text-gray-300">
            {user?.full_name || user?.email}
            <span className="ml-2 inline-flex items-center rounded-md bg-brand-500/15 text-brand-300 text-xs px-2 py-0.5 border border-brand-500/30">
              {user?.role}
            </span>
          </span>
          <Link
            to="/app"
            className="text-sm px-3 py-2 rounded-lg border border-surface-400 bg-surface-300 hover:bg-surface-400 text-gray-100"
          >
            Inicio
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
