"""Install padded Voira launcher icon into Expo/Android brand paths."""
from pathlib import Path

from PIL import Image

SRC = Path(
    r"C:\Users\ahmet\.cursor\projects\c-Users-ahmet-shadowly\assets"
    r"\c__Users_ahmet_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"5f4f9d9775b05c43459f632785a8db65_images_ic_launcher-web-bdbc07ca-c02f-43b3-a6b0-38a74753efc6.png"
)
ROOT = Path(r"c:\Users\ahmet\shadowly\assets\brand")
ASSETS = Path(r"c:\Users\ahmet\shadowly\assets")
BG = (0x0D, 0x13, 0x34, 255)
BG_RGB = (0x0D, 0x13, 0x34)


def flatten_outer_mask(img: Image.Image) -> Image.Image:
    """Replace transparent / near-black outer fringe (rounded preview) with brand bg."""
    out = img.convert("RGBA")
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 20 or (r < 18 and g < 18 and b < 25):
                px[x, y] = BG
    return out


def main() -> None:
    src = flatten_outer_mask(Image.open(SRC))
    print("source", src.size)

    src512 = src.resize((512, 512), Image.Resampling.LANCZOS)
    canvas512 = Image.new("RGBA", (512, 512), BG)
    canvas512.alpha_composite(src512)
    icon1024 = canvas512.resize((1024, 1024), Image.Resampling.LANCZOS)

    # Keep original web reference
    Image.open(SRC).convert("RGBA").save(ROOT / "voira-launcher-web.png", "PNG")

    canvas512.save(ROOT / "voira-playstore-icon.png", "PNG")
    icon1024.save(ROOT / "voira-app-icon.png", "PNG")
    icon1024.save(ROOT / "voira-itunes-artwork.png", "PNG")
    icon1024.save(ROOT / "voira-adaptive-foreground.png", "PNG")
    icon1024.save(ASSETS / "icon.png", "PNG")
    canvas512.resize((48, 48), Image.Resampling.LANCZOS).save(ASSETS / "favicon.png", "PNG")
    (ROOT / "ICON_BG_COLOR.txt").write_text("#0D1334\n", encoding="utf-8")

    rgb = icon1024.convert("RGB")
    px = rgb.load()
    xs: list[int] = []
    ys: list[int] = []
    for y in range(0, 1024, 2):
        for x in range(0, 1024, 2):
            r, g, b = px[x, y]
            if not (
                abs(r - BG_RGB[0]) < 12
                and abs(g - BG_RGB[1]) < 12
                and abs(b - BG_RGB[2]) < 12
            ):
                xs.append(x)
                ys.append(y)
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    print(f"content bbox: ({minx},{miny})-({maxx},{maxy})")
    print(
        "padding LTRB: "
        f"{minx / 1024:.1%} {miny / 1024:.1%} {(1023 - maxx) / 1024:.1%} {(1023 - maxy) / 1024:.1%}"
    )
    print("updated brand icons from", SRC.name)

    res = Path(r"c:\Users\ahmet\shadowly\android\app\src\main\res")
    if not res.exists():
        print("no android/res — skip mipmap sync")
        return

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
        icon = icon1024.resize((launcher, launcher), Image.Resampling.LANCZOS)
        icon.save(d / "ic_launcher.webp", "WEBP", quality=95)
        icon.save(d / "ic_launcher_round.webp", "WEBP", quality=95)
        fg = icon1024.resize((foreground, foreground), Image.Resampling.LANCZOS)
        fg.save(d / "ic_launcher_foreground.webp", "WEBP", quality=95)
        print("mipmap", folder, launcher, foreground)


if __name__ == "__main__":
    main()
