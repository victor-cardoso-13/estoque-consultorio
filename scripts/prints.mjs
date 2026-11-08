// Prints automáticos nos aparelhos que importam, de TODAS as telas e janelas (modo ?demo do "npm run dev").
// Uso: (npx vite --port 5199 rodando) node scripts/prints.mjs <pasta>
// Nunca iPhone SE. iPad 1180×820 e 820×1180; iPhone em pé 440×800 e 390×844; deitado 956×360;
// mais um 393×852 com área segura (topo 59, base 34) só para ver que nada quebrou.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const pasta = process.argv[2] ?? 'prints';
mkdirSync(pasta, { recursive: true });
const telas = {
  'ipad-deitado': [1180, 820], 'ipad-em-pe': [820, 1180],
  'iphone-440': [440, 800], 'iphone-390': [390, 844], 'iphone-deitado': [956, 360], 'iphone-393-seguro': [393, 852],
};
const so = process.argv[3]; // opcional: só uma janela (ex.: iphone-390)
const browser = await chromium.launch();
const erros = [];
for (const [nome, [width, height]] of Object.entries(telas)) {
  if (so && so !== nome) continue;
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: false });
  const page = await ctx.newPage();
  page.on('pageerror', e => erros.push(`${nome}: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') erros.push(`${nome} console: ${m.text()}`); });
  if (nome.includes('seguro')) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 59, bottom: 34, left: 0, right: 0 } }).catch(() => {});
  }
  const foto = async quem => page.screenshot({ path: `${pasta}/${nome}-${quem}.png` });
  const espera = ms => page.waitForTimeout(ms);
  const fechar = async () => { await page.keyboard.press('Escape'); await espera(150); };
  const tab = async t => { await page.click(`[data-tab="${t}"]`); await espera(250); };
  const folha = async (seletor, quem) => { await page.waitForSelector(seletor); await espera(400); await foto(quem); };
  const abaixo = async () => { await page.evaluate(() => { const f = document.querySelector('#folha .folha'); if (f) f.scrollTop = 99999; }); await espera(150); };

  // ----- primeiro uso: tudo "não contado" -----
  await page.goto('http://127.0.0.1:5199/?demo=vazio');
  await page.waitForSelector('.est'); await espera(300);
  await foto('00-primeiro-uso');
  await page.click('[data-menos="luva"]'); await folha('[data-acao="salvarQ"]', '00b-menos-nao-contado-abre-quanto-tem');
  await fechar();

  await page.goto('http://127.0.0.1:5199/?demo');
  await page.waitForSelector('.est'); await espera(300);

  // ----- Estoque -----
  await foto('1-estoque');
  await page.fill('#busca', 'luv'); await espera(200); await foto('2-busca');
  await page.fill('#busca', 'anestes'); await espera(200); await foto('3-busca-criar');
  await page.click('#criarBusca'); await folha('[data-acao="salvarItem"]', '4-novo-material-da-busca'); await fechar();
  await page.fill('#busca', ''); await espera(150);
  await page.click('[data-menos="luva"]'); await espera(250); await foto('5-menos-com-aviso');
  await page.click('#aviso button'); await espera(200);
  await page.click('[data-menos="gaze"]'); await espera(250); await foto('5b-gaze-no-minimo');
  await page.click('#aviso button'); await espera(150);
  await page.click('[data-pula="rest"]'); await espera(250); await foto('6-resina-por-cor');
  // quanto tem (toque no número) e vence logo
  await page.click('[data-ajusta="adesivo"] >> nth=-1').catch(async () => { await page.click('.qtd[data-ajusta="adesivo"]'); });
  await folha('[data-acao="salvarQ"]', '7-quanto-tem-com-validade'); await fechar();
  // contar
  await page.evaluate(() => { document.getElementById('conteudo').scrollTop = 0; });
  await page.click('#contar'); await folha('[data-acao="prox"]', '8-contar'); await fechar();
  // segurar o dedo = editar
  const segurar = async (seletor, dx) => {
    await page.evaluate(sel => document.querySelector(sel).scrollIntoView({ block: 'center' }), seletor); await espera(300);
    const c = await page.locator(seletor).boundingBox();
    await page.mouse.move(c.x + dx, c.y + c.height / 2); await page.mouse.down(); await espera(800); await page.mouse.up();
  };
  await segurar('.est[data-segura="microbrush"]', 40);
  await folha('[data-acao="salvarItem"]', '9-editar-material-segurando');
  await abaixo(); await foto('9b-editar-material-fim'); await fechar();
  // editar a resina (com cores)
  await segurar('.cartao-cores .cab', 60);
  await page.waitForSelector('#enova'); await espera(300); await abaixo(); await foto('9c-editar-resina-cores'); await fechar();

  // ----- Comprar -----
  await tab('comprar'); await foto('10-comprar');
  await page.evaluate(() => { document.getElementById('conteudo').scrollTop = 99999; }); await espera(150); await foto('10b-comprar-fim-a-caminho');
  await page.evaluate(() => { document.getElementById('conteudo').scrollTop = 0; });
  await page.click('[data-comprei="gaze"]'); await folha('[data-onde]', '11-comprei-onde'); await fechar();
  await page.click('[data-link="gaze"]'); await folha('#ltermo', '12-procurar-nas-lojas');
  await page.fill('#ltermo', 'gaze não estéril 7,5'); await page.fill('#lk-cremer', 'https://www.dentalspeed.com/x'); await espera(150);
  await page.click('[data-acao="salvarLink"]'); await espera(250); await foto('12b-link-de-outro-site-erro');
  await page.fill('#lk-cremer', 'https://www.dentalcremer.com.br/gaze-nao-esteril-75'); await page.click('[data-acao="salvarLink"]'); await espera(300); await foto('12c-busca-ajustada');
  await page.click('[data-comprei="gaze"]'); await page.waitForSelector('[data-onde="cremer"]'); await page.click('[data-onde="cremer"]'); await espera(300); await foto('13-a-caminho-aviso');
  await page.click('#outro'); await folha('[data-por]', '14-por-outro-material'); await fechar();
  await page.click('[data-chegou="consult"]'); await folha('#fv', '15-chegou-com-validade'); await fechar();

  // ----- Organizar -----
  await tab('organizar'); await foto('20-organizar-materiais');
  await page.click('[data-seg="grupos"]'); await espera(200); await foto('21-organizar-grupos');
  await page.click('[data-grupo="desc"]'); await folha('[data-acao="salvarGrupo"]', '22-editar-grupo'); await fechar();
  await page.click('[data-seg="lojas"]'); await espera(200); await foto('23-organizar-lojas');
  await page.click('[data-loja=""]'); await folha('[data-acao="salvarLoja"]', '24-nova-loja');
  await page.fill('#ljnome', 'Dental Centro'); await page.fill('#ljsite', 'http://errado'); await page.click('[data-acao="salvarLoja"]'); await espera(250); await foto('24b-nova-loja-erro'); await fechar();
  await page.click('[data-loja="cremer"]'); await folha('[data-acao="apagarLoja"]', '25-editar-loja'); await fechar();
  await page.click('[data-seg="avisos"]'); await espera(200); await foto('26-organizar-avisos');
  await page.click('[data-seg="itens"]'); await espera(150);
  await page.click('#novoItem'); await folha('[data-acao="salvarItem"]', '27-novo-material');
  await page.click('[data-acao="salvarItem"]'); await espera(250); await foto('27b-novo-material-erro-sem-nome'); await fechar();
  await ctx.close();
}
await browser.close();
console.log(erros.length ? 'ERROS: ' + erros.join(' | ') : `prints prontos em ${pasta}/ (sem erros na página)`);
