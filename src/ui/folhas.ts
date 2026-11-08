/**
 * As janelas que sobem de baixo ("folhas"): Contar, Quanto tem / Chegou, Comprei, Procurar nas lojas, Loja, Pôr na lista,
 * Grupo e Editar material. Cada folha tem um estado (`F`); digitar muda o estado sem redesenhar (o teclado não fecha),
 * e os botões mudam o estado e redesenham.
 */
import { foraDaLista, lojasComSite, pediNaLoja, pedir } from '../motor/compras.ts';
import { chegou, definirQuantidade, ordemContar, inicioContar, unidadeDe } from '../motor/estoque.ts';
import { diaValido } from '../motor/datas.ts';
import { FIGURINHAS, ultimoEmoji } from '../motor/emoji.ts';
import { norm, novoId } from '../motor/ids.ts';
import { termoBase, termoPadrao } from '../motor/lojas.ts';
import {
  apagarGrupo, apagarLoja, apagarMaterial, dadosDoMaterial, salvarBusca, salvarGrupo, salvarLoja, salvarMaterial, type DadosMaterial,
} from '../motor/organizar.ts';
import { LIMITES, UNIDADES, type Unidade } from '../motor/tipos.ts';
import { fmt, palavra, plural } from '../motor/unidades.ts';
import { listarGrupos, listarLojas } from '../motor/estoque.ts';
import { esconderAviso } from './aviso.ts';
import { avisar, fazer, render, S } from './estado.ts';
import { escapar as e } from './seguranca.ts';

type Dados = DadosMaterial & { nova: string };
type Folha =
  | { tipo: 'contar'; ks: string[]; i: number; q: number; vence: string; mexeu: boolean; feitos: number }
  | { tipo: 'ajustar'; k: string; q: number; vence: string }
  | { tipo: 'chegou'; k: string; q: number; vence: string }
  | { tipo: 'comprei'; k: string; q: number }
  | { tipo: 'link'; k: string; termo: string; v: Record<string, string>; erro: string }
  | { tipo: 'loja'; id: string | null; nome: string; site: string; erro: string }
  | { tipo: 'outro' }
  | { tipo: 'grupo'; id: string | null; nome: string; ic: string; erro: string }
  | { tipo: 'editar'; novo: boolean; d: Dados; erro: string };

let F: Folha | null = null;
const $ = (id: string) => document.getElementById(id)!;
const inteiro = (v: unknown): number => Math.max(0, Math.min(LIMITES.quantidade, parseInt(String(v), 10) || 0));

/* ---------- base ---------- */
let abertaEm = 0;
let comecouNoFundo = false;

/** iPhone: o teclado cobre a parte de baixo da tela sem avisar a página. Mede o que sobrou e sobe a janela. */
function ajustarTeclado(): void {
  const v = window.visualViewport;
  const px = v ? Math.max(0, Math.round(window.innerHeight - v.height - v.offsetTop)) : 0;
  document.documentElement.style.setProperty('--teclado', `${px}px`);
  const campo = document.activeElement as HTMLElement | null;
  if (px > 0 && campo?.closest('#folha') && /^(INPUT|TEXTAREA)$/.test(campo.tagName)) campo.scrollIntoView({ block: 'center' });
}
window.visualViewport?.addEventListener('resize', ajustarTeclado);
window.visualViewport?.addEventListener('scroll', ajustarTeclado);
document.addEventListener('focusin', () => setTimeout(ajustarTeclado, 300));

export const folhaAberta = (): boolean => F !== null;

export function fechar(): void { F = null; $('folha').innerHTML = ''; }

function abrir(f: Folha): void { if (!F) abertaEm = Date.now(); F = f; esconderAviso(); desenhar(); }

function numero(q: number, un: string, campo = 'q'): string {
  return `<div class="grande-n"><button class="claro" data-f="${campo}" data-d="-1" aria-label="Menos">−</button>
    <div class="num"><input id="fq" inputmode="numeric" pattern="[0-9]*" value="${q}" data-campo="${campo}" aria-label="Quantidade" maxlength="5"><small>${palavra(q, un)}</small></div>
    <button data-f="${campo}" data-d="1" aria-label="Mais">+</button></div>`;
}
function campoData(v: string): string {
  return `<div class="rot">Vence em (a que vence primeiro)</div><div class="data-l"><input type="date" id="fv" value="${e(v)}" data-campo="vence" aria-label="Data de validade"><button data-limpa-data>Sem data</button></div>`;
}
const cabeca = (u: Unidade, rotulo: string) => `<div class="cabeca-item"><span class="e">${e(u.item.ic)}</span><div class="tx"><small>${rotulo}</small><h2>${e(u.nome)}</h2></div></div>`;

