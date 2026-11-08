import { describe, expect, it } from 'vitest';
import { consultorioInicial } from '../src/motor/catalogo.ts';
import { aplicar, inverso } from '../src/motor/escritas.ts';
import { definirQuantidade, unidadeDe, unidades } from '../src/motor/estoque.ts';
import { lista, pediNaLoja, porNaLista, mudarPedido } from '../src/motor/compras.ts';
import { endereco, limparSite, linkOk, termo, termoBase, termoPadrao, urlBusca } from '../src/motor/lojas.ts';
import { lerConsultorio } from '../src/motor/ler.ts';
import { apagarGrupo, apagarLoja, apagarMaterial, dadosDoMaterial, definirAntes, moverGrupo, salvarBusca, salvarGrupo, salvarLoja, salvarMaterial } from '../src/motor/organizar.ts';
import { idCor } from '../src/motor/ids.ts';
import { INCREMENTO, type Consultorio, type Escritas } from '../src/motor/tipos.ts';

const base = (): Consultorio => consultorioInicial('a@b.com');
const u = (c: Consultorio, k: string) => unidadeDe(c, k)!;
const fazer = (c: Consultorio, e: Escritas) => aplicar(c, e);
const ok = <T extends { erro?: string }>(r: T) => { if (r.erro) throw new Error(r.erro); return r as Exclude<T, { erro: string }> & { escritas: Escritas; id: string }; };

describe('termo de busca e endereços', () => {
  it('sem busca, vale o nome sem o que está entre parênteses', () => {
    expect(termoPadrao('Top Dam (barreira gengival)')).toBe('Top Dam');
    expect(termoPadrao('Ácido fosfórico (gel)')).toBe('Ácido fosfórico');
    expect(termoBase('Gaze', '  gaze não estéril 7,5 ')).toBe('gaze não estéril 7,5');
    expect(termoBase('Gaze', null)).toBe('Gaze');
    expect(termoBase('Gaze', 'x'.repeat(100))).toHaveLength(60);
  });
  it('em material com cor, a cor entra no fim', () => {
    const c = base();
    expect(termo(u(c, 'resina_B1'))).toBe('Resina B1');
    expect(termo(u(c, 'resina_A35'))).toBe('Resina A3,5');
    expect(termo(u(c, 'topdam'))).toBe('Top Dam');
  });
  it('as buscas das duas lojas usam encodeURIComponent; loja sem busca abre o site', () => {
    const c = base();
    expect(endereco(c, { id: 'cremer', ...c.lojas.cremer! }, u(c, 'resina_A35'))).toBe('https://www.dentalcremer.com.br/catalog_search/?term=Resina%20A3%2C5');
    expect(endereco(c, { id: 'speed', ...c.lojas.speed! }, u(c, 'gaze'))).toBe('https://www.dentalspeed.com/catalog_search/?term=Gaze');
    const nova = { id: 'x', nome: 'Nova', site: 'https://www.novadental.com.br', busca: '', ordem: 9 };
    expect(urlBusca(nova, 'gaze')).toBe('https://www.novadental.com.br');
  });
  it('link de produto: só https e do mesmo domínio da loja (ou subdomínio; www tanto faz)', () => {
    const site = 'https://www.dentalcremer.com.br';
    expect(linkOk('https://www.dentalcremer.com.br/gaze-123', site)).toBe(true);
    expect(linkOk('https://dentalcremer.com.br/gaze', site)).toBe(true);
    expect(linkOk('https://loja.dentalcremer.com.br/gaze', site)).toBe(true);
    expect(linkOk('http://www.dentalcremer.com.br/gaze', site)).toBe(false);
    expect(linkOk('https://dentalcremer.com.br.malvado.com/gaze', site)).toBe(false);
    expect(linkOk('https://malvadodentalcremer.com.br/gaze', site)).toBe(false);
    expect(linkOk('https://www.dentalspeed.com/gaze', site)).toBe(false);
    expect(linkOk('javascript:alert(1)', site)).toBe(false);
    expect(linkOk('https://user:senha@www.dentalcremer.com.br/x', site)).toBe(false);
    expect(linkOk('https://www.dentalcremer.com.br/' + 'a'.repeat(300), site)).toBe(false);
    expect(linkOk('não é link', site)).toBe(false);
  });
  it('o link guardado vence a busca, mas só se ainda passar no teste', () => {
    let c = base();
    const loja = { id: 'cremer', ...c.lojas.cremer! };
    c = fazer(c, { 'links.gaze.cremer': 'https://www.dentalcremer.com.br/gaze-nao-esteril' });
    expect(endereco(c, loja, u(c, 'gaze'))).toBe('https://www.dentalcremer.com.br/gaze-nao-esteril');
    c = fazer(c, { 'links.gaze.cremer': 'javascript:alert(1)' });
    expect(endereco(c, loja, u(c, 'gaze'))).toBe('https://www.dentalcremer.com.br/catalog_search/?term=Gaze');
  });
  it('limparSite: https, sem barra no fim, até 100', () => {
    expect(limparSite('  https://www.x.com.br/ ')).toBe('https://www.x.com.br');
    expect(limparSite('')).toBe('');
    expect(limparSite('http://x.com')).toBeNull();
    expect(limparSite('www.x.com')).toBeNull();
    expect(limparSite('https://x.com/' + 'a'.repeat(100))).toBeNull();
    expect(limparSite('javascript:alert(1)')).toBeNull();
  });
});

