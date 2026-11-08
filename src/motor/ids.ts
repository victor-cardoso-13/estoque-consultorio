/** Ids novos e ids seguros. Só letras e números (as regras e os caminhos do Firestore dependem disso). */
export const ID_OK = /^[A-Za-z0-9]{1,24}$/;

export function novoId(): string {
  return `n${Date.now().toString(36)}${Math.floor(Math.random() * 46656).toString(36).padStart(3, '0')}`;
}

export const semAcento = (t: string): string => t.normalize('NFD').replace(/[̀-ͯ]/g, '');
export const norm = (t: string): string => semAcento(t).toLowerCase().replace(/\s+/g, ' ').trim();

/** "A3,5" → "A35". Se já existe, acrescenta um número. */
export function idCor(nome: string, usados: Iterable<string>): string {
  const ocupados = new Set(usados);
  const base = semAcento(nome).replace(/[^A-Za-z0-9]/g, '').slice(0, 8) || 'c';
  let id = base, n = 2;
  while (ocupados.has(id)) id = `${base}${n++}`;
  return id;
}
