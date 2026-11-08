// Confere, no site publicado (npm run build + vite preview), que o PDF e a aba Documentos abrem SEM internet (cache do PWA).
// Uso: (npx vite preview --port 5198 --host 127.0.0.1 rodando) node scripts/testar-offline-pdf.mjs
import { chromium } from 'playwright';
const base = 'http://127.0.0.1:5198/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
const page = await ctx.newPage();
await page.goto(base);
await page.evaluate(() => navigator.serviceWorker.ready);
await page.waitForTimeout(2500); // deixa o cache do PWA encher
await page.reload(); await page.waitForTimeout(800);
await ctx.setOffline(true);
const r = await page.evaluate(async () => {
  const arqs = ['A4/Receituario-Andressa-Namba.pdf', 'A4/Pedido-Escaneamento-Intraoral.pdf', 'A4/Pedido-Documentacao-Ortodontica-Escaneamento.pdf',
    'A5/Receituario-A5.pdf', 'A5/Receituario-A5-2-por-folha-A4.pdf', 'A5/Atestado-A5.pdf', 'A5/Atestado-2-por-folha-A4.pdf',
    'previas/Receituario-Andressa-Namba.png', 'previas/Atestado-A5.png'];
  const out = {};
  for (const a of arqs) { try { const x = await fetch('documentos/' + a); out[a] = x.ok && (await x.arrayBuffer()).byteLength > 1000 ? 'ok' : 'FALHOU ' + x.status; } catch (e) { out[a] = 'FALHOU ' + e.message; } }
  return out;
});
console.log(JSON.stringify(r, null, 1));
const ruim = Object.values(r).filter(v => v !== 'ok').length;
// o app abre offline (recarrega sem internet)
await page.reload(); await page.waitForTimeout(1500);
console.log('título offline:', await page.title(), '| #app presente:', await page.locator('#app').count());
await browser.close();
process.exit(ruim ? 1 : 0);
