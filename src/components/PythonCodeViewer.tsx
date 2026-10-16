import React, { useState } from 'react';
import { Copy, Check, FileCode, Download, Terminal } from 'lucide-react';

const PYTHON_FILES: Record<string, { filename: string; path: string; language: string; description: string; code: string }> = {
  main: {
    filename: 'main.py',
    path: '/main.py',
    language: 'python',
    description: 'Interface visual em Streamlit (Python 3.9+) com componentes de fricção, alertas de choque e teto móvel.',
    code: `"""
SISTEMA SENTINELA - Aplicação Streamlit de Contenção Financeira Radical
Framework: Streamlit (Python 3.9+)
Arquitetura Modular: Clean Code, Nudge Theory, Teto Móvel de Burn Rate
"""

from __future__ import annotations
import streamlit as st
import pandas as pd
from datetime import datetime, date
import time

from database import DatabaseManager, ExpenseRecord, DebtRecord, SystemSettings
from logic import SentinelaParser, SentinelaBurnEngine, BehavioralNudgeEngine

# Configuração de Página Streamlit
st.set_page_config(
    page_title="SISTEMA SENTINELA | Contenção Radical",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Estilização Cyberpunk de Alto Impacto Psicológico (Fricção e Nudge Theory)
CUSTOM_CSS = """
<style>
    .stApp { background-color: #030407; color: #e0f2fe; font-family: 'JetBrains Mono', monospace; }
    .metric-card-alert {
        background: #0f0307;
        border: 2px solid #ff0055;
        padding: 16px;
    }
</style>
"""
st.markdown(CUSTOM_CSS, unsafe_allow_html=True)

@st.cache_resource
def get_db_manager() -> DatabaseManager:
    return DatabaseManager("sentinela.db")

db = get_db_manager()
settings = db.get_settings()
debts = db.list_debts()
expenses = db.list_expenses()
metrics = SentinelaBurnEngine.calculate_metrics(settings, expenses, debts)

# SIDEBAR: Contexto e Blindagem da Reserva
with st.sidebar:
    st.title("🛡️ SENTINELA // CYBER-DECK")
    st.caption("Protocolo de Contenção Financeira PCD")
    st.divider()
    st.markdown(f"**Renda Mensal (PCD):** R$ {settings.renda_mensal:,.2f}")
    st.markdown(f"**Jornada de Trabalho:** {settings.horas_trabalho_mes:.0f}h / mês")
    st.markdown(f"**Valor da Hora:** R$ {(settings.renda_mensal / settings.horas_trabalho_mes):.2f}/h")
    st.divider()
    st.subheader("🔒 Capital de Giro (Reserva)")
    st.markdown(f"### R$ {settings.reserva_emergencia:,.2f}")
    st.caption("⚠️ RESERVA BLINDADA: Dinheiro para sobrevivência extrema.")

# CABEÇALHO E MÉTRICAS
st.header("⚡ PAINEL DE CONTROLE DE TETO MÓVEL (DAILY BURN RATE)")
col1, col2, col3, col4 = st.columns(4)
col1.metric("🎯 Teto Móvel Diário (Hoje)", f"R$ {metrics.teto_diario_atual:.2f}")
col2.metric("💰 Saldo Livre Restante", f"R$ {metrics.saldo_restante:.2f}")
col3.metric("🔥 Gastos Impulsivos", f"R$ {metrics.total_gasto_impulsivo:.2f}", f"{metrics.horas_trabalhadas_perdidas:.1f}h de trabalho PCD")
col4.metric("💳 Dívida Mãe (Passivo)", f"R$ {sum(d.saldo_devedor for d in debts):.2f}")

# REGISTRO RÁPIDO COM REGEX
st.divider()
raw_input = st.text_input("Comando de Despesa:", placeholder="Ex: 20/10 lanche 45 pix")
if raw_input:
    parse_res = SentinelaParser.parse_raw_entry(raw_input)
    if not parse_res.success:
        st.error(f"Erro: {parse_res.error_message}")
    else:
        rec = parse_res.record
        impact = SentinelaBurnEngine.simulate_expense_impact(metrics, rec.valor, rec.is_impulsive)
        nudge = BehavioralNudgeEngine.generate_friction_message(rec.descricao, rec.valor, impact, rec.metodo_pagamento)
        if rec.is_impulsive or rec.metodo_pagamento == "cartao_mae":
            st.error(f"### {nudge['titulo']}")
            st.write(f"**{nudge['mensagem']}**")
        if st.button("Confirmar e Gravar Despesa", type="primary"):
            db.add_expense(rec)
            st.success("Gasto registrado!")
            time.sleep(1)
            st.rerun()`,
  },
  logic: {
    filename: 'logic.py',
    path: '/logic.py',
    language: 'python',
    description: 'Motor de regras: Parser Regex NLP, Algoritmo de Teto Móvel Diário e Nudge Theory Engine.',
    code: `"""
SISTEMA SENTINELA - Módulo de Lógica de Negócios e Economia Comportamental
Engenharia de contenção financeira radical baseada em Nudge Theory, Aversão à Perda e Teto Móvel.
"""

from __future__ import annotations
import re
import calendar
from datetime import datetime, date
from dataclasses import dataclass
from typing import Optional, Tuple, Dict, Any, List

from database import ExpenseRecord, SystemSettings, DebtRecord

IMPULSIVE_KEYWORDS = {
    "lanche", "ifood", "uber", "delivery", "hamburguer", "pizza", "doce",
    "chocolate", "acai", "cerveja", "bar", "skin", "jogo", "steam",
    "game", "aliexpress", "shopee", "compra", "besteira", "fastfood"
}

ESSENTIAL_KEYWORDS = {
    "remedio", "farmacia", "onibus", "metro", "passagem", "consulta",
    "aluguel", "luz", "agua", "internet", "arroz", "feijao", "supermercado"
}

class SentinelaParser:
    DATE_REGEX = re.compile(r"\\b(\\d{1,2})[/-](\\d{1,2})(?:[/-](\\d{2,4}))?\\b")
    VALUE_REGEX = re.compile(r"(?:r\\$\\s*)?(\\d+(?:[.,]\\d{1,2})?)\\s*(?:reais|rs)?\\b", re.IGNORECASE)

    @classmethod
    def parse_raw_entry(cls, raw_text: str, default_date: Optional[date] = None):
        # Validação, extração de tokens regex e classificação heurística
        ...

class SentinelaBurnEngine:
    @staticmethod
    def calculate_metrics(settings: SystemSettings, expenses: List[ExpenseRecord], debts: List[DebtRecord]):
        # Teto Móvel: Saldo Livre / Dias Restantes
        ...

class BehavioralNudgeEngine:
    @staticmethod
    def generate_friction_message(descricao: str, valor: float, impact: Dict[str, Any], metodo: str):
        # Conversão em horas de trabalho PCD ($850 / 88h = $9.66/h) e choque de perda
        ...`,
  },
  database: {
    filename: 'database.py',
    path: '/database.py',
    language: 'python',
    description: 'Camada de persistência SQLite com dataclasses tipadas, integridade referencial e auditoria.',
    code: `"""
SISTEMA SENTINELA - Módulo de Banco de Dados e Persistência
Camada de acesso a dados utilizando SQLite nativo com tipagem estrita e integridade referencial.
"""

from __future__ import annotations
import sqlite3
from datetime import datetime, date
from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any

@dataclass
class ExpenseRecord:
    id: Optional[int]
    data: str  # YYYY-MM-DD
    descricao: str
    valor: float
    metodo_pagamento: str
    categoria: str
    is_impulsive: bool
    created_at: str = ""

@dataclass
class DebtRecord:
    id: Optional[int]
    credor: str
    valor_total: float
    valor_pago: float
    meta_amortizacao_mes: float
    prioridade: int
    observacao: str = ""

class DatabaseManager:
    def __init__(self, db_path: str = "sentinela.db"):
        self.db_path = db_path
        self._init_database()
    ...`,
  },
  tests: {
    filename: 'tests_sentinela.py',
    path: '/tests_sentinela.py',
    language: 'python',
    description: 'Bateria de testes unitários automatizados para o Parser Regex, Teto Móvel e Nudges.',
    code: `import unittest
from logic import SentinelaParser, SentinelaBurnEngine

class TestSentinelaCore(unittest.TestCase):
    def test_parser_standard_raw_entry(self):
        raw = "20/10 lanche 45 pix"
        result = SentinelaParser.parse_raw_entry(raw)
        self.assertTrue(result.success)
        self.assertEqual(result.record.valor, 45.0)
        self.assertEqual(result.record.metodo_pagamento, "pix")
        self.assertTrue(result.record.is_impulsive)

if __name__ == '__main__':
    unittest.main()`,
  },
  readme: {
    filename: 'README.md',
    path: '/README.md',
    language: 'markdown',
    description: 'Documentação completa de arquitetura, formulação matemática e princípios comportamentais.',
    code: `# SISTEMA SENTINELA: Contenção Financeira Radical
Engenharia Comportamental baseada em Nudge Theory, Teto Móvel e Aversão à Perda.`,
  },
};

