import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('.');
const SHOTS = path.join(OUT, 'screenshots');
const LOGS = path.join(OUT, 'logs');
fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(LOGS, { recursive: true });

const args = Object.fromEntries(process.argv.slice(2).map(function (a) {
  const i = a.indexOf('=');
  const kv = i === -1 ? [a, true] : [a.slice(0, i), a.slice(i + 1)];
  return [String(kv[0]).replace(/^--/, ''), kv[1]];
}));

const VERSIONS = (args.versions || '302,310,330,3101,canary').split(',');
const SCENES = (args.scenes || 'baseline-px,grid-1fr').split(',');
const MEDIA = (args.media || 'screen,print').split(',');
const WA = args.wa === '1';
const TAG = args.tag || '';

const server = await createServer({ server: { port: 5199, strictPort: true } });
await server.listen();
const url = 'http://localhost:5199/';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const rows = [];

for (const v of VERSIONS) {
  for (const s of SCENES) {
    for (const m of MEDIA) {
      const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
      const consoleErrors = [];
      page.on('console', function (msg) { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', function (e) { consoleErrors.push('PAGEERROR ' + e.message); });
      await page.emulateMedia({ media: m });
      try {
        await page.goto(url + '?v=' + v + '&scene=' + s + (WA ? '&wa=1' : ''), { waitUntil: 'load', timeout: 30000 });
        await page.waitForFunction('window.__ready === true', null, { timeout: 30000 });
        await page.waitForTimeout(500);
        const metrics = await page.evaluate('window.__measure()');
        const name = [TAG, v, s, m, WA ? 'wa' : null].filter(Boolean).join('_');
        const shot = path.join(SHOTS, name + '.png');
        await page.screenshot({ path: shot, fullPage: true });
        metrics.screenshot = path.relative(OUT, shot).replace(/\\/g, '/');
        metrics.consoleErrors = consoleErrors;
        metrics.loadError = await page.evaluate('window.__loadError || null');
        rows.push(metrics);
        const verdict = (metrics.lineCount > 0 && metrics.paths.length && metrics.paths[0].dLen > 10 && metrics.svg && metrics.svg.w > 5 && metrics.svg.h > 5) ? 'RENDERED' : 'EMPTY';
        console.log([TAG, v, s, m, WA ? 'wa' : '-'].join(' | ') + ' => ' + verdict +
          ' rc=' + JSON.stringify(metrics.rc) + ' inner=' + JSON.stringify(metrics.inner) +
          ' svg=' + JSON.stringify(metrics.svg) + ' pos=' + (metrics.innerStyle ? metrics.innerStyle.position : '?') +
          ' lines=' + metrics.lineCount + ' dLen=' + (metrics.paths[0] ? metrics.paths[0].dLen : 0));
      } catch (e) {
        rows.push({ version: v, scene: s, media: m, error: String(e.message) });
        console.log([TAG, v, s, m].join(' | ') + ' => ERROR ' + e.message);
      }
      await page.close();
    }
  }
}

await browser.close();
await server.close();

const outFile = path.join(LOGS, (TAG || 'matrix') + '-results.json');
fs.writeFileSync(outFile, JSON.stringify(rows, null, 2));
console.log('WROTE ' + outFile + ' (' + rows.length + ' rows)');
