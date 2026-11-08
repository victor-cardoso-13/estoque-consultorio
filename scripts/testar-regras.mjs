// Testa as regras de consultorios/{uid} (../Jogos/Computador/firestore.rules) no EMULADOR, sem tocar no banco de verdade.
// Pré-requisito: emulador ligado (Auth 9199, Firestore 8189). Uso: node scripts/testar-regras.mjs      Esperado: tudo "OK".
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInAnonymously } from 'firebase/auth';
import { collection, connectFirestoreEmulator, deleteDoc, doc, getDoc, getDocs, getFirestore, query, setDoc, updateDoc, where, increment, deleteField } from 'firebase/firestore';

const cfg = { apiKey: 'x', projectId: 'jogos-sem-anuncio' };
const suf = Date.now().toString(36);
async function pessoa(nome, email) {
  const app = initializeApp(cfg, nome + suf);
  const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true });
  const banco = getFirestore(app); connectFirestoreEmulator(banco, '127.0.0.1', 8189);
  if (email) await createUserWithEmailAndPassword(auth, email, 'senha123'); else await signInAnonymously(auth);
  return { banco, uid: auth.currentUser.uid, email: email?.toLowerCase() };
}
let falhas = 0;
const tenta = async f => { try { await f(); return 'permitido'; } catch (e) { return e.code === 'permission-denied' ? 'recusado' : 'erro:' + e.code; } };
const deve = async (rotulo, esperado, f) => { const r = await tenta(f); const ok = r === esperado; if (!ok) falhas++; console.log(ok ? 'OK    ' : 'FALHOU', rotulo, '→', r); };

const doc0 = email => ({
  membros: [email], nome: 'Consultório da Andressa', antes: 30,
  grupos: { desc: { nome: 'Descartáveis', ic: '🧤', ordem: 0 } },
  itens: { luva: { nome: 'Luva', ic: '🧤', cat: 'desc', un: 'caixa', min: 2, val: false, busca: null, qtd: 3, vence: null, ordem: 0, cores: null } },
  lojas: { cremer: { nome: 'Dental Cremer', site: 'https://www.dentalcremer.com.br', busca: '', ordem: 0 } },
  links: {}, caminho: {}, pedido: {}, extra: {},
});
const andressa = await pessoa('andressa', `Andressa${suf}@Teste.com`);
const intruso = await pessoa('intruso', `intruso${suf}@teste.com`);
const anonimo = await pessoa('anonimo', null);
const ref = (p, id) => doc(p.banco, 'consultorios', id);
const meu = andressa.uid;

console.log('--- criar ---');
await deve('Andressa cria o consultório com o id dela e só o e-mail dela', 'permitido', () => setDoc(ref(andressa, meu), doc0(andressa.email)));
await deve('criar com id que não é o uid é recusado', 'recusado', () => setDoc(ref(andressa, 'outroId' + suf), doc0(andressa.email)));
await deve('criar já com 2 membros é recusado', 'recusado', () => setDoc(ref(intruso, intruso.uid), { ...doc0(intruso.email), membros: [intruso.email, andressa.email] }));
await deve('criar com o e-mail de OUTRA pessoa é recusado', 'recusado', () => setDoc(ref(intruso, intruso.uid), doc0(andressa.email)));
await deve('criar com e-mail em maiúsculas é recusado', 'recusado', () => setDoc(ref(intruso, intruso.uid), doc0(intruso.email.toUpperCase())));
await deve('criar com campo a mais é recusado', 'recusado', () => setDoc(ref(intruso, intruso.uid), { ...doc0(intruso.email), extra2: 1 }));
await deve('criar com antes = 45 é recusado', 'recusado', () => setDoc(ref(intruso, intruso.uid), { ...doc0(intruso.email), antes: 45 }));
await deve('criar sem "itens" é recusado', 'recusado', () => { const d = doc0(intruso.email); delete d.itens; return setDoc(ref(intruso, intruso.uid), d); });
await deve('anônimo não cria', 'recusado', () => setDoc(ref(anonimo, anonimo.uid), doc0('a@a.com')));
const muitos = (n, f) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`m${i}`, f(i)]));
await deve('criar com 301 materiais é recusado', 'recusado', () => setDoc(ref(intruso, intruso.uid), { ...doc0(intruso.email), itens: muitos(301, () => ({})) }));
await deve('criar com 21 grupos é recusado', 'recusado', () => setDoc(ref(intruso, intruso.uid), { ...doc0(intruso.email), grupos: muitos(21, () => ({})) }));
await deve('criar com 9 lojas é recusado', 'recusado', () => setDoc(ref(intruso, intruso.uid), { ...doc0(intruso.email), lojas: muitos(9, () => ({})) }));

