import { useState, useCallback } from "react";
import { Toaster } from "sonner";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import ProdutosPanel from "./components/ProdutosPanel";
import VagasPanel from "./components/VagasPanel";
import AuditoriaPanel from "./components/AuditoriaPanel";
import DashboardPanel from "./components/DashboardPanel";

export default function App() {
  const [logado, setLogado] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [role, setRole] = useState("");
  const [abaAtiva, setAbaAtiva] = useState("produtos");

  // MEMOIZAÇÃO: Sincronização segura das credenciais locais
  const verificarSessaoAtiva = useCallback(() => {
    const token = localStorage.getItem("wms_token");
    const user = localStorage.getItem("wms_user");
    const userRole = localStorage.getItem("wms_role");

    if (token && user && userRole) {
      setLogado(true);
      setUsuario(user);
      setRole(userRole);
    }
  }, []);

  // Inicialização direta e livre de renders em cascata
  verificarSessaoAtiva();

  const handleLogout = () => {
    localStorage.clear();
    setLogado(false);
    setUsuario("");
    setRole("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <Toaster position="top-right" theme="dark" richColors closeButton />

      {!logado ? (
        <Login
          onLoginSuccess={() => {
            setLogado(true);
            setUsuario(localStorage.getItem("wms_user") || "");
            setRole(localStorage.getItem("wms_role") || "");
          }}
        />
      ) : (
        <>
          <Sidebar
            usuario={usuario}
            role={role}
            onLogout={handleLogout}
            abaAtiva={abaAtiva}
            setAbaAtiva={setAbaAtiva}
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
                  onMovimentacaoSucesso={() => console.log("Estoque alterado!")}
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
