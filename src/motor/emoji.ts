/** Figurinhas (emojis): a grade do seletor e "pegar o 1º emoji de um texto". */
export const FIGURINHAS = '🧤 😷 🩹 🧻 ⚪ 🖌️ 🥤 💉 ✨ 🛡️ 🎨 🧪 💧 📏 🔩 📄 🔘 📦 🫙 🪨 🧴 🦷 🪥 🧫 💊 🩺 🔦 ✂️ 🧷 🪞 🧽 🧼 🫧 🌡️ 🥽 🧊 🔬 🗂️ 🏷️ ⭐'.split(' ');
export const FIGURINHA_PADRAO = '🦷';

/**
 * O 1º emoji de um texto digitado no teclado de emojis (aceita compostos e com tom de pele).
 * Texto que não é emoji → null.
 */
export function primeiroEmoji(texto: string): string | null {
  const partes = typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? [...new Intl.Segmenter('pt', { granularity: 'grapheme' }).segment(texto)].map(s => s.segment)
    : [...texto];
  const achou = partes.find(g => /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(g));
  return achou ?? null;
}
