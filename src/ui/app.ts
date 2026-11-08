/** A casca do app (título, abas, avisos) e o desenho de cada aba. */
import { lista } from '../motor/compras.ts';
import { posicionarAviso } from './aviso.ts';
import { ligarEventos } from './eventos.ts';
import { ligarRender, S, type Aba } from './estado.ts';
import { telaComprar } from './tela-comprar.ts';
import { telaDocumentos } from './tela-documentos.ts';
import { marcaAN } from './marca.ts';
import { telaEstoque } from './tela-estoque.ts';
import { telaOrganizar } from './tela-organizar.ts';

const $ = (id: string) => document.getElementById(id)!;
let montada = false;

/** Ícones de linha fina das abas (traço 1.4, como no mock aprovado). */
const svg = (d: string) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICONES = {
  estoque: svg('<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>'),
  comprar: svg('<path d="M3 4h2.5l2 11h10l2-8H7"/><circle cx="9" cy="19" r="1.2"/><circle cx="17" cy="19" r="1.2"/>'),
  documentos: svg('<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="1.5"/><rect x="7" y="14" width="10" height="6.5"/>'),
  organizar: svg('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'),
};

export function montarCasca(): void {
  document.getElementById('app')!.innerHTML = `<div class="tela">
    <header class="topo">${marcaAN('marca-an')}<div class="tit"><h1 id="titulo"></h1><div class="s" id="subtitulo"></div></div><span class="nuvem" id="nuvem"></span></header>
    <section class="conteudo" id="conteudo"></section>
    <nav class="abas" aria-label="Telas">
      <button data-tab="estoque">${ICONES.estoque}Estoque</button>
      <button data-tab="comprar">${ICONES.comprar}Comprar<span class="badge" id="badge"></span></button>
      <button data-tab="documentos">${ICONES.documentos}Documentos</button>
      <button data-tab="organizar">${ICONES.organizar}Organizar</button>
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
    documentos: ['Documentos', 'para imprimir'],
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
    c.innerHTML = aba === 'comprar' ? telaComprar() : aba === 'documentos' ? telaDocumentos() : telaOrganizar();
  }
  posicionarAviso();
}

export function iniciarUI(): void {
  ligarRender(desenhar);
  ligarEventos();
}
