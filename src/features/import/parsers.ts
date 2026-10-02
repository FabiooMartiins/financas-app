// Leitura de extratos OFX e CSV exportados pelo banco. Tudo roda no aparelho; nada é enviado antes da revisão.

export interface StatementEntry {
  date: string; // aaaa-mm-dd
  description: string;
  /** Com sinal: positivo = entrou na conta, negativo = saiu (no cartão: negativo = compra) */
  amountCents: number;
  /** Identificador do lançamento no banco (FITID do OFX ou coluna de ID do CSV) */
  bankId: string | null;
  /** Data como veio do banco, quando o app ajustou `date` (parcela do cartão) */
  bankDate?: string;
}

export interface Statement {
  entries: StatementEntry[];
  /** Saldo informado pelo banco no arquivo (OFX) */
  balance: { cents: number; date: string } | null;
  isCreditCard: boolean;
}

/** OFX de bancos brasileiros costuma vir em Windows-1252; os mais novos e os CSV, em UTF-8. */
export function decodeFile(buffer: ArrayBuffer): string {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    text = new TextDecoder('windows-1252').decode(buffer);
  }
  return text.replace(/^﻿/, '');
}

export function looksLikeOfx(text: string): boolean {
  return /<OFX>/i.test(text) || /^\s*OFXHEADER/i.test(text);
}

/**
 * Valor com sinal em centavos: "-1.234,56", "1234.56", "R$ 10,00", "(10,00)", "10,00 D".
 * Retorna null se não for um número.
 */
export function parseSignedAmount(input: string): number | null {
  let text = input.trim();
  if (!text) return null;
  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (/\s*D$/i.test(text)) {
    negative = true;
    text = text.replace(/\s*D$/i, '');
  } else {
    text = text.replace(/\s*C$/i, '');
  }
  text = text.replace(/R\$|\s/g, '');
  if (text.startsWith('-')) {
    negative = !negative;
    text = text.slice(1);
  } else if (text.startsWith('+')) {
    text = text.slice(1);
  }
  if (text.endsWith('-')) {
    negative = !negative;
    text = text.slice(0, -1);
  }
  if (!/^[\d.,]+$/.test(text)) return null;

  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  let normalized: string;
  if (lastComma >= 0 && lastDot >= 0) {
    // O separador que aparece por último é o decimal
    normalized = lastComma > lastDot ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
  } else if (lastComma >= 0) {
    normalized = text.replace(/\.(?=.*,)/g, '').replace(',', '.');
  } else if (lastDot >= 0) {
    // "1.234" (3 dígitos depois do ponto) é milhar; "12.5" e "12.50" são decimais
    const decimals = text.length - lastDot - 1;
    normalized = decimals === 3 || (text.match(/\./g) ?? []).length > 1 ? text.replace(/\./g, '') : text;
  } else {
    normalized = text;
  }
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  const cents = Math.round(value * 100);
  return negative ? -cents : cents;
}

/** "31/10/2026", "31/10/26", "2026-10-31", "31-10-2026", "31.10.2026", "20261031" -> "2026-10-31" */
export function parseDate(input: string): string | null {
  const text = input.trim();
  let year: number, month: number, day: number;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text) ?? /^(\d{4})(\d{2})(\d{2})/.exec(text);
  if (m) {
    [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else if ((m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})\b/.exec(text))) {
    [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (year < 100) year += 2000;
  } else {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- OFX

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&');
}

/** Valor de um campo; no OFX 1.x (SGML) os campos não têm tag de fechamento. */
function ofxField(block: string, tag: string): string | null {
  const match = new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i').exec(block);
  const value = match?.[1].trim();
  return value ? decodeEntities(value) : null;
}

export function parseOfx(text: string): Statement {
  const blocks = text
    .split(/<STMTTRN>/i)
    .slice(1)
    .map((b) => b.split(/<\/STMTTRN>/i)[0]);

  const entries: StatementEntry[] = [];
  for (const block of blocks) {
    const date = parseDate(ofxField(block, 'DTPOSTED') ?? '');
    const amount = parseSignedAmount(ofxField(block, 'TRNAMT') ?? '');
    if (!date || amount === null || amount === 0) continue;
    const name = ofxField(block, 'NAME');
    const memo = ofxField(block, 'MEMO');
    // Alguns bancos põem o detalhe em NAME, outros em MEMO: usa o mais completo, ou junta se forem diferentes
    let description = memo ?? name ?? '';
    if (name && memo) {
      const [longer, shorter] = memo.length >= name.length ? [memo, name] : [name, memo];
      description = longer.toLowerCase().includes(shorter.toLowerCase()) ? longer : `${name} - ${memo}`;
    }
    entries.push({ date, description: cleanDescription(description), amountCents: amount, bankId: ofxField(block, 'FITID') });
  }

  const ledger = /<LEDGERBAL>([\s\S]*?)(<\/LEDGERBAL>|<AVAILBAL>|<\/STMTRS>|<\/CCSTMTRS>)/i.exec(text)?.[1];
  const balanceCents = ledger ? parseSignedAmount(ofxField(ledger, 'BALAMT') ?? '') : null;
  const balanceDate = ledger ? parseDate(ofxField(ledger, 'DTASOF') ?? '') : null;

  return {
    entries,
    balance: balanceCents !== null && balanceDate ? { cents: balanceCents, date: balanceDate } : null,
    isCreditCard: /<CCSTMTRS>|<CREDITCARDMSGSRSV1>/i.test(text),
  };
}

function cleanDescription(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 200) || 'Sem descrição';
}

