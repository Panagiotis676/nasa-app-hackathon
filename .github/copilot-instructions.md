# Earth Jukebox: notes for Copilot

Chrysanthos wrote these so that Copilot follows the team's decisions. Read `NEXT-STEPS.md` for the plan of the day.

## What this is
A web app for NASA Space Apps 2026 ("The Earth Information Jukebox") that turns NASA maps into sound for blind and
low-vision people. Plain `index.html` + `css/style.css` + `js/app.js`, no build step, no framework. Live on GitHub Pages
from the `main` branch: https://panagiotis676.github.io/nasa-app-hackathon/

- The sound sweeps the map from west (left ear) to east (right ear), 12 latitude bands (north = high note),
  louder = higher value. Colours become numbers through the map's colorbar.
- Keys: Space, N/P, D (describe with numbers), L, C (only what changed), E (Explore), T (1-minute tour), +/-, ?.
- Maps in the menu: night lights (`data/nightlights.js`), NO2 example (`data/examples.js`), sea surface temperature
  (`data/presets.js`), and the user's own images.

## Rules (please follow every time)
1. **Change only the lines that need changing. Never rewrite or re-paste a whole file.** A whole-file rewrite once cut
   `js/app.js` off in the middle and deleted 130 lines. After editing JavaScript, check it parses: `node --check js/app.js`.
2. **Don't delete or undo other people's work.** If something has to go, hide it and explain why in a comment.
   In a merge conflict keep both sides, don't just take one file.
3. **English only**, on the page and in the voice. All speech goes through `enUtter()` / `speakEnglish()` in `js/app.js`.
4. **New maps must be flat maps (equirectangular)** of the whole Earth or a lat/lon box, with a colorbar that goes from low
   to high values. No globes, photos, collages or colour categories: the west-to-east sweep can't read them. That is why
   six maps in `data/presets.js` are not in the menu (team decision, don't add them back unless they are fixed).
5. **It must work offline** (double-click `index.html`): map images go into `data/*.js` as data URLs. No `fetch()`,
   and no map images loaded straight from `media/` (the browser blocks reading them from a file).
6. **Cache numbers:** when `css/`, `js/` or `data/` change, raise the `?v=` number in **every** `<script>` and `<link>`
   in `index.html` (all the same value).
7. Comments in English that start with the author's name, for example `// Chara: ...`.
8. Accessibility: real `<button>`s, announcements through `announce()`, visible focus, touch targets at least 44 px,
   no animation when the user prefers reduced motion. The shortcut list in `index.html` and `SHORTCUTS` in `js/app.js`
   must say the same thing.
9. `D` gives numbers worked out from the data. The texts in `data/descriptions.js` are the map's image description
   (screen reader), not what `D` says.
10. Keep README and `PITCH.md` true: if a feature or a number changes, change the text too.

## Checking a change
- Quick: open `index.html` in Chrome, F12 → Console must show no red errors. Try Play, C, D, E + arrows + Enter, T,
  and every map in "Choose a map".
- Full (needs Node.js): `npm install --no-save playwright && npx playwright install chromium`, then
  `node tests/fullcheck.js` (all PASS) and `node tests/mobilecheck.js`. More in `tests/README.md`.
- After a push, wait 2 minutes and open the live link.
