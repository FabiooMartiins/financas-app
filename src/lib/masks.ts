// Máscaras de digitação: o campo já mostra o formato enquanto a pessoa digita.

const digits = (text: string) => text.replace(/\D/g, '');

/**
 * Dinheiro: os dígitos entram pela direita, como na maquininha.
 * "1" -> "0,01", "123456" -> "1.234,56". Com allowNegative, um "-" em qualquer posição deixa negativo.
 * O resultado continua aceito por parseToCents (lib/money.ts).
 */
export function maskMoney(text: string, allowNegative = false): string {
  const negative = allowNegative && text.includes('-');
  const raw = digits(text).replace(/^0+/, '').slice(0, 13);
  if (!raw) return negative ? '-' : '';
  const padded = raw.padStart(3, '0');
  const integer = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}${integer},${padded.slice(-2)}`;
}

/** Telefone: (82) 99999-9999 ou (82) 3333-3333 */
export function maskPhone(text: string): string {
  const d = digits(text).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Agência: até 4 dígitos, com dígito verificador opcional (0001 ou 1234-5) */
export function maskBranch(text: string): string {
  const d = digits(text).slice(0, 5);
  return d.length <= 4 ? d : `${d.slice(0, 4)}-${d.slice(4)}`;
}

/** Conta: dígitos com o último separado por hífen (12345-6) */
export function maskBankAccount(text: string): string {
  const d = digits(text).slice(0, 13);
  return d.length <= 1 ? d : `${d.slice(0, -1)}-${d.slice(-1)}`;
}

/** Dia do mês: só números de 1 a 31 */
export function maskDay(text: string): string {
  const d = digits(text).slice(0, 2);
  if (!d) return '';
  return String(Math.min(Math.max(Number(d), 1), 31));
}