// ---------------------------------------------------------------- CSV

/** Separa linhas e colunas respeitando aspas. Detecta ; , ou tab pelo cabeçalho. */
export function parseCsv(text: string): string[][] {
  const firstLines = text.split(/\r?\n/).slice(0, 5).join('\n');
  const delimiter = [';', '\t', ','].reduce((best, d) => (count(firstLines, d) > count(firstLines, best) ? d : best), ';');

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim());
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell.trim());
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}

function count(text: string, ch: string): number {
  return text.split(ch).length - 1;
}

export interface CsvMapping {
  /** Linha do cabeçalho (antes dela costuma vir nome do banco, agência etc.) */
  headerRow: number;
  date: number;
  description: number;
  /** Uma coluna de valor com sinal... */
  amount: number | null;
  /** ...ou colunas separadas de entrada e saída */
  credit: number | null;
  debit: number | null;
  id: number | null;
  /** Valores positivos são gastos (comum em CSV de cartão, ex.: Nubank) */
  invert: boolean;
}

const normalizeHeader = (h: string) =>
  h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

/** Adivinha o cabeçalho e as colunas pelos nomes mais comuns dos bancos. */
export function detectCsvMapping(rows: string[][], isCreditCard: boolean): CsvMapping | null {
  const find = (headers: string[], patterns: RegExp[]) => {
    for (const pattern of patterns) {
      const index = headers.findIndex((h) => pattern.test(h));
      if (index >= 0) return index;
    }
    return -1;
  };

  for (let headerRow = 0; headerRow < Math.min(rows.length, 15); headerRow++) {
    const headers = rows[headerRow].map(normalizeHeader);
    const date = find(headers, [/^data$/, /^date$/, /data( do)? (lancamento|movimento|transacao|compra)/, /^data/, /date/]);
    if (date < 0) continue;
    const description = find(headers, [/descri/, /historico/, /^title$/, /estabelecimento/, /lancamento/, /memo/, /detalhe/, /^nome/]);
    const amount = find(headers, [/^valor( \(r\$\))?$/, /^amount$/, /^value$/, /valor/]);
    const credit = find(headers, [/^entradas?/, /credito/, /^credit/]);
    const debit = find(headers, [/^saidas?/, /debito/, /^debit/]);
    const id = find(headers, [/^identificador$/, /^id$/]);
    if (description < 0 || (amount < 0 && (credit < 0 || debit < 0))) continue;

    const mapping: CsvMapping = {
      headerRow,
      date,
      description,
      amount: amount >= 0 ? amount : null,
      credit: amount < 0 ? credit : null,
      debit: amount < 0 ? debit : null,
      id: id >= 0 ? id : null,
      invert: false,
    };
    // Cartão: se quase tudo vem positivo, os positivos são compras
    if (isCreditCard) {
      const values = csvEntries(rows, mapping).map((e) => e.amountCents);
      mapping.invert = values.filter((v) => v > 0).length > values.length / 2;
    }
    return mapping;
  }
  return null;
}

export function csvEntries(rows: string[][], mapping: CsvMapping): StatementEntry[] {
  const entries: StatementEntry[] = [];
  for (const row of rows.slice(mapping.headerRow + 1)) {
    const date = parseDate(row[mapping.date] ?? '');
    if (!date) continue;
    let amount: number | null;
    if (mapping.amount !== null) {
      amount = parseSignedAmount(row[mapping.amount] ?? '');
    } else {
      const credit = parseSignedAmount(row[mapping.credit ?? -1] ?? '') ?? 0;
      const debit = parseSignedAmount(row[mapping.debit ?? -1] ?? '') ?? 0;
      amount = Math.abs(credit) - Math.abs(debit);
    }
    if (amount === null || amount === 0) continue;
    entries.push({
      date,
      description: cleanDescription(row[mapping.description] ?? ''),
      amountCents: mapping.invert ? -amount : amount,
      bankId: mapping.id !== null ? row[mapping.id] || null : null,
    });
  }
  return entries;
}
