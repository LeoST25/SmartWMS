import { useState, useEffect } from "react";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import ProdutosPanel from "./components/ProdutosPanel";
import VagasPanel from "./components/VagasPanel";
import AuditoriaPanel from "./components/AuditoriaPanel";

export default function App() {
  const [logado, setLogado] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [role, setRole] = useState("");
  const [abaAtiva, setAbaAtiva] = useState("produtos");

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

  const handleLogout = () => {
    localStorage.clear();
    setLogado(false);
    setUsuario("");
    setRole("");
  };

  if (!logado) {
    return (
      <Login
        onLoginSuccess={() => {
          setLogado(true);
          setUsuario(localStorage.getItem("wms_user") || "");
          setRole(localStorage.getItem("wms_role") || "");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
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
            Gerenciamento operacional e controle de mapeamento físico.
          </p>
        </header>

        <div>
          {abaAtiva === "produtos" && (
            <ProdutosPanel
              onMovimentacaoSucesso={() => console.log("Estoque alterado!")}
            />
          )}

          {/* 🏢 MAPA DE VAGAS EM REAL TIME ATIVADO NO APP */}
          {abaAtiva === "vagas" && <VagasPanel />}

          {abaAtiva === "auditoria" && (
            <AuditoriaPanel />
          )}

          {abaAtiva === "dashboard" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-500">
              Os Gráficos de KPIs de Ocupação serão renderizados aqui...
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
