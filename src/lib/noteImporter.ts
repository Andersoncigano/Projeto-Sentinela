import { ExpenseRecord, PaymentMethod, Category } from '../types/sentinela';

export interface ImportedNoteLine {
  originalText: string;
  descricao: string;
  valor: number;
  data: string; // YYYY-MM-DD
  metodo: PaymentMethod;
  categoria: Category;
  duvida: boolean;
  valido: boolean;
  mensagemErro?: string;
}

export interface NoteBatchParseResult {
  mesSugerido: string; // YYYY-MM
  metodoSugerido: PaymentMethod;
  linhas: ImportedNoteLine[];
  totalVista: number;
  totalCartao: number;
  totalGeral: number;
}

const MESES_MAP: Record<string, number> = {
  janeiro: 1, jan: 1,
  fevereiro: 2, fev: 2,
  marco: 3, março: 3, mar: 3,
  abril: 4, abr: 4,
  maio: 5, mai: 5,
  junho: 6, jun: 6,
  julho: 7, jul: 7,
  agosto: 8, ago: 8,
  setembro: 9, set: 9,
  outubro: 10, out: 10,
  novembro: 11, nov: 11,
  dezembro: 12, dez: 12,
};

export class NoteBatchImporter {
  public static parseNotes(
    rawText: string, 
    currentYear: number = 2026,
    overrideMethod?: PaymentMethod
  ): NoteBatchParseResult {
    const lines = rawText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    let detectedMonthNum = new Date().getMonth() + 1;
    let detectedYear = currentYear;
    let defaultMethod: PaymentMethod = overrideMethod || 'pix';

    // 1. Detectar cabeçalho geral (ex: "Setembro - Pix", "Outubro - Cartão")
    for (const line of lines) {
      const lower = line.toLowerCase();
      for (const [nomeMes, numMes] of Object.entries(MESES_MAP)) {
        if (new RegExp(`\\b${nomeMes}\\b`, 'i').test(lower)) {
          detectedMonthNum = numMes;
          break;
        }
      }
      if (/cart[aã]o|cr[eé]dito/i.test(lower)) {
        defaultMethod = 'cartao_credito';
      } else if (/pix|vista|dinheiro|d[eé]bito/i.test(lower)) {
        defaultMethod = 'pix';
      }
    }

    const monthStr = String(detectedMonthNum).padStart(2, '0');
    const mesSugerido = `${detectedYear}-${monthStr}`;

    const parsedLines: ImportedNoteLine[] = [];
    let totalVista = 0;
    let totalCartao = 0;

    for (const line of lines) {
      // Ignorar linhas puras de cabeçalho como "Setembro - Pix" ou "# Despesas"
      if (/^(#|===|---|setembro|outubro|novembro|dezembro|janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto)(\s*[-–:]\s*(pix|cart[aã]o|cr[eé]dito))?$/i.test(line)) {
        continue;
      }

      const lower = line.toLowerCase();
      const hasQuestionMark = line.includes('?');

      // Detectar método específico da linha
      let lineMethod: PaymentMethod = defaultMethod;
      if (/cart[aã]o|cr[eé]dito/i.test(lower)) {
        lineMethod = 'cartao_credito';
      } else if (/pix/i.test(lower)) {
        lineMethod = 'pix';
      } else if (/dinheiro|esp[eé]cie/i.test(lower)) {
        lineMethod = 'dinheiro';
      }

      // Procurar por data DD/MM (ex: "07/10" ou "15/09")
      const dateMatch = line.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
      let lineDate = `${mesSugerido}-05`; // padrão: dia 5 do mês

      if (dateMatch) {
        const d = String(parseInt(dateMatch[1], 10)).padStart(2, '0');
        const m = String(parseInt(dateMatch[2], 10)).padStart(2, '0');
        const y = dateMatch[3] ? parseInt(dateMatch[3], 10) : detectedYear;
        lineDate = `${y}-${m}-${d}`;
      }

      // Extrair valor numérico
      // Padrões como: "- 45 -", ": 45", "45,00", "20 ?"
      // Removemos a data antes de procurar valor para não confundir dia/mês com valor
      let textWithoutDate = line;
      if (dateMatch) {
        textWithoutDate = textWithoutDate.replace(dateMatch[0], ' ');
      }

      const valueMatches = Array.from(textWithoutDate.matchAll(/(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/gi));
      if (valueMatches.length === 0) {
        parsedLines.push({
          originalText: line,
          descricao: line,
          valor: 0,
          data: lineDate,
          metodo: lineMethod,
          categoria: 'outros',
          duvida: hasQuestionMark,
          valido: false,
          mensagemErro: 'Valor monetário não identificado nesta linha',
        });
        continue;
      }

      // Pega o valor mais provável (o primeiro valor numérico que não é a data)
      const valStr = valueMatches[0][1].replace(',', '.');
      const valor = parseFloat(valStr);

      if (isNaN(valor) || valor <= 0) {
        parsedLines.push({
          originalText: line,
          descricao: line,
          valor: 0,
          data: lineDate,
          metodo: lineMethod,
          categoria: 'outros',
          duvida: hasQuestionMark,
          valido: false,
          mensagemErro: `Valor numérico inválido: ${valStr}`,
        });
        continue;
      }

      // Extrair descrição
      // Remover hífen, valor, data, pontos de interrogação
      let descricaoLimpa = line
        .replace(new RegExp(`\\b${valueMatches[0][0].replace('$', '\\$')}\\b`, 'i'), '')
        .replace(/[-–:?]/g, ' ')
        .replace(/\b(pix|cart[aã]o|cr[eé]dito|dinheiro)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (dateMatch) {
        descricaoLimpa = descricaoLimpa.replace(dateMatch[0], '').replace(/\s+/g, ' ').trim();
      }

      if (!descricaoLimpa) {
        descricaoLimpa = 'Despesa do bloco de notas';
      }

      // Capitalizar
      descricaoLimpa = descricaoLimpa.charAt(0).toUpperCase() + descricaoLimpa.slice(1);

      // Categoria simplificada
      const descLower = descricaoLimpa.toLowerCase();
      let categoria: Category = 'outros';
      let isImpulsive = false;

      if (descLower.includes('barba') || descLower.includes('cabelo') || descLower.includes('remedio') || descLower.includes('farmacia')) {
        categoria = descLower.includes('remedio') ? 'saude' : 'essencial';
      } else if (descLower.includes('fantasia') || descLower.includes('lord') || descLower.includes('abbey') || descLower.includes('chopp') || descLower.includes('lanche')) {
        categoria = 'lazer_impulsivo';
        isImpulsive = true;
      }

      parsedLines.push({
        originalText: line,
        descricao: descricaoLimpa,
        valor,
        data: lineDate,
        metodo: lineMethod,
        categoria,
        duvida: hasQuestionMark,
        valido: true,
      });

      const isCard = lineMethod === 'cartao_credito' || 
                     (lineMethod as string) === 'cartao_mae' || 
                     (lineMethod as string) === 'cartao_proprio';
      if (isCard) {
        totalCartao += valor;
      } else {
        totalVista += valor;
      }
    }

    return {
      mesSugerido,
      metodoSugerido: defaultMethod,
      linhas: parsedLines,
      totalVista,
      totalCartao,
      totalGeral: totalVista + totalCartao,
    };
  }

  public static toExpenseRecords(
    parsed: ImportedNoteLine[],
    targetMonth?: string
  ): ExpenseRecord[] {
    return parsed
      .filter(l => l.valido && l.valor > 0)
      .map(l => {
        let finalDate = l.data;
        if (targetMonth) {
          const parts = l.data.split('-');
          const day = parts.length === 3 ? parts[2] : '05';
          finalDate = `${targetMonth}-${day}`;
        }

        return {
          id: `exp_batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          data: finalDate,
          descricao: l.descricao + (l.duvida ? ' (Verificar)' : ''),
          valor: l.valor,
          metodo_pagamento: l.metodo,
          categoria: l.categoria,
          is_impulsive: l.categoria === 'lazer_impulsivo' || l.categoria === 'alimentacao_impulsiva',
          timestamp: Date.now(),
        };
      });
  }
}
