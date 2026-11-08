import { describe, expect, it } from 'vitest';
import { consultorioInicial } from '../src/motor/catalogo.ts';
import { aplicar, inverso } from '../src/motor/escritas.ts';
import { chegou, definirQuantidade, inicioContar, unidadeDe, unidades, usar, venceLogo, precisa, diasVence } from '../src/motor/estoque.ts';
import { aCaminho, foraDaLista, lista, mudarPedido, naoVeio, pediNaLoja, pedir, porNaLista } from '../src/motor/compras.ts';
import { diasEntre, diaLocal, haQuanto, somarDias, textoVence } from '../src/motor/datas.ts';
import { APAGAR, INCREMENTO, type Consultorio, type Escritas } from '../src/motor/tipos.ts';
import { fmt, plural } from '../src/motor/unidades.ts';

const HOJE = '2026-11-08';
const base = (): Consultorio => consultorioInicial('Andressa@Teste.com');
const u = (c: Consultorio, k: string) => unidadeDe(c, k)!;
/** faz a ação, aplica e devolve o consultório novo */
const fazer = (c: Consultorio, e: Escritas) => aplicar(c, e);
/** conta tudo com um número (como se ela tivesse contado) */
function contado(q = 5): Consultorio {
  let c = base();
  for (const x of unidades(c)) c = fazer(c, definirQuantidade(unidadeDe(c, x.k)!, q, null));
  return c;
}

describe('catálogo inicial', () => {
  it('nasce tudo não contado, sem validade, com os 23 materiais, 6 grupos e 3 lojas', () => {
    const c = base();
    expect(Object.keys(c.itens)).toHaveLength(23);
    expect(Object.keys(c.grupos)).toHaveLength(6);
    expect(Object.keys(c.lojas)).toHaveLength(3);
    expect(c.membros).toEqual(['andressa@teste.com']);
    for (const x of unidades(c)) { expect(x.o.qtd).toBeNull(); expect(x.o.vence).toBeNull(); }
  });
  it('a resina tem 5 cores (A3,5 vira o id A35) e cada cor é uma unidade', () => {
    const c = base();
    expect(Object.keys(c.itens.resina!.cores!)).toEqual(['A1', 'A2', 'A3', 'A35', 'B1']);
    expect(unidades(c)).toHaveLength(22 + 5);
    expect(u(c, 'resina_A35').nome).toBe('Resina A3,5');
  });
  it('não conta nada: nada vai para o Comprar nem para o Vence logo', () => {
    const c = base();
    expect(lista(c)).toHaveLength(0);
    expect(venceLogo(c, HOJE)).toHaveLength(0);
    expect(inicioContar(c)).toBe(0);
  });
});

