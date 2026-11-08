/** A aba Comprar: o que entra sozinho, o que ela põe à mão, Comprei, A caminho e Não veio. */
import { limparChave, listarLojas, precisa, unidades } from './estoque.ts';
import { APAGAR, type Consultorio, type Escritas, type LojaComId, type Unidade } from './tipos.ts';

/** A lista: o que chegou no mínimo (já contado) + o que ela pôs à mão, MENOS o que está a caminho. */
export const lista = (c: Consultorio): Unidade[] => unidades(c).filter(u => !c.caminho[u.k] && (precisa(u) || c.extra[u.k]));
export const aCaminho = (c: Consultorio): Unidade[] => unidades(c).filter(u => c.caminho[u.k]);
/** Os que ela pode pôr à mão (não estão na lista nem a caminho). */
export function foraDaLista(c: Consultorio): Unidade[] {
  const dentro = new Set(lista(c).map(u => u.k));
  return unidades(c).filter(u => !dentro.has(u.k) && !c.caminho[u.k]);
}

/** Quantos comprar: o que ela escolheu, ou a sugestão max(1, 2·mínimo − quanto tem). */
export const pedir = (c: Consultorio, u: Unidade): number => c.pedido[u.k] ?? Math.max(1, 2 * u.item.min - (u.o.qtd ?? 0));

export const mudarPedido = (u: Unidade, n: number): Escritas => ({ [`pedido.${u.k}`]: Math.max(1, Math.min(9999, Math.floor(n))) });
export const porNaLista = (u: Unidade): Escritas => ({ [`extra.${u.k}`]: true });

export const lojasComSite = (c: Consultorio): LojaComId[] => listarLojas(c).filter(l => l.site);

/** Pedi no site: sai da lista e vai para "A caminho" até chegar. (Balcão: a tela usa `chegou` do estoque.) */
export function pediNaLoja(c: Consultorio, u: Unidade, lojaId: string, q: number, agora: number): Escritas {
  return { [`caminho.${u.k}`]: { loja: lojaId, quando: agora, q: Math.max(1, Math.floor(q)) }, ...limparChave(c, u.k, ['pedido']) };
}

/** Não veio: sai de "A caminho" e volta para a lista. */
export const naoVeio = (u: Unidade): Escritas => ({ [`caminho.${u.k}`]: APAGAR });