/* ---------- desenhar ---------- */
function corpo(f: Folha): string {
  const cs = S.c!;
  if (f.tipo === 'contar') {
    const u = unidadeDe(cs, f.ks[f.i]!);
    if (!u) return '<p>Esse material não existe mais.</p><button class="cancela" data-acao="fechar">Fechar</button>';
    return `<div class="barra-contar"><i style="width:${Math.round((f.i + 1) / f.ks.length * 100)}%"></i></div>
      <div class="cabeca-item"><span class="e">${e(u.item.ic)}</span><div class="tx"><small>Contando · ${f.i + 1} de ${f.ks.length}</small><h2>${e(u.nome)}</h2></div></div>
      <p class="dica">Quantos ${plural(u.item.un)} tem agora?</p>
      ${numero(f.q, u.item.un)}
      ${u.item.val ? campoData(f.vence) : ''}
      <div class="dois"><button class="ok claro" data-acao="ant" ${f.i === 0 ? 'disabled' : ''}>‹ Anterior</button><button class="ok" data-acao="prox">${f.i === f.ks.length - 1 ? 'Terminar' : 'Próximo ›'}</button></div>
      <button class="cancela" data-acao="parar">Parar por aqui</button>`;
  }
  if (f.tipo === 'ajustar' || f.tipo === 'chegou') {
    const u = unidadeDe(cs, f.k);
    if (!u) return '<p>Esse material não existe mais.</p><button class="cancela" data-acao="fechar">Fechar</button>';
    const ch = f.tipo === 'chegou';
    return `${cabeca(u, ch ? 'Chegou' : 'Quanto tem')}
      <p class="dica">${ch ? `Quantos chegaram? Hoje ${u.o.qtd === null ? 'ainda não foi contado' : `tem ${fmt(u.o.qtd, u.item.un)}`}.` : 'Corrija o número contando o que tem na gaveta.'}</p>
      ${numero(f.q, u.item.un)}
      ${u.item.val ? campoData(f.vence) : ''}
      ${u.item.val ? `<p class="dica">${ch ? 'A validade do que chegou. O app guarda a que vence primeiro.' : 'Se tiver mais de um, ponha a data do que vence primeiro.'}</p>` : ''}
      <button class="ok principal ${ch ? 'verde' : ''}" data-acao="salvarQ">${ch ? 'Guardar no estoque' : 'Salvar'}</button>
      <button class="cancela" data-acao="fechar">Cancelar</button>`;
  }
  if (f.tipo === 'comprei') {
    const u = unidadeDe(cs, f.k);
    if (!u) return '<p>Esse material não existe mais.</p><button class="cancela" data-acao="fechar">Fechar</button>';
    return `${cabeca(u, 'Comprei')}<p class="dica">Quantos ${plural(u.item.un)}?</p>${numero(f.q, u.item.un)}<div class="rot">Onde?</div>
      ${listarLojas(cs).map(l => l.site
        ? `<button class="ok onde" data-onde="${e(l.id)}">Pedi na ${e(l.nome)}<small>vai para "A caminho" até chegar</small></button>`
        : `<button class="ok verde onde" data-onde="${e(l.id)}">Comprei na ${e(l.nome)}<small>já está comigo: vai direto para o estoque</small></button>`).join('')}
      <button class="cancela" data-acao="fechar">Cancelar</button>`;
  }
  if (f.tipo === 'link') {
    const u = unidadeDe(cs, f.k);
    if (!u) return '<p>Esse material não existe mais.</p><button class="cancela" data-acao="fechar">Fechar</button>';
    const t = termoBase(u.item.nome, f.termo) + (u.corId ? ` ${u.curto}` : '');
    return `${cabeca(u, 'Procurar nas lojas')}
      <div class="rot">Procurar como</div>
      <input class="texto" id="ltermo" value="${e(f.termo)}" placeholder="${e(termoPadrao(u.item.nome))}" data-campo="termo" maxlength="${LIMITES.busca}" autocomplete="off" aria-label="Procurar como">
      <p class="dica">Vazio = o nome do material. Deixe mais específico quando precisar (ex.: "gaze não estéril 7,5").${u.corId ? ' A cor entra sozinha no fim.' : ''}</p>
      ${lojasComSite(cs).map(l => `<div class="rot">${e(l.nome)}</div>
        <div class="dica" id="pd-${e(l.id)}">${linhaBusca(f.v[l.id], t)}</div>
        <input class="texto" id="lk-${e(l.id)}" type="url" inputmode="url" placeholder="Ou cole o link de um produto" value="${e(f.v[l.id] ?? '')}" data-campo="lk:${e(l.id)}" maxlength="${LIMITES.link}" autocomplete="off" autocapitalize="none" aria-label="Link de um produto na ${e(l.nome)}">`).join('')}
      <p class="dica">Link em branco = usa a busca. Com link, o botão abre sempre aquele produto.</p>
      ${f.erro ? `<div class="erro">${e(f.erro)}</div>` : ''}
      <button class="ok principal" data-acao="salvarLink">Salvar</button><button class="cancela" data-acao="fechar">Cancelar</button>`;
  }
  if (f.tipo === 'loja') {
    return `<h2>${f.id ? 'Loja' : 'Nova loja'}</h2>
      <div class="rot">Nome</div><input class="texto" id="ljnome" value="${e(f.nome)}" data-campo="nome" placeholder="Ex.: Dental Centro" maxlength="${LIMITES.loja}" autocomplete="off" aria-label="Nome da loja">
      <div class="rot">Site (deixe vazio se é loja de balcão)</div><input class="texto" id="ljsite" type="url" inputmode="url" value="${e(f.site)}" data-campo="site" placeholder="https://…" maxlength="${LIMITES.site}" autocomplete="off" autocapitalize="none" aria-label="Site da loja">
      ${f.erro ? `<div class="erro">${e(f.erro)}</div>` : ''}
      <button class="ok principal" data-acao="salvarLoja">Salvar</button>
      ${f.id && Object.keys(cs.lojas).length > 1 ? '<button class="perigo" data-acao="apagarLoja">Apagar esta loja</button>' : ''}
      <button class="cancela" data-acao="fechar">Cancelar</button>`;
  }
  if (f.tipo === 'outro') {
    const fora = foraDaLista(cs);
    return `<h2>Pôr na lista</h2><p class="dica">Para comprar algo que ainda não chegou no mínimo (uma promoção, um material que vai usar muito na semana).</p>
      <div class="chips">${fora.map(u => `<button class="chip" data-por="${e(u.k)}">${e(u.item.ic)} ${e(u.nome)}</button>`).join('') || '<p class="dica">Tudo já está na lista.</p>'}</div>
      <button class="cancela" data-acao="fechar">Fechar</button>`;
  }
  if (f.tipo === 'grupo') {
    const outro = f.id ? listarGrupos(cs).find(g => g.id !== f.id) : undefined;
    return `<h2>${f.id ? 'Grupo' : 'Novo grupo'}</h2>
      <div class="campo-item"><input class="emo-in" id="gic" value="${e(f.ic)}" data-campo="ic" aria-label="Figurinha" autocomplete="off"><input class="texto" id="gnome" value="${e(f.nome)}" data-campo="nome" placeholder="Nome do grupo" maxlength="${LIMITES.grupo}" autocomplete="off" aria-label="Nome do grupo"></div>
      <div class="emos">${FIGURINHAS.slice(0, 16).map(x => `<button data-emo="${e(x)}" class="${f.ic === x ? 'sel' : ''}">${e(x)}</button>`).join('')}</div>
      ${f.erro ? `<div class="erro">${e(f.erro)}</div>` : ''}
      <button class="ok principal" data-acao="salvarGrupo">Salvar</button>
      ${outro ? `<button class="perigo" data-acao="apagarGrupo">Apagar o grupo (os materiais vão para "${e(outro.nome)}")</button>` : ''}
      <button class="cancela" data-acao="fechar">Cancelar</button>`;
  }
  const d = f.d;
  return `<h2>${f.novo ? 'Novo material' : 'Editar material'}</h2>
    <div class="campo-item"><input class="emo-in" id="eic" value="${e(d.ic)}" data-campo="ic" aria-label="Figurinha" autocomplete="off"><input class="texto" id="enome" value="${e(d.nome)}" data-campo="nome" placeholder="Nome (ex.: Anestésico)" maxlength="${LIMITES.nome}" autocomplete="off" aria-label="Nome do material"></div>
    <div class="dica">Toque na figurinha para usar o teclado de emojis, ou escolha uma:</div>
    <div class="emos">${FIGURINHAS.map(x => `<button data-emo="${e(x)}" class="${d.ic === x ? 'sel' : ''}">${e(x)}</button>`).join('')}</div>
    <div class="rot">Grupo</div>
    <div class="chips">${listarGrupos(cs).map(g => `<button class="chip ${d.cat === g.id ? 'sel' : ''}" data-ecat="${e(g.id)}">${e(g.ic)} ${e(g.nome)}</button>`).join('')}</div>
    <div class="rot">Conto em</div>
    <div class="chips">${UNIDADES.map(x => `<button class="chip ${d.un === x ? 'sel' : ''}" data-eun="${x}">${x}</button>`).join('')}</div>
    <div class="rot">Procurar nas lojas como</div>
    <input class="texto" id="ebusca" value="${e(d.busca)}" placeholder="${e(termoPadrao(d.nome || 'nome do material'))}" data-campo="busca" maxlength="${LIMITES.busca}" autocomplete="off" aria-label="Procurar nas lojas como">
    <div class="rot">Avisar quando tiver${d.temCores ? ' (cada cor)' : ''}</div>
    <div class="grande-n"><button class="claro" data-f="min" data-d="-1" aria-label="Menos">−</button><div class="num"><input id="emin" inputmode="numeric" pattern="[0-9]*" value="${d.min}" data-campo="min" aria-label="Mínimo" maxlength="4"><small>${palavra(d.min, d.un)} ou menos</small></div><button data-f="min" data-d="1" aria-label="Mais">+</button></div>
    <p class="dica">0 = nunca avisa.</p>
    <div class="liga"><label for="eval">Tem validade<small>Pede a data quando chega e avisa antes de vencer.</small></label><input type="checkbox" id="eval" data-campo="val" ${d.val ? 'checked' : ''}></div>
    <div class="liga"><label for="ecor">Separar por cor ou tamanho<small>Como a resina: A1, A2, A3… cada uma com o seu número.</small></label><input type="checkbox" id="ecor" data-campo="temCores" ${d.temCores ? 'checked' : ''}></div>
    ${d.temCores ? `<div class="chips">${d.cores.map((c, i) => `<button class="chip" data-tira-cor="${i}" aria-label="Tirar ${e(c)}">${e(c)}<span class="x">×</span></button>`).join('')}</div>
      <div class="nova-cor"><input class="texto" id="enova" placeholder="Nova cor (ex.: B2)" maxlength="${LIMITES.cor}" value="${e(d.nova)}" data-campo="nova" autocomplete="off" aria-label="Nova cor"><button data-acao="addCor">Pôr</button></div>` : ''}
    ${f.erro ? `<div class="erro">${e(f.erro)}</div>` : ''}
    <button class="ok principal" data-acao="salvarItem">Salvar</button>
    ${f.novo ? '' : '<button class="perigo" data-acao="apagarItem">Apagar este material</button>'}
    <button class="cancela" data-acao="fechar">Cancelar</button>`;
}

