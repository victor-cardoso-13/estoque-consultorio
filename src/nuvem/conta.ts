/**
 * Conta (Firebase Auth, e-mail + senha). Este arquivo só é carregado depois que o app abre,
 * para ele abrir rápido e funcionar mesmo sem internet.
 */
import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator, createUserWithEmailAndPassword, getAuth, onAuthStateChanged, sendPasswordResetEmail,
  signInWithEmailAndPassword, signOut,
} from 'firebase/auth';
import { firebaseConfig } from './config.ts';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.languageCode = 'pt'; // e-mail de "esqueci a senha" em português

// Só para testar no computador, sem mexer no banco de verdade ("?emu" + emulador ligado). Nunca vale no site publicado.
export const usandoEmulador = import.meta.env.DEV && new URLSearchParams(location.search).has('emu');
if (usandoEmulador) connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true });

export interface Usuario {
  uid: string;
  email: string;
}

/** Avisa quando alguém entra ou sai (e logo ao abrir, com quem já estava dentro). */
export function observarConta(fn: (u: Usuario | null) => void) {
  return onAuthStateChanged(auth, u => fn(u && !u.isAnonymous && u.email ? { uid: u.uid, email: u.email.trim().toLowerCase() } : null));
}

export async function entrar(email: string, senha: string) {
  await signInWithEmailAndPassword(auth, email.trim(), senha);
}

export async function criarConta(email: string, senha: string) {
  await createUserWithEmailAndPassword(auth, email.trim(), senha);
}

export async function sair() {
  await signOut(auth);
}

export async function esqueciSenha(email: string) {
  await sendPasswordResetEmail(auth, email.trim());
}

/** Mensagens do Firebase em português simples (nunca texto técnico na tela). */
export function mensagemDeErro(e: unknown): string {
  const codigo = (e as { code?: string })?.code ?? '';
  const mensagens: Record<string, string> = {
    'auth/invalid-email': 'Esse e-mail não parece certo. Confira se digitou direitinho.',
    'auth/missing-email': 'Digite o seu e-mail.',
    'auth/missing-password': 'Digite a senha.',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 letras ou números.',
    'auth/email-already-in-use': 'Já existe uma conta com esse e-mail. Toque em "Entrar".',
    // Por segurança, o Firebase não diz se o erro foi no e-mail ou na senha.
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/too-many-requests': 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
    'auth/network-request-failed': 'Sem internet agora. Tente de novo quando a internet voltar.',
    'permission-denied': 'Sem permissão para isso. Saia e entre de novo.',
    unavailable: 'Sem internet agora. O que você mexer fica guardado e sobem quando a internet voltar.',
  };
  return mensagens[codigo] ?? 'Algo deu errado. Tente de novo daqui a pouco.';
}
