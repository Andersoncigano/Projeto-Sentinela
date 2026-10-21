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

    def test_saldo_pix_real_regra_entrada(self):
        settings = SystemSettings(
            renda_mensal=850.0,
            custos_fixos_essenciais=650.0,
            meta_poupanca_minima=0.0,
        )
        # Antes do dia 05: saldo Pix e teto diário são R$ 0,00
        metrics_antes = SentinelaBurnEngine.calculate_metrics(settings, [], [], reference_date=date(2026, 11, 2))
        self.assertFalse(metrics_antes.tem_saldo_real)
        self.assertEqual(metrics_antes.saldo_restante, 0.0)
        self.assertEqual(metrics_antes.teto_diario_atual, 0.0)
        self.assertEqual(metrics_antes.aviso_sem_saldo, "Sem saldo: gastos vão para o cartão")

        # A partir do dia 05: salário entra e saldo fica disponível
        metrics_apos = SentinelaBurnEngine.calculate_metrics(settings, [], [], reference_date=date(2026, 11, 5))
        self.assertTrue(metrics_apos.tem_saldo_real)
        self.assertEqual(metrics_apos.saldo_restante, 200.0)
        self.assertGreater(metrics_apos.teto_diario_atual, 0.0)

    def test_cenario_real_fatura_outubro_paga_e_virada_dia_17(self):
        """
        Cenário real confirmado pelo usuário:
        - A bandeira virou no dia 17 de Outubro (dia_fechamento_cartao = 17)
        - Todos os gastos (Abbey R$ 63, Uber R$ 30.80, Uber R$ 30.00, Uber R$ 6.10 = R$ 129.90) foram feitos a partir de 17/10
        - Portanto, vencerão somente em 23 de Novembro (fatura_mes = '2026-11')
        - A fatura de Outubro JÁ ESTÁ PAGA pelo usuário (R$ 0,00 a vencer em 23/10)
        - A rescisão trabalhista está prevista para 30 de Outubro (24 dias antes de 23/11)
        - Resultado: NÃO HÁ DESCOMPASSO! O dinheiro entra com 24 dias de folga e sobra R$ 3.670,10.
        """
        settings = SystemSettings(
            renda_mensal=850.0,
            custos_fixos_essenciais=650.0,
            reserva_emergencia=1400.0,
            meta_poupanca_minima=0.0,
            dia_recebimento=5,
            dia_fechamento_cartao=17,
            dia_vencimento_cartao=23,
        )
        settings.fatura_outubro_paga = True

        class RescisaoMock:
            data_prevista = "2026-10-30"
            valor = 3800.0
            status = "aguardando_calculo"
        settings.rescisao_prevista = RescisaoMock()

        expenses = [
            ExpenseRecord(
                id=1,
                data="2026-10-18",
                descricao="Abbey Farinha Panco",
                valor=63.0,
                metodo_pagamento="cartao_credito",
                categoria="essencial",
                is_impulsive=False,
                vinculado_rescisao=True,
            ),
            ExpenseRecord(
                id=2,
                data="2026-10-18",
                descricao="Uber",
                valor=30.80,
                metodo_pagamento="cartao_credito",
                categoria="transporte",
                is_impulsive=False,
                vinculado_rescisao=True,
            ),
            ExpenseRecord(
                id=3,
                data="2026-10-21",
                descricao="Uber",
                valor=30.00,
                metodo_pagamento="cartao_credito",
                categoria="transporte",
                is_impulsive=False,
                vinculado_rescisao=True,
            ),
            ExpenseRecord(
                id=4,
                data="2026-10-17",
                descricao="Uber",
                valor=6.10,
                metodo_pagamento="cartao_credito",
                categoria="transporte",
                is_impulsive=False,
                vinculado_rescisao=True,
            ),
        ]

        metrics = SentinelaBurnEngine.calculate_metrics(
            settings, expenses, [], reference_date=date(2026, 10, 21)
        )

        alerta = metrics.alerta_descompasso
        self.assertIsNotNone(alerta)
        # Fatura de Outubro paga e compras pós-virada vencem em Novembro -> SEM DESCOMPASSO!
        self.assertFalse(alerta.tem_descompasso)
        self.assertEqual(alerta.total_faturas_a_vencer, 129.90)
        self.assertEqual(alerta.fatura_mes_alvo, "2026-11")
        self.assertEqual(alerta.fatura_outubro_status, "PAGA_QUITADA")
        self.assertEqual(alerta.dias_antecedencia_entrada, 24)  # 30/10 vs 23/11
        self.assertAlmostEqual(alerta.saldo_excedente_liquido, 3800.0 - 129.90, places=2)
        self.assertEqual(alerta.reserva_emergencia_disponivel, 1400.0)
        self.assertIn("FLUXO TRANQUILO", alerta.mensagem_alerta)
        self.assertIn("Sem risco de juros", alerta.recomendacao)

    def test_aviso_descompasso_quando_fatura_anterior_nao_paga(self):
        """
        Testa o caso em que uma despesa ocorreu ANTES da virada (ex: 10/10) e a fatura não foi paga.
        Nesse caso, a fatura vence em 23/10 e o dinheiro só entra em 30/10 -> Alerta deve soar!
        """
        settings = SystemSettings(
            renda_mensal=850.0,
            custos_fixos_essenciais=650.0,
            meta_poupanca_minima=0.0,
            dia_recebimento=5,
            dia_fechamento_cartao=17,
            dia_vencimento_cartao=23,
        )
        settings.fatura_outubro_paga = False  # Fatura não paga

        class RescisaoMock:
            data_prevista = "2026-10-30"
            valor = 3800.0
            status = "aguardando_calculo"
        settings.rescisao_prevista = RescisaoMock()

        expenses = [
            ExpenseRecord(
                id=1,
                data="2026-10-10",  # Antes da virada do dia 17!
                descricao="Supermercado",
                valor=100.0,
                metodo_pagamento="cartao_credito",
                categoria="essencial",
                is_impulsive=False,
            ),
        ]

        metrics = SentinelaBurnEngine.calculate_metrics(
            settings, expenses, [], reference_date=date(2026, 10, 21)
        )

        alerta = metrics.alerta_descompasso
        self.assertIsNotNone(alerta)
        self.assertTrue(alerta.tem_descompasso)
        self.assertEqual(alerta.total_faturas_a_vencer, 100.0)
        self.assertEqual(alerta.dia_vencimento, 23)
        self.assertEqual(alerta.dias_atraso_entrada, 7)
        self.assertIn("ultrapassa as entradas", alerta.mensagem_alerta)


if __name__ == "__main__":
    unittest.main()

