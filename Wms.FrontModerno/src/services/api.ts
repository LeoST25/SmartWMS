import axios from "axios";

// Em produção, configure VITE_API_URL com o endereço público da API.
const API_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:5000/api"
).replace(/\/$/, "");

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// INTERCEPTADOR: Executa automaticamente antes de qualquer requisição sair do front-end
api.interceptors.request.use(
  (config) => {
    // Busca o Token JWT que guardaremos no navegador após o login
    const token = localStorage.getItem("wms_token");

    if (token && config.headers) {
      // Injeta o token Bearer automaticamente de forma transparente
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Trata erros globais (Ex: se o token expirar e receber um 401, desloga o usuário)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.clear();
      window.location.reload(); // Recarrega a tela para voltar ao login
    }
    return Promise.reject(error);
  },
);
