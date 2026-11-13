"""Earth Information Jukebox - turn an Earth visualization frame into sound.

Idea (NASA Space Apps 2026 challenge): pair an Earth Information Center (EIC)
visualization frame with a sonification generated from its data.

How it works
------------
1. Load a frame (a map image exported from EIC / Worldview / GIBS).
2. Decode pixel colors back into data values using the map's colorbar
   (a named colormap, or a cropped image of the colorbar itself).
3. Sweep across the map west -> east (time = longitude, pan = longitude).
   North-south is pitch (north = high), data value is loudness.
4. Write a stereo WAV, optionally play it, and print a plain-language
   description + legend so the result is accessible without seeing the map.

Install:
    pip install opencv-python numpy
    pip install sounddevice            # optional, only for --play
    pip install ultralytics            # optional, only for --yolo

Examples:
    python image_describer.py frame.png --cmap inferno --vmin 250 --vmax 320 --units K
    python image_describer.py jan.png feb.png mar.png --cmap viridis --vmin 0 --vmax 1 --play
    python image_describer.py frame.png --colorbar bar_crop.png --vmin -2 --vmax 2 --units "C anomaly"
    python image_describer.py frame.png --crop 120 80 1600 800 --cmap turbo --vmin 0 --vmax 30

    # night lights have no colormap, brighter = more light (no colorbar needed)
    python image_describer.py lights_2012.png lights_2023.png --cmap brightness --vmax 0.3 --units brightness
"""

from __future__ import annotations

import argparse
import wave
from pathlib import Path
from typing import Union

import cv2
import numpy as np

SR = 22050
BASE_MIDI = 48  # C3
PENTATONIC = [0, 2, 4, 7, 9]  # keeps any data pattern sounding consonant
BASE_DIR = Path(__file__).resolve().parent

CMAPS = {
    "viridis": cv2.COLORMAP_VIRIDIS,
    "inferno": cv2.COLORMAP_INFERNO,
    "plasma": cv2.COLORMAP_PLASMA,
    "magma": cv2.COLORMAP_MAGMA,
    "turbo": cv2.COLORMAP_TURBO,
    "jet": cv2.COLORMAP_JET,
}

ImageInput = Union[str, Path, np.ndarray]


