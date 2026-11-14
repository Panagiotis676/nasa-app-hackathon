// Chrysanthos: listens to everything the app says while someone uses it, with a pretend voice that takes as long as a real
// one (about 15 characters a second), and prints what was heard. It flags sentences cut off before they could be heard,
// the same thing said twice in a row, a voice that isn't English, and very long speeches.
// Run from the repo folder: node tests/speechcheck.js   (takes about 3 minutes, setup in tests/README.md)
const { chromium } = require('playwright');
const REPO = process.argv[2] || require('path').resolve(__dirname, '..');

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.addInitScript(() => {
    const log = window.__log = [], q = []; let cur = null, tm = null, scene = '';
    window.__scene = s => { scene = s; };
    const now = () => Math.round(performance.now()), dur = u => 300 + u.text.length * 65;
    const next = () => {
      if (cur || !q.length) return; cur = q.shift(); cur.__t = now();
      tm = setTimeout(() => { const c = cur; cur = null; log.push({ scene, ev: 'done', text: c.text }); c.onend && c.onend(); next(); }, dur(cur));
    };
    Object.defineProperty(window, 'speechSynthesis', { value: {
      speak(u) { log.push({ scene, ev: 'say', text: u.text, voice: u.voice ? u.voice.lang : (u.lang || 'default') }); q.push(u); next(); },
      cancel() {
        if (cur) { clearTimeout(tm); const c = cur; cur = null; log.push({ scene, ev: 'cut', text: c.text, heard: (now() - c.__t) / dur(c) }); c.onerror && c.onerror({ error: 'interrupted' }); }
        while (q.length) { const u = q.shift(); log.push({ scene, ev: 'dropped', text: u.text }); u.onerror && u.onerror({ error: 'canceled' }); }
      },
      getVoices() { return [{ lang: 'el-GR', name: 'Melina' }, { lang: 'en-US', name: 'Samantha' }]; },
      addEventListener() {}, get speaking() { return !!cur; }, get pending() { return q.length > 0; },
    } });
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const scene = s => p.evaluate(s => window.__scene(s), s);
  const key = async (k, wait = 250) => { await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.keyboard.press(k); await p.waitForTimeout(wait); };
  const quiet = async (max = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < max) { if (!(await p.evaluate(() => speechSynthesis.speaking || speechSynthesis.pending))) return; await p.waitForTimeout(250); } };
  const pick = async (sel, v) => { await p.selectOption(sel, v); await p.evaluate(() => document.activeElement.blur()); };

  await p.goto('file://' + REPO + '/index.html'); await p.waitForTimeout(2500);
  await scene('1. page opens (should be silent)'); await p.waitForTimeout(1000);
  await scene('2. Play at normal speed, 2 years go by'); await key('Space', 100); await p.waitForTimeout(17500); await key('Space'); await quiet();
  await scene('3. Play at fast speed, 3 years go by'); await pick('#speed', '4'); await key('Space', 100); await p.waitForTimeout(12800); await key('Space'); await quiet(); await pick('#speed', '8');
  await scene('4. next frame, then D (describe)'); await key('n'); await quiet(); await key('d'); await quiet();
  await scene('5. L (how to listen)'); await key('l'); await quiet();
  await scene('6. ? (all shortcuts)'); await key('Shift+Slash'); await quiet();
  await scene('7. C (only what changed), play it to the end, then D'); await key('c'); await quiet(); await key('Space', 100); await p.waitForTimeout(8800); await quiet(); await key('d'); await quiet();
  await scene('8. Explore: E, listen, 3 arrows, Enter, Escape'); await key('e'); await quiet(); for (const k of ['ArrowUp', 'ArrowRight', 'ArrowRight']) await key(k, 500); await key('Enter'); await quiet(); await key('Escape'); await quiet(); await key('c'); await quiet();
  await scene('9. pick the air pollution example in "Choose a map"'); await pick('#preset', 'example'); await p.waitForTimeout(2500); await quiet();
  await scene('10. back to night lights'); await pick('#preset', 'nightlights'); await p.waitForTimeout(1500); await quiet();
  await scene('11. the 1-minute tour (T)'); await key('t'); for (let i = 0; i < 300 && await p.evaluate(() => tourRunning); i++) await p.waitForTimeout(500); await quiet();

  const log = await p.evaluate(() => window.__log); await b.close();
  const problems = []; let sc = '', lastSaid = '';
  for (const e of log) {
    if (e.scene !== sc) { sc = e.scene; lastSaid = ''; console.log('\n== ' + sc); }
    const t = process.env.FULL || e.text.length <= 150 ? e.text : e.text.slice(0, 147) + '...';
    if (e.ev === 'say') {
      console.log('   say   ' + t + (e.voice !== 'en-US' ? '   [VOICE ' + e.voice + ']' : ''));
      if (e.voice !== 'en-US') problems.push(sc + ': not the English voice: ' + t);
      if (e.text === lastSaid) problems.push(sc + ': said twice in a row: ' + t);
      if (e.text.length > 450) problems.push(sc + ': very long (' + Math.round((300 + e.text.length * 65) / 1000) + ' s): ' + t.slice(0, 60));
      lastSaid = e.text;
    } else if (e.ev === 'cut') {
      console.log('   CUT   at ' + Math.round(100 * e.heard) + '%: ' + t);
      if (e.heard < .6) problems.push(sc + ': cut at ' + Math.round(100 * e.heard) + '%: ' + t);
    } else if (e.ev === 'dropped') { console.log('   LOST  ' + t); problems.push(sc + ': never said: ' + t); }
  }
  console.log('\n' + (problems.length ? problems.length + ' things to look at:\n- ' + problems.join('\n- ') : 'No problems found.'));
  if (errs.length) console.log('Page errors: ' + errs.join(' | '));
})();
