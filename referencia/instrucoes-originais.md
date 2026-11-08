# Prompt para a sessão de desenvolvimento (Sonnet): Estoque do Consultório

> Como usar: abra uma conversa **nova** do Claude Code na pasta `Mesa/Aplicativos/`, digite `/model sonnet` e cole tudo o que está abaixo da linha.

---

Vamos programar o **Estoque do Consultório**, o controle de estoque do consultório odontológico da Andressa (esposa do Victor). Leia antes `CLAUDE.md` e `APRENDIZADOS.md` desta pasta: valem todas as regras de lá (motor puro + testes, gravar só o campo mexido, `escapar()`, OWASP, prints, PR → merge). Para o jeito de fazer nuvem, regras e testes no emulador, use o **Acabou!** como exemplo (`acabou/CLAUDE.md`, `acabou/src/nuvem/`, `acabou/scripts/`). Só leia o Acabou, não mude nada nele.

**A ideia, as perguntas e o mock já estão FEITOS e APROVADOS pela Andressa** (sessão do Opus, 2026-11-08). Não refaça perguntas de escopo. Pergunte só se esbarrar em algo que não está aqui.

## Já feito pelo Opus
- `./novo-app.sh estoque-consultorio "Estoque do Consultório"` **já rodou**: a pasta `estoque-consultorio/` existe, o repositório `victor-cardoso-13/estoque-consultorio` também, e o site é https://victor-cardoso-13.github.io/estoque-consultorio/. **Não rode o script de novo.** Trabalhe só dentro de `estoque-consultorio/`.
- Primeiro passo: crie `estoque-consultorio/CLAUDE.md` (regras deste app + o essencial do `../CLAUDE.md`) e copie para `estoque-consultorio/referencia/` os arquivos `../ideias/estoque/mock.html`, `notas.md` e esta própria instrução.

## Referência
- **Mock aprovado:** `../ideias/estoque/mock.html`. Abra no Safari: o guia atual tem 6 passos (só a parte de compras). O guia da rodada 1 (estoque) continua no arquivo, na variável `PASSOS_RODADA1`. O mock é HTML solto: o comportamento, os textos e o visual valem, mas o código segue o padrão da fábrica.
- `../ideias/estoque/notas.md`: decisões da Andressa, endereços de busca das lojas e o "abrir o app da loja".
- Prints: `../ideias/estoque/prints/` (os `1-` a `9-` são da rodada 1, e os `r2-` são das compras).
- No mock, as **quantidades e validades são de exemplo**. No app de verdade, tudo nasce **"não contado"** (ver Contar).

## Quem usa
- **Só a Andressa**, com um login, no iPhone e talvez no iPad, e **um consultório só**. Não há convite nem várias pessoas nesta versão.
- O consultório é um documento na nuvem, para não perder os dados se ela trocar de celular e para funcionar nos dois aparelhos.

## O app (3 abas: Estoque · Comprar · Organizar)

### Estoque
- O topo diz "Estoque" e, embaixo, "Consultório da Andressa" (texto fixo; pode ser um campo `nome` com esse padrão).
- Campo **Procurar material**. Se não achar nada: "+ Criar "<texto>"".
- Cartão **⏳ Vence logo**: só aparece se houver algo. Mostra material com validade, quantidade > 0 e vencimento em até `antes` dias (padrão 30), do mais perto para o mais longe, com "vence em N dias · dd/mm", "vence hoje", "vence amanhã" ou "venceu" (fundo vermelho). Tocar abre **Quanto tem**.
- Botão **📋 Contar o estoque**.
- Barra de atalhos dos grupos (pulo direto, **sem rolagem animada**: ver o "pulo" do Acabou, que dava "pisca, desce e sobe" no iPhone).
- **Linha do material:** figurinha, nome, **+** pequeno, número grande com a unidade embaixo (tocar no número abre **Quanto tem**) e **−** grande e escuro à direita (**ação principal, um toque**).
  - Embaixo do nome aparece só o que importa: "acabou" (fundo vermelho), "no mínimo · vai para o Comprar" ou "no mínimo · a caminho" (fundo âmbar), e "vence em N dias (dd/mm)" quando estiver dentro do aviso. Fora isso, nada.
  - **−** e **+** mostram um aviso curto ("Luva: agora 2 caixas", "… · foi para o Comprar", "Gaze: acabou") com **Desfazer**. Com 0, o − não faz nada além do aviso "já está em 0", e chegar a 0 apaga a validade.
