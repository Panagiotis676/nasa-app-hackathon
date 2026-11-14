# Browser tests

Checks for the web app, run in headless Chrome with [Playwright](https://playwright.dev). You don't need any of this to use the app.

Set up once, from the repo folder (needs Node.js):

```
npm install --no-save playwright
npx playwright install chromium
```

Then, from the repo folder:

- `node tests/fullcheck.js`: about 100 checks (keyboard, buttons, voice, uploads, Explore, the tour…), one PASS or FAIL line each.
- `node tests/validate.js`: prints the numbers used in the Validation section of the main README.
- `node tests/speechcheck.js`: listens to everything the app says in real use (playing, D, L, Explore, the example, the tour) and flags sentences cut off before they could be heard, repeats, a voice that isn't English and very long speeches. Takes about 3 minutes.
- `node tests/mobilecheck.js`: phones (iPhone, small Android, sideways) with touch: nothing wider than the screen, buttons big enough for a finger, tapping and dragging on the map, the example, adding images, the tour, and that a refresh stays where you were.
- `node tests/pitchcheck.js`: goes through the demo in PITCH.md step by step.

Run `fullcheck.js` before pushing a change to `index.html`, `css/` or `js/`.
