# Estoque do Consultório: notas da exploração (Opus, 2026-11-08)

## Decisões da Andressa
- Só ela usa (um login). Um consultório só.
- Só a resina é separada por cor; luva é tamanho único.
- Validade opcional por material (avisa 30 dias antes, ajustável).
- Rodada 1 (estoque, contar, resina por cor, vence logo, organizar): **aprovada**.
- Rodada 2 (compras): ela não compra por WhatsApp. Compra no site da **Dental Cremer** e da **Dental Speed**, às vezes numa dental local.
  Fluxo novo no mock: botões das lojas → "Comprei ✓" (Pedi no site = "A caminho" / Comprei no balcão = estoque) → "Chegou ✓".

## Busca nas lojas (conferido com Chromium de verdade, 2026-11-08)
- Dental Cremer: `https://www.dentalcremer.com.br/catalog_search/?term=<termo>`
- Dental Speed: `https://www.dentalspeed.com/catalog_search/?term=<termo>`
- Os dois respondem 200 com título "Buscando por: <termo>", abertos direto (sem passar pela home).
- O WebFetch simples leva 403 (bloqueio de robô); navegador de verdade passa.
- **Abrir o app da loja (ela compra pelo app, não pelo site):** os dois sites têm `/.well-known/apple-app-site-association` cobrindo **todos os caminhos** (`"/*"`): Cremer → app `br.com.viewit.dentalcremer`, Speed → app `br.com.dentalspeedgraph.mobile` (conferido em 2026-11-08). Ou seja, o link `https://` comum é um *Universal Link*: com o app instalado, o iPhone abre o app. **Não usar esquema próprio (`dentalcremer://`)**: não é documentado. Usar `<a href target="_blank" rel="noopener">` de verdade (não `window.open` nem `location.href` via JS, que às vezes não acionam o app).
  Falta confirmar no iPhone dela: (1) abre o app? (2) o app abre na busca ou só na tela inicial? Se cair no Safari, segurar o link → "Abrir em Dental Cremer" ensina o iPhone.
- Cada material tem **"Procurar como"** (`busca`, até 60 caracteres, opcional). Vazio = nome do material sem o que está entre parênteses. Na resina, a cor entra sozinha no fim (ex.: "Resina B1").
  Fica na janela "✎ ajustar busca" (aba Comprar) e na janela de editar o material. Combinado com o Victor: ela deixa o nome bem específico quando precisar.
- Por loja, um **link de produto** opcional substitui a busca (botão ganha ★). Só aceita `https://` do mesmo domínio da loja. Link em branco = busca padrão.
- Loja nova (Organizar → Lojas) tem nome + site; sem site = loja de balcão. O endereço de busca só existe nas duas lojas acima (em loja nova, o botão abre o site).
