/**
 * O consultório no Firestore: UM documento, consultorios/{uid de quem criou}.
 * - só quem tem o e-mail do login em `membros` lê e escreve (regra em Jogos/Computador/firestore.rules);
 * - gravamos SÓ os campos mexidos (updateDoc com caminho: 'itens.luva.qtd'); − e + usam increment(), então dois
 *   aparelhos tocando sem internet somam;
 * - onSnapshot = atualiza ao vivo; o cache offline fica ligado: o que for mexido sem internet sobe sozinho quando ela volta.
 * Consumo esperado: menos de 100 gravações por dia (a cota grátis é 20 mil, somada com os jogos e outros apps).
 */
import {
  collection, connectFirestoreEmulator, deleteField, doc, getDocFromServer, increment, initializeFirestore, onSnapshot,
  persistentLocalCache, persistentMultipleTabManager, query, setDoc, updateDoc, where,
  type Unsubscribe,
} from 'firebase/firestore';
import { app, usandoEmulador } from './conta.ts';
import { APAGAR, Incremento, type Consultorio, type Escritas } from '../motor/tipos.ts';

const banco = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
if (usandoEmulador) connectFirestoreEmulator(banco, '127.0.0.1', 8189);

const COLECAO = 'consultorios';

export interface ConsultorioNaNuvem {
  id: string;
  dados: unknown;
  /** há mudanças feitas neste aparelho que ainda não chegaram ao servidor */
  pendente: boolean;
}

/**
 * Fica de olho no consultório em que o e-mail está em `membros` (ao vivo). `deCache` = esta leitura veio só da memória
 * do aparelho (ainda não falou com o servidor): só uma resposta CONFIRMADA e vazia autoriza criar o consultório.
 */
export function observarConsultorios(
  email: string, fn: (lista: ConsultorioNaNuvem[], deCache: boolean) => void, erro: (e: unknown) => void,
): Unsubscribe {
  const q = query(collection(banco, COLECAO), where('membros', 'array-contains', email));
  return onSnapshot(q, snap => {
    fn(snap.docs.map(d => ({ id: d.id, dados: d.data(), pendente: d.metadata.hasPendingWrites })), snap.metadata.fromCache);
  }, erro);
}

/**
 * Cria o consultório. O id é o uid de quem cria: dois aparelhos na 1ª entrada nunca criam dois consultórios, e antes
 * de gravar confere no servidor se já existe (para não escrever por cima de um que já tem a contagem).
 */
export async function criarConsultorio(uid: string, dados: Consultorio): Promise<void> {
  const ref = doc(banco, COLECAO, uid);
  const jaTem = await getDocFromServer(ref).then(d => d.exists(), (e: { code?: string }) => { if (e.code === 'permission-denied') return false; throw e; });
  if (!jaTem) await setDoc(ref, dados);
}

/** Os caminhos do motor viram os do Firestore (APAGAR → deleteField, Incremento → increment). */
export function paraFirestore(escritas: Escritas): Record<string, unknown> {
  return Object.fromEntries(Object.entries(escritas).map(([k, v]) => [k, v === APAGAR ? deleteField() : v instanceof Incremento ? increment(v.n) : v]));
}

/**
 * Grava as escritas de uma ação, de uma vez só. NÃO espere por isto na hora do toque:
 * sem internet a promessa só termina quando a internet volta (a tela já atualizou pelo cache).
 */
export function gravar(id: string, escritas: Escritas): Promise<void> {
  if (Object.keys(escritas).length === 0) return Promise.resolve();
  return updateDoc(doc(banco, COLECAO, id), paraFirestore(escritas));
}
