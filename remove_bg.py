from PIL import Image

def flood_fill_transparent(img, x, y, tolerance=60):
    pixels = img.load()
    width, height = img.size
    target = pixels[x, y][:3]

    visited = set()
    queue = [(x, y)]

    while queue:
        cx, cy = queue.pop()
        if (cx, cy) in visited:
            continue
        if cx < 0 or cy < 0 or cx >= width or cy >= height:
            continue
        r, g, b, a = pixels[cx, cy]
        if (abs(r - target[0]) <= tolerance and
            abs(g - target[1]) <= tolerance and
            abs(b - target[2]) <= tolerance and
            a > 0):
            pixels[cx, cy] = (r, g, b, 0)
            visited.add((cx, cy))
            queue.extend([(cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)])

    return img

img = Image.open("Logo TCG.png").convert("RGBA")
w, h = img.size

for corner in [(0, 0), (w-1, 0), (0, h-1), (w-1, h-1),
               (w//2, 0), (0, h//2), (w-1, h//2), (w//2, h-1)]:
    img = flood_fill_transparent(img, corner[0], corner[1], tolerance=60)

img.save("frontend/public/tcg-icon.png")
print("Salvo em frontend/public/tcg-icon.png")

# Verify
result = Image.open("frontend/public/tcg-icon.png")
print(f"Modo: {result.mode}")
print(f"Pixel canto: {result.getpixel((0,0))}")
print(f"Pixel centro: {result.getpixel((512,512))}")