console.log('--- quem NÃO é a dona ---');
await deve('intruso não lê', 'recusado', () => getDoc(ref(intruso, meu)));
await deve('intruso não grava', 'recusado', () => updateDoc(ref(intruso, meu), { 'itens.luva.qtd': 0 }));
await deve('intruso não se põe em membros', 'recusado', () => updateDoc(ref(intruso, meu), { membros: [andressa.email, intruso.email] }));
await deve('intruso não apaga', 'recusado', () => deleteDoc(ref(intruso, meu)));
await deve('anônimo não lê', 'recusado', () => getDoc(ref(anonimo, meu)));
await deve('intruso procurando "consultórios da Andressa" é recusado', 'recusado', () => getDocs(query(collection(intruso.banco, 'consultorios'), where('membros', 'array-contains', andressa.email))));
const n = (await getDocs(query(collection(intruso.banco, 'consultorios'), where('membros', 'array-contains', intruso.email)))).size;
console.log(n === 0 ? 'OK    ' : 'FALHOU', 'intruso procurando os do próprio e-mail acha 0 →', n); if (n) falhas++;

console.log('--- a dona ---');
await deve('lê o próprio', 'permitido', () => getDoc(ref(andressa, meu)));
const achados = (await getDocs(query(collection(andressa.banco, 'consultorios'), where('membros', 'array-contains', andressa.email)))).size;
console.log(achados === 1 ? 'OK    ' : 'FALHOU', 'procurando pelo e-mail acha 1 →', achados); if (achados !== 1) falhas++;
await deve('− com increment(-1)', 'permitido', () => updateDoc(ref(andressa, meu), { 'itens.luva.qtd': increment(-1) }));
const q = (await getDoc(ref(andressa, meu))).data().itens.luva.qtd;
console.log(q === 2 ? 'OK    ' : 'FALHOU', 'qtd agora 2 →', q); if (q !== 2) falhas++;
await deve('grava só um campo (nome do material)', 'permitido', () => updateDoc(ref(andressa, meu), { 'itens.luva.nome': 'Luva de procedimento' }));
await deve('cria material novo', 'permitido', () => updateDoc(ref(andressa, meu), { 'itens.n1': { nome: 'Anestésico', ic: '💉', cat: 'desc', un: 'caixa', min: 1, val: true, busca: null, qtd: null, vence: null, ordem: 1, cores: null } }));
await deve('a caminho, pedido, extra e link', 'permitido', () => updateDoc(ref(andressa, meu), { 'caminho.luva': { loja: 'cremer', quando: Date.now(), q: 2 }, 'pedido.luva': 3, 'extra.n1': true, 'links.luva.cremer': 'https://www.dentalcremer.com.br/x' }));
await deve('apaga um campo (deleteField)', 'permitido', () => updateDoc(ref(andressa, meu), { 'caminho.luva': deleteField() }));
await deve('muda "antes" para 60', 'permitido', () => updateDoc(ref(andressa, meu), { antes: 60 }));
await deve('"antes" = 45 é recusado', 'recusado', () => updateDoc(ref(andressa, meu), { antes: 45 }));
await deve('mudar membros (pôr alguém) é recusado', 'recusado', () => updateDoc(ref(andressa, meu), { membros: [andressa.email, intruso.email] }));
await deve('trocar membros pelo e-mail de outro é recusado', 'recusado', () => updateDoc(ref(andressa, meu), { membros: [intruso.email] }));
await deve('campo fora do formato é recusado', 'recusado', () => updateDoc(ref(andressa, meu), { lixo: 1 }));
await deve('apagar o campo "itens" é recusado', 'recusado', () => updateDoc(ref(andressa, meu), { itens: deleteField() }));
await deve('passar de 300 materiais é recusado', 'recusado', () => updateDoc(ref(andressa, meu), { itens: muitos(301, () => ({})) }));
await deve('passar de 8 lojas é recusado', 'recusado', () => updateDoc(ref(andressa, meu), { lojas: muitos(9, () => ({})) }));
await deve('apagar o consultório é recusado', 'recusado', () => deleteDoc(ref(andressa, meu)));
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO COMO ESPERADO');
process.exit(falhas ? 1 : 0);
