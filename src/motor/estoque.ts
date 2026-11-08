/** Ler o estoque e o uso do dia a dia: −, +, "Quanto tem", Chegou, Contar, Vence logo. */
import { diasEntre, type Dia } from './datas.ts';
import { fmt } from './unidades.ts';
import {
  APAGAR, INCREMENTO, type Consultorio, type Escritas, type GrupoComId, type ItemComId, type LojaComId, type Unidade,
} from './tipos.ts';

/* ---------- ler ---------- */
export const listarGrupos = (c: Consultorio): GrupoComId[] =>
  Object.entries(c.grupos).map(([id, g]) => ({ ...g, id })).sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id));

export const listarItens = (c: Consultorio): ItemComId[] =>
  Object.entries(c.itens).map(([id, i]) => ({ ...i, id })).sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id));

export const listarLojas = (c: Consultorio): LojaComId[] =>
  Object.entries(c.lojas).map(([id, l]) => ({ ...l, id })).sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id));

export const chaveDe = (itemId: string, corId: string | null): string => (corId ? `${itemId}_${corId}` : itemId);

/** Os contáveis de um material: ele mesmo, ou uma unidade por cor. */
export function unidadesDoItem(i: ItemComId): Unidade[] {
  if (!i.cores) return [{ k: i.id, item: i, corId: null, o: i, nome: i.nome, curto: i.nome }];
  return Object.entries(i.cores).map(([cid, cor]) => ({ cor, cid })).sort((a, b) => a.cor.ordem - b.cor.ordem || a.cid.localeCompare(b.cid))
    .map(({ cor, cid }) => ({ k: chaveDe(i.id, cid), item: i, corId: cid, o: cor, nome: `${i.nome} ${cor.nome}`, curto: cor.nome }));
}

/** Todos os contáveis, na ordem da tela: por grupo, depois a ordem do material. */
export function unidades(c: Consultorio): Unidade[] {
  const itens = listarItens(c);
  const out: Unidade[] = [];
  for (const g of listarGrupos(c)) for (const i of itens.filter(x => x.cat === g.id)) out.push(...unidadesDoItem(i));
  return out;
}

export const unidadeDe = (c: Consultorio, k: string): Unidade | undefined => unidades(c).find(u => u.k === k);

/** Chaves de compra de um material (ele e suas cores) ou de uma só cor. */
export function chavesDoItem(c: Consultorio, itemId: string, corId?: string): string[] {
  const todas = [...Object.keys(c.links), ...Object.keys(c.caminho), ...Object.keys(c.pedido), ...Object.keys(c.extra)];
  const alvo = corId ? chaveDe(itemId, corId) : null;
  return [...new Set(todas)].filter(k => (alvo ? k === alvo : k === itemId || k.startsWith(`${itemId}_`)));
}

/** Escritas que apagam o que as compras sabem de uma chave (a caminho, pedido, na lista, links). */
export function limparChave(c: Consultorio, k: string, so?: ('links' | 'caminho' | 'pedido' | 'extra')[]): Escritas {
  const e: Escritas = {};
  for (const campo of so ?? (['links', 'caminho', 'pedido', 'extra'] as const)) if (k in c[campo]) e[`${campo}.${k}`] = APAGAR;
  return e;
}

export const contada = (u: Unidade): boolean => u.o.qtd !== null;
/** Chegou no mínimo (e já foi contado). Mínimo 0 = nunca avisa. */
export const precisa = (u: Unidade): boolean => u.item.min > 0 && u.o.qtd !== null && u.o.qtd <= u.item.min;
export const total = (i: ItemComId): number | null => {
  if (!i.cores) return i.qtd;
  const q = Object.values(i.cores).map(c => c.qtd).filter((x): x is number => x !== null);
  return q.length ? q.reduce((s, x) => s + x, 0) : null;
};

