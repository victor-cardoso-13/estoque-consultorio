/**
 * O que a tela sabe agora: quem sou eu, o consultório (cópia local, atualizada ao vivo pela nuvem), a aba aberta...
 * e `fazer()`, o único caminho de uma ação até a nuvem.
 */
import { aplicar, inverso } from '../motor/escritas.ts';
import { lerConsultorio } from '../motor/ler.ts';
import type { Consultorio, Escritas } from '../motor/tipos.ts';

export type Aba = 'estoque' | 'comprar' | 'documentos' | 'organizar';
export type Segmento = 'itens' | 'grupos' | 'lojas' | 'avisos';

export interface Eu { uid: string; email: string }
/** Quem guarda as escritas: a nuvem (Firebase) ou, no modo de teste do computador, a memória. */
export interface Repo { gravar(escritas: Escritas): void }

export const S = {
  eu: null as Eu | null,
  c: null as Consultorio | null,
  aba: 'estoque' as Aba,
  seg: 'itens' as Segmento,
  filtro: '',
  semInternet: false,
  repo: null as Repo | null,
  sair: (): void => {},
  /** texto de erro simples para mostrar na tela */
  mensagemErro: (_e: unknown): string => 'Algo deu errado. Tente de novo daqui a pouco.',
};

let renderizar: () => void = () => {};
export const ligarRender = (f: () => void) => { renderizar = f; };
export const render = () => renderizar();

let avisador: (texto: string, rotulo?: string, acao?: () => void) => void = () => {};
export const ligarAviso = (f: typeof avisador) => { avisador = f; };
export const avisar = (texto: string, rotulo?: string, acao?: () => void) => avisador(texto, rotulo, acao);

export const consultorio = (): Consultorio => S.c!;

/**
 * Faz uma ação: muda a cópia local na hora (a tela responde sem esperar a internet) e manda SÓ os campos mexidos para a
 * nuvem, numa gravação só. Com `desfazer`, o aviso ganha o botão Desfazer (que também é uma ação).
 */
export function fazer(escritas: Escritas, mensagem?: string, desfazer = false): void {
  if (!S.c || Object.keys(escritas).length === 0) { if (mensagem) avisar(mensagem); return; }
  const volta = inverso(S.c, escritas);
  S.c = aplicar(S.c, escritas);
  S.repo?.gravar(escritas);
  if (mensagem) avisar(mensagem, desfazer ? 'Desfazer' : undefined, desfazer ? () => fazer(volta) : undefined);
  render();
}

/** Chegou uma versão nova do consultório (de outro aparelho ou do cache). */
export function receberConsultorio(dados: unknown): void {
  S.c = lerConsultorio(dados);
  render();
}
