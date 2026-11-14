// Chrysanthos: the app on phones (iPhone and a small Android, upright and sideways, with touch): nothing wider than the screen,
// buttons big enough for a finger, Play, tapping and dragging on the map, the example, adding images, the tour, and refresh.
// Run from the repo folder: node tests/mobilecheck.js [folder for screenshots]
const { chromium } = require('playwright');
const REPO = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : require('path').resolve(__dirname, '..');
const SHOTS = process.argv[3];
const results = [], check = (name, ok, info = '') => results.push([ok ? 'PASS' : 'FAIL', name, info]);

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const phones = [['iPhone 390x844', 390, 844], ['small Android 360x740', 360, 740], ['iPhone sideways 844x390', 844, 390]];
  for (const [label, w, h] of phones) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    const p = await ctx.newPage(); const errs = [];
    await p.addInitScript(() => {
      window.__said = []; window.__osc = 0;
      Object.defineProperty(window, 'speechSynthesis', { value: { speak(u) { __said.push(u.text); if (u.onend) setTimeout(() => u.onend(), 30); }, cancel() {}, getVoices() { return [{ lang: 'en-US' }]; }, addEventListener() {}, speaking: false } });
      window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
      const B = BaseAudioContext.prototype, co = B.createOscillator; B.createOscillator = function () { __osc++; return co.call(this); };
    });
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    const ev = f => p.evaluate(f), wide = () => ev(() => document.documentElement.scrollWidth - innerWidth);
    await p.goto('file://' + REPO + '/index.html'); await p.waitForTimeout(2000);
    const L = s => label + ': ' + s;

    check(L('nothing wider than the screen'), (await wide()) <= 0, 'overflow ' + (await wide()) + ' px');
    // every visible control at least 44 px tall (Apple's and WCAG's size for a finger), the volume slider at least 24
    const small = await ev(() => Array.from(document.querySelectorAll('button,select,input:not([type=file]),summary,a.btn')).filter(el => { const r = (el.type === 'checkbox' && el.closest('label') || el).getBoundingClientRect(), st = getComputedStyle(el); if (!r.width || st.visibility === 'hidden' || el.closest('[hidden]')) return false; if (el.closest('details:not([open])') && el.tagName !== 'SUMMARY') return false; const min = el.type === 'range' ? 24 : 44; return r.height < min; }).map(el => (el.id || el.textContent.trim().slice(0, 20) || el.tagName) + ' ' + Math.round(el.getBoundingClientRect().height)));
    check(L('buttons and menus big enough for a finger'), small.length === 0, small.slice(0, 6).join(', '));

    await p.tap('#play'); await p.waitForTimeout(400); check(L('tap Play plays'), await ev(() => playing)); await p.tap('#play');
    const o0 = await ev(() => __osc); const box = await p.$eval('#cv', c => { c.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    await p.waitForTimeout(200); await p.touchscreen.tap(box.x + box.w * .7, box.y + box.h * .35); await p.waitForTimeout(300);
    check(L('tap on the map: Explore on and a note plays'), (await ev(() => exploring)) && (await ev(() => __osc)) > o0);
    // a finger dragged across the map keeps moving the cross
    const lo0 = await ev(() => exLon);
    await p.evaluate(([x, y, w]) => { const c = document.getElementById('cv'), o = { pointerType: 'touch', pointerId: 7, bubbles: true, buttons: 1 }; c.dispatchEvent(new PointerEvent('pointerdown', { ...o, clientX: x, clientY: y })); for (let i = 1; i <= 5; i++) c.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: x - i * w * .05, clientY: y })); c.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: x - w * .25, clientY: y })); }, [box.x + box.w * .7, box.y + box.h * .35, box.w]);
    await p.waitForTimeout(300); check(L('dragging a finger moves the cross west'), (await ev(() => exLon)) < lo0, lo0.toFixed(0) + ' -> ' + (await ev(() => exLon)).toFixed(0));
    await p.tap('#explore'); check(L('Explore button turns it off'), !(await ev(() => exploring)));

    await p.selectOption('#preset', 'example'); await p.waitForTimeout(2500);
    check(L('the air pollution example loads'), (await ev(() => frames.length)) === 2 && (await wide()) <= 0, 'overflow ' + (await wide()));
    const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 3000 }).catch(() => null), p.tap('#addMaps')]);
    check(L('"Add your own maps" opens the phone\'s file picker'), !!fc && fc.isMultiple());
    await p.selectOption('#preset', 'nightlights'); await p.waitForTimeout(1500);

    await p.tap('#tour'); await p.waitForTimeout(800); check(L('the tour starts with a tap'), await ev(() => tourRunning));
    await p.touchscreen.tap(5, 5); await p.waitForTimeout(300); check(L('a tap anywhere stops the tour'), !(await ev(() => tourRunning)) && !(await ev(() => playing)));

    // refresh: after using the menu link the address has no #, and a refresh stays where you were
    await p.evaluate(() => document.querySelector('nav a[href="#data"]').click()); await p.waitForTimeout(800);
    const y0 = await ev(() => Math.round(scrollY)), hash = await ev(() => location.hash);
    await p.evaluate(() => document.getElementById('player').scrollIntoView({ block: 'start', behavior: 'instant' })); await p.waitForTimeout(300);
    const y1 = await ev(() => Math.round(scrollY)); await p.reload(); await p.waitForTimeout(2500); const y2 = await ev(() => Math.round(scrollY));
    check(L('menu link leaves no # in the address, refresh stays where you were'), hash === '' && y0 > 0 && Math.abs(y2 - y1) < 60, `hash "${hash}", before ${y1}, after ${y2}`);

    if (SHOTS && w === 390) for (const [name, sel] of [['top', '.hero'], ['player', '#player'], ['your-maps', '#data']]) {
      await p.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'start', behavior: 'instant' }), sel); await p.waitForTimeout(300);
      await p.screenshot({ path: `${SHOTS}/phone-${name}.png`, scale: 'css' });
    }
    check(L('no errors'), errs.length === 0, errs.join(' | ').slice(0, 200));
    await ctx.close();
  }
  await b.close();
  const w = Math.max(...results.map(r => r[1].length));
  for (const [s, n, i] of results) console.log(s, n.padEnd(w), i ? ' ' + String(i).slice(0, 120) : '');
  const f = results.filter(r => r[0] === 'FAIL').length; console.log(`\n${results.length - f}/${results.length} passed`);
})();
