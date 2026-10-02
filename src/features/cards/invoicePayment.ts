// RN-02: pagamento de fatura é transferência entre contas próprias, não despesa nem receita.
// Reconhece pela descrição os nomes que os bancos costumam usar no extrato.

const normalize = (text: string) =>
  ` ${text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]+/g, ' ')
    .trim()} `;

const patterns = [
  / (pagamento|pagto|pgto|pag|pg) (de |do |da )?(fatura|fat|cartao)/, // "Pagamento de fatura", "PAGTO CARTAO CREDITO", "PAG FAT"
  / pagamento recebido /, // lado do cartão (Nubank e outros)
  / fatura (paga|cartao|do cartao)/, // "FATURA PAGA ITAU"
  / deb(ito)? aut(o|omatico)? (de )?(fat|fatura|cartao)/, // "DEB AUT FAT CARTAO"
  / (credito|cred) (de )?pagamento /, // "CREDITO DE PAGAMENTO" (cartão)
];

export function looksLikeInvoicePayment(description: string): boolean {
  const text = normalize(description);
  return patterns.some((p) => p.test(text));
}