- **Material separado por cor** (hoje só a **Resina**): cartão com o cabeçalho "Resina · N seringas no total · por cor" e uma sublinha por cor, com os mesmos +, número e −. Cada cor tem o seu número e a sua validade. O **mínimo é o mesmo para todas as cores**.
- **Segurar o dedo** na linha (~550 ms; cancela se o dedo andar mais de 10 px) abre **Editar material**. Os botões da linha não disparam o segurar.

### Contar o estoque (o app "nasce" com o que ela tem)
- Folha que mostra **um item por vez** (cada cor da resina é um item), com uma barra de progresso e "Contando · 3 de 27". Tem número grande com − e + (dá para digitar), a data de validade quando o material tem validade, e os botões **‹ Anterior** e **Próximo ›** (no último, **Terminar**), mais **Parar por aqui**.
- **Material nunca contado tem `qtd: null`.** Ele não entra no Comprar nem no Vence logo, e a linha mostra "—" com "ainda não contado". Ao abrir o Contar, começa pelo **primeiro não contado**; se todos já foram contados, começa do início (para recontar todo mês).
- Grava a cada "Próximo" (só aquele item). No fim, ou em Parar, aparece o aviso "Contou N de M. Dá para continuar outro dia."
- No primeiro uso (tudo `null`), o botão Contar fica em destaque no topo.

### Quanto tem / Chegou (mesma folha)
- Cabeçalho com figurinha + "QUANTO TEM" ou "CHEGOU" + nome, um número grande e, se o material tiver validade, **"Vence em (a que vence primeiro)"** (campo de data + botão "Sem data").
- **Quanto tem** troca o número e a data.
- **Chegou** soma ao estoque. A data guardada é a **mais próxima** entre a que já existe (se ainda havia estoque) e a nova.

### Comprar
- **Entra sozinho** o que tem `qtd ≤ min` (e já foi contado), mais o que ela pôs à mão ("+ Pôr outro material na lista", que abre uma folha de chips com o que não está na lista), **menos** o que está a caminho.
- Cartão escuro: "N para comprar", o texto "Entra aqui sozinho o que chega no mínimo. Compre no site ou no balcão e toque em Comprei ✓.", e um botão para cada loja com site ("Dental Cremer ↗", "Dental Speed ↗").
- **Cada material:** nome, "tem X · mínimo Y" (ou "acabou · mínimo Y" em vermelho, ou "· pus à mão"), seletor **quantos comprar** (− N unidade +; sugestão = `max(1, 2·min − qtd)`, e ela pode mudar), **Comprei ✓** (verde), e embaixo um botão por loja com site (**Cremer ↗**, **Speed ↗**, ou **★ Cremer ↗** quando há link de produto) mais **✎ ajustar busca** (ou "busca ajustada").
- **Comprei ✓** abre uma folha: "Quantos <unidade>?" (número) e "Onde?", com um botão por loja:
  - loja **com site**: "Pedi na <loja>" (texto pequeno: vai para "A caminho" até chegar). O material vai para **🚚 A caminho** com `{loja, quando, q}` e sai da lista;
  - loja **sem site** (balcão): "Comprei na <loja>" (verde; texto pequeno: já está comigo, vai direto para o estoque). Soma ao estoque na hora. Se o material tiver validade, abre antes a folha **Chegou** com o número já preenchido.
