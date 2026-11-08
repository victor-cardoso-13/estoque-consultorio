/** Plural das unidades (galão → galões) e "3 caixas". */
const PLURAL: Record<string, string> = {
  caixa: 'caixas', pacote: 'pacotes', seringa: 'seringas', frasco: 'frascos', kit: 'kits', tubo: 'tubos',
  rolo: 'rolos', bloco: 'blocos', pote: 'potes', 'galão': 'galões', unidade: 'unidades',
};
export const plural = (un: string): string => PLURAL[un] ?? `${un}s`;
/** Só a palavra, certa para o número: 1 caixa, 2 caixas. */
export const palavra = (q: number, un: string): string => (q === 1 ? un : plural(un));
export const fmt = (q: number, un: string): string => `${q} ${palavra(q, un)}`;
