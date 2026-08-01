import axios from "axios";

const API_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:5000/api"
).replace(/\/$/, "");

const SESSION_STORAGE_KEYS = ["wms_token", "wms_user", "wms_role"] as const;

function clearWmsSession(): void {
  SESSION_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("wms_token");

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.endsWith("/auth/login") ?? false;

      if (!isLoginRequest) {
        clearWmsSession();
        window.dispatchEvent(new Event("wms:unauthorized"));
      }
    }

    return Promise.reject(error);
  },
);