- **🚚 A caminho** (embaixo da lista, fundo verde-claro): "pedi N unidades na <loja> · hoje/ontem/há N dias", **Não veio** (volta para a lista, com Desfazer) e **Chegou ✓** (soma a quantidade pedida; com validade, abre a folha Chegou antes).
- Tudo com aviso e **Desfazer**.

### Abrir a loja (busca, link do produto e o app da loja)
- **Busca padrão:** `https://www.dentalcremer.com.br/catalog_search/?term=<termo>` e `https://www.dentalspeed.com/catalog_search/?term=<termo>` (conferido com navegador de verdade em 2026-11-08; ver `notas.md`). Monte com `encodeURIComponent`.
- **Termo** = o campo `busca` do material, se houver (até 60 caracteres). Se não houver, é o nome sem o que está entre parênteses ("Top Dam (barreira gengival)" vira "Top Dam"). Em material com cor, acrescente a cor ("Resina B1").
- **✎ ajustar busca** abre a folha "Procurar nas lojas":
  - campo **Procurar como** (o texto de exemplo é o nome; vazio = nome);
  - para cada loja com site, a linha legível **Abre a busca por "<termo>"**, que muda enquanto ela digita, e um campo **"Ou cole o link de um produto"**. Com link, a linha vira "★ Abre o produto do link abaixo";
  - **Salvar**. O mesmo campo `busca` também fica na folha Editar material ("Procurar nas lojas como").
- **Link de produto:** só `https:` e do **mesmo domínio da loja** (ou subdomínio; `www.` tanto faz). Se não for, mostre o erro na folha: "Esse link não é do site da <loja>. Ele precisa começar com <site>/". Até 300 caracteres.
- **Abrir o app da loja (a Andressa compra pelo APP, não pelo site):** os dois sites declaram *Universal Links* para todos os caminhos (`/.well-known/apple-app-site-association` com `"/*"`). **Testado no iPhone dela: o botão abriu certinho no app.** Por isso:
  - use **`<a href="…" target="_blank" rel="noopener">` de verdade**: nada de `window.open`, `location.href` ou clique simulado por JS;
  - **não** invente esquema próprio (`dentalcremer://`);
  - teste também com o app instalado na Tela de Início (modo standalone): o link precisa continuar abrindo o app da loja.
- Lojas novas (Organizar → Lojas) têm **nome** e **site** opcional (`https://`, até 100 caracteres, sem barra no fim). Loja nova com site **não tem busca**: o botão abre o site, a não ser que haja link de produto. Loja sem site = balcão.

### Organizar (segmentos: Materiais · Grupos · Lojas · Avisos)
- **Materiais:** a explicação curta do mock, **+ Novo material** e a lista por grupo ("caixa · avisa com 2 · tem validade · 5 cores"). Tocar abre **Editar material**.
- **Editar material** (a mesma folha para "Novo material"):
  - figurinha: campo que aceita o teclado de emojis, mais a grade do mock;
  - nome (até 40);
  - grupo (chips);
  - "Conto em" (chips: caixa, pacote, seringa, frasco, kit, tubo, rolo, bloco, pote, galão, unidade; plural certo: galão → galões);
  - "Procurar nas lojas como";
  - "Avisar quando tiver N ou menos" (− +; 0 = nunca avisa);
  - interruptor **Tem validade**;
  - interruptor **Separar por cor ou tamanho**, com chips das cores (× para tirar) e "Nova cor" + **Pôr** (até 12 caracteres).
  - Botões **Salvar** e **Apagar este material** (com Desfazer, sem "tem certeza?").
  - Erros na folha: sem nome, nome repetido, cor ligada sem nenhuma cor.
  - Ligar "cor" num material que já tem número passa o número para a 1ª cor. Desligar soma as cores.
- **Grupos:** figurinha + nome (folha), ▲▼ para a ordem, + Novo grupo. Apagar um grupo move os materiais dele para outro grupo.
- **Lojas:** 🌐 para loja com site, 🏪 para balcão. Tocar edita (nome, site); dá para apagar se sobrar ≥ 1. + Nova loja.
- **Avisos:** "Com quanto tempo de antecedência o Vence logo avisa?" (chips 15 / 30 / 60 / 90 dias; padrão 30).

