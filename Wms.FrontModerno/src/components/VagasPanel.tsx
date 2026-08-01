import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { PosicaoArmazem } from "../types/wms";
import {
  LayoutGrid,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner"; // <-- IMPORTAÇÃO DO EMISSOR DE NOTIFICAÇÕES EM TEMPO REAL

export default function VagasPanel() {
  const [vagas, setVagas] = useState<PosicaoArmazem[]>([]);
  const [corredor, setCorredor] = useState("");
  const [prateleira, setPrateleira] = useState<number>(0);
  const [nivel, setNivel] = useState<number>(0);
  const [carregando, setCarregando] = useState(false);

  const carregarVagas = async () => {
    try {
      const resposta = await api.get<PosicaoArmazem[]>("/posicoes");
      if (Array.isArray(resposta.data)) {
        setVagas(resposta.data);
      }
    } catch (error) {
      console.error("Erro ao carregar mapa de posições:", error);
      toast.error(
        "Erro de rede ao tentar sincronizar o mapa de endereçamento.",
      );
    }
  };

  useEffect(() => {
    carregarVagas();
  }, []);

  const handleCriarVaga = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!corredor.trim() || prateleira <= 0 || nivel <= 0) {
      toast.warning(
        "Validação de Campos: Insira valores válidos e maiores que zero.",
      );
      return;
    }

    setCarregando(true);
    try {
      const novaVaga = {
        corredor: corridor.trim().toUpperCase(),
        prateleira,
        nivel,
        ocupada: false,
      };

      const resposta = await api.post("/posicoes", novaVaga);
      if (resposta.status === 201) {
        // TOAST 1: Sinaliza a expansão física concluída com sucesso
        toast.success(
          `Infraestrutura Expandida: Vaga ${novaVaga.corredor}-${prateleira}-${nivel} integrada ao armazém.`,
        );

        setCorredor("");
        setPrateleira(0);
        setNivel(0);
        carregarVagas();
      }
    } catch (error: any) {
      const erroServidor =
        error.response?.data || "Falha ao salvar nova posição no banco.";
      // TOAST 2: Intercepta e exibe falhas de negócio ou de restrição do C#
      toast.error(`Falha na Operação: ${erroServidor}`);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fade-in">
      {/* Formulário de Cadastro de Vagas */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <LayoutGrid className="text-emerald-500" size={22} />
          <h3 className="text-lg font-bold text-white">
            Expandir Estrutura (Vagas)
          </h3>
        </div>

        <form onSubmit={handleCriarVaga} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Corredor
              </label>
              <input
                type="text"
                required
                maxLength={2}
                value={corredor}
                onChange={(e) => setCorredor(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-white placeholder-slate-700 outline-none text-center font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition uppercase"
                placeholder="A"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Prat.
              </label>
              <input
                type="number"
                required
                min={1}
                value={prateleira || ""}
                onChange={(e) => setPrateleira(parseInt(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-white placeholder-slate-700 outline-none text-center focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition"
                placeholder="1"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Nível
              </label>
              <input
                type="number"
                required
                min={1}
                value={nivel || ""}
                onChange={(e) => setNivel(parseInt(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-white placeholder-slate-700 outline-none text-center focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition"
                placeholder="1"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-xl bg-emerald-600 p-3 text-sm font-bold text-white hover:bg-emerald-500 active:bg-emerald-700 transition disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            {carregando ? "Criando Espaço..." : "Criar Nova Vaga"}
          </button>
        </form>
      </div>

      {/* Grid de Visualização do Mapa de Posições */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white">
            Mapa Físico de Endereçamento
          </h3>
          <button
            onClick={carregarVagas}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl transition cursor-pointer"
          >
            <RefreshCw size={12} /> Sincronizar Mapa
          </button>
        </div>

        <div className="overflow-y-auto max-h-[500px] pr-2">
          {vagas.length === 0 ? (
            <p className="text-center text-slate-500 py-8 text-sm">
              Nenhum endereço físico registrado no mapa do armazém.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {vagas.map((v) => {
                const c = v.corredor || (v as any).Corredor || "";
                const p = v.prateleira || (v as any).Prateleira || 0;
                const n = v.nivel || (v as any).Nivel || 0;
                const ocupada =
                  v.ocupada !== undefined ? v.ocupada : (v as any).Ocupada;

                return (
                  <div
                    key={v.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between h-28 transition-all ${
                      ocupada
                        ? "bg-slate-950/60 border-red-900/40 text-red-400"
                        : "bg-slate-950/20 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-lg font-black tracking-wider text-white">
                        {c}-{p}-{n}
                      </span>
                      {ocupada ? (
                        <AlertTriangle
                          size={16}
                          className="text-red-500 animate-pulse"
                        />
                      ) : (
                        <CheckCircle size={16} className="text-emerald-500" />
                      )}
                    </div>
                    <div className="text-xs font-semibold tracking-wide uppercase">
                      {ocupada ? (
                        <span className="text-red-500/80">Ocupada</span>
                      ) : (
                        <span className="text-emerald-500/80">Disponível</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
