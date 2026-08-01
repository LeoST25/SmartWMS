// Configuração moderna do Vite integrada ao Tailwind CSS v4
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Ativa o compilador do Tailwind nativo
  ],
});
