/** Liga o app à nuvem: conta, o consultório ao vivo e a gravação. Só é carregado depois que a página abre. */
import { consultorioInicial } from '../motor/catalogo.ts';
import { consultorioSumiu } from './app.ts';
import { avisar, receberConsultorio, render, S, type Eu } from './estado.ts';
import { mostrarCarregando, mostrarErro, mostrarLogin } from './entrada.ts';

const CHAVE_ID = 'estoque.consultorio';
const lembrado = (): string | null => { try { return localStorage.getItem(CHAVE_ID); } catch { return null; } };
const lembrar = (id: string): void => { try { localStorage.setItem(CHAVE_ID, id); } catch { /* tudo bem */ } };

export async function iniciarNuvem(): Promise<void> {
  mostrarCarregando();
  let conta: typeof import('../nuvem/conta.ts');
  let nuvem: typeof import('../nuvem/consultorios.ts');
  try {
    [conta, nuvem] = await Promise.all([import('../nuvem/conta.ts'), import('../nuvem/consultorios.ts')]);
  } catch {
    mostrarCarregando('Não consegui abrir agora. Confira a internet e abra de novo.');
    return;
  }
  S.sair = () => { void conta.sair(); };
  S.mensagemErro = conta.mensagemDeErro;

  let parar: (() => void) | null = null;
  let criando = false; // trava: nunca duas criações ao mesmo tempo neste aparelho

  conta.observarConta(u => {
    parar?.(); parar = null;
    S.c = null; S.repo = null; consultorioSumiu(); criando = false;
    if (!u) {
      S.eu = null;
      mostrarLogin({ entrar: conta.entrar, criar: conta.criarConta, esqueci: conta.esqueciSenha, mensagem: conta.mensagemDeErro });
      return;
    }
    const eu: Eu = { uid: u.uid, email: u.email };
    S.eu = eu;
    mostrarCarregando('Procurando o consultório…');

    const criar = (): void => {
      if (criando) return;
      criando = true;
      mostrarCarregando('Preparando o consultório…');
      nuvem.criarConsultorio(eu.uid, consultorioInicial(eu.email)).then(
        () => { criando = false; }, // o consultório aparece sozinho (a busca ao vivo o encontra)
        err => {
          criando = false;
          mostrarErro(conta.mensagemDeErro(err), criar, () => { void conta.sair(); });
        },
      );
    };

    parar = nuvem.observarConsultorios(eu.email, (lista, deCache) => {
      if (!lista.length) {
        // Só uma resposta confirmada pelo servidor e vazia autoriza criar (um aparelho novo, sem rede, nunca cria outro).
        if (!deCache) criar();
        return;
      }
      // Se por algum motivo houver mais de um, vale o que este aparelho lembra; senão sempre o de menor id.
      const lembradoId = lembrado();
      const c = lista.find(x => x.id === lembradoId) ?? [...lista].sort((a, b) => a.id.localeCompare(b.id))[0]!;
      lembrar(c.id);
      S.repo = { gravar: escritas => { nuvem.gravar(c.id, escritas).catch(err => avisar(conta.mensagemDeErro(err))); } };
      receberConsultorio(c.dados);
    }, err => { avisar(conta.mensagemDeErro(err)); });
  });
}

/** Aviso quando a internet cai ou volta (o app continua funcionando pelo cache). */
export function vigiarInternet(): void {
  const mudou = (online: boolean) => {
    S.semInternet = !online;
    avisar(online ? 'Internet de volta. Tudo sincronizado.' : 'Sem internet: o que você mexer será salvo quando voltar');
    if (S.c) render();
  };
  window.addEventListener('offline', () => mudou(false));
  window.addEventListener('online', () => mudou(true));
  S.semInternet = !navigator.onLine;
}
