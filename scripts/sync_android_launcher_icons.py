from PIL import Image
from pathlib import Path

src = Image.open(r"c:\Users\ahmet\shadowly\assets\brand\voira-app-icon.png").convert("RGBA")
res = Path(r"c:\Users\ahmet\shadowly\android\app\src\main\res")

sizes = {
    "mipmap-mdpi": (48, 108),
    "mipmap-hdpi": (72, 162),
    "mipmap-xhdpi": (96, 216),
    "mipmap-xxhdpi": (144, 324),
    "mipmap-xxxhdpi": (192, 432),
}

for folder, (launcher, foreground) in sizes.items():
    d = res / folder
    d.mkdir(parents=True, exist_ok=True)
    icon = src.resize((launcher, launcher), Image.Resampling.LANCZOS)
    icon.save(d / "ic_launcher.webp", "WEBP", quality=95)
    icon.save(d / "ic_launcher_round.webp", "WEBP", quality=95)
    fg = src.resize((foreground, foreground), Image.Resampling.LANCZOS)
    fg.save(d / "ic_launcher_foreground.webp", "WEBP", quality=95)
    print(folder, launcher, foreground)

print("android mipmaps updated")
