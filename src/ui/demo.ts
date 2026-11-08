/**
 * Modo de teste no computador (só no "npm run dev", com ?demo): o consultório fica na memória, sem login nem nuvem,
 * com quantidades e validades de EXEMPLO (no app de verdade tudo nasce "não contado"; use ?demo=vazio para ver isso).
 * Serve para os prints e para conferir as telas. NÃO existe no site publicado.
 */
import { consultorioInicial } from '../motor/catalogo.ts';
import { aplicar } from '../motor/escritas.ts';
import { definirQuantidade, unidadeDe } from '../motor/estoque.ts';
import { hoje, somarDias } from '../motor/datas.ts';
import { pediNaLoja, porNaLista } from '../motor/compras.ts';
import { S, render } from './estado.ts';

export function iniciarDemo(): void {
  let c = consultorioInicial('andressa@exemplo.com');
  if (new URLSearchParams(location.search).get('demo') !== 'vazio') {
    const dia = hoje();
    // chave, quantidade, vence em N dias
    const lote: [string, number, number | null][] = [
      ['luva', 3, null], ['sugador', 3, null], ['gaze', 2, null], ['mascara', 2, null], ['babador', 1, null], ['rolete', 4, null], ['microbrush', 2, null],
      ['caseiro', 6, 200], ['topdam', 2, 120], ['consult', 1, 12], ['acido', 3, 150], ['adesivo', 2, 18],
      ['resina_A1', 2, 400], ['resina_A2', 3, 25], ['resina_A3', 2, 300], ['resina_A35', 2, 280], ['resina_B1', 0, null],
      ['flow', 2, 300], ['tira', 2, null], ['matriz', 2, null], ['carbono', 3, null], ['botao', 2, null], ['caixa', 15, null],
      ['alginato', 2, 90], ['gesso', 1, null], ['agua', 2, null], ['alcool', 3, null],
    ];
    for (const [k, q, v] of lote) c = aplicar(c, definirQuantidade(unidadeDe(c, k)!, q, v === null ? null : somarDias(dia, v)));
    c = aplicar(c, pediNaLoja(c, unidadeDe(c, 'consult')!, 'speed', 1, Date.now() - 2 * 86_400_000));
    c = aplicar(c, porNaLista(unidadeDe(c, 'mascara')!));
  }
  S.eu = { uid: 'u1', email: 'andressa@exemplo.com' };
  S.c = c;
  S.repo = { gravar: () => {} };
  render();
}
