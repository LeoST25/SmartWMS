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

export default function App(): JSX.Element {
  const [logado, setLogado] = useState<boolean>(false);
  const [usuario, setUsuario] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [abaAtiva, setAbaAtiva] = useState<Aba>("produtos");

  useEffect(() => {
    const token = localStorage.getItem("wms_token");
    const user = localStorage.getItem("wms_user");
    const userRole = localStorage.getItem("wms_role");

    if (token && user && userRole) {
      setLogado(true);
      setUsuario(user);
      setRole(userRole);
    }
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
                  onMovimentacaoSucesso={() => {
                    console.log("Estoque alterado!");
                  }}
                />
              )}

              {abaAtiva === "vagas" && <VagasPanel />}
              {abaAtiva === "auditoria" && <AuditoriaPanel />}
              {abaAtiva === "dashboard" && <DashboardPanel />}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
