/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { RawInputTerminal } from './components/RawInputTerminal';
import { FrictionModal } from './components/FrictionModal';
import { DebtManager } from './components/DebtManager';
import { EmergencyVault } from './components/EmergencyVault';
import { AuditTable } from './components/AuditTable';
import { SimulatorTab } from './components/SimulatorTab';
import { PythonCodeViewer } from './components/PythonCodeViewer';
import { NudgeManualTab } from './components/NudgeManualTab';
import { MonthSelector } from './components/MonthSelector';
import { DualScaleTracker } from './components/DualScaleTracker';
import { NoteBatchImporterModal } from './components/NoteBatchImporterModal';
import { MonthlyReportView } from './components/MonthlyReportView';
import { SystemTransitionTracker } from './components/SystemTransitionTracker';
import { TerminalLockScreen } from './components/TerminalLockScreen';
import { PrivacyProtectionModal } from './components/PrivacyProtectionModal';
import { PrivacySettings, DEFAULT_PRIVACY_SETTINGS, anonymizeMerchant } from './lib/privacy';

import {
  ExpenseRecord,
  DebtRecord,
  SystemSettings,
  BurnRateMetrics,
} from './types/sentinela';
import { SentinelaBurnEngine } from './lib/burnEngine';
import { sound } from './lib/sound';
import { formatCurrency } from './lib/format';

export { formatCurrency };

import { 
  RotateCcw, 
  Trash2, 
  AlertTriangle, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  CreditCard, 
  CheckCircle2, 
  ArrowRight, 
  ExternalLink,
  Sparkles 
} from 'lucide-react';

const DEFAULT_SETTINGS: SystemSettings = {
  renda_mensal: 850.0,
  reserva_emergencia: 2796.91, // A reserva de emergência constituída com a rescisão oficial
  horas_trabalho_mes: 88.0, // PCD Meio Período (~4h/dia * 22 dias)
  custos_fixos_essenciais: 650.0, // Obrigações: luz, remédio, internet e banco (~R$ 650)
  meta_poupanca_minima: 0.0, // Deixa exatamente R$ 200,00 livres da renda ordinária
  dia_recebimento: 5,
  dia_fechamento_cartao: 17, // Vira dia 17
  dia_vencimento_cartao: 23, // Vence dia 23
  fatura_outubro_paga: true, // Fatura de 23/10 QUITADA / PAGA pelo usuário
  rescisao_prevista: {
    data_prevista: '2026-10-30',
    valor: 2796.91,
    status: 'recebido',
    observacao: 'Rescisão oficial homologada pelo usuário: R$ 2.796,91 recebidos em 30/10.',
  },
};

const DEFAULT_DEBTS: DebtRecord[] = [
  {
    id: 'debt_cartao_1',
    credor: 'Fatura do Cartão (Outubro/2026 - Paga)',
    valor_total: 0.0,
    valor_pago: 0.0,
    meta_amortizacao_mes: 0.0,
    prioridade: 1,
    observacao: 'Fatura de Outubro QUITADA pelo usuário (R$ 0,00 a vencer em 23/10)',
  },
  {
    id: 'debt_perfume_parcelas',
    credor: 'Perfume (Parcelamento no Cartão 2x R$ 50,00)',
    valor_total: 100.0,
    valor_pago: 0.0,
    meta_amortizacao_mes: 50.0,
    prioridade: 2,
    observacao: 'Faltam 2 parcelas de R$ 50,00 no cartão. Parcela 1/2 em 23/11 (R$ 50) e Parcela 2/2 em 23/12 (R$ 50) - ambas vinculadas à quitação via rescisão.',
  },
  {
    id: 'debt_netflix_recorrente',
    credor: 'Netflix (Mensalidade no Cartão)',
    valor_total: 20.0,
    valor_pago: 0.0,
    meta_amortizacao_mes: 20.0,
    prioridade: 3,
    observacao: 'Assinatura mensal de R$ 20,00 no cartão com vencimento em 23/11 vinculada à verba rescisória.',
  },
];

const DEFAULT_INITIAL_EXPENSES: ExpenseRecord[] = [
  {
    id: 'exp_uber17_default',
    data: '2026-10-17',
    descricao: 'Uber',
    valor: 6.30,
    metodo_pagamento: 'cartao_credito',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1729166400000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_abbey18_default',
    data: '2026-10-18',
    descricao: 'Abbey',
    valor: 63.00,
    metodo_pagamento: 'cartao_credito',
    categoria: 'outros',
    is_impulsive: false,
    timestamp: 1729252800000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_abbey18_30',
    data: '2026-10-18',
    descricao: 'Abbey',
    valor: 30.00,
    metodo_pagamento: 'cartao_credito',
    categoria: 'outros',
    is_impulsive: false,
    timestamp: 1729260000000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_uber18_3588',
    data: '2026-10-18',
    descricao: 'Uber',
    valor: 35.88,
    metodo_pagamento: 'cartao_credito',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1729267200000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_uber18_3087',
    data: '2026-10-18',
    descricao: 'Uber',
    valor: 30.87,
    metodo_pagamento: 'cartao_credito',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1729270000000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_uber20',
    data: '2026-10-20',
    descricao: 'Uber',
    valor: 36.71,
    metodo_pagamento: 'cartao_credito',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1729425600000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_denis_beulmont_21',
    data: '2026-10-21',
    descricao: 'Denis roupas',
    valor: 341.97,
    metodo_pagamento: 'cartao_credito',
    categoria: 'impulsivo',
    is_impulsive: true,
    timestamp: 1729555200000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_uber22',
    data: '2026-10-22',
    descricao: 'Uber',
    valor: 5.78,
    metodo_pagamento: 'cartao_credito',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1729594800000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_uber22_558',
    data: '2026-10-22',
    descricao: 'Uber',
    valor: 5.58,
    metodo_pagamento: 'cartao_credito',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1729598400000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_abbey22',
    data: '2026-10-22',
    descricao: 'Abbey - Chopp',
    valor: 20.00,
    metodo_pagamento: 'cartao_credito',
    categoria: 'lazer_impulsivo',
    is_impulsive: true,
    timestamp: 1729612800000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_abbey23',
    data: '2026-10-23',
    descricao: 'Abbey - Chopp',
    valor: 20.00,
    metodo_pagamento: 'cartao_credito',
    categoria: 'lazer_impulsivo',
    is_impulsive: true,
    timestamp: 1729684800000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_lord_uber23',
    data: '2026-10-23',
    descricao: 'Lord - Uber',
    valor: 12.38,
    metodo_pagamento: 'cartao_credito',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1729688400000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_lord23',
    data: '2026-10-23',
    descricao: 'Lord',
    valor: 20.00,
    metodo_pagamento: 'cartao_credito',
    categoria: 'lazer_impulsivo',
    is_impulsive: true,
    timestamp: 1729692000000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_uber24',
    data: '2026-10-24',
    descricao: 'Uber',
    valor: 12.38,
    metodo_pagamento: 'cartao_credito',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1729771200000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_abbey24',
    data: '2026-10-24',
    descricao: 'Abbey - Chopp',
    valor: 20.00,
    metodo_pagamento: 'cartao_credito',
    categoria: 'lazer_impulsivo',
    is_impulsive: true,
    timestamp: 1729774800000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_mercado24_4346',
    data: '2026-10-24',
    descricao: 'Mercado (Pix no Cartão)',
    valor: 43.46,
    metodo_pagamento: 'cartao_credito',
    categoria: 'essencial',
    is_impulsive: false,
    timestamp: 1729778400000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_uber24_970',
    data: '2026-10-24',
    descricao: 'Uber',
    valor: 9.70,
    metodo_pagamento: 'cartao_credito',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1729782000000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_abbey25_63',
    data: '2026-10-25',
    descricao: 'Abbey',
    valor: 63.00,
    metodo_pagamento: 'cartao_credito',
    categoria: 'lazer_impulsivo',
    is_impulsive: true,
    timestamp: 1729854000000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_uber25_697',
    data: '2026-10-25',
    descricao: 'Uber',
    valor: 6.97,
    metodo_pagamento: 'cartao_credito',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1729861200000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_uber25_3525',
    data: '2026-10-25',
    descricao: 'Uber',
    valor: 35.25,
    metodo_pagamento: 'cartao_credito',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1729868400000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_netflix_outubro',
    data: '2026-10-25',
    descricao: 'Netflix',
    valor: 20.00,
    metodo_pagamento: 'cartao_credito',
    categoria: 'essencial',
    is_impulsive: false,
    timestamp: 1729869000000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_perfume_parc1',
    data: '2026-10-25',
    descricao: 'Perfume (Parcela 1/2)',
    valor: 50.00,
    metodo_pagamento: 'cartao_credito',
    categoria: 'impulsivo',
    is_impulsive: true,
    timestamp: 1729869600000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_abbey29_44',
    data: '2026-10-29',
    descricao: 'Abbey',
    valor: 44.00,
    metodo_pagamento: 'cartao_credito',
    categoria: 'lazer_impulsivo',
    is_impulsive: true,
    timestamp: 1730214000000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_uber29_1243',
    data: '2026-10-29',
    descricao: 'Uber',
    valor: 12.43,
    metodo_pagamento: 'cartao_credito',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1730217600000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_uber29_770',
    data: '2026-10-29',
    descricao: 'Uber',
    valor: 7.70,
    metodo_pagamento: 'cartao_credito',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1730221200000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_uber31_578_cartao',
    data: '2026-10-31',
    descricao: 'Uber (Pix no Cartão)',
    valor: 5.78,
    metodo_pagamento: 'cartao_credito',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1730419200000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_pix_farmacia_30',
    data: '2026-10-30',
    descricao: 'Farmácia',
    valor: 40.00,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'saude',
    is_impulsive: false,
    timestamp: 1730300400000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_mercado_30',
    data: '2026-10-30',
    descricao: 'Mercado',
    valor: 35.95,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'essencial',
    is_impulsive: false,
    timestamp: 1730304000000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_uber30_723',
    data: '2026-10-30',
    descricao: 'Uber',
    valor: 7.23,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1730307600000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_vinicius_30',
    data: '2026-10-30',
    descricao: 'Vinicius',
    valor: 150.00,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'outros',
    is_impulsive: false,
    timestamp: 1730311200000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_lord30_28',
    data: '2026-10-30',
    descricao: 'Lord',
    valor: 28.00,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'lazer_impulsivo',
    is_impulsive: true,
    timestamp: 1730314800000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_barbearia_30',
    data: '2026-10-30',
    descricao: 'Barbearia',
    valor: 100.00,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'essencial',
    is_impulsive: false,
    timestamp: 1730318400000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_uber30_920',
    data: '2026-10-30',
    descricao: 'Uber',
    valor: 9.20,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1730322000000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_uber30_1002',
    data: '2026-10-30',
    descricao: 'Uber',
    valor: 10.02,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1730325600000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_uber30_794',
    data: '2026-10-30',
    descricao: 'Uber',
    valor: 7.94,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1730329200000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_lord30_67',
    data: '2026-10-30',
    descricao: 'Lord',
    valor: 67.00,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'lazer_impulsivo',
    is_impulsive: true,
    timestamp: 1730332800000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_lord30_35',
    data: '2026-10-30',
    descricao: 'Lord',
    valor: 35.00,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'lazer_impulsivo',
    is_impulsive: true,
    timestamp: 1730336400000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_banrisul_31',
    data: '2026-10-31',
    descricao: 'Banrisul',
    valor: 189.00,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'essencial',
    is_impulsive: false,
    timestamp: 1730386800000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_uber31_1426',
    data: '2026-10-31',
    descricao: 'Uber',
    valor: 14.26,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1730390400000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_uber31_794',
    data: '2026-10-31',
    descricao: 'Uber',
    valor: 7.94,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1730394000000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_trem_31',
    data: '2026-10-31',
    descricao: 'Trem',
    valor: 5.00,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1730397600000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_cafe_31',
    data: '2026-10-31',
    descricao: 'Café',
    valor: 30.59,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'alimentacao_impulsiva',
    is_impulsive: true,
    timestamp: 1730401200000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_flor_31',
    data: '2026-10-31',
    descricao: 'Flor',
    valor: 20.00,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'lazer_impulsivo',
    is_impulsive: true,
    timestamp: 1730404800000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_mercado_31',
    data: '2026-10-31',
    descricao: 'Mercado',
    valor: 4.59,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'essencial',
    is_impulsive: false,
    timestamp: 1730408400000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_uber31_2436',
    data: '2026-10-31',
    descricao: 'Uber',
    valor: 24.36,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1730412000000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_uber31_652',
    data: '2026-10-31',
    descricao: 'Uber',
    valor: 6.52,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1730415600000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_abbey01_93',
    data: '2026-11-01',
    descricao: 'Abbey',
    valor: 93.00,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'lazer_impulsivo',
    is_impulsive: true,
    timestamp: 1730473200000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_uber01_3829',
    data: '2026-11-01',
    descricao: 'Uber',
    valor: 38.29,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1730476800000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_uber01_1713',
    data: '2026-11-01',
    descricao: 'Uber',
    valor: 17.13,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1730480400000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_uber02_1623',
    data: '2026-11-02',
    descricao: 'Uber',
    valor: 16.23,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1730559600000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_perfume02_5469',
    data: '2026-11-02',
    descricao: 'Perfume',
    valor: 54.69,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'impulsivo',
    is_impulsive: true,
    timestamp: 1730563200000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_bancas02_411',
    data: '2026-11-02',
    descricao: 'Bancas',
    valor: 4.11,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'outros',
    is_impulsive: false,
    timestamp: 1730566800000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_chave02_20',
    data: '2026-11-02',
    descricao: 'Chave',
    valor: 20.00,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'essencial',
    is_impulsive: false,
    timestamp: 1730570400000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_telegram03_1192',
    data: '2026-11-03',
    descricao: 'Telegram',
    valor: 11.92,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'essencial',
    is_impulsive: false,
    timestamp: 1730646000000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_tag03_20',
    data: '2026-11-03',
    descricao: 'Tag',
    valor: 20.00,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1730649600000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_mercadolivre04_4010',
    data: '2026-11-04',
    descricao: 'Mercado Livre',
    valor: 40.10,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'essencial',
    is_impulsive: false,
    timestamp: 1730732400000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_mercado04_549',
    data: '2026-11-04',
    descricao: 'Mercado',
    valor: 5.49,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'essencial',
    is_impulsive: false,
    timestamp: 1730736000000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_pix_mercadolivre05_19',
    data: '2026-11-05',
    descricao: 'Mercado Livre',
    valor: 19.00,
    metodo_pagamento: 'pix_rescisao',
    categoria: 'essencial',
    is_impulsive: false,
    timestamp: 1730822400000,
    vinculado_rescisao: true,
  },
  {
    id: 'exp_perfume_parc2',
    data: '2026-11-20',
    descricao: 'Perfume (Parcela 2/2)',
    valor: 50.00,
    metodo_pagamento: 'cartao_credito',
    categoria: 'impulsivo',
    is_impulsive: true,
    timestamp: 1732118400000,
    vinculado_rescisao: true,
    fatura_mes: '2026-12',
    fatura_vencimento: '2026-12-23',
  },
  {
    id: 'exp_netflix_novembro',
    data: '2026-11-25',
    descricao: 'Netflix',
    valor: 20.00,
    metodo_pagamento: 'cartao_credito',
    categoria: 'essencial',
    is_impulsive: false,
    timestamp: 1732550400000,
    vinculado_rescisao: true,
    fatura_mes: '2026-12',
    fatura_vencimento: '2026-12-23',
  },
];

