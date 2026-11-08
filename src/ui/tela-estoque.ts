/** Aba Estoque: busca, Vence logo, Contar, atalhos dos grupos e a lista de materiais. */
import { hoje, ddmm, textoVence } from '../motor/datas.ts';
import { diasVence, listarGrupos, listarItens, total, unidades, unidadesDoItem, venceLogo } from '../motor/estoque.ts';
import { norm } from '../motor/ids.ts';
import { fmt, palavra } from '../motor/unidades.ts';
import type { Unidade } from '../motor/tipos.ts';
import { S } from './estado.ts';
import { escapar as e } from './seguranca.ts';

const $ = (id: string) => document.getElementById(id)!;

/** O esqueleto (busca fixa, para o teclado não fechar a cada mudança) e depois só o miolo. */
export function telaEstoque(): void {
  const c = $('conteudo');
  if (c.dataset.tela !== 'estoque') {
    c.dataset.tela = 'estoque';
    c.innerHTML = `<div class="busca"><input id="busca" type="search" placeholder="Procurar material" value="${e(S.filtro)}" autocomplete="off" aria-label="Procurar material"></div><div id="topoEst"></div><div id="gradeEst"></div>`;
  }
  $('topoEst').outerHTML = `<div id="topoEst" style="display:contents">${topo()}</div>`;
  desenharGrade();
}

function topo(): string {
  const cs = S.c!, dia = hoje();
  const vl = venceLogo(cs, dia);
  const nenhuma = unidades(cs).every(u => u.o.qtd === null);
  return `${vl.length ? `<div class="alerta"><h3>Vence logo</h3>${vl.map(u => {
    const d = diasVence(u, dia)!;
    return `<button class="${d < 0 ? 'vencido' : ''}" data-ajusta="${e(u.k)}"><span>${e(u.item.ic)}</span><span class="tx">${e(u.nome)}</span><small>${textoVence(d)} · ${ddmm(u.o.vence!)}</small></button>`;
  }).join('')}</div>` : ''}
    <button class="contar-bt ${nenhuma ? 'destaque' : ''}" id="contar">Contar o estoque</button>
    <nav class="pulos" id="pulos">${listarGrupos(cs).map(g => `<button class="pulo" data-pula="${e(g.id)}">${e(g.ic)} ${e(g.nome)}</button>`).join('')}</nav>`;
}

function linha(u: Unidade, dia: string): string {
  const cs = S.c!, o = u.o, d = diasVence(u, dia);
  let st = '', info = '';
  if (o.qtd === null) info = 'ainda não contado';
  else if (o.qtd === 0) { st = 'st-zero'; info = cs.caminho[u.k] ? 'acabou · a caminho' : 'acabou'; }
  else if (u.item.min > 0 && o.qtd <= u.item.min) { st = 'st-baixo'; info = cs.caminho[u.k] ? 'no mínimo · a caminho' : 'no mínimo · vai para o Comprar'; }
  const venc = d !== null && d <= cs.antes ? `<small class="small-venc">${textoVence(d)} (${ddmm(o.vence!)})</small>` : '';
  const numero = `<button class="qtd" data-ajusta="${e(u.k)}" aria-label="Quanto tem"><b>${o.qtd === null ? '—' : o.qtd}</b><small>${o.qtd === null ? '' : palavra(o.qtd, u.item.un)}</small></button>`;
  const botoes = (nomeMais: string, nomeMenos: string) => `<button class="mais" data-mais="${e(u.k)}" aria-label="${nomeMais}">+</button>${numero}<button class="menos" data-menos="${e(u.k)}" aria-label="${nomeMenos}">−</button>`;
  if (u.corId) {
    return `<div class="cor-l ${st}"><div class="cn"><b>${e(u.curto)}</b>${info ? `<small>${info}</small>` : ''}${venc}</div>${botoes('Mais uma', 'Usei uma')}</div>`;
  }
  return `<div class="est ${st}" data-segura="${e(u.item.id)}"><span class="e">${e(u.item.ic)}</span>
    <div class="tx"><b>${e(u.item.nome)}</b>${info ? `<small>${info}</small>` : ''}${venc}</div>${botoes('Mais um', 'Usei um')}</div>`;
}

export function desenharGrade(): void {
  const el = document.getElementById('gradeEst');
  if (!el || !S.c) return;
  const cs = S.c, dia = hoje(), f = norm(S.filtro);
  const itens = listarItens(cs);
  let html = '';
  for (const g of listarGrupos(cs)) {
    const its = itens.filter(i => i.cat === g.id && (!f || norm(i.nome).includes(f)));
    if (!its.length) continue;
    html += `<div class="grupo" id="g-${e(g.id)}"><h3>${e(g.ic)} ${e(g.nome)}</h3>`;
    for (const it of its) {
      if (it.cores) {
        const t = total(it);
        html += `<div class="cartao-cores" data-segura="${e(it.id)}"><div class="cab"><span class="e">${e(it.ic)}</span><div class="tx"><b>${e(it.nome)}</b><small>${t === null ? 'ainda não contado' : `${fmt(t, it.un)} no total`} · por cor</small></div></div>${unidadesDoItem(it).map(u => linha(u, dia)).join('')}</div>`;
      } else html += linha(unidadesDoItem(it)[0]!, dia);
    }
    html += '</div>';
  }
  if (!html) html = `<p class="vazio">Nenhum material com "${e(S.filtro)}".</p><button class="criar" id="criarBusca">+ Criar "${e(S.filtro)}"</button>`;
  el.innerHTML = html;
}
