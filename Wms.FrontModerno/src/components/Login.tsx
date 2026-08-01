import { useState } from "react";
import { api } from "../services/api";
import { toast } from "sonner";

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Operador");
  const [carregando, setCarregando] = useState(false);

  // Envia as credenciais para a API autenticadora em C#
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);

    try {
      const response = await api.post("/auth/login", {
        username: username.trim(),
        password,
      });

      if (response.status === 200) {
        const dados = response.data;
        localStorage.setItem("wms_token", dados.token);
        localStorage.setItem("wms_user", dados.usuario);
        localStorage.setItem("wms_role", dados.nivelAcesso);

        toast.success(`Acesso autorizado! Bem vindo, ${dados.usuario}.`);
        onLoginSuccess();
      }
    } catch (error) {
      toast.error("Falha na autenticação: Nome de usuário ou senha incorretos.");
    } finally {
      setCarregando(false);
    }
  };

  // Cadastra um novo operador ou gerente real no banco SQLite via API
  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();

    if (username.trim().length < 3) {
      toast.warning("O nome de usuário deve ter no mínimo 3 caracteres.");
      return;
    }
    if (password.length < 6) {
      toast.warning("A senha deve possuir no mínimo 6 caracteres.");
      return;
    }

    setCarregando(true);
    try {
      const response = await api.post("/auth/registrar", {
        username: username.trim(),
        passwordHash: password,
        role,
      });

      if (response.status === 201) {
        toast.success(
          "Operador cadastrado com sucesso na base.",
        );
        setIsLogin(true);
      }
    } catch (error: any) {
      const msg =
        error.response?.data ||
        "Erro interno ao processar registro do operador.";
      toast.error(msg);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-8 shadow-2xl border border-slate-800 transition-all duration-300">
        <div className="text-center mb-8">
          <span className="text-5xl block mb-2">📦</span>
          <h2 className="text-3xl font-black tracking-tight text-white">
            Smart WMS
          </h2>
          <p className="text-slate-400 mt-1 text-sm">
            {isLogin
              ? "Controle de Acesso ao Armazém"
              : "Cadastro de Novo Operador"}
          </p>
        </div>

        <form
          onSubmit={isLogin ? handleLogin : handleRegistro}
          className="space-y-5"
        >
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Nome de Usuário
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
              placeholder="Ex: leonardo_silva"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Senha de Acesso
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

          {/* Controle de Autorização por Perfil (Roles) */}
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Nível de Autorização (Role)
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer"
              >
                <option value="Operador">
                  Operador Logístico (Leitura de Inventário)
                </option>
                <option value="Gerente">
                  Gerente de Inventário (Acesso Administrativo Total)
                </option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-xl bg-blue-600 p-3 text-sm font-bold text-white hover:bg-blue-500 active:bg-blue-700 transition disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-600/20"
          >
            {carregando
              ? "Comunicando com o Servidor..."
              : isLogin
                ? "Entrar no Sistema"
                : "Finalizar Cadastro"}
          </button>
        </form>

        {/* Alternador de Contexto */}
        <div className="text-center mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setPassword("");
              setUsername("");
            }}
            className="text-xs font-medium text-slate-400 hover:text-blue-400 transition underline cursor-pointer"
          >
            {isLogin
              ? "Não tem uma credencial? Solicitar acesso de operador"
              : "Já possui cadastro ativo? Retornar ao Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
