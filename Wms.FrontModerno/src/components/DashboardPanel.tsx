import { useEffect, useState, useMemo } from "react"; // Adicionado useMemo
import { api } from "../services/api";
import type { PosicaoArmazem } from "../types/wms";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

export default function DashboardPanel() {
  const [vagas, setVagas] = useState<PosicaoArmazem[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const buscarDadosDashboard = async () => {
      try {
        const resposta = await api.get<PosicaoArmazem[]>("/posicoes");
        if (isMounted && Array.isArray(resposta.data)) {
          setVagas(resposta.data);
        }
      } catch (error) {
        if (isMounted) {
          console.error(error);
          toast.error(
            "Erro de barramento ao sincronizar indicadores logísticos.",
          );
        }
      } finally {
        if (isMounted) {
          setCarregando(false);
        }
      }
    };

    buscarDadosDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  // 🧠 CORREÇÃO CRÍTICA (useMemo): Isola o reprocessamento aritmético e resolve o erro 'Too many re-renders'
  const metricas = useMemo(() => {
    const totalVagas = vagas.length;
    const vagasOcupadas = vagas.filter((v) => v.ocupada).length;
    const vagasLivres = totalVagas - vagasOcupadas;
    const taxaOcupacao =
      totalVagas > 0 ? Math.round((vagasOcupadas / totalVagas) * 100) : 0;

    const dadosPizza = [
      { name: "Espaços Livres", value: vagasLivres },
      { name: "Espaços Ocupados", value: vagasOcupadas },
    ];

    const contagemCorredores: {
      [key: string]: { livres: number; ocupadas: number };
    } = {};

    vagas.forEach((v) => {
      const corr = v.corredor || "Desconhecido";
      if (!contagemCorredores[corr]) {
        contagemCorredores[corr] = { livres: 0, ocupadas: 0 };
      }
      if (v.ocupada) {
        contagemCorredores[corr].ocupadas++;
      } else {
        contagemCorredores[corr].livres++;
      }
    });

    const dadosBarras = Object.keys(contagemCorredores).map((key) => ({
      corredor: `Corredor ${key}`,
      "Vagas Livres": contagemCorredores[key].livres,
      "Vagas Ocupadas": contagemCorredores[key].ocupadas,
    }));

    return {
      totalVagas,
      vagasLivres,
      vagasOcupadas,
      taxaOcupacao,
      dadosPizza,
      dadosBarras,
    };
  }, [vagas]); // A computação matemática só é executada se a lista de vagas sofrer alteração real no banco

  if (carregando) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <p className="text-center text-slate-500 text-sm animate-pulse">
          Calculando algoritmos e KPIs...
        </p>
      </div>
    );
  }

  const CORES_PIE = ["#10b981", "#ef4444"];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Capacidade Total
            </span>
            <h4 className="text-2xl font-black text-white mt-1">
              {metricas.totalVagas} vagas
            </h4>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl text-blue-500 border border-slate-800/40">
            <Layers size={20} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Disponibilidade
            </span>
            <h4 className="text-2xl font-black text-emerald-400 mt-1">
              {metricas.vagasLivres} livres
            </h4>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl text-emerald-500 border border-slate-800/40">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Bloqueio / Carga
            </span>
            <h4 className="text-2xl font-black text-rose-400 mt-1">
              {metricas.vagasOcupadas} ocupadas
            </h4>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl text-rose-500 border border-slate-800/40">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Taxa de Ocupação
            </span>
            <h4 className="text-2xl font-black text-blue-400 mt-1">
              {metricas.taxaOcupacao}%
            </h4>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl text-blue-500 border border-slate-800/40">
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* Grid de Gráficos Analíticos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Capacidade Global (Pizza) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center">
          <div className="w-full flex items-center gap-2 mb-4 border-b border-slate-800/60 pb-3">
            <BarChart3 className="text-emerald-500" size={18} />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Distribuição Global do Inventário
            </h3>
          </div>
          <div className="w-full h-64 flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metricas.dadosPizza}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {metricas.dadosPizza.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CORES_PIE[index % CORES_PIE.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#020617",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs text-slate-400 font-semibold">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Volumetria por Corredor */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="w-full flex items-center gap-2 mb-4 border-b border-slate-800/60 pb-3">
            <BarChart3 className="text-blue-500" size={18} />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Densidade de Volumetria por Setor
            </h3>
          </div>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metricas.dadosBarras}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="corredor"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#020617",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs text-slate-400 font-semibold">
                      {value}
                    </span>
                  )}
                />
                <Bar dataKey="Vagas Livres" stackId="a" fill="#10b981" />
                <Bar dataKey="Vagas Ocupadas" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
