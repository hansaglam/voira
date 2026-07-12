from PIL import Image, ImageDraw
from pathlib import Path
import shutil

ROOT = Path(r"c:\Users\ahmet\shadowly\assets\brand")
ROOT.mkdir(parents=True, exist_ok=True)

SRC_UPLOADED = Path(
    r"C:\Users\ahmet\.cursor\projects\c-Users-ahmet-shadowly\assets"
    r"\c__Users_ahmet_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"5f4f9d9775b05c43459f632785a8db65_images_Copilot_20260712_045020-99adbb62-e323-4e11-a9ca-0eb149cd8718.png"
)

SRC = ROOT / "voira-logo-source.png"
shutil.copyfile(SRC_UPLOADED, SRC)

BG = (7, 8, 18, 255)  # #070812

img = Image.open(SRC).convert("RGBA")
w, h = img.size
pixels = img.load()

out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
out_px = out.load()
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if r < 28 and g < 28 and b < 28:
            out_px[x, y] = (0, 0, 0, 0)
        else:
            out_px[x, y] = (r, g, b, a)

bbox = out.getbbox()
if bbox:
    pad = int(min(w, h) * 0.04)
    left = max(0, bbox[0] - pad)
    top = max(0, bbox[1] - pad)
    right = min(w, bbox[2] + pad)
    bottom = min(h, bbox[3] + pad)
    out = out.crop((left, top, right, bottom))

logo_path = ROOT / "voira-logo.png"
out.save(logo_path, "PNG")
print("saved", logo_path, out.size)

splash_size = 1024
splash = Image.new("RGBA", (splash_size, splash_size), BG)
logo_w = int(splash_size * 0.42)
ratio = logo_w / out.width
logo_h = int(out.height * ratio)
logo_resized = out.resize((logo_w, logo_h), Image.Resampling.LANCZOS)
ox = (splash_size - logo_w) // 2
oy = (splash_size - logo_h) // 2
splash.paste(logo_resized, (ox, oy), logo_resized)
splash_path = ROOT / "voira-splash.png"
splash.convert("RGB").save(splash_path, "PNG")
print("saved", splash_path)

icon_size = 1024
icon = Image.new("RGBA", (icon_size, icon_size), (0, 0, 0, 0))
radius = int(icon_size * 0.22)
draw = ImageDraw.Draw(icon)
draw.rounded_rectangle((0, 0, icon_size - 1, icon_size - 1), radius=radius, fill=BG)
mark_w = int(icon_size * 0.62)
ratio = mark_w / out.width
mark_h = int(out.height * ratio)
mark = out.resize((mark_w, mark_h), Image.Resampling.LANCZOS)
mx = (icon_size - mark_w) // 2
my = (icon_size - mark_h) // 2
icon.paste(mark, (mx, my), mark)
icon_path = ROOT / "voira-app-icon.png"
icon.save(icon_path, "PNG")
print("saved", icon_path)

fg_size = 1024
fg = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
fg_logo_w = int(fg_size * 0.58)
ratio = fg_logo_w / out.width
fg_logo_h = int(out.height * ratio)
fg_logo = out.resize((fg_logo_w, fg_logo_h), Image.Resampling.LANCZOS)
fx = (fg_size - fg_logo_w) // 2
fy = (fg_size - fg_logo_h) // 2
fg.paste(fg_logo, (fx, fy), fg_logo)
fg_path = ROOT / "voira-adaptive-foreground.png"
fg.save(fg_path, "PNG")
print("saved", fg_path)

print("done")
