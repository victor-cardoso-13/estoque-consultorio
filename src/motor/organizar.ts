/** Organizar: materiais, grupos, lojas e avisos. Toda função devolve escritas (ou um erro em português simples). */
import { chavesDoItem, limparChave, listarGrupos, listarItens, listarLojas, total } from './estoque.ts';
import { idCor, norm } from './ids.ts';
import { limparSite, linkOk, termoPadrao } from './lojas.ts';
import { APAGAR, LIMITES, type Consultorio, type Cor, type Escritas, type Item } from './tipos.ts';

export type Resultado = { erro: string } | { erro?: undefined; escritas: Escritas; id: string };

const corta = (t: string, n: number): string => t.replace(/\s+/g, ' ').trim().slice(0, n);
const diff = (e: Escritas, caminho: string, novo: unknown, antigo: unknown): void => { if (novo !== antigo) e[caminho] = novo; };

/* ---------- materiais ---------- */
export interface DadosMaterial {
  id: string | null;
  ic: string;
  nome: string;
  cat: string;
  un: string;
  min: number;
  busca: string;
  val: boolean;
  temCores: boolean;
  /** nomes das cores, na ordem */
  cores: string[];
}

export function dadosDoMaterial(c: Consultorio, id: string | null, padrao: Partial<DadosMaterial> = {}): DadosMaterial {
  const i = id ? c.itens[id] : undefined;
  if (!i) {
    return { id: null, ic: '🦷', nome: '', cat: listarGrupos(c)[0]?.id ?? '', un: 'caixa', min: 1, busca: '', val: false, temCores: false, cores: [], ...padrao };
  }
  const cores = i.cores ? Object.values(i.cores).sort((a, b) => a.ordem - b.ordem).map(x => x.nome) : [];
  return { id: id!, ic: i.ic, nome: i.nome, cat: i.cat, un: i.un, min: i.min, busca: i.busca ?? '', val: i.val, temCores: !!i.cores, cores };
}

