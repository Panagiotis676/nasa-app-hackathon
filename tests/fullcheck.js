// Chrysanthos: every feature of the web app checked in headless Chrome (keys, buttons, voice rules, uploads, Explore, the tour...).
// Run from the repo folder: node tests/fullcheck.js   (setup in tests/README.md)
const { chromium } = require('playwright');
const REPO = process.argv[2] || require('path').resolve(__dirname, '..');
const results = [];
const check = (name, ok, info = '') => results.push([ok ? 'PASS' : 'FAIL', name, info]);

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.addInitScript(() => {
    window.__said = []; window.__cancels = 0; window.__talking = false;
    Object.defineProperty(window, 'speechSynthesis', { value: { speak(u) { __said.push(u.text); __vlang.push(u.voice ? u.voice.lang : 'none'); __talking = true; if (u.onend) setTimeout(() => u.onend(), 30); }, cancel() { __cancels++; __talking = false; }, getVoices() { return [{ lang: 'el-GR', name: 'Melina' }, { lang: 'en-US', name: 'Samantha' }]; }, addEventListener() {}, speaking: false, pending: false } });
    window.__vlang = [];
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    // Explore checks: remember every oscillator / panner / noise click the page makes, and vibrations
    window.__osc = []; window.__pan = []; window.__clicks = 0; window.__vib = [];
    const B = BaseAudioContext.prototype, co = B.createOscillator, cp = B.createStereoPanner, cb = B.createBufferSource;
    B.createOscillator = function () { const o = co.call(this); __osc.push(o); return o; };
    B.createStereoPanner = function () { const o = cp.call(this); __pan.push(o); return o; };
    B.createBufferSource = function () { __clicks++; return cb.call(this); };
    navigator.vibrate = ms => { __vib.push(ms); return true; };
  });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const ev = f => p.evaluate(f);
  const status = () => p.textContent('#status');
  const blur = () => ev(() => document.activeElement && document.activeElement.blur());
  const key = async k => { await blur(); await p.keyboard.press(k); await p.waitForTimeout(150); };

  await p.goto('file://' + REPO + '/index.html'); await p.waitForTimeout(1800);

  // A. loading
  check('Page loads night lights', (await status()) === 'Frame 1 of 12: 2012', await status());
  check('12 frames, 12 year buttons, 12 meter bars', (await ev(() => frames.length)) === 12 && (await p.$$('#timeline button')).length === 12 && (await p.$$('#meter i')).length === 12);
  check('Silent while loading (no speech before the user acts)', (await ev(() => __said.length)) === 0);
  check('Intro text shown', ((await p.textContent('#intro')) || '').includes('Black Marble'));

  // B. keyboard shortcuts
  await key('Space'); check('Space = play', await ev(() => playing));
  await key('Space'); check('Space again = pause', !(await ev(() => playing)));
  await key('ArrowRight'); check('Right arrow = next frame', (await status()).startsWith('Frame 2 of 12'), await status());
  await key('n'); check('N = next frame', (await status()).startsWith('Frame 3 of 12'));
  await key('ArrowLeft'); check('Left arrow = previous frame', (await status()).startsWith('Frame 2 of 12'));
  await key('p'); check('P = previous frame', (await status()).startsWith('Frame 1 of 12'));
  await key('p'); check('P on the first frame says so', (await ev(() => __said.at(-1))).includes('first frame'));
  await key('r'); check('R = replay (plays from the start)', (await ev(() => playing)) && (await ev(() => pos)) < .2); await key('Space');
  await key('d'); check('D = describe (text + voice)', (await p.textContent('#dtxt')).startsWith('Frame 1 of 12, 2012') && (await ev(() => __said.at(-1))).startsWith('Frame 1 of 12'));
  await key('l'); check('L = listening guide', (await p.textContent('#dtxt')).startsWith('Listening guide'));
  await key('c'); check('C = only what changed', (await status()) === 'What changed, 2012 to 2023', await status());
  await key('c'); check('C again = every frame', (await status()).startsWith('Frame 1 of 12'));
  await key('+'); check('+ = faster', (await p.inputValue('#speed')) === '4' && (await ev(() => __said.at(-1))).startsWith('Speed: Fast'), await ev(() => __said.at(-1)));
  await key('+'); check('+ at the fastest says so', (await ev(() => __said.at(-1))).includes('fastest'));
  await key('-'); await key('-'); check('- = slower', (await p.inputValue('#speed')) === '14', await ev(() => __said.at(-1)));
  await key('-'); check('- at the slowest says so', (await ev(() => __said.at(-1))).includes('slowest'));
  await p.selectOption('#speed', '8');
  await key('Shift+Slash'); check('? = read all shortcuts', (await p.textContent('#dtxt')).startsWith('Keyboard shortcuts'));
  await ev(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'δ', code: 'KeyD', bubbles: true }))); await p.waitForTimeout(100);
  check('Greek keyboard: δ (the D key) = describe', (await p.textContent('#dtxt')).startsWith('Frame 1 of 12'));
  await ev(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ψ', code: 'KeyC', bubbles: true }))); await p.waitForTimeout(300);
  check('Greek keyboard: ψ (the C key) = only what changed', (await status()).startsWith('What changed')); await key('c');

  // C. buttons
  await p.click('#play'); check('Play button plays, shows Pause', (await ev(() => playing)) && (await p.textContent('#play')) === 'Pause' && (await p.getAttribute('#play', 'data-state')) === 'playing');
  await p.click('#play'); check('Pause button pauses, shows Play', !(await ev(() => playing)) && (await p.textContent('#play')) === 'Play');
  await p.click('#next'); check('Next frame button', (await status()).startsWith('Frame 2'));
  await p.click('#prev'); check('Previous frame button', (await status()).startsWith('Frame 1'));
  await p.click('#replay'); check('Replay button', await ev(() => playing)); await p.click('#play');
  await p.click('#desc'); check('Describe button', (await p.textContent('#dtxt')).includes('near'));
  await p.click('#leg'); check('How to listen button', (await p.textContent('#dtxt')).startsWith('Listening guide'));
  check('Describe names a place', /near [A-Z]/.test(await ev(() => describe(frames[11], 11))), (await ev(() => describe(frames[11], 11))).match(/highest value is near [^.]*/)[0]);

  // D. voice rules
  await p.click('#desc'); await p.click('#play'); await p.waitForTimeout(150);
  check('Play cuts the voice and starts the sound', (await ev(() => playing)) && !(await ev(() => __talking)));
  await ev(() => goTo(3)); check('Year is spoken while playing', (await ev(() => __said.at(-1))).startsWith('2015, '), await ev(() => __said.at(-1)));
  await p.click('#desc'); check('Describe while playing pauses the sound', !(await ev(() => playing)) && (await ev(() => __talking)));
  await p.click('#play'); await p.click('#play'); check('Pause stops the voice', !(await ev(() => __talking)));
  check('Rising chime 2014 -> 2015 etc: year changes say up/down', (await ev(() => { goTo(8); return __said.at(-1); })).includes('down'), 'goTo 2020: ' + (await ev(() => __said.at(-1))));

  // E. speed, loop, volume
  await p.selectOption('#speed', '4'); await ev(() => goTo(0)); await p.click('#play'); await p.waitForTimeout(1000);
  const pos4 = await ev(() => pos); await p.click('#play');
  check('Fast speed (4 s per frame)', pos4 > .18 && pos4 < .35, 'pos after 1 s = ' + pos4.toFixed(2));
  await p.selectOption('#speed', '8');
  await p.check('#loop'); await ev(() => { goTo(11); }); await p.click('#play'); await ev(() => { pos = .999; }); await p.waitForTimeout(200);
  check('Loop goes back to the first frame', (await status()).startsWith('Frame 1 of 12'), await status()); await p.click('#play'); await p.uncheck('#loop');
  await ev(() => { goTo(11); }); await p.click('#play'); await ev(() => { pos = .999; }); await p.waitForTimeout(200);
  check('Without loop it stops at the end', !(await ev(() => playing)) && (await ev(() => __said.at(-1))) === 'End of frames.');
  await p.fill('#vol', '0.2'); await p.dispatchEvent('#vol', 'input'); check('Volume slider', Math.abs((await ev(() => master.gain.value)) - .2) < .01);
  await p.fill('#vol', '0.6'); await p.dispatchEvent('#vol', 'input');

  // F. timeline
  await p.click('#timeline button:nth-child(9)'); check('Year button jumps to 2020', (await status()) === 'Frame 9 of 12: 2020');
  check('Only the current year button is in the Tab order', (await p.$$eval('#timeline button', l => l.filter(x => x.tabIndex === 0).length)) === 1);

  // G/H. maps and modes
  await p.selectOption('#view', 'change'); await p.waitForTimeout(500);
  const dc = await ev(() => describe(frames[0], 0));
  check('Only what changed: description', dc.includes('Lights grew the most near') && dc.includes('Lights dimmed the most near'), dc.slice(0, 160));
  await p.click('#next'); check('Next in change mode explains there is one sweep', (await ev(() => __said.at(-1))).includes('one sweep'));
  await p.click('#play'); await ev(() => { pos = (78 + 180) / 360; }); await p.waitForTimeout(200);
  check('Change sweep plays both voice sets (India loud)', (await ev(() => voices.some(g => g.gain.value > .01))), 'max up gain ' + (await ev(() => Math.max(...voices.map(g => g.gain.value)).toFixed(3))));
  await p.click('#play'); await p.selectOption('#view', 'frames'); await p.waitForTimeout(400);
  check('No made-up demo in the map menu', !(await p.$$eval('#preset option', l => l.map(o => o.value))).includes('demo'));

  // I/J. your own maps
  await p.setInputFiles('#files', [REPO + '/media/eic_example_1.jpeg']); await p.waitForTimeout(700);
  await p.setInputFiles('#files', [REPO + '/media/eic_example_2.jpeg']); await p.waitForTimeout(700);
  check('Upload frames in two batches', (await p.$$('#uploadList li')).length === 2 && (await ev(() => frames.length)) === 2 && (await p.inputValue('#preset')) === 'upload');
  check('Embedded colorbar detected automatically', (await p.textContent('#cmapDetect')).includes('detected automatically'), await p.textContent('#cmapDetect'));
  await p.uncheck('#autoColorbar'); await p.waitForTimeout(400); check('Auto-detect can be switched off', (await p.textContent('#cmapDetect')).includes('off'));
  await p.check('#autoColorbar'); await p.waitForTimeout(400);
  await p.setInputFiles('#cbar', REPO + '/media/colloure bar.png'); await p.waitForTimeout(700);
  check('Manual colorbar upload', (await p.inputValue('#cmap')) === 'custom' && (await p.textContent('#cmapDetect')).includes('uploaded'), await p.textContent('#cmapDetect'));
  await p.click('#uploadList li button'); await p.waitForTimeout(400); check('Remove one frame', (await p.$$('#uploadList li')).length === 1);
  await p.click('#clearUploads'); await p.waitForTimeout(300); check('Clear all', (await p.textContent('#uploadList')).includes('No images added'));

  // Q. first visit: Start here, Add your own maps, Try an example
  check('Start here: 3 steps at the top', (await p.$$('.hero .start li')).length === 3 && (await p.$$('#data .start li')).length === 3);
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#addMaps')]);
  await fc.setFiles([REPO + '/media/eic_example_1.jpeg']); await p.waitForTimeout(900);
  check('"Add your own maps" in the player opens the file picker and loads', (await p.$$('#uploadList li')).length === 1 && (await ev(() => frames.length)) === 1);
  const ptop = await p.$eval('#player', x => x.getBoundingClientRect().top);
  check('After adding: settings open, player back in view, focus on Play', (await p.$eval('#mapSettings', d => d.open)) && (await ev(() => document.activeElement.id)) === 'play' && ptop >= 0 && ptop < 130, 'player top (header is 88 px) ' + ptop.toFixed(0));
  await p.selectOption('#preset', 'example'); await p.waitForTimeout(2500);
  const ex = await ev(() => ({ n: frames.length, names: frames.map(f => f.name), list: document.querySelectorAll('#uploadList li').length, vmax: S.vmax, intro: document.getElementById('intro').textContent, det: document.getElementById('cmapDetect').textContent, preset: document.getElementById('preset').value }));
  check('Example in "Choose a map" loads the 2 NASA NO2 images like an upload', ex.n === 2 && ex.list === 2 && ex.preset === 'example' && ex.vmax === 10 && ex.intro.includes('nitrogen dioxide') && ex.names.join() === '2015 to 2019 average,2020', JSON.stringify(ex.names) + ' ' + ex.list);
  check('Example: uses its own colorbar', ex.det.includes('colorbar') && (await ev(() => S.lut === customLut && document.getElementById('cmap').value === 'custom')), ex.det);
  const d1 = await ev(() => describe(frames[1], 1));
  check('Example: describe names the eastern United States', d1.includes('United States'), d1.slice(0, 200));
  await key('c'); const exc = await ev(() => describe(frames[0], 0));
  check('Example, only what changed: NO2 went down', /went down/.test(exc), exc.slice(0, 200));
  await key('e'); const la0 = await ev(() => exLat); await key('ArrowUp');
  check('Explore on a small map: 1 degree steps', Math.abs((await ev(() => exLat)) - la0 - 1) < 1e-9 && (await ev(() => __said.some(x => x.includes('1 degrees a step')))), 'lat ' + la0 + ' -> ' + (await ev(() => exLat)));
  await p.$eval('#cv', c => c.scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(200);
  const bq = await p.$eval('#cv', c => { const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await p.mouse.click(bq.x + (-74 + 84) / 17.5 * bq.w, bq.y + (44.5 - 40.7) / 8.5 * bq.h); await p.waitForTimeout(150); await key('Enter');
  check('Example, Enter over New York: went down', /United States, 4\d degrees north, 7\d west: went down/.test(await ev(() => __said.at(-1))), await ev(() => __said.at(-1)));
  await key('e'); await key('c');
  await p.click('#startListen'); await p.waitForTimeout(150); check('"Start listening" starts the sound', await ev(() => playing)); await key('Space');
  await p.setInputFiles('#files', [REPO + '/media/eic_example_1.jpeg']); await p.waitForTimeout(800);
  check('Your own images replace the example', (await p.$$('#uploadList li')).length === 1 && (await p.inputValue('#preset')) === 'upload');
  await p.click('#clearUploads'); await p.waitForTimeout(200);
  await p.selectOption('#preset', 'nightlights'); await p.waitForTimeout(1200);

  // K/L. advanced
  await p.click('summary:has-text("Advanced")'); await p.fill('#cropT', '10'); await p.dispatchEvent('#cropT', 'change'); await p.waitForTimeout(500);
  check('Trim top 10%', (await ev(() => S.crop.t)) === 10);
  await p.fill('#cropT', '60'); await p.fill('#cropB', '40'); await p.dispatchEvent('#cropB', 'change'); await p.waitForTimeout(300);
  check('Too much trim is refused with a message', (await ev(() => __said.at(-1))).includes('trims'));
  await p.fill('#cropT', '0'); await p.fill('#cropB', '0'); await p.dispatchEvent('#cropB', 'change'); await p.waitForTimeout(500);
  await p.fill('#vmax', '0'); await p.dispatchEvent('#vmax', 'change'); check('Max below min is refused', (await ev(() => __said.at(-1))).includes('maximum'));
  await p.fill('#vmax', '0.08'); await p.dispatchEvent('#vmax', 'change'); await p.waitForTimeout(500);

  // M. screen reader mode (built-in voice off)
  await p.uncheck('#speech'); const before = await ev(() => __said.length); await p.click('#next'); await p.waitForTimeout(150);
  check('Voice off: nothing spoken, screen reader live region gets the text', (await ev(() => __said.length)) === before && ((await p.textContent('#live')) || '').startsWith('Frame'), await p.textContent('#live'));
  await p.check('#speech');

  // O. Explore mode
  await p.selectOption('#view', 'frames'); await p.waitForTimeout(300); await ev(() => goTo(11));
  const st0 = await status();
  await p.click('#play'); await key('e');
  check('E = Explore on: stops playback, voice explains the keys', (await ev(() => exploring)) && !(await ev(() => playing)) && (await ev(() => __said.at(-1))).startsWith('Explore mode') && (await p.getAttribute('#explore', 'aria-pressed')) === 'true', await ev(() => __said.at(-1).slice(0, 60)));
  const lat0 = await ev(() => exLat), lon0 = await ev(() => exLon), n0 = await ev(() => __osc.length);
  await key('ArrowRight');
  check('Arrow right moves the cursor 10° east and plays a note (frame stays)', (await ev(() => exLon)) === lon0 + 10 && (await ev(() => __osc.length)) > n0 && (await status()) === st0, `lon ${lon0} -> ${await ev(() => exLon)}`);
  const pan1 = await ev(() => __pan.at(-1).pan.value), f1 = await ev(() => __osc.at(-1).frequency.value);
  await key('Shift+ArrowRight'); check('Shift = 30° step, more to the right ear', (await ev(() => exLon)) === lon0 + 40 && (await ev(() => __pan.at(-1).pan.value)) > pan1);
  await key('Shift+ArrowUp'); check('Moving north raises the pitch', (await ev(() => exLat)) === lat0 + 30 && (await ev(() => __osc.at(-1).frequency.value)) > f1, `${f1.toFixed(0)} -> ${(await ev(() => __osc.at(-1).frequency.value)).toFixed(0)} Hz`);
  await key('Shift+ArrowUp'); await key('Shift+ArrowUp'); await key('ArrowUp');
  check('Edge of the map is announced', (await ev(() => __said.at(-1))) === 'North edge of the map.', await ev(() => __said.at(-1)));
  const box = await p.$eval('#cv', c => { const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const at = (la, lo) => [box.x + (lo + 180) / 360 * box.w, box.y + (90 - la) / 180 * box.h];
  const nv = await ev(() => __osc.length); await p.mouse.click(...at(23, 78)); await p.waitForTimeout(150);
  check('Click on the map moves the cursor there and plays', Math.abs((await ev(() => exLat)) - 23) < 1.5 && Math.abs((await ev(() => exLon)) - 78) < 1.5 && (await ev(() => __osc.length)) > nv);
  check('Vibrates on phones, longer for a higher value', (await ev(() => __vib.length)) > 0 && (await ev(() => __vib.at(-1))) > 20, 'last ' + (await ev(() => __vib.at(-1))) + ' ms');
  await key('Enter'); const en = await ev(() => __said.at(-1));
  check('Enter says place, coordinates and value', /^India, 2\d degrees north, 7\d east: [\d.]+ brightness, (dark|dim|medium|bright|very bright)\.$/.test(en), en);
  const ck = await ev(() => { const f = frames[fIdx], v = f.vals; f.vals = new Float32Array(v.length).fill(NaN); const c0 = __clicks; exGo(10, 10); f.vals = v; return __clicks > c0; });
  check('No data = a soft click', ck);
  await ev(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }))); await p.waitForTimeout(100);
  check('Esc leaves Explore', !(await ev(() => exploring)) && (await p.getAttribute('#explore', 'aria-pressed')) === 'false');
  await key('ArrowLeft'); check('Outside Explore the arrows change the frame again', (await status()).startsWith('Frame 11 of 12'), await status()); await key('ArrowRight');
  await ev(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ε', code: 'KeyE', bubbles: true }))); await p.waitForTimeout(100);
  check('Greek keyboard: ε (the E key) = Explore', await ev(() => exploring));
  await key('e'); check('E again leaves Explore', !(await ev(() => exploring)));
  await p.click('#explore'); check('Explore button turns it on', (await ev(() => exploring)) && (await p.getAttribute('#explore', 'aria-pressed')) === 'true');
  await p.click('#explore'); check('Explore button turns it off', !(await ev(() => exploring)));
  await key('c'); await key('e'); await p.mouse.click(...at(23, 78)); await p.waitForTimeout(150);
  check('Change mode: India plays the clean "went up" tone', (await ev(() => __osc.at(-1).type)) === 'sine' && (await ev(() => frames[0].change)));
  await key('Enter'); const ce = await ev(() => __said.at(-1));
  check('Change mode: Enter says "went up N percent"', /^India, .*: went up [\d.]+ percent in 2023 compared with 2012\.$/.test(ce), ce);
  const dn = await ev(() => { const f = frames[0]; let best = [0, 0, 0]; for (let la = -60; la <= 70; la += 2) for (let lo = -180; lo <= 180; lo += 2) { const v = exAvg(f.vals, f.W, f.H, la, lo); if (v < best[0]) best = [v, la, lo]; } exGo(best[1], best[2]); return __osc.at(-1).type; });
  check('Change mode: a place that dimmed plays the low buzz', dn === 'sawtooth', dn);
  await key('Space'); check('Play leaves Explore', !(await ev(() => exploring)) && (await ev(() => playing))); await key('Space');
  await key('c');
  check('Shortcut list and ? mention Explore', (await p.textContent('#keys')).includes('explore the map') && (await ev(() => SHORTCUTS)).includes('E: explore'));

  // P. mouse: moving around the page makes no sound, only in Explore
  await ev(() => goTo(0)); const s0 = await ev(() => __said.length), o0 = await ev(() => __osc.length);
  for (const sel of ['#play', '#desc', '#speed', '#cv', '#explore', '#timeline button', '#vol']) { await p.hover(sel); await p.waitForTimeout(60); }
  check('Mouse over the page with Explore off: silent', (await ev(() => __said.length)) === s0 && (await ev(() => __osc.length)) === o0, 'new speech: ' + (await p.evaluate(n => __said.slice(n).join(' / '), s0)));
  await key('e'); const s1 = await ev(() => __said.length);
  await p.hover('#desc'); await p.waitForTimeout(80);
  check('Explore on: hovering a button says what it does', await p.evaluate(n => __said.slice(n).some(x => x.includes('Describe frame')), s1), await p.evaluate(n => __said.slice(n).join(' / '), s1));
  await p.$eval('#cv', c => c.scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(300);
  const bx = await p.$eval('#cv', c => { const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }), at2 = (la, lo) => [bx.x + (lo + 180) / 360 * bx.w, bx.y + (90 - la) / 180 * bx.h];
  const o1 = await ev(() => __osc.length), s2 = await ev(() => __said.length);
  await p.mouse.move(...at2(23, 78)); await p.waitForTimeout(200); await p.mouse.move(...at2(45, 10), { steps: 4 }); await p.waitForTimeout(200);
  check('Explore on: mouse over the map plays notes, without talking', (await ev(() => __osc.length)) > o1 && (await ev(() => __said.length)) === s2 && Math.abs((await ev(() => exLat)) - 45) < 3, 'notes ' + ((await ev(() => __osc.length)) - o1) + ', lat ' + (await ev(() => exLat)).toFixed(0));
  await key('e');

  // R. 1-minute tour
  await ev(() => { window.__t0 = __said.length; });
  await key('t');
  check('T starts the tour, one sentence at a time', (await ev(() => tourRunning)) && (await p.textContent('#tour')) === 'Stop the tour' && (await ev(() => __said.slice(__t0).includes('Welcome to Earth Jukebox, NASA maps you can hear.'))), await ev(() => __said.slice(__t0).join(' / ').slice(0, 90)));
  let done = false; for (let i = 0; i < 80 && !done; i++) { await p.waitForTimeout(500); done = !(await ev(() => tourRunning)); }
  const ts = await ev(() => __said.slice(__t0));
  check('Tour runs to the end: lights, India, New York', done && ts.some(x => /^India, .*went up/.test(x)) && ts.some(x => /United States, .*went down/.test(x)) && ts.some(x => x.startsWith('That was the tour')), ts.length + ' lines: ' + ts.map(x => x.slice(0, 25)).join(' | '));
  check('After the tour: night lights, every frame, normal speed', (await p.inputValue('#preset')) === 'nightlights' && (await ev(() => view)) === 'frames' && (await p.inputValue('#speed')) === '8' && !(await ev(() => exploring)) && !(await ev(() => playing)));
  await p.click('#tour'); await p.waitForTimeout(300);
  check('Tour button starts it', await ev(() => tourRunning));
  await key('Escape');
  check('Any key stops the tour at once', !(await ev(() => tourRunning)) && !(await ev(() => playing)) && (await p.textContent('#tour')) === 'Take the 1-minute tour' && (await p.inputValue('#speed')) === '8');

  // S. sea surface temperature (the one map of Chara's new set that is in the menu)
  check('Menu: night lights, the NO2 example, sea surface temperature, your own images', (await p.$$eval('#preset option', l => l.map(o => o.value).join())) === 'nightlights,example,sea-surface-temperature,upload', await p.$$eval('#preset option', l => l.map(o => o.value).join()));
  await p.selectOption('#preset', 'sea-surface-temperature'); await p.waitForTimeout(2500);
  const sst = await ev(() => { const f = frames[0], at = (la, lo) => exAvg(f.vals, f.W, f.H, la, lo), L = S.lut; return { n: frames.length, warm: at(0, 150), south: at(-60, -120), atl: at(45, -30), ends: Math.min(...L[0]) + Math.max(...L[0]) > 60 && Math.max(...L[255]) > 150, d: describe(f, 0) }; });
  check('Sea surface temperature reads right, also offline: warm pool ~30, N Atlantic ~15, Southern Ocean ~2 °C', sst.n === 1 && sst.ends && sst.warm > 28 && sst.warm < 32 && sst.atl > 11 && sst.atl < 18 && sst.south < 5, `warm pool ${sst.warm.toFixed(1)}, N Atlantic ${sst.atl.toFixed(1)}, Southern Ocean ${sst.south.toFixed(1)}`);
  check('Sea surface temperature: hottest place is in the tropics, not a corner of the picture', /near (the Philippines|Indonesia|Southeast Asia|Malaysia|Vietnam)/.test(sst.d), (sst.d.match(/highest value is near [^.]*/) || [''])[0]);
  await p.selectOption('#preset', 'nightlights'); await p.waitForTimeout(1500);

  // N. page
  check('Skip link goes to the player', (await p.getAttribute('.skip', 'href')) === '#player');
  check('No light theme left', (await p.$('#themeBtn')) === null);
  check('Only English is spoken (no Greek anywhere)', !(await ev(() => __said.some(x => /[\u0370-\u03ff]/.test(x)))), await ev(() => __said.filter(x => /[\u0370-\u03ff]/.test(x)).slice(0, 2).join(' / ')));
  check('Every utterance uses the English voice, even with a Greek one installed', (await ev(() => __vlang.length)) > 20 && (await ev(() => __vlang.every(l => l === 'en-US'))), (await ev(() => __vlang.length)) + ' utterances, other voices: ' + (await ev(() => __vlang.filter(l => l !== 'en-US').join(','))));
  const sc0 = await ev(() => __cancels); await p.click('#stopSpeech');
  check('"Stop the voice" button stops the voice', (await ev(() => __cancels)) > sc0);
  const alt = await ev(() => { const keep = descriptions; descriptions = { nightlights: ['Test picture text.'] }; goTo(0); const a = document.getElementById('cv').getAttribute('aria-label'); descriptions = keep; goTo(0); return a; });
  check('Written description (data/descriptions.json) is the map image description', alt === 'Test picture text.', alt);
  check('No errors in the console', errs.length === 0, errs.join(' | '));

  // fallback: if the NASA data file can't be loaded the page still works, with a clear note
  const p2 = await b.newPage(); await p2.route('**/nightlights.js*', r => r.abort());
  await p2.goto('file://' + REPO + '/index.html'); await p2.waitForTimeout(800);
  check('If NASA data fails to load: demo with a clear note', (await p2.evaluate(() => frames.length)) === 6 && (await p2.textContent('#intro')).includes('could not be loaded'), await p2.textContent('#status'));
  await b.close();
  const w = Math.max(...results.map(r => r[1].length));
  for (const [s, n, i] of results) console.log(s, n.padEnd(w), i ? ' ' + String(i).slice(0, 110) : '');
  const f = results.filter(r => r[0] === 'FAIL').length;
  console.log(`\n${results.length - f}/${results.length} passed`);
})();
