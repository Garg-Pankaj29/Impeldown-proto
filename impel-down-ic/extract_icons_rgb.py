import cv2
import numpy as np
import os

img_path = "/home/pankaj-garg/Documents/Projects/One-piece/impel-down-ic/ui_images/all_icons.png"
out_dir = "/home/pankaj-garg/Documents/Projects/One-piece/impel-down-ic/ui_images/extracted_icons"

os.makedirs(out_dir, exist_ok=True)

img = cv2.imread(img_path)
if img is None:
    print("Could not read image.")
    exit(1)

# Convert to grayscale
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

# Assuming background is mostly white, threshold to find dark objects
# Or if background is black, threshold to find bright objects.
# Let's check the corners to guess the background.
bg_color = gray[0, 0]
if bg_color > 128:
    # White background
    _, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)
else:
    # Black background
    _, thresh = cv2.threshold(gray, 15, 255, cv2.THRESH_BINARY)

# Find contours
contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

print(f"Found {len(contours)} icons.")

# Crop and save each icon
count = 0
for contour in contours:
    x, y, w, h = cv2.boundingRect(contour)
    if w > 20 and h > 20: # Filter small noise
        pad = 5
        x1 = max(0, x - pad)
        y1 = max(0, y - pad)
        x2 = min(img.shape[1], x + w + pad)
        y2 = min(img.shape[0], y + h + pad)
        
        cropped = img[y1:y2, x1:x2]
        
        # Convert cropped back to BGRA and make background transparent
        # (Assuming the background color is the same as the top-left corner)
        b, g, r = img[0, 0]
        bgra = cv2.cvtColor(cropped, cv2.COLOR_BGR2BGRA)
        # Create mask of background
        mask = np.all(cropped == [b, g, r], axis=-1)
        bgra[mask, 3] = 0 # set alpha to 0 for background pixels
        
        out_path = os.path.join(out_dir, f"icon_{count}.png")
        cv2.imwrite(out_path, bgra)
        count += 1

print(f"Extracted {count} icons.")
