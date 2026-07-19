#!/usr/bin/env bash
# sign_and_package.sh
# ─────────────────────────────────────────────────────────────────────────────
# Post-build script: ad-hoc signs the Tauri .app bundle and repackages the DMG
# using Tauri's own bundle_dmg.sh — preserving the pretty background, icon
# layout, and Applications folder shortcut.
#
# macOS 14+ (Sonoma/Sequoia) enforces code signatures on every executable
# inside an app bundle — even for unsigned/self-distributed apps.
# Without this step, the PyInstaller sidecar binary is SIGKILL'd at _dyld_start
# before any Python code can run, causing the app to hang on the init screen.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

FRONTEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TAURI_DIR="$FRONTEND_DIR/src-tauri"
BUNDLE_DIR="$TAURI_DIR/target/release/bundle"
MACOS_DIR="$BUNDLE_DIR/macos"
DMG_DIR="$BUNDLE_DIR/dmg"
APP_NAME="TalentStream"
APP_PATH="$MACOS_DIR/$APP_NAME.app"
DMG_NAME="${APP_NAME}_1.0.0_x64.dmg"
DMG_PATH="$DMG_DIR/$DMG_NAME"
BUNDLE_DMG_SH="$DMG_DIR/bundle_dmg.sh"
ICON_ICNS="$DMG_DIR/icon.icns"
BACKGROUND="$TAURI_DIR/./icons/dmg_background.tiff"

TEMP_MOUNT="/tmp/${APP_NAME}_sign_$$"
TEMP_APP="/tmp/${APP_NAME}_sign_$$.app"

cleanup() {
  if mount | grep -q "$TEMP_MOUNT" 2>/dev/null; then
    hdiutil detach "$TEMP_MOUNT" -quiet -force 2>/dev/null || true
  fi
  rm -rf "$TEMP_MOUNT" "$TEMP_APP" 2>/dev/null || true
}
trap cleanup EXIT

# ── Step 1: Locate the .app ──────────────────────────────────────────────────

echo ""
echo "🔍 Locating app bundle..."

if [ -d "$APP_PATH" ]; then
  echo "   Found in build dir: $APP_PATH"
elif [ -f "$DMG_PATH" ]; then
  echo "   .app not in build dir — extracting from existing DMG..."
  mkdir -p "$TEMP_MOUNT"
  hdiutil attach "$DMG_PATH" -mountpoint "$TEMP_MOUNT" -quiet -nobrowse
  cp -R "$TEMP_MOUNT/$APP_NAME.app" "$TEMP_APP"
  hdiutil detach "$TEMP_MOUNT" -quiet
  mkdir -p "$MACOS_DIR"
  cp -R "$TEMP_APP" "$APP_PATH"
  echo "   Extracted to: $APP_PATH"
else
  echo "❌ No .app or DMG found."
  echo "   Run: npm run tauri:build"
  exit 1
fi

# ── Step 2: Ad-hoc sign ──────────────────────────────────────────────────────

echo ""
echo "🔏 Step 2: Ad-hoc signing the app bundle..."
echo "   Target: $APP_PATH"
codesign --force --deep --sign - "$APP_PATH"
echo "✅ App bundle signed."

# ── Step 3: Unmount any stale TalentStream volume ────────────────────────────

echo ""
echo "🧹 Step 3: Clearing any stale mounted volumes..."
STALE_DEVS=$(hdiutil info 2>/dev/null | grep -B5 "TalentStream" | grep "^/dev/" | awk '{print $1}' || true)
if [ -n "$STALE_DEVS" ]; then
  for dev in $STALE_DEVS; do
    echo "   Ejecting $dev..."
    hdiutil detach "$dev" -quiet -force 2>/dev/null || true
  done
else
  echo "   None found."
fi

# Also eject by mountpoint if still there
if [ -d "/Volumes/$APP_NAME" ]; then
  hdiutil detach "/Volumes/$APP_NAME" -quiet -force 2>/dev/null || true
fi
sleep 1

# ── Step 4: Repackage with Tauri's pretty bundle_dmg.sh ─────────────────────

echo ""
echo "📦 Step 4: Repackaging DMG with background + icon layout..."

rm -f "$DMG_PATH"
rm -f "$DMG_DIR/rw."*.dmg "$DMG_DIR/rw_temp"*.dmg 2>/dev/null || true

if [ ! -f "$BUNDLE_DMG_SH" ]; then
  echo "⚠️  bundle_dmg.sh not found — Tauri hasn't run yet. Run 'npm run tauri:build' first."
  exit 1
fi

# bundle_dmg.sh resolves TalentStream.app relative to CWD — must run from macos/
pushd "$MACOS_DIR" > /dev/null

# bundle_dmg.sh may exit with code 2 when Finder holds the volume open at unmount.
# The DMG content is fully set up at that point — we just need to force-detach
# and convert the rw DMG ourselves.
set +e
bash "$BUNDLE_DMG_SH" \
  --volname "$APP_NAME" \
  --icon "${APP_NAME}.app" 180 220 \
  --app-drop-link 480 220 \
  --window-size 660 400 \
  --hide-extension "${APP_NAME}.app" \
  --background "$BACKGROUND" \
  --volicon "$ICON_ICNS" \
  "$DMG_PATH" \
  "${APP_NAME}.app"
BUNDLE_EXIT=$?
set -e

popd > /dev/null

RW_DMG="$DMG_DIR/rw.${DMG_NAME}"

if [ $BUNDLE_EXIT -ne 0 ] && [ -f "$RW_DMG" ]; then
  echo "⚠️  bundle_dmg.sh exited with code $BUNDLE_EXIT (likely Finder holding volume)."
  echo "   Force-detaching and converting manually..."
  # Find which device is still mounted and force-eject it
  BUSY_DEV=$(hdiutil info 2>/dev/null | grep -B10 "$APP_NAME" | grep "^/dev/disk" | head -1 | awk '{print $1}' || true)
  [ -n "$BUSY_DEV" ] && hdiutil detach "$BUSY_DEV" -force -quiet 2>/dev/null || true
  sleep 1
  rm -f "$DMG_PATH"
  hdiutil convert "$RW_DMG" -format UDZO -imagekey zlib-level=9 -o "$DMG_PATH"
  rm -f "$RW_DMG"
elif [ $BUNDLE_EXIT -ne 0 ]; then
  echo "❌ bundle_dmg.sh failed (exit $BUNDLE_EXIT) and no rw DMG found. Aborting."
  exit $BUNDLE_EXIT
fi

echo ""
echo "✅ Signed + styled DMG ready:"
echo "   $DMG_PATH"
echo ""
echo "🎉 Done! Open with:"
echo "   open \"$DMG_PATH\""
