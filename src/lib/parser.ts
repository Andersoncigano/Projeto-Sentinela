import { ExpenseRecord, ParseResult, PaymentMethod, Category, ParsedTokens } from '../types/sentinela';

const IMPULSIVE_KEYWORDS = new Set([
  'lanche', 'ifood', 'uber', 'delivery', 'hamburguer', 'pizza', 'doce',
  'chocolate', 'acai', 'açaí', 'cerveja', 'bar', 'skin', 'jogo', 'steam',
  'game', 'aliexpress', 'shopee', 'compra', 'besteira', 'fastfood',
  'mcdonalds', 'burger', 'snack', 'refrigerante', 'balada', 'copo', 'tabacaria'
]);

const ESSENTIAL_KEYWORDS = new Set([
  'remedio', 'remédio', 'farmacia', 'farmácia', 'onibus', 'ônibus', 'metro', 'metrô',
  'passagem', 'consulta', 'aluguel', 'luz', 'agua', 'água', 'internet',
  'arroz', 'feijao', 'feijão', 'supermercado', 'mercado', 'leite', 'pao', 'pão',
  'frango', 'ovo', 'gas', 'gás', 'medico', 'médico'
]);

const PAYMENT_METHOD_MAP: Array<{ pattern: RegExp; method: PaymentMethod }> = [
  { pattern: /\b(cart[aã]o\s+d?a?\s*m[aã]e|m[aã]e)\b/i, method: 'cartao_mae' },
  { pattern: /\b(pix|px)\b/i, method: 'pix' },
  { pattern: /\b(dinheiro|cash|esp[eé]cie)\b/i, method: 'dinheiro' },
  { pattern: /\b(d[eé]bito)\b/i, method: 'debito' },
  { pattern: /\b(cart[aã]o|cr[eé]dito)\b/i, method: 'cartao_proprio' },
];

export class SentinelaParser {
  private static DATE_REGEX = /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/;
  private static VALUE_REGEX = /(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais|rs)?\b/gi;

  public static parse(rawText: string, defaultDate: Date = new Date()): ParseResult {
    if (!rawText || !rawText.trim()) {
      return {
        success: false,
        error_message: "Entrada vazia. Experimente: '20/10 lanche 45 pix' ou 'uber 18.50 cartao mae'",
      };
    }

    let text = rawText.trim().toLowerCase();
    
    // 1. Extração de Data
    let extractedDate = defaultDate.toISOString().split('T')[0];
    const dateMatch = text.match(this.DATE_REGEX);
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
    }

    // 2. Extração do Método de Pagamento
    let extractedMethod: PaymentMethod = 'pix';
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
    let cleanedDescription = text.replace(/\s+/g, ' ').trim();
    if (!cleanedDescription) {
      cleanedDescription = 'Despesa não identificada';
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
      } else {
        category = 'lazer_impulsivo';
      }
    } else if (hasEssentialKeyword) {
      isImpulsive = false;
      if (words.some(w => ['remedio', 'remédio', 'farmacia', 'farmácia', 'consulta', 'medico'].includes(w))) {
        category = 'saude';
      } else if (words.some(w => ['onibus', 'ônibus', 'metro', 'metrô', 'passagem', 'uber'].includes(w))) {
        category = 'transporte';
      } else {
        category = 'essencial';
      }
    } else {
      category = 'outros';
    }

    // Regra comportamental severa: Usar Cartão da Mãe para algo não estritamente essencial = flag impulsiva imediata
    if (extractedMethod === 'cartao_mae' && category !== 'saude' && category !== 'essencial') {
      isImpulsive = true;
    }

    const tokens: ParsedTokens = {
      data: extractedDate,
      descricao: cleanedDescription,
      valor: extractedValue,
      metodo: extractedMethod,
      categoria: category,
      is_impulsive: isImpulsive,
    };

    const record: ExpenseRecord = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      data: extractedDate,
      descricao: cleanedDescription,
      valor: extractedValue,
      metodo_pagamento: extractedMethod,
      categoria: category,
      is_impulsive: isImpulsive,
      timestamp: Date.now(),
    };

    return {
      success: true,
      record,
      tokens,
    };
  }
}
