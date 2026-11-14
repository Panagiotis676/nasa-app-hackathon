# Earth Jukebox: 2-minute pitch and demo

The judges score five things, 1 to 5 each, all worth the same: **Impact, Creativity, Validity, Relevance, Presentation**. Each part of this script is there for one of them.

Open the live site before you start: https://panagiotis676.github.io/nasa-app-hackathon/

| Time | Say | Show | Scores |
|---|---|---|---|
| 0:00–0:15 | "NASA shows our planet on maps: pollution, temperature, the lights of our cities. Almost all of it is colour. For about 43 million blind people, and 295 million more with serious sight loss, those maps are closed." | The top of the page | Impact |
| 0:15–0:30 | "Earth Jukebox turns NASA maps into sound, live in the browser. West is your left ear, east your right. Higher notes are further north. More is louder." | The three "Start here" steps | Creativity |
| 0:30–0:45 | "This is Earth at night in 2012, from NASA Black Marble." | Press **Space**, let one year play (8 s), press **Space** again | Relevance |
| 0:45–1:00 | "Now only what changed by 2023. A clean tone where the lights grew, a low buzz where they dimmed." | Press **C**, then **Space** | Presentation |
| 1:00–1:15 | "You can also explore it yourself, with the keyboard or a finger." | Press **E**, click India, press **Enter** ("India … went up 108 percent") | Creativity |
| 1:15–1:40 | "It works with your own NASA maps too. Here are two NASA images of air pollution over New York, before and during the 2020 lockdown." | "Choose a map" → air pollution example, click New York on the map (that turns Explore on), **Enter** ("went down 25 percent") | Relevance, Validity |
| 1:40–1:50 | "NASA measured about 30% less pollution along this corridor. Reading only the pictures, we get 20 to 37% in the big cities. Turning colours back into numbers is accurate to about half a percent of the scale." | The Validation section of the README | Validity |
| 1:50–2:00 | "No install, works offline, on a phone, with a keyboard or a screen reader. Close your eyes: this is our planet changing." | Press **Space** and let it play | Impact |

If the live demo goes wrong, press **T**: the 1-minute tour plays the same demo by itself. Don't talk over it, it has its own voice.

## Before you present

- [ ] Chrome, sound on, volume around 60%. Left/right only works in stereo: use headphones for a judge at the table, or two speakers. On a single speaker, say "left and right ear" anyway and point.
- [ ] "Speak descriptions with the built-in voice" ticked.
- [ ] Check the numbers in the first line before putting them on a slide (Bourne et al., *Lancet Global Health*, 2021: 43 million blind, 295 million with moderate or severe sight loss, in 2020).
- [ ] Keep a copy of the repo on the laptop. `index.html` opened from the disk works without internet.
- [ ] Say it out loud once with a timer.

## Questions the judges may ask

- **NASA already makes sonifications. What's new?** Those are ready-made sound tracks of single images. Earth Jukebox works on any map with a colour scale, plays changes over time, and lets you explore it point by point.
- **How accurate is it?** See Validation in the README: about 0.5% error turning colours back into numbers, and the NO₂ example agrees with NASA's own figure for most cities. Values are approximate because we read pictures, not the original data files. Reading the data files directly is the next step.
- **Did blind people try it?** _Fill in after testing it with someone. One sentence from a real user is worth a lot here._
- **Why not just write a description?** It does that too (D). Sound gives the whole pattern at once, and you hear change over time.
- **Who would use it?** Schools, museums and planetariums for accessible exhibits, and anyone reading NASA's Earth Information Center.
