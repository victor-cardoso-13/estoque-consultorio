/** Toques e gestos: um único ouvinte de cada tipo para a página toda. */
import { naoVeio } from '../motor/compras.ts';
import { chegou, unidadeDe, usar } from '../motor/estoque.ts';
import { definirAntes, moverGrupo } from '../motor/organizar.ts';
import { fmt } from '../motor/unidades.ts';
import { fazer, render, S, avisar, type Aba, type Segmento } from './estado.ts';
import { desenharGrade } from './tela-estoque.ts';
import {
  abrirAjustar, abrirChegou, abrirComprei, abrirContar, abrirDocumento, abrirEditar, abrirGrupo, abrirLink, abrirLoja, abrirOutro,
  aoApertarEnter, aoClicarNaFolha, aoDigitarNaFolha, folhaAberta,
} from './folhas.ts';
import { mudarPedido, pedir } from '../motor/compras.ts';
const $ = (id: string) => document.getElementById(id)!;

/* ---------- segurar o dedo num material = editar ---------- */
let tSeg: ReturnType<typeof setTimeout> | null = null;
let x0 = 0, y0 = 0;
function soltar(): void {
  if (tSeg) clearTimeout(tSeg);
  tSeg = null;
  document.querySelectorAll('.segurando').forEach(el => el.classList.remove('segurando'));
}

function ligarGestos(): void {
  document.addEventListener('pointerdown', ev => {
    const alvo = ev.target as HTMLElement;
    const t = alvo.closest<HTMLElement>('[data-segura]');
    // os botões (− + número) e os links das lojas não disparam o segurar
    if (!t || alvo.closest('button,a') || folhaAberta()) return;
    x0 = ev.clientX; y0 = ev.clientY;
    t.classList.add('segurando');
    tSeg = setTimeout(() => {
      tSeg = null;
      t.classList.remove('segurando');
      navigator.vibrate?.(15);
      abrirEditar(t.dataset.segura!);
    }, 550);
  });
  document.addEventListener('pointerup', soltar);
  document.addEventListener('pointercancel', soltar);
  // arrastou mais de 10 px = é rolagem, não é "segurar"
  document.addEventListener('pointermove', ev => { if (tSeg && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 10) soltar(); });
  // sem o menu de "copiar / buscar" do iOS em cima dos materiais
  document.addEventListener('contextmenu', ev => { if ((ev.target as HTMLElement).closest('[data-segura]')) ev.preventDefault(); });
}

/**
 * Pulo de grupo SEM animação: a rolagem suave brigava com a barra fixa no iPhone (a tela piscava, descia e subia).
 * O grupo para logo abaixo da barra de atalhos.
 */
export function pular(id: string): void {
  const g = document.getElementById(`g-${id}`), c = $('conteudo'), barra = document.getElementById('pulos');
  if (!g || !barra) return;
  c.scrollTop += g.getBoundingClientRect().top - c.getBoundingClientRect().top;
  c.scrollTop += g.getBoundingClientRect().top - barra.getBoundingClientRect().bottom - 8;
}

/** − ou + num material. Não contado: abre o Quanto tem (não dá para somar a "nada"). */
function tocarQuantidade(k: string, delta: 1 | -1): void {
  const u = unidadeDe(S.c!, k);
  if (!u) return;
  const r = usar(u, delta);
  if (r.tipo === 'ok') fazer(r.escritas, r.texto, true);
  else if (r.tipo === 'zero') avisar(r.texto);
  else abrirAjustar(k);
}

/** Chegou ✓ na lista "A caminho": com validade, pergunta a data antes. */
function chegouDoCaminho(k: string): void {
  const cs = S.c!, u = unidadeDe(cs, k), c = cs.caminho[k];
  if (!u || !c) return;
  if (u.item.val) { abrirChegou(k, c.q); return; }
  fazer(chegou(cs, u, c.q, null), `${u.nome}: +${c.q}, agora ${fmt((u.o.qtd ?? 0) + c.q, u.item.un)}`, true);
}

/* ---------- cliques ---------- */
function aoClicar(ev: MouseEvent): void {
  if (!S.c) return;
  const alvo = ev.target as HTMLElement;
  if (alvo.closest('#folha')) return;
  const t = alvo.closest<HTMLElement>('button');
  if (!t) return; // links <a> das lojas: o navegador abre sozinho (nada de preventDefault nem de redesenhar aqui)
  const d = t.dataset;
  const cs = S.c;

  if (d.tab) { S.aba = d.tab as Aba; render(); $('conteudo').scrollTop = 0; return; }
  if (d.menos) { tocarQuantidade(d.menos, -1); return; }
  if (d.mais) { tocarQuantidade(d.mais, 1); return; }
  if (d.ajusta) { abrirAjustar(d.ajusta); return; }
  if (d.pula) { pular(d.pula); return; }
  if (t.id === 'contar') { abrirContar(); return; }
  if (t.id === 'criarBusca') { abrirEditar(null, S.filtro); return; }
  if (t.id === 'novoItem') { abrirEditar(null); return; }
  if (d.pede) { const u = unidadeDe(cs, d.pede); if (u) fazer(mudarPedido(u, pedirAtual(d.pede) + Number(d.d))); return; }
  if (d.chegou) { chegouDoCaminho(d.chegou); return; }
  if (d.comprei) { abrirComprei(d.comprei); return; }
  if (d.naoveio) { const u = unidadeDe(cs, d.naoveio); if (u) fazer(naoVeio(u), `${u.nome} voltou para a lista`, true); return; }
  if (d.link) { abrirLink(d.link); return; }
  if (t.id === 'outro') { abrirOutro(); return; }
  if (d.loja !== undefined) { abrirLoja(d.loja || null); return; }
  if (d.seg) { S.seg = d.seg as Segmento; render(); return; }
  if (d.doc) { abrirDocumento(d.doc); return; }
  if (d.edit) { abrirEditar(d.edit); return; }
  if (d.grupo !== undefined) { abrirGrupo(d.grupo || null); return; }
  if (d.gsobe) { fazer(moverGrupo(cs, d.gsobe, -1)); return; }
  if (d.gdesce) { fazer(moverGrupo(cs, d.gdesce, 1)); return; }
  if (d.antes) { const n = Number(d.antes); fazer(definirAntes(cs, n), `Avisa ${n} dias antes de vencer`); return; }
  if (t.id === 'sairConta') { S.sair(); return; }
}

function pedirAtual(k: string): number { const u = unidadeDe(S.c!, k); return u ? pedir(S.c!, u) : 1; }

export function ligarEventos(): void {
  ligarGestos();
  document.addEventListener('click', aoClicar);
  $('folha').addEventListener('click', aoClicarNaFolha);
  $('folha').addEventListener('input', aoDigitarNaFolha);
  document.addEventListener('keydown', aoApertarEnter);
  // a busca do Estoque: só o miolo é redesenhado (o teclado não fecha)
  document.addEventListener('input', ev => {
    const t = ev.target as HTMLInputElement;
    if (t.id === 'busca') { S.filtro = t.value.slice(0, 40); desenharGrade(); }
  });
}
