from PIL import Image
import numpy as np

img = Image.open('ui_images/straw_hats_bg.png')
# Let's crop the center where the text would be and save it to a temporary file to see it
crop = img.crop((200, 50, 800, 250))
crop.save('scratch/straw_hats_text_check.png')
print("Cropped text region saved to scratch/straw_hats_text_check.png")
