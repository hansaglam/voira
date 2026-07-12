"""Install official Voira app icon assets into assets/brand and Expo paths."""
from pathlib import Path
import shutil
from PIL import Image

ROOT = Path(r"c:\Users\ahmet\shadowly\assets\brand")
ROOT.mkdir(parents=True, exist_ok=True)

UPLOADS = Path(r"C:\Users\ahmet\.cursor\projects\c-Users-ahmet-shadowly\assets")

SRC = {
    "playstore": UPLOADS
    / "c__Users_ahmet_AppData_Roaming_Cursor_User_workspaceStorage_5f4f9d9775b05c43459f632785a8db65_images_playstore-icon-7576690b-c8a4-445f-b197-027398f23457.png",
    "launcher_web": UPLOADS
    / "c__Users_ahmet_AppData_Roaming_Cursor_User_workspaceStorage_5f4f9d9775b05c43459f632785a8db65_images_ic_launcher-web-dd43d076-9263-41ab-8f36-cb646e3a63d8.png",
    "itunes": UPLOADS
    / "c__Users_ahmet_AppData_Roaming_Cursor_User_workspaceStorage_5f4f9d9775b05c43459f632785a8db65_images_iTunesArtwork_2x-daa5b9e7-24c9-4db8-9d41-74bed8ecd154.png",
}

# Keep originals with clear names
shutil.copyfile(SRC["playstore"], ROOT / "voira-playstore-icon.png")
shutil.copyfile(SRC["launcher_web"], ROOT / "voira-launcher-web.png")
shutil.copyfile(SRC["itunes"], ROOT / "voira-itunes-artwork.png")

# Main Expo / iOS icon: 1024x1024 full-bleed square
itunes = Image.open(SRC["itunes"]).convert("RGBA")
if itunes.size != (1024, 1024):
    itunes = itunes.resize((1024, 1024), Image.Resampling.LANCZOS)
itunes.save(ROOT / "voira-app-icon.png", "PNG")
print("voira-app-icon.png", itunes.size)

# Also overwrite legacy assets/icon.png so any fallback points to Voira
assets_root = ROOT.parent
itunes.save(assets_root / "icon.png", "PNG")
print("assets/icon.png updated")

# Adaptive foreground: use full-bleed square (OS applies mask).
# Sample corner pixel for matching backgroundColor.
corner = itunes.getpixel((8, 8))
bg_hex = "#{:02X}{:02X}{:02X}".format(corner[0], corner[1], corner[2])
print("sampled icon bg", bg_hex, corner)

itunes.save(ROOT / "voira-adaptive-foreground.png", "PNG")

# Play Store listing asset at 512 (official upload size)
play = Image.open(SRC["playstore"]).convert("RGBA")
if play.size != (512, 512):
    play = play.resize((512, 512), Image.Resampling.LANCZOS)
play.save(ROOT / "voira-playstore-icon.png", "PNG")
print("voira-playstore-icon.png", play.size)

# Favicon from playstore (smaller)
favicon = play.resize((48, 48), Image.Resampling.LANCZOS)
favicon.save(assets_root / "favicon.png", "PNG")
print("favicon.png updated")

# Write bg color hint for app.json
(ROOT / "ICON_BG_COLOR.txt").write_text(bg_hex + "\n", encoding="utf-8")
print("done")
