// Contratos de tipos estruturados para o Smart WMS

export interface PosicaoArmazem {
  id: number;
  corredor: string;
  prateleira: number;
  nivel: number;
  ocupada: boolean;
  codigoEndereco?: string; // Propriedade calculada vinda do C#
}

export interface Produto {
  id?: number; // Opcional no cadastro, obrigatório no retorno
  nome: string;
  sku: string;
  quantidade: number;
  peso: number;
  estoqueMinimo: number;
  posicaoArmazemId?: number | null;
  posicao?: PosicaoArmazem | null; // Relacionamento com a vaga física
}

export interface HistoricoMovimentacao {
  id: number;
  sku: string;
  produtoNome: string;
  tipoMovimentacao: "ENTRADA" | "SAÍDA" | "REABASTECIMENTO"; // Tipagem restrita por segurança
  quantidade: number;
  enderecoGalpao: string;
  dataHora: string; // Datas trafegam como string no formato ISO no JSON
  usuarioResponsavel: string;
}

export interface DashboardStats {
  totalVagas: number;
  vagasOcupadas: number;
  vagasLivres: number;
  taxaOcupacaoPercentual: string;
  statusArmazem: "Operação Normal" | "Crítico (Galpão Quase Cheio)";
}