/* ---------- Vence logo ---------- */
/** Dias até vencer (só se tem validade, data e estoque > 0). */
export function diasVence(u: Unidade, hoje: Dia): number | null {
  return u.item.val && u.o.vence && u.o.qtd !== null && u.o.qtd > 0 ? diasEntre(hoje, u.o.vence) : null;
}
export function venceLogo(c: Consultorio, hoje: Dia): Unidade[] {
  return unidades(c)
    .map(u => ({ u, d: diasVence(u, hoje) }))
    .filter((x): x is { u: Unidade; d: number } => x.d !== null && x.d <= c.antes)
    .sort((a, b) => a.d - b.d)
    .map(x => x.u);
}

/* ---------- uso: − e + ---------- */
export type ResultadoUso =
  | { tipo: 'ok'; escritas: Escritas; texto: string }
  | { tipo: 'zero'; texto: string }
  /** material nunca contado: não dá para somar a "nada"; a tela abre o Quanto tem */
  | { tipo: 'naoContado' };

const caminhoQtd = (u: Unidade): string => (u.corId ? `itens.${u.item.id}.cores.${u.corId}` : `itens.${u.item.id}`);
export const caminhoDe = caminhoQtd;

/** Usei um (−1) ou entrou um (+1). Soma com `increment()`: dois aparelhos offline somam. */
export function usar(u: Unidade, delta: 1 | -1): ResultadoUso {
  const q = u.o.qtd;
  if (q === null) return { tipo: 'naoContado' };
  if (delta < 0 && q <= 0) return { tipo: 'zero', texto: `${u.nome} já está em 0` };
  const novo = q + delta;
  const escritas: Escritas = { [`${caminhoQtd(u)}.qtd`]: INCREMENTO(delta) };
  if (novo === 0 && u.o.vence !== null) escritas[`${caminhoQtd(u)}.vence`] = null; // acabou: some a validade
  let texto = `${u.nome}: ${novo === 0 ? 'acabou' : `agora ${fmt(novo, u.item.un)}`}`;
  const antes = u.item.min > 0 && q <= u.item.min, depois = u.item.min > 0 && novo <= u.item.min;
  if (!antes && depois && novo > 0) texto += ' · foi para o Comprar';
  return { tipo: 'ok', escritas, texto };
}

/** "Quanto tem" e o Contar: grava o valor absoluto do número e da data. */
export function definirQuantidade(u: Unidade, qtd: number, vence: Dia | null): Escritas {
  const q = Math.max(0, Math.floor(qtd));
  return { [`${caminhoQtd(u)}.qtd`]: q, [`${caminhoQtd(u)}.vence`]: q > 0 && u.item.val ? vence || null : null };
}

/** Chegou: soma ao estoque. A data guardada é a mais próxima entre a que já existia (se ainda havia estoque) e a nova. */
export function chegou(c: Consultorio, u: Unidade, q: number, vence: Dia | null): Escritas {
  const n = Math.max(0, Math.floor(q));
  const e: Escritas = { [`${caminhoQtd(u)}.qtd`]: u.o.qtd === null ? n : INCREMENTO(n) };
  if (u.item.val && vence) {
    const antiga = u.o.vence && u.o.qtd !== null && u.o.qtd > 0 ? u.o.vence : null;
    const fica = antiga && antiga < vence ? antiga : vence;
    if (fica !== u.o.vence) e[`${caminhoQtd(u)}.vence`] = fica;
  }
  return { ...e, ...limparChave(c, u.k, ['caminho', 'pedido', 'extra']) };
}

/* ---------- Contar ---------- */
/** A ordem do Contar: todos os contáveis. */
export const ordemContar = (c: Consultorio): string[] => unidades(c).map(u => u.k);
/** Começa pelo primeiro não contado; se todos já foram contados, do início (para recontar todo mês). */
export function inicioContar(c: Consultorio): number {
  const i = unidades(c).findIndex(u => !contada(u));
  return i < 0 ? 0 : i;
}