describe('− e + (usar) e o Desfazer', () => {
  it('− soma −1 com increment e o aviso diz quanto sobrou', () => {
    let c = fazer(base(), definirQuantidade(u(base(), 'luva'), 5, null));
    const r = usar(u(c, 'luva'), -1);
    expect(r.tipo).toBe('ok');
    if (r.tipo !== 'ok') return;
    expect(r.texto).toBe('Luva: agora 4 caixas');
    expect(r.escritas['itens.luva.qtd']).toEqual(INCREMENTO(-1));
    c = fazer(c, r.escritas);
    expect(c.itens.luva!.qtd).toBe(4);
  });
  it('o inverso de um incremento é o incremento contrário (não o número de antes)', () => {
    const c = fazer(base(), definirQuantidade(u(base(), 'luva'), 5, null));
    const r = usar(u(c, 'luva'), -1);
    if (r.tipo !== 'ok') throw new Error();
    const volta = inverso(c, r.escritas);
    expect(volta['itens.luva.qtd']).toEqual(INCREMENTO(1));
    // o outro aparelho já tinha tirado 1 (agora 3): o Desfazer devolve 1 e dá 4, não "5" por cima
    const outro = aplicar(aplicar(c, r.escritas), { 'itens.luva.qtd': INCREMENTO(-1) });
    expect(aplicar(outro, volta).itens.luva!.qtd).toBe(4);
  });
  it('chegar no mínimo avisa "foi para o Comprar" e a linha entra na lista', () => {
    let c = fazer(base(), definirQuantidade(u(base(), 'luva'), 3, null)); // mínimo 2
    const r = usar(u(c, 'luva'), -1);
    if (r.tipo !== 'ok') throw new Error();
    expect(r.texto).toBe('Luva: agora 2 caixas · foi para o Comprar');
    c = fazer(c, r.escritas);
    expect(precisa(u(c, 'luva'))).toBe(true);
    expect(lista(c).map(x => x.k)).toEqual(['luva']);
  });
  it('chegar a 0 diz "acabou" e apaga a validade; o Desfazer devolve a data', () => {
    let c = fazer(base(), definirQuantidade(u(base(), 'adesivo'), 1, '2026-12-01')); // tem validade
    expect(c.itens.adesivo!.vence).toBe('2026-12-01');
    const r = usar(u(c, 'adesivo'), -1);
    if (r.tipo !== 'ok') throw new Error();
    expect(r.texto).toBe('Adesivo: acabou');
    const volta = inverso(c, r.escritas);
    c = fazer(c, r.escritas);
    expect(c.itens.adesivo!.qtd).toBe(0);
    expect(c.itens.adesivo!.vence).toBeNull();
    c = fazer(c, volta);
    expect(c.itens.adesivo!.qtd).toBe(1);
    expect(c.itens.adesivo!.vence).toBe('2026-12-01');
  });
  it('com 0 o − não faz nada além do aviso', () => {
    const c = fazer(base(), definirQuantidade(u(base(), 'luva'), 0, null));
    expect(usar(u(c, 'luva'), -1)).toEqual({ tipo: 'zero', texto: 'Luva já está em 0' });
  });
  it('material não contado: NUNCA manda incremento (a tela abre o Quanto tem)', () => {
    expect(usar(u(base(), 'luva'), -1)).toEqual({ tipo: 'naoContado' });
    expect(usar(u(base(), 'luva'), 1)).toEqual({ tipo: 'naoContado' });
  });
  it('cada cor da resina tem o seu número e o mínimo é o mesmo para todas', () => {
    let c = base();
    for (const k of ['resina_A1', 'resina_A2']) c = fazer(c, definirQuantidade(u(c, k), 2, null));
    c = fazer(c, (usar(u(c, 'resina_A2'), -1) as { escritas: Escritas }).escritas);
    expect(c.itens.resina!.cores!.A2!.qtd).toBe(1);
    expect(c.itens.resina!.cores!.A1!.qtd).toBe(2);
    expect(precisa(u(c, 'resina_A2'))).toBe(true); // mínimo 1
    expect(precisa(u(c, 'resina_A1'))).toBe(false);
    expect(lista(c).map(x => x.k)).toEqual(['resina_A2']);
  });
  it('mínimo 0 = nunca avisa', () => {
    let c = fazer(base(), { 'itens.luva.min': 0 });
    c = fazer(c, definirQuantidade(u(c, 'luva'), 0, null));
    expect(precisa(u(c, 'luva'))).toBe(false);
  });
});

describe('Quanto tem e Chegou', () => {
  it('Quanto tem troca o número e a data; com 0 a data some', () => {
    let c = fazer(base(), definirQuantidade(u(base(), 'adesivo'), 2, '2026-12-01'));
    expect(c.itens.adesivo!.vence).toBe('2026-12-01');
    c = fazer(c, definirQuantidade(u(c, 'adesivo'), 0, '2026-12-01'));
    expect(c.itens.adesivo!.vence).toBeNull();
  });
  it('material sem validade nunca guarda data', () => {
    const c = fazer(base(), definirQuantidade(u(base(), 'luva'), 2, '2026-12-01'));
    expect(c.itens.luva!.vence).toBeNull();
  });
  it('Chegou soma e guarda a data MAIS PRÓXIMA (se ainda havia estoque)', () => {
    let c = fazer(base(), definirQuantidade(u(base(), 'adesivo'), 1, '2026-12-01'));
    c = fazer(c, chegou(c, u(c, 'adesivo'), 2, '2027-03-01'));
    expect(c.itens.adesivo!.qtd).toBe(3);
    expect(c.itens.adesivo!.vence).toBe('2026-12-01');
    c = fazer(c, chegou(c, u(c, 'adesivo'), 1, '2026-11-20'));
    expect(c.itens.adesivo!.vence).toBe('2026-11-20');
  });
  it('Chegou com estoque 0 usa a data nova, mesmo que a antiga fosse mais cedo', () => {
    let c = fazer(base(), definirQuantidade(u(base(), 'adesivo'), 0, null));
    c = fazer(c, { 'itens.adesivo.vence': '2026-01-01' }); // lixo antigo
    c = fazer(c, chegou(c, u(c, 'adesivo'), 2, '2027-03-01'));
    expect(c.itens.adesivo!.vence).toBe('2027-03-01');
  });
  it('Chegou em material não contado grava o número (não incremento) e some da lista/a caminho/pedido', () => {
    let c = base();
    c = fazer(c, porNaLista(u(c, 'luva')));
    const e = chegou(c, u(c, 'luva'), 3, null);
    expect(e['itens.luva.qtd']).toBe(3);
    expect(e['extra.luva']).toBe(APAGAR);
    expect(fazer(c, e).itens.luva!.qtd).toBe(3);
  });
});

