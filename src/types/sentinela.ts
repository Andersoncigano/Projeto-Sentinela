export type PaymentMethod = 'pix' | 'cartao_mae' | 'cartao_proprio' | 'dinheiro' | 'debito' | 'outro';

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
}

export interface ParsedTokens {
  data: string;
  descricao: string;
  valor: number;
  metodo: PaymentMethod;
  categoria: Category;
  is_impulsive: boolean;
}

export interface ParseResult {
  success: boolean;
  record?: ExpenseRecord;
  error_message?: string;
  tokens?: ParsedTokens;
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
}

export interface ExpenseSimulationImpact {
  novo_saldo: number;
  novo_teto_diario: number;
  reducao_teto_diario: number;
  horas_trabalho_equivalentes: number;
  dias_de_teto_consumidos: number;
  impacto_risco: 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';
}
