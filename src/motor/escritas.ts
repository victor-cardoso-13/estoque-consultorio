/**
 * Aplicar e desfazer escritas. Toda ação do motor devolve `Escritas`:
 *  - `aplicar` muda a cópia local (a tela atualiza na hora);
 *  - a nuvem grava as MESMAS escritas, só os campos mexidos;
 *  - `inverso` devolve as escritas que desfazem (o botão "Desfazer").
 */
import { APAGAR, Incremento, INCREMENTO, type Escritas } from './tipos.ts';

/** Aplica as escritas numa cópia do documento (o original não muda). */
export function aplicar<T extends object>(doc: T, escritas: Escritas): T {
  const nova = structuredClone(doc) as unknown as Record<string, unknown>;
  for (const [caminho, valor] of Object.entries(escritas)) {
    const partes = caminho.split('.');
    let alvo = nova;
    for (const p of partes.slice(0, -1)) {
      const proximo = alvo[p];
      if (typeof proximo !== 'object' || proximo === null) alvo[p] = {};
      alvo = alvo[p] as Record<string, unknown>;
    }
    const ultimo = partes[partes.length - 1]!;
    if (valor === APAGAR) delete alvo[ultimo];
    // como o Firestore: somar a algo que não é número vira "o próprio número"
    else if (valor instanceof Incremento) alvo[ultimo] = (typeof alvo[ultimo] === 'number' ? (alvo[ultimo] as number) : 0) + valor.n;
    else alvo[ultimo] = structuredClone(valor);
  }
  return nova as unknown as T;
}

export function ler(doc: object, caminho: string): unknown {
  let atual: unknown = doc;
  for (const p of caminho.split('.')) {
    if (typeof atual !== 'object' || atual === null || !(p in atual)) return APAGAR;
    atual = (atual as Record<string, unknown>)[p];
  }
  return structuredClone(atual);
}

/**
 * As escritas que desfazem `escritas` (valem para o documento ANTES de aplicar).
 * Incremento volta com o incremento contrário (não com o número de antes), para não apagar o toque do outro aparelho.
 */
export function inverso(doc: object, escritas: Escritas): Escritas {
  const r: Escritas = {};
  for (const [caminho, valor] of Object.entries(escritas)) r[caminho] = valor instanceof Incremento ? INCREMENTO(-valor.n) : ler(doc, caminho);
  return r;
}
