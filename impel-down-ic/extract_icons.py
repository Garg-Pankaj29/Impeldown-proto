import cv2
import numpy as np
from PIL import Image
import os

img_path = "/home/pankaj-garg/Documents/Projects/One-piece/impel-down-ic/ui_images/all_icons.png"
out_dir = "/home/pankaj-garg/Documents/Projects/One-piece/impel-down-ic/ui_images/extracted_icons"

os.makedirs(out_dir, exist_ok=True)

# Read the image with alpha channel
img = cv2.imread(img_path, cv2.IMREAD_UNCHANGED)
if img is None:
    print("Could not read image.")
    exit(1)

# Extract alpha channel
if img.shape[2] == 4:
    alpha = img[:, :, 3]
else:
    print("No alpha channel found.")
    exit(1)

# Threshold alpha channel to create a binary mask
_, mask = cv2.threshold(alpha, 10, 255, cv2.THRESH_BINARY)

# Find contours
contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

print(f"Found {len(contours)} icons.")

# Crop and save each icon
for i, contour in enumerate(contours):
    x, y, w, h = cv2.boundingRect(contour)
    # Filter out very small noise
    if w > 10 and h > 10:
        # Add some padding
        pad = 5
        x1 = max(0, x - pad)
        y1 = max(0, y - pad)
        x2 = min(img.shape[1], x + w + pad)
        y2 = min(img.shape[0], y + h + pad)
        
        cropped = img[y1:y2, x1:x2]
        out_path = os.path.join(out_dir, f"icon_{i}.png")
        cv2.imwrite(out_path, cropped)

print("Done extracting.")
