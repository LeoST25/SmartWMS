import { useState, useCallback, useEffect, useRef } from "react"; // Adicionado useCallback
import { api } from "../services/api";
import type { HistoricoMovimentacao } from "../types/wms";
import {
  ClipboardList,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCcw,
  User,
  ArchiveX,
} from "lucide-react";

interface AuditoriaPanelProps {
  canManage: boolean;
}

export default function AuditoriaPanel({ canManage }: AuditoriaPanelProps) {
  const [historico, setHistorico] = useState<HistoricoMovimentacao[]>([]);
  const [carregando, setCarregando] = useState(false);

  // MEMOIZAÇÃO DA ROTINA DE COMPILAÇÃO DE LOGS
  const carregarAuditoria = useCallback(async () => {
    setCarregando(true);
    try {
      const resposta = await api.get<HistoricoMovimentacao[]>(
        "/logistica/auditoria",
      );
      if (Array.isArray(resposta.data)) {
        setHistorico(resposta.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCarregando(false);
    }
  }, []);

  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      carregarAuditoria();
    }
  }, [carregarAuditoria]);

  // Formata a data ISO vinda do banco SQLite para o padrão brasileiro
  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleString("pt-BR");
  };

  const handleLimparHistorico = async () => {
    if (!confirm("Deseja realmente arquivar o histórico de auditoria?")) return;

    try {
      await api.post("/logistica/auditoria/limpar");

      await carregarAuditoria(); // Recarrega os logs após arquivar

      alert("Histórico de auditoria arquivado com sucesso!");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      alert("Erro ao arquivar dados");
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <ClipboardList className="text-blue-500" size={24} />
          <div>
            <h3 className="text-lg font-bold text-white">
              Livro de Registro de Movimentações
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Trilha de auditoria imutável de segurança do galpão.
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={carregarAuditoria}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl transition cursor-pointer"
          >
            <RefreshCw size={12} className={carregando ? "animate-spin" : ""} />
            Sincronizar
          </button>

          {canManage && (
          <button
            onClick={handleLimparHistorico}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-white bg-slate-950 border border-slate-800 hover:border-rose-900 px-3 py-1.5 rounded-xl transition cursor-pointer hover:bg-rose-950/20"
          >
            <ArchiveX size={12} />
            Limpar Tela (Arquivar)
          </button>
          )}
        </div>
      </div>

      {/* Lista da Trilha de Auditoria */}
      <div className="space-y-4 max-h-150 overflow-y-auto pr-2">
        {historico.length === 0 ? (
          <p className="text-center text-slate-500 py-12 text-sm">
            Nenhuma movimentação de carga registrada na auditoria até o momento.
          </p>
        ) : (
          historico.map((log) => {
            // Define o design visual baseado no tipo de ação logística
            const isEntrada = log.tipoMovimentacao === "ENTRADA";
            const isSaida = log.tipoMovimentacao === "SAÍDA";

            let bgIcone =
              "bg-blue-950/60 border border-blue-900/50 text-blue-400";
            let IconeLog = RefreshCcw;

            if (isEntrada) {
              bgIcone =
                "bg-emerald-950/60 border border-emerald-900/50 text-emerald-400";
              IconeLog = ArrowDownLeft;
            } else if (isSaida) {
              bgIcone =
                "bg-rose-950/60 border border-rose-900/50 text-rose-400";
              IconeLog = ArrowUpRight;
            }

            return (
              <div
                key={log.id}
                className="flex items-start gap-4 p-4 rounded-xl bg-slate-950/30 border border-slate-800/60 hover:border-slate-800 transition"
              >
                {/* Ícone Indicador da Ação */}
                <div className={`p-2.5 rounded-xl shrink-0 ${bgIcone}`}>
                  <IconeLog size={18} />
                </div>

                {/* Detalhes da Movimentação */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-0.5">
                      Operação
                    </span>
                    <span
                      className={`text-xs font-extrabold uppercase tracking-wide px-2 py-0.5 rounded ${
                        isEntrada
                          ? "bg-emerald-950 text-emerald-400"
                          : isSaida
                            ? "bg-rose-950 text-rose-400"
                            : "bg-blue-950 text-blue-400"
                      }`}
                    >
                      {log.tipoMovimentacao}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-0.5">
                      Item / Volume
                    </span>
                    <p className="text-sm font-bold text-white truncate m-0">
                      {log.sku}{" "}
                      <span className="text-xs text-slate-400 font-medium">
                        ({log.produtoNome})
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 font-medium m-0">
                      Qtd:{" "}
                      <span className="text-white font-bold">
                        {log.quantidade} un
                      </span>{" "}
                      no endereço{" "}
                      <span className="font-mono font-bold text-blue-400">
                        {log.enderecoGalpao}
                      </span>
                    </p>
                  </div>

                  <div className="md:text-right">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-0.5">
                      Registro
                    </span>
                    <p className="text-xs text-slate-400 font-semibold m-0">
                      {formatarData(log.dataHora)}
                    </p>
                    <div className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 mt-1 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800/40">
                      <User size={10} className="text-slate-500" />{" "}
                      {log.usuarioResponsavel}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
