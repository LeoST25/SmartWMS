import {
  Package,
  MapPin,
  History,
  BarChart3,
  LogOut,
  User,
} from "lucide-react";

type Aba = "produtos" | "vagas" | "auditoria" | "dashboard";

interface SidebarProps {
  usuario: string;
  role: string;
  onLogout: () => void;
  abaAtiva: string;
  setAbaAtiva: (aba: string) => void;
}

export default function Sidebar({
  usuario,
  role,
  onLogout,
  abaAtiva,
  setAbaAtiva,
}: SidebarProps) {
  // Itens do menu com seus respectivos ícones do Lucide
const menuItens: {
  id: Aba;
  nome: string;
  icone: typeof Package;
}[] = [
  { id: "produtos", nome: "Produtos / Inventário", icone: Package },
  { id: "vagas", nome: "Mapa de Vagas", icone: MapPin },
  { id: "auditoria", nome: "Histórico / Auditoria", icone: History },
  { id: "dashboard", nome: "Indicadores / KPIs", icone: BarChart3 },
];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0">
      {/* Topo: Logo do Sistema */}
      <div>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <span className="text-3xl">📦</span>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">
              Smart WMS
            </h1>
            <span className="text-xs text-blue-500 font-semibold uppercase tracking-wider">
              Logística Pro
            </span>
          </div>
        </div>

        {/* Menu de Navegação Interativo */}
        <nav className="p-4 space-y-2">
          {menuItens.map((item) => {
            const IconeComponente = item.icone;
            const itemAtivo = abaAtiva === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setAbaAtiva(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition cursor-pointer ${
                  itemAtivo
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {/* Renderização dinâmica e tipada do ícone Lucide */}
                <IconeComponente
                  size={18}
                  className={itemAtivo ? "text-white" : "text-slate-400"}
                />
                {item.nome}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Rodapé: Operador Logado e Logout */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-slate-800 p-2 rounded-xl text-blue-400">
            <User size={18} />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white truncate">{usuario}</p>
            <p className="text-xs text-slate-500 font-medium truncate">
              {role}
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 bg-slate-950 border border-slate-800 hover:bg-red-950/20 hover:border-red-900 text-slate-400 hover:text-red-400 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer"
        >
          <LogOut size={14} />
          Sair do Sistema
        </button>
      </div>
    </aside>
  );
}
