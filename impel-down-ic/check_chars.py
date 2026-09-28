from PIL import Image

img = Image.open('client/public/images/straw_hats_bg.png').convert('RGB')
width, height = img.size

# Sky is typically around (135, 206, 235) or similar light blue.
# We will check the bottom half of the image (where characters run)
# and find the first pixel from the left that is NOT sky or sand.
# Actually, let's just find the leftmost pixel that is dark (e.g. character outline)

leftmost = width
for y in range(height // 2, height):
    for x in range(width):
        r, g, b = img.getpixel((x, y))
        # Check for dark pixels (outlines/shadows)
        if r < 80 and g < 80 and b < 80:
            if x < leftmost:
                leftmost = x
                break

print(f"Leftmost dark pixel is at X = {leftmost}")
