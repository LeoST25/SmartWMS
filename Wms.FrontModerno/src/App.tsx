import { useEffect, useState, type JSX } from "react";
import { Toaster } from "sonner";

import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import ProdutosPanel from "./components/ProdutosPanel";
import VagasPanel from "./components/VagasPanel";
import AuditoriaPanel from "./components/AuditoriaPanel";
import DashboardPanel from "./components/DashboardPanel";

type Aba = "produtos" | "vagas" | "auditoria" | "dashboard";

const ABAS_VALIDAS: readonly Aba[] = [
  "produtos",
  "vagas",
  "auditoria",
  "dashboard",
];

function isAbaValida(aba: string): aba is Aba {
  return ABAS_VALIDAS.includes(aba as Aba);
}

function readStoredSession(): {
  logado: boolean;
  usuario: string;
  role: string;
} {
  const token = localStorage.getItem("wms_token");
  const usuario = localStorage.getItem("wms_user") ?? "";
  const role = localStorage.getItem("wms_role") ?? "";

  return {
    logado: Boolean(token && usuario && role),
    usuario,
    role,
  };
}

const INITIAL_SESSION = readStoredSession();

export default function App(): JSX.Element {
  const [logado, setLogado] = useState<boolean>(INITIAL_SESSION.logado);
  const [usuario, setUsuario] = useState<string>(INITIAL_SESSION.usuario);
  const [role, setRole] = useState<string>(INITIAL_SESSION.role);
  const [abaAtiva, setAbaAtiva] = useState<Aba>("produtos");

  useEffect(() => {
    const handleUnauthorized = (): void => {
      setLogado(false);
      setUsuario("");
      setRole("");
      setAbaAtiva("produtos");
    };

    window.addEventListener("wms:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("wms:unauthorized", handleUnauthorized);
    };
  }, []);

  const handleLoginSuccess = (): void => {
    const user = localStorage.getItem("wms_user") ?? "";
    const userRole = localStorage.getItem("wms_role") ?? "";

    setUsuario(user);
    setRole(userRole);
    setLogado(true);
  };

  const handleAbaChange = (aba: string): void => {
    if (isAbaValida(aba)) {
      setAbaAtiva(aba);
    }
  };

  const handleLogout = (): void => {
    localStorage.removeItem("wms_token");
    localStorage.removeItem("wms_user");
    localStorage.removeItem("wms_role");

    setLogado(false);
    setUsuario("");
    setRole("");
    setAbaAtiva("produtos");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <Toaster position="top-right" theme="dark" richColors closeButton />

      {!logado ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <>
          <Sidebar
            usuario={usuario}
            role={role}
            onLogout={handleLogout}
            abaAtiva={abaAtiva}
            setAbaAtiva={handleAbaChange}
          />

          <main className="flex-1 p-8 overflow-y-auto">
            <header className="mb-8">
              <h2 className="text-2xl font-black text-white capitalize tracking-tight">
                {abaAtiva}
              </h2>

              <p className="text-slate-400 text-sm">
                Gerenciamento operacional e controle de inventário corporativo.
              </p>
            </header>

            <div>
              {abaAtiva === "produtos" && (
                <ProdutosPanel
                  canManage={role === "Gerente"}
                  onMovimentacaoSucesso={() => {
                    console.log("Estoque alterado!");
                  }}
                />
              )}

              {abaAtiva === "vagas" && <VagasPanel canManage={role === "Gerente"} />}
              {abaAtiva === "auditoria" && (
                <AuditoriaPanel canManage={role === "Gerente"} />
              )}
              {abaAtiva === "dashboard" && <DashboardPanel />}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
