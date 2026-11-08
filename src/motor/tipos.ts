/**
 * Os tipos do consultório. Este é o formato do documento que fica no Firebase em consultorios/{id}.
 * O motor (src/motor) não sabe que existe tela nem internet.
 */

export interface Grupo { nome: string; ic: string; ordem: number }
export type GrupoComId = Grupo & { id: string };

/** Uma cor (ou tamanho) de um material separado, como a resina. */
export interface Cor {
  nome: string;
  /** null = ainda não contada */
  qtd: number | null;
  /** AAAA-MM-DD (a que vence primeiro) ou null */
  vence: string | null;
  ordem: number;
}

export interface Item {
  nome: string;
  ic: string;
  /** id do grupo */
  cat: string;
  /** unidade de contagem: caixa, pacote… */
  un: string;
  /** avisa quando tiver este tanto ou menos (0 = nunca avisa); o mesmo para todas as cores */
  min: number;
  /** tem validade? */
  val: boolean;
  /** "procurar nas lojas como" (null = o nome sem o que está entre parênteses) */
  busca: string | null;
  /** quantidade; null = ainda não contado. Em material com cores fica null (valem as cores). */
  qtd: number | null;
  vence: string | null;
  ordem: number;
  cores: Record<string, Cor> | null;
}
export type ItemComId = Item & { id: string };

export interface Loja {
  nome: string;
  /** https://… sem barra no fim; '' = loja de balcão */
  site: string;
  /** começo do endereço de busca (só nas lojas que sabemos buscar); '' = sem busca */
  busca: string;
  ordem: number;
}
export type LojaComId = Loja & { id: string };

/** Pedido feito no site, ainda a caminho. */
export interface Caminho { loja: string; /** milissegundos */ quando: number; q: number }

export interface Consultorio {
  /** e-mails (minúsculos) de quem pode ver e mexer. Nesta versão, um só. */
  membros: string[];
  nome: string;
  /** o "Vence logo" avisa com tantos dias de antecedência: 15, 30, 60 ou 90 */
  antes: number;
  grupos: Record<string, Grupo>;
  itens: Record<string, Item>;
  lojas: Record<string, Loja>;
  /** chave de compra → loja → link de um produto */
  links: Record<string, Record<string, string>>;
  caminho: Record<string, Caminho>;
  /** chave de compra → quantos comprar (quando ela mudou a sugestão) */
  pedido: Record<string, number>;
  /** chave de compra → pôs na lista à mão */
  extra: Record<string, true>;
}

/** Um "contável": um material sem cores, ou UMA cor de um material com cores. */
export interface Unidade {
  /** chave de compra: `luva` ou `resina_A2` */
  k: string;
  item: ItemComId;
  corId: string | null;
  /** quem guarda qtd e vence */
  o: { qtd: number | null; vence: string | null };
  /** nome para mostrar: "Resina A2" */
  nome: string;
  /** só o nome da cor, ou o do material */
  curto: string;
}

/** Marca "apague este campo" dentro de um conjunto de escritas. */
export const APAGAR = Symbol('apagar');

/** Marca "some n ao número que já está lá" (increment() do Firestore): dois aparelhos offline somam. */
export class Incremento {
  readonly n: number;
  constructor(n: number) { this.n = n; }
}
export const INCREMENTO = (n: number): Incremento => new Incremento(n);

/**
 * Um conjunto de escritas = o que mudou, como caminhos do Firestore:
 *   { 'itens.luva.qtd': INCREMENTO(-1), 'itens.luva.vence': null }
 * Cada ação do app vira UM conjunto, gravado de uma vez só.
 */
export type Escritas = Record<string, unknown>;

/** Limites de tamanho (o app aplica; as regras do Firebase só limitam a quantidade de cada lista). */
export const LIMITES = {
  nome: 40, grupo: 30, loja: 30, busca: 60, link: 300, site: 100, cor: 12, figurinha: 16,
  itens: 300, grupos: 20, lojas: 8, cores: 20, quantidade: 99999, min: 9999, antes: [15, 30, 60, 90],
} as const;

export const UNIDADES = ['caixa', 'pacote', 'seringa', 'frasco', 'kit', 'tubo', 'rolo', 'bloco', 'pote', 'galão', 'unidade'] as const;