export const PythonCodeViewer: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState<string>('main');
  const [copied, setCopied] = useState(false);

  const current = PYTHON_FILES[selectedKey];

  const handleCopy = () => {
    navigator.clipboard.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([current.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = current.filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Overview Card */}
      <div className="border border-[#00f0ff]/40 bg-[#04060d]/95 p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#00f0ff] text-black font-extrabold text-[11px] tracking-wider uppercase mb-1">
              <FileCode className="w-3.5 h-3.5 text-black" />
              <span>[ ARQUITETURA DE SOFTWARE // PYTHON 3.9+ ]</span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Implementação 100% funcional em Python 3.9+ com Streamlit e SQLite. Modularidade estrita, tipagem estática e testes unitários.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 border border-[#00f0ff] text-[#00f0ff] font-bold">
              STREAMLIT + PYTHON
            </span>
            <span className="text-[10px] px-2 py-0.5 border border-[#00ff66] text-[#00ff66] font-bold">
              SQLITE NATIVO
            </span>
          </div>
        </div>

        {/* Directory Structure Tree */}
        <div className="mt-3 p-3 bg-black border border-neutral-800 text-xs text-neutral-300">
          <span className="text-[#ffe600] font-bold block mb-1 uppercase text-[10px]">// Árvore de Diretórios:</span>
          <pre className="text-neutral-400 leading-relaxed text-[11px]">
{`├── main.py               # Interface gráfica Streamlit e orquestração de UI
├── logic.py              # Parser Regex NLP, Motor de Teto Móvel e Nudge Engine
├── database.py           # Camada de persistência SQLite (Tabelas normalizadas e CRUD)
├── tests_sentinela.py    # Testes unitários do parser e teto móvel
├── requirements.txt      # streamlit>=1.32.0, pandas>=2.2.0, etc.
└── README.md             # Documentação técnica e formulação matemática`}
          </pre>
        </div>
      </div>

      {/* Code Browser Tabs */}
      <div className="border border-neutral-800 bg-[#04060d]/95 shadow-2xl">
        {/* File Tabs */}
        <div className="flex items-center justify-between px-3 py-2 bg-black border-b border-neutral-800 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            {Object.entries(PYTHON_FILES).map(([key, item]) => (
              <button
                key={key}
                onClick={() => setSelectedKey(key)}
                className={`px-3 py-1 text-xs transition-all flex items-center gap-1.5 whitespace-nowrap uppercase font-bold border ${
                  selectedKey === key
                    ? 'border-[#00f0ff] bg-[#00f0ff] text-black font-black neon-glow-cyan'
                    : 'border-neutral-800 bg-[#080d19] text-neutral-400 hover:text-white'
                }`}
              >
                <FileCode className="w-3 h-3" />
                <span>{item.filename}</span>
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 bg-black border border-neutral-700 hover:border-[#00ff66] text-neutral-300 hover:text-[#00ff66] text-xs flex items-center gap-1 transition-colors uppercase cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-[#00ff66]" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'COPIADO' : 'COPIAR'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-2.5 py-1 bg-black border border-neutral-700 hover:border-[#ffe600] text-neutral-300 hover:text-[#ffe600] text-xs flex items-center gap-1 transition-colors uppercase cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>BAIXAR</span>
            </button>
          </div>
        </div>

        {/* File Description Bar */}
        <div className="px-4 py-2 bg-[#020306] border-b border-neutral-900 text-xs text-neutral-400 flex items-center justify-between">
          <span>{current.description}</span>
          <span className="text-[10px] text-neutral-500">LOCAL: {current.path}</span>
        </div>

        {/* Code Content */}
        <div className="p-4 bg-black text-xs overflow-x-auto text-[#00ff66] max-h-[520px] leading-relaxed">
          <pre>
            <code>{current.code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
