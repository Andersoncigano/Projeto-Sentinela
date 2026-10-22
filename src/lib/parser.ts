import { ExpenseRecord, ParseResult, PaymentMethod, Category, ParsedTokens } from '../types/sentinela';

const IMPULSIVE_KEYWORDS = new Set([
  'lanche', 'ifood', 'delivery', 'hamburguer', 'pizza', 'doce',
  'chocolate', 'acai', 'açaí', 'chopp', 'chope', 'choppinho', 'cerveja', 'cervejinha',
  'bar', 'drink', 'skin', 'jogo', 'steam', 'game', 'aliexpress', 'shopee', 'compra',
  'besteira', 'fastfood', 'mcdonalds', 'burger', 'snack', 'refrigerante', 'balada', 'copo', 'tabacaria'
]);

const ESSENTIAL_KEYWORDS = new Set([
  'uber', 'taxi', '99', 'remedio', 'remédio', 'farmacia', 'farmácia', 'onibus', 'ônibus', 'metro', 'metrô',
  'passagem', 'consulta', 'aluguel', 'luz', 'agua', 'água', 'internet',
  'arroz', 'feijao', 'feijão', 'supermercado', 'mercado', 'leite', 'pao', 'pão',
  'frango', 'ovo', 'gas', 'gás', 'medico', 'médico'
]);

const PAYMENT_METHOD_MAP: Array<{ pattern: RegExp; method: PaymentMethod }> = [
  { pattern: /\b(pix\s*[/]?\s*rescis[aã]o|rescis[aã]o\s*[/]?\s*pix|rescis[aã]o|verba\s*rescis[oó]ria)\b/i, method: 'pix_rescisao' },
  { pattern: /\b(cart[aã]o(?:\s*d[eé]\s*cr[eé]dito|\s*cr[eé]dito)?|cr[eé]dito|cart[aã]o\s*d?a?\s*m[aã]e|m[aã]e)\b/i, method: 'cartao_credito' },
  { pattern: /\b(pix\s*[/]?\s*sal[aá]rio|sal[aá]rio\s*[/]?\s*pix|sobra\s*(?:do\s*)?sal[aá]rio|saldo\s*livre|pix|px)\b/i, method: 'pix' },
  { pattern: /\b(dinheiro|cash|esp[eé]cie)\b/i, method: 'dinheiro' },
  { pattern: /\b(d[eé]bito)\b/i, method: 'debito' },
];

export class SentinelaParser {
  private static DATE_REGEX = /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/;
  private static VALUE_REGEX = /(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais|rs)?\b/gi;

  public static parse(
    rawText: string, 
    defaultDate: Date = new Date(),
    defaultMethod: PaymentMethod = 'cartao_credito'
  ): ParseResult {
    if (!rawText || !rawText.trim()) {
      return {
        success: false,
        error_message: "Entrada vazia. Experimente: 'uber 25' ou 'almoco 30 cartao' ou 'remedio 40'",
      };
    }

    let text = rawText.trim().toLowerCase();
    
    // 1. Extração de Data
    let extractedDate = defaultDate.toISOString().split('T')[0];
    const dateMatch = text.match(this.DATE_REGEX);
    const ontemMatch = text.match(/\bontem(?:\s+[aà]\s+noite|\s+de\s+noite|\s+tarde|\s+manh[aã])?\b/i);
    const hojeMatch = text.match(/\bhoje(?:\s+[aà]\s+noite|\s+de\s+noite|\s+tarde|\s+manh[aã])?\b/i);

    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10);
      let year = dateMatch[3] ? parseInt(dateMatch[3], 10) : defaultDate.getFullYear();
      if (year < 100) year += 2000;

      if (month < 1 || month > 12 || day < 1 || day > 31) {
        return {
          success: false,
          error_message: `Data inválida detectada: ${day}/${month}/${year}`,
        };
      }

      const formattedMonth = month.toString().padStart(2, '0');
      const formattedDay = day.toString().padStart(2, '0');
      extractedDate = `${year}-${formattedMonth}-${formattedDay}`;