/** Cria ou salva um material. `idNovo` só vale para material novo. */
export function salvarMaterial(c: Consultorio, d: DadosMaterial, idNovo: string): Resultado {
  const nome = corta(d.nome, LIMITES.nome);
  if (!nome) return { erro: 'Escreva o nome do material.' };
  if (listarItens(c).some(i => i.id !== d.id && norm(i.nome) === norm(nome))) return { erro: 'Já existe um material com esse nome.' };
  const nomesCores: string[] = [];
  for (const n of d.cores.map(x => corta(x, LIMITES.cor)).filter(Boolean)) if (!nomesCores.some(x => norm(x) === norm(n))) nomesCores.push(n);
  if (d.temCores && !nomesCores.length) return { erro: 'Ponha pelo menos uma cor, ou desligue "Separar por cor".' };
  if (nomesCores.length > LIMITES.cores) return { erro: `No máximo ${LIMITES.cores} cores.` };
  if (!d.id && Object.keys(c.itens).length >= LIMITES.itens) return { erro: `O limite é ${LIMITES.itens} materiais.` };
  const cat = c.grupos[d.cat] ? d.cat : listarGrupos(c)[0]?.id;
  if (!cat) return { erro: 'Crie um grupo antes.' };
  const min = Math.max(0, Math.min(LIMITES.min, Math.floor(Number(d.min)) || 0));
  const busca = corta(d.busca, LIMITES.busca);
  const buscaFinal = busca && busca !== termoPadrao(nome) ? busca : null;
  const ic = (d.ic || '').slice(0, LIMITES.figurinha) || '🦷';
  const cores = d.temCores ? nomesCores : [];

  const velho = d.id ? c.itens[d.id] : undefined;
  if (!velho) {
    const ordem = Math.max(-1, ...listarItens(c).map(i => i.ordem)) + 1;
    const item: Item = { nome, ic, cat, un: d.un, min, val: d.val, busca: buscaFinal, qtd: null, vence: null, ordem, cores: null };
    if (cores.length) {
      item.cores = {};
      const usados: string[] = [];
      cores.forEach((n, o) => { const cid = idCor(n, usados); usados.push(cid); item.cores![cid] = { nome: n, qtd: null, vence: null, ordem: o }; });
    }
    return { escritas: { [`itens.${idNovo}`]: item }, id: idNovo };
  }

  const id = d.id!;
  const e: Escritas = {};
  const p = `itens.${id}`;
  diff(e, `${p}.nome`, nome, velho.nome); diff(e, `${p}.ic`, ic, velho.ic); diff(e, `${p}.cat`, cat, velho.cat);
  diff(e, `${p}.un`, d.un, velho.un); diff(e, `${p}.min`, min, velho.min); diff(e, `${p}.val`, d.val, velho.val);
  diff(e, `${p}.busca`, buscaFinal, velho.busca);
  const semValidade = !d.val; // desligou a validade: some a data de tudo

  if (!d.temCores && !velho.cores) { // continua sem cores
    if (semValidade && velho.vence !== null) e[`${p}.vence`] = null;
  } else if (d.temCores && !velho.cores) { // ligou as cores: o número passa para a 1ª cor
    const mapa: Record<string, Cor> = {};
    const usados: string[] = [];
    cores.forEach((n, o) => {
      const cid = idCor(n, usados); usados.push(cid);
      mapa[cid] = { nome: n, qtd: o === 0 ? velho.qtd : null, vence: o === 0 && !semValidade ? velho.vence : null, ordem: o };
    });
    e[`${p}.cores`] = mapa; e[`${p}.qtd`] = null; e[`${p}.vence`] = null;
  } else if (!d.temCores && velho.cores) { // desligou as cores: soma o que foi contado
    const cs = Object.values(velho.cores);
    const datas = cs.filter(x => x.qtd !== null && x.qtd > 0 && x.vence).map(x => x.vence!).sort();
    e[`${p}.qtd`] = total({ ...velho, id } as never);
    e[`${p}.vence`] = semValidade ? null : datas[0] ?? null;
    e[`${p}.cores`] = APAGAR;
    for (const k of chavesDoItem(c, id)) if (k !== id) Object.assign(e, limparChave(c, k));
  } else { // continua com cores: mexe só nas que mudaram
    const atuais = Object.entries(velho.cores!);
    const usados = atuais.map(([cid]) => cid);
    const manter = new Set<string>();
    cores.forEach((n, o) => {
      const achou = atuais.find(([, x]) => norm(x.nome) === norm(n));
      if (achou) {
        manter.add(achou[0]);
        diff(e, `${p}.cores.${achou[0]}.ordem`, o, achou[1].ordem);
        if (semValidade && achou[1].vence !== null) e[`${p}.cores.${achou[0]}.vence`] = null;
      } else {
        const cid = idCor(n, usados); usados.push(cid);
        e[`${p}.cores.${cid}`] = { nome: n, qtd: null, vence: null, ordem: o } satisfies Cor;
      }
    });
    for (const [cid] of atuais) if (!manter.has(cid)) {
      e[`${p}.cores.${cid}`] = APAGAR;
      Object.assign(e, limparChave(c, `${id}_${cid}`));
    }
  }
  return { escritas: e, id };
}

/** Apaga o material e tudo que as compras sabiam dele. O inverso devolve tudo. */
export function apagarMaterial(c: Consultorio, id: string): Escritas {
  const e: Escritas = { [`itens.${id}`]: APAGAR };
  for (const k of chavesDoItem(c, id)) Object.assign(e, limparChave(c, k));
  return e;
}

/* ---------- grupos ---------- */
export function salvarGrupo(c: Consultorio, d: { id: string | null; nome: string; ic: string }, idNovo: string): Resultado {
  const nome = corta(d.nome, LIMITES.grupo);
  if (!nome) return { erro: 'Escreva o nome do grupo.' };
  const ic = (d.ic || '').slice(0, LIMITES.figurinha) || '🗂️';
  if (d.id && c.grupos[d.id]) {
    const e: Escritas = {};
    diff(e, `grupos.${d.id}.nome`, nome, c.grupos[d.id]!.nome); diff(e, `grupos.${d.id}.ic`, ic, c.grupos[d.id]!.ic);
    return { escritas: e, id: d.id };
  }
  if (Object.keys(c.grupos).length >= LIMITES.grupos) return { erro: `O limite é ${LIMITES.grupos} grupos.` };
  const ordem = Math.max(-1, ...listarGrupos(c).map(g => g.ordem)) + 1;
  return { escritas: { [`grupos.${idNovo}`]: { nome, ic, ordem } }, id: idNovo };
}

