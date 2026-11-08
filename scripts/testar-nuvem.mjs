// Ponta a ponta com DOIS aparelhos (dois navegadores, a mesma conta) contra o emulador: conta, consultório criado sozinho,
// tempo real, e o teste principal: os dois SEM internet tocam − uma vez cada; ao voltar, o resultado tem que ser −2.
// Pré-requisito: emulador (Auth 9199, Firestore 8189) e "npx vite --port 5199" ligados. Uso: node scripts/testar-nuvem.mjs
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:5199/?emu';
const suf = Date.now().toString(36);
const b = await chromium.launch();
let falhas = 0;
const ok = (r, v, x = '') => { if (!v) falhas++; console.log(v ? 'OK    ' : 'FALHOU', r, x); };
const erros = [];
async function abrir(nome) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => erros.push(nome + ': ' + e.message));
  await p.goto(URL);
  return { ctx, p, nome };
}
const espera = (p, f, arg, ms = 10000) => p.waitForFunction(f, arg, { timeout: ms }).then(() => true).catch(() => false);
const qtdDe = (p, k) => p.locator(`.qtd[data-ajusta="${k}"] b`).first().innerText();
const email = `andressa${suf}@teste.com`;

const A = await abrir('iPhone'), B = await abrir('iPad');
console.log('--- conta e consultório ---');
await A.p.waitForSelector('#lTroca'); await A.p.click('#lTroca');
await A.p.fill('#lEmail', email); await A.p.fill('#lSenha', 'senha123'); await A.p.click('#lOk');
ok('conta nova: o consultório é criado sozinho e aparece o Estoque', await espera(A.p, () => !!document.querySelector('.est[data-segura="luva"]')));
ok('o catálogo inicial: 22 materiais + 5 cores da resina', (await A.p.locator('.qtd').count()) === 27);
ok('tudo nasce "não contado" (—)', (await qtdDe(A.p, 'luva')) === '—');
ok('primeiro uso: botão Contar em destaque', (await A.p.locator('.contar-bt.destaque').count()) === 1);

console.log('--- contar (Quanto tem) ---');
await A.p.click('.qtd[data-ajusta="luva"]'); await A.p.waitForSelector('#fq');
await A.p.fill('#fq', '5'); await A.p.click('[data-acao="salvarQ"]');
ok('Luva = 5 na tela do iPhone', await espera(A.p, () => document.querySelector('.qtd[data-ajusta="luva"] b')?.textContent === '5'));

console.log('--- segundo aparelho, mesma conta ---');
await B.p.waitForSelector('#lEmail'); await B.p.fill('#lEmail', email); await B.p.fill('#lSenha', 'senha123'); await B.p.click('#lOk');
ok('o iPad entra e vê o mesmo consultório com Luva = 5 (nada de segundo consultório)', await espera(B.p, () => document.querySelector('.qtd[data-ajusta="luva"] b')?.textContent === '5'));

console.log('--- tempo real ---');
await A.p.click('[data-menos="luva"]');
ok('− no iPhone aparece no iPad (4)', await espera(B.p, () => document.querySelector('.qtd[data-ajusta="luva"] b')?.textContent === '4'));
await B.p.click('[data-mais="luva"]');
ok('+ no iPad aparece no iPhone (5)', await espera(A.p, () => document.querySelector('.qtd[data-ajusta="luva"] b')?.textContent === '5'));

console.log('--- os dois sem internet, − em cada um ---');
await A.ctx.setOffline(true); await B.ctx.setOffline(true);
await A.p.click('[data-menos="luva"]'); await B.p.click('[data-menos="luva"]');
ok('sem internet o toque responde na hora (iPhone 4)', (await qtdDe(A.p, 'luva')) === '4');
ok('sem internet o toque responde na hora (iPad 4)', (await qtdDe(B.p, 'luva')) === '4');
await A.p.click('[data-pula="rest"]'); // mexe na tela também offline
await A.ctx.setOffline(false); await B.ctx.setOffline(false);
ok('voltou a internet: os dois somam −2 → 3 no iPhone', await espera(A.p, () => document.querySelector('.qtd[data-ajusta="luva"] b')?.textContent === '3', null, 15000), 'valor: ' + await qtdDe(A.p, 'luva'));
ok('voltou a internet: os dois somam −2 → 3 no iPad', await espera(B.p, () => document.querySelector('.qtd[data-ajusta="luva"] b')?.textContent === '3', null, 15000), 'valor: ' + await qtdDe(B.p, 'luva'));

console.log('--- modo avião: Desfazer e Comprar funcionam sem internet ---');
await A.ctx.setOffline(true);
await A.p.click('[data-menos="luva"]'); // 2 = mínimo
ok('chegou no mínimo: aviso e entra no Comprar (badge)', await espera(A.p, () => document.querySelector('#badge')?.textContent === '1', null, 3000));
await A.p.click('#aviso button');
ok('Desfazer sem internet volta para 3', (await qtdDe(A.p, 'luva')) === '3');
await A.p.click('[data-menos="luva"]');
await A.ctx.setOffline(false);
ok('o iPad recebe o 2 quando a internet volta', await espera(B.p, () => document.querySelector('.qtd[data-ajusta="luva"] b')?.textContent === '2', null, 15000));
await B.p.click('[data-tab="comprar"]');
ok('no iPad, a Luva está em "1 para comprar" com os botões das lojas', await espera(B.p, () => document.body.innerText.includes('1 para comprar') && document.querySelectorAll('a.loja-bt[target="_blank"][rel="noopener"]').length === 2));
const href = await B.p.locator('a.loja-bt').first().getAttribute('href');
ok('o link da Cremer é a busca certa', href === 'https://www.dentalcremer.com.br/catalog_search/?term=Luva', href);
await B.p.click('[data-comprei="luva"]'); await B.p.click('[data-onde="cremer"]');
ok('Pedi na Cremer: vai para "A caminho" nos dois aparelhos', await espera(A.p, () => true) && await espera(B.p, () => document.body.innerText.includes('A caminho')));
await A.p.click('[data-tab="comprar"]');
ok('o iPhone também vê "A caminho"', await espera(A.p, () => document.body.innerText.includes('A caminho') && document.body.innerText.includes('pedi 2 caixas na Dental Cremer')));
await A.p.click('[data-chegou="luva"]');
ok('Chegou ✓ soma 2 (2+2=4) e some da lista', await espera(A.p, () => !document.body.innerText.includes('A caminho')) && (await A.p.evaluate(() => 1)) === 1);
await A.p.click('[data-tab="estoque"]');
ok('estoque da Luva = 4', await espera(A.p, () => document.querySelector('.qtd[data-ajusta="luva"] b')?.textContent === '4'));

console.log(erros.length ? 'ERROS NA PÁGINA: ' + erros.join(' | ') : 'sem erros na página');
await b.close();
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO OK');
process.exit(falhas ? 1 : 0);
