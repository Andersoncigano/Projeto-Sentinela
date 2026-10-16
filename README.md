# SISTEMA SENTINELA: Contenção Financeira Radical & Nudge Engine

Aplicação de engenharia comportamental projetada especificamente para usuários com **alta impulsividade e restrição severa de renda**.

---

## 1. Contexto Financeiro e Premissas

- **Renda Mensal:** R$ 850,00 (PCD Meio Período: ~4 horas/dia, 22 dias = 88h/mês).
- **Custo da Hora de Trabalho:** $\text{Hora PCD} = \frac{R\$\ 850,00}{88\text{ horas}} \approx R\$\ 9,66/\text{hora}$.
- **Capital de Giro (Reserva de Emergência):** R$ 1.400,00 (**Blindado / Intocável**).
- **Fluxos de Risco:** Pix instantâneo e Cartão de Terceiros (Mãe).

---

## 2. Documentação da Arquitetura de Software

O sistema adota os princípios de **Clean Architecture**, **Domain-Driven Design (DDD)** simplificado e **SOLID**, desacoplando a camada de interface (Streamlit / Web), lógica matemática/comportamental (`logic.py`) e persistência transacional (`database.py`).

### 2.1 Diagrama de Fluxo de Dados e Intervenção de Nudge

```
[ Entrada Bruta do Usuário ]
  ("20/10 lanche 45 pix")
             │
             ▼
[ SentinelaParser (Regex + NLP) ] ──> Extrai Data, Valor, Método, Descrição
             │
             ▼
[ SentinelaBurnEngine ] ────────────> Calcula Teto Móvel Diário (Saldo / Dias)
             │                        Gera Penalidade Subsequente
             ▼
[ BehavioralNudgeEngine ] ──────────> Calcula Equivalência em Horas PCD
             │                        Intervenção Psicológica (Vermelho/Amarelo)
             ▼
[ Fricção / Confirmação ] ──────────> Bloqueio de 10-15s / Termo de Consequência
             │
             ▼
[ SQLite DatabaseManager ] ─────────> Gravação Atômica e Atualização de Estado
```

### 2.2 Estrutura de Diretórios

```
├── README.md               # Documentação da arquitetura e fundamentos teóricos
├── requirements.txt        # Dependências Python (Streamlit, Pandas, etc.)
├── database.py             # Camada de persistência SQLite com dataclasses tipadas
├── logic.py                # Regex Parser, Motor de Teto Móvel e Nudge Engine
├── main.py                 # Interface Streamlit com componentes de fricção
├── tests_sentinela.py      # Testes unitários para o parser e algoritmos
└── src/                    # Interface Web Interativa (AI Studio Live Preview)
    ├── App.tsx             # Aplicação completa React/TypeScript do Sentinela
    ├── components/         # Componentes de Fricção, Terminal Regex e Simulador
    └── index.css           # Estilização militar/brutalista de alta contenção
```

---

## 3. Formulação Matemática do Teto Móvel (Moving Ceiling)

O Teto Móvel recalcula dinamicamente a taxa de queima diária (`Daily Burn Rate`):

$$\text{Saldo Livre Inicial} = \text{Renda} - \text{Custos Fixos} - \sum \text{Amortizações Dívidas} - \text{Poupança Mínima}$$

$$\text{Teto Diário}_t = \frac{\text{Saldo Restante}_t}{\text{Dias Restantes no Mês}_t}$$

Quando um gasto impulsivo $G$ ocorre no dia $t$:
$$\text{Penalidade Diária Subsequente} = \frac{G}{\text{Dias Restantes} - 1}$$

---

## 4. Pilares de Economia Comportamental (Nudge Theory)

1. **Aversão à Perda em Tempo de Vida (Labor Conversion):** Todo valor monetário é convertido em horas de esforço físico no trabalho PCD ($R\$\ 45 = 4,6$ horas em pé).
2. **Custódia Compulsória de Dívida Familiar:** A dívida com a mãe é priorizada como passivo de honra. O valor de amortização do mês é sequestrado antes de calcular qualquer limite diário.
3. **Fricção Ativa (Cooling-off Period):** Atraso forçado de confirmação e cores de alarme (vermelho/âmbar) inibem a dopamina da compra instantânea.
4. **Cofre da Reserva com Lacre Psicológico:** A reserva de R$ 1.400,00 exige justificativa médica e declaração de ciência de risco extremo de despejo.