describe('Procurar nas lojas (salvarBusca)', () => {
  it('guarda o "procurar como" e o link; link de outro site dá erro com o texto do mock', () => {
    const c = base();
    const r = salvarBusca(c, 'gaze', null, 'gaze não estéril 7,5', { cremer: 'https://www.dentalcremer.com.br/p/1', speed: '' });
    const e = ok(r).escritas;
    expect(e['itens.gaze.busca']).toBe('gaze não estéril 7,5');
    expect(e['links.gaze.cremer']).toBe('https://www.dentalcremer.com.br/p/1');
    const feio = salvarBusca(c, 'gaze', null, '', { cremer: 'https://www.dentalspeed.com/x' });
    expect(feio.erro).toBe('Esse link não é do site da Dental Cremer. Ele precisa começar com https://www.dentalcremer.com.br/');
  });
  it('termo igual ao padrão vira null; link em branco apaga o antigo', () => {
    let c = fazer(base(), { 'links.gaze.cremer': 'https://www.dentalcremer.com.br/p/1', 'itens.gaze.busca': 'outra' });
    const e = ok(salvarBusca(c, 'gaze', null, 'Gaze', { cremer: '' })).escritas;
    expect(e['itens.gaze.busca']).toBeNull();
    c = fazer(c, e);
    expect(c.links.gaze?.cremer).toBeUndefined();
  });
  it('em cor, o link é da chave item_cor', () => {
    const e = ok(salvarBusca(base(), 'resina', 'B1', '', { speed: 'https://www.dentalspeed.com/resina-b1' })).escritas;
    expect(e['links.resina_B1.speed']).toBe('https://www.dentalspeed.com/resina-b1');
  });
});

