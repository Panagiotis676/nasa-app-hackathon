from pathlib import Path
import os
import urllib.request
import math
import numpy as np
import cv2

BASE_DIR = Path(__file__).resolve().parent
VIDEO_PATH = BASE_DIR / "earth_video.mp4"
AUDIO_PATH = BASE_DIR / "earth_sound.wav"

EARTH_VIDEO_URL = os.environ.get(
    "EARTH_VIDEO_URL",
    "https://images-assets.nasa.gov/video/iss050/iss050-E-20448/iss050-E-20448~orig.mp4",
)


def download_video(url: str, dest: Path):
    """Download a video if the URL is available."""
    try:
        if dest.exists():
            return True
        print(f"Downloading Earth video from: {url}")
        urllib.request.urlretrieve(url, dest)
        print(f"Saved video to: {dest}")
        return True
    except Exception as exc:
        print(f"Could not download remote video: {exc}")
        return False


def generate_earth_like_video(dest: Path, fps=24, seconds=6, width=640, height=360):
    """Fallback generator: creates a simple blue/green Earth-like animation."""
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(dest), fourcc, fps, (width, height))
    if not writer.isOpened():
        raise RuntimeError("Video writer failed to open")

    center_x = width // 2
    center_y = height // 2
    radius = min(width, height) // 3
    frame_count = fps * seconds

    for i in range(frame_count):
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        t = i / max(1, frame_count)

        # Simple animated Earth-like globe and clouds
        for y in range(height):
            for x in range(width):
                dx = x - center_x
                dy = y - center_y
                dist = math.sqrt(dx * dx + dy * dy)
                if dist <= radius:
                    blue = 180 + int(50 * math.sin((x + i) * 0.06))
                    green = 120 + int(80 * math.cos((y + i) * 0.04))
                    red = 30 + int(30 * math.sin((x + i) * 0.03))
                    frame[y, x] = (blue, green, red)

        # Add some moving cloud bands
        for y in range(height):
            wave = int(30 * math.sin((y * 0.12) + (i * 0.12)))
            for x in range(width):
                if abs(x - center_x) < radius + 20:
                    if (x + y + wave) % 40 < 10:
                        frame[y, x] = np.clip(frame[y, x].astype(int) + np.array([20, 15, 5], dtype=int), 0, 255).astype(np.uint8)

        # Add a thin atmosphere glow
        glow = cv2.circle(np.zeros_like(frame), (center_x, center_y), radius + 8, (200, 200, 255), 1)
        frame = cv2.add(frame, glow)
        writer.write(frame)

    writer.release()
    print(f"Generated fallback Earth-like video: {dest}")


def frame_to_scores(frame_bgr):
    """Convert BGR frame to average RGB scores from 0..100."""
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    r = frame_rgb[:, :, 0].astype(float)
    g = frame_rgb[:, :, 1].astype(float)
    b = frame_rgb[:, :, 2].astype(float)

    avg_r = float(np.mean(r) / 255.0 * 100.0)
    avg_g = float(np.mean(g) / 255.0 * 100.0)
    avg_b = float(np.mean(b) / 255.0 * 100.0)
    return {"red": avg_r, "green": avg_g, "blue": avg_b}


def score_to_freq(score, base=220.0):
    # 0..100 maps to a musical range around the base frequency.
    return base * (2 ** ((score - 50.0) / 12.0))


def make_audio_from_video(video_path: Path, output_path: Path, duration_seconds: float = None):
    """Generate sound from each frame's average color score"""
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 24.0

    frames = []
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        frames.append(frame)

    cap.release()

    if not frames:
        raise RuntimeError("Video had no frames to process")

    sample_rate = 44100
    total_samples = int(sample_rate * (len(frames) / fps))
    audio = np.zeros(total_samples, dtype=np.float32)

    for i, frame in enumerate(frames):
        scores = frame_to_scores(frame)
        t0 = int(i / fps * sample_rate)
        t1 = int((i + 1) / fps * sample_rate)
        if t0 >= len(audio):
            break
        if t1 > len(audio):
            t1 = len(audio)

        # Each frame contributes a tone based on its dominant color score.
        red_freq = score_to_freq(scores["red"], base=110)
        green_freq = score_to_freq(scores["green"], base=220)
        blue_freq = score_to_freq(scores["blue"], base=440)

        tone_len = max(1, t1 - t0)
        t = np.linspace(0, tone_len / sample_rate, tone_len, endpoint=False)

        red_wave = 0.25 * np.sin(2 * np.pi * red_freq * t)
        green_wave = 0.25 * np.sin(2 * np.pi * green_freq * t)
        blue_wave = 0.25 * np.sin(2 * np.pi * blue_freq * t)

        audio[t0:t1] += (red_wave + green_wave + blue_wave)

    # Normalize audio to safe amplitude
    max_amp = np.max(np.abs(audio))
    if max_amp > 0:
        audio = audio / max_amp * 0.6

    audio = np.clip(audio, -1.0, 1.0)

    # Save audio as WAV
    import scipy.io.wavfile as wavfile
    wavfile.write(str(output_path), sample_rate, (audio * 32767).astype(np.int16))
    print(f"Generated audio: {output_path}")


def play_video_with_audio(video_path: Path, audio_path: Path):
    """Display video using OpenCV while playing the generated sound."""
    import sounddevice as sd
    import scipy.io.wavfile as wavfile

    rate, data = wavfile.read(str(audio_path))
    if data.dtype.kind == 'i':
        data = data.astype(np.float32) / 32768.0
    else:
        data = data.astype(np.float32)

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video for playback: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    wait_ms = int(1000 / max(fps, 1))

    stream = sd.OutputStream(samplerate=rate, channels=1)
    stream.start()

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            cv2.imshow("Earth video + generated sound", frame)
            if cv2.waitKey(wait_ms) & 0xFF == ord('q'):
                break

        # Play audio after the video has started, in a simple loop
        sd.play(data, samplerate=rate)
        sd.wait()
    finally:
        stream.stop()
        stream.close()
        cap.release()
        cv2.destroyAllWindows()


def main():
    if not VIDEO_PATH.exists():
        if not download_video(EARTH_VIDEO_URL, VIDEO_PATH):
            generate_earth_like_video(VIDEO_PATH, fps=24, seconds=6)
    
    if not VIDEO_PATH.exists():
        raise FileNotFoundError("No Earth video was created or downloaded")

    make_audio_from_video(VIDEO_PATH, AUDIO_PATH)
    play_video_with_audio(VIDEO_PATH, AUDIO_PATH)


if __name__ == "__main__":
    main()

