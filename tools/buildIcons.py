"""Builds every icon, splash and store image from assets/brand/icon-source.png.

Run with: npm run build:icons   (needs Python 3 with Pillow)

The source is a 2048x2048 square drawing on cream paper. This script removes the generator's
corner watermark, shifts the paper to the app's exact background colour, centres the
artwork (key + fuse) and crops it for each target so nothing falls outside a launcher mask.
"""
import os
from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
P = lambda *parts: os.path.join(ROOT, *parts)

PAPER = (0xF4, 0xF1, 0xEA)  # colors.paper
INK = (0x1D, 0x1C, 0x1A)  # colors.ink
INK_SOFT = (0x4A, 0x47, 0x42)
FONT_DIR = P("node_modules", "@expo-google-fonts", "courier-prime")
BOLD = os.path.join(FONT_DIR, "700Bold", "CourierPrime_700Bold.ttf")
REGULAR = os.path.join(FONT_DIR, "400Regular", "CourierPrime_400Regular.ttf")


def load_clean():
    src = Image.open(P("assets", "brand", "icon-source.png")).convert("RGB")
    w, h = src.size
    # Paper colour: median of the border strip.
    border = [src.getpixel((x, y)) for x in range(0, w, 16) for y in (8, h - 9)]
    border += [src.getpixel((x, y)) for y in range(0, h, 16) for x in (8, w - 9)]
    bg = tuple(sorted(c[i] for c in border)[len(border) // 2] for i in range(3))
    # Watermark: the sparkle sits in the bottom-right corner, well clear of the art.
    ImageDraw.Draw(src).rectangle([int(w * 0.88), int(h * 0.88), w, h], fill=bg)
    # Shift paper to the app's background, then flatten paper grain to that exact colour
    # so crops can be padded seamlessly.
    shifted = Image.merge(
        "RGB",
        [ch.point(lambda v, d=PAPER[i] - bg[i]: max(0, min(255, v + d))) for i, ch in enumerate(src.split())],
    )
    diff = ImageChops.difference(shifted, Image.new("RGB", shifted.size, PAPER))
    r, g, b = diff.split()
    dist = ImageChops.lighter(ImageChops.lighter(r, g), b)
    paper_mask = dist.point(lambda v: 255 if v < 10 else 0)
    shifted.paste(PAPER, mask=paper_mask)
    content = dist.point(lambda v: 255 if v > 40 else 0)
    return shifted, content


def art_centre(content):
    """Centre that minimises the farthest artwork pixel (so a circle mask fits best)."""
    small = content.resize((256, 256), Image.NEAREST)
    scale = content.size[0] / 256
    pts = [(x, y) for y in range(256) for x in range(256) if small.getpixel((x, y))]
    left, top, right, bottom = small.getbbox()
    best = None
    for cx in range(left, right + 1, 2):
        for cy in range(top, bottom + 1, 2):
            r2 = max((x - cx) ** 2 + (y - cy) ** 2 for x, y in pts[::7])
            if best is None or r2 < best[0]:
                best = (r2, cx, cy)
    _, cx, cy = best
    radius = max(((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 for x, y in pts) + 1
    extent = max(max(abs(x - cx), abs(y - cy)) for x, y in pts) + 1
    return cx * scale, cy * scale, radius * scale, extent * scale


def crop(img, cx, cy, side, size):
    """A `side`-pixel square around (cx, cy), padded with paper, resized to `size`."""
    side = int(round(side))
    canvas = Image.new("RGB", (side, side), PAPER)
    canvas.paste(img, (int(round(side / 2 - cx)), int(round(side / 2 - cy))))
    return canvas.resize((size, size), Image.LANCZOS)


def banner(art, width, height, title_px, tag_px):
    """Store / social banner: the icon art on the left, name and tagline on the right."""
    out = Image.new("RGB", (width, height), PAPER)
    s = int(height * 0.8)
    out.paste(art.resize((s, s), Image.LANCZOS), (int(width * 0.06), (height - s) // 2))
    d = ImageDraw.Draw(out)
    x = int(width * 0.06) + s + int(width * 0.04)
    title = ImageFont.truetype(BOLD, title_px)
    tag = ImageFont.truetype(REGULAR, tag_px)
    y = height // 2 - title_px
    d.text((x, y), "word fuse", font=title, fill=INK)
    d.text((x, y + int(title_px * 1.25)), "type the word before", font=tag, fill=INK_SOFT)
    d.text((x, y + int(title_px * 1.25 + tag_px * 1.35)), "the fuse burns out.", font=tag, fill=INK_SOFT)
    return out


def main():
    img, content = load_clean()
    cx, cy, radius, extent = art_centre(content)

    icon_side = 2 * extent / 0.78  # art spans 78% of a square icon
    adaptive_side = radius / 0.31  # inside Android's 66dp safe circle (of 108dp)
    tight_side = 2 * extent / 0.94

    icon = crop(img, cx, cy, icon_side, 1024)
    tight = crop(img, cx, cy, tight_side, 1024)
    adaptive = crop(img, cx, cy, adaptive_side, 1024)

    images = P("assets", "images")
    icon.save(os.path.join(images, "icon.png"), optimize=True)
    adaptive.save(os.path.join(images, "adaptive-icon.png"), optimize=True)
    tight.save(os.path.join(images, "splash.png"), optimize=True)

    pub = P("public")
    icon.resize((512, 512), Image.LANCZOS).save(os.path.join(pub, "icon.png"), optimize=True)
    icon.resize((192, 192), Image.LANCZOS).save(os.path.join(pub, "icon-192.png"), optimize=True)
    icon.resize((180, 180), Image.LANCZOS).save(os.path.join(pub, "apple-touch-icon.png"), optimize=True)
    icon.resize((48, 48), Image.LANCZOS).save(os.path.join(pub, "favicon.png"), optimize=True)
    adaptive.resize((512, 512), Image.LANCZOS).save(os.path.join(pub, "icon-maskable-512.png"), optimize=True)
    banner(tight, 1200, 630, 96, 34).save(os.path.join(pub, "og-image.png"), optimize=True)

    store = P("fastlane", "metadata", "android", "en-US", "images")
    os.makedirs(store, exist_ok=True)
    icon.resize((512, 512), Image.LANCZOS).save(os.path.join(store, "icon.png"), optimize=True)
    banner(tight, 1024, 500, 80, 28).save(os.path.join(store, "featureGraphic.png"), optimize=True)
    print(f"art centre ({cx:.0f}, {cy:.0f}), radius {radius:.0f}, extent {extent:.0f}")


if __name__ == "__main__":
    main()
