from PIL import Image
img = Image.open('ui_images/straw_hats_bg.png').convert('RGB')
print(f"Top-left pixel: {img.getpixel((0,0))}")
