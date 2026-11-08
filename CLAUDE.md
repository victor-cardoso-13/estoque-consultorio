# Estoque do Consultório (instruções para o Claude)

App da fábrica `Mesa/Aplicativos/`. Regras gerais, padrão técnico e checklist OWASP estão em `../CLAUDE.md` (valem aqui). Falar com o Victor em português simples; no fim, dizer como testar no iPhone/iPad.
Site: https://victor-cardoso-13.github.io/estoque-consultorio/ · repositório público `victor-cardoso-13/estoque-consultorio`.
Referência aprovada pela Andressa: `referencia/mock.html`, `referencia/notas.md`, `referencia/instrucoes-originais.md` (o pedido completo) e `referencia/prints/` (local, não vai ao git).

## A ideia
Controle de estoque do consultório odontológico da Andressa (esposa do Victor). **Só ela usa** (um login, um consultório). Quatro abas: Estoque · Comprar · Documentos · Organizar. O − de cada material é a ação principal (um toque + Desfazer). Tudo nasce "não contado" (`qtd: null`) e ela conta pelo 📋 Contar o estoque.
Fora desta versão: várias pessoas/convite, histórico, preços, notificações, código de barras, lotes com várias validades, pedido por WhatsApp.

## Visual (identidade da Dra. Andressa Namba, desde a rodada 2)
Branco + grafite `#5f5f62`, tinta `#3f3f42`, linhas de 1px `#bdbdc0`, sem gradiente nem sombra. Cormorant Garamond 500 (títulos, números) + Montserrat 400 (corpo), pelo npm (`@fontsource`). Estados dessaturados (mínimo/acabou/ok) só do app. Símbolo AN em `src/assets/simbolo-AN.svg` (`ui/marca.ts`). Figurinhas dos materiais continuam coloridas. Mantenha o bloco `@media (display-mode: standalone)` do `estilo.css`.

## Aba Documentos
`src/motor/documentos.ts` (catálogo; teste confere que os arquivos existem) · `ui/tela-documentos.ts` · folha em `folhas.ts`. PDFs em `public/documentos/` (A4/, A5/, previas/), no cache do PWA (offline). **Imprimir = `<a href target=_blank rel=noopener>`**, nada de `window.open`. Só em branco; sem dados de paciente. Os PDFs levam nome, CRO, endereço e telefone da consultória e o site é público.

## Código
- `src/motor/`: regras puras, sem tela nem internet. Toda ação devolve **escritas** (`{'itens.luva.qtd': INCREMENTO(-1)}`); `aplicar` muda a cópia local, `inverso` gera o Desfazer. `lerConsultorio` valida tudo que chega da nuvem (e corta negativos).
  - `INCREMENTO(n)` = `increment()` do Firestore (− e + somam entre aparelhos offline). O inverso de um incremento é o incremento contrário.
  - **Nunca** mande incremento em `qtd: null` (o Firestore trocaria por "o número"): − e + em material não contado abrem **Quanto tem**.
  - Datas são texto `AAAA-MM-DD` (nunca `new Date('2026-12-01')`, que é UTC); o "hoje" é injetado nos testes.
  - Chaves de compra: `<material>` ou `<material>_<cor>`. Ids só `[A-Za-z0-9]` (a cor `A3,5` vira `A35`).
- `src/ui/`: telas. `estado.ts` tem `fazer(escritas)` (único caminho até a nuvem). Todo texto/link passa por `escapar()`.
- `src/nuvem/`: `conta.ts` (Auth) e `consultorios.ts` (Firestore, cache offline ligado). Carregados depois que a página abre.
- Modo teste sem login: `npm run dev` + `?demo` (memória, só em desenvolvimento).

## Nuvem
Coleção `consultorios/{uid}` (o id é o uid de quem criou, então dois aparelhos nunca criam dois). UM documento: `membros` (1 e-mail), `nome`, `antes`, `grupos`, `itens` (com `cores`), `lojas`, `links`, `caminho`, `pedido`, `extra`. Grava-se só o campo mexido (`updateDoc` com caminho). Nunca dar `await` na gravação no toque.
Regras: `../../Jogos/Computador/firestore.rules` (bloco `consultorios`). Limites nas regras: 300 materiais, 20 grupos, 8 lojas, `antes` ∈ {15,30,60,90}; tamanho de textos, 20 cores por material e links só o app corta (`LIMITES`, `lerConsultorio`).
O que a Andressa (única membro) consegue: tudo no próprio consultório. Ninguém lê nem lista consultório alheio; `membros` não muda; ninguém apaga o documento.
Cota (grátis): cada toque = 1 gravação; uso estimado < 100 gravações e poucas centenas de leituras por dia (somado com jogos e outros apps, o limite é 20 mil/50 mil).
Toda mudança nas regras: avisar o Victor antes do deploy e rodar os testes no emulador.

## Lojas
Os links das lojas são `<a href target="_blank" rel="noopener">` de verdade (Universal Links abrem o app da loja). Nada de `window.open`, `location.href` ou esquema próprio. O `href` só é montado depois de `linkOk` (https + mesmo domínio da loja).

## Testes
- `source ~/.nvm/nvm.sh && npm test` e `npx tsc --noEmit -p .`
- Emulador (Java 21, Auth 9199 / Firestore 8189) + `npx vite --port 5199`: `node scripts/testar-regras.mjs` e `node scripts/testar-nuvem.mjs` (2 aparelhos offline somando −1 cada = −2, modo avião).
- Prints: `node scripts/prints.mjs prints` (todas as telas e folhas, `?demo`).

## Pendências
Ver `PROMPT-PROXIMA-SESSAO.md` (ignorado pelo git).