const getInitialExpenses = (): ExpenseRecord[] => {
  return DEFAULT_INITIAL_EXPENSES;
};

export default function App() {
  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('sentinela_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Atualiza para o orçamento real informado pelo usuário:
        // Salário: R$ 850, Obrigações fixas (luz, remédio, internet, dívida banco): R$ 650 -> Saldo Livre: R$ 200,00
        parsed.renda_mensal = 850.0;
        parsed.custos_fixos_essenciais = 650.0;
        parsed.meta_poupanca_minima = 0.0;
        parsed.fatura_outubro_paga = true;
        // A reserva de emergência É a própria rescisão oficial de R$ 2.796,91 homologada em 30/10:
        if (parsed.rescisao_prevista?.status === 'recebido' && (parsed.rescisao_prevista?.valor ?? 0) > 0) {
          parsed.reserva_emergencia = parsed.rescisao_prevista.valor;
        } else {
          parsed.reserva_emergencia = 2796.91;
          parsed.rescisao_prevista = {
            data_prevista: '2026-10-30',
            valor: 2796.91,
            status: 'recebido',
            observacao: 'Rescisão oficial homologada pelo usuário: R$ 2.796,91 recebidos em 30/10.',
          };
        }
        localStorage.setItem('sentinela_settings', JSON.stringify(parsed));
        return parsed;
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [debts, setDebts] = useState<DebtRecord[]>(() => {
    const saved = localStorage.getItem('sentinela_debts');
    if (saved) {
      try {
        const parsed: DebtRecord[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          let modified = false;
          DEFAULT_DEBTS.forEach((def) => {
            if (!parsed.some((d) => d.id === def.id || d.credor.toLowerCase().includes(def.credor.toLowerCase().split(' ')[0]))) {
              parsed.push(def);
              modified = true;
            }
          });
          if (modified) {
            localStorage.setItem('sentinela_debts', JSON.stringify(parsed));
          }
          return parsed;
        }
      } catch {
        return DEFAULT_DEBTS;
      }
    }
    localStorage.setItem('sentinela_debts', JSON.stringify(DEFAULT_DEBTS));
    return DEFAULT_DEBTS;
  });

  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    const saved = localStorage.getItem('sentinela_expenses_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Atualiza Uber 17/10 de 6.10 para 6.30, Denis de 341.00 para 341.97 e Abbey 30.00 conforme nova anotação
          let updatedWithVinculo: ExpenseRecord[] = parsed.map((e) => {
            const isCartao =
              e.metodo_pagamento === 'cartao_credito' ||
              e.metodo_pagamento === 'cartao_proprio' ||
              e.metodo_pagamento === 'cartao_mae';
            let val = e.valor;
            let desc = e.descricao;
            let dt = e.data;

            if (dt === '2026-10-17' && desc.toLowerCase().includes('uber') && Math.abs(val - 6.10) < 0.05) {
              val = 6.30;
            }
            if (dt === '2026-10-18' && desc.toLowerCase().includes('uber') && Math.abs(val - 30.80) < 0.02) {
              val = 30.87;
            }
            if (dt === '2026-10-21' && (desc.toLowerCase().includes('denis') || desc.toLowerCase().includes('roupas')) && Math.abs(val - 341.00) < 0.05) {
              val = 341.97;
              desc = 'Denis roupas';
            }
            if (dt === '2026-10-21' && desc.toLowerCase().includes('uber') && Math.abs(val - 30.00) < 0.05) {
              dt = '2026-10-18';
              desc = 'Abbey';
            }
            if (dt === '2026-10-23' && (desc.toLowerCase().includes('lord') || desc.toLowerCase().includes('uber')) && Math.abs(val - 12.98) < 0.05) {
              val = 12.38;
            }

            return {
              ...e,
              data: dt,
              descricao: desc,
              valor: val,
              vinculado_rescisao: e.vinculado_rescisao ?? isCartao,
              fatura_mes: e.fatura_mes ?? (isCartao ? '2026-11' : undefined),
              fatura_vencimento: e.fatura_vencimento ?? (isCartao ? '2026-11-23' : undefined),
            };
          });

          // Deduplicação da corrida de R$ 30,87 no dia 18/10 para evitar duplicidade
          let seenUber18_3087 = false;
          updatedWithVinculo = updatedWithVinculo.filter((e) => {
            if (e.data === '2026-10-18' && e.descricao.toLowerCase().includes('uber') && Math.abs(e.valor - 30.87) < 0.02) {
              if (seenUber18_3087) return false;
              seenUber18_3087 = true;
            }
            return true;
          });

          // Garante que todas as despesas oficiais de DEFAULT_INITIAL_EXPENSES estejam presentes no navegador
          DEFAULT_INITIAL_EXPENSES.forEach((def) => {
            const exists = updatedWithVinculo.some(
              (e) => e.data === def.data && Math.abs(e.valor - def.valor) < 0.01 && e.descricao.toLowerCase().includes(def.descricao.toLowerCase().split(' ')[0])
            );
            if (!exists) {
              updatedWithVinculo.push(def);
            }
          });

          updatedWithVinculo.sort((a, b) => a.data.localeCompare(b.data) || a.timestamp - b.timestamp);

          localStorage.setItem('sentinela_expenses_v2', JSON.stringify(updatedWithVinculo));
          return updatedWithVinculo;
        }
      } catch {
        // fallback
      }
    }
    // Salva automaticamente para que qualquer novo navegador / aba externa já carregue com os dados reais
    localStorage.setItem('sentinela_expenses_v2', JSON.stringify(DEFAULT_INITIAL_EXPENSES));
    return DEFAULT_INITIAL_EXPENSES;
  });

  // Mês selecionado no banco de dados (ex: '2026-10' ou '2026-09')
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const saved = localStorage.getItem('sentinela_selected_month');
    return saved || '2026-10';
  });

  const [activeTab, setActiveTab] = useState<'cockpit' | 'python_code' | 'simulator' | 'nudge_manual' | 'table' | 'report'>('cockpit');
  const [isMuted, setIsMuted] = useState(false);
  const [crtEnabled, setCrtEnabled] = useState(true);

  // Estado global de visibilidade/privacidade (Modo Ocultar Valores como em apps de banco)
  const [showValues, setShowValues] = useState<boolean>(() => {
    const saved = localStorage.getItem('sentinela_show_values');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Motor Avançado de Proteção & Camuflagem (Olho Mágico, Modo Stealth e Cofre Terminal)
  const [privacy, setPrivacy] = useState<PrivacySettings>(() => {
    const saved = localStorage.getItem('sentinela_privacy_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_PRIVACY_SETTINGS, ...parsed };
      } catch {
        return DEFAULT_PRIVACY_SETTINGS;
      }
    }
    return DEFAULT_PRIVACY_SETTINGS;
  });

  // Estado do Cofre Bloqueado por PIN
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const saved = localStorage.getItem('sentinela_privacy_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Boolean(parsed.pinEnabled && parsed.pinHash);
      } catch {
        return false;
      }
    }
    return false;
  });

  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const [pendingFrictionExpense, setPendingFrictionExpense] = useState<ExpenseRecord | null>(null);
  const [terminalInput, setTerminalInput] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isNoteImporterOpen, setIsNoteImporterOpen] = useState(false);
  const [mobileReportExpanded, setMobileReportExpanded] = useState(false);
  const [showDetailedRescisaoBreakdown, setShowDetailedRescisaoBreakdown] = useState(false);

  // Consolidação dos 3 Pilares para exibição instantânea no Cockpit e no Celular
  const cockpitReportData = useMemo(() => {
    const list = expenses.filter((e) => e.data && e.data.startsWith(selectedMonth));
    const pixSalario = list
      .filter((e) => (e.metodo_pagamento === 'pix' || e.metodo_pagamento === 'dinheiro' || e.metodo_pagamento === 'debito') && !e.vinculado_rescisao)
      .reduce((sum, e) => sum + e.valor, 0);

    const cartaoRescisao = list
      .filter((e) => e.metodo_pagamento === 'cartao_credito' || e.metodo_pagamento === 'cartao_proprio' || e.metodo_pagamento === 'cartao_mae')
      .reduce((sum, e) => sum + e.valor, 0);

    const pixRescisao = list
      .filter((e) => e.metodo_pagamento === 'pix_rescisao' || (e.vinculado_rescisao && (e.metodo_pagamento === 'pix' || e.metodo_pagamento === 'dinheiro' || e.metodo_pagamento === 'debito')))
      .reduce((sum, e) => sum + e.valor, 0);

    const sortedList = [...list].sort((a, b) => a.data.localeCompare(b.data) || a.timestamp - b.timestamp);

    const countUber18_3087 = list.filter(
      (e) => e.data === '2026-10-18' && e.descricao.toLowerCase().includes('uber') && Math.abs(e.valor - 30.87) < 0.02
    ).length;

    return {
      pixSalario,
      cartaoRescisao,
      pixRescisao,
      totalGeral: pixSalario + cartaoRescisao + pixRescisao,
      count: list.length,
      sortedList,
      countUber18_3087,
    };
  }, [expenses, selectedMonth]);

  // Consolidação Global do Ciclo Rescisão & Fatura do Cartão (independente do filtro de mês)
  const globalRescisaoData = useMemo(() => {
    // 1. Fatura de Novembro do Cartão (26 compras feitas entre 17/10 e 31/10 com vencimento em 23/11)
    const cartaoFaturaNovItems = expenses.filter(
      (e) => (e.metodo_pagamento === 'cartao_credito' || e.metodo_pagamento === 'cartao_proprio' || e.metodo_pagamento === 'cartao_mae') &&
        (e.fatura_mes === '2026-11' || (!e.fatura_mes && e.data <= '2026-10-31'))
    );
    const totalCartaoFaturaNov = cartaoFaturaNovItems.reduce((acc, e) => acc + e.valor, 0);

    // 2. Todos os Pix da Rescisão desde a sexta-feira 30/10 até hoje (novembro)
    const pixRescisaoItems = expenses.filter(
      (e) => e.metodo_pagamento === 'pix_rescisao' || (e.vinculado_rescisao && e.data >= '2026-10-30' && (e.metodo_pagamento === 'pix' || e.metodo_pagamento === 'dinheiro' || e.metodo_pagamento === 'debito'))
    );
    const totalPixRescisaoGasto = pixRescisaoItems.reduce((acc, e) => acc + e.valor, 0);

    // 3. Verba Rescisória homologada recebida em 30/10
    const valorRescisaoRecebida = settings.rescisao_prevista?.valor ?? 2796.91;

    // 4. Saldo em conta HOJE da rescisão (depois de todos os Pix de 30/10 a 05/11, antes de debitar o cartão em 23/11)
    const saldoRescisaoHoje = Math.max(0, valorRescisaoRecebida - totalPixRescisaoGasto);

    // 5. Saldo FINAL da rescisão que sobrará no cofre após pagar a fatura em 23/11
    const saldoRescisaoAposFatura = Math.max(0, saldoRescisaoHoje - totalCartaoFaturaNov);

    return {
      valorRescisaoRecebida,
      totalCartaoFaturaNov,
      cartaoFaturaNovCount: cartaoFaturaNovItems.length,
      totalPixRescisaoGasto,
      pixRescisaoCount: pixRescisaoItems.length,
      saldoRescisaoHoje,
      saldoRescisaoAposFatura,
      cartaoFaturaNovItems,
      pixRescisaoItems,
    };
  }, [expenses, settings.rescisao_prevista]);

  // Salvar preferências no localStorage
  useEffect(() => {
    localStorage.setItem('sentinela_settings', JSON.stringify(settings));
  }, [settings]);

  // Garante que o orçamento real do usuário esteja ativo (Renda 850 - Obrigações 650 = Saldo Livre 200)
  useEffect(() => {
    if (settings.custos_fixos_essenciais !== 650 || settings.renda_mensal !== 850) {
      setSettings((prev) => ({
        ...prev,
        renda_mensal: 850.0,
        custos_fixos_essenciais: 650.0,
        meta_poupanca_minima: 0.0,
      }));
    }
  }, [settings.custos_fixos_essenciais, settings.renda_mensal]);

  useEffect(() => {
    localStorage.setItem('sentinela_debts', JSON.stringify(debts));
  }, [debts]);

  useEffect(() => {
    localStorage.setItem('sentinela_expenses_v2', JSON.stringify(expenses));
  }, [expenses]);

  // Garante sincronização imediata no navegador caso o storage local anterior estivesse vazio, desatualizado ou faltando novos itens
  useEffect(() => {
    setExpenses((current) => {
      let changed = false;
      const updated = current.map((e) => {
        // Correção de Lord Uber 23/10: 12.98 -> 12.38
        if (e.data === '2026-10-23' && (e.descricao.toLowerCase().includes('lord') || e.descricao.toLowerCase().includes('uber')) && Math.abs(e.valor - 12.98) < 0.05) {
          changed = true;
          return { ...e, valor: 12.38 };
        }
        return e;
      });
      DEFAULT_INITIAL_EXPENSES.forEach((def) => {
        const exists = updated.some(
          (e) => e.id === def.id || (e.data === def.data && Math.abs(e.valor - def.valor) < 0.01 && e.descricao.trim().toLowerCase().includes(def.descricao.trim().toLowerCase().split(' ')[0]))
        );
        if (!exists) {
          updated.push(def);
          changed = true;
        }
      });
      if (changed || current.length === 0) {
        updated.sort((a, b) => a.data.localeCompare(b.data) || a.timestamp - b.timestamp);
        localStorage.setItem('sentinela_expenses_v2', JSON.stringify(updated));
        return updated;
      }
      return current;
    });
  }, []);

  const handleRestoreDefaultExpenses = () => {
    sound.playSuccess();
    setExpenses(DEFAULT_INITIAL_EXPENSES);
    localStorage.setItem('sentinela_expenses_v2', JSON.stringify(DEFAULT_INITIAL_EXPENSES));
    showToast('📥 [DESPESAS_CARREGADAS] 58 lançamentos oficiais (Cartão 23/11 e Pix Rescisão) sincronizados com sucesso!');
  };

  const handleToggleVinculoRescisao = (id: string) => {
    sound.playTick();
    setExpenses((prev) => {
      const updated = prev.map((e) => {
        if (e.id === id) {
          const nextVal = !(e.vinculado_rescisao !== false);
          showToast(
            nextVal
              ? `🛡️ [VINCULADO À RESCISÃO] ${e.descricao} (R$ ${e.valor.toFixed(2)}) será pago com a verba rescisória!`
              : `💼 [DESVINCULADO] ${e.descricao} (R$ ${e.valor.toFixed(2)}) alocado para a receita mensal comum.`
          );
          return { ...e, vinculado_rescisao: nextVal };
        }
        return e;
      });
      localStorage.setItem('sentinela_expenses_v2', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    localStorage.setItem('sentinela_show_values', JSON.stringify(showValues));
  }, [showValues]);

  useEffect(() => {
    localStorage.setItem('sentinela_privacy_settings', JSON.stringify(privacy));
  }, [privacy]);

  useEffect(() => {
    localStorage.setItem('sentinela_selected_month', selectedMonth);
  }, [selectedMonth]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Temporizador de Inatividade para Bloqueio Automático por PIN
  useEffect(() => {
    if (!privacy.pinEnabled || privacy.autoLockMinutes <= 0 || isLocked) return;

    let lastInteraction = Date.now();

    const handleUserActivity = () => {
      lastInteraction = Date.now();
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('mousedown', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    const interval = setInterval(() => {
      const elapsedMinutes = (Date.now() - lastInteraction) / (1000 * 60);
      if (elapsedMinutes >= privacy.autoLockMinutes) {
        setIsLocked(true);
        sound.playFrictionAlert();
        showToast('🔒 [AUTO_LOCK] Terminal bloqueado por inatividade para sua segurança.');
      }
    }, 15000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      clearInterval(interval);
    };
  }, [privacy.pinEnabled, privacy.autoLockMinutes, isLocked]);

  // Atualizar configurações de privacidade
  const handleUpdatePrivacy = (newVals: Partial<PrivacySettings>) => {
    setPrivacy((prev) => {
      const next = { ...prev, ...newVals };
      if (newVals.isMasked !== undefined) {
        setShowValues(!newVals.isMasked);
      }
      return next;
    });
  };

  // Alterna o Modo Olho Mágico (Máscara de Valores)
  const handleToggleMask = () => {
    const nextMask = !privacy.isMasked;
    handleUpdatePrivacy({ isMasked: nextMask });
    showToast(
      nextMask
        ? '👁️ [MODO_MÁSCARA_ATIVADO] Todos os números e valores sensíveis ocultos.'
        : '👁️ [MODO_MÁSCARA_DESATIVADO] Valores visíveis.'
    );
  };

  // Alterna o estado global de visibilidade de valores (legado compatível)
  const handleToggleShowValues = () => {
    handleToggleMask();
  };

  // Alterna o Modo Stealth (Codinomes Comerciais)
  const handleToggleStealth = () => {
    const nextStealth = !privacy.isStealth;
    handleUpdatePrivacy({ isStealth: nextStealth });
    showToast(
      nextStealth
        ? '🎭 [MODO_STEALTH_ATIVADO] Estabelecimentos reais camuflados com codinomes técnicos!'
        : '🎭 [MODO_STEALTH_DESATIVADO] Nomes originais exibidos.'
    );
  };

  // Bloquear terminal imediatamente
  const handleLockTerminalNow = () => {
    if (privacy.pinEnabled) {
      setIsLocked(true);
      showToast('🔒 [TERMINAL_TRANCADO] Cofre bloqueado.');
    } else {
      setIsPrivacyModalOpen(true);
      showToast('⚠️ Configure um PIN primeiro na Central de Proteção.');
    }
  };

  // Desbloquear terminal
  const handleUnlockTerminal = () => {
    setIsLocked(false);
    showToast('✓ [ACESSO_AUTORIZADO] Terminal liberado com sucesso.');
  };

  // Protocolo de Pânico: Incineração total do armazenamento local
  const handlePanicPurge = () => {
    sound.playSuccess();
    localStorage.clear();
    setExpenses([]);
    setDebts([]);
    setSettings(DEFAULT_SETTINGS);
    setPrivacy(DEFAULT_PRIVACY_SETTINGS);
    setIsLocked(false);
    showToast('🚨 [PROTOCOLO_PÂNICO] Todos os dados e chaves foram incinerados do navegador.');
  };

  // Restauração de cofre completo
  const handleRestoreAllData = (backup: { expenses: ExpenseRecord[]; debts: DebtRecord[]; settings: SystemSettings }) => {
    if (backup.expenses && Array.isArray(backup.expenses)) {
      setExpenses(backup.expenses);
      localStorage.setItem('sentinela_expenses_v2', JSON.stringify(backup.expenses));
    }
    if (backup.debts && Array.isArray(backup.debts)) {
      setDebts(backup.debts);
      localStorage.setItem('sentinela_debts', JSON.stringify(backup.debts));
    }
    if (backup.settings) {
      setSettings(backup.settings);
      localStorage.setItem('sentinela_settings', JSON.stringify(backup.settings));
    }
    showToast('✓ [COFRE_RESTAURADO] Banco de dados e configurações importados!');
  };

  // Meses disponíveis no banco de dados (Setembro, Outubro, Novembro e Dezembro / 2026)
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>(['2026-09', '2026-10', '2026-11', '2026-12']);
    if (selectedMonth) {
      monthSet.add(selectedMonth);
    }
    expenses.forEach((e) => {
      if (e.data && e.data.length >= 7) {
        monthSet.add(e.data.substring(0, 7));
      }
    });
    return Array.from(monthSet).sort();
  }, [expenses, selectedMonth]);

  // Compute Moving Ceiling & Daily Burn Rate para o mês selecionado
  const metrics: BurnRateMetrics = useMemo(() => {
    const [selYear, selMonth] = selectedMonth.split('-').map(Number);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1;
    const isCurrentMonth = selYear === currentYear && selMonth === currentMonthNum;
    const isFutureMonth = selYear > currentYear || (selYear === currentYear && selMonth > currentMonthNum);

    let refDate: Date;
    if (isCurrentMonth) {
      refDate = now;
    } else if (isFutureMonth) {
      // Para meses futuros (ex: Novembro e Dezembro), o mês começa no dia 1 com todos os dias disponíveis
      refDate = new Date(selYear, selMonth - 1, 1);
    } else {
      // Para meses passados já fechados, considera o fechamento no último dia do mês
      const lastDayOfPastMonth = new Date(selYear, selMonth, 0).getDate();
      refDate = new Date(selYear, selMonth - 1, lastDayOfPastMonth);
    }

    return SentinelaBurnEngine.calculateMetrics(
      settings,
      expenses,
      debts,
      refDate
    );
  }, [settings, expenses, debts, selectedMonth]);

  const handleRegisterExpense = (record: ExpenseRecord) => {
    setExpenses((prev) => [record, ...prev]);
    setTerminalInput(''); // Limpa o terminal após registro com sucesso
    showToast(`✓ [BANCO_DADOS] Gasto registrado: R$ ${record.valor.toFixed(2)} (${record.descricao}).`);
  };

  const handleFrictionCheck = (record: ExpenseRecord) => {
    setPendingFrictionExpense(record);
  };

  const handleAbortFriction = () => {
    sound.playSuccess();
    setPendingFrictionExpense(null);
    setTerminalInput(''); // Limpa o terminal ao voltar / cancelar a tela de fricção
    showToast('🛡️ [VOLTAR_OK] Operação cancelada e terminal limpo! Teto diário preservado.');
  };

  const handleConfirmFriction = (record: ExpenseRecord) => {
    sound.playFrictionAlert();
    setExpenses((prev) => [record, ...prev]);
    setPendingFrictionExpense(null);
    setTerminalInput(''); // Limpa o terminal após confirmar sob penalidade
    showToast(`⚠️ [OVERRIDE] Gasto impulsivo de R$ ${record.valor.toFixed(2)} computado sob penalidade.`);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    showToast('✓ [BANCO_DADOS] Despesa eliminada. Teto Móvel Diário recalculado.');
  };

  const handleAmortizeDebt = (debtId: string, amount: number) => {
    setDebts((prev) =>
      prev.map((d) => (d.id === debtId ? { ...d, valor_pago: d.valor_pago + amount } : d))
    );
    showToast(`✓ [FATURA_AMORT] Pagamento de R$ ${amount.toFixed(2)} da Fatura do Cartão quitado!`);
  };

  const handleAddDebt = (newDebt: Omit<DebtRecord, 'id'>) => {
    const debt: DebtRecord = {
      ...newDebt,
      id: `debt_${Date.now()}`,
    };
    setDebts((prev) => [...prev, debt]);
    showToast(`✓ [NEW_PASSIVE] Passivo adicionado: ${debt.credor}`);
  };

  const handleEmergencyWithdrawal = (amount: number, reason: string) => {
    setSettings((prev) => ({
      ...prev,
      reserva_emergencia: Math.max(0, prev.reserva_emergencia - amount),
    }));
    showToast(`🚨 [ICE_BREACH] Violação do cofre registrada: R$ ${amount.toFixed(2)}`);
  };

  // Importar despesas em lote do bloco de notas
  const handleImportBatchExpenses = (newExpenses: ExpenseRecord[], targetMonth: string) => {
    setExpenses((prev) => [...newExpenses, ...prev]);
    setSelectedMonth(targetMonth);
    showToast(`✓ [BANCO_DADOS] ${newExpenses.length} despesas gravadas no mês ${targetMonth}!`);
  };

  // Restaurar backup do banco de dados
  const handleRestoreDatabase = (backup: { expenses: ExpenseRecord[]; debts?: DebtRecord[]; settings?: SystemSettings }) => {
    if (backup.expenses && Array.isArray(backup.expenses)) {
      setExpenses(backup.expenses);
    }
    if (backup.debts && Array.isArray(backup.debts)) {
      setDebts(backup.debts);
    }
    if (backup.settings) {
      setSettings(backup.settings);
    }
    showToast('✓ [BANCO_DADOS] Backup restaurado com sucesso!');
  };

  // Atualizar valor da rescisão quando o usuário receber na sexta dia 30
  const handleUpdateRescisao = (valor: number) => {
    setSettings((prev) => ({
      ...prev,
      reserva_emergencia: valor, // A reserva de emergência É a rescisão!
      rescisao_prevista: {
        data_prevista: '2026-10-30',
        valor,
        status: 'recebido',
        observacao: 'Verba rescisória informada pelo usuário (Reserva de Emergência constituída)',
      },
    }));
    showToast(`✓ [RESERVA_CONSTITUÍDA] Reserva de Emergência criada com R$ ${valor.toFixed(2)} da rescisão!`);
  };

  // Liquidar ou reabrir status da fatura de 23/11 (Etapa 1 da transição com a rescisão)
  const handleToggleFaturaNovembroPaga = (paga: boolean) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        fatura_novembro_paga: paga,
        fatura_novembro_paga_em: paga ? new Date().toISOString().split('T')[0] : undefined,
      };
      localStorage.setItem('sentinela_settings', JSON.stringify(next));
      return next;
    });
    if (paga) {
      showToast('✓ [FATURA_23/11_QUITADA] Fatura do cartão de 23/11 liquidada integralmente com a rescisão!');
    } else {
      showToast('⚠️ [FATURA_23/11_REABERTA] Status de liquidação da fatura de 23/11 reaberto.');
    }
  };

  // Presets para conciliação das anotações do usuário vs sistema
  const handleApplyPreset = (preset: 'atual_26_itens' | 'atual_25_itens' | 'rescisao_total_1009' | 'rescisao_total_1003' | 'rescisao_total_939' | 'atual_22_itens' | 'atual_20_itens' | 'atual_19_itens' | 'atual_16_itens' | 'atual_15_itens' | 'note_chopps' | 'note_8_only' | 'prev_standard' | 'note_2_ubers') => {
    sound.playSuccess();
    let newItems: ExpenseRecord[] = [];

    // 10 itens com centavos exatos da nota (6,30 e 341,97) + Abbey 30,00 dia 18/10 + 2 Chopps (R$ 590,51)
    const base10WithChopps: ExpenseRecord[] = DEFAULT_INITIAL_EXPENSES.filter(
      (e) => (e.metodo_pagamento === 'cartao_credito' || e.metodo_pagamento === 'cartao_proprio' || e.metodo_pagamento === 'cartao_mae') &&
        !['exp_uber22_558', 'exp_lord_uber23', 'exp_lord23', 'exp_uber24', 'exp_abbey24', 'exp_mercado24_4346', 'exp_uber24_970', 'exp_abbey25_63', 'exp_uber25_697', 'exp_uber25_3525', 'exp_netflix_outubro', 'exp_perfume_parc1', 'exp_abbey29_44', 'exp_uber29_1243', 'exp_uber29_770', 'exp_uber31_578_cartao', 'exp_perfume_parc2', 'exp_netflix_novembro'].includes(e.id)
    );

    if (preset === 'atual_26_itens' || preset === 'atual_25_itens') {
      newItems = DEFAULT_INITIAL_EXPENSES;
      showToast('✓ [TOTAL: R$ 959,14] 26 lançamentos consolidados para Fatura 23/11 (com Uber Pix no Cartão R$ 5,78 de 31/10)!');
    } else if (preset === 'rescisao_total_1009' || preset === 'rescisao_total_1003') {
      newItems = [
        ...DEFAULT_INITIAL_EXPENSES.filter((e) => e.id !== 'exp_perfume_parc2'),
        {
          ...DEFAULT_INITIAL_EXPENSES.find((e) => e.id === 'exp_perfume_parc2')!,
          data: '2026-10-31',
          fatura_mes: '2026-11',
          fatura_vencimento: '2026-11-23',
        },
      ];
      showToast('✓ [TOTAL: R$ 1.009,14] Rescisão Total: Fatura 23/11 (R$ 959,14) + 2ª parcela do Perfume (R$ 50) quitadas juntas!');
    } else if (preset === 'atual_22_itens') {
      newItems = DEFAULT_INITIAL_EXPENSES.filter((e) => !['exp_abbey29_44', 'exp_uber29_1243', 'exp_uber29_770', 'exp_uber31_578_cartao'].includes(e.id));
      showToast('✓ [TOTAL: R$ 889,23] 22 lançamentos da Fatura 23/11 (anteriores ao dia 29/10)!');
    } else if (preset === 'rescisao_total_939') {
      newItems = [
        ...DEFAULT_INITIAL_EXPENSES.filter((e) => !['exp_abbey29_44', 'exp_uber29_1243', 'exp_uber29_770', 'exp_uber31_578_cartao', 'exp_perfume_parc2'].includes(e.id)),
        {
          ...DEFAULT_INITIAL_EXPENSES.find((e) => e.id === 'exp_perfume_parc2')!,
          data: '2026-10-25',
          fatura_mes: '2026-11',
          fatura_vencimento: '2026-11-23',
        },
      ];
      showToast('✓ [TOTAL: R$ 939,23] Rescisão Total (anterior a 29/10): com as 2 parcelas do Perfume quitadas!');
    } else if (preset === 'atual_20_itens') {
      newItems = DEFAULT_INITIAL_EXPENSES.filter((e) => !['exp_abbey29_44', 'exp_uber29_1243', 'exp_uber29_770', 'exp_uber31_578_cartao', 'exp_netflix_outubro', 'exp_perfume_parc1', 'exp_perfume_parc2', 'exp_netflix_novembro'].includes(e.id));
      showToast('✓ [TOTAL: R$ 819,23] 20 lançamentos consolidados (anteriores à Netflix e Perfume)!');
    } else if (preset === 'atual_19_itens') {
      newItems = DEFAULT_INITIAL_EXPENSES.filter((e) => !['exp_abbey29_44', 'exp_uber29_1243', 'exp_uber29_770', 'exp_uber31_578_cartao', 'exp_uber25_3525', 'exp_netflix_outubro', 'exp_perfume_parc1', 'exp_perfume_parc2', 'exp_netflix_novembro'].includes(e.id));
      showToast('✓ [TOTAL: R$ 783,98] 19 lançamentos consolidados (anteriores ao Uber R$ 35,25)!');
    } else if (preset === 'atual_16_itens') {
      newItems = DEFAULT_INITIAL_EXPENSES.filter((e) => !['exp_abbey29_44', 'exp_uber29_1243', 'exp_uber29_770', 'exp_uber31_578_cartao', 'exp_uber24_970', 'exp_abbey25_63', 'exp_uber25_697', 'exp_uber25_3525', 'exp_netflix_outubro', 'exp_perfume_parc1', 'exp_perfume_parc2', 'exp_netflix_novembro'].includes(e.id));
      showToast('✓ [TOTAL: R$ 704,31] 16 lançamentos consolidados (com Uber Lord corrigido para R$ 12,38)!');
    } else if (preset === 'atual_15_itens') {
      newItems = DEFAULT_INITIAL_EXPENSES.filter((e) => !['exp_abbey29_44', 'exp_uber29_1243', 'exp_uber29_770', 'exp_uber31_578_cartao', 'exp_mercado24_4346', 'exp_uber24_970', 'exp_abbey25_63', 'exp_uber25_697', 'exp_uber25_3525', 'exp_netflix_outubro', 'exp_perfume_parc1', 'exp_perfume_parc2', 'exp_netflix_novembro'].includes(e.id));
      showToast('✓ [TOTAL: R$ 660,85] 15 lançamentos consolidados (anteriores ao Mercado 24/10)!');
    } else if (preset === 'note_chopps') {
      newItems = base10WithChopps;
      showToast('✓ [TOTAL: R$ 590,51] 10 itens anteriores (Uber 6,30 e Denis 341,97) + 2 Chopps da Abbey.');
    } else if (preset === 'note_8_only') {
      newItems = base10WithChopps.slice(0, 8);
      showToast('✓ [TOTAL: R$ 550,51] 8 itens do seu arquivo de anotações (Soma exata das 8 linhas).');
    } else if (preset === 'prev_standard') {
      newItems = [
        { ...base10WithChopps[0], valor: 6.10 },
        base10WithChopps[1],
        { ...base10WithChopps[2], data: '2026-10-21', descricao: 'Uber' },
        base10WithChopps[3],
        base10WithChopps[4],
        base10WithChopps[5],
        { ...base10WithChopps[6], valor: 341.00, descricao: 'Roupas Denis Beulmont' },
        base10WithChopps[7],
        base10WithChopps[8],
        base10WithChopps[9],
      ];
      showToast('✓ [TOTAL: R$ 589,34] 10 itens com valores arredondados anteriores (6,10 e 341,00).');
    } else if (preset === 'note_2_ubers') {
      newItems = [
        ...base10WithChopps,
        {
          id: 'exp_uber18_3087_segunda',
          data: '2026-10-18',
          descricao: 'Uber (2ª Corrida 18/10)',
          valor: 30.87,
          metodo_pagamento: 'cartao_credito',
          categoria: 'transporte',
          is_impulsive: false,
          timestamp: 1729270000000 + 10,
          vinculado_rescisao: true,
          fatura_mes: '2026-11',
          fatura_vencimento: '2026-11-23',
        },
      ];
      showToast('✓ [TOTAL: R$ 621,38] 11 itens com a 2ª corrida de R$ 30,87 no dia 18/10.');
    }

    const sorted = [...newItems].sort((a, b) => a.data.localeCompare(b.data) || a.timestamp - b.timestamp);
    setExpenses(sorted);
    localStorage.setItem('sentinela_expenses_v2', JSON.stringify(sorted));
  };

  // Ajustar se houve 1 corrida de 30,87 ou 2 corridas de 30,87
  const handleSetUber18Count = (count: 1 | 2) => {
    sound.playSuccess();
    if (count === 2) {
      handleApplyPreset('note_2_ubers');
    } else {
      handleApplyPreset('note_chopps');
    }
  };

  // Limpar todos os valores anteriores para recomeçar o banco de dados do zero
  const handleClearAllExpenses = () => {
    sound.playSuccess();
    setExpenses([]);
    setDebts([
      {
        id: 'debt_cartao_1',
        credor: 'Fatura do Cartão de Crédito',
        valor_total: 0.0,
        valor_pago: 0.0,
        meta_amortizacao_mes: 0.0,
        prioridade: 1,
        observacao: 'Fatura do cartão de crédito zerada para novo ciclo',
      },
    ]);
    localStorage.setItem('sentinela_expenses_v2', JSON.stringify([]));
    localStorage.setItem('sentinela_debts', JSON.stringify([
      {
        id: 'debt_cartao_1',
        credor: 'Fatura do Cartão de Crédito',
        valor_total: 0.0,
        valor_pago: 0.0,
        meta_amortizacao_mes: 0.0,
        prioridade: 1,
        observacao: 'Fatura do cartão de crédito zerada para novo ciclo',
      },
    ]));
    showToast('🧹 [BANCO_DADOS_ZERADO] Histórico e faturas anteriores zerados com sucesso! Pronto para novo ciclo.');
  };

  return (
    <div className="min-h-screen bg-[#030407] text-[#e0f2fe] flex flex-col font-mono selection:bg-[#00f0ff] selection:text-black relative">
      {/* CRT Scanline & Curved Vignette Overlays */}
      {crtEnabled && (
        <>
          <div className="crt-overlay fixed inset-0 z-40 opacity-70 pointer-events-none" />
          <div className="crt-vignette fixed inset-0 z-40 opacity-80 pointer-events-none" />
        </>
      )}

      {/* Top Cyberpunk Header */}
      <Header
        metrics={metrics}
        settings={settings}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        crtEnabled={crtEnabled}
        setCrtEnabled={setCrtEnabled}
        showValues={showValues}
        onToggleShowValues={handleToggleShowValues}
        isMasked={privacy.isMasked}
        onToggleMask={handleToggleMask}
        isStealth={privacy.isStealth}
        onToggleStealth={handleToggleStealth}
        pinEnabled={privacy.pinEnabled}
        onLockTerminalNow={handleLockTerminalNow}
        onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
      />

      {/* Main Cockpit Space */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-4 relative z-10">
        {/* Cyber Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 bg-black border border-[#00f0ff] text-[#00f0ff] px-4 py-2.5 text-xs flex items-center gap-2 neon-glow-cyan animate-in slide-in-from-bottom duration-150">
            <span className="w-2 h-2 bg-[#00ff66] animate-ping" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* TAB 1: COCKPIT OPERACIONAL */}
        {activeTab === 'cockpit' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Seletor Mês a Mês do Banco de Dados & Backup */}
            <MonthSelector
              selectedMonth={selectedMonth}
              onSelectMonth={setSelectedMonth}
              availableMonths={availableMonths}
              expenses={expenses}
              debts={debts}
              settings={settings}
              showValues={showValues}
              onRestoreDatabase={handleRestoreDatabase}
              onClearAllData={handleClearAllExpenses}
              onOpenReport={() => setActiveTab('report')}
            />

            {/* =========================================================================
                PAINEL DE ALTA VISIBILIDADE // RESCISÃO & FATURA DO CARTÃO (CICLO COMPLETO)
                Atende com clareza cristalina: O Cartão 23/11 e a Rescisão com seus saldos
                ========================================================================= */}
            <div className="bg-[#0b0318] border-2 border-[#bd00ff] p-4 sm:p-5 font-mono shadow-2xl shadow-[#bd00ff]/20 space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-[#bd00ff]/30">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 bg-[#bd00ff] text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                      <Sparkles className="w-3.5 h-3.5 text-black" />
                      <span>PAINEL DE CONTROLE // RESCISÃO & FATURA DO CARTÃO</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-black border border-[#bd00ff]/60 text-[#c084fc] font-bold">
                      CICLO GLOBAL (SEM RECORTE DE MÊS)
                    </span>
                  </div>
                  <h1 className="text-base sm:text-xl font-black text-white tracking-tight uppercase">
                    QUANTO É O CARTÃO & QUANTO TEM DA RESCISÃO
                  </h1>
                  <p className="text-xs text-neutral-300">
                    Visão unificada da verba rescisória (R$ 2.796,91 recebidos em 30/10) vs os gastos no Pix e a Fatura de 23/11.
                  </p>
                </div>
                <div className="px-3 py-1.5 bg-black/90 border border-[#00ff66] text-[#00ff66] text-xs font-bold uppercase tracking-wider flex items-center gap-2 self-stretch sm:self-auto justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00ff66] animate-pulse" />
                  <span>SALÁRIO LIVRE: R$ 200,00 INTACTO</span>
                </div>
              </div>

              {/* 4 CARDS EM DESTAQUE MÁXIMO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* CARD 1: CARTÃO 23/11 */}
                <div className="bg-[#020d18] border-2 border-[#00f0ff] p-3.5 space-y-2 shadow-lg shadow-[#00f0ff]/15">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black tracking-wider text-[#00f0ff] flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#00f0ff]" />
                      <span>1. FATURA DO CARTÃO</span>
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-[#00f0ff]/20 text-[#00f0ff] font-bold uppercase">
                      VENCE 23/11
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-[#00f0ff] font-mono">
                    {formatCurrency(globalRescisaoData.totalCartaoFaturaNov, !showValues)}
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-tight">
                    <strong>{globalRescisaoData.cartaoFaturaNovCount} compras</strong> feitas no cartão entre 17/10 e 31/10 (Denis R$ 341,97, Ubers, Abbey, etc.).
                  </p>
                  <div className="pt-1.5 border-t border-[#00f0ff]/30 text-[10px] text-[#00ff66] font-bold">
                    ✓ Será debitado 100% da Rescisão no vencimento (sem rotativo).
                  </div>
                </div>

                {/* CARD 2: PIX RESCISÃO JÁ GASTO */}
                <div className="bg-[#14020c] border-2 border-[#ff0055] p-3.5 space-y-2 shadow-lg shadow-[#ff0055]/15">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black tracking-wider text-[#ff0055] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#ff0055]" />
                      <span>2. PIX RESCISÃO JÁ GASTO</span>
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-[#ff0055]/20 text-[#ff0055] font-bold uppercase">
                      30/10 ATÉ HOJE
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-[#ff0055] font-mono">
                    {formatCurrency(globalRescisaoData.totalPixRescisaoGasto, !showValues)}
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-tight">
                    <strong>{globalRescisaoData.pixRescisaoCount} saídas Pix</strong> debitadas direto da conta da rescisão desde sexta (30/10 a 05/11).
                  </p>
                  <div className="pt-1.5 border-t border-[#ff0055]/30 text-[10px] text-neutral-400">
                    Sexta 30 (490,34) + Sáb 31 (302,26) + Nov (339,96).
                  </div>
                </div>

                {/* CARD 3: SALDO ATUAL HOJE EM CONTA */}
                <div className="bg-[#021408] border-2 border-[#00ff66] p-3.5 space-y-2 shadow-lg shadow-[#00ff66]/15">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black tracking-wider text-[#00ff66] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00ff66]" />
                      <span>3. SALDO HOJE EM CONTA</span>
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-[#00ff66]/20 text-[#00ff66] font-bold uppercase">
                      DISPONÍVEL AGORA
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-[#00ff66] font-mono">
                    {formatCurrency(globalRescisaoData.saldoRescisaoHoje, !showValues)}
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-tight">
                    Dinheiro ainda em mãos da rescisão hoje: R$ 2.796,91 - R$ 1.132,56 (Pix já saídos).
                  </p>
                  <div className="pt-1.5 border-t border-[#00ff66]/30 text-[10px] text-[#00ff66] font-bold">
                    ✓ Valor real disponível na sua conta bancária agora.
                  </div>
                </div>

                {/* CARD 4: SALDO FINAL APÓS FATURA */}
                <div className="bg-[#120422] border-2 border-[#ffe600] p-3.5 space-y-2 shadow-lg shadow-[#ffe600]/15">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black tracking-wider text-[#ffe600] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#ffe600]" />
                      <span>4. SOBRA FINAL DA RESCISÃO</span>
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-[#ffe600]/20 text-[#ffe600] font-bold uppercase">
                      APÓS DIA 23/11
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-[#ffe600] font-mono">
                    {formatCurrency(globalRescisaoData.saldoRescisaoAposFatura, !showValues)}
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-tight">
                    Sobra líquida blindada da rescisão no cofre após pagar a fatura de R$ 959,14 no dia 23/11.
                  </p>
                  <div className="pt-1.5 border-t border-[#ffe600]/30 text-[10px] text-[#c084fc] font-bold">
                    🛡️ Fundo de sobrevida e reserva constituído com sucesso!
                  </div>
                </div>
              </div>

              {/* BARRA COMPARATIVA / EQUAÇÃO VISUAL DA RESCISÃO */}
              <div className="bg-black/90 border border-neutral-700 p-3 text-xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                  <span className="text-white font-bold">
                    EQUAÇÃO DA RESCISÃO: <span className="text-[#c084fc] font-black">R$ {formatCurrency(globalRescisaoData.valorRescisaoRecebida, !showValues)}</span> (Entrada em 30/10)
                  </span>
                  <div className="flex items-center gap-3 text-[10px] flex-wrap">
                    <span className="text-[#ff0055] font-bold">● Pix Gasto: {formatCurrency(globalRescisaoData.totalPixRescisaoGasto, !showValues)}</span>
                    <span className="text-[#00f0ff] font-bold">● Cartão 23/11: {formatCurrency(globalRescisaoData.totalCartaoFaturaNov, !showValues)}</span>
                    <span className="text-[#00ff66] font-bold">● Sobra: {formatCurrency(globalRescisaoData.saldoRescisaoAposFatura, !showValues)}</span>
                  </div>
                </div>

                <div className="w-full h-3 bg-neutral-900 border border-neutral-700 flex overflow-hidden">
                  <div 
                    className="bg-[#ff0055] h-full transition-all duration-500"
                    style={{ width: `${(globalRescisaoData.totalPixRescisaoGasto / globalRescisaoData.valorRescisaoRecebida) * 100}%` }}
                    title={`Pix Gasto: ${((globalRescisaoData.totalPixRescisaoGasto / globalRescisaoData.valorRescisaoRecebida) * 100).toFixed(1)}%`}
                  />
                  <div 
                    className="bg-[#00f0ff] h-full transition-all duration-500"
                    style={{ width: `${(globalRescisaoData.totalCartaoFaturaNov / globalRescisaoData.valorRescisaoRecebida) * 100}%` }}
                    title={`Cartão 23/11: ${((globalRescisaoData.totalCartaoFaturaNov / globalRescisaoData.valorRescisaoRecebida) * 100).toFixed(1)}%`}
                  />
                  <div 
                    className="bg-[#00ff66] h-full transition-all duration-500"
                    style={{ width: `${(globalRescisaoData.saldoRescisaoAposFatura / globalRescisaoData.valorRescisaoRecebida) * 100}%` }}
                    title={`Sobra Líquida: ${((globalRescisaoData.saldoRescisaoAposFatura / globalRescisaoData.valorRescisaoRecebida) * 100).toFixed(1)}%`}
                  />
                </div>

                {/* BOTÃO PARA EXPANDIR O DETALHAMENTO DE CADA LADO */}
                <div className="pt-1.5 flex justify-between items-center">
                  <span className="text-[10px] text-neutral-400">
                    💡 O Cartão (R$ 959,14) e o Pix Rescisão (R$ 1.132,56) são categorias separadas que juntas somam R$ 2.091,70 debitadas da rescisão de R$ 2.796,91.
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDetailedRescisaoBreakdown(!showDetailedRescisaoBreakdown)}
                    className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[#00f0ff] text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
                  >
                    {showDetailedRescisaoBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    <span>{showDetailedRescisaoBreakdown ? 'OCULTAR EXTRATO COMPARATIVO' : 'VER EXTRATO COMPARATIVO (ITEM POR ITEM)'}</span>
                  </button>
                </div>

                {/* Extrato Comparativo Expandido */}
                {showDetailedRescisaoBreakdown && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-neutral-800 text-xs">
                    {/* Coluna 1: Compras do Cartão */}
                    <div className="bg-[#020b12] border border-[#00f0ff]/40 p-2.5 space-y-1.5">
                      <div className="flex justify-between items-center border-b border-[#00f0ff]/30 pb-1">
                        <span className="font-black text-[#00f0ff] uppercase text-[11px] flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          <span>CARTÃO DE CRÉDITO (FATURA 23/11)</span>
                        </span>
                        <span className="font-bold text-[#00f0ff]">
                          {formatCurrency(globalRescisaoData.totalCartaoFaturaNov, !showValues)} ({globalRescisaoData.cartaoFaturaNovCount} itens)
                        </span>
                      </div>
                      <div className="max-h-56 overflow-y-auto space-y-1 pr-1 divide-y divide-neutral-800/60 text-[10px]">
                        {globalRescisaoData.cartaoFaturaNovItems.map((item, idx) => (
                          <div key={item.id || idx} className="flex justify-between items-center py-0.5 text-neutral-300">
                            <span>{item.data.slice(5)} • {anonymizeMerchant(item.descricao, privacy.isStealth)}</span>
                            <span className="font-mono font-bold text-[#00f0ff]">{formatCurrency(item.valor, !showValues)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Coluna 2: Saídas Pix Rescisão */}
                    <div className="bg-[#12020a] border border-[#ff0055]/40 p-2.5 space-y-1.5">
                      <div className="flex justify-between items-center border-b border-[#ff0055]/30 pb-1">
                        <span className="font-black text-[#ff0055] uppercase text-[11px] flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#ff0055]" />
                          <span>SAÍDAS PIX RESCISÃO (30/10 A 05/11)</span>
                        </span>
                        <span className="font-bold text-[#ff0055]">
                          {formatCurrency(globalRescisaoData.totalPixRescisaoGasto, !showValues)} ({globalRescisaoData.pixRescisaoCount} itens)
                        </span>
                      </div>
                      <div className="max-h-56 overflow-y-auto space-y-1 pr-1 divide-y divide-neutral-800/60 text-[10px]">
                        {globalRescisaoData.pixRescisaoItems.map((item, idx) => (
                          <div key={item.id || idx} className="flex justify-between items-center py-0.5 text-neutral-300">
                            <span>{item.data.slice(5)} • {anonymizeMerchant(item.descricao, privacy.isStealth)}</span>
                            <span className="font-mono font-bold text-[#ff0055]">{formatCurrency(item.valor, !showValues)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* =========================================================================
                TABELA TOTAL DOS VALORES :: TELA DE CIMA (ALTA VISIBILIDADE)
                ========================================================================= */}
            <div className="bg-[#030814] border-2 border-[#00f0ff] p-4 sm:p-5 font-mono shadow-2xl shadow-[#00f0ff]/15 space-y-4">
              
              {/* BANNER PRINCIPAL COM O TOTAL GERAL DO SISTEMA */}
              <div className="bg-[#02050b] border-2 border-[#ffe600] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl shadow-[#ffe600]/15">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-[#ffe600] text-black font-black text-xs uppercase tracking-wider">
                      ⚡ TABELA TOTAL DE VALORES DO SISTEMA
                    </span>
                    <span className="text-xs text-[#00ff66] font-bold">
                      {cockpitReportData.count} LANÇAMENTOS AUDITADOS
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                    CONSOLIDAÇÃO GERAL DE OUTUBRO/2026
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Soma de todos os gastos (Cartão 23/11 pago com a rescisão + Pix-Salário + Pix-Rescisão)
                  </p>
                </div>

                <div className="w-full md:w-auto bg-black/95 px-5 py-3 border-2 border-[#ffe600] text-right flex flex-row md:flex-col items-center md:items-end justify-between gap-2 neon-glow-yellow">
                  <span className="text-[11px] text-[#ffe600] font-bold uppercase tracking-widest block">
                    TOTAL GERAL DE GASTOS:
                  </span>
                  <span className="text-3xl sm:text-4xl font-black text-[#ffe600] tracking-tight block">
                    {formatCurrency(cockpitReportData.totalGeral, !showValues)}
                  </span>
                </div>
              </div>

              {/* TABELA ESTRUTURADA DE TOTAIS POR CATEGORIA (TELA DE CIMA) */}
              <div className="overflow-x-auto border border-neutral-700 bg-black/80">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-700 bg-neutral-900/90 text-neutral-300 font-bold uppercase text-[11px]">
                      <th className="py-2.5 px-3">MÉTODO / TABELA</th>
                      <th className="py-2.5 px-3 text-right">VALOR TOTAL</th>
                      <th className="py-2.5 px-3">VENCIMENTO / STATUS</th>
                      <th className="py-2.5 px-3">FONTE DE QUITAÇÃO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {/* Linha 1: Tabela 1: Valor Pix Salário */}
                    <tr className="hover:bg-neutral-900/40">
                      <td className="py-2.5 px-3 font-bold text-[#00ff66] flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#00ff66] inline-block" />
                        <span>🟢 TABELA 1: VALOR PIX SALÁRIO</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-base text-[#00ff66] font-mono">
                        {formatCurrency(cockpitReportData.pixSalario, !showValues)}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-300">
                        <span className="px-1.5 py-0.5 bg-[#00ff66]/15 text-[#00ff66] border border-[#00ff66]/40 text-[10px] font-bold">
                          ✓ SALDO INTACTO (R$ 200 LIVRE)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-400">
                        Sobra da renda ordinária mensal
                      </td>
                    </tr>

                    {/* Linha 2: Tabela 2: Valor Pix Cartão - Total */}
                    <tr className="hover:bg-neutral-900/40 bg-[#001726]/40">
                      <td className="py-2.5 px-3 font-bold text-[#00f0ff] flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-[#00f0ff]" />
                        <span>🔵 TABELA 2: VALOR PIX CARTÃO - TOTAL</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-base text-[#00f0ff] font-mono">
                        {formatCurrency(cockpitReportData.cartaoRescisao, !showValues)}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-300">
                        <span className="px-1.5 py-0.5 bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50 text-[10px] font-bold">
                          FATURA VENCE EM 23/11 ({globalRescisaoData.cartaoFaturaNovCount} COMPRAS)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#00f0ff] font-bold">
                        100% paga com o dinheiro da Rescisão
                      </td>
                    </tr>

                    {/* Linha 3: Tabela 3: Valor Pix - Rescisão */}
                    <tr className="hover:bg-neutral-900/40">
                      <td className="py-2.5 px-3 font-bold text-[#c084fc] flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#bd00ff] inline-block" />
                        <span>🟣 TABELA 3: VALOR PIX - RESCISÃO</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-base text-[#c084fc] font-mono">
                        {formatCurrency(cockpitReportData.pixRescisao, !showValues)}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-300">
                        <span className="px-1.5 py-0.5 bg-[#bd00ff]/20 text-[#c084fc] border border-[#bd00ff]/40 text-[10px] font-bold">
                          SEXTA 30/10 (HOMOLOGAÇÃO)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-400">
                        Débito direto da conta rescisória
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#ffe600] bg-[#120f02] font-bold">
                      <td className="py-3 px-3 uppercase text-xs font-black text-[#ffe600]">
                        ⚡ TOTAL GERAL DE VALORES:
                      </td>
                      <td className="py-3 px-3 text-right font-black font-mono text-xl text-[#ffe600]">
                        {formatCurrency(cockpitReportData.totalGeral, !showValues)}
                      </td>
                      <td colSpan={2} className="py-3 px-3 text-xs text-neutral-300">
                        {cockpitReportData.count} compras no cartão • Fatura Outubro já quitada • Fatura Novembro coberta pela rescisão
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* PAINEL DE AUDITORIA DE DIVERGÊNCIAS (ARQUIVO DE ANOTAÇÕES vs SISTEMA) */}
              <div className="bg-[#0b0c16] border-2 border-[#00f0ff] p-4 text-xs space-y-3 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#00f0ff] text-black font-black text-[11px] uppercase tracking-wider">
                      🔍 AUDITORIA DE DIVERGÊNCIAS // SEU BLOCO DE NOTAS (OUTUBRO.TXT)
                    </span>
                    <span className="text-[#00ff66] font-bold text-xs">
                      CONFERÊNCIA DETALHADA
                    </span>
                  </div>
                  <span className="text-neutral-400 font-mono text-[11px]">
                    Ativo agora: <strong className="text-[#ffe600]">{formatCurrency(cockpitReportData.totalGeral, !showValues)}</strong> ({cockpitReportData.count} itens)
                  </span>
                </div>

                {/* Explicação clara das 3 divergências encontradas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] text-neutral-300">
                  <div className="p-2.5 bg-black/60 border border-neutral-700 space-y-1">
                    <span className="font-black text-[#ffe600] uppercase block">1. Por que você calculou R$ 549,34?</span>
                    <p className="text-neutral-400">
                      O valor <strong>R$ 549,34</strong> é a soma dos 8 lançamentos anteriores <strong>SEM os 2 Chopps da Abbey</strong> (22/10 e 23/10 de R$ 20 cada).
                    </p>
                    <p className="text-[#00f0ff] font-bold">
                      R$ 549,34 + R$ 40,00 (chopps) = R$ 589,34.
                    </p>
                  </div>

                  <div className="p-2.5 bg-black/60 border border-neutral-700 space-y-1">
                    <span className="font-black text-[#ffe600] uppercase block">2. Diferença de Centavos (+R$ 1,17)</span>
                    <p className="text-neutral-400">
                      No seu arquivo anotado, os centavos foram corrigidos:
                      <br />• <strong>Uber 17/10:</strong> R$ 6,30 (era 6,10 = +0,20)
                      <br />• <strong>Denis 21/10:</strong> R$ 341,97 (era 341,00 = +0,97)
                      <br />• <strong>Abbey 18/10:</strong> R$ 30,00 (era Uber 21/10)
                    </p>
                    <p className="text-[#00ff66] font-bold">
                      Soma real das 8 linhas = R$ 550,51 (e não 549,34).
                    </p>
                  </div>

                  <div className="p-2.5 bg-black/60 border border-neutral-700 space-y-1">
                    <span className="font-black text-[#ffe600] uppercase block">3. Total Real com os 2 Chopps</span>
                    <p className="text-neutral-400">
                      Somando os 8 itens com os centavos exatos da sua nota mais os 2 Chopps da Abbey (20+20):
                    </p>
                    <p className="text-[#ffe600] font-bold text-sm">
                      R$ 550,51 + R$ 40,00 = R$ 590,51
                    </p>
                    <span className="text-[10px] text-neutral-400 block">(Ou R$ 621,38 se houver a 2ª corrida de 30,87)</span>
                  </div>
                </div>

                {/* Alerta de Verificação dos Centavos (590,51 vs 590,41 ou 591,41) */}
                <div className="p-3 bg-[#001726] border-2 border-[#00f0ff] text-neutral-200 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-[#00f0ff] text-black font-black text-[10px] uppercase">
                      ⚠️ CONFERÊNCIA DOS CENTAVOS (590,51)
                    </span>
                    <span className="text-white font-bold text-xs">
                      O valor matemático oficial é <span className="text-[#ffe600] font-black">R$ 590,51</span> (Cinquenta e um centavos).
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300">
                    • <strong>Por que pareceu 590,41?</strong> Na fonte digital monoespaçada, o traço superior reto do número <strong>5</strong> em <strong>,51</strong> pode ser confundido visualmente com <strong>,41</strong>.
                    <br />• <strong>Por que a outra tela (Vercel) tem valor diferente?</strong> O Vercel armazena dados no <em>localStorage</em> isolado daquele navegador. Clique no botão verde abaixo para forçar a sincronização exata de R$ 590,51!
                  </p>
                </div>

                {/* Botões Rápidos para Alternar com 1 Clique */}
                <div className="pt-2 border-t border-neutral-800 space-y-1.5">
                  <span className="text-[11px] font-bold text-neutral-300 block uppercase">
                    SELECIONE QUAL TOTAL VOCÊ DESEJA APLICAR NO BANCO DE DADOS:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('atual_26_itens')}
                      className={`p-2 border text-left cursor-pointer transition-all ${
                        Math.abs(cockpitReportData.totalGeral - 959.14) < 0.05
                          ? 'border-[#ffe600] bg-[#ffe600]/20 text-white shadow-md shadow-[#ffe600]/20'
                          : 'border-neutral-700 bg-black text-neutral-400 hover:text-white hover:border-[#ffe600]'
                      }`}
                      title="26 itens: fatura 23/11 consolidada com Abbey R$ 44, Uber R$ 12,43, Uber R$ 7,70 (29/10), Uber Pix no Cartão R$ 5,78 (31/10), Netflix e Perfume 1/2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-[#ffe600]">R$ 959,14</span>
                        {Math.abs(cockpitReportData.totalGeral - 959.14) < 0.05 && (
                          <span className="text-[10px] bg-[#ffe600] text-black px-1 font-black">ATIVO</span>
                        )}
                      </div>
                      <span className="text-[10px] block font-bold text-neutral-300 mt-0.5">
                        ⭐ 26 ITENS (FATURA 23/11 ATUALIZADA 31/10)
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('rescisao_total_1009')}
                      className={`p-2 border text-left cursor-pointer transition-all ${
                        Math.abs(cockpitReportData.totalGeral - 1009.14) < 0.05
                          ? 'border-[#bd00ff] bg-[#bd00ff]/20 text-white shadow-md shadow-[#bd00ff]/20'
                          : 'border-neutral-700 bg-black text-neutral-400 hover:text-white hover:border-[#bd00ff]'
                      }`}
                      title="27 itens: Fatura 23/11 (R$ 959,14) + 2ª parcela do Perfume (R$ 50) quitadas juntas pela Rescisão"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-[#c084fc]">R$ 1.009,14</span>
                        {Math.abs(cockpitReportData.totalGeral - 1009.14) < 0.05 && (
                          <span className="text-[10px] bg-[#bd00ff] text-black px-1 font-black">ATIVO</span>
                        )}
                      </div>
                      <span className="text-[10px] block font-bold text-neutral-300 mt-0.5">
                        🛡️ RESCISÃO TOTAL (2 PARCELAS = R$ 100)
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('atual_22_itens')}
                      className={`p-2 border text-left cursor-pointer transition-all ${
                        Math.abs(cockpitReportData.totalGeral - 889.23) < 0.05
                          ? 'border-[#00ff66] bg-[#00ff66]/20 text-white shadow-md shadow-[#00ff66]/20'
                          : 'border-neutral-700 bg-black text-neutral-400 hover:text-white hover:border-[#00ff66]'
                      }`}
                      title="22 itens: anteriores aos lançamentos de 29/10"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-[#00ff66]">R$ 889,23</span>
                        {Math.abs(cockpitReportData.totalGeral - 889.23) < 0.05 && (
                          <span className="text-[10px] bg-[#00ff66] text-black px-1 font-black">ATIVO</span>
                        )}
                      </div>
                      <span className="text-[10px] block font-bold text-neutral-300 mt-0.5">
                        📦 22 ITENS (ATÉ 25/10)
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('atual_20_itens')}
                      className={`p-2 border text-left cursor-pointer transition-all ${
                        Math.abs(cockpitReportData.totalGeral - 819.23) < 0.05
                          ? 'border-[#00ff66] bg-[#00ff66]/20 text-white shadow-md shadow-[#00ff66]/20'
                          : 'border-neutral-700 bg-black text-neutral-400 hover:text-white hover:border-[#00ff66]'
                      }`}
                      title="20 itens: consolidação anterior a Netflix e Perfume"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-[#00ff66]">R$ 819,23</span>
                        {Math.abs(cockpitReportData.totalGeral - 819.23) < 0.05 && (
                          <span className="text-[10px] bg-[#00ff66] text-black px-1 font-black">ATIVO</span>
                        )}
                      </div>
                      <span className="text-[10px] block font-bold text-neutral-300 mt-0.5">
                        📦 20 ITENS (ANTERIOR)
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('atual_19_itens')}
                      className={`p-2 border text-left cursor-pointer transition-all ${
                        Math.abs(cockpitReportData.totalGeral - 783.98) < 0.05
                          ? 'border-[#00ff66] bg-[#00ff66]/20 text-white shadow-md shadow-[#00ff66]/20'
                          : 'border-neutral-700 bg-black text-neutral-400 hover:text-white hover:border-[#00ff66]'
                      }`}
                      title="19 itens: anteriores ao Uber R$ 35,25 de 25/10"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-[#00ff66]">R$ 783,98</span>
                        {Math.abs(cockpitReportData.totalGeral - 783.98) < 0.05 && (
                          <span className="text-[10px] bg-[#00ff66] text-black px-1 font-black">ATIVO</span>
                        )}
                      </div>
                      <span className="text-[10px] block font-bold text-neutral-300 mt-0.5">
                        📦 19 ITENS (ANTERIOR)
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('atual_16_itens')}
                      className={`p-2 border text-left cursor-pointer transition-all ${
                        Math.abs(cockpitReportData.totalGeral - 704.31) < 0.05
                          ? 'border-[#00f0ff] bg-[#00f0ff]/20 text-white shadow-md shadow-[#00f0ff]/20'
                          : 'border-neutral-700 bg-black text-neutral-400 hover:text-white hover:border-[#00f0ff]'
                      }`}
                      title="16 itens: anteriores às compras de 25/10"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-[#00f0ff]">R$ 704,31</span>
                        {Math.abs(cockpitReportData.totalGeral - 704.31) < 0.05 && (
                          <span className="text-[10px] bg-[#00f0ff] text-black px-1 font-black">ATIVO</span>
                        )}
                      </div>
                      <span className="text-[10px] block font-bold text-neutral-300 mt-0.5">
                        📦 16 ITENS (ATÉ MERCADO 24/10)
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('atual_15_itens')}
                      className={`p-2 border text-left cursor-pointer transition-all ${
                        Math.abs(cockpitReportData.totalGeral - 660.85) < 0.05
                          ? 'border-[#00f0ff] bg-[#00f0ff]/20 text-white shadow-md shadow-[#00f0ff]/20'
                          : 'border-neutral-700 bg-black text-neutral-400 hover:text-white hover:border-[#00f0ff]'
                      }`}
                      title="15 itens: anteriores ao Mercado de 24/10"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-[#00f0ff]">R$ 660,85</span>
                        {Math.abs(cockpitReportData.totalGeral - 660.85) < 0.05 && (
                          <span className="text-[10px] bg-[#00f0ff] text-black px-1 font-black">ATIVO</span>
                        )}
                      </div>
                      <span className="text-[10px] block font-bold text-neutral-300 mt-0.5">
                        📦 15 ITENS (ANTERIOR)
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('note_chopps')}
                      className={`p-2 border text-left cursor-pointer transition-all ${
                        Math.abs(cockpitReportData.totalGeral - 590.51) < 0.05
                          ? 'border-[#00ff66] bg-[#00ff66]/20 text-white shadow-md shadow-[#00ff66]/20'
                          : 'border-neutral-700 bg-black text-neutral-400 hover:text-white hover:border-[#00ff66]'
                      }`}
                      title="10 itens: centavos exatos (6,30 e 341,97) + Abbey 30,00 + 2 Chopps de R$ 20"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-[#00ff66]">R$ 590,51</span>
                        {Math.abs(cockpitReportData.totalGeral - 590.51) < 0.05 && (
                          <span className="text-[10px] bg-[#00ff66] text-black px-1 font-black">ATIVO</span>
                        )}
                      </div>
                      <span className="text-[10px] block font-bold text-neutral-300 mt-0.5">
                        ⭐ NOTA REAL + 2 CHOPPS (10 ITENS)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyPreset('note_8_only')}
                      className={`p-2 border text-left cursor-pointer transition-all ${
                        Math.abs(cockpitReportData.totalGeral - 550.51) < 0.05
                          ? 'border-[#ffe600] bg-[#ffe600]/20 text-white shadow-md shadow-[#ffe600]/20'
                          : 'border-neutral-700 bg-black text-neutral-400 hover:text-white hover:border-[#ffe600]'
                      }`}
                      title="8 itens: exatamente as 8 linhas anotadas no arquivo outubro.txt"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-[#ffe600]">R$ 550,51</span>
                        {Math.abs(cockpitReportData.totalGeral - 550.51) < 0.05 && (
                          <span className="text-[10px] bg-[#ffe600] text-black px-1 font-black">ATIVO</span>
                        )}
                      </div>
                      <span className="text-[10px] block font-bold text-neutral-300 mt-0.5">
                        📄 APENAS 8 ITENS DO TXT (SEM CHOPPS)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyPreset('prev_standard')}
                      className={`p-2 border text-left cursor-pointer transition-all ${
                        Math.abs(cockpitReportData.totalGeral - 589.34) < 0.05
                          ? 'border-[#00f0ff] bg-[#00f0ff]/20 text-white shadow-md shadow-[#00f0ff]/20'
                          : 'border-neutral-700 bg-black text-neutral-400 hover:text-white hover:border-[#00f0ff]'
                      }`}
                      title="10 itens: valores anteriores arredondados (6,10 e 341,00)"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-[#00f0ff]">R$ 589,34</span>
                        {Math.abs(cockpitReportData.totalGeral - 589.34) < 0.05 && (
                          <span className="text-[10px] bg-[#00f0ff] text-black px-1 font-black">ATIVO</span>
                        )}
                      </div>
                      <span className="text-[10px] block font-bold text-neutral-300 mt-0.5">
                        🔄 VALORES ANTERIORES (10 ITENS)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyPreset('note_2_ubers')}
                      className={`p-2 border text-left cursor-pointer transition-all ${
                        Math.abs(cockpitReportData.totalGeral - 621.38) < 0.05
                          ? 'border-[#c084fc] bg-[#c084fc]/20 text-white shadow-md shadow-[#c084fc]/20'
                          : 'border-neutral-700 bg-black text-neutral-400 hover:text-white hover:border-[#c084fc]'
                      }`}
                      title="11 itens: nota real + chopps + 2ª corrida Uber 30,87"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-[#c084fc]">R$ 621,38</span>
                        {Math.abs(cockpitReportData.totalGeral - 621.38) < 0.05 && (
                          <span className="text-[10px] bg-[#c084fc] text-black px-1 font-black">ATIVO</span>
                        )}
                      </div>
                      <span className="text-[10px] block font-bold text-neutral-300 mt-0.5">
                        🚗 COM 2º UBER 30,87 (11 ITENS)
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* BOTÕES DE AÇÃO E EXPANSÃO DA LISTA */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-[#00f0ff]/20">
                <button
                  type="button"
                  onClick={() => {
                    sound.playTick();
                    setMobileReportExpanded(!mobileReportExpanded);
                  }}
                  className="px-3 py-2 bg-[#00f0ff]/20 hover:bg-[#00f0ff]/30 border border-[#00f0ff] text-[#00f0ff] text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer uppercase transition-all"
                >
                  <span>{mobileReportExpanded ? '▲ RECOLHER LISTA DETALHADA' : `▼ VER LISTA DETALHADA (${cockpitReportData.count} LANÇAMENTOS COM VALORES EM DESTAQUE)`}</span>
                  {mobileReportExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playTick();
                    setActiveTab('report');
                  }}
                  className="px-4 py-2 bg-[#00ff66] hover:bg-[#00cc52] text-black font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#00ff66]/20 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>ABRIR RELATÓRIO COMPLETO COM TODAS AS AUDITORIAS (PDF)</span>
                </button>
              </div>

              {/* LISTA EXPANDÍVEL COM OS 10 ITENS EM FORMATO DE ALTA VISIBILIDADE */}
              {mobileReportExpanded && (
                <div className="pt-3 border-t border-neutral-800 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs text-neutral-300 font-bold px-1">
                    <span className="uppercase text-[#00f0ff]">Lançamentos do Mês (Cartão 23/11 e Pix Rescisão):</span>
                    <span className="text-[#ffe600] font-black font-mono text-sm">Total: {formatCurrency(cockpitReportData.totalGeral, !showValues)}</span>
                  </div>

                  <div className="divide-y divide-neutral-800 border-2 border-neutral-700 bg-black/90">
                    {cockpitReportData.sortedList.map((e) => (
                      <div key={e.id} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-[#00f0ff]/10 transition-colors">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.2 bg-neutral-800 text-[#00f0ff] font-mono text-[11px] font-bold">
                              {e.data}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-white text-sm">
                                {anonymizeMerchant(e.descricao, privacy.isStealth)}
                              </span>
                              {privacy.isStealth && (
                                <span className="px-1 py-0.2 bg-[#00f0ff]/15 border border-[#00f0ff]/40 text-[#00f0ff] text-[9px] font-mono tracking-tight font-normal">
                                  STEALTH
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-[11px] text-neutral-400 flex items-center gap-2">
                            <span className="text-[#00f0ff] font-bold">💳 CARTÃO (RESCISÃO 23/11)</span>
                            <span>•</span>
                            <span className={e.is_impulsive ? 'text-[#ff0055] font-bold' : 'text-[#00ff66] font-bold'}>
                              {e.is_impulsive ? 'Lazer / Impulsivo' : 'Essencial / Transporte'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className="font-mono font-black text-lg sm:text-xl text-[#ffe600] bg-black px-2.5 py-1 border border-[#ffe600]/60 block shadow-md">
                            {formatCurrency(e.valor, !showValues)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Banner de Limpeza se houver despesas no navegador do usuário */}
            {expenses.length > 0 && (
              <div className="bg-[#14060b] border border-[#ff0055]/70 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
                <div className="flex items-center gap-2 text-[#ff4d79]">
                  <RotateCcw className="w-4 h-4 text-[#ff0055] flex-shrink-0" />
                  <span>
                    Existem <strong>{expenses.length} lançamentos</strong> salvos no navegador. Clique ao lado para zerar tudo e começar do zero:
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearAllExpenses}
                  className="px-3.5 py-1.5 bg-[#ff0055] hover:bg-[#ff3377] text-white font-extrabold uppercase text-[11px] transition-all cursor-pointer flex-shrink-0 flex items-center gap-1.5 shadow-lg shadow-[#ff0055]/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ZERAR HISTÓRICO AGORA</span>
                </button>
              </div>
            )}

            {/* Mecanismo de Duas Escalas: Pix/À Vista vs Cartão de Crédito + Ciclo Salário (Dia 5) & Rescisão (Dia 30) */}
            <DualScaleTracker
              selectedMonth={selectedMonth}
              expenses={expenses}
              settings={settings}
              showValues={showValues}
              onOpenNoteImporter={() => setIsNoteImporterOpen(true)}
              onUpdateRescisao={handleUpdateRescisao}
            />

            {/* Cronograma de Transição do Sistema: Etapa 1 (23/11 - Cartão) & Etapa 2 (05/12 - Salário) */}
            <SystemTransitionTracker
              settings={settings}
              expenses={expenses}
              selectedMonth={selectedMonth}
              showValues={showValues}
              onToggleFaturaNovembroPaga={handleToggleFaturaNovembroPaga}
              onSelectMonth={setSelectedMonth}
              onUpdateRescisao={handleUpdateRescisao}
            />

            {/* Aviso Proeminente: Saldo Pix Real Zerado (Sem entrada real de dinheiro) */}
            {!metrics.tem_saldo_real && (
              <div className="bg-[#1a0209] border-2 border-[#ff0055] p-3 text-[#ff0055] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl shadow-[#ff0055]/15 font-mono">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-[#ff0055] flex-shrink-0 animate-pulse" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-[#ff0055] text-black font-black text-[10px] uppercase">
                        SALDO PIX REAL = R$ 0,00
                      </span>
                      <span className="text-xs font-black text-white uppercase tracking-wider">
                        Sem saldo: gastos vão para o cartão
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-300 mt-0.5">
                      {metrics.motivo_sem_saldo}. O saldo livre e o teto diário permanecem em R$ 0,00 até a entrada real do dinheiro.
                    </p>
                  </div>
                </div>
                <div className="px-2 py-1 bg-[#2b040f] border border-[#ff0055]/60 text-[10px] text-[#ff3366] font-bold uppercase flex-shrink-0">
                  REGRA DE PROTEÇÃO ATIVA
                </div>
              </div>
            )}

            {/* ALERTA CRÍTICO DE FLUXO DE CAIXA: Faturas a Vencer > Dinheiro que vai entrar antes do vencimento */}
            {metrics.alerta_descompasso?.tem_descompasso && (
              <div className="bg-[#19030b] border-2 border-[#ff0055] p-3.5 shadow-2xl shadow-[#ff0055]/20 font-mono space-y-2.5 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#ff0055]/30">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#ff0055] text-black font-black text-[10px] tracking-wider uppercase flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-black animate-pulse" />
                      <span>[ ALERTA DE FLUXO DE CAIXA: FATURA SUPERA ENTRADAS ]</span>
                    </span>
                    <span className="text-[10px] text-[#ff0055] font-bold">
                      VENCIMENTO DIA {metrics.alerta_descompasso.dia_vencimento}
                    </span>
                  </div>
                  <div className="px-2 py-0.5 bg-[#ff0055]/20 border border-[#ff0055] text-[#ff0055] text-[10px] font-bold uppercase tracking-wider">
                    DÉFICIT NO VENCIMENTO: -{formatCurrency(metrics.alerta_descompasso.deficit_vencimento, !showValues)}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-[#0b0105] border border-[#ff0055]/40 p-2.5">
                    <span className="text-[10px] text-neutral-400 block uppercase">Fatura a Vencer (Dia {metrics.alerta_descompasso.dia_vencimento}):</span>
                    <span className="text-xl font-black text-[#ff0055]">
                      {formatCurrency(metrics.alerta_descompasso.total_faturas_a_vencer, !showValues)}
                    </span>
                    <span className="text-[9px] text-neutral-500 block mt-0.5">
                      {metrics.alerta_descompasso.dias_ate_vencimento}d até o vencimento
                    </span>
                  </div>
                  <div className="bg-[#0b0105] border border-[#ff0055]/40 p-2.5">
                    <span className="text-[10px] text-neutral-400 block uppercase">Entradas até Vencimento:</span>
                    <span className="text-xl font-black text-[#ffe600]">
                      {formatCurrency(metrics.alerta_descompasso.entradas_antes_vencimento, !showValues)}
                    </span>
                    <span className="text-[9px] text-neutral-500 block mt-0.5">
                      Saldo em mãos + agendado
                    </span>
                  </div>
                  <div className="bg-[#0b0105] border border-[#ff0055]/40 p-2.5">
                    <span className="text-[10px] text-neutral-400 block uppercase">Próxima Entrada Prevista:</span>
                    <span className="text-sm font-bold text-neutral-200 block">
                      {metrics.alerta_descompasso.proxima_entrada_nome || 'Dinheiro'}: {metrics.alerta_descompasso.proxima_entrada_data ? `Dia ${metrics.alerta_descompasso.proxima_entrada_data.split('-')[2]}` : 'Após vencimento'}
                    </span>
                    <span className="text-[10px] text-[#ff0055] font-bold block mt-0.5">
                      {metrics.alerta_descompasso.dias_atraso_entrada ? `⚠️ ${metrics.alerta_descompasso.dias_atraso_entrada} dias APÓS a fatura vencer!` : 'Sem entrada antes da fatura'}
                    </span>
                  </div>
                </div>

                <div className="bg-[#24030d] border-l-2 border-[#ff0055] p-2.5 text-[11px] text-neutral-200 space-y-1">
                  <p className="font-bold text-[#ff4d79] leading-snug">
                    {metrics.alerta_descompasso.mensagem_alerta}
                  </p>
                  <p className="text-[10px] text-neutral-300 leading-snug">
                    💡 <strong className="text-white">Ação Preventiva:</strong> {metrics.alerta_descompasso.recomendacao}
                  </p>
                </div>

                {/* Bloco de Execução da Ponte da Rescisão com a Reserva */}
                {metrics.alerta_descompasso.plano_ponte && (
                  <div className="bg-[#120422] border-2 border-[#c084fc] p-3 text-xs space-y-2 mt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1.5 border-b border-[#c084fc]/40">
                      <span className="font-bold text-[#c084fc] flex items-center gap-1.5 uppercase text-[10px]">
                        <span>🛡️</span>
                        <span>PLANO EXECUTIVO: PONTE DA RESCISÃO (ZERO JUROS DE CARTÃO)</span>
                      </span>
                      <span className="text-[10px] text-[#00ff66] font-bold">
                        RESERVA DE R$ {formatCurrency(settings.reserva_emergencia, !showValues)} DISPONÍVEL
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-black/60 border border-[#00ff66]/50 p-2 space-y-1">
                        <span className="text-[9px] px-1.5 py-0.5 bg-[#00ff66] text-black font-black uppercase inline-block">
                          PASSO 1: DIA {metrics.alerta_descompasso.dia_vencimento} (VENCIMENTO)
                        </span>
                        <p className="text-neutral-200 leading-tight">
                          Pague <strong>{formatCurrency(metrics.alerta_descompasso.plano_ponte.valor_fatura, !showValues)}</strong> da fatura do cartão utilizando temporariamente a Reserva de Emergência.
                        </p>
                        <p className="text-[10px] text-[#00ff66] font-bold">
                          ✓ Evita juros rotativos de 450% a.a. e multa de atraso.
                        </p>
                      </div>

                      <div className="bg-black/60 border border-[#c084fc]/50 p-2 space-y-1">
                        <span className="text-[9px] px-1.5 py-0.5 bg-[#c084fc] text-black font-black uppercase inline-block">
                          PASSO 2: DIA {metrics.alerta_descompasso.plano_ponte.dia_recomposicao} (RESCISÃO)
                        </span>
                        <p className="text-neutral-200 leading-tight">
                          Ao cair a rescisão (~{formatCurrency(metrics.alerta_descompasso.plano_ponte.rescisao_estimada, !showValues)}), recomponha <strong>{formatCurrency(metrics.alerta_descompasso.plano_ponte.valor_fatura, !showValues)}</strong> na Reserva (retornando a R$ {formatCurrency(metrics.alerta_descompasso.plano_ponte.reserva_original, !showValues)}).
                        </p>
                        <p className="text-[10px] text-[#00f0ff] font-bold">
                          ✓ Saldo livre restante da rescisão: <strong>{formatCurrency(metrics.alerta_descompasso.plano_ponte.rescisao_restante, !showValues)}</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Top Metric Cards: Renda, Teto Móvel Diário, Saldo Livre */}
            <MetricCards 
              metrics={metrics} 
              settings={settings} 
              debts={debts} 
              expenses={expenses}
              selectedMonth={selectedMonth}
              showValues={showValues} 
            />

            {/* Atalho Rápido para a Tabela de Valores (Livro-Razão) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-[#02131d] border-2 border-[#00f0ff] shadow-xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2.5 h-2.5 bg-[#00ff66] animate-pulse" />
                <span className="text-xs font-black text-[#00f0ff] tracking-wider uppercase">
                  📋 TABELA DE VALORES: {expenses.length} GASTOS GRAVADOS NO BANCO
                </span>
                <span className="text-[11px] text-[#ffe600] font-mono font-bold">
                  (Fatura Novembro: {formatCurrency(cockpitReportData.cartaoRescisao, !showValues)} • Vencimento 23/11)
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('tabela-valores');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-3 py-1.5 bg-black border border-neutral-700 hover:border-[#00f0ff] text-[#e0f2fe] hover:text-[#00f0ff] text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  ↓ ROLAR ATÉ TABELA
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('table')}
                  className="px-3.5 py-1.5 bg-[#00f0ff] hover:bg-white text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-[#00f0ff]/20 active:scale-95"
                >
                  ⛶ ABRIR ABA DA TABELA
                </button>
              </div>
            </div>

            {/* Raw Input Terminal (NLP / Regex Parser) com suporte a CLEAR e RESET */}
            <RawInputTerminal
              inputVal={terminalInput}
              setInputVal={setTerminalInput}
              onRegisterExpense={handleRegisterExpense}
              onRequestFrictionCheck={handleFrictionCheck}
              expenses={expenses}
              onBatchRegister={(newExps) => handleImportBatchExpenses(newExps, selectedMonth)}
              temSaldoReal={metrics.tem_saldo_real}
              motivoSemSaldo={metrics.motivo_sem_saldo}
            />

            {/* Grid: Debt Management & Emergency Vault */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7">
                <DebtManager
                  debts={debts}
                  metrics={metrics}
                  onAmortize={handleAmortizeDebt}
                  onAddDebt={handleAddDebt}
                  showValues={showValues}
                />
              </div>
              <div className="lg:col-span-5">
                {/* Cofre de Emergência: constituído pela rescisão (a descobrir na sexta dia 30) */}
                <EmergencyVault
                  balance={globalRescisaoData.saldoRescisaoHoje}
                  valorOriginal={globalRescisaoData.valorRescisaoRecebida}
                  totalPixGasto={globalRescisaoData.totalPixRescisaoGasto}
                  faturaCartao={globalRescisaoData.totalCartaoFaturaNov}
                  saldoAposFatura={globalRescisaoData.saldoRescisaoAposFatura}
                  rescisaoPrevista={settings.rescisao_prevista}
                  onEmergencyWithdrawal={handleEmergencyWithdrawal}
                  onUpdateRescisao={handleUpdateRescisao}
                  showValues={showValues}
                />
              </div>
            </div>

            {/* Audit & Transaction Ledger com filtro por mês selecionado e modo tela cheia */}
            <div id="tabela-valores" className="scroll-mt-24">
              <AuditTable
                expenses={expenses}
                onDeleteExpense={handleDeleteExpense}
                selectedMonth={selectedMonth}
                showValues={showValues}
                isStealth={privacy.isStealth}
                onRestoreDefaults={handleRestoreDefaultExpenses}
                onOpenReport={() => setActiveTab('report')}
                onToggleVinculoRescisao={handleToggleVinculoRescisao}
              />
            </div>
          </div>
        )}

        {/* TAB 2: SIMULADOR DE IMPACTO */}
        {activeTab === 'simulator' && (
          <div className="animate-in fade-in duration-150">
            <SimulatorTab metrics={metrics} settings={settings} />
          </div>
        )}

        {/* TAB 3: CÓDIGO PYTHON & ARQUITETURA */}
        {activeTab === 'python_code' && (
          <div className="animate-in fade-in duration-150">
            <PythonCodeViewer />
          </div>
        )}

        {/* TAB 4: MANUAL DO NUDGE */}
        {activeTab === 'nudge_manual' && (
          <div className="animate-in fade-in duration-150">
            <NudgeManualTab />
          </div>
        )}

        {/* TAB 5: TABELA DE VALORES DEDICADA (LIVRO-RAZÃO) */}
        {activeTab === 'table' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-[#02131d] border-2 border-[#00f0ff] shadow-xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[#00ff66] animate-pulse" />
                  <span className="text-sm font-black text-[#00f0ff] uppercase tracking-wider">
                    📋 TABELA DE VALORES & AUDITORIA DE TRANSAÇÕES
                  </span>
                </div>
                <p className="text-xs text-neutral-300 mt-1">
                  Visualização dedicada do Livro-Razão com todas as despesas salvas ({expenses.length} lançamentos: Abbey, Uber, etc.).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('cockpit')}
                  className="px-3.5 py-1.5 bg-black hover:bg-neutral-900 border border-neutral-600 text-white text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  ← VOLTAR AO COCKPIT
                </button>
              </div>
            </div>

            <AuditTable
              expenses={expenses}
              onDeleteExpense={handleDeleteExpense}
              selectedMonth={selectedMonth}
              showValues={showValues}
              isStealth={privacy.isStealth}
              onRestoreDefaults={handleRestoreDefaultExpenses}
              onOpenReport={() => setActiveTab('report')}
              onToggleVinculoRescisao={handleToggleVinculoRescisao}
            />
          </div>
        )}

        {/* TAB 6: CENTRAL DE FECHAMENTO & RELATÓRIOS FINANCEIROS */}
        {activeTab === 'report' && (
          <div className="animate-in fade-in duration-150">
            <MonthlyReportView
              expenses={expenses}
              settings={settings}
              debts={debts}
              metrics={metrics}
              selectedMonth={selectedMonth}
              onSelectMonth={setSelectedMonth}
              availableMonths={availableMonths}
              showValues={showValues}
              isStealth={privacy.isStealth}
              onBackToCockpit={() => setActiveTab('cockpit')}
            />
          </div>
        )}
      </main>

      {/* Behavioral Friction Modal */}
      <FrictionModal
        expense={pendingFrictionExpense}
        metrics={metrics}
        settings={settings}
        onAbort={handleAbortFriction}
        onConfirm={handleConfirmFriction}
      />

      {/* Modal de Importação em Lote do Bloco de Notas */}
      <NoteBatchImporterModal
        isOpen={isNoteImporterOpen}
        onClose={() => setIsNoteImporterOpen(false)}
        onImportExpenses={handleImportBatchExpenses}
        currentSelectedMonth={selectedMonth}
      />

      {/* Terminal Lock Screen Overlay */}
      {isLocked && privacy.pinEnabled && privacy.pinHash && (
        <TerminalLockScreen
          pinHash={privacy.pinHash}
          onUnlock={handleUnlockTerminal}
          onPanicPurge={handlePanicPurge}
        />
      )}

      {/* Central de Proteção e Privacidade */}
      <PrivacyProtectionModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        privacy={privacy}
        onUpdatePrivacy={handleUpdatePrivacy}
        expenses={expenses}
        debts={debts}
        settings={settings}
        onRestoreAllData={handleRestoreAllData}
        onPanicPurge={handlePanicPurge}
        onLockTerminalNow={handleLockTerminalNow}
      />

      {/* Footer */}
      <footer className="border-t border-[#141b2e] bg-[#020306] py-3 text-center text-[10px] text-neutral-500 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-[#00f0ff]/70">// SISTEMA SENTINELA :: BANCO DE DADOS MÊS A MÊS & DUAS ESCALAS</span>
          <span className="text-neutral-600">SALÁRIO DIA 05 • RESCISÃO PREV. DIA 30 • MÊS ATIVO: {selectedMonth}</span>
        </div>
      </footer>
    </div>
  );
}
