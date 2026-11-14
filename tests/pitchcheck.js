// Chrysanthos: walks through the demo in PITCH.md on a fresh page, step by step. Run: node tests/pitchcheck.js
const { chromium } = require('playwright');
const REPO = process.argv[2] || require('path').resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.addInitScript(() => { window.__said = []; Object.defineProperty(window, 'speechSynthesis', { value: { speak(u) { __said.push(u.text); if (u.onend) setTimeout(() => u.onend(), 30); }, cancel() {}, speaking: false } }); window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } }; });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const ev = f => p.evaluate(f), last = () => ev(() => __said.at(-1));
  await p.goto('file://' + REPO + '/index.html'); await p.waitForTimeout(1800);
  await p.keyboard.press('Space'); await p.waitForTimeout(500); console.log('Space plays:', await ev(() => playing)); await p.keyboard.press('Space');
  await p.keyboard.press('c'); await p.waitForTimeout(400); await p.keyboard.press('Space'); await p.waitForTimeout(300); console.log('C + Space:', await ev(() => frames[0].change && playing)); await p.keyboard.press('Space');
  await p.keyboard.press('e');
  const at = async (la, lo) => { const r = await p.$eval('#cv', c => { c.scrollIntoView({ block: 'center', behavior: 'instant' }); const q = c.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; }); const s = await ev(() => [S.lat0, S.lat1, S.lon0, S.lon1]); return [r.x + (lo - s[2]) / (s[3] - s[2]) * r.w, r.y + (s[1] - la) / (s[1] - s[0]) * r.h]; };
  await p.mouse.click(...await at(23, 78)); await p.keyboard.press('Enter'); await p.waitForTimeout(100); console.log('India:', await last());
  await p.selectOption('#preset', 'example'); await p.waitForTimeout(2500);
  await p.mouse.click(...await at(40.7, -74)); await p.keyboard.press('Enter'); await p.waitForTimeout(100); console.log('New York:', await last());
  await p.keyboard.press('Space'); await p.waitForTimeout(300); console.log('Space at the end plays:', await ev(() => playing), 'exploring:', await ev(() => exploring));
  console.log('errors:', errs.length ? errs.join(' | ') : 'none'); await b.close();
})();