/** Apagar um grupo move os materiais dele para o primeiro outro grupo. Precisa sobrar um. */
export function apagarGrupo(c: Consultorio, id: string): { escritas: Escritas; destino: string } | null {
  const outro = listarGrupos(c).find(g => g.id !== id);
  if (!outro || !c.grupos[id]) return null;
  const e: Escritas = { [`grupos.${id}`]: APAGAR };
  for (const i of listarItens(c)) if (i.cat === id) e[`itens.${i.id}.cat`] = outro.id;
  return { escritas: e, destino: outro.nome };
}

/** ▲ (-1) ou ▼ (+1): regrava a posição de todos os grupos que mudaram. */
export function moverGrupo(c: Consultorio, id: string, dir: -1 | 1): Escritas {
  const ids = listarGrupos(c).map(g => g.id);
  const i = ids.indexOf(id), j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return {};
  [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  const e: Escritas = {};
  ids.forEach((gid, pos) => diff(e, `grupos.${gid}.ordem`, pos, c.grupos[gid]!.ordem));
  return e;
}

/* ---------- lojas ---------- */
export function salvarLoja(c: Consultorio, d: { id: string | null; nome: string; site: string }, idNovo: string): Resultado {
  const nome = corta(d.nome, LIMITES.loja);
  if (!nome) return { erro: 'Escreva o nome da loja.' };
  const site = limparSite(d.site);
  if (site === null) return { erro: 'O site precisa começar com https://' };
  const velha = d.id ? c.lojas[d.id] : undefined;
  if (velha) {
    const e: Escritas = {};
    diff(e, `lojas.${d.id}.nome`, nome, velha.nome);
    if (site !== velha.site) { e[`lojas.${d.id}.site`] = site; e[`lojas.${d.id}.busca`] = ''; } // outro site: a busca antiga não vale mais
    return { escritas: e, id: d.id! };
  }
  if (Object.keys(c.lojas).length >= LIMITES.lojas) return { erro: `O limite é ${LIMITES.lojas} lojas.` };
  const ordem = Math.max(-1, ...listarLojas(c).map(l => l.ordem)) + 1;
  return { escritas: { [`lojas.${idNovo}`]: { nome, site, busca: '', ordem } }, id: idNovo };
}

/** Apagar loja (sobra pelo menos uma): some o link dela e o que estava "a caminho" dela volta para a lista. */
export function apagarLoja(c: Consultorio, id: string): Escritas | null {
  if (!c.lojas[id] || Object.keys(c.lojas).length < 2) return null;
  const e: Escritas = { [`lojas.${id}`]: APAGAR };
  for (const [k, porLoja] of Object.entries(c.links)) if (id in porLoja) e[`links.${k}.${id}`] = APAGAR;
  for (const [k, cam] of Object.entries(c.caminho)) if (cam.loja === id) e[`caminho.${k}`] = APAGAR;
  return e;
}

/**
 * "Procurar nas lojas": o texto de busca do material e o link de produto de cada loja.
 * Link só vale se for https e do site da loja; senão devolve o erro para a folha mostrar.
 */
export function salvarBusca(c: Consultorio, itemId: string, corId: string | null, termo: string, links: Record<string, string>): Resultado {
  const item = c.itens[itemId];
  if (!item) return { erro: 'Esse material não existe mais.' };
  const e: Escritas = {};
  const k = corId ? `${itemId}_${corId}` : itemId;
  const velhos = c.links[k] ?? {};
  for (const [loja, l] of Object.entries(c.lojas)) {
    const novo = (links[loja] ?? '').trim();
    if (!novo) { if (loja in velhos) e[`links.${k}.${loja}`] = APAGAR; continue; }
    if (!l.site || !linkOk(novo, l.site)) return { erro: `Esse link não é do site da ${l.nome}. Ele precisa começar com ${l.site}/` };
    diff(e, `links.${k}.${loja}`, novo, velhos[loja]);
  }
  const t = corta(termo, LIMITES.busca);
  diff(e, `itens.${itemId}.busca`, t && t !== termoPadrao(item.nome) ? t : null, item.busca);
  return { escritas: e, id: itemId };
}

/* ---------- avisos ---------- */
export const definirAntes = (c: Consultorio, n: number): Escritas =>
  (LIMITES.antes as readonly number[]).includes(n) && n !== c.antes ? { antes: n } : {};
