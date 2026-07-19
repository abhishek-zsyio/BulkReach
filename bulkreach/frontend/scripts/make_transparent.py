import sys
import os
from PIL import Image, ImageFilter

def make_transparent(source_path, dest_path):
    print(f"🎨 Opening source image: {source_path}")
    img = Image.open(source_path).convert("RGBA")
    width, height = img.size
    
    # We want to remove the black background and make it transparent,
    # while smoothly preserving the shadow.
    pixels = img.load()
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            # If it's a black background pixel
            if r < 30 and g < 30 and b < 30:
                # Calculate brightness
                brightness = max(r, g, b)
                # Map brightness [0, 30] to alpha [0, 255]
                alpha = int((brightness / 30.0) * 255)
                # Ensure it has a smooth fade
                pixels[x, y] = (0, 0, 0, alpha)
            # If it's part of the outer edge of the squircle, smooth it
            elif r < 60 and g < 60 and b < 60:
                # Slight smoothing for anti-aliasing
                pass
                
    # Save the transparent image
    img.save(dest_path, "PNG")
    print(f"✨ Successfully saved transparent PNG to: {dest_path}")

def main():
    if len(sys.argv) < 3:
        print("Usage: python make_transparent.py <source_png> <output_png>")
        sys.exit(1)
        
    source = sys.argv[1]
    dest = sys.argv[2]
    make_transparent(source, dest)

if __name__ == "__main__":
    main()
