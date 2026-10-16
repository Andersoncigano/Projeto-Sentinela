"""
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
    /* Estética Cyberpunk Terminal HUD */
    .stApp {
        background-color: #030407;
        color: #e0f2fe;
        font-family: 'JetBrains Mono', monospace;
    }
    .metric-card-normal {
        background: #040812;
        border: 1px solid #00f0ff;
        padding: 16px;
        box-shadow: 0 0 10px rgba(0, 240, 255, 0.2);
    }
    .metric-card-alert {
        background: #0f0e03;
        border: 2px solid #ffe600;
        padding: 16px;
        box-shadow: 0 0 10px rgba(255, 230, 0, 0.2);
    }
    .metric-card-critical {
        background: #140308;
        border: 2px solid #ff0055;
        padding: 16px;
        box-shadow: 0 0 15px rgba(255, 0, 85, 0.4);
    }
    .stButton>button {
        background-color: #00f0ff !important;
        color: #000000 !important;
        font-family: 'JetBrains Mono', monospace !important;
        font-weight: 800 !important;
        border: none !important;
        border-radius: 0px !important;
    }
    .stButton>button:hover {
        background-color: #00ff66 !important;
        color: #000000 !important;
        box-shadow: 0 0 10px #00ff66 !important;
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
    st.title("🛡️ SENTINELA")
    st.caption("Protocolo de Contenção Financeira PCD")
    st.divider()

    st.subheader("⚙️ Contexto Orçamentário")
    st.markdown(f"**Renda Mensal (PCD):** R$ {settings.renda_mensal:,.2f}")
    st.markdown(f"**Jornada de Trabalho:** {settings.horas_trabalho_mes:.0f}h / mês")
    st.markdown(f"**Valor da Sua Hora:** R$ {(settings.renda_mensal / settings.horas_trabalho_mes):.2f}/h")
    st.markdown(f"**Custos Fixos Essenciais:** R$ {settings.custos_fixos_essenciais:,.2f}")

    st.divider()

    # BLOQUEIO RADICAL DA RESERVA DE EMERGÊNCIA (R$ 1.400)
    st.subheader("🔒 Capital de Giro (Reserva)")
    st.markdown(f"### R$ {settings.reserva_emergencia:,.2f}")
    st.caption("⚠️ RESERVA BLINDADA: Dinheiro para sobrevivência extrema. Proibido para compras do dia a dia.")

    with st.expander("🚨 Solicitar Quebra de Lacre da Reserva"):
        st.error("AVISO DE SEGURANÇA: Mexer na reserva de R$ 1.400 destrói sua única proteção contra o despejo ou remédios de urgência.")
        motivo = st.text_input("Qual o motivo de extrema urgência médica/vida?")
        confirmacao = st.checkbox("Declaro que não é para delivery, jogos ou compras por impulso")
        if st.button("Executar Saque com Advertência Registrada", type="primary"):
            if motivo and confirmacao:
                st.warning("REGISTRO DE VIOLAÇÃO: Seu histórico foi marcado com esta retirada.")
            else:
                st.error("Preencha o motivo de risco real e confirme o termo.")

    st.divider()
    st.caption("Sentinela v2.4 - Nudge Theory Behavioral Core")


# CABEÇALHO E ALERTA PSICOLÓGICO
st.header("⚡ PAINEL DE CONTROLE DE TETO MÓVEL (DAILY BURN RATE)")

# Alerta Visual Dinâmico
if metrics.status_alerta == "COLAPSO":
    st.error("🚨 ESTADO DE COLAPSO: Seu saldo livre para o mês ACABOU! Qualquer gasto adicional gerará endividamento crítico ou confisco da comida.")
elif metrics.status_alerta == "CRITICO":
    st.error(f"⚠️ NÍVEL CRÍTICO: Seu teto diário despencou para R$ {metrics.teto_diario_atual:.2f}/dia! Você gastou mais do que devia.")
elif metrics.status_alerta == "ATENCAO":
    st.warning(f"⚡ ATENÇÃO REDOBRADA: Teto diário estreito (R$ {metrics.teto_diario_atual:.2f}/dia). Evite absolutamente qualquer Pix ou Cartão da Mãe.")
else:
    st.success(f"🟢 ESTADO ESTÁVEL: Teto diário atual em R$ {metrics.teto_diario_atual:.2f}/dia. Mantenha a disciplina.")


# MÉTRICAS PRINCIPAIS
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric(
        label="🎯 Teto Móvel Diário (Hoje)",
        value=f"R$ {metrics.teto_diario_atual:.2f}",
        delta=f"{(metrics.teto_diario_atual - metrics.teto_diario_ideal):.2f} vs Ideal",
        delta_color="normal",
    )
    st.caption(f"{metrics.dias_restantes} dias restantes no mês")

with col2:
    st.metric(
        label="💰 Saldo Livre Restante",
        value=f"R$ {metrics.saldo_restante:.2f}",
        delta=f"- R$ {metrics.total_gasto_mes:.2f} gastos",
        delta_color="inverse",
    )
    st.caption(f"De um total livre de R$ {metrics.saldo_disponivel_inicial:.2f}")

with col3:
    st.metric(
        label="🔥 Gastos Impulsivos",
        value=f"R$ {metrics.total_gasto_impulsivo:.2f}",
        delta=f"{metrics.horas_trabalhadas_perdidas:.1f}h de trabalho jogadas fora",
        delta_color="inverse",
    )
    st.caption("Lanches, jogos, ifood, supérfluos")

with col4:
    total_devedor_mae = sum(d.saldo_devedor for d in debts)
    st.metric(
        label="💳 Dívida Atual (Mãe/Terceiros)",
        value=f"R$ {total_devedor_mae:.2f}",
        delta=f"- R$ {metrics.amortizacao_obrigatoria:.2f}/mês retidos",
        delta_color="off",
    )
    st.caption("Amortização compulsória pré-teto")

st.divider()


# ABAS PRINCIPAIS: Registro Rápido, Simulação de Impacto, Dívidas e Histórico
tab_registro, tab_simulador, tab_dividas, tab_historico = st.tabs([
    "📥 Registro Rápido (Parser NLP / Regex)",
    "🧪 Simulador de Impacto Comportamental",
    "🤝 Gestão de Dívidas com Terceiros",
    "📊 Auditoria & Histórico de Gastos",
])


# ==========================================
# ABA 1: PARSER ROBUSTO (REGEX / STRING BRUTA)
# ==========================================
with tab_registro:
    st.subheader("Entrada Rápida por Comando / Linguagem Natural")
    st.write(
        "Digite a compra como você falaria no WhatsApp. Exemplos aceitos: "
        "`lanche 45 pix`, `20/10 pizza 60 cartao mae`, `uber 18.50`, `remedio 30 farmacia`"
    )

    raw_input = st.text_input(
        "Comando de Despesa:",
        placeholder="Ex: 20/10 lanche 45 pix",
        key="raw_expense_input",
    )

    if raw_input:
        parse_res = SentinelaParser.parse_raw_entry(raw_input)

        if not parse_res.success:
            st.error(f"❌ Erro de Validação: {parse_res.error_message}")
        else:
            rec = parse_res.record
            tokens = parse_res.tokens

            st.info("🔍 Objeto Estruturado pelo Parser Regex:")
            c_tok1, c_tok2, c_tok3, c_tok4, c_tok5 = st.columns(5)
            c_tok1.metric("Data", tokens["data"])
            c_tok2.metric("Descrição", tokens["descricao"])
            c_tok3.metric("Valor", f"R$ {tokens['valor']:.2f}")
            c_tok4.metric("Método", tokens["metodo"])
            c_tok5.metric("Impulsivo?", "SIM 🚨" if tokens["is_impulsive"] else "NÃO")

            # Avaliação de Fricção do Nudge Engine antes de salvar
            impact = SentinelaBurnEngine.simulate_expense_impact(metrics, rec.valor, rec.is_impulsive)
            nudge = BehavioralNudgeEngine.generate_friction_message(rec.descricao, rec.valor, impact, rec.metodo_pagamento)

            if rec.is_impulsive or rec.metodo_pagamento == "cartao_mae" or impact["horas_trabalho_equivalentes"] > 2.0:
                st.error(f"### {nudge['titulo']}")
                st.write(f"**{nudge['mensagem']}**")
                st.markdown(f"**Consequência:** {nudge['consequencia_imediata']}")

                st.warning("⏳ FRICÇÃO ATIVA: Espere 10 segundos antes de confirmar. Pergunte-se: Isso é mais importante que minha dignidade financeira?")
            
            # Botão de confirmação com validação
            col_btn1, col_btn2 = st.columns([1, 4])
            with col_btn1:
                if st.button("Confirmar e Gravar Despesa", type="primary"):
                    db.add_expense(rec)
                    st.success(f"✅ Gasto de R$ {rec.valor:.2f} registrado com sucesso!")
                    time.sleep(1)
                    st.rerun()


# ==========================================
# ABA 2: SIMULADOR DE IMPACTO COMPORTAMENTAL
# ==========================================
with tab_simulador:
    st.subheader("Calculadora de Custo Real em Vida")
    st.write("Antes de comprar algo supérfluo, veja a mutilação orçamentária que ela causará.")

    sim_valor = st.number_input("Valor que você quer gastar (R$):", min_value=1.0, max_value=850.0, value=35.0, step=5.0)
    sim_metodo = st.selectbox("Forma de Pagamento:", ["pix", "cartao_mae", "dinheiro", "cartao_proprio"])
    
    sim_impact = SentinelaBurnEngine.simulate_expense_impact(metrics, sim_valor)
    
    col_s1, col_s2, col_s3 = st.columns(3)
    col_s1.metric("Horas de Trabalho PCD Perdidas", f"{sim_impact['horas_trabalho_equivalentes']:.1f} horas")
    col_s2.metric("Novo Teto Diário Amanhã", f"R$ {sim_impact['novo_teto_diario']:.2f}/dia", delta=f"-R$ {sim_impact['reducao_teto_diario']:.2f}")
    col_s3.metric("Dias do Mês Canibalizados", f"{sim_impact['dias_de_teto_consumidos']:.1f} dias")

    if sim_metodo == "cartao_mae":
        st.error("🚨 LEMBRETE SEVERO: Usar o cartão da sua mãe gera constrangimento e compromete o salário do mês que vem!")


# ==========================================
# ABA 3: GESTÃO DE PASSIVOS (DÍVIDA MÃE)
# ==========================================
with tab_dividas:
    st.subheader("Cronograma de Amortização Compulsória de Dívidas")
    st.caption("Todo gasto supérfluo é proibido enquanto as parcelas acordadas com a mãe não forem honradas.")

    for debt in debts:
        pct_pago = (debt.valor_pago / debt.valor_total * 100) if debt.valor_total > 0 else 100.0
        with st.container():
            st.markdown(f"#### 💳 {debt.credor}")
            st.progress(min(1.0, pct_pago / 100.0))
            st.write(f"Pago: **R$ {debt.valor_pago:.2f}** de **R$ {debt.valor_total:.2f}** ({pct_pago:.1f}%) | Restante: **R$ {debt.saldo_devedor:.2f}**")
            st.write(f"Meta de amortização mensal: **R$ {debt.meta_amortizacao_mes:.2f}** (Já retida automaticamente do teto diário)")

            col_a1, col_a2 = st.columns([2, 1])
            with col_a1:
                amort_val = st.number_input(f"Abater valor da dívida #{debt.id}:", min_value=5.0, max_value=float(debt.saldo_devedor), value=min(50.0, float(debt.saldo_devedor)), key=f"amort_{debt.id}")
            with col_a2:
                if st.button(f"Registrar Pagamento à Mãe", key=f"btn_amort_{debt.id}"):
                    db.record_debt_amortization(debt.id, amort_val)
                    st.success("Pagamento registrado! Relação de confiança restaurada.")
                    time.sleep(1)
                    st.rerun()


# ==========================================
# ABA 4: AUDITORIA & HISTÓRICO
# ==========================================
with tab_historico:
    st.subheader("Auditoria Completa de Gastos")
    if not expenses:
        st.info("Nenhuma despesa cadastrada ainda. Utilize o Parser NLP na primeira aba.")
    else:
        df = pd.DataFrame([e.to_dict() for e in expenses])
        st.dataframe(
            df[["data", "descricao", "valor", "metodo_pagamento", "categoria", "is_impulsive"]],
            use_container_width=True,
        )