const linhaBusca = (link: string | undefined, t: string): string => (link?.trim() ? '★ Abre o produto do link abaixo' : `Abre a busca por <b>“${e(t)}”</b>`);

function desenhar(): void {
  if (!F) return;
  const antes = document.querySelector<HTMLElement>('#folha .folha');
  const rolagem = antes?.scrollTop ?? 0;
  const jaAberta = !!antes;
  $('folha').innerHTML = `<div class="veu" id="veu"><div class="folha ${jaAberta ? 'sem-anim' : ''}" role="dialog" aria-modal="true">${corpo(F)}</div></div>`;
  const veu = $('veu');
  veu.onpointerdown = ev => { comecouNoFundo = ev.target === veu; };
  veu.onclick = ev => { if (ev.target === veu && comecouNoFundo && Date.now() - abertaEm > 600) fechar(); };
  document.querySelector<HTMLElement>('#folha .folha')!.scrollTop = rolagem;
  // um erro aparece no fim da janela: leva a vista até ele (o botão Salvar fica grudado embaixo)
  document.querySelector('#folha .erro')?.scrollIntoView({ block: 'center' });
}

/* ---------- abrir ---------- */
export function abrirContar(): void {
  const cs = S.c!, ks = ordemContar(cs), i = inicioContar(cs);
  const u = unidadeDe(cs, ks[i]!);
  if (!u) return;
  abrir({ tipo: 'contar', ks, i, q: u.o.qtd ?? 0, vence: u.o.vence ?? '', mexeu: false, feitos: 0 });
}
export function abrirAjustar(k: string): void {
  const u = unidadeDe(S.c!, k);
  if (u) abrir({ tipo: 'ajustar', k, q: u.o.qtd ?? 0, vence: u.o.vence ?? '' });
}
export function abrirChegou(k: string, q: number): void {
  if (unidadeDe(S.c!, k)) abrir({ tipo: 'chegou', k, q, vence: '' });
}
export function abrirComprei(k: string): void {
  const u = unidadeDe(S.c!, k);
  if (u) abrir({ tipo: 'comprei', k, q: pedir(S.c!, u) });
}
export function abrirLink(k: string): void {
  const u = unidadeDe(S.c!, k);
  if (u) abrir({ tipo: 'link', k, termo: u.item.busca ?? '', v: { ...(S.c!.links[k] ?? {}) }, erro: '' });
}
export function abrirLoja(id: string | null): void {
  const l = id ? S.c!.lojas[id] : null;
  abrir({ tipo: 'loja', id: l ? id : null, nome: l?.nome ?? '', site: l?.site ?? '', erro: '' });
}
export function abrirOutro(): void { abrir({ tipo: 'outro' }); }
export function abrirGrupo(id: string | null): void {
  const g = id ? S.c!.grupos[id] : null;
  abrir({ tipo: 'grupo', id: g ? id : null, nome: g?.nome ?? '', ic: g?.ic ?? '🗂️', erro: '' });
}
export function abrirEditar(id: string | null, nome = ''): void {
  const d = dadosDoMaterial(S.c!, id, id ? {} : { nome });
  abrir({ tipo: 'editar', novo: !id, d: { ...d, nova: '' }, erro: '' });
}

