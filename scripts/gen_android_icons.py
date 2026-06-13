#!/usr/bin/env python3
"""Generate Android launcher icons, adaptive-icon layers, and splash screens
for MediSport from the Claude Design brand package.

Run on the VM:  python3 scripts/gen_android_icons.py
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "scripts", "brand_assets")
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")

# Square launcher icon (legacy + round) densities
MIPMAP = {
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192,
}
# Adaptive icon foreground/background/monochrome densities (108dp canvas)
ADAPTIVE = {
    "mdpi": 108,
    "hdpi": 162,
    "xhdpi": 216,
    "xxhdpi": 324,
    "xxxhdpi": 432,
}

def load(name):
    return Image.open(os.path.join(ASSETS, name)).convert("RGBA")

def save(img, density, filename):
    d = os.path.join(RES, f"mipmap-{density}")
    os.makedirs(d, exist_ok=True)
    img.save(os.path.join(d, filename))

def round_mask(size):
    from PIL import ImageDraw
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).ellipse((0, 0, size, size), fill=255)
    return m

def main():
    icon = load("icon-512.png")          # full square launcher
    fg = load("android-adaptive-foreground.png")  # 432 safe-zone foreground
    bg = load("android-adaptive-background.png")  # 432 background
    mono = load("android-adaptive-monochrome.png")

    for density, size in MIPMAP.items():
        sq = icon.resize((size, size), Image.LANCZOS)
        save(sq, density, "ic_launcher.png")
        # round variant
        rnd = sq.copy()
        rnd.putalpha(round_mask(size))
        save(rnd, density, "ic_launcher_round.png")

    for density, size in ADAPTIVE.items():
        save(fg.resize((size, size), Image.LANCZOS), density, "ic_launcher_foreground.png")
        save(bg.resize((size, size), Image.LANCZOS), density, "ic_launcher_background.png")
        save(mono.resize((size, size), Image.LANCZOS), density, "ic_launcher_monochrome.png")

    # ---- Splash screens (port/land, all densities) ----
    # Use the dark splash as the universal splash (matches dark theme + status bar)
    splash = load("splash-dark.png")  # 1080x2340
    # Generate centered splash on solid bg for each port/land density bucket.
    # Capacitor uses drawable-{port,land}-{density}/splash.png
    SPLASH = {
        "mdpi": (320, 480),
        "hdpi": (480, 800),
        "xhdpi": (720, 1280),
        "xxhdpi": (960, 1600),
        "xxxhdpi": (1280, 1920),
    }
    BG = (15, 23, 42, 255)  # #0F172A
    # The runner from the splash; crop center logo region for scaling
    for density, (w, h) in SPLASH.items():
        for orient, (ow, oh) in (("port", (w, h)), ("land", (h, w))):
            canvas = Image.new("RGBA", (ow, oh), BG)
            # scale splash to cover
            scale = max(ow / splash.width, oh / splash.height)
            nw, nh = int(splash.width * scale), int(splash.height * scale)
            s = splash.resize((nw, nh), Image.LANCZOS)
            canvas.paste(s, ((ow - nw) // 2, (oh - nh) // 2), s)
            d = os.path.join(RES, f"drawable-{orient}-{density}")
            os.makedirs(d, exist_ok=True)
            canvas.convert("RGB").save(os.path.join(d, "splash.png"))
    # base drawable/splash.png (used by AppTheme.NoActionBarLaunch)
    base = Image.new("RGBA", (1080, 1920), BG)
    scale = max(1080 / splash.width, 1920 / splash.height)
    nw, nh = int(splash.width * scale), int(splash.height * scale)
    s = splash.resize((nw, nh), Image.LANCZOS)
    base.paste(s, ((1080 - nw) // 2, (1920 - nh) // 2), s)
    base.convert("RGB").save(os.path.join(RES, "drawable", "splash.png"))
    base.convert("RGB").save(os.path.join(RES, "drawable-port-xxhdpi", "splash.png"))

    print("Android icons + splash generated successfully.")

if __name__ == "__main__":
    main()
