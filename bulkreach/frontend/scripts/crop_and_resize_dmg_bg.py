import sys
import os
from PIL import Image

def process_image(source_path, output_dir):
    print(f"🎨 Opening source image: {source_path}")
    img = Image.open(source_path)
    width, height = img.size
    
    # Target aspect ratio is 660x400 (1.65)
    target_aspect = 660.0 / 400.0
    
    # Calculate crop dimensions to maintain aspect ratio without stretching
    if width / height > target_aspect:
        # Source is wider than target aspect ratio
        new_width = int(height * target_aspect)
        left = (width - new_width) // 2
        top = 0
        right = left + new_width
        bottom = height
    else:
        # Source is taller than target aspect ratio
        new_height = int(width / target_aspect)
        left = 0
        top = (height - new_height) // 2
        right = width
        bottom = top + new_height
        
    print(f"✂️ Cropping center to maintain 660x400 aspect ratio: ({left}, {top}, {right}, {bottom})")
    cropped_img = img.crop((left, top, right, bottom))
    
    # Generate 1x background (660x400)
    bg_1x = cropped_img.resize((660, 400), Image.Resampling.LANCZOS)
    bg_1x.save(os.path.join(output_dir, "background.png"), "PNG")
    print(f"✨ Saved 1x background (660x400) to: {output_dir}/background.png")
    
    # Generate 2x background (1320x800) for Retina displays
    bg_2x = cropped_img.resize((1320, 800), Image.Resampling.LANCZOS)
    bg_2x.save(os.path.join(output_dir, "background@2x.png"), "PNG")
    print(f"✨ Saved 2x background (1320x800) to: {output_dir}/background@2x.png")
    
    # Also save as TIFF for backup
    bg_1x.save(os.path.join(output_dir, "background.tiff"), "TIFF")
    bg_2x.save(os.path.join(output_dir, "background@2x.tiff"), "TIFF")
    print("✨ Saved TIFF versions successfully.")

def main():
    if len(sys.argv) < 3:
        print("Usage: python crop_and_resize_dmg_bg.py <source_png> <output_dir>")
        sys.exit(1)
        
    source = sys.argv[1]
    out_dir = sys.argv[2]
    
    if not os.path.exists(out_dir):
        os.makedirs(out_dir)
        
    process_image(source, out_dir)

if __name__ == "__main__":
    main()
