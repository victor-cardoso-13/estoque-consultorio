/**
 * Datas como texto AAAA-MM-DD, sempre no calendário LOCAL (nunca `new Date('2026-12-01')`, que é UTC e erra um dia no Brasil).
 * O "hoje" é sempre passado de fora, para os testes controlarem.
 */
export type Dia = string;

const dois = (n: number) => String(n).padStart(2, '0');

export function diaLocal(d: Date = new Date()): Dia {
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}
export const hoje = (): Dia => diaLocal(new Date());

export function diaValido(s: unknown): s is Dia {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [a, m, d] = s.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(a, m - 1, d));
  return t.getUTCFullYear() === a && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

const utc = (s: Dia): number => { const [a, m, d] = s.split('-').map(Number) as [number, number, number]; return Date.UTC(a, m - 1, d); };

/** Quantos dias de `de` até `ate` (negativo = já passou). */
export const diasEntre = (de: Dia, ate: Dia): number => Math.round((utc(ate) - utc(de)) / 86_400_000);

/** Soma dias a um dia (para os testes e para o demo). */
export function somarDias(d: Dia, n: number): Dia {
  const t = new Date(utc(d) + n * 86_400_000);
  return `${t.getUTCFullYear()}-${dois(t.getUTCMonth() + 1)}-${dois(t.getUTCDate())}`;
}

export const ddmm = (d: Dia): string => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

/** "vence em 12 dias", "vence hoje", "vence amanhã", "venceu". */
export function textoVence(dias: number): string {
  return dias < 0 ? 'venceu' : dias === 0 ? 'vence hoje' : dias === 1 ? 'vence amanhã' : `vence em ${dias} dias`;
}

/** "hoje", "ontem", "há 3 dias" para um instante (milissegundos), pelo calendário local. */
export function haQuanto(quandoMs: number, agora: Dia): string {
  const n = Math.max(0, diasEntre(diaLocal(new Date(quandoMs)), agora));
  return n === 0 ? 'hoje' : n === 1 ? 'ontem' : `há ${n} dias`;
}