describe('editar material', () => {
  it('novo material nasce não contado; erros em português', () => {
    const c = base();
    const d = dadosDoMaterial(c, null, { nome: '  Anestésico ', cat: 'rest', un: 'caixa', val: true });
    const r = ok(salvarMaterial(c, d, 'novo1'));
    const c2 = fazer(c, r.escritas);
    expect(c2.itens.novo1).toMatchObject({ nome: 'Anestésico', cat: 'rest', qtd: null, val: true, cores: null, busca: null });
    expect(salvarMaterial(c, { ...d, nome: '   ' }, 'x').erro).toBe('Escreva o nome do material.');
    expect(salvarMaterial(c, { ...d, nome: 'luva' }, 'x').erro).toBe('Já existe um material com esse nome.');
    expect(salvarMaterial(c, { ...d, temCores: true, cores: [] }, 'x').erro).toBe('Ponha pelo menos uma cor, ou desligue "Separar por cor".');
  });
  it('limite de 300 materiais e de 20 cores', () => {
    let c = base();
    for (let i = Object.keys(c.itens).length; i < 300; i++) c = fazer(c, { [`itens.m${i}`]: { ...c.itens.luva!, nome: `M${i}`, ordem: i } });
    expect(salvarMaterial(c, dadosDoMaterial(c, null, { nome: 'Mais um' }), 'z').erro).toMatch(/300/);
    const cores = Array.from({ length: 21 }, (_, i) => `C${i}`);
    expect(salvarMaterial(base(), dadosDoMaterial(base(), null, { nome: 'Cores', temCores: true, cores }), 'z').erro).toMatch(/20/);
  });
  it('id de cor seguro: A3,5 vira A35 e não repete', () => {
    expect(idCor('A3,5', [])).toBe('A35');
    expect(idCor('A35', ['A35'])).toBe('A352');
    expect(idCor('???', [])).toBe('c');
  });
  it('ligar "cor" num material que já tem número passa o número para a 1ª cor', () => {
    let c = fazer(base(), definirQuantidade(u(base(), 'adesivo'), 3, '2026-12-01'));
    const d = { ...dadosDoMaterial(c, 'adesivo'), temCores: true, cores: ['Azul', 'Rosa'] };
    c = fazer(c, ok(salvarMaterial(c, d, 'x')).escritas);
    const cs = c.itens.adesivo!.cores!;
    expect(c.itens.adesivo!.qtd).toBeNull();
    expect(cs.Azul).toMatchObject({ qtd: 3, vence: '2026-12-01', ordem: 0 });
    expect(cs.Rosa).toMatchObject({ qtd: null, vence: null, ordem: 1 });
  });
  it('desligar as cores soma só o que foi contado (tudo não contado = null) e fica a validade mais próxima', () => {
    let c = base();
    c = fazer(c, definirQuantidade(u(c, 'resina_A1'), 2, '2027-01-01'));
    c = fazer(c, definirQuantidade(u(c, 'resina_A2'), 3, '2026-12-01'));
    c = fazer(c, definirQuantidade(u(c, 'resina_A3'), 0, null));
    let d = { ...dadosDoMaterial(c, 'resina'), temCores: false };
    const c2 = fazer(c, ok(salvarMaterial(c, d, 'x')).escritas);
    expect(c2.itens.resina).toMatchObject({ qtd: 5, vence: '2026-12-01' });
    expect(c2.itens.resina!.cores).toBeUndefined();
    // tudo não contado
    const c3 = fazer(base(), ok(salvarMaterial(base(), { ...dadosDoMaterial(base(), 'resina'), temCores: false }, 'x')).escritas);
    expect(c3.itens.resina!.qtd).toBeNull();
  });
  it('mexer nas cores: tira uma (e limpa as compras dela), põe outra, mantém as contas das que ficam', () => {
    let c = base();
    c = fazer(c, definirQuantidade(u(c, 'resina_A2'), 4, null));
    c = fazer(c, porNaLista(u(c, 'resina_B1')));
    c = fazer(c, { 'links.resina_B1.cremer': 'https://www.dentalcremer.com.br/x' });
    const d = { ...dadosDoMaterial(c, 'resina'), cores: ['A1', 'A2', 'A3', 'A3,5', 'C2'] };
    const e = ok(salvarMaterial(c, d, 'x')).escritas;
    const c2 = fazer(c, e);
    expect(Object.keys(c2.itens.resina!.cores!).sort()).toEqual(['A1', 'A2', 'A3', 'A35', 'C2']);
    expect(c2.itens.resina!.cores!.A2!.qtd).toBe(4);
    expect(c2.extra.resina_B1).toBeUndefined();
    expect(c2.links.resina_B1).toBeUndefined();
    // Desfazer devolve tudo, inclusive o link e a cor B1
    const c3 = fazer(c2, inverso(c, e));
    expect(c3.itens.resina!.cores!.B1).toBeDefined();
    expect(c3.extra.resina_B1).toBe(true);
    expect(c3.links.resina_B1!.cremer).toBe('https://www.dentalcremer.com.br/x');
    expect(c3.itens.resina!.cores!.C2).toBeUndefined();
  });
  it('desligar a validade apaga as datas', () => {
    let c = fazer(base(), definirQuantidade(u(base(), 'adesivo'), 2, '2026-12-01'));
    c = fazer(c, ok(salvarMaterial(c, { ...dadosDoMaterial(c, 'adesivo'), val: false }, 'x')).escritas);
    expect(c.itens.adesivo!.vence).toBeNull();
    expect(c.itens.adesivo!.val).toBe(false);
  });
  it('apagar o material limpa links, a caminho, pedido e extra — e o Desfazer devolve tudo', () => {
    let c = base();
    c = fazer(c, { 'links.resina_A1.cremer': 'https://www.dentalcremer.com.br/x', 'links.resina.speed': 'https://www.dentalspeed.com/y' });
    c = fazer(c, pediNaLoja(c, u(c, 'resina_A2'), 'speed', 2, 5));
    c = fazer(c, mudarPedido(u(c, 'resina_A1'), 3));
    c = fazer(c, porNaLista(u(c, 'luva')));
    const e = apagarMaterial(c, 'resina');
    const c2 = fazer(c, e);
    expect(c2.itens.resina).toBeUndefined();
    expect(c2.links).toEqual({});
    expect(c2.caminho).toEqual({});
    expect(c2.pedido).toEqual({});
    expect(c2.extra.luva).toBe(true);
    const c3 = fazer(c2, inverso(c, e));
    expect(c3.itens.resina!.cores!.A2).toBeDefined();
    expect(c3.caminho.resina_A2).toBeDefined();
    expect(c3.pedido.resina_A1).toBe(3);
    expect(c3.links.resina_A1!.cremer).toBeDefined();
  });
});

