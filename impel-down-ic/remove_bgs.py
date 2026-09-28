import os
from rembg import remove
from PIL import Image
import glob

# Images to process
images = {
    "avatar_reporter_1790586415880.jpg": "avatar_reporter.png",
    "flag_post_1790586428181.jpg": "flag_post.png",
    "icon_track_1790586475606.jpg": "icon_track_reports.png",
    "icon_news_1790586489112.jpg": "icon_announcements.png",
    "seagull_1790586501613.jpg": "seagull.png",
    "form_hat_1790586516777.jpg": "form_hat.png",
    "form_ship_1790586529776.jpg": "form_ship_btn.png"
}

input_dir = "/home/pankaj-garg/.gemini/antigravity-ide/brain/fc1621a5-8f31-4315-9be1-24f4b51643cd"
output_dir = "/home/pankaj-garg/Documents/Projects/One-piece/impel-down-ic/client/public/images/reporter"

print("Starting background removal...")
for src_name, dst_name in images.items():
    in_path = os.path.join(input_dir, src_name)
    out_path = os.path.join(output_dir, dst_name)
    if os.path.exists(in_path):
        print(f"Processing {src_name}...")
        try:
            input_img = Image.open(in_path)
            output_img = remove(input_img)
            output_img.save(out_path)
            print(f"Saved to {dst_name}")
        except Exception as e:
            print(f"Error processing {src_name}: {e}")
    else:
        print(f"File not found: {in_path}")

print("Done.")
