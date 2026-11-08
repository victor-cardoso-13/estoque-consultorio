// Gera os ícones (192, 512 e apple-touch 180): 🦷 sobre âmbar, com a tinta da fábrica. Uso: node scripts/icones.mjs
import { chromium } from 'playwright';
const b = await chromium.launch();
for (const [arq, t] of [['icone-512', 512], ['icone-192', 192], ['apple-touch-icon', 180]]) {
  const p = await b.newPage({ viewport: { width: t, height: t } });
  await p.setContent(`<body style="margin:0;width:${t}px;height:${t}px;display:grid;place-items:center;background:linear-gradient(160deg,#f6c366,#e8a33d);border:0"><div style="font-size:${Math.round(t * 0.62)}px;line-height:1;filter:drop-shadow(0 ${t * 0.02}px ${t * 0.03}px rgba(59,47,42,.3))">🦷</div></body>`);
  await p.screenshot({ path: `public/${arq}.png` });
  await p.close();
}
await b.close();
