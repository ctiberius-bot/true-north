import { createRequire } from 'node:module';
const require = createRequire('/opt/node-tools/node_modules/');
const { chromium } = require('playwright');
const [, , base, outDir, prefix = 'after'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const errors = [];
async function page(vp) { const p = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 }); p.on('pageerror', e => errors.push(String(e))); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); await p.goto(base); await p.waitForSelector('[data-job]'); await p.waitForTimeout(300); return p; }
const desk = await page({ width: 1440, height: 900 });
await desk.screenshot({ path: `${outDir}/${prefix}-desktop-list.png` });
await desk.click('[data-job="j1"]'); await desk.waitForSelector('.track, .hero'); await desk.waitForTimeout(500);
await desk.screenshot({ path: `${outDir}/${prefix}-desktop-listing.png` });
if (prefix === 'after') {
  await desk.click('[data-tab="package"]'); await desk.waitForTimeout(200);
  await desk.click('[data-preview]'); await desk.waitForTimeout(200);
  await desk.screenshot({ path: `${outDir}/${prefix}-desktop-documents.png` });
  await desk.click('[data-tab="status"]'); await desk.waitForTimeout(400);
  await desk.screenshot({ path: `${outDir}/${prefix}-desktop-submission.png` });
  await desk.click('[data-job="j2"]'); await desk.waitForTimeout(500); await desk.click('[data-tab="package"]'); await desk.waitForTimeout(200);
  await desk.screenshot({ path: `${outDir}/${prefix}-desktop-review.png` });
  await desk.click('[data-state-filter="submitted"]'); await desk.waitForTimeout(100);
  await desk.screenshot({ path: `${outDir}/${prefix}-desktop-filter-submitted.png`, clip: { x: 0, y: 0, width: 400, height: 500 } });
  await desk.click('.viewnav [data-view="queue"]'); await desk.waitForTimeout(200);
  await desk.screenshot({ path: `${outDir}/${prefix}-desktop-queue.png` });
  const mob = await page({ width: 390, height: 844 });
  await mob.screenshot({ path: `${outDir}/${prefix}-mobile-list.png` });
  await mob.click('[data-job="j1"]'); await mob.waitForTimeout(500);
  await mob.screenshot({ path: `${outDir}/${prefix}-mobile-detail.png`, fullPage: false });
  await mob.click('[data-tab="status"]'); await mob.waitForTimeout(400);
  await mob.screenshot({ path: `${outDir}/${prefix}-mobile-submission.png`, fullPage: true });
  const overflow = await mob.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log('mobile horizontal overflow:', overflow);
  const tab = await page({ width: 1024, height: 768 }); await tab.click('[data-job="j3"]'); await tab.waitForTimeout(500);
  await tab.screenshot({ path: `${outDir}/${prefix}-tablet-detail.png` });
}
console.log('errors:', JSON.stringify(errors));
await browser.close();
