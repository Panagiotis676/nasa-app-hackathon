import numpy as np
import math

def score_to_freq(score, base=220):
    # score from 0 to 100
    # map to a range of frequencies
    return base * (2 ** ((score - 50) / 12))

def score_to_volume(score):
    return score / 100.0

def synth_note(freq, duration=0.5, sr=44100, volume=0.5):
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    wave = volume * np.sin(2 * np.pi * freq * t)
    return wave

# example: average scores from image
avg = {
    "red": 20,
    "green": 80,
    "blue": 60
}

bass = synth_note(
    score_to_freq(avg["red"], base=110),
    duration=0.6,
    volume=score_to_volume(avg["red"])
)

melody = synth_note(
    score_to_freq(avg["green"], base=220),
    duration=0.4,
    volume=score_to_volume(avg["green"])
)

harmony = synth_note(
    score_to_freq(avg["blue"], base=440),
    duration=0.5,
    volume=score_to_volume(avg["blue"])
)

sound = bass + melody + harmony