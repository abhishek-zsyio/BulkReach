import sys
import os
from PIL import Image

def main():
    if len(sys.argv) < 3:
        print("Usage: python generate_ico.py <source_png> <output_ico>")
        sys.exit(1)

    source_path = sys.argv[1]
    dest_path = sys.argv[2]

    if not os.path.exists(source_path):
        print(f"Error: Source image not found: {source_path}")
        sys.exit(1)

    print(f"🎨 Opening source image: {source_path}")
    img = Image.open(source_path)

    print("🔨 Generating multi-resolution Windows ICO icon file...")
    icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    img.save(dest_path, format="ICO", sizes=icon_sizes)

    print(f"✨ Successfully generated Windows ICO icon at: {dest_path}")

if __name__ == "__main__":
    main()
