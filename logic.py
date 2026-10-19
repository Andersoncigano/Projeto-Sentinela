"""
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


# Dicionário de palavras-chave para heurística de gastos impulsivos
IMPULSIVE_KEYWORDS = {
    "lanche", "ifood", "uber", "delivery", "hamburguer", "pizza", "doce",
    "chocolate", "acai", "cerveja", "bar", "skin", "jogo", "steam",
    "game", "aliexpress", "shopee", "compra", "besteira", "fastfood",
    "mcdonalds", "burger", "uber eats", "snack", "refrigerante", "balada"
}

ESSENTIAL_KEYWORDS = {
    "remedio", "farmacia", "onibus", "metro", "passagem", "consulta",
    "aluguel", "luz", "agua", "internet", "arroz", "feijao", "supermercado",
    "mercado", "leite", "pao", "frango", "ovo", "gas", "medico"
}

PAYMENT_METHOD_ALIASES = {
    "pix rescisao": "pix_rescisao",
    "pix rescisão": "pix_rescisao",
    "rescisao": "pix_rescisao",
    "rescisão": "pix_rescisao",
    "pix": "pix",
    "px": "pix",
    "cartao mae": "cartao_mae",
    "cartão mãe": "cartao_mae",
    "cartao da mae": "cartao_mae",
    "mae": "cartao_mae",
    "mãe": "cartao_mae",
    "cartao": "cartao_proprio",
    "cartão": "cartao_proprio",
    "credito": "cartao_proprio",
    "crédito": "cartao_proprio",
    "debito": "debito",
    "débito": "debito",
    "dinheiro": "dinheiro",
    "cash": "dinheiro",
    "especie": "dinheiro",
    "espécie": "dinheiro",
}


@dataclass
class ParseResult:
    success: bool
    record: Optional[ExpenseRecord] = None
    error_message: Optional[str] = None
    tokens: Optional[Dict[str, Any]] = None


@dataclass
class BurnRateMetrics:
    dias_totais_mes: int
    dia_atual: int
    dias_restantes: int
    renda_mensal: float
    custos_fixos: float
    amortizacao_obrigatoria: float
    saldo_disponivel_inicial: float
    total_gasto_mes: float
    total_gasto_impulsivo: float
    saldo_restante: float
    teto_diario_atual: float
    teto_diario_ideal: float
    status_alerta: str  # 'NORMAL', 'ATENCAO', 'CRITICO', 'COLAPSO'
    horas_trabalhadas_perdidas: float
    burn_rate_percent: float


class SentinelaParser:
    """Parser robusto para strings brutas de despesas em linguagem natural."""

    # Expressões regulares para extração
    DATE_REGEX = re.compile(r"\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b")
    VALUE_REGEX = re.compile(r"(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais|rs)?\b", re.IGNORECASE)

    @classmethod
    def parse_raw_entry(cls, raw_text: str, default_date: Optional[date] = None) -> ParseResult:
        """
        Analisa uma entrada em texto bruto como:
        '20/10 lanche 45 pix' ou 'uber 18.50 cartao mae' ou '45 lanche'
        Retorna ParseResult com objeto estruturado.
        """
        if not raw_text or not raw_text.strip():
            return ParseResult(success=False, error_message="Entrada vazia. Digite algo como 'lanche 45 pix'.")

        text = raw_text.strip().lower()
        now = default_date or date.today()
        extracted_date = now.strftime("%Y-%m-%d")
        extracted_value = None
        extracted_method = "pix"
        is_impulsive = False

        # 1. Extração de Data
        date_match = cls.DATE_REGEX.search(text)
        if date_match:
            day = int(date_match.group(1))
            month = int(date_match.group(2))
            year = int(date_match.group(3)) if date_match.group(3) else now.year
            if year < 100:
                year += 2000
            try:
                dt = date(year, month, day)
                extracted_date = dt.strftime("%Y-%m-%d")
                text = cls.DATE_REGEX.sub("", text, count=1).strip()
            except ValueError:
                return ParseResult(success=False, error_message=f"Data inválida: {day}/{month}/{year}")

        # 2. Extração de Método de Pagamento
        for alias, normalized in sorted(PAYMENT_METHOD_ALIASES.items(), key=lambda x: -len(x[0])):
            pattern = r"\b" + re.escape(alias) + r"\b"
            if re.search(pattern, text):
                extracted_method = normalized
                text = re.sub(pattern, "", text, count=1).strip()
                break

        # 3. Extração de Valor Monetário
        # Procura por números decimais ou inteiros
        val_matches = list(cls.VALUE_REGEX.finditer(text))
        if not val_matches:
            return ParseResult(success=False, error_message="Valor não identificado. Informe o valor ex: 'lanche 45 pix'.")

        # Seleciona o melhor match de valor
        selected_match = val_matches[-1]
        val_str = selected_match.group(1).replace(",", ".")
        try:
            extracted_value = float(val_str)
            if extracted_value <= 0:
                return ParseResult(success=False, error_message="O valor do gasto deve ser maior que zero.")
        except ValueError:
            return ParseResult(success=False, error_message=f"Valor numérico inválido: {val_str}")

        # Remove o valor do texto para sobrar a descrição
        start, end = selected_match.span()
        text = (text[:start] + " " + text[end:]).strip()

        # Limpeza da Descrição
        cleaned_description = re.sub(r"\s+", " ", text).strip()
        if not cleaned_description:
            cleaned_description = "Gasto não especificado"

        # 4. Detecção de Categoria e Impulsividade
        words = set(re.findall(r"\b\w+\b", cleaned_description))
        
        # Flag explícita
        if "impulsivo" in words or "besteira" in words or "supérfluo" in words:
            is_impulsive = True
            category = "impulsivo"
        elif any(w in IMPULSIVE_KEYWORDS for w in words):
            is_impulsive = True
            category = "alimentacao_impulsiva" if any(w in {"lanche", "ifood", "pizza", "doce"} for w in words) else "lazer_impulsivo"
        elif any(w in ESSENTIAL_KEYWORDS for w in words):
            is_impulsive = False
            category = "essencial"
        else:
            category = "outros"

        # Se usou o cartão da mãe sem ser essencial, aumenta a probabilidade de alerta
        if extracted_method == "cartao_mae" and category != "essencial":
            is_impulsive = True

        record = ExpenseRecord(
            id=None,
            data=extracted_date,
            descricao=cleaned_description.capitalize(),
            valor=extracted_value,
            metodo_pagamento=extracted_method,
            categoria=category,
            is_impulsive=is_impulsive,
        )

        tokens = {
            "data": extracted_date,
            "descricao": record.descricao,
            "valor": extracted_value,
            "metodo": extracted_method,
            "categoria": category,
            "is_impulsive": is_impulsive,
        }

        return ParseResult(success=True, record=record, tokens=tokens)


class SentinelaBurnEngine:
    """Motor matemático de cálculo do Teto Móvel e Daily Burn Rate."""

    @staticmethod
    def calculate_metrics(
        settings: SystemSettings,
        expenses: List[ExpenseRecord],
        debts: List[DebtRecord],
        reference_date: Optional[date] = None,
    ) -> BurnRateMetrics:
        ref = reference_date or date.today()
        year = ref.year
        month = ref.month
        _, num_days = calendar.monthrange(year, month)
        current_day = ref.day
        days_remaining = max(1, num_days - current_day + 1)

        # 1. Totalização das Amortizações Obrigatórias do Mês
        # Todo mês, a meta de amortização das dívidas é retida COMPULSORIAMENTE
        amortizacao_total_mes = sum(d.meta_amortizacao_mes for d in debts if d.saldo_devedor > 0)

        # 2. Saldo Discricionário Inicial (Orçamento de Guerra)
        # Renda (850) - Fixos (250) - Amortização Dívida Mãe (100) - Reserva Mínima (50) = R$ 450
        saldo_inicial = max(
            0.0,
            settings.renda_mensal
            - settings.custos_fixos_essenciais
            - amortizacao_total_mes
            - settings.meta_poupanca_minima
        )

        # 3. Gastos no mês atual
        mes_str = f"{year:04d}-{month:02d}"
        gastos_mes = [e for e in expenses if e.data.startswith(mes_str)]
        total_gasto = sum(e.valor for e in gastos_mes)
        total_impulsivo = sum(e.valor for e in gastos_mes if e.is_impulsive)

        saldo_restante = max(0.0, saldo_inicial - total_gasto)

        # Teto Móvel Diário
        teto_diario_atual = saldo_restante / days_remaining
        teto_diario_ideal = saldo_inicial / num_days

        # Classificação de Risco Psicológico (Nudge Theory / Alert Levels)
        burn_percent = (total_gasto / saldo_inicial * 100) if saldo_inicial > 0 else 100.0

        if saldo_restante <= 0:
            status_alerta = "COLAPSO"
        elif teto_diario_atual < (teto_diario_ideal * 0.4):
            status_alerta = "CRITICO"
        elif teto_diario_atual < (teto_diario_ideal * 0.75) or total_impulsivo > (saldo_inicial * 0.3):
            status_alerta = "ATENCAO"
        else:
            status_alerta = "NORMAL"

        # Cálculo de Custo em Horas de Trabalho PCD
        # R$ 850 / 88h = ~R$ 9.66/hora
        valor_hora = settings.renda_mensal / max(1.0, settings.horas_trabalho_mes)
        horas_perdidas = total_impulsivo / valor_hora

        return BurnRateMetrics(
            dias_totais_mes=num_days,
            dia_atual=current_day,
            dias_restantes=days_remaining,
            renda_mensal=settings.renda_mensal,
            custos_fixos=settings.custos_fixos_essenciais,
            amortizacao_obrigatoria=amortizacao_total_mes,
            saldo_disponivel_inicial=saldo_inicial,
            total_gasto_mes=total_gasto,
            total_gasto_impulsivo=total_impulsivo,
            saldo_restante=saldo_restante,
            teto_diario_atual=teto_diario_atual,
            teto_diario_ideal=teto_diario_ideal,
            status_alerta=status_alerta,
            horas_trabalhadas_perdidas=horas_perdidas,
            burn_rate_percent=burn_percent,
        )

    @staticmethod
    def simulate_expense_impact(
        metrics: BurnRateMetrics,
        valor_gasto: float,
        is_impulsive: bool = False,
    ) -> Dict[str, Any]:
        """Calcula a penalidade instantânea sobre os dias seguintes."""
        novo_saldo = max(0.0, metrics.saldo_restante - valor_gasto)
        novo_teto = novo_saldo / metrics.dias_restantes if metrics.dias_restantes > 0 else 0.0
        reducao_teto_diario = max(0.0, metrics.teto_diario_atual - novo_teto)

        # Horas de trabalho que essa compra custa
        valor_hora = metrics.renda_mensal / 88.0
        horas_compra = valor_gasto / valor_hora

        # Impacto no cartão da mãe
        impacto_risco = "ALTO" if valor_gasto > (metrics.teto_diario_atual * 1.5) else "MEDIO"

        return {
            "novo_saldo": novo_saldo,
            "novo_teto_diario": novo_teto,
            "reducao_teto_diario": reducao_teto_diario,
            "horas_trabalho_equivalentes": horas_compra,
            "dias_de_teto_consumidos": (valor_gasto / metrics.teto_diario_atual) if metrics.teto_diario_atual > 0 else 999,
            "impacto_risco": impacto_risco,
        }


class BehavioralNudgeEngine:
    """Gera mensagens de fricção psicológica, choque de realidade e Nudge Theory."""

    @staticmethod
    def generate_friction_message(
        descricao: str,
        valor: float,
        impact: Dict[str, Any],
        metodo: str,
    ) -> Dict[str, str]:
        horas = impact["horas_trabalho_equivalentes"]
        dias_teto = impact["dias_de_teto_consumidos"]
        novo_teto = impact["novo_teto_diario"]

        avisos = []
        if metodo == "cartao_mae":
            avisos.append("ATENÇÃO: Você está usando o CARTÃO DA SUA MÃE. Isso não é dinheiro grátis, é endividamento familiar e dependência financeira!")

        if horas >= 4.0:
            avisos.append(f"CHOQUE DE TEMPO: Gastar R$ {valor:.2f} em '{descricao}' equivale a {horas:.1f} HORAS inteiras do seu turno PCD em pé!")
        elif horas >= 1.0:
            avisos.append(f"EQUIVALÊNCIA: Esse gasto de R$ {valor:.2f} consome {horas:.1f} horas de trabalho.")

        if dias_teto > 1.2:
            avisos.append(f"PUNIÇÃO DE TETO: Esse único gasto canibaliza {dias_teto:.1f} DIAS do seu orçamento. Seu limite diário despencará para R$ {novo_teto:.2f}/dia!")

        nivel = "CRITICO" if (horas >= 4.0 or metodo == "cartao_mae" or dias_teto > 1.5) else "AVISO"

        return {
            "nivel": nivel,
            "titulo": "🛑 SENTINELA ATIVADO: BARREIRA DE FRICÇÃO PSICOLÓGICA",
            "mensagem": " | ".join(avisos) if avisos else f"Gasto registrado. Novo teto diário: R$ {novo_teto:.2f}/dia.",
            "consequencia_imediata": f"Amanhã você terá apenas R$ {novo_teto:.2f} para passar o dia inteiro.",
        }
