/** A casca do app (título, abas, avisos) e o desenho de cada aba. */
import { lista } from '../motor/compras.ts';
import { posicionarAviso } from './aviso.ts';
import { ligarEventos } from './eventos.ts';
import { ligarRender, S, type Aba } from './estado.ts';
import { telaComprar } from './tela-comprar.ts';
import { telaEstoque } from './tela-estoque.ts';
import { telaOrganizar } from './tela-organizar.ts';

const $ = (id: string) => document.getElementById(id)!;
let montada = false;

export function montarCasca(): void {
  document.getElementById('app')!.innerHTML = `<div class="tela">
    <header class="topo"><div class="tit"><h1 id="titulo"></h1><div class="s" id="subtitulo"></div></div><span class="nuvem" id="nuvem"></span></header>
    <section class="conteudo" id="conteudo"></section>
    <nav class="abas" aria-label="Telas">
      <button data-tab="estoque"><span class="ic">📦</span>Estoque</button>
      <button data-tab="comprar"><span class="ic">🛒</span>Comprar<span class="badge" id="badge"></span></button>
      <button data-tab="organizar"><span class="ic">🧭</span>Organizar</button>
    </nav></div>`;
  montada = true;
  // a barra de abas muda de altura (deitado é mais baixa): o aviso acompanha
  new ResizeObserver(() => posicionarAviso()).observe(document.querySelector('.abas')!);
}

export function consultorioSumiu(): void { montada = false; }

export function desenhar(): void {
  if (!S.c) return;
  if (!montada) montarCasca();
  const aba: Aba = S.aba;
  const n = lista(S.c).length;
  const titulos: Record<Aba, [string, string]> = {
    estoque: ['Estoque', S.c.nome],
    comprar: ['Comprar', n ? `${n} ${n === 1 ? 'item' : 'itens'} no mínimo ou acabando` : 'nada para comprar'],
    organizar: ['Organizar', 'materiais, grupos e avisos'],
  };
  $('titulo').textContent = titulos[aba][0];
  $('subtitulo').textContent = titulos[aba][1];
  $('nuvem').textContent = S.semInternet ? 'sem internet' : '';
  document.querySelectorAll<HTMLElement>('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === aba));
  $('badge').textContent = String(n);
  $('badge').style.display = n ? '' : 'none';
  if (aba === 'estoque') telaEstoque();
  else {
    const c = $('conteudo');
    c.dataset.tela = aba;
    c.innerHTML = aba === 'comprar' ? telaComprar() : telaOrganizar();
  }
  posicionarAviso();
}

export function iniciarUI(): void {
  ligarRender(desenhar);
  ligarEventos();
}
