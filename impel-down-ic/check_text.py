from PIL import Image
import sys

try:
    img = Image.open('client/public/images/straw_hats_bg.png').convert('RGB')
except Exception as e:
    print("Error opening:", e)
    sys.exit(1)
    
# Let's check a column of pixels in the left-center where "Hey Reporter!" would be
# If the image is sky, it should be mostly blue/white. If there is dark blue text (#1e3a8a), we will find it.
found_text = False
for y in range(img.height // 4, img.height // 2):
    for x in range(img.width // 4, img.width // 2):
        r, g, b = img.getpixel((x, y))
        # Dark blue check
        if r < 50 and g < 70 and b > 100:
            found_text = True
            break
    if found_text:
        break

if found_text:
    print("YES_TEXT_FOUND")
else:
    print("NO_TEXT_FOUND")
