# Security

## Reporting a problem

If you find a security problem, please **don't open a public issue**. Report it privately
from the repo's **Security** tab ("Report a vulnerability"), or message one of the team
directly. It's a hackathon project, so a reply may take a little while.

## What the project does with your data

- The web app (`index.html`) is a static page: no server, no accounts, no tracking, no cookies.
- Images and colorbars you add are read **only inside your browser**. They are never uploaded anywhere.
- Speech uses your browser's text-to-speech. What gets spoken is the frame description, never your images.
- The Python scripts run locally. `tools/build_nightlights.py` and `prototype/earth_video_with_sound.py`
  download public files from NASA (svs.gsfc.nasa.gov, images-assets.nasa.gov). `image_describer.py --yolo`
  downloads the YOLO model from Ultralytics the first time. Nothing is ever sent back.

## Supported versions

Only the latest version on the `main` branch.