describe('datas (calendário local, "hoje" injetado)', () => {
  it('diasEntre e somarDias', () => {
    expect(diasEntre('2026-11-08', '2026-12-08')).toBe(30);
    expect(diasEntre('2026-11-08', '2026-11-07')).toBe(-1);
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(diasEntre('2026-03-01', '2026-03-31')).toBe(30); // sem erro de horário de verão
  });
  it('perto da meia-noite: o dia é o do calendário local, não o UTC', () => {
    expect(diaLocal(new Date(2026, 10, 8, 23, 59, 59))).toBe('2026-11-08');
    expect(diaLocal(new Date(2026, 10, 9, 0, 0, 1))).toBe('2026-11-09');
    expect(haQuanto(new Date(2026, 10, 8, 23, 59).getTime(), '2026-11-09')).toBe('ontem');
    expect(haQuanto(new Date(2026, 10, 8, 0, 1).getTime(), '2026-11-08')).toBe('hoje');
    expect(haQuanto(new Date(2026, 10, 5, 12).getTime(), '2026-11-08')).toBe('há 3 dias');
  });
  it('textos do vencimento', () => {
    expect([-1, 0, 1, 12].map(textoVence)).toEqual(['venceu', 'vence hoje', 'vence amanhã', 'vence em 12 dias']);
  });
});

describe('Vence logo', () => {
  function com(vence: string, q: number, id = 'adesivo') { return fazer(base(), definirQuantidade(u(base(), id), q, vence)); }
  it('entra quem vence em até 30 dias, do mais perto para o mais longe, e quem já venceu', () => {
    let c = com('2026-12-05', 1);                               // 27 dias
    c = fazer(c, definirQuantidade(u(c, 'acido'), 3, '2026-11-10')); // 2 dias
    c = fazer(c, definirQuantidade(u(c, 'topdam'), 1, '2026-11-01')); // venceu
    c = fazer(c, definirQuantidade(u(c, 'alginato'), 1, '2027-06-01')); // longe
    expect(venceLogo(c, HOJE).map(x => x.k)).toEqual(['topdam', 'acido', 'adesivo']);
    expect(diasVence(u(c, 'topdam'), HOJE)).toBe(-7);
  });
  it('o limite é de 30 dias, o "antes" muda isso', () => {
    let c = com('2026-12-08', 1); // 30 dias
    expect(venceLogo(c, HOJE)).toHaveLength(1);
    c = com('2026-12-09', 1); // 31 dias
    expect(venceLogo(c, HOJE)).toHaveLength(0);
    c = fazer(c, { antes: 60 });
    expect(venceLogo(c, HOJE)).toHaveLength(1);
  });
  it('quantidade 0 ou não contado não entra; vence hoje e amanhã entram', () => {
    expect(venceLogo(com('2026-11-08', 0), HOJE)).toHaveLength(0);
    expect(venceLogo(com('2026-11-08', 2), HOJE)).toHaveLength(1);
    const nao = fazer(base(), { 'itens.adesivo.vence': '2026-11-09' });
    expect(venceLogo(nao, HOJE)).toHaveLength(0);
  });
  it('cada cor tem a sua validade', () => {
    let c = fazer(base(), definirQuantidade(u(base(), 'resina_A2'), 2, '2026-11-20'));
    c = fazer(c, definirQuantidade(u(c, 'resina_B1'), 2, '2027-05-01'));
    expect(venceLogo(c, HOJE).map(x => x.k)).toEqual(['resina_A2']);
  });
});