      // Remove date match from text
      text = text.replace(dateMatch[0], ' ').trim();
    } else if (ontemMatch) {
      const yesterday = new Date(defaultDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const year = yesterday.getFullYear();
      const formattedMonth = (yesterday.getMonth() + 1).toString().padStart(2, '0');
      const formattedDay = yesterday.getDate().toString().padStart(2, '0');
      extractedDate = `${year}-${formattedMonth}-${formattedDay}`;
      text = text.replace(ontemMatch[0], ' ').trim();
    } else if (hojeMatch) {
      text = text.replace(hojeMatch[0], ' ').trim();
    }

    // 2. Extração do Método de Pagamento (Padrão: Cartão de Crédito pago c/ Rescisão até dia 30)
    let extractedMethod: PaymentMethod = defaultMethod;
    for (const item of PAYMENT_METHOD_MAP) {
      if (item.pattern.test(text)) {
        extractedMethod = item.method;
        text = text.replace(item.pattern, ' ').trim();
        break;
      }
    }

    // 3. Extração de Valor Monetário
    const matches = Array.from(text.matchAll(this.VALUE_REGEX));
    if (matches.length === 0) {
      return {
        success: false,
        error_message: "Valor numérico não identificado. Insira o valor ex: 'lanche 45 pix'",
      };
    }

    // Pega o último match de valor que faça sentido
    const selectedMatch = matches[matches.length - 1];
    const valString = selectedMatch[1].replace(',', '.');
    const extractedValue = parseFloat(valString);

    if (isNaN(extractedValue) || extractedValue <= 0) {
      return {
        success: false,
        error_message: `Valor monetário inválido: '${valString}'. Deve ser maior que zero.`,
      };
    }

    // Remove o valor do texto para sobrar apenas a descrição
    const matchIndex = selectedMatch.index ?? 0;
    const matchLen = selectedMatch[0].length;
    text = (text.slice(0, matchIndex) + ' ' + text.slice(matchIndex + matchLen)).trim();

    // 4. Limpeza da Descrição
    let cleanedDescription = text
      .replace(/^[-–:;\s]+|[-–:;\s]+$/g, '')
      .replace(/\s+[-–:]\s+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanedDescription) {
      cleanedDescription = extractedMethod === 'cartao_credito' || extractedMethod === 'cartao_proprio' || extractedMethod === 'cartao_mae' 
        ? 'Gasto no Cartão' 
        : 'Despesa não identificada';
    }

    // Capitaliza primeira letra
    cleanedDescription = cleanedDescription.charAt(0).toUpperCase() + cleanedDescription.slice(1);

    // 5. Heurística de Impulsividade e Categoria
    const words = cleanedDescription.toLowerCase().split(/[\s,.-]+/);
    let isImpulsive = false;
    let category: Category = 'outros';

    const hasExplicitImpulse = words.some(w => ['impulsivo', 'besteira', 'supérfluo', 'superfluo'].includes(w));
    const hasImpulsiveKeyword = words.some(w => IMPULSIVE_KEYWORDS.has(w));
    const hasEssentialKeyword = words.some(w => ESSENTIAL_KEYWORDS.has(w));

    if (hasExplicitImpulse || hasImpulsiveKeyword) {
      isImpulsive = true;
      if (words.some(w => ['lanche', 'ifood', 'pizza', 'hamburguer', 'doce', 'acai', 'açaí'].includes(w))) {
        category = 'alimentacao_impulsiva';
      } else if (words.some(w => ['chopp', 'chope', 'choppinho', 'cerveja', 'cervejinha', 'bar', 'drink'].includes(w))) {
        category = 'lazer_impulsivo';
      } else {
        category = 'lazer_impulsivo';
      }
    } else if (hasEssentialKeyword) {
      isImpulsive = false;
      if (words.some(w => ['remedio', 'remédio', 'farmacia', 'farmácia', 'consulta', 'medico'].includes(w))) {
        category = 'saude';
      } else if (words.some(w => ['onibus', 'ônibus', 'metro', 'metrô', 'passagem', 'uber', 'taxi', '99'].includes(w))) {
        category = 'transporte';
      } else {
        category = 'essencial';
      }
    } else {
      category = 'outros';
    }

    const tokens: ParsedTokens = {
      data: extractedDate,
      descricao: cleanedDescription,
      valor: extractedValue,
      metodo: extractedMethod,
      categoria: category,
      is_impulsive: isImpulsive,
    };

    const isCard =
      extractedMethod === 'cartao_credito' ||
      extractedMethod === 'cartao_proprio' ||
      extractedMethod === 'cartao_mae';

    const isRescisaoPix = extractedMethod === 'pix_rescisao';

    const record: ExpenseRecord = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      data: extractedDate,
      descricao: cleanedDescription,
      valor: extractedValue,
      metodo_pagamento: extractedMethod,
      categoria: category,
      is_impulsive: isImpulsive,
      timestamp: Date.now(),
      vinculado_rescisao: isCard || isRescisaoPix,
      fatura_mes: isCard ? '2026-11' : undefined,
      fatura_vencimento: isCard ? '2026-11-23' : undefined,
    };

    return {
      success: true,
      record,
      tokens,
    };
  }
}
