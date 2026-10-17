import React, { useState } from 'react';
import { Trash2, Search, Database } from 'lucide-react';
import { ExpenseRecord } from '../types/sentinela';
import { sound } from '../lib/sound';

interface AuditTableProps {
  expenses: ExpenseRecord[];
  onDeleteExpense: (id: string) => void;
}

export const AuditTable: React.FC<AuditTableProps> = ({
  expenses,
  onDeleteExpense,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'impulsive' | 'cartao' | 'essential'>('all');

  const filtered = expenses.filter((e) => {
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
    if (filterType === 'essential') return !e.is_impulsive;
    return true;
  });

  const handleDelete = (id: string) => {
    sound.playTick();
    onDeleteExpense(id);
  };

  return (
    <div className="border border-neutral-800 bg-[#04060d]/95 p-4 shadow-xl font-mono">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#ff0055] text-black font-extrabold text-[11px] tracking-wider uppercase">
          <Database className="w-3.5 h-3.5 text-black" />
          <span>[ LIVRO-RAZÃO // AUDITORIA_DE_TRANSAÇÕES ]</span>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3 h-3 text-neutral-500 absolute left-2.5 top-2.5" />
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

          <div className="flex items-center gap-1 text-[11px]">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2 py-0.5 border cursor-pointer ${
                filterType === 'all'
                  ? 'bg-[#00f0ff] border-[#00f0ff] text-black font-bold'
                  : 'bg-black border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              TODOS
            </button>
            <button
              onClick={() => setFilterType('impulsive')}
              className={`px-2 py-0.5 border cursor-pointer ${
                filterType === 'impulsive'
                  ? 'bg-[#ff0055] border-[#ff0055] text-black font-bold'
                  : 'bg-black border-neutral-800 text-[#ff0055] hover:bg-[#ff0055]/10'
              }`}
            >
              IMPULSIVOS
            </button>
            <button
              onClick={() => setFilterType('cartao')}
              className={`px-2 py-0.5 border cursor-pointer ${
                filterType === 'cartao'
                  ? 'bg-[#00f0ff] border-[#00f0ff] text-black font-bold'
                  : 'bg-black border-neutral-800 text-[#00f0ff] hover:bg-[#00f0ff]/10'
              }`}
            >
              CARTÃO CRÉDITO
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mt-3">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-neutral-600 text-xs">
            // NENHUM REGISTRO ENCONTRADO NO BANCO DE DADOS
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-[10px] text-neutral-500 uppercase tracking-widest bg-black/60">
                <th className="py-2 px-3">DATA</th>
                <th className="py-2 px-3">DESCRIÇÃO</th>
                <th className="py-2 px-3">VALOR</th>
                <th className="py-2 px-3">MÉTODO</th>
                <th className="py-2 px-3">STATUS</th>
                <th className="py-2 px-3 text-right">EXCLUIR</th>
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
                  <td className="py-2.5 px-3 text-neutral-400 whitespace-nowrap">
                    {item.data}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-[#e0f2fe]">
                    {item.descricao}
                  </td>
                  <td className="py-2.5 px-3 font-black text-[#ffe600] whitespace-nowrap">
                    R$ {item.valor.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {(() => {
                      const isCard = item.metodo_pagamento === 'cartao_credito' || 
                                     item.metodo_pagamento === 'cartao_proprio' || 
                                     item.metodo_pagamento === 'cartao_mae';
                      return (
                        <span
                          className={`px-1.5 py-0.2 text-[9px] font-black uppercase border ${
                            isCard
                              ? 'border-[#00f0ff] text-[#00f0ff] bg-black'
                              : item.metodo_pagamento === 'pix'
                              ? 'border-[#00ff66] text-[#00ff66] bg-black'
                              : 'border-neutral-700 text-neutral-400 bg-black'
                          }`}
                        >
                          {isCard ? 'CARTÃO CRÉDITO' : item.metodo_pagamento.replace('_', ' ')}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {item.is_impulsive ? (
                      <span className="px-1.5 py-0.2 bg-[#ff0055] text-black text-[9px] font-black uppercase">
                        IMPULSIVO 🚨
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 bg-[#00ff66] text-black text-[9px] font-black uppercase">
                        ESSENCIAL ✓
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1 hover:text-[#ff0055] text-neutral-600 transition-colors cursor-pointer"
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
    </div>
  );
};