/* ---------- ações ---------- */
function salvarContagemAtual(f: Extract<Folha, { tipo: 'contar' }>): void {
  const u = unidadeDe(S.c!, f.ks[f.i]!);
  if (!u) return;
  const vence = f.vence && diaValido(f.vence) ? f.vence : null;
  const escritas = definirQuantidade(u, f.q, vence);
  const igual = u.o.qtd === f.q && u.o.vence === (f.q > 0 && u.item.val ? vence : null);
  if (!igual) fazer(escritas);
  f.feitos++;
}
function carregarContagem(f: Extract<Folha, { tipo: 'contar' }>): void {
  const u = unidadeDe(S.c!, f.ks[f.i]!);
  f.q = u?.o.qtd ?? 0; f.vence = u?.o.vence ?? ''; f.mexeu = false;
}

function acao(a: string): void {
  const f = F, cs = S.c;
  if (!f || !cs) return;
  if (a === 'fechar') { fechar(); return; }
  if (f.tipo === 'contar') {
    const total = f.ks.length;
    if (a === 'ant') {
      if (f.mexeu) salvarContagemAtual(f);
      f.i = Math.max(0, f.i - 1); carregarContagem(f); desenhar(); return;
    }
    if (a === 'prox') {
      salvarContagemAtual(f);
      if (f.i < total - 1) { f.i++; carregarContagem(f); desenhar(); return; }
      fechar(); avisar(f.feitos >= total ? `Estoque contado: ${total} de ${total}.` : `Contou ${f.feitos} de ${total}. Dá para continuar outro dia.`);
      return;
    }
    if (a === 'parar') {
      if (f.mexeu) salvarContagemAtual(f);
      const feitos = f.feitos;
      fechar(); avisar(`Contou ${feitos} de ${total}. Dá para continuar outro dia.`); return;
    }
  }
  if ((f.tipo === 'ajustar' || f.tipo === 'chegou') && a === 'salvarQ') {
    const u = unidadeDe(cs, f.k);
    if (!u) { fechar(); return; }
    const q = inteiro(f.q), vence = f.vence && diaValido(f.vence) ? f.vence : null;
    fechar();
    if (f.tipo === 'chegou') {
      fazer(chegou(cs, u, q, vence), `${u.nome}: +${q}, agora ${fmt((u.o.qtd ?? 0) + q, u.item.un)}`, true);
    } else {
      fazer(definirQuantidade(u, q, vence), `${u.nome}: ${q === 0 ? 'acabou' : fmt(q, u.item.un)}`, true);
    }
    return;
  }
  if (f.tipo === 'link' && a === 'salvarLink') {
    const u = unidadeDe(cs, f.k);
    if (!u) { fechar(); return; }
    const r = salvarBusca(cs, u.item.id, u.corId, f.termo, f.v);
    if (r.erro !== undefined) { f.erro = r.erro; desenhar(); return; }
    fechar(); fazer(r.escritas, 'Busca ajustada', true); return;
  }
  if (f.tipo === 'loja') {
    if (a === 'salvarLoja') {
      const r = salvarLoja(cs, { id: f.id, nome: f.nome, site: f.site }, novoId());
      if (r.erro !== undefined) { f.erro = r.erro; desenhar(); return; }
      fechar(); fazer(r.escritas, `${f.nome.trim().slice(0, LIMITES.loja)} salva`, true); return;
    }
    if (a === 'apagarLoja' && f.id) {
      const esc = apagarLoja(cs, f.id);
      fechar(); if (esc) fazer(esc, 'Loja apagada', true); return;
    }
  }
  if (f.tipo === 'grupo') {
    if (a === 'salvarGrupo') {
      const r = salvarGrupo(cs, { id: f.id, nome: f.nome, ic: f.ic }, novoId());
      if (r.erro !== undefined) { f.erro = r.erro; desenhar(); return; }
      fechar(); fazer(r.escritas, `Grupo ${f.nome.trim().slice(0, LIMITES.grupo)} salvo`, true); return;
    }
    if (a === 'apagarGrupo' && f.id) {
      const r = apagarGrupo(cs, f.id);
      fechar(); if (r) fazer(r.escritas, `Grupo apagado. Os materiais foram para "${r.destino}"`, true); return;
    }
  }
  if (f.tipo === 'editar') {
    if (a === 'addCor') {
      const c = f.d.nova.replace(/\s+/g, ' ').trim().slice(0, LIMITES.cor);
      if (c && !f.d.cores.some(x => norm(x) === norm(c))) f.d.cores.push(c);
      f.d.nova = ''; desenhar(); $('enova')?.focus(); return;
    }
    if (a === 'salvarItem') {
      const r = salvarMaterial(cs, f.d, novoId());
      if (r.erro !== undefined) { f.erro = r.erro; desenhar(); return; }
      const nome = f.d.nome.replace(/\s+/g, ' ').trim().slice(0, LIMITES.nome);
      const novo = f.novo;
      fechar();
      if (novo) S.filtro = '';
      fazer(r.escritas, novo ? `${nome} criado, ainda não contado` : `${nome} salvo`, true);
      return;
    }
    if (a === 'apagarItem' && f.d.id) {
      const nome = cs.itens[f.d.id]?.nome ?? '';
      fechar(); fazer(apagarMaterial(cs, f.d.id), `${nome} apagado`, true); return;
    }
  }
}

