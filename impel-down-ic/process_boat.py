import os
from rembg import remove
from PIL import Image

in_path = "/home/pankaj-garg/.gemini/antigravity-ide/brain/fc1621a5-8f31-4315-9be1-24f4b51643cd/.user_uploaded/media_1790590609485.png"
out_path = "/home/pankaj-garg/Documents/Projects/One-piece/impel-down-ic/client/public/images/reporter/submit_boat.png"

input_img = Image.open(in_path)
output_img = remove(input_img)
output_img.save(out_path)
print("Done processing boat icon.")