describe('grupos e lojas', () => {
  it('apagar um grupo move os materiais dele para outro; precisa sobrar um', () => {
    const c = base();
    const r = apagarGrupo(c, 'desc')!;
    const c2 = fazer(c, r.escritas);
    expect(c2.grupos.desc).toBeUndefined();
    expect(c2.itens.luva!.cat).toBe('clar');
    expect(r.destino).toBe('Clareamento');
    expect(fazer(c2, inverso(c, r.escritas)).itens.luva!.cat).toBe('desc');
    let so = c;
    for (const g of ['clar', 'rest', 'orto', 'mold', 'limp']) so = fazer(so, apagarGrupo(so, g)!.escritas);
    expect(apagarGrupo(so, 'desc')).toBeNull();
  });
  it('▲▼ troca a ordem', () => {
    let c = base();
    c = fazer(c, moverGrupo(c, 'clar', -1));
    expect(Object.entries(c.grupos).sort((a, b) => a[1].ordem - b[1].ordem).map(x => x[0]).slice(0, 3)).toEqual(['clar', 'desc', 'rest']);
    expect(moverGrupo(c, 'clar', -1)).toEqual({}); // já é o primeiro
  });
  it('salvar grupo: nome obrigatório e limite de 20', () => {
    const c = base();
    expect(salvarGrupo(c, { id: null, nome: ' ', ic: '' }, 'g').erro).toBe('Escreva o nome do grupo.');
    const c2 = fazer(c, ok(salvarGrupo(c, { id: null, nome: 'Anestesia', ic: '💉' }, 'g1')).escritas);
    expect(c2.grupos.g1).toMatchObject({ nome: 'Anestesia', ordem: 6 });
    let cheio = c;
    for (let i = 6; i < 20; i++) cheio = fazer(cheio, { [`grupos.x${i}`]: { nome: 'x', ic: '🗂️', ordem: i } });
    expect(salvarGrupo(cheio, { id: null, nome: 'Mais', ic: '' }, 'z').erro).toMatch(/20/);
  });
  it('loja: site com https, sem barra; trocar o site apaga a busca antiga', () => {
    const c = base();
    expect(salvarLoja(c, { id: null, nome: 'X', site: 'http://x.com' }, 'l1').erro).toBe('O site precisa começar com https://');
    const c2 = fazer(c, ok(salvarLoja(c, { id: null, nome: 'Dental Centro', site: 'https://dentalcentro.com.br/' }, 'l1')).escritas);
    expect(c2.lojas.l1).toMatchObject({ site: 'https://dentalcentro.com.br', busca: '', ordem: 3 });
    const c3 = fazer(c, ok(salvarLoja(c, { id: 'cremer', nome: 'Cremer', site: 'https://outro.com' }, 'x')).escritas);
    expect(c3.lojas.cremer!.busca).toBe('');
    const c4 = fazer(c, ok(salvarLoja(c, { id: 'cremer', nome: 'Cremer 2', site: 'https://www.dentalcremer.com.br' }, 'x')).escritas);
    expect(c4.lojas.cremer!.busca).toContain('catalog_search');
  });
  it('apagar loja: tira os links dela e o que estava a caminho volta para a lista; sobra pelo menos uma', () => {
    let c = base();
    c = fazer(c, { 'links.gaze.cremer': 'https://www.dentalcremer.com.br/x', 'links.gaze.speed': 'https://www.dentalspeed.com/x' });
    c = fazer(c, definirQuantidade(u(c, 'gaze'), 1, null));
    c = fazer(c, pediNaLoja(c, u(c, 'gaze'), 'cremer', 2, 5));
    expect(lista(c).some(x => x.k === 'gaze')).toBe(false);
    const e = apagarLoja(c, 'cremer')!;
    const c2 = fazer(c, e);
    expect(c2.lojas.cremer).toBeUndefined();
    expect(c2.links.gaze).toEqual({ speed: 'https://www.dentalspeed.com/x' });
    expect(lista(c2).some(x => x.k === 'gaze')).toBe(true);
    const c3 = fazer(c2, inverso(c, e));
    expect(c3.caminho.gaze).toBeDefined();
    expect(c3.links.gaze!.cremer).toBeDefined();
    let uma = c;
    uma = fazer(uma, apagarLoja(uma, 'speed')!); uma = fazer(uma, apagarLoja(uma, 'local')!);
    expect(apagarLoja(uma, 'cremer')).toBeNull();
  });
  it('avisos: só 15, 30, 60 ou 90', () => {
    expect(definirAntes(base(), 60)).toEqual({ antes: 60 });
    expect(definirAntes(base(), 45)).toEqual({});
    expect(definirAntes(base(), 30)).toEqual({});
  });
});

