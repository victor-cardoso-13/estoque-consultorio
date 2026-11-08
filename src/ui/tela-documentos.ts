/** Aba Documentos: a lista dos PDFs em branco para imprimir. Textos e links vêm do catálogo fixo no código. */
import { DOCUMENTOS } from '../motor/documentos.ts';
import { marcaAN } from './marca.ts';
import { escapar as e } from './seguranca.ts';

export function telaDocumentos(): string {
  return `<div class="marca">${marcaAN('')}<div class="n">Dra. Andressa Namba</div><div class="c">Cirurgiã-Dentista · CRO-SP 158296</div><div class="fio"></div></div>
    <p class="intro">Seus documentos prontos para imprimir, com a papelaria do consultório.</p>
    <div class="rotulo">Imprimir</div>
    ${DOCUMENTOS.map(d => `<button class="doc" data-doc="${e(d.id)}"><img class="mini" src="documentos/${e(d.previa)}" alt="" loading="lazy"><span class="tx"><b>${e(d.nome)}</b><small>${e(d.meta)}</small></span><span class="ir">Imprimir</span></button>`).join('')}`;
}
