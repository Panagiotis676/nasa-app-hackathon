# Earth Information Jukebox

Turning images of our planet into sound, so blind and low-vision people can **hear how the Earth is changing**.

Built for the [NASA Space Apps Challenge 2026](https://www.spaceappschallenge.org/2026/) — challenge: [**The Earth Information Jukebox**](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/).

---

## The challenge

NASA's Earth Information Center (EIC) publishes striking visualizations of our changing planet — temperatures, ocean currents, ice, vegetation — but almost all of it is visual. The challenge asks teams to build an "Earth Jukebox": a tool that pairs EIC visual frames with sonifications (data turned into non-speech sound), ideally generated in real time.

Key points from the brief:

- **Accessibility is a core theme** — screen-reader support, tactile feedback and descriptive text are encouraged.
- Balance **data accuracy and musicality** — raw pixel-to-sound tends to be noise; scales and harmony help.
- The deliverable can be a web app, desktop app, API, or a curated playlist of generated audio with an explanation of the process.
- Official challenge data/resources are released on **Friday, 13 November 2026**.

## Our goal

Use music to let blind and low-vision people experience **change** in the Earth over time — not just what a single picture looks like.

## How it works

The Earth Jukebox (`index.html`) turns a series of map frames into sound, right in the browser:

1. **Colour → value.** Each pixel's colour is matched back to the data value it stands for, using the map's colormap or an uploaded picture of its colorbar. For maps without a colormap, like night lights, brightness is the value.
2. **Sweep.** The sound sweeps across the map from west (left ear) to east (right ear). The map is split into 12 latitude bands on a pentatonic scale: north is high, south is low. A higher value is louder.
3. **Change over time.** Frames play in time order. Between frames, a rising or falling chime says whether the average went up or down. Each frame can be described in words, including the change since the previous frame and since the first one (as a percent, for data that can't go negative).
4. **Hear only the change.** "Listen to → Only what changed" (or the `C` key) plays one sweep of the last frame minus the first: a bright, high tone where the value went up, a low buzz where it went down, silence where nothing changed. The voice then names the places that changed the most, and the picture shows increases in gold and decreases in blue.
5. **Download sound.** The "Download sound" button saves what Play would play (every frame or only the change) as a stereo WAV file, with the chimes but without the spoken voice.
6. **Explore the map.** Press `E` (or "Explore the map") and move a cursor with the arrow keys, a click or a finger: each step plays a short note for that spot (pitch = latitude, left/right ear = longitude, loudness = value, a soft click = no data), `Enter` says the place and the value, and phones vibrate.
7. **Accessible.** Everything works with the keyboard and a screen reader (or the built-in voice), and there is a "How to listen" guide.

It opens on real NASA data: **Earth's night lights, 2012 to 2023** (NASA Black Marble, [SVS #5276](https://svs.gsfc.nasa.gov/5276/)), so you can press Play without setting anything up. Over that period the lights grow by about 32%, with a small dip in 2020. In "only what changed" mode you hear that the lights grew the most near China, the Middle East and India, and dimmed the most in western Europe (including Spain, Portugal and the UK) and Ukraine.

`image_describer.py` does the same from the command line: it writes a stereo WAV file and prints a text description of every frame.

## Validation

How we checked that what you hear matches the data:

- **Colour → number.** We drew made-up maps with known values in four colour scales (viridis, inferno, blue-white-red and rainbow), saved them as JPEG (quality 85) and read them back with the app. The average error was about 0.5% of the colour scale's range, and 95% of the map was within 1.3%. Every pixel with data was found, and no grey "no data" area was read as data (leaving out border pixels, which mix two colours).
- **Against a published NASA result.** NASA reported that nitrogen dioxide (NO₂) in March 2020 was about 30% lower than the March 2015–19 average along the I-95 corridor from Washington, DC to Boston, measured by the OMI instrument on the Aura satellite ([NASA, April 2020](https://www.nasa.gov/centers-and-facilities/goddard/nasa-satellite-data-show-30-percent-drop-in-air-pollution-over-northeast-u-s)). Reading the same two NASA images (the air pollution example in "Choose a map"), the app finds Washington −37%, Philadelphia −31%, Hartford −30%, New York −25% and Baltimore −22%, and −20% for the corridor as a whole. It reads less than NASA mainly because the colour scale stops at 10: before 2020 the most polluted spots were darker than the top of the scale, so they count as 10 and the drop looks smaller. Boston, near the edge of the map, doesn't show the drop in our reading.
- **Sea surface temperature.** Read from NASA's ECCO2 map, the app gives 30.1 °C in the western Pacific warm pool, 28.1 °C in the Indian Ocean, 24.8 °C in the cooler eastern Pacific, 14.8 °C in the North Atlantic, 1.4 °C in the Labrador Sea and 2.0 °C in the Southern Ocean, the temperatures these waters are known for. The hottest place it finds is near the Philippines.

Limits: values are read from pictures, not from the original data files, so they are approximate. Places and coordinates assume a plain latitude/longitude grid, so on maps drawn in another projection (like the NO₂ example) they are approximate too.

## Repository contents

```
index.html              the web app (open it in a browser)
css/style.css           its styles (light and dark theme)
js/app.js               its code (image decoding, sound, speech)
data/nightlights.js     night lights 2012–2023 preset, built by tools/build_nightlights.py
tools/                  scripts that build the presets from NASA data
image_describer.py      command-line version: map frames → stereo WAV + text description
media/                  sample images, video and audio
prototype/              first prototype: RGB scores and a soundtrack for an ISS video
requirements.txt        Python packages: pip install -r requirements.txt
ARCHITECTURE.md         architecture proposal (by Chrysanthos)
SECURITY.md             how to report a security problem, what happens to your data
```

## Getting started

**Web app.** Open `index.html` in Chrome, Edge, Firefox or Safari and press Play (or Space). New here? "Take the 1-minute tour" (or `T`) plays a short guided demo with a voice explaining it. Pick another map under "Choose a map", or add your own frames with "Add your own maps" right under it. "Choose a map" also has an example that shows how: two NASA images of air pollution over New York (March 2015–19 average and March 2020), added just like your own would be. It also works as-is on GitHub Pages.

**Command line** (Python 3.9+, the team uses 3.13). Works the same on Windows and Mac; on Windows use `py` if `python` isn't found.

```bash
pip install -r requirements.txt
python image_describer.py jan.png feb.png --cmap viridis --vmin 0 --vmax 1 --play
python image_describer.py map.png --colorbar bar.png --vmin -2 --vmax 2 --units "C anomaly" --crop 0 60 1920 960
python image_describer.py lights_2012.png lights_2023.png --cmap brightness --vmax 0.08 --units brightness
```

`--crop X Y W H` keeps only the map (drops titles, colorbars and borders). Run `python image_describer.py --help` for all options.

**Rebuild the night lights preset** (downloads ~110 MB from NASA into a temp folder):

```bash
python tools/build_nightlights.py
```

**First prototype**

```bash
python prototype/earth_video_with_sound.py
```

This downloads an ISS video from the NASA Image and Video Library to `media/video_1.mp4` (or generates a simple animated globe if the download fails), writes `media/earth_sound.wav`, and plays the video with sound. Press `q` to stop. Set `EARTH_VIDEO_URL` to use a different video. `prototype/image-to-score.py` reads `media/img.png`; change `image_path` at the top to use another image.

## Known issues

- Colours decoded from an image are an approximation of the real data (JPEG compression, colour-matching tolerance).

First prototype scripts:

- `earth_video_with_sound.py`: in `color_to_opera_melody`, the computed note is always ≥ 96 and is then clamped to 84, so **the melody is the same note (C6) regardless of the video's colors**.
- `image-to-sound.py` does not produce audio yet.
- `score-to-sound.py` builds the waveform but does not play or save it; its score-to-frequency mapping spans over 8 octaves, so low scores fall below the audible range (≈ 6 Hz for a score of 0 on the bass voice).
- `earth_video_with_sound.py` looks for `media/video_1.mp4`, while the repo ships `media/earth_video.mp4`.
- Averaging a whole frame into three numbers discards *where* things are, and raw RGB channels don't map to physical meaning (e.g. turquoise ocean and forest both score high on green).

## Ideas and next steps

_Under discussion with the team._ The full proposed architecture and plan (by Chrysanthos) is in [ARCHITECTURE.md](ARCHITECTURE.md).

- **Color → data value** _(done: `index.html` and `image_describer.py`)_. Most EIC visualizations use a color scale (temperature, sea ice, CO₂…). Reading each pixel's color back against that scale gives a real data value, so the 0–100 score means "how warm" or "how much ice" instead of "how red".
- **Timeline mode.** Play a sequence of frames (e.g. 1980 → today) where each year becomes a note in a musical scale; warming raises the pitch and tension, with spoken year markers.
- **Explore mode** _(done: `E` key in `index.html`)_. Move a finger, mouse or arrow keys across the map and hear the value under the cursor; left/right position maps to stereo panning, with vibration on phones.
- **Land-cover orchestra.** Classify pixels as water, vegetation, sand, ice or cloud; each class is an instrument whose volume follows its share of the image. In before/after comparisons you hear, for example, the forest fade away.
- **Accessibility first.** Full keyboard control, screen-reader labels, an audio legend ("this is what cold sounds like") and a written description for every visualization.

## Team

- Chrysanthos Spyrou ([@ichrysanthos](https://github.com/ichrysanthos))
- Panayiotis Agathangelou ([@Panagiotis676](https://github.com/Panagiotis676))
- Chara Charalambous ([@Charaxx101](https://github.com/Charaxx101))

## Credits

- Challenge: NASA Space Apps Challenge 2026 — *The Earth Information Jukebox*.
- Night lights: NASA Black Marble yearly composites via the [NASA Scientific Visualization Studio](https://svs.gsfc.nasa.gov/5276/) (EIC version: [#5313](https://svs.gsfc.nasa.gov/5313/)).
- ISS Earth footage: [NASA Image and Video Library](https://images.nasa.gov/).