## Catálogo inicial (`src/motor/catalogo.ts`; só o ponto de partida, tudo editável)
Grupos, nesta ordem: 🧤 Descartáveis · ✨ Clareamento · 🪥 Restauração · 🦷 Ortodontia · 🫙 Moldagem e gesso · 🧴 Limpeza e líquidos.

| Material | Fig. | Grupo | Unidade | Mínimo | Validade |
|---|---|---|---|---|---|
| Luva | 🧤 | Descartáveis | caixa | 2 | não |
| Sugador | 🥤 | Descartáveis | pacote | 1 | não |
| Gaze | 🩹 | Descartáveis | pacote | 2 | não |
| Máscara | 😷 | Descartáveis | caixa | 1 | não |
| Babador | 🧻 | Descartáveis | pacote | 1 | não |
| Rolete de algodão | ⚪ | Descartáveis | pacote | 2 | não |
| Microbrush | 🖌️ | Descartáveis | tubo | 1 | não |
| Seringa de clareamento caseiro | 💉 | Clareamento | seringa | 4 | sim |
| Top Dam (barreira gengival) | 🛡️ | Clareamento | seringa | 1 | sim |
| Clareamento de consultório | ✨ | Clareamento | kit | 1 | sim |
| Ácido fosfórico (gel) | 🧪 | Restauração | seringa | 2 | sim |
| Adesivo | 💧 | Restauração | frasco | 1 | sim |
| Resina (cores A1, A2, A3, A3,5, B1) | 🎨 | Restauração | seringa | 1 | sim |
| Resina flow | 💉 | Restauração | seringa | 1 | sim |
| Tira de lixa | 📏 | Restauração | pacote | 1 | não |
| Matriz de aço | 🔩 | Restauração | rolo | 1 | não |
| Papel carbono | 📄 | Restauração | bloco | 1 | não |
| Botão lingual | 🔘 | Ortodontia | pacote | 1 | não |
| Caixa para aparelho ortodôntico | 📦 | Ortodontia | unidade | 5 | não |
| Alginato | 🫙 | Moldagem e gesso | pacote | 1 | sim |
| Gesso | 🪨 | Moldagem e gesso | pacote | 1 | não |
| Água destilada | 💧 | Limpeza e líquidos | galão | 1 | não |
| Álcool 70% | 🧴 | Limpeza e líquidos | frasco | 2 | não |

- Todos nascem com `qtd: null` (não contado) e sem validade.
- Lojas iniciais: **Dental Cremer** (`https://www.dentalcremer.com.br`, com busca), **Dental Speed** (`https://www.dentalspeed.com`, com busca) e **Dental daqui** (sem site; ela troca o nome).
- As cores da resina são um palpite: ela ajusta no app.

## Nuvem (Firebase `jogos-sem-anuncio`, plano grátis)
- **Coleção nova** `consultorios/{id}`, com **um documento por consultório**. Sugestão de formato (ids `[A-Za-z0-9]`):
  `{ membros:[email], nome, antes, grupos:{id:{nome,ic,ordem}}, itens:{id:{nome,ic,cat,un,min,val,busca,qtd,vence,ordem,cores?:{id:{nome,qtd,vence,ordem}}}}, lojas:{id:{nome,site,busca?,ordem}}, links:{<itemOuItem_cor>:{<loja>:url}}, caminho:{<chave>:{loja,quando,q}}, pedido:{<chave>:n}, extra:{<chave>:true} }`.
  A chave da cor pode ser `resina_A2`, ou um id próprio da cor.
