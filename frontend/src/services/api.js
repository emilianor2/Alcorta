import axios from "axios";

// Detectar la URL base automáticamente
function getBaseURL() {
  // Si hay una variable de entorno, usarla
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Si estamos en localhost, usar localhost
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "http://localhost:4000/api";
  }
  
  // Si estamos en la red, usar la misma IP del frontend pero con puerto 4000
  return `http://${window.location.hostname}:4000/api`;
}

const api = axios.create({
  baseURL: getBaseURL(),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");  // 👈 guardalo al hacer login
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