describe('lerConsultorio rejeita dado ruim', () => {
  const cru = () => JSON.parse(JSON.stringify(base()));
  it('o documento bom passa igual', () => {
    expect(lerConsultorio(cru())).toEqual(base());
  });
  it('lixo total vira um consultório vazio e seguro', () => {
    for (const lixo of [null, 5, 'x', [], undefined]) {
      const c = lerConsultorio(lixo);
      expect(Object.keys(c.itens)).toHaveLength(0);
      expect(c.antes).toBe(30);
    }
  });
  it('quantidade negativa vira 0, fracionária vira inteira, texto vira "não contado"', () => {
    const d = cru();
    d.itens.luva.qtd = -1; d.itens.gaze.qtd = 2.9; d.itens.sugador.qtd = '7'; d.itens.babador.qtd = 1e12;
    const c = lerConsultorio(d);
    expect(c.itens.luva!.qtd).toBe(0);
    expect(c.itens.gaze!.qtd).toBe(2);
    expect(c.itens.sugador!.qtd).toBeNull();
    expect(c.itens.babador!.qtd).toBe(99999);
  });
  it('datas inválidas somem; textos são cortados; ids ruins são descartados', () => {
    const d = cru();
    d.itens.adesivo.vence = '2026-02-31'; d.itens.acido.vence = 'amanhã'; d.itens.alginato.vence = '2026-12-01';
    d.itens.luva.nome = 'x'.repeat(200);
    d.itens['mau id!'] = { ...d.itens.luva };
    d.itens.semnome = { ...d.itens.luva, nome: '   ' };
    d.itens.gesso.cat = 'grupoQueNaoExiste';
    const c = lerConsultorio(d);
    expect(c.itens.adesivo!.vence).toBeNull();
    expect(c.itens.acido!.vence).toBeNull();
    expect(c.itens.alginato!.vence).toBe('2026-12-01');
    expect(c.itens.luva!.nome).toHaveLength(40);
    expect(c.itens['mau id!']).toBeUndefined();
    expect(c.itens.semnome).toBeUndefined();
    expect(Object.keys(c.grupos)).toContain(c.itens.gesso!.cat);
  });
  it('item sem validade nunca mostra data', () => {
    const d = cru();
    d.itens.luva.vence = '2026-12-01';
    expect(lerConsultorio(d).itens.luva!.vence).toBeNull();
  });
  it('link de outro site ou javascript: é descartado; site e busca de loja ruins viram balcão', () => {
    const d = cru();
    d.links = { gaze: { cremer: 'https://www.dentalcremer.com.br/ok', speed: 'https://malvado.com/x' }, luva: { cremer: 'javascript:alert(1)' }, 'chave ruim': { cremer: 'https://www.dentalcremer.com.br/ok' } };
    d.lojas.local = { nome: 'Falsa', site: 'javascript:alert(1)', busca: 'https://x.com/?t=', ordem: 2 };
    d.lojas.speed.busca = 'https://malvado.com/?t=';
    const c = lerConsultorio(d);
    expect(c.links).toEqual({ gaze: { cremer: 'https://www.dentalcremer.com.br/ok' } });
    expect(c.lojas.local).toMatchObject({ site: '', busca: '' });
    expect(c.lojas.speed!.busca).toBe('');
  });
  it('"antes" fora de 15/30/60/90 vira 30; caminho e pedido ruins somem', () => {
    const d = cru();
    d.antes = 45;
    d.caminho = { gaze: { loja: 'cremer', quando: 5, q: 0 }, luva: { loja: 7 }, '!!': { loja: 'x', quando: 1, q: 1 } };
    d.pedido = { gaze: -3, luva: 'dois', 'a b': 2 };
    d.extra = { gaze: true, luva: 'sim' };
    const c = lerConsultorio(d);
    expect(c.antes).toBe(30);
    expect(c.caminho).toEqual({ gaze: { loja: 'cremer', quando: 5, q: 1 } });
    expect(c.pedido).toEqual({ gaze: 1 });
    expect(c.extra).toEqual({ gaze: true });
  });
  it('limites de quantidade: 300 materiais, 20 grupos, 8 lojas, 20 cores', () => {
    const d = cru();
    for (let i = 0; i < 400; i++) d.itens[`m${i}`] = { ...d.itens.luva, nome: `M${i}` };
    for (let i = 0; i < 40; i++) d.grupos[`g${i}`] = { nome: 'x', ic: '🗂️', ordem: i };
    for (let i = 0; i < 20; i++) d.lojas[`l${i}`] = { nome: 'x', site: '', busca: '', ordem: i };
    for (let i = 0; i < 40; i++) d.itens.resina.cores[`c${i}`] = { nome: `C${i}`, qtd: 1, vence: null, ordem: i };
    const c = lerConsultorio(d);
    expect(Object.keys(c.itens).length).toBeLessThanOrEqual(300);
    expect(Object.keys(c.grupos).length).toBeLessThanOrEqual(20);
    expect(Object.keys(c.lojas).length).toBeLessThanOrEqual(8);
    expect(Object.keys(c.itens.resina!.cores!).length).toBeLessThanOrEqual(20);
  });
  it('material com cores não guarda número no próprio material', () => {
    const d = cru();
    d.itens.resina.qtd = 9; d.itens.resina.vence = '2026-12-01';
    const c = lerConsultorio(d);
    expect(c.itens.resina!.qtd).toBeNull();
    expect(c.itens.resina!.vence).toBeNull();
  });
});

describe('escritas', () => {
  it('aplicar não muda o original; incremento em campo vazio vira o número (como o Firestore)', () => {
    const c = base();
    const c2 = aplicar(c, { 'itens.luva.qtd': INCREMENTO(2) });
    expect(c.itens.luva!.qtd).toBeNull();
    expect(c2.itens.luva!.qtd).toBe(2);
  });
});

describe('unidades em ordem de tela', () => {
  it('primeiro o grupo, depois a ordem do material, depois a ordem da cor', () => {
    const k = unidades(base()).map(x => x.k);
    expect(k.slice(0, 3)).toEqual(['luva', 'sugador', 'gaze']);
    expect(k.slice(k.indexOf('resina_A1'), k.indexOf('resina_A1') + 6)).toEqual(['resina_A1', 'resina_A2', 'resina_A3', 'resina_A35', 'resina_B1', 'flow']);
  });
});