/** Clique dentro de uma folha. Devolve true se tratou. */
export function aoClicarNaFolha(ev: MouseEvent): void {
  const f = F;
  if (!f) return;
  const t = (ev.target as HTMLElement).closest<HTMLElement>('button');
  if (!t || t.id === 'veu') return;
  const ds = t.dataset;
  if (ds.f) {
    const d = Number(ds.d);
    if (f.tipo === 'contar') { f.q = inteiro(f.q + d); f.mexeu = true; }
    else if (f.tipo === 'editar') f.d.min = Math.max(0, Math.min(LIMITES.min, inteiro(f.d.min) + d));
    else if (f.tipo === 'ajustar' || f.tipo === 'chegou' || f.tipo === 'comprei') f.q = inteiro(f.q + d);
    desenhar(); return;
  }
  if ('limpaData' in ds) {
    if (f.tipo === 'contar') { f.vence = ''; f.mexeu = true; } else if (f.tipo === 'ajustar' || f.tipo === 'chegou') f.vence = '';
    desenhar(); return;
  }
  if (ds.emo && (f.tipo === 'editar' || f.tipo === 'grupo')) { if (f.tipo === 'editar') f.d.ic = ds.emo; else f.ic = ds.emo; desenhar(); return; }
  if (f.tipo === 'editar') {
    if (ds.ecat) { f.d.cat = ds.ecat; desenhar(); return; }
    if (ds.eun) { f.d.un = ds.eun; desenhar(); return; }
    if (ds.tiraCor !== undefined) { f.d.cores.splice(Number(ds.tiraCor), 1); desenhar(); return; }
  }
  if (f.tipo === 'outro' && ds.por) {
    const u = unidadeDe(S.c!, ds.por);
    fechar(); if (u) fazer({ [`extra.${u.k}`]: true }, `${u.nome} na lista`);
    return;
  }
  if (f.tipo === 'comprei' && ds.onde) { aoEscolherLoja(f, ds.onde); return; }
  if (ds.acao) acao(ds.acao);
}

