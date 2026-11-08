/** Aba Organizar: Materiais · Grupos · Lojas · Avisos. */
import { listarGrupos, listarItens, listarLojas } from '../motor/estoque.ts';
import { S, type Segmento } from './estado.ts';
import { escapar as e } from './seguranca.ts';

const SEGMENTOS: [Segmento, string][] = [['itens', 'Materiais'], ['grupos', 'Grupos'], ['lojas', 'Lojas'], ['avisos', 'Avisos']];

export function telaOrganizar(): string {
  const cs = S.c!;
  const seg = `<div class="segmento">${SEGMENTOS.map(([k, t]) => `<button data-seg="${k}" class="${S.seg === k ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  const grupos = listarGrupos(cs);
  if (S.seg === 'itens') {
    let h = seg + `<p class="explica">Toque num material para mudar o nome, a figurinha, a unidade, o mínimo, a validade e as cores. No Estoque, também dá para segurar o dedo nele.</p><button class="criar" id="novoItem">+ Novo material</button>`;
    for (const g of grupos) {
      const its = listarItens(cs).filter(i => i.cat === g.id);
      if (!its.length) continue;
      h += `<div class="grupo"><h3>${e(g.ic)} ${e(g.nome)}</h3>${its.map(it => `<button class="org-l" data-edit="${e(it.id)}"><span class="e">${e(it.ic)}</span><span class="tx"><b>${e(it.nome)}</b><small>${e(it.un)} · avisa com ${it.min}${it.val ? ' · tem validade' : ''}${it.cores ? ` · ${Object.keys(it.cores).length} cores` : ''}</small></span><i>✎</i></button>`).join('')}</div>`;
    }
    return h;
  }
  if (S.seg === 'grupos') {
    return seg + `<p class="explica">Os grupos separam o Estoque. Toque para trocar o nome ou a figurinha; as setas mudam a ordem.</p>` +
      grupos.map((g, i) => `<div class="org-grupo"><button class="org-l" data-grupo="${e(g.id)}"><span class="e">${e(g.ic)}</span><span class="tx"><b>${e(g.nome)} <i>✎</i></b><small>${listarItens(cs).filter(x => x.cat === g.id).length} materiais</small></span></button>
        <button class="seta" data-gsobe="${e(g.id)}" ${i === 0 ? 'disabled' : ''} aria-label="Subir">▲</button><button class="seta" data-gdesce="${e(g.id)}" ${i === grupos.length - 1 ? 'disabled' : ''} aria-label="Descer">▼</button></div>`).join('') +
      `<button class="criar" data-grupo="">+ Novo grupo</button>`;
  }
  if (S.seg === 'lojas') {
    return seg + `<p class="explica">Onde a Andressa compra. Loja com site ganha um botão em cada material do Comprar; loja sem site é a de balcão.</p>` +
      listarLojas(cs).map(l => `<button class="org-l" data-loja="${e(l.id)}"><span class="e">${l.site ? '🌐' : '🏪'}</span><span class="tx"><b>${e(l.nome)}</b><small>${l.site ? e(l.site.replace(/^https:\/\//, '')) : 'sem site: compra no balcão'}</small></span><i>✎</i></button>`).join('') +
      `<button class="criar" data-loja="">+ Nova loja</button>`;
  }
  return seg + `<p class="explica">Com quanto tempo de antecedência o cartão <b>Vence logo</b> avisa que um material vai vencer?</p>
    <div class="chips">${[15, 30, 60, 90].map(n => `<button class="chip ${cs.antes === n ? 'sel' : ''}" data-antes="${n}">${n} dias</button>`).join('')}</div>
    <p class="explica">O mínimo é de cada material (toque nele em <b>Materiais</b>). Quando a quantidade chega no mínimo, ele entra no <b>Comprar</b>.</p>
    <p class="explica">Conta: ${e(S.eu?.email ?? '')}</p><button class="sair" id="sairConta">Sair desta conta</button>`;
}
