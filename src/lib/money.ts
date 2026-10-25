// Valores monetários sempre em centavos (inteiros) — ver RNF-12.

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 123456 -> "R$ 1.234,56" */
export function formatCents(cents: number): string {
  return brl.format(cents / 100);
}

/** Com sinal: receitas "+ R$ 10,00", despesas "− R$ 10,00" */
export function formatSignedCents(cents: number, type: 'income' | 'expense'): string {
  return `${type === 'income' ? '+' : '−'} ${formatCents(Math.abs(cents))}`;
}

/**
 * "1.234,56", "1234,56", "1234.5" ou "1234" -> centavos. Retorna null se inválido.
 * Ponto seguido de 1 ou 2 dígitos no fim é tratado como decimal (teclado em inglês).
 */
export function parseToCents(input: string): number | null {
  let text = input.trim().replace(/[^\d.,]/g, '');
  if (!text) return null;
  if (!text.includes(',') && /\.\d{1,2}$/.test(text)) {
    text = text.replace(/\.(?=\d{1,2}$)/, ',');
  }
  const normalized = text.replace(/\./g, '').replace(',', '.');
  if (!/^\d*\.?\d*$/.test(normalized) || normalized === '.') return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}

/** 123456 -> "1.234,56" (para preencher campos de edição, no mesmo formato da máscara) */
export function centsToInput(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const [integer, decimals] = (Math.abs(cents) / 100).toFixed(2).split('.');
  return `${sign}${integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimals}`;
}
