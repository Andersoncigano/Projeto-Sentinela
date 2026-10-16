"""
Testes Unitários Automatizados para o Sistema Sentinela
Utiliza unittest da biblioteca padrão do Python para execução nativa sem dependências externas.
"""

from datetime import date
import unittest
from database import SystemSettings, DebtRecord, ExpenseRecord
from logic import SentinelaParser, SentinelaBurnEngine, BehavioralNudgeEngine


class TestSentinelaCore(unittest.TestCase):

    def test_parser_standard_raw_entry(self):
        raw = "20/10 lanche 45 pix"
        result = SentinelaParser.parse_raw_entry(raw)
        self.assertTrue(result.success)
        self.assertIsNotNone(result.record)
        self.assertEqual(result.record.valor, 45.0)
        self.assertEqual(result.record.metodo_pagamento, "pix")
        self.assertIn("Lanche", result.record.descricao)
        self.assertTrue(result.record.is_impulsive)

    def test_parser_cartao_mae_and_decimal(self):
        raw = "uber 18.50 cartao mae"
        result = SentinelaParser.parse_raw_entry(raw)
        self.assertTrue(result.success)
        self.assertEqual(result.record.valor, 18.50)
        self.assertEqual(result.record.metodo_pagamento, "cartao_mae")
        self.assertTrue(result.record.is_impulsive)

    def test_parser_essential_expense(self):
        raw = "remedio farmacia 32.00 dinheiro"
        result = SentinelaParser.parse_raw_entry(raw)
        self.assertTrue(result.success)
        self.assertEqual(result.record.valor, 32.00)
        self.assertEqual(result.record.categoria, "essencial")
        self.assertFalse(result.record.is_impulsive)

    def test_moving_ceiling_and_debt_prioritization(self):
        settings = SystemSettings(
            renda_mensal=850.0,
            reserva_emergencia=1400.0,
            horas_trabalho_mes=88.0,
            custos_fixos_essenciais=250.0,
            meta_poupanca_minima=50.0,
        )
        debts = [
            DebtRecord(
                id=1,
                credor="Mãe",
                valor_total=300.0,
                valor_pago=100.0,
                meta_amortizacao_mes=100.0,
                prioridade=1,
            )
        ]
        metrics = SentinelaBurnEngine.calculate_metrics(settings, [], debts, reference_date=date(2026, 10, 1))
        # Saldo Inicial = 850 - 250 - 100 - 50 = R$ 450,00
        self.assertEqual(metrics.saldo_disponivel_inicial, 450.0)
        self.assertEqual(metrics.amortizacao_obrigatoria, 100.0)
        self.assertEqual(metrics.dias_totais_mes, 31)

    def test_nudge_engine_labor_hours(self):
        impact = {
            "horas_trabalho_equivalentes": 4.96,
            "dias_de_teto_consumidos": 2.2,
            "novo_teto_diario": 12.50,
        }
        nudge = BehavioralNudgeEngine.generate_friction_message("Lanche iFood", 48.0, impact, "cartao_mae")
        self.assertEqual(nudge["nivel"], "CRITICO")
        self.assertIn("CARTÃO DA SUA MÃE", nudge["mensagem"])
        self.assertIn("HORAS", nudge["mensagem"])


if __name__ == "__main__":
    unittest.main()
