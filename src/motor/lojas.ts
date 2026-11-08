/** Abrir as lojas: o termo de busca, o endereço e a regra do link de produto. */
import { LIMITES, type Consultorio, type LojaComId, type Unidade } from './tipos.ts';

/** O nome sem o que está entre parênteses: "Top Dam (barreira gengival)" → "Top Dam". */
export const termoPadrao = (nome: string): string => nome.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();

/** O termo do material (sem a cor): o campo "busca" ou o nome sem parênteses. */
export const termoBase = (nome: string, busca: string | null | undefined): string =>
  (busca ?? '').trim().slice(0, LIMITES.busca) || termoPadrao(nome);

/** O termo completo: em material com cor, a cor entra no fim ("Resina B1"). */
export const termo = (u: Unidade): string => {
  const cor = u.corId ? u.item.cores?.[u.corId]?.nome : '';
  return `${termoBase(u.item.nome, u.item.busca)}${cor ? ` ${cor}` : ''}`.trim();
};

const semWww = (h: string): string => h.replace(/^www\./, '');

/** Só https:// e do MESMO domínio da loja (ou subdomínio; "www." tanto faz). Bloqueia javascript: e site falso. */
export function linkOk(url: string, site: string): boolean {
  if (url.length > LIMITES.link) return false;
  try {
    const a = new URL(url), b = new URL(site);
    if (a.protocol !== 'https:' || a.username || a.password) return false;
    const ha = semWww(a.hostname), hb = semWww(b.hostname);
    return ha === hb || ha.endsWith(`.${hb}`);
  } catch { return false; }
}

/** O site de uma loja nova: https://…, até 100, sem barra no fim. Vazio = balcão. null = inválido. */
export function limparSite(texto: string): string | null {
  const t = texto.trim().replace(/\/+$/, '');
  if (!t) return '';
  if (t.length > LIMITES.site || !/^https:\/\/[^\s/]+(\/\S*)?$/.test(t)) return null;
  try { const u = new URL(t); return u.username || u.password ? null : t; } catch { return null; }
}

/** O endereço da busca (loja que sabe buscar) ou o site. */
export const urlBusca = (loja: LojaComId | { site: string; busca: string }, t: string): string =>
  loja.busca ? loja.busca + encodeURIComponent(t) : loja.site;

/** O link de produto guardado para esta loja (só vale se passar no teste). */
export function linkDoProduto(c: Consultorio, loja: LojaComId, u: Unidade): string | null {
  const l = c.links[u.k]?.[loja.id];
  return l && loja.site && linkOk(l, loja.site) ? l : null;
}

/** Para onde o botão da loja leva: o link do produto, ou a busca, ou o site. */
export const endereco = (c: Consultorio, loja: LojaComId, u: Unidade): string =>
  linkDoProduto(c, loja, u) ?? urlBusca(loja, termo(u));
