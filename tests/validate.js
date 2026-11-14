// Chrysanthos: the numbers in the "Validation" section of the README. Run: node tests/validate.js
const { chromium } = require('playwright');
const REPO = process.argv[2] || require('path').resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + REPO + '/index.html'); await p.waitForTimeout(1800);

  // 1. Round trip: a made-up map with known values -> colours -> JPEG -> back to numbers
  for (const cm of ['viridis', 'inferno', 'diverging', 'jet']) {
    const r = await p.evaluate(async cm => {
      const W = 640, H = 320, truth = (x, y) => 5 + 3.2 * Math.sin(x / 70) * Math.cos(y / 45) + 1.6 * Math.sin((x + 2 * y) / 33);
      const land = (x, y) => ((x - 200) / 110) ** 2 + ((y - 150) / 70) ** 2 < 1 || ((x - 470) / 80) ** 2 + ((y - 210) / 60) ** 2 < 1; // grey "no data" blobs
      const L = lutFor(cm), c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), im = x.createImageData(W, H);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const o = 4 * (j * W + i); let col; if (land(i, j)) col = [107, 114, 128]; else { const q = Math.max(0, Math.min(1, truth(i, j) / 10)); col = L[Math.round(q * 255)]; } im.data[o] = col[0]; im.data[o + 1] = col[1]; im.data[o + 2] = col[2]; im.data[o + 3] = 255; }
      x.putImageData(im, 0, 0);
      const img = await new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.src = c.toDataURL('image/jpeg', .85); });
      S = { ...readS(), lut: L, gray: false, vmin: 0, vmax: 10, tol: 50, crop: { t: 0, b: 0, l: 0, r: 0 } };
      const fr = prep(img, 'test', null), v = decode(fr.raw), w = fr.raw.width, h = fr.raw.height, sx = W / w, sy = H / h;
      let n = 0, err = [], miss = 0, fake = 0, nl = 0;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const X = (i + .5) * sx, Y = (j + .5) * sy, d = v[j * w + i];
        // skip cells right on a data / no-data border (they mix both colours)
        let edge = false; for (const [a, bb] of [[-sx, 0], [sx, 0], [0, -sy], [0, sy]]) if (land(X + a, Y + bb) !== land(X, Y)) edge = true; if (edge) continue;
        if (land(X, Y)) { nl++; if (d === d) fake++; continue; }
        n++; if (d !== d) { miss++; continue; } err.push(Math.abs(d - Math.max(0, Math.min(10, truth(X, Y)))) / 10 * 100);
      }
      err.sort((a, b) => a - b);
      return { cm, mean: (err.reduce((a, b) => a + b, 0) / err.length).toFixed(2), p95: err[Math.floor(.95 * err.length)].toFixed(2), found: (100 * (n - miss) / n).toFixed(1), fake: (100 * fake / nl).toFixed(1) };
    }, cm);
    console.log('round trip', JSON.stringify(r));
  }

  // 2. Real data: NO2 example, change along the I-95 corridor (NASA: about 30% lower, Washington DC to Boston)
  await p.selectOption('#preset', 'example'); await p.waitForTimeout(2500);
  const no2 = await p.evaluate(() => {
    const [a, c] = frames, cities = [['Washington', 38.9, -77.04], ['Baltimore', 39.29, -76.61], ['Philadelphia', 39.95, -75.17], ['New York', 40.71, -74.01], ['Hartford', 41.76, -72.68], ['Providence', 41.82, -71.41], ['Boston', 42.36, -71.06]];
    let sa = 0, sc = 0; const out = cities.map(([n, la, lo]) => { const x = exAvg(a.vals, a.W, a.H, la, lo), y = exAvg(c.vals, c.W, c.H, la, lo); sa += x; sc += y; return n + ' ' + Math.round(100 * (y - x) / x) + '%'; });
    return out.join(', ') + ' | corridor ' + Math.round(100 * (sc - sa) / sa) + '%';
  });
  console.log('NO2', no2);

  // 2b. Sea surface temperature: values at places with well known temperatures
  await p.selectOption('#preset', 'sea-surface-temperature'); await p.waitForTimeout(2500);
  console.log('SST', await p.evaluate(() => { const f = frames[0], at = (la, lo) => exAvg(f.vals, f.W, f.H, la, lo).toFixed(1);
    return 'Pacific warm pool ' + at(0, 150) + ', Indian Ocean ' + at(-10, 80) + ', eastern Pacific ' + at(0, -100) + ', North Atlantic ' + at(45, -30) + ', Labrador Sea ' + at(58, -55) + ', Southern Ocean ' + at(-60, -120) + ' °C'; }));

  // 3. Night lights: yearly averages
  await p.selectOption('#preset', 'nightlights'); await p.waitForTimeout(1500);
  console.log('lights', await p.evaluate(() => frames.map(f => f.name + ' ' + f.st.mean.toFixed(5)).join(', ')));
  await b.close();
})();
