from PIL import Image
from pathlib import Path

image_path = Path(r"C:\Users\User\OneDrive - Cyprus University of Technology\Desktop\projects\omilos\nasa-app-hackathon\img.png")

def channel_score(value):
    return round((value / 255) * 100, 2)


def score_image(image_path):
    img = Image.open(image_path).convert("RGB")
    width, height = img.size

    # per-pixel scores
    pixel_scores = []
    for y in range(height):
        row = []
        for x in range(width):
            r, g, b = img.getpixel((x, y))
            row.append({
                "red": channel_score(r),
                "green": channel_score(g),
                "blue": channel_score(b),
            })
        pixel_scores.append(row)

    return pixel_scores


def average_image_scores(image_path):
    img = Image.open(image_path).convert("RGB")

    total_r = 0
    total_g = 0
    total_b = 0
    count = 0

    for r, g, b in img.getdata():
        total_r += r
        total_g += g
        total_b += b
        count += 1

    red = (total_r / (count * 255)) * 100
    green = (total_g / (count * 255)) * 100
    blue = (total_b / (count * 255)) * 100

    return {
        "red": round(red, 2),
        "green": round(green, 2),
        "blue": round(blue, 2),
    }


# example usage
scores = score_image(image_path)
avg = average_image_scores(image_path)

print("Per-pixel scores:", scores[0][0])
print("Average image scores:", avg)