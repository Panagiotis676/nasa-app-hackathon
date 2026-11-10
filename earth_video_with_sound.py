from pathlib import Path
import os
import urllib.request
import math
import time
import threading
import numpy as np
import cv2

BASE_DIR = Path(__file__).resolve().parent
VIDEO_PATH = BASE_DIR / "video_1.mp4"
AUDIO_PATH = BASE_DIR / "earth_sound.wav"

EARTH_VIDEO_URL = os.environ.get(
    "EARTH_VIDEO_URL",
    "https://images-assets.nasa.gov/video/iss050/iss050-E-20448/iss050-E-20448~orig.mp4",
)


def download_video(url: str, dest: Path):
    """Download a video if the URL is available."""
    try:
        if dest.exists() and is_valid_video(dest):
            return True
        if dest.exists():
            print(f"Removing incomplete video file: {dest}")
            dest.unlink()
        print(f"Downloading Earth video from: {url}")
        urllib.request.urlretrieve(url, dest)
        if not is_valid_video(dest):
            print(f"Downloaded video is invalid: {dest}")
            if dest.exists():
                dest.unlink()
            return False
        print(f"Saved video to: {dest}")
        return True
    except Exception as exc:
        print(f"Could not download remote video: {exc}")
        if dest.exists():
            try:
                dest.unlink()
            except OSError:
                pass
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


MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11]


def midi_to_freq(midi):
    return 440.0 * (2 ** ((midi - 69) / 12.0))


def color_to_midi(scores):
    """Map average RGB values into a musical note in a pleasant scale."""
    brightness = (scores["red"] + scores["green"] + scores["blue"]) / 3.0
    root = int(np.clip((scores["blue"] / 100.0) * 12.0, 0, 11))
    degree = int(np.clip((scores["green"] / 100.0) * (len(MAJOR_SCALE) - 1), 0, len(MAJOR_SCALE) - 1))
    midi = 48 + root + MAJOR_SCALE[degree]
    midi += int((scores["red"] - 50.0) / 12.0)
    return int(np.clip(midi, 36, 84))


# --- melodic opera-like audio synthesis ---
OPERA_SCALE = [0, 2, 4, 5, 7, 9, 11, 12]
OPERA_LEADS = [60, 62, 64, 67, 69, 72]


def color_to_opera_melody(scores):
    """Map frame color to a more melodic, singable note."""
    red = scores["red"]
    green = scores["green"]
    blue = scores["blue"]

    note_bias = int(np.clip((blue / 100.0) * 12, 0, 11))
    scale_index = int(np.clip((green / 100.0) * (len(OPERA_SCALE) - 1), 0, len(OPERA_SCALE) - 1))
    octave = 4 if red < 50 else 5
    melody_note = 48 + octave * 12 + OPERA_SCALE[scale_index] + note_bias

    if red > 75:
        melody_note += 2
    if blue > 80:
        melody_note += 4

    return int(np.clip(melody_note, 45, 84))


