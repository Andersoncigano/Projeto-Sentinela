export type PaymentMethod = 'pix' | 'cartao_credito' | 'dinheiro' | 'debito' | 'cartao_proprio' | 'cartao_mae' | 'pix_rescisao' | 'outro';

export type Category = 
  | 'alimentacao_impulsiva' 
  | 'lazer_impulsivo' 
  | 'impulsivo' 
  | 'essencial' 
  | 'transporte' 
  | 'saude' 
  | 'outros';

export interface ExpenseRecord {
  id: string;
  data: string; // YYYY-MM-DD
  descricao: string;
  valor: number;
  metodo_pagamento: PaymentMethod;
  categoria: Category;
  is_impulsive: boolean;
  timestamp: number;
  vinculado_rescisao?: boolean;
  fatura_mes?: string; // YYYY-MM correspondente à fatura
  fatura_vencimento?: string; // YYYY-MM-DD da data de vencimento da fatura
}

export interface DebtRecord {
  id: string;
  credor: string;
  valor_total: number;
  valor_pago: number;
  meta_amortizacao_mes: number;
  prioridade: number;
  observacao: string;
}

export interface SystemSettings {
  renda_mensal: number;
  reserva_emergencia: number;
  horas_trabalho_mes: number;
  custos_fixos_essenciais: number;
  meta_poupanca_minima: number;
  dia_recebimento?: number; // Dia 5
  dia_fechamento_cartao?: number; // Dia 17 (Virada da fatura)
  dia_vencimento_cartao?: number; // Dia 23 (Vencimento da fatura)
  fatura_outubro_paga?: boolean; // Fatura de 23/10 já quitada pelo usuário
  fatura_novembro_paga?: boolean; // Fatura de 23/11 liquidada com a verba rescisória
  fatura_novembro_paga_em?: string; // Data de liquidação da fatura de 23/11
  ciclo_dezembro_iniciado?: boolean; // Virada de ciclo para Dezembro a partir de 05/12
  rescisao_prevista?: {
    data_prevista: string; // ex: '2026-10-30'
    valor?: number;
    status: 'aguardando_calculo' | 'recebido';
    observacao?: string;
  };
}

export interface MonthScaleSummary {
  mes: string; // YYYY-MM
  total_vista: number; // Pix + Dinheiro + Débito
  total_cartao: number; // Cartão de Crédito
  total_geral: number;
  qtd_vista: number;
  qtd_cartao: number;
}

export interface ParsedTokens {
  data: string;
  descricao: string;
  valor: number;
  metodo: PaymentMethod;
  categoria: Category;
  is_impulsive: boolean;
  vinculado_rescisao?: boolean;
}

export interface ParseResult {
  success: boolean;
  record?: ExpenseRecord;
  error_message?: string;
  tokens?: ParsedTokens;
}

export interface InvoiceCashMismatchAlert {
  tem_descompasso: boolean;
  total_faturas_a_vencer: number;
  data_vencimento: string; // YYYY-MM-DD
  dia_vencimento: number;
  fatura_mes_alvo?: string; // ex: '2026-10' ou '2026-11'
  fatura_outubro_status?: 'PAGA_QUITADA' | 'A_VENCER';
  entradas_antes_vencimento: number;
  saldo_disponivel_atual: number;
  novas_entradas_ate_vencimento: number;
  deficit_vencimento: number;
  dias_ate_vencimento: number;
  proxima_entrada_data?: string;
  proxima_entrada_nome?: string;
  dias_atraso_entrada?: number;
  dias_antecedencia_entrada?: number; // Ex: 24 dias de antecedência (30/10 vs 23/11)
  saldo_excedente_liquido?: number; // Ex: R$ 3.800 - R$ 129,90 = R$ 3.670,10
  mensagem_alerta: string;
  recomendacao: string;
  // Campos da Operação Ponte da Rescisão
  total_vinculado_rescisao?: number;
  reserva_emergencia_disponivel?: number;
  ponte_reserva_viavel?: boolean;
  plano_ponte?: {
    valor_fatura: number;
    dia_saque_reserva: number;
    data_saque_reserva: string;
    dia_recomposicao: number;
    data_recomposicao: string;
    dias_intervalo: number;
    reserva_original: number;
    reserva_pos_saque: number;
    rescisao_estimada: number;
    rescisao_restante: number;
  };
}

export interface BurnRateMetrics {
  dias_totais_mes: number;
  dia_atual: number;
  dias_restantes: number;
  renda_mensal: number;
  custos_fixos: number;
  amortizacao_obrigatoria: number;
  saldo_disponivel_inicial: number;
  total_gasto_mes: number;
  total_gasto_impulsivo: number;
  saldo_restante: number;
  teto_diario_atual: number;
  teto_diario_ideal: number;
  status_alerta: 'NORMAL' | 'ATENCAO' | 'CRITICO' | 'COLAPSO';
  horas_trabalhadas_perdidas: number;
  burn_rate_percent: number;
  // Campos de Saldo Pix Real & Fluxo de Caixa (dinheiro que já entrou)
  tem_saldo_real: boolean;
  dinheiro_ja_entrou: boolean;
  motivo_sem_saldo?: string;
  aviso_sem_saldo?: string;
  // Alerta de Descompasso Temporal: Faturas a Vencer > Dinheiro que vai entrar antes do vencimento
  alerta_descompasso?: InvoiceCashMismatchAlert;
  total_fatura_vinculada_rescisao?: number;
  fatura_coberta_por_reserva?: boolean;
}

export interface ExpenseSimulationImpact {
  novo_saldo: number;
  novo_teto_diario: number;
  reducao_teto_diario: number;
  horas_trabalho_equivalentes: number;
  dias_de_teto_consumidos: number;
  impacto_risco: 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';
}

