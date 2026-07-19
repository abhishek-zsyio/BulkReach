#!/bin/bash
set -e

SOURCE_PNG="$1"
OUTPUT_DIR="$2"

if [ -z "$SOURCE_PNG" ] || [ -z "$OUTPUT_DIR" ]; then
    echo "Usage: $0 <source_png> <output_dir>"
    exit 1
fi

ICONSET_DIR="tmp.iconset"
mkdir -p "$ICONSET_DIR"

echo "🎨 Resizing image to macOS icon set sizes using sips..."
sips -s format png -z 16 16     "$SOURCE_PNG" --out "$ICONSET_DIR/icon_16x16.png" > /dev/null
sips -s format png -z 32 32     "$SOURCE_PNG" --out "$ICONSET_DIR/icon_16x16@2x.png" > /dev/null
sips -s format png -z 32 32     "$SOURCE_PNG" --out "$ICONSET_DIR/icon_32x32.png" > /dev/null
sips -s format png -z 64 64     "$SOURCE_PNG" --out "$ICONSET_DIR/icon_32x32@2x.png" > /dev/null
sips -s format png -z 128 128   "$SOURCE_PNG" --out "$ICONSET_DIR/icon_128x128.png" > /dev/null
sips -s format png -z 256 256   "$SOURCE_PNG" --out "$ICONSET_DIR/icon_128x128@2x.png" > /dev/null
sips -s format png -z 256 256   "$SOURCE_PNG" --out "$ICONSET_DIR/icon_256x256.png" > /dev/null
sips -s format png -z 512 512   "$SOURCE_PNG" --out "$ICONSET_DIR/icon_256x256@2x.png" > /dev/null
sips -s format png -z 512 512   "$SOURCE_PNG" --out "$ICONSET_DIR/icon_512x512.png" > /dev/null
sips -s format png -z 1024 1024 "$SOURCE_PNG" --out "$ICONSET_DIR/icon_512x512@2x.png" > /dev/null

echo "🔨 Compiling iconset into ICNS bundle using iconutil..."
iconutil -c icns "$ICONSET_DIR" -o "$OUTPUT_DIR/icon.icns"

echo "🧹 Cleaning up temporary files..."
rm -rf "$ICONSET_DIR"

echo "✨ Successfully generated macOS ICNS icon at: $OUTPUT_DIR/icon.icns"