def make_audio_from_video(video_path: Path, output_path: Path, duration_seconds: float = None):
    """Generate a more melodic, opera-like soundtrack from the video colors."""
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
    note_frames = max(4, int(fps * 0.45))
    audio = np.zeros(int(sample_rate * max(1.0, len(frames) / fps) + 1), dtype=np.float32)

    frame_index = 0
    while frame_index < len(frames):
        chunk = frames[frame_index:frame_index + note_frames]
        if not chunk:
            break

        avg_scores = {"red": 0.0, "green": 0.0, "blue": 0.0}
        for frame in chunk:
            scores = frame_to_scores(frame)
            for key in avg_scores:
                avg_scores[key] += scores[key]

        for key in avg_scores:
            avg_scores[key] /= len(chunk)

        melody_midi = color_to_opera_melody(avg_scores)
        harmony_midi = melody_midi + 7
        bass_midi = melody_midi - 12

        note_duration = 0.55
        start = int((frame_index / fps) * sample_rate)
        end = min(len(audio), start + int(note_duration * sample_rate))
        if start >= len(audio):
            break

        t = np.arange(end - start, dtype=np.float32) / sample_rate
        attack = np.linspace(0.0, 1.0, len(t), endpoint=False)
        release = np.linspace(1.0, 0.0, len(t), endpoint=False)
        envelope = np.minimum(attack, release)

        for midi_note in [melody_midi, harmony_midi, bass_midi]:
            freq = midi_to_freq(midi_note)
            volume = 0.12 if midi_note == bass_midi else 0.18
            if midi_note == melody_midi:
                volume += 0.08
            tone = volume * envelope * np.sin(2 * np.pi * freq * t)
            audio[start:end] += tone

        frame_index += note_frames

    max_amp = np.max(np.abs(audio))
    if max_amp > 0:
        audio = audio / max_amp * 0.70

    audio = np.clip(audio, -1.0, 1.0)
    import scipy.io.wavfile as wavfile
    wavfile.write(str(output_path), sample_rate, (audio * 32767).astype(np.int16))
    print(f"Generated melodic opera-like audio: {output_path}")


# --- synced playback ---

def play_video_with_audio(video_path: Path, audio_path: Path):
    """Play the video and audio together in sync using separate threads."""
    import sounddevice as sd
    import scipy.io.wavfile as wavfile

    rate, data = wavfile.read(str(audio_path))
    if data.dtype.kind == 'i':
        audio = data.astype(np.float32) / 32768.0
    else:
        audio = data.astype(np.float32)

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video for playback: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 24.0

    stop_event = threading.Event()
    video_done = threading.Event()

    def play_audio_thread():
        stream = sd.OutputStream(samplerate=rate, channels=1)
        stream.start()
        try:
            sd.play(audio, samplerate=rate)
            while sd.get_stream().active:
                if stop_event.is_set():
                    break
                time.sleep(0.02)
        finally:
            stream.stop()
            stream.close()

    def play_video_thread():
        try:
            wait_ms = int(1000 / max(fps, 1))
            while True:
                if stop_event.is_set():
                    break
                ok, frame = cap.read()
                if not ok:
                    video_done.set()
                    break
                cv2.imshow("Earth video + opera-like score", frame)
                if cv2.waitKey(wait_ms) & 0xFF == ord('q'):
                    stop_event.set()
                    break
        finally:
            cap.release()
            cv2.destroyAllWindows()

    audio_thread = threading.Thread(target=play_audio_thread, daemon=True)
    video_thread = threading.Thread(target=play_video_thread, daemon=True)

    audio_thread.start()
    video_thread.start()

    try:
        while not stop_event.is_set() and not video_done.is_set():
            time.sleep(0.02)
    finally:
        stop_event.set()
        if audio_thread.is_alive():
            audio_thread.join(timeout=1)
        if video_thread.is_alive():
            video_thread.join(timeout=1)


def is_valid_video(path: Path):
    """Return True only if the file exists and can actually be opened as a video."""
    if not path.exists() or path.stat().st_size == 0:
        return False
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        return False
    ok, _ = cap.read()
    cap.release()
    return ok


def main():
    if not is_valid_video(VIDEO_PATH):
        if VIDEO_PATH.exists():
            print(f"Removing invalid video file: {VIDEO_PATH}")
            VIDEO_PATH.unlink()
        if not download_video(EARTH_VIDEO_URL, VIDEO_PATH):
            generate_earth_like_video(VIDEO_PATH, fps=24, seconds=6)
    
    if not is_valid_video(VIDEO_PATH):
        raise FileNotFoundError("No valid Earth video was created or downloaded")

    make_audio_from_video(VIDEO_PATH, AUDIO_PATH)
    play_video_with_audio(VIDEO_PATH, AUDIO_PATH)


if __name__ == "__main__":
    main()

