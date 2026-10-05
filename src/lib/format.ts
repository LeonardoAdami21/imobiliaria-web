/**
 * Formatação e leitura de valores no padrão brasileiro.
 * A API trabalha com dinheiro em centavos (inteiro) e datas de calendário em AAAA-MM-DD.
 */

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 150000 → "R$ 1.500,00" */
export function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return '—';
  // O Intl usa espaço não separável depois de "R$"; troca por espaço comum para facilitar busca e testes.
  return brl.format(cents / 100).replace(/ /g, ' ');
}

/** 150000 → "1.500,00" (para dentro de campos de formulário) */
export function centsToInput(cents: number | null | undefined): string {
  return cents == null ? '' : decimal.format(cents / 100);
}

/**
 * Lê o que a pessoa digitou em um campo de dinheiro. Só os dígitos contam,
 * e os dois últimos são sempre os centavos: "1.500,00" e "150000" viram 150000.
 * Campo vazio vira null.
 */
export function inputToCents(text: string): number | null {
  const digits = text.replace(/\D/g, '');
  if (!digits) return null;
  return Number(digits.slice(0, 13));
}

/** "2026-03-05" → "05/03/2026". Não passa por Date, então não sofre com fuso horário. */
export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  const [year, month, day] = date.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2026-03" → "mar/2026" */
export function formatMonth(month: string): string {
  const [year, number] = month.split('-');
  return `${MONTHS[Number(number) - 1] ?? number}/${year}`;
}

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/** Instante ISO → "12/03/2026, 14:00" no fuso do navegador. */
export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dateTime.format(new Date(iso)) : '—';
}

/** Data de hoje no fuso do navegador, em AAAA-MM-DD (valor de um <input type="date">). */
export function todayIso(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Valor de <input type="datetime-local"> ("2026-03-12T14:00", hora local) → instante ISO em UTC. */
export function localInputToIso(value: string): string {
  return new Date(value).toISOString();
}

/** Instante ISO → valor de <input type="datetime-local"> na hora local. */
export function isoToLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "41999990000" → "(41) 99999-0000" */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}

/** "80010000" → "80010-000" */
export function formatZipCode(zipCode: string): string {
  return zipCode.length === 8 ? `${zipCode.slice(0, 5)}-${zipCode.slice(5)}` : zipCode;
}

/** 4.5 → "4,5%" */
export function formatPercent(value: number): string {
  return `${String(value).replace('.', ',')}%`;
}

/** Lê "4,5" ou "4.5" de um campo de percentual. Vazio ou inválido vira null. */
export function inputToPercent(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function formatAddress(address: {
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
}): string {
  const line = `${address.street}, ${address.number}${address.complement ? `, ${address.complement}` : ''}`;
  return `${line} – ${address.district}, ${address.city}/${address.state}`;
}
