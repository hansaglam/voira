"""Install the latest Voira Play Store icon into Expo/Android brand paths."""
from pathlib import Path
import shutil
from PIL import Image

ROOT = Path(r"c:\Users\ahmet\shadowly\assets\brand")
ASSETS = Path(r"c:\Users\ahmet\shadowly\assets")
SRC = Path(
    r"C:\Users\ahmet\.cursor\projects\c-Users-ahmet-shadowly\assets"
    r"\c__Users_ahmet_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"5f4f9d9775b05c43459f632785a8db65_images_ic_launcher-web-bdbc07ca-c02f-43b3-a6b0-38a74753efc6.png"
)

play = Image.open(SRC).convert("RGBA")
# Keep original 512 for Play listing
play.save(ROOT / "voira-playstore-icon.png", "PNG")

# Expo / iOS main icon: 1024
icon1024 = play.resize((1024, 1024), Image.Resampling.LANCZOS)
icon1024.save(ROOT / "voira-app-icon.png", "PNG")
icon1024.save(ROOT / "voira-itunes-artwork.png", "PNG")
icon1024.save(ROOT / "voira-adaptive-foreground.png", "PNG")
icon1024.save(ASSETS / "icon.png", "PNG")

# Favicon
play.resize((48, 48), Image.Resampling.LANCZOS).save(ASSETS / "favicon.png", "PNG")

# Sample bg for adaptive/splash
corner = icon1024.getpixel((8, 8))
bg_hex = "#{:02X}{:02X}{:02X}".format(corner[0], corner[1], corner[2])
(ROOT / "ICON_BG_COLOR.txt").write_text(bg_hex + "\n", encoding="utf-8")
print("bg", bg_hex)
print("updated app icon assets from", SRC.name)
