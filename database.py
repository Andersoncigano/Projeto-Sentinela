"""
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
    metodo_pagamento: str  # 'pix', 'cartao_mae', 'dinheiro', 'outro'
    categoria: str  # 'alimentacao', 'transporte', 'saude', 'impulsivo', 'essencial'
    is_impulsive: bool
    created_at: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class DebtRecord:
    id: Optional[int]
    credor: str  # ex: 'Mãe - Fatura Cartão'
    valor_total: float
    valor_pago: float
    meta_amortizacao_mes: float
    prioridade: int  # 1 (Mais alta) a 5
    observacao: str = ""

    @property
    def saldo_devedor(self) -> float:
        return max(0.0, self.valor_total - self.valor_pago)


@dataclass
class SystemSettings:
    renda_mensal: float = 850.00
    reserva_emergencia: float = 1400.00
    horas_trabalho_mes: float = 88.0  # PCD Meio Período (~4h/dia * 22 dias)
    custos_fixos_essenciais: float = 250.00
    meta_poupanca_minima: float = 50.00


class DatabaseManager:
    """Gerencia conexões e operações CRUD seguras no SQLite."""

    def __init__(self, db_path: str = "sentinela.db"):
        self.db_path = db_path
        self._init_database()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def _init_database(self) -> None:
        """Cria as tabelas necessárias com schemas normalizados."""
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # Tabela de Despesas
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS despesas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    data TEXT NOT NULL,
                    descricao TEXT NOT NULL,
                    valor REAL NOT NULL CHECK(valor > 0),
                    metodo_pagamento TEXT NOT NULL,
                    categoria TEXT NOT NULL,
                    is_impulsive INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # Tabela de Passivos / Dívidas de Terceiros
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS dividas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    credor TEXT NOT NULL,
                    valor_total REAL NOT NULL CHECK(valor_total >= 0),
                    valor_pago REAL NOT NULL DEFAULT 0 CHECK(valor_pago >= 0),
                    meta_amortizacao_mes REAL NOT NULL DEFAULT 0,
                    prioridade INTEGER NOT NULL DEFAULT 1,
                    observacao TEXT
                );
            """)

            # Tabela de Configurações
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS configuracoes (
                    chave TEXT PRIMARY KEY,
                    valor REAL NOT NULL
                );
            """)

            # Tabela de Auditoria de Saques da Reserva
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS auditoria_reserva (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    motivo TEXT NOT NULL,
                    valor REAL NOT NULL,
                    justificativa TEXT NOT NULL
                );
            """)

            conn.commit()
            self._seed_default_data(conn)

    def _seed_default_data(self, conn: sqlite3.Connection) -> None:
        """Popula configurações iniciais baseadas no perfil PCD R$ 850."""
        cursor = conn.cursor()
        defaults = {
            "renda_mensal": 850.00,
            "reserva_emergencia": 1400.00,
            "horas_trabalho_mes": 88.0,
            "custos_fixos_essenciais": 250.00,
            "meta_poupanca_minima": 50.00,
        }
        for k, v in defaults.items():
            cursor.execute("""
                INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES (?, ?)
            """, (k, v))

        # Adiciona dívida padrão inicial com a mãe caso a tabela esteja vazia
        cursor.execute("SELECT COUNT(*) FROM dividas")
        count = cursor.fetchone()[0]
        if count == 0:
            cursor.execute("""
                INSERT INTO dividas (credor, valor_total, valor_pago, meta_amortizacao_mes, prioridade, observacao)
                VALUES ('Mãe (Cartão de Crédito Emprestado)', 320.00, 120.00, 100.00, 1, 'Prioridade absoluta de amortização mensal')
            """)

        conn.commit()

    def get_settings(self) -> SystemSettings:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT chave, valor FROM configuracoes")
            rows = cursor.fetchall()
            data = {row["chave"]: row["valor"] for row in rows}
            return SystemSettings(
                renda_mensal=data.get("renda_mensal", 850.0),
                reserva_emergencia=data.get("reserva_emergencia", 1400.0),
                horas_trabalho_mes=data.get("horas_trabalho_mes", 88.0),
                custos_fixos_essenciais=data.get("custos_fixos_essenciais", 250.0),
                meta_poupanca_minima=data.get("meta_poupanca_minima", 50.0),
            )

    def update_setting(self, chave: str, valor: float) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO configuracoes (chave, valor) VALUES (?, ?)
                ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor
            """, (chave, valor))
            conn.commit()

    def add_expense(self, record: ExpenseRecord) -> int:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO despesas (data, descricao, valor, metodo_pagamento, categoria, is_impulsive)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                record.data,
                record.descricao.strip(),
                float(record.valor),
                record.metodo_pagamento.lower(),
                record.categoria.lower(),
                1 if record.is_impulsive else 0,
            ))
            conn.commit()
            return cursor.lastrowid

    def list_expenses(self, mes_ano: Optional[str] = None) -> List[ExpenseRecord]:
        """Retorna despesas. mes_ano no formato 'YYYY-MM'."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if mes_ano:
                cursor.execute("""
                    SELECT id, data, descricao, valor, metodo_pagamento, categoria, is_impulsive, created_at
                    FROM despesas
                    WHERE strftime('%Y-%m', data) = ?
                    ORDER BY data DESC, id DESC
                """, (mes_ano,))
            else:
                cursor.execute("""
                    SELECT id, data, descricao, valor, metodo_pagamento, categoria, is_impulsive, created_at
                    FROM despesas
                    ORDER BY data DESC, id DESC
                """)
            rows = cursor.fetchall()
            return [
                ExpenseRecord(
                    id=row["id"],
                    data=row["data"],
                    descricao=row["descricao"],
                    valor=row["valor"],
                    metodo_pagamento=row["metodo_pagamento"],
                    categoria=row["categoria"],
                    is_impulsive=bool(row["is_impulsive"]),
                    created_at=row["created_at"],
                )
                for row in rows
            ]

    def delete_expense(self, expense_id: int) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM despesas WHERE id = ?", (expense_id,))
            conn.commit()
            return cursor.rowcount > 0

    def list_debts(self) -> List[DebtRecord]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, credor, valor_total, valor_pago, meta_amortizacao_mes, prioridade, observacao
                FROM dividas
                ORDER BY prioridade ASC, valor_total DESC
            """)
            rows = cursor.fetchall()
            return [
                DebtRecord(
                    id=row["id"],
                    credor=row["credor"],
                    valor_total=row["valor_total"],
                    valor_pago=row["valor_pago"],
                    meta_amortizacao_mes=row["meta_amortizacao_mes"],
                    prioridade=row["prioridade"],
                    observacao=row["observacao"] or "",
                )
                for row in rows
            ]

    def record_debt_amortization(self, debt_id: int, valor: float) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE dividas
                SET valor_pago = valor_pago + ?
                WHERE id = ?
            """, (valor, debt_id))
            conn.commit()
            return cursor.rowcount > 0

    def add_debt(self, debt: DebtRecord) -> int:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO dividas (credor, valor_total, valor_pago, meta_amortizacao_mes, prioridade, observacao)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (debt.credor, debt.valor_total, debt.valor_pago, debt.meta_amortizacao_mes, debt.prioridade, debt.observacao))
            conn.commit()
            return cursor.lastrowid
