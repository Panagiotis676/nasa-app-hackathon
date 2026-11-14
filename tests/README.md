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
- `node tests/pitchcheck.js`: goes through the demo in PITCH.md step by step.

Run `fullcheck.js` before pushing a change to `index.html`, `css/` or `js/`.
