/**
 * Ler o documento que vem da nuvem. NADA que chega de fora é confiado: textos são cortados, números viram inteiros
 * dentro de limites (negativo vira 0: dois aparelhos offline podem somar abaixo de zero), ids ruins e links de
 * outro site são descartados. Assim a tela nunca recebe dado estranho.
 */
import { diaValido } from './datas.ts';
import { ID_OK } from './ids.ts';
import { linkOk } from './lojas.ts';
import {
  LIMITES, type Caminho, type Consultorio, type Cor, type Grupo, type Item, type Loja,
} from './tipos.ts';

const obj = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const texto = (v: unknown, max: number, padrao = ''): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : padrao);
const inteiro = (v: unknown, min: number, max: number, padrao: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.floor(v))) : padrao;
const qtd = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(LIMITES.quantidade, Math.floor(v))) : null);
const dia = (v: unknown): string | null => (diaValido(v) ? v : null);
/** chave de compra: `luva` ou `resina_A2` */
export const CHAVE_OK = /^[A-Za-z0-9]{1,24}(_[A-Za-z0-9]{1,24})?$/;

export function lerConsultorio(dados: unknown): Consultorio {
  const d = obj(dados);
  const membros = Array.isArray(d.membros) ? d.membros.filter((m): m is string => typeof m === 'string').map(m => m.toLowerCase().slice(0, 120)).slice(0, 4) : [];
  const antes = typeof d.antes === 'number' && (LIMITES.antes as readonly number[]).includes(d.antes) ? d.antes : 30;

  const grupos: Record<string, Grupo> = {};
  for (const [id, g] of Object.entries(obj(d.grupos)).slice(0, LIMITES.grupos)) {
    const x = obj(g);
    if (!ID_OK.test(id) || !texto(x.nome, LIMITES.grupo)) continue;
    grupos[id] = { nome: texto(x.nome, LIMITES.grupo), ic: texto(x.ic, LIMITES.figurinha, '🗂️'), ordem: inteiro(x.ordem, 0, 9999, 0) };
  }

  const lojas: Record<string, Loja> = {};
  for (const [id, l] of Object.entries(obj(d.lojas)).slice(0, LIMITES.lojas)) {
    const x = obj(l);
    if (!ID_OK.test(id) || !texto(x.nome, LIMITES.loja)) continue;
    const site = texto(x.site, LIMITES.site);
    const siteOk = site && /^https:\/\//.test(site) && linkOk(site + '/', site) ? site : '';
    const busca = siteOk && typeof x.busca === 'string' && x.busca.length <= LIMITES.link && linkOk(x.busca, siteOk) ? x.busca : '';
    lojas[id] = { nome: texto(x.nome, LIMITES.loja), site: siteOk, busca, ordem: inteiro(x.ordem, 0, 9999, 0) };
  }

  const itens: Record<string, Item> = {};
  for (const [id, it] of Object.entries(obj(d.itens)).slice(0, LIMITES.itens)) {
    const x = obj(it);
    const nome = texto(x.nome, LIMITES.nome);
    if (!ID_OK.test(id) || !nome) continue;
    const val = x.val === true;
    let cores: Record<string, Cor> | null = null;
    if (x.cores !== undefined && x.cores !== null) {
      cores = {};
      for (const [cid, c] of Object.entries(obj(x.cores)).slice(0, LIMITES.cores)) {
        const y = obj(c);
        if (!ID_OK.test(cid) || !texto(y.nome, LIMITES.cor)) continue;
        cores[cid] = { nome: texto(y.nome, LIMITES.cor), qtd: qtd(y.qtd), vence: val ? dia(y.vence) : null, ordem: inteiro(y.ordem, 0, 9999, 0) };
      }
    }
    const grupo = grupos[String(x.cat)] ? String(x.cat) : Object.keys(grupos)[0] ?? '';
    itens[id] = {
      nome, ic: texto(x.ic, LIMITES.figurinha, '🦷'), cat: grupo, un: texto(x.un, 12, 'unidade'),
      min: inteiro(x.min, 0, LIMITES.min, 1), val,
      busca: texto(x.busca, LIMITES.busca) || null,
      qtd: cores ? null : qtd(x.qtd), vence: !cores && val ? dia(x.vence) : null,
      ordem: inteiro(x.ordem, 0, 9999, 0), cores,
    };
  }

  const links: Record<string, Record<string, string>> = {};
  for (const [k, porLoja] of Object.entries(obj(d.links))) {
    if (!CHAVE_OK.test(k)) continue;
    const certos: Record<string, string> = {};
    for (const [lid, url] of Object.entries(obj(porLoja))) {
      const loja = lojas[lid];
      if (loja?.site && typeof url === 'string' && linkOk(url, loja.site)) certos[lid] = url;
    }
    if (Object.keys(certos).length) links[k] = certos;
  }
  const caminho: Record<string, Caminho> = {};
  for (const [k, c] of Object.entries(obj(d.caminho))) {
    const x = obj(c);
    if (!CHAVE_OK.test(k) || typeof x.loja !== 'string') continue;
    caminho[k] = { loja: x.loja.slice(0, 24), quando: inteiro(x.quando, 0, 8.64e15, 0), q: inteiro(x.q, 1, 9999, 1) };
  }
  const pedido: Record<string, number> = {};
  for (const [k, n] of Object.entries(obj(d.pedido))) if (CHAVE_OK.test(k) && typeof n === 'number') pedido[k] = inteiro(n, 1, 9999, 1);
  const extra: Record<string, true> = {};
  for (const [k, v] of Object.entries(obj(d.extra))) if (CHAVE_OK.test(k) && v === true) extra[k] = true;

  return { membros, nome: texto(d.nome, LIMITES.nome, 'Consultório da Andressa'), antes, grupos, itens, lojas, links, caminho, pedido, extra };
}