/** Comprei: loja com site → "A caminho"; balcão → direto para o estoque (com validade, passa pela folha Chegou). */
function aoEscolherLoja(f: Extract<Folha, { tipo: 'comprei' }>, lojaId: string): void {
  const cs = S.c!, u = unidadeDe(cs, f.k), l = cs.lojas[lojaId];
  if (!u || !l) { fechar(); return; }
  const q = Math.max(1, inteiro(f.q));
  if (l.site) {
    fechar(); fazer(pediNaLoja(cs, u, lojaId, q, Date.now()), `${u.nome}: a caminho da ${l.nome}`, true); return;
  }
  if (u.item.val) { F = { tipo: 'chegou', k: u.k, q, vence: '' }; desenhar(); return; }
  fechar(); fazer(chegou(cs, u, q, null), `${u.nome}: +${q}, agora ${fmt((u.o.qtd ?? 0) + q, u.item.un)}`, true);
}

/** Digitar: muda o estado, sem redesenhar (o teclado não fecha). */
export function aoDigitarNaFolha(ev: Event): void {
  const t = ev.target as HTMLInputElement, f = F;
  const c = t.dataset.campo;
  if (!f || !c) return;
  const v = t.type === 'checkbox' ? t.checked : t.value;
  if (f.tipo === 'contar') {
    if (c === 'q') f.q = inteiro(v); else if (c === 'vence') f.vence = String(v);
    f.mexeu = true; return;
  }
  if (f.tipo === 'ajustar' || f.tipo === 'chegou' || f.tipo === 'comprei') {
    if (c === 'q') f.q = inteiro(v); else if (c === 'vence' && f.tipo !== 'comprei') f.vence = String(v);
    return;
  }
  if (f.tipo === 'link') {
    if (c === 'termo') f.termo = String(v); else if (c.startsWith('lk:')) f.v[c.slice(3)] = String(v);
    const u = unidadeDe(S.c!, f.k);
    if (!u) return;
    const texto = termoBase(u.item.nome, f.termo) + (u.corId ? ` ${u.curto}` : '');
    for (const l of lojasComSite(S.c!)) { const el = document.getElementById(`pd-${l.id}`); if (el) el.innerHTML = linhaBusca(f.v[l.id], texto); }
    return;
  }
  if (f.tipo === 'loja') { if (c === 'nome') f.nome = String(v); else if (c === 'site') f.site = String(v); return; }
  if (f.tipo === 'grupo') {
    if (c === 'ic') { f.ic = ultimoEmoji(String(v)) ?? f.ic; t.value = f.ic; } else if (c === 'nome') f.nome = String(v);
    return;
  }
  if (f.tipo === 'editar') {
    const d = f.d;
    if (c === 'ic') { d.ic = ultimoEmoji(String(v)) ?? d.ic; t.value = d.ic; }
    else if (c === 'nome') d.nome = String(v);
    else if (c === 'busca') d.busca = String(v);
    else if (c === 'nova') d.nova = String(v);
    else if (c === 'min') d.min = inteiro(v);
    else if (c === 'val') d.val = Boolean(v);
    else if (c === 'temCores') {
      d.temCores = Boolean(v);
      if (d.temCores && !d.cores.length) d.cores = ['A1', 'A2', 'A3'];
      desenhar();
    }
  }
}

export function aoApertarEnter(ev: KeyboardEvent): void {
  if (ev.key === 'Enter' && (ev.target as HTMLElement).id === 'enova') { ev.preventDefault(); acao('addCor'); }
  if (ev.key === 'Escape' && F) fechar();
}

export { render };
