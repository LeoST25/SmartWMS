import { useState } from "react";
import { api } from "../services/api";

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [carregando, setCarregando] = useState(false);

  // Envia as credenciais para a API em C#
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);

    try {
      const response = await api.post("/auth/login", {
        username,
        password,
      });

      if (response.status === 200) {
        const dados = response.data;
        // Salva os dados da sessão de forma segura no navegador
        localStorage.setItem("wms_token", dados.token);
        localStorage.setItem("wms_user", dados.usuario);
        localStorage.setItem("wms_role", dados.nivelAcesso);

        onLoginSuccess(); // Avisa o App.tsx que o login deu certo
      }
    } catch (error) {
      alert(
        "Credenciais inválidas ou servidor offline! Tente criar uma conta de teste abaixo.",
      );
    } finally {
      setCarregando(false);
    }
  };

  // Cria a conta padrão de teste direto no banco SQLite através da API
  const criarContaTeste = async () => {
    try {
      await api.post("/auth/registrar", {
        username: "leonardo",
        passwordHash: "senha123",
        role: "Gerente",
      });
      alert('Conta "leonardo" com senha "senha123" criada com sucesso!');
      setUsername("leonardo");
      setPassword("senha123");
    } catch (error) {
      alert(
        "A conta de teste já existe no banco. Basta digitar os dados e entrar!",
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-8 shadow-2xl border border-slate-800 transition-all duration-300">
        {/* Marca/Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl block mb-2">📦</span>
          <h2 className="text-3xl font-black tracking-tight text-white">
            Smart WMS
          </h2>
          <p className="text-slate-400 mt-1 text-sm">
            Controle de Acesso ao Armazém
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Usuário do Galpão
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
              placeholder="Ex: leonardo"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Senha Corporativa
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-xl bg-blue-600 p-3 text-sm font-bold text-white hover:bg-blue-500 active:bg-blue-700 transition disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-600/20"
          >
            {carregando ? "Autenticando..." : "Entrar no Sistema"}
          </button>
        </form>

        {/* Divisor Visual */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <span className="relative bg-slate-900 px-3 text-xs text-slate-500 uppercase font-semibold">
            Ambiente de Dev
          </span>
        </div>

        {/* Utilitário de Teste */}
        <button
          onClick={criarContaTeste}
          className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition cursor-pointer"
        >
          📋 Gerar Operador de Teste Automático (Gerente)
        </button>
      </div>
    </div>
  );
}
