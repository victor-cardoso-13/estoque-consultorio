/** Aba Comprar: o que entra sozinho, o botão de cada loja (links de verdade), Comprei e A caminho. */
import { aCaminho, lista, lojasComSite, pedir } from '../motor/compras.ts';
import { hoje, haQuanto } from '../motor/datas.ts';
import { precisa } from '../motor/estoque.ts';
import { endereco, linkDoProduto } from '../motor/lojas.ts';
import { fmt } from '../motor/unidades.ts';
import { S } from './estado.ts';
import { escapar as e } from './seguranca.ts';

const curto = (nome: string): string => nome.replace(/^dental\s+/i, '');

export function telaComprar(): string {
  const cs = S.c!, L = lista(cs), C = aCaminho(cs), sites = lojasComSite(cs), dia = hoje();
  let h = `<div class="resumo"><div class="grande">${L.length ? `${L.length} para comprar` : 'Nada para comprar'}</div>
    <p>Entra aqui sozinho o que chega no mínimo. Compre no site ou no balcão e toque em <b>Comprei ✓</b>.</p>
    ${sites.length ? `<div class="dois">${sites.map(l => `<a class="site-bt" href="${e(l.site)}" target="_blank" rel="noopener">${e(l.nome)} ↗</a>`).join('')}</div>` : ''}</div>`;
  h += L.length ? L.map(u => {
    const o = u.o, n = pedir(cs, u), lk = cs.links[u.k] ?? {};
    const st = o.qtd === null ? `<small>ainda não contado · mínimo ${u.item.min}</small>`
      : o.qtd === 0 ? `<small class="zero">acabou · mínimo ${u.item.min}</small>`
      : `<small>tem ${o.qtd} · mínimo ${u.item.min}${cs.extra[u.k] && !precisa(u) ? ' · pus à mão' : ''}</small>`;
    const ajustada = Object.keys(lk).length > 0 || !!u.item.busca;
    return `<div class="compra"><div class="l1"><span class="e">${e(u.item.ic)}</span><div class="tx"><b>${e(u.nome)}</b>${st}</div></div>
      <div class="l2"><div class="passo-n"><button data-pede="${e(u.k)}" data-d="-1" aria-label="Comprar menos">−</button><span>${fmt(n, u.item.un)}</span><button data-pede="${e(u.k)}" data-d="1" aria-label="Comprar mais">+</button></div>
      <button class="chegou" data-comprei="${e(u.k)}">Comprei ✓</button></div>
      ${sites.length ? `<div class="l3">${sites.map(l => {
        const link = linkDoProduto(cs, l, u);
        return `<a class="loja-bt ${link ? 'salvo' : ''}" href="${e(endereco(cs, l, u))}" target="_blank" rel="noopener">${link ? '★ ' : ''}${e(curto(l.nome))} ↗</a>`;
      }).join('')}<button class="link-bt2" data-link="${e(u.k)}">✎ ${ajustada ? 'busca ajustada' : 'ajustar busca'}</button></div>` : ''}</div>`;
  }).join('') : `<div class="tudo-ok">✅ Nada no mínimo.<br>Quando algo chegar no mínimo, aparece aqui sozinho.</div>`;
  h += `<button class="link-bt" id="outro">+ Pôr outro material na lista</button>`;
  if (C.length) {
    h += `<div class="grupo"><h3>🚚 A caminho</h3>${C.map(u => {
      const c = cs.caminho[u.k]!, l = cs.lojas[c.loja];
      return `<div class="compra caminho"><div class="l1"><span class="e">${e(u.item.ic)}</span><div class="tx"><b>${e(u.nome)}</b><small>pedi ${fmt(c.q, u.item.un)} na ${e(l ? l.nome : 'loja')} · ${haQuanto(c.quando, dia)}</small></div></div>
        <div class="l2"><button class="link-bt" data-naoveio="${e(u.k)}">Não veio</button><button class="chegou" style="flex:1" data-chegou="${e(u.k)}">Chegou ✓</button></div></div>`;
    }).join('')}</div>`;
  }
  return h;
}
