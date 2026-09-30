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

/** "1.234,56" ou "1234,56" -> 123456. Retorna null se inválido. */
export function parseToCents(input: string): number | null {
  const normalized = input.replace(/[^\d,]/g, '').replace(',', '.');
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}
