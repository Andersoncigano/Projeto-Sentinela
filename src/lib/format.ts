/**
 * Formata um valor numérico em moeda brasileira (BRL),
 * ou retorna 'R$ •••••' caso o modo de privacidade esteja ativo (isHidden = true).
 */
export function formatCurrency(value: number, isHidden: boolean): string {
  if (isHidden) {
    return 'R$ •••••';
  }
  return `R$ ${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
