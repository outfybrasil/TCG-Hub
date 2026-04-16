from PIL import Image

img = Image.open("Logo TCG.png").convert("RGBA")
w, h = img.size

# Sample the corner pixel to get exact background color
corner_color = img.getpixel((0, 0))
print(f"Corner color: {corner_color}")
print(f"Image size: {w}x{h}")

# Also sample a few nearby corners
print(f"Top-right: {img.getpixel((w-1, 0))}")
print(f"Bottom-left: {img.getpixel((0, h-1))}")
print(f"Bottom-right: {img.getpixel((w-1, h-1))}")
print(f"Center: {img.getpixel((w//2, h//2))}")
