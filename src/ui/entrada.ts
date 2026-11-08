/** Telas antes do consultório: carregando, entrar/criar conta, erro com "tentar de novo". */
import { escapar as e } from './seguranca.ts';

const app = () => document.getElementById('app')!;

export function mostrarCarregando(texto = 'Abrindo…'): void {
  app().innerHTML = `<div class="entrada"><h1>Estoque do Consultório</h1><p class="explica">${e(texto)}</p></div>`;
}

export function mostrarErro(texto: string, tentar: () => void, sair: () => void): void {
  app().innerHTML = `<div class="entrada"><h1>Estoque do Consultório</h1><p class="erro" role="alert">${e(texto)}</p>
    <button class="ok" id="eTentar">Tentar de novo</button><button class="troca" id="eSair">Sair desta conta</button></div>`;
  document.getElementById('eTentar')!.onclick = tentar;
  document.getElementById('eSair')!.onclick = sair;
}

export interface AcoesLogin {
  entrar(email: string, senha: string): Promise<void>;
  criar(email: string, senha: string): Promise<void>;
  esqueci(email: string): Promise<void>;
  mensagem(erro: unknown): string;
}

export function mostrarLogin(acoes: AcoesLogin, modoInicial: 'entrar' | 'criar' = 'entrar'): void {
  let modo = modoInicial;
  const desenhar = (aviso = '', ehErro = true) => {
    const criar = modo === 'criar';
    app().innerHTML = `<div class="entrada"><h1>Estoque do Consultório</h1>
      <p class="explica">${criar ? 'Crie a sua conta. É ela que guarda o estoque, mesmo se você trocar de celular.' : 'Entre para ver o estoque do consultório.'}</p>
      <form id="fLogin">
        <input class="campo" id="lEmail" type="email" placeholder="E-mail" autocomplete="email" autocapitalize="none" aria-label="E-mail">
        <input class="campo" id="lSenha" type="password" placeholder="Senha" autocomplete="${criar ? 'new-password' : 'current-password'}" aria-label="Senha">
        <p class="erro" id="lErro" role="alert" style="${ehErro ? '' : 'color:var(--verde)'}">${e(aviso)}</p>
        <button class="ok" id="lOk">${criar ? 'Criar conta' : 'Entrar'}</button>
      </form>
      <button class="troca" id="lTroca">${criar ? 'Já tenho conta' : 'Criar uma conta'}</button>
      ${criar ? '' : '<button class="troca" id="lEsqueci">Esqueci a senha</button>'}</div>`;
    const campo = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
    document.getElementById('lTroca')!.onclick = () => { modo = criar ? 'entrar' : 'criar'; desenhar(); };
    const esq = document.getElementById('lEsqueci');
    if (esq) esq.onclick = async () => {
      try { await acoes.esqueci(campo('lEmail')); desenhar('Enviamos um e-mail para você trocar a senha.', false); }
      catch (err) { desenhar(acoes.mensagem(err)); }
    };
    (document.getElementById('fLogin') as HTMLFormElement).onsubmit = async ev => {
      ev.preventDefault();
      const ok = document.getElementById('lOk') as HTMLButtonElement;
      ok.disabled = true;
      const email = campo('lEmail'), senha = campo('lSenha');
      try {
        if (criar) await acoes.criar(email, senha); else await acoes.entrar(email, senha);
      } catch (err) { desenhar(acoes.mensagem(err)); (document.getElementById('lEmail') as HTMLInputElement).value = email; }
    };
  };
  desenhar();
}
