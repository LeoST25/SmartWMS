import { useEffect, useState, useCallback, useRef } from "react"; // Adicionado useCallback e useRef
import { api } from "../services/api";
import type { Produto } from "../types/wms";
import {
  PackagePlus,
  RefreshCw,
  ShieldAlert,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";

interface ProdutosPanelProps {
  canManage: boolean;
  onMovimentacaoSucesso: () => void;
}

export default function ProdutosPanel({
  canManage,
  onMovimentacaoSucesso,
}: ProdutosPanelProps) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [nome, setNome] = useState("");
  const [sku, setSku] = useState("");
  const [quantidade, setQuantidade] = useState<number>(0);
  const [peso, setPeso] = useState<number>(0);
  const [estoqueMinimo, setEstoqueMinimo] = useState<number>(5);
  const [carregando, setCarregando] = useState(false);
  const isFirstRender = useRef(true);

  // MEMOIZAÇÃO: A função é travada na memória e só se reconstrói se houver alteração externa
  const carregarProdutos = useCallback(async () => {
    try {
      const resposta = await api.get<Produto[]>("/produtos");
      setProdutos(resposta.data);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      toast.error("Erro de conexão ao sincronizar o estoque ativo.");
    }
  }, []);

  // Carrega produtos apenas na montagem inicial do componente
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      carregarProdutos();
    }
  }, [carregarProdutos]);

  // Type guard para verificar se o erro é do Axios
  const isAxiosError = (
    erro: unknown,
  ): erro is { response?: { data?: unknown } } => {
    return (
      typeof erro === "object" &&
      erro !== null &&
      "response" in erro &&
      typeof (erro as Record<string, unknown>).response === "object"
    );
  };

  const handlePutaway = async (e: React.FormEvent) => {
    e.preventDefault();

    if (quantidade <= 0 || peso <= 0) {
      toast.warning(
        "Operação Recusada: Quantidade e peso devem ser maiores que zero.",
      );
      return;
    }

    setCarregando(true);
    try {
      const novoProduto: Produto = {
        nome,
        sku: sku.trim(),
        quantidade,
        peso,
        estoqueMinimo,
      };
      const resposta = await api.post("/produtos", novoProduto);

      if (resposta.status === 201) {
        // TOAST 1: Emite o aviso de sucesso informando que o algoritmo alocou a carga
        toast.success(
          `Putaway Concluído: Item ${sku.toUpperCase()} alocado com sucesso!`,
        );

        setNome("");
        setSku("");
        setQuantidade(0);
        setPeso(0);
        carregarProdutos();
        onMovimentacaoSucesso();
      }
    } catch (erro: unknown) {
      let msgErro: string;
      if (isAxiosError(erro)) {
        msgErro =
          (erro.response?.data as string) || "Erro de barramento ao alocar produto.";
      } else if (erro instanceof Error) {
        msgErro = erro.message || "Erro de barramento ao alocar produto.";
      } else {
        msgErro = "Erro de barramento ao alocar produto.";
      }
      // TOAST 2: Captura os erros de SKU duplicado ou armazém cheio vindos do C#
      toast.error(msgErro);
    } finally {
      setCarregando(false);
    }
  };

  const handleDespachar = async (skuAlvo: string) => {
    if (
      !confirm(
        `Confirmar a liberação física e saída definitiva do SKU ${skuAlvo}?`,
      )
    )
      return;

    try {
      const resposta = await api.post(`/produtos/saida/${skuAlvo}`);
      if (resposta.status === 200) {
        // TOAST 3: Confirma a baixa permanente na auditoria e no mapa
        toast.success(
          `Expedição Concluída: SKU ${skuAlvo} despachado com sucesso.`,
        );
        carregarProdutos();
        onMovimentacaoSucesso();
      }
    } catch {
      toast.error("Controle de Acesso: Falha ao executar despacho da carga.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fade-in">
      {/* Formulário de Entrada (Putaway) */}
      {canManage && (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <PackagePlus className="text-blue-500" size={22} />
          <h3 className="text-lg font-bold text-white">
            Entrada de Carga (Putaway)
          </h3>
        </div>

        <form onSubmit={handlePutaway} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Descrição do Item
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-white placeholder-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
              placeholder="Ex: Monitor Industrial 4K"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Código SKU Único
            </label>
            <input
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-white placeholder-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition uppercase"
              placeholder="Ex: MON-IND-4K"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Quantidade
              </label>
              <input
                type="number"
                required
                value={quantidade || ""}
                onChange={(e) => setQuantidade(parseInt(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-white placeholder-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Peso Unitário (kg)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={peso || ""}
                onChange={(e) => setPeso(parseFloat(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-white placeholder-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Estoque Mínimo de Segurança
            </label>
            <input
              type="number"
              required
              value={estoqueMinimo}
              onChange={(e) => setEstoqueMinimo(parseInt(e.target.value))}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-xl bg-blue-600 p-3 text-sm font-bold text-white hover:bg-blue-500 active:bg-blue-700 transition disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-600/10"
          >
            {carregando ? "Alocando Vaga..." : "Executar Alocação Automática"}
          </button>
        </form>
      </div>
      )}

      {/* Tabela de Inventário */}
      <div
        className={`${canManage ? "lg:col-span-2" : "lg:col-span-3"} bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl`}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white">
            Inventário em Tempo Real
          </h3>
          <button
            onClick={carregarProdutos}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl transition cursor-pointer"
          >
            <RefreshCw size={12} /> Sincronizar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="pb-3">SKU / Produto</th>
                <th className="pb-3">Saldo</th>
                <th className="pb-3">Massa</th>
                <th className="pb-3">Endereço Físico</th>
                <th className="pb-3 text-right">Expedição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300 text-sm">
              {produtos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Nenhuma carga armazenada neste setor.
                  </td>
                </tr>
              ) : (
                produtos.map((p) => {
                  const estoqueCritico = p.quantidade <= p.estoqueMinimo;
                  const endereco = p.posicao
                    ? `${p.posicao.corredor}-${p.posicao.prateleira}-${p.posicao.nivel}`
                    : "Doca";

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-950/40 transition duration-150"
                    >
                      <td className="py-4">
                        <span className="block font-black text-white">
                          {p.sku}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {p.nome}
                        </span>
                      </td>
                      <td className="py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            estoqueCritico
                              ? "bg-red-950/60 text-red-400 border border-red-900/50 animate-pulse"
                              : "bg-emerald-950/60 text-emerald-400 border border-emerald-900/50"
                          }`}
                        >
                          {estoqueCritico && <ShieldAlert size={12} />}
                          {p.quantidade} un
                        </span>
                      </td>
                      <td className="py-4 font-medium text-slate-400">
                        {p.peso} kg
                      </td>
                      <td className="py-4 font-mono font-bold text-blue-400 text-base">
                        {endereco}
                      </td>

                      {/* Controle visual por nível de cargo */}
                      <td className="py-4 text-right">
                        {canManage ? (
                          <button
                            onClick={() => handleDespachar(p.sku)}
                            className="inline-flex items-center gap-1.5 bg-slate-950 hover:bg-rose-950/30 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
                            title="Despachar Mercadoria da Doca"
                          >
                            <ArrowUpRight size={14} />
                            Despachar
                          </button>
                        ) : (
                          <span className="text-xs text-slate-600 font-medium italic">
                            Apenas Leitura
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
