from PIL import Image

try:
    img = Image.open('ui_images/reporter_dashboard.png').convert('RGB')
    print(f"Mock size: {img.size}")
except Exception as e:
    print("Error:", e)
