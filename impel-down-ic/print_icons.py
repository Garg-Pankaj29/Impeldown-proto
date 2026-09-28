import os
from PIL import Image

chars = " .:-=+*#%@"
icons_dir = "client/public/images/extracted_icons"
for i in range(33):
    path = f"{icons_dir}/icon_{i}.png"
    if not os.path.exists(path): continue
    img = Image.open(path).convert("RGBA")
    img = img.resize((32, 16))
    print(f"\n--- icon_{i}.png ---")
    for y in range(16):
        line = ""
        for x in range(32):
            r, g, b, a = img.getpixel((x, y))
            if a < 50:
                line += " "
            else:
                brightness = int(0.299*r + 0.587*g + 0.114*b)
                idx = int(brightness / 255 * (len(chars)-1))
                line += chars[idx]
        print(line)
