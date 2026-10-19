import React, { useState, useEffect } from 'react';
import { Trash2, Search, Database, Maximize2, Minimize2, ArrowLeft, Filter, Layers, FileText } from 'lucide-react';
import { ExpenseRecord } from '../types/sentinela';
import { sound } from '../lib/sound';
import { formatCurrency } from '../lib/format';

interface AuditTableProps {
  expenses: ExpenseRecord[];
  onDeleteExpense: (id: string) => void;
  selectedMonth?: string;
  showValues?: boolean;
  onRestoreDefaults?: () => void;
  onOpenReport?: () => void;
}

export const AuditTable: React.FC<AuditTableProps> = ({
  expenses,
  onDeleteExpense,
  selectedMonth,
  showValues = true,
  onRestoreDefaults,
  onOpenReport,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'impulsive' | 'cartao' | 'pix' | 'pix_rescisao' | 'essential'>('all');
  const [filterMonthOnly, setFilterMonthOnly] = useState<boolean>(true);

  // Escutar a tecla ESC para fechar a tela cheia
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Travar o scroll da página de fundo quando em tela cheia
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const filtered = expenses.filter((e) => {
    if (selectedMonth && filterMonthOnly && !e.data.startsWith(selectedMonth)) {
      return false;
    }

    const isCartao = e.metodo_pagamento === 'cartao_credito' || 
                     e.metodo_pagamento === 'cartao_proprio' || 
                     e.metodo_pagamento === 'cartao_mae';

    const matchesSearch =
      e.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.metodo_pagamento.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.data.includes(searchTerm);

    if (!matchesSearch) return false;

    if (filterType === 'impulsive') return e.is_impulsive;
    if (filterType === 'cartao') return isCartao;
    if (filterType === 'pix') return e.metodo_pagamento === 'pix' || e.metodo_pagamento === 'dinheiro' || e.metodo_pagamento === 'debito';
    if (filterType === 'pix_rescisao') return e.metodo_pagamento === 'pix_rescisao';
    if (filterType === 'essential') return !e.is_impulsive;
    return true;
  });

  // Estatísticas calculadas sobre os registros filtrados
  const totalGeral = filtered.reduce((acc, curr) => acc + curr.valor, 0);
  const totalCartao = filtered
    .filter((e) => e.metodo_pagamento === 'cartao_credito' || e.metodo_pagamento === 'cartao_proprio' || e.metodo_pagamento === 'cartao_mae')
    .reduce((acc, curr) => acc + curr.valor, 0);
  const totalPixSalario = filtered
    .filter((e) => e.metodo_pagamento === 'pix' || e.metodo_pagamento === 'dinheiro' || e.metodo_pagamento === 'debito')
    .reduce((acc, curr) => acc + curr.valor, 0);
  const totalPixRescisao = filtered
    .filter((e) => e.metodo_pagamento === 'pix_rescisao')
    .reduce((acc, curr) => acc + curr.valor, 0);
  const totalImpulsivos = filtered
    .filter((e) => e.is_impulsive)
    .reduce((acc, curr) => acc + curr.valor, 0);

  const handleDelete = (id: string) => {
    sound.playTick();
    onDeleteExpense(id);
  };

  const handleOpenFullscreen = () => {
    sound.playTick();
    setIsFullscreen(true);
  };

  const handleCloseFullscreen = () => {
    sound.playTick();
    setIsFullscreen(false);
  };

  // Renderizador comum da tabela para reuso nos dois modos
  const renderTableContent = () => (
    <div className="overflow-x-auto mt-3">
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-neutral-400 text-xs border border-dashed border-neutral-800 bg-black/50 p-4">
          <p className="font-bold text-[#e0f2fe] text-sm">// NENHUM REGISTRO ENCONTRADO NO BANCO DE DADOS</p>
          <p className="text-xs text-neutral-400 mt-2">
            Caso você tenha aberto em um novo navegador e a lista esteja limpa, você pode carregar as despesas reais do cartão com um clique:
          </p>
          {onRestoreDefaults && (
            <button
              type="button"
              onClick={onRestoreDefaults}
              className="mt-4 px-4 py-2 bg-[#00ff66] hover:bg-[#33ff88] text-black font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-[#00ff66]/30 transition-all active:scale-95 inline-flex items-center gap-2"
            >
              <span>📥 CARREGAR GASTOS REAIS (ABBEY + UBER)</span>
            </button>
          )}
        </div>
      ) : (
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-neutral-800 text-[10px] text-neutral-400 uppercase tracking-widest bg-black/80 sticky top-0 z-10 backdrop-blur-sm">
              <th className="py-2.5 px-3">DATA</th>
              <th className="py-2.5 px-3">DESCRIÇÃO</th>
              <th className="py-2.5 px-3">VALOR</th>
              <th className="py-2.5 px-3">MÉTODO DE PAGAMENTO</th>
              <th className="py-2.5 px-3">CLASSIFICAÇÃO</th>
              <th className="py-2.5 px-3 text-right">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900">
            {filtered.map((item) => (
              <tr
                key={item.id}
                className={`hover:bg-[#00f0ff]/5 transition-colors ${
                  item.is_impulsive ? 'bg-[#1a0208]/40' : ''
                }`}
              >
                <td className="py-2.5 px-3 text-neutral-400 whitespace-nowrap font-mono text-[11px]">
                  {item.data}
                </td>
                <td className="py-2.5 px-3 font-bold text-[#e0f2fe]">
                  {item.descricao}
                </td>
                <td className="py-2.5 px-3 font-black text-[#ffe600] whitespace-nowrap text-[13px]">
                  {formatCurrency(item.valor, !showValues)}
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  {(() => {
                    const isCard = item.metodo_pagamento === 'cartao_credito' || 
                                   item.metodo_pagamento === 'cartao_proprio' || 
                                   item.metodo_pagamento === 'cartao_mae';
                    if (!isCard) {
                      if (item.metodo_pagamento === 'pix_rescisao') {
                        return (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 text-[9px] font-black uppercase border border-[#c084fc] text-[#c084fc] bg-black">
                              PIX RESCISÃO
                            </span>
                            <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase border border-[#c084fc]/50 bg-[#c084fc]/10 text-[#c084fc]">
                              VERBA DIA 30
                            </span>
                          </div>
                        );
                      }

                      if (item.metodo_pagamento === 'pix') {
                        return (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 text-[9px] font-black uppercase border border-[#00ff66] text-[#00ff66] bg-black">
                              PIX SALÁRIO
                            </span>
                            <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase border border-[#00ff66]/50 bg-[#00ff66]/10 text-[#00ff66]">
                              SOBRA R$ 200
                            </span>
                          </div>
                        );
                      }

                      return (
                        <span
                          className="px-1.5 py-0.5 text-[9px] font-black uppercase border border-neutral-700 text-neutral-400 bg-black"
                        >
                          {item.metodo_pagamento.replace('_', ' ')}
                        </span>
                      );
                    }

                    // Se o gasto foi no dia 17 ou posterior, entra na fatura que vence em 23 de Novembro
                    const itemDay = parseInt(item.data.split('-')[2] || '0', 10);
                    const isNovaFatura = itemDay >= 17;

                    return (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 text-[9px] font-black uppercase border border-[#00f0ff] text-[#00f0ff] bg-black">
                          CARTÃO CRÉDITO
                        </span>
                        <span
                          className={`px-1.5 py-0.5 text-[8px] font-bold uppercase border ${
                            isNovaFatura
                              ? 'border-[#00ff66]/50 bg-[#00ff66]/10 text-[#00ff66]'
                              : 'border-[#ffe600]/50 bg-[#ffe600]/10 text-[#ffe600]'
                          }`}
                          title={
                            isNovaFatura 
                              ? 'Gasto a partir do dia 17: entra na fatura com vencimento em 23 de Novembro' 
                              : 'Gasto anterior ao dia 17: entra na fatura com vencimento em 23 de Outubro'
                          }
                        >
                          {isNovaFatura ? 'FATURA NOV (VENCE 23/11)' : 'FATURA OUT (VENCE 23/10)'}
                        </span>
                      </div>
                    );
                  })()}
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  {item.is_impulsive ? (
                    <span className="px-2 py-0.5 bg-[#ff0055] text-black text-[9px] font-black uppercase">
                      IMPULSIVO 🚨
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-[#00ff66] text-black text-[9px] font-black uppercase">
                      ESSENCIAL ✓
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 hover:text-[#ff0055] text-neutral-500 hover:bg-neutral-800 transition-colors cursor-pointer"
                    title="Excluir despesa e restaurar teto diário"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  // BARRA DE FILTROS E BUSCA
  const renderFilterToolbar = () => (
    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
      <div className="relative flex-1 sm:w-48">
        <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
        <input
          type="text"
          placeholder="BUSCAR_LOGS..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-black border border-neutral-700 pl-8 pr-7 py-1 text-xs text-[#e0f2fe] placeholder:text-neutral-600 focus:outline-none focus:border-[#00f0ff]"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-2 top-2 text-neutral-400 hover:text-white text-xs cursor-pointer"
            title="Limpar busca"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1 text-[11px]">
        <button
          onClick={() => setFilterType('all')}
          className={`px-2 py-0.5 border cursor-pointer transition-all ${
            filterType === 'all'
              ? 'bg-[#00f0ff] border-[#00f0ff] text-black font-bold'
              : 'bg-black border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          TODOS
        </button>
        <button
          onClick={() => setFilterType('impulsive')}
          className={`px-2 py-0.5 border cursor-pointer transition-all ${
            filterType === 'impulsive'
              ? 'bg-[#ff0055] border-[#ff0055] text-black font-bold'
              : 'bg-black border-neutral-800 text-[#ff0055] hover:bg-[#ff0055]/10'
          }`}
        >
          IMPULSIVOS
        </button>
        <button
          onClick={() => setFilterType('essential')}
          className={`px-2 py-0.5 border cursor-pointer transition-all ${
            filterType === 'essential'
              ? 'bg-[#00ff66] border-[#00ff66] text-black font-bold'
              : 'bg-black border-neutral-800 text-[#00ff66] hover:bg-[#00ff66]/10'
          }`}
        >
          ESSENCIAIS
        </button>
        <button
          onClick={() => setFilterType('pix')}
          className={`px-2 py-0.5 border cursor-pointer transition-all ${
            filterType === 'pix'
              ? 'bg-[#00ff66] border-[#00ff66] text-black font-bold'
              : 'bg-black border-neutral-800 text-[#00ff66] hover:bg-[#00ff66]/10'
          }`}
        >
          PIX / À VISTA
        </button>
        <button
          onClick={() => setFilterType('cartao')}
          className={`px-2 py-0.5 border cursor-pointer transition-all ${
            filterType === 'cartao'
              ? 'bg-[#00f0ff] border-[#00f0ff] text-black font-bold'
              : 'bg-black border-neutral-800 text-[#00f0ff] hover:bg-[#00f0ff]/10'
          }`}
        >
          CARTÃO CRÉDITO
        </button>
        <button
          onClick={() => setFilterType('pix_rescisao')}
          className={`px-2 py-0.5 border cursor-pointer transition-all ${
            filterType === 'pix_rescisao'
              ? 'bg-[#c084fc] border-[#c084fc] text-black font-bold'
              : 'bg-black border-neutral-800 text-[#c084fc] hover:bg-[#c084fc]/10'
          }`}
          title="Filtrar despesas gastas com a Verba Rescisória"
        >
          💼 PIX RESCISÃO
        </button>

        {selectedMonth && (
          <button
            type="button"
            onClick={() => setFilterMonthOnly(!filterMonthOnly)}
            className={`px-2 py-0.5 border text-[10px] uppercase font-bold cursor-pointer transition-all ${
              filterMonthOnly
                ? 'border-[#ffe600] bg-[#ffe600]/10 text-[#ffe600]'
                : 'border-neutral-700 bg-neutral-900 text-neutral-400'
            }`}
            title="Alternar entre ver somente o mês ativo ou todo o histórico"
          >
            {filterMonthOnly ? `MÊS ATIVO (${selectedMonth})` : 'TODOS OS MESES'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ======================================================== */}
      {/* 1. MODO NORMAL (EMBUTIDO NO PAINEL PRINCIPAL)             */}
      {/* ======================================================== */}
      <div className="border border-neutral-800 bg-[#04060d]/95 p-4 shadow-xl font-mono">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#ff0055] text-black font-extrabold text-[11px] tracking-wider uppercase">
              <Database className="w-3.5 h-3.5 text-black" />
              <span>[ LIVRO-RAZÃO // AUDITORIA_DE_TRANSAÇÕES ]</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-black border border-neutral-800 text-neutral-400">
              {filtered.length} {filtered.length === 1 ? 'REGISTRO' : 'REGISTROS'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {renderFilterToolbar()}

            {onOpenReport && (
              <button
                type="button"
                onClick={onOpenReport}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-black border border-[#00ff66]/80 text-[#00ff66] hover:bg-[#00ff66] hover:text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-[#00ff66]/10 active:scale-95"
                title="Gerar Relatório de Fechamento do Mês ou Data Específica"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>📑 RELATÓRIO</span>
              </button>
            )}

            {/* BOTÃO PARA ABRIR EM TELA CHEIA */}
            <button
              type="button"
              onClick={handleOpenFullscreen}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-black border border-[#00f0ff]/80 text-[#00f0ff] hover:bg-[#00f0ff] hover:text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-[#00f0ff]/10 active:scale-95 ml-auto sm:ml-0"
              title="Abrir a tabela de valores em tela cheia com botão de voltar"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>⛶ TELA CHEIA</span>
            </button>
          </div>
        </div>

        {/* Tabela de valores no modo padrão */}
        {renderTableContent()}
      </div>

      {/* ======================================================== */}
      {/* 2. MODO TELA CHEIA (OVERLAY COMPLETO COM BOTÃO VOLTAR)   */}
      {/* ======================================================== */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-[#020409] overflow-y-auto p-4 sm:p-6 md:p-8 flex flex-col font-mono text-[#e0f2fe] animate-in fade-in duration-150">
          {/* Header Superior da Tela Cheia com Botão de Voltar proeminente */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-neutral-800 sticky top-0 bg-[#020409] z-20 pt-2 backdrop-blur-md">
            <div className="flex items-center gap-3 flex-wrap">
              {/* BOTÃO VOLTAR PRINCIPAL */}
              <button
                type="button"
                onClick={handleCloseFullscreen}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff0055] hover:bg-[#ff3377] text-white font-black text-xs uppercase tracking-wider border border-white/20 shadow-lg shadow-[#ff0055]/30 cursor-pointer transition-all active:scale-95"
                title="Voltar ao painel principal (Tecla ESC)"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>← VOLTAR AO PAINEL</span>
              </button>

              <div className="inline-flex items-center gap-2 px-3 py-1 bg-black border border-[#00f0ff] text-[#00f0ff] font-extrabold text-xs tracking-wider uppercase">
                <Database className="w-4 h-4 text-[#00f0ff]" />
                <span>LIVRO-RAZÃO // AUDITORIA EM TELA CHEIA</span>
              </div>

              <span className="text-[11px] text-neutral-400 hidden lg:inline">
                (Pressione <kbd className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-700 text-white rounded text-[10px]">ESC</kbd> ou clique no botão acima para voltar)
              </span>
            </div>

            {/* Ações da direita: Botão secundário de sair da tela cheia */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
              <span className="text-xs px-2.5 py-1 bg-black border border-neutral-800 text-neutral-300 font-bold">
                {filtered.length} {filtered.length === 1 ? 'LANÇAMENTO' : 'LANÇAMENTOS'}
              </span>

              {onOpenReport && (
                <button
                  type="button"
                  onClick={() => {
                    handleCloseFullscreen();
                    onOpenReport();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00ff66] hover:bg-[#33ff88] text-black font-extrabold text-xs uppercase transition-all cursor-pointer shadow-md"
                  title="Gerar Relatório de Fechamento do Mês ou Data Específica"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>📑 GERAR RELATÓRIO</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCloseFullscreen}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white text-xs font-bold uppercase transition-all cursor-pointer"
                title="Sair do modo tela cheia"
              >
                <Minimize2 className="w-3.5 h-3.5 text-[#ff0055]" />
                <span>SAIR DA TELA CHEIA</span>
              </button>
            </div>
          </div>

          {/* Cards de Resumo Rápido na Tela Cheia */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 my-4">
            <div className="border border-neutral-800 bg-[#070b18] p-2.5">
              <span className="text-[10px] text-neutral-500 uppercase block font-bold">TOTAL GASTO FILTRADO</span>
              <span className="text-sm sm:text-base font-black text-[#ffe600]">
                {formatCurrency(totalGeral, !showValues)}
              </span>
            </div>
            <div className="border border-[#00f0ff]/40 bg-[#001726]/60 p-2.5">
              <span className="text-[10px] text-[#00f0ff] uppercase block font-bold">CARTÃO DE CRÉDITO</span>
              <span className="text-sm sm:text-base font-black text-[#00f0ff]">
                {formatCurrency(totalCartao, !showValues)}
              </span>
            </div>
            <div className="border border-[#00ff66]/40 bg-[#012210]/60 p-2.5">
              <span className="text-[10px] text-[#00ff66] uppercase block font-bold">PIX SALÁRIO (SOBRA R$ 200)</span>
              <span className="text-sm sm:text-base font-black text-[#00ff66]">
                {formatCurrency(totalPixSalario, !showValues)}
              </span>
            </div>
            <div className="border border-[#c084fc]/40 bg-[#1c0b2b]/60 p-2.5">
              <span className="text-[10px] text-[#c084fc] uppercase block font-bold">PIX RESCISÃO (DIA 30)</span>
              <span className="text-sm sm:text-base font-black text-[#c084fc]">
                {formatCurrency(totalPixRescisao, !showValues)}
              </span>
            </div>
            <div className="border border-[#ff0055]/40 bg-[#25030d]/60 p-2.5 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-[#ff0055] uppercase block font-bold">GASTOS IMPULSIVOS</span>
              <span className="text-sm sm:text-base font-black text-[#ff0055]">
                {formatCurrency(totalImpulsivos, !showValues)}
              </span>
            </div>
          </div>

          {/* Barra de Filtros expandida em tela cheia */}
          <div className="p-3 bg-black/60 border border-neutral-800 mb-2">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#00f0ff]" />
                <span className="text-xs font-bold text-neutral-300">FILTROS RÁPIDOS:</span>
              </div>
              {renderFilterToolbar()}
            </div>
          </div>

          {/* Tabela de valores em tela cheia */}
          <div className="flex-1 bg-[#04060d] border border-neutral-800 p-2 sm:p-4 shadow-2xl">
            {renderTableContent()}
          </div>

          {/* Rodapé da tela cheia com botão de voltar para conveniência após rolar */}
          <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between">
            <span className="text-xs text-neutral-500 font-mono">
              SENTINELA v2.6 // MODO AUDITORIA EXCLUSIVA
            </span>
            <button
              type="button"
              onClick={handleCloseFullscreen}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff0055] hover:bg-[#ff3377] text-white font-extrabold text-xs uppercase tracking-wider border border-white/20 shadow-lg shadow-[#ff0055]/30 cursor-pointer transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← VOLTAR AO PAINEL</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