- Na criação, use para a cor um **id seguro** (ex.: `A3,5` vira um id sem vírgula) e guarde o nome à parte.
- **Gravar só o campo mexido** (`updateDoc` com caminho). Para **− e +, use `increment()`**: ela pode tocar no iPhone e no iPad sem internet, e os dois toques têm que somar. "Quanto tem", o Contar e o Chegou com data gravam o valor absoluto. Toda ação gera escritas + o inverso (Desfazer), como no `casa.ts` do Acabou.
- **Cache offline ligado** + `onSnapshot`. Nunca dar `await` na gravação no toque. Sem internet: aviso curto ("Sem internet: o que você mexer será salvo quando voltar").
- **Conta:** só Firebase Auth (e-mail + senha). Na 1ª entrada, sem consultório, o app cria o documento com `membros: [o e-mail dela]` e o catálogo inicial. Guarde o id no aparelho e, para achar em outro aparelho, use uma consulta `where('membros','array-contains', email)`, como o Acabou faz (ou o jeito que ele usa).
- **Regras** (bloco novo em `../Jogos/Computador/firestore.rules`):
  - só quem está em `membros` lê e grava; criar só com `membros == [o próprio e-mail]`; `membros` não muda depois;
  - chaves só as do formato;
  - limites: **300 materiais**, 20 grupos, 8 lojas, 20 cores por material, `antes` ∈ {15, 30, 60, 90};
  - o app corta os textos (nome 40, busca 60, link 300, site 100, cor 12, loja 30) e valida tudo que vem da nuvem;
  - **avise o Victor antes do deploy** e teste no emulador (regras + 2 aparelhos offline somando −1 cada).
- **Cota:** cada toque é 1 gravação. Uso estimado: menos de 100 gravações e poucas centenas de leituras por dia. Diga isso ao Victor.

## Segurança (além do checklist do `../CLAUDE.md`)
- Todo nome, busca, link e site passa por `escapar()`, também dentro de `href`. Link só vira `href` se passar no teste "https + domínio da loja" (bloqueia `javascript:` e site falso).
- A CSP não muda: são links de navegação, não chamadas de rede. Se você precisar acrescentar algo, avise.

## Fora desta versão (não fazer)
Várias pessoas/convite, histórico e previsão de consumo, preços, notificação no celular, código de barras, lotes com várias validades por material, pedido por WhatsApp (a Andressa não usa).

## Ordem de trabalho
1. `CLAUDE.md` do app + `referencia/`.
2. Motor + testes (Vitest):
   - −/+ e o Desfazer;
   - `qtd null`, "precisa comprar" e "vence logo" (com a data de hoje injetada);
   - Chegou guarda a data mais próxima;
   - cores (mínimo comum, ligar/desligar);
   - termo de busca, URL da loja e `linkOk`;
   - Comprei (site → a caminho; balcão → estoque) e Não veio;
   - Contar começa no primeiro não contado;
   - `lerConsultorio` rejeita dado ruim;
   - plural das unidades.
3. Telas fiéis ao mock (Estoque, Contar, Quanto tem/Chegou, Comprar, Organizar e todas as folhas).
4. Nuvem + regras + emulador (incluindo o modo avião com `context.setOffline(true)`).
5. Prints (todas as telas **e todas as folhas**: iPad 1180×820 e 820×1180; iPhone 440×800, 390×844, deitado 956×360 e 393×852 com área segura).
6. Ícone provisório: troque o do Miaudoku por um próprio (📦 ou 🦷 no estilo da fábrica: 192, 512 e apple-touch 180).
7. PR → testes → merge → `gh run watch`. Deixe `PROMPT-PROXIMA-SESSAO.md`.

## No fim, diga ao Victor
- O link e como pôr na Tela de Início do iPhone da Andressa (Safari → Compartilhar → Adicionar à Tela de Início).
- Que no primeiro uso ela cria a conta e toca em **📋 Contar o estoque**.
- Peça para ela testar, já com o app na Tela de Início, se **Cremer ↗** e **Speed ↗** abrem o app das lojas, e se o app da loja abre já na busca ou só na tela inicial.