# --------------------------------------------------------------------------
# Loading + decoding pixels back into data values
# --------------------------------------------------------------------------
def resolve_image_path(image_input: ImageInput) -> ImageInput:
    if isinstance(image_input, np.ndarray):
        return image_input

    p = Path(image_input)
    candidates = [
        p,
        BASE_DIR / p,
        Path.cwd() / p,
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return p


def load_image(image_input: ImageInput) -> np.ndarray:
    if isinstance(image_input, np.ndarray):
        return image_input
    image_path = resolve_image_path(image_input)
    img = cv2.imread(str(image_path))
    if img is None:
        raise FileNotFoundError(f"Could not read image: {image_input}. Try a real path like '{BASE_DIR / 'img.png'}'.")
    return img


def lut_from_cmap(name: str, vmin: float, vmax: float):
    """Colors (BGR) and the data values they represent, from a named colormap."""
    ramp = np.arange(256, dtype=np.uint8).reshape(256, 1)
    colors = cv2.applyColorMap(ramp, CMAPS[name]).reshape(256, 3).astype(np.float32)
    return colors, np.linspace(vmin, vmax, 256).astype(np.float32)


def lut_from_colorbar(bar_bgr: np.ndarray, vmin: float, vmax: float):
    """Colors and values from a cropped image of the map's colorbar.

    Wide crop = horizontal bar (left = vmin). Tall crop = vertical bar (bottom = vmin).
    """
    bar = bar_bgr.astype(np.float32)
    colors = bar.mean(axis=0) if bar.shape[1] >= bar.shape[0] else bar.mean(axis=1)[::-1]
    if len(colors) > 256:  # subsample for speed
        colors = colors[np.linspace(0, len(colors) - 1, 256).astype(int)]
    return colors, np.linspace(vmin, vmax, len(colors)).astype(np.float32)


def decode_values(img: np.ndarray, lut=None, max_side: int = 256, tol: float = 40.0) -> np.ndarray:
    """Map every pixel to a data value. Pixels that match nothing become NaN.

    With no LUT this falls back to brightness (0..1) - an approximation only.
    """
    h, w = img.shape[:2]
    scale = max_side / max(h, w)
    if scale < 1:
        img = cv2.resize(img, (max(1, int(w * scale)), max(1, int(h * scale))), interpolation=cv2.INTER_AREA)
    h, w = img.shape[:2]

    if lut is None:
        return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0

    colors, values = lut
    pix = img.reshape(-1, 3).astype(np.float32)
    out = np.full(len(pix), np.nan, dtype=np.float32)
    step = 4096  # chunked so we never build a huge distance matrix
    for s in range(0, len(pix), step):
        chunk = pix[s : s + step]
        d = ((chunk[:, None, :] - colors[None, :, :]) ** 2).sum(-1)
        idx = d.argmin(1)
        ok = d[np.arange(len(chunk)), idx] <= tol**2
        out[s : s + len(chunk)][ok] = values[idx[ok]]
    return out.reshape(h, w)


# --------------------------------------------------------------------------
# Sonification
# --------------------------------------------------------------------------
def midi_to_hz(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def band_midi(i: int) -> int:
    return BASE_MIDI + 12 * (i // len(PENTATONIC)) + PENTATONIC[i % len(PENTATONIC)]


def sonify_frame(norm: np.ndarray, seconds: float = 8.0, bands: int = 12, sr: int = SR) -> np.ndarray:
    """norm: 2D array in 0..1 (NaN = no data). Returns stereo float32 (n, 2)."""
    h, w = norm.shape
    n = int(seconds * sr)
    valid = ~np.isnan(norm)
    filled = np.where(valid, norm, 0.0)
    edges = np.linspace(0, h, bands + 1).astype(int)
    col_pos = np.linspace(0, n - 1, w)
    t = np.arange(n) / sr
    sample_idx = np.arange(n)

    mix = np.zeros(n, dtype=np.float64)
    for b in range(bands):  # b = 0 is the northernmost band
        top, bot = edges[b], max(edges[b + 1], edges[b] + 1)
        cnt = valid[top:bot].sum(axis=0)
        tot = filled[top:bot].sum(axis=0)
        enough = cnt >= max(1, 0.3 * (bot - top))  # ignore bands that are mostly no-data
        amp_cols = np.where(enough, tot / np.maximum(cnt, 1), 0.0)
        amp = np.interp(sample_idx, col_pos, amp_cols) ** 1.5  # emphasise strong values

        phase = 2 * np.pi * midi_to_hz(band_midi(bands - 1 - b)) * t  # north = high pitch
        mix += amp * (np.sin(phase) + 0.3 * np.sin(2 * phase))

    pan = np.linspace(0, np.pi / 2, n)  # west (left) -> east (right)
    stereo = np.stack([mix * np.cos(pan), mix * np.sin(pan)], axis=1)

    # Chrysanthos: removed the per-frame normalising that was here. It scaled every
    # frame up to the same peak, so a "hot" year and a "cold" year came out just as
    # loud and you couldn't hear the change between them. jukebox() now normalises
    # once over all the frames together (see normalise_peak below).
    fade = int(0.05 * sr)
    ramp = np.linspace(0, 1, fade)
    stereo[:fade] *= ramp[:, None]
    stereo[-fade:] *= ramp[::-1, None]
    return stereo.astype(np.float32)


def normalise(values: np.ndarray, vmin: float, vmax: float) -> np.ndarray:
    return np.clip((values - vmin) / (vmax - vmin), 0.0, 1.0)


def normalise_peak(audio: np.ndarray, peak: float = 0.8) -> np.ndarray:
    # Chrysanthos: one gain for the whole track, so loudness stays comparable between frames
    top = float(np.abs(audio).max())
    return audio * (peak / top) if top > 0 else audio


# --------------------------------------------------------------------------
# Accessibility: describe what you are hearing
# --------------------------------------------------------------------------
def describe_frame(values, vmin, vmax, units="", lat_range=(-90.0, 90.0), lon_range=(-180.0, 180.0), approximate=False) -> str:
    valid = ~np.isnan(values)
    if not valid.any():
        return "No readable data in this frame (check the colormap and value range)."

    h, w = values.shape
    r, c = np.unravel_index(np.nanargmax(values), values.shape)
    lat = lat_range[1] - r / max(h - 1, 1) * (lat_range[1] - lat_range[0])
    lon = lon_range[0] + c / max(w - 1, 1) * (lon_range[1] - lon_range[0])

    north = np.nanmean(values[: h // 2]) if valid[: h // 2].any() else float("nan")
    south = np.nanmean(values[h // 2 :]) if valid[h // 2 :].any() else float("nan")
    u = f" {units}" if units else ""
    note = " (brightness only - no colormap given, so these are not real units)" if approximate else ""
    d = decimals(vmin, vmax)

    return (
        f"Coverage {valid.mean() * 100:.0f}% of the frame. Average {np.nanmean(values):.{d}f}{u}, "
        f"range {np.nanmin(values):.{d}f} to {np.nanmax(values):.{d}f}{u}{note}. "
        f"Highest value near {abs(lat):.0f} deg {'N' if lat >= 0 else 'S'}, {abs(lon):.0f} deg {'E' if lon >= 0 else 'W'}. "
        f"Northern half averages {north:.{d}f}{u}, southern half {south:.{d}f}{u}."
    )


def decimals(vmin, vmax) -> int:
    # Chrysanthos: more decimals for small ranges (same rule as fmt() in index.html).
    # With a fixed 2 decimals the night lights (avg ~0.004) all printed as 0.00
    rng = abs(vmax - vmin) or 1.0
    return int(max(0, min(6, 2 - np.floor(np.log10(rng)))))


def legend(vmin, vmax, units="") -> str:
    u = f" {units}" if units else ""
    return (
        "How to listen: the sound sweeps from the west edge of the map (left ear) to the east edge "
        "(right ear). Higher pitch means further north, lower pitch further south. Louder means a higher "
        f"data value (silent = {vmin}{u} or no data, loudest = {vmax}{u})."
    )


# --------------------------------------------------------------------------
# Optional: YOLO feature detection (useful for photos, limited for data maps)
# --------------------------------------------------------------------------
# Chrysanthos: heads up, the default YOLO model is trained on everyday stuff
# (people, cars, dogs...), so on a data map it basically finds nothing. Left it in
# as an optional extra for real photos. It only gets imported with --yolo, so
# nobody needs to install ultralytics/torch for the normal run.
def detect_objects(img: np.ndarray, model_name="yolov8n.pt", confidence=0.25) -> dict:
    try:
        from ultralytics import YOLO
    except ImportError as exc:
        raise RuntimeError("Install ultralytics first: pip install ultralytics") from exc
    result = YOLO(model_name)(img, conf=confidence, verbose=False)[0]
    counts: dict[str, int] = {}
    for box in result.boxes:
        label = result.names[int(box.cls.item())]
        counts[label] = counts.get(label, 0) + 1
    return counts


# --------------------------------------------------------------------------
# Output
# --------------------------------------------------------------------------
def write_wav(path: str | Path, audio: np.ndarray, sr: int = SR) -> None:
    data = (np.clip(audio, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(sr)
        f.writeframes(data.tobytes())


def play(audio: np.ndarray, sr: int = SR) -> None:
    try:
        import sounddevice as sd
    except ImportError as exc:
        raise RuntimeError("Install sounddevice first: pip install sounddevice") from exc
    sd.play(audio, sr)
    sd.wait()


# --------------------------------------------------------------------------
# Main pipeline
# --------------------------------------------------------------------------
def crop_map(img: np.ndarray, crop) -> np.ndarray:
    """Keep only the map area of the image. crop = (x, y, width, height) in pixels."""
    # Chrysanthos: exported frames usually have a title, a colorbar, logos or a
    # border around the map. Without cropping those get read as data too.
    x, y, w, h = crop
    out = img[y : y + h, x : x + w]
    if out.size == 0:
        raise ValueError(f"--crop {x} {y} {w} {h} is outside the image ({img.shape[1]}x{img.shape[0]})")
    return out


def jukebox(frames, vmin, vmax, units="", cmap="viridis", colorbar=None, seconds=8.0, lat_range=(-90.0, 90.0), lon_range=(-180.0, 180.0), use_yolo=False, out="earth_jukebox.wav", do_play=False, crop=None):
    if colorbar is not None:
        lut = lut_from_colorbar(load_image(colorbar), vmin, vmax)
    elif cmap and cmap != "brightness":
        lut = lut_from_cmap(cmap, vmin, vmax)
    else:
        lut = None

    # Chrysanthos: brightness mode used to force the range to 0..1. Now --vmin/--vmax
    # are respected (they still default to 0 and 1). Night lights are mostly dim
    # pixels, so something like --vmax 0.3 is needed or the whole thing is near silent.
    approximate = lut is None

    print(legend(vmin, vmax, units), "\n")

    chunks, prev_mean = [], None
    for i, frame in enumerate(frames, 1):
        img = load_image(frame)
        if crop:
            img = crop_map(img, crop)
        values = decode_values(img, lut)
        text = describe_frame(values, vmin, vmax, units, lat_range, lon_range, approximate)
        if use_yolo:
            found = detect_objects(img)
            text += " Detected objects: " + (", ".join(f"{n} {k}" for k, n in found.items()) or "none") + "."
        if prev_mean is not None and not np.all(np.isnan(values)):
            delta = float(np.nanmean(values)) - prev_mean
            # Chrysanthos: percent too, for data that can't go negative (brightness, CO2...)
            pct = f" ({delta / prev_mean * 100:+.1f}%)" if vmin >= 0 and prev_mean > 0 else ""
            text += f" Change from previous frame: {delta:+.{decimals(vmin, vmax)}f}{(' ' + units) if units else ''}{pct}."
        if not np.all(np.isnan(values)):
            prev_mean = float(np.nanmean(values))
        print(f"Frame {i}: {text}")

        chunks.append(sonify_frame(normalise(values, vmin, vmax), seconds))

    audio = np.concatenate(chunks) if len(chunks) > 1 else chunks[0]
    audio = normalise_peak(audio)
    write_wav(out, audio)
    print(f"\nSaved {out}")
    if do_play:
        play(audio)
    return audio


def main():
    p = argparse.ArgumentParser(description="Sonify Earth visualization frames.")
    p.add_argument("frames", nargs="+", help="one or more frames, in time order")
    p.add_argument("--cmap", choices=sorted(CMAPS) + ["brightness"], default="viridis", help="colormap the map uses ('brightness' = no colormap, e.g. night lights)")
    p.add_argument("--colorbar", help="cropped image of the map's colorbar (overrides --cmap)")
    p.add_argument("--crop", type=int, nargs=4, metavar=("X", "Y", "W", "H"), help="pixel box of the map inside the image, drops titles/colorbar/borders")
    p.add_argument("--vmin", type=float, default=0.0)
    p.add_argument("--vmax", type=float, default=1.0)
    p.add_argument("--units", default="")
    p.add_argument("--seconds", type=float, default=8.0, help="seconds per frame")
    p.add_argument("--lat", type=float, nargs=2, default=(-90.0, 90.0), metavar=("MIN", "MAX"))
    p.add_argument("--lon", type=float, nargs=2, default=(-180.0, 180.0), metavar=("MIN", "MAX"))
    p.add_argument("--yolo", action="store_true", help="also run YOLO object detection")
    p.add_argument("--play", action="store_true")
    p.add_argument("--out", default="earth_jukebox.wav")
    a = p.parse_args()

    jukebox(a.frames, a.vmin, a.vmax, a.units, a.cmap, a.colorbar, a.seconds, tuple(a.lat), tuple(a.lon), a.yolo, a.out, a.play, crop=a.crop)


if __name__ == "__main__":
    main()