/**
 * O ponto de partida do consultório (da entrevista com a Andressa). Tudo é editável no app:
 * nada aqui fica cravado. Todo material nasce "não contado" (qtd null) e sem validade.
 */
import type { Consultorio, Cor, Grupo, Item, Loja } from './tipos.ts';

const GRUPOS: [string, string, string][] = [
  ['desc', 'Descartáveis', '🧤'], ['clar', 'Clareamento', '✨'], ['rest', 'Restauração', '🪥'],
  ['orto', 'Ortodontia', '🦷'], ['mold', 'Moldagem e gesso', '🫙'], ['limp', 'Limpeza e líquidos', '🧴'],
];

// id, nome, figurinha, grupo, unidade, mínimo, tem validade
const ITENS: [string, string, string, string, string, number, boolean][] = [
  ['luva', 'Luva', '🧤', 'desc', 'caixa', 2, false],
  ['sugador', 'Sugador', '🥤', 'desc', 'pacote', 1, false],
  ['gaze', 'Gaze', '🩹', 'desc', 'pacote', 2, false],
  ['mascara', 'Máscara', '😷', 'desc', 'caixa', 1, false],
  ['babador', 'Babador', '🧻', 'desc', 'pacote', 1, false],
  ['rolete', 'Rolete de algodão', '⚪', 'desc', 'pacote', 2, false],
  ['microbrush', 'Microbrush', '🖌️', 'desc', 'tubo', 1, false],
  ['caseiro', 'Seringa de clareamento caseiro', '💉', 'clar', 'seringa', 4, true],
  ['topdam', 'Top Dam (barreira gengival)', '🛡️', 'clar', 'seringa', 1, true],
  ['consult', 'Clareamento de consultório', '✨', 'clar', 'kit', 1, true],
  ['acido', 'Ácido fosfórico (gel)', '🧪', 'rest', 'seringa', 2, true],
  ['adesivo', 'Adesivo', '💧', 'rest', 'frasco', 1, true],
  ['resina', 'Resina', '🎨', 'rest', 'seringa', 1, true],
  ['flow', 'Resina flow', '💉', 'rest', 'seringa', 1, true],
  ['tira', 'Tira de lixa', '📏', 'rest', 'pacote', 1, false],
  ['matriz', 'Matriz de aço', '🔩', 'rest', 'rolo', 1, false],
  ['carbono', 'Papel carbono', '📄', 'rest', 'bloco', 1, false],
  ['botao', 'Botão lingual', '🔘', 'orto', 'pacote', 1, false],
  ['caixa', 'Caixa para aparelho ortodôntico', '📦', 'orto', 'unidade', 5, false],
  ['alginato', 'Alginato', '🫙', 'mold', 'pacote', 1, true],
  ['gesso', 'Gesso', '🪨', 'mold', 'pacote', 1, false],
  ['agua', 'Água destilada', '💧', 'limp', 'galão', 1, false],
  ['alcool', 'Álcool 70%', '🧴', 'limp', 'frasco', 2, false],
];

/** As cores da resina são um palpite: ela ajusta no app. [id seguro, nome] */
export const CORES_RESINA: [string, string][] = [['A1', 'A1'], ['A2', 'A2'], ['A3', 'A3'], ['A35', 'A3,5'], ['B1', 'B1']];

export const LOJAS_INICIAIS: [string, string, string, string][] = [
  ['cremer', 'Dental Cremer', 'https://www.dentalcremer.com.br', 'https://www.dentalcremer.com.br/catalog_search/?term='],
  ['speed', 'Dental Speed', 'https://www.dentalspeed.com', 'https://www.dentalspeed.com/catalog_search/?term='],
  ['local', 'Dental daqui', '', ''],
];

export function consultorioInicial(email: string): Consultorio {
  const grupos: Record<string, Grupo> = {};
  GRUPOS.forEach(([id, nome, ic], ordem) => { grupos[id] = { nome, ic, ordem }; });
  const itens: Record<string, Item> = {};
  ITENS.forEach(([id, nome, ic, cat, un, min, val], ordem) => {
    let cores: Record<string, Cor> | null = null;
    if (id === 'resina') {
      cores = {};
      CORES_RESINA.forEach(([cid, cnome], o) => { cores![cid] = { nome: cnome, qtd: null, vence: null, ordem: o }; });
    }
    itens[id] = { nome, ic, cat, un, min, val, busca: null, qtd: null, vence: null, ordem, cores };
  });
  const lojas: Record<string, Loja> = {};
  LOJAS_INICIAIS.forEach(([id, nome, site, busca], ordem) => { lojas[id] = { nome, site, busca, ordem }; });
  return { membros: [email.trim().toLowerCase()], nome: 'Consultório da Andressa', antes: 30, grupos, itens, lojas, links: {}, caminho: {}, pedido: {}, extra: {} };
}