describe('Comprar', () => {
  it('entra o que chegou no mínimo (contado), mais o que ela pôs à mão, menos o a caminho', () => {
    let c = contado(9);
    c = fazer(c, definirQuantidade(u(c, 'gaze'), 2, null));    // mínimo 2
    c = fazer(c, definirQuantidade(u(c, 'sugador'), 0, null)); // acabou
    expect(lista(c).map(x => x.k)).toEqual(['sugador', 'gaze']);
    c = fazer(c, porNaLista(u(c, 'mascara')));
    expect(lista(c).map(x => x.k)).toEqual(['sugador', 'gaze', 'mascara']);
    expect(foraDaLista(c).some(x => x.k === 'mascara')).toBe(false);
    expect(foraDaLista(c).some(x => x.k === 'luva')).toBe(true);
  });
  it('a sugestão é max(1, 2·mínimo − quanto tem) e ela pode mudar', () => {
    let c = contado(5);
    c = fazer(c, definirQuantidade(u(c, 'gaze'), 2, null));
    expect(pedir(c, u(c, 'gaze'))).toBe(2);  // 4 − 2
    c = fazer(c, definirQuantidade(u(c, 'caixa'), 4, null));
    expect(pedir(c, u(c, 'caixa'))).toBe(6); // 10 − 4
    c = fazer(c, definirQuantidade(u(c, 'luva'), 9, null));
    expect(pedir(c, u(c, 'luva'))).toBe(1);  // nunca menos que 1
    c = fazer(c, mudarPedido(u(c, 'gaze'), 5));
    expect(pedir(c, u(c, 'gaze'))).toBe(5);
    c = fazer(c, mudarPedido(u(c, 'gaze'), 0));
    expect(pedir(c, u(c, 'gaze'))).toBe(1);
  });
  it('Comprei com site: vai para "A caminho" com {loja, quando, q} e sai da lista', () => {
    let c = contado(5);
    c = fazer(c, definirQuantidade(u(c, 'gaze'), 1, null));
    c = fazer(c, mudarPedido(u(c, 'gaze'), 4));
    const agora = new Date(2026, 10, 8, 10).getTime();
    c = fazer(c, pediNaLoja(c, u(c, 'gaze'), 'cremer', 3, agora));
    expect(c.caminho.gaze).toEqual({ loja: 'cremer', quando: agora, q: 3 });
    expect(c.pedido.gaze).toBeUndefined();
    expect(lista(c).some(x => x.k === 'gaze')).toBe(false);
    expect(aCaminho(c).map(x => x.k)).toEqual(['gaze']);
  });
  it('Chegou ✓ soma a quantidade pedida e tira de "A caminho"', () => {
    let c = contado(5);
    c = fazer(c, definirQuantidade(u(c, 'gaze'), 1, null));
    c = fazer(c, pediNaLoja(c, u(c, 'gaze'), 'cremer', 3, 1));
    c = fazer(c, chegou(c, u(c, 'gaze'), c.caminho.gaze!.q, null));
    expect(c.itens.gaze!.qtd).toBe(4);
    expect(c.caminho.gaze).toBeUndefined();
    expect(lista(c).some(x => x.k === 'gaze')).toBe(false);
  });
  it('Comprei no balcão: soma ao estoque na hora e limpa lista/pedido', () => {
    let c = contado(5);
    c = fazer(c, definirQuantidade(u(c, 'babador'), 1, null));
    c = fazer(c, mudarPedido(u(c, 'babador'), 2));
    c = fazer(c, chegou(c, u(c, 'babador'), 2, null));
    expect(c.itens.babador!.qtd).toBe(3);
    expect(c.pedido.babador).toBeUndefined();
    expect(lista(c).some(x => x.k === 'babador')).toBe(false);
  });
  it('Não veio: volta para a lista (e o que ela pôs à mão continua lá)', () => {
    let c = contado(5);
    c = fazer(c, porNaLista(u(c, 'mascara')));
    c = fazer(c, pediNaLoja(c, u(c, 'mascara'), 'speed', 1, 1));
    expect(lista(c).some(x => x.k === 'mascara')).toBe(false);
    c = fazer(c, naoVeio(u(c, 'mascara')));
    expect(lista(c).some(x => x.k === 'mascara')).toBe(true);
  });
  it('o inverso de Comprei devolve o pedido e tira de "A caminho"', () => {
    let c = contado(5);
    c = fazer(c, definirQuantidade(u(c, 'gaze'), 1, null));
    c = fazer(c, mudarPedido(u(c, 'gaze'), 4));
    const e = pediNaLoja(c, u(c, 'gaze'), 'cremer', 3, 1);
    const volta = inverso(c, e);
    const d = fazer(fazer(c, e), volta);
    expect(d.caminho.gaze).toBeUndefined();
    expect(d.pedido.gaze).toBe(4);
  });
});

describe('Contar', () => {
  it('começa pelo primeiro não contado; se todos foram contados, do início', () => {
    let c = base();
    expect(inicioContar(c)).toBe(0);
    c = fazer(c, definirQuantidade(u(c, 'luva'), 3, null));
    c = fazer(c, definirQuantidade(u(c, 'sugador'), 1, null));
    expect(inicioContar(c)).toBe(2);
    expect(unidades(c)[2]!.k).toBe('gaze');
    expect(inicioContar(contado(1))).toBe(0);
  });
  it('pula o que já foi contado no meio', () => {
    let c = base();
    c = fazer(c, definirQuantidade(u(c, 'luva'), 3, null));
    c = fazer(c, definirQuantidade(u(c, 'gaze'), 3, null));
    expect(inicioContar(c)).toBe(1);
  });
});

describe('plural das unidades', () => {
  it('galão → galões, o resto com s', () => {
    expect(plural('galão')).toBe('galões');
    expect(plural('caixa')).toBe('caixas');
    expect(plural('unidade')).toBe('unidades');
    expect(plural('estojo')).toBe('estojos');
    expect(fmt(1, 'galão')).toBe('1 galão');
    expect(fmt(2, 'galão')).toBe('2 galões');
    expect(fmt(0, 'caixa')).toBe('0 caixas');
  });
});
