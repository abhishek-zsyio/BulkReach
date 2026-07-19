#!/usr/bin/env python
"""
Build helper script to package the Django application into a Tauri sidecar binary.
Determines architecture target triple, runs PyInstaller, and moves the output to the src-tauri folder.
"""
import os
import sys
import shutil
import platform
import subprocess
from pathlib import Path

def get_tauri_target_triple():
    """Determine the platform target suffix expected by Tauri."""
    os_name = sys.platform
    arch = platform.machine()
    
    # Map architectures to standard Rust targets
    if arch == "arm64" or arch == "aarch64":
        rust_arch = "aarch64"
    else:
        rust_arch = "x86_64"

    if os_name == "darwin":
        return f"{rust_arch}-apple-darwin"
    elif os_name == "win32":
        return f"{rust_arch}-pc-windows-msvc"
    else:
        return f"{rust_arch}-unknown-linux-gnu"

def main():
    backend_dir = Path(__file__).parent.resolve()
    frontend_dir = backend_dir.parent / "frontend"
    binaries_dir = frontend_dir / "src-tauri" / "binaries"
    
    # Create the binaries folder if it doesn't exist
    binaries_dir.mkdir(parents=True, exist_ok=True)
    
    target_triple = get_tauri_target_triple()
    executable_name = "desktop_entry"
    sidecar_name = f"{executable_name}-{target_triple}"
    
    print(f"🖥️ Detected System Architecture: {platform.machine()} ({sys.platform})")
    print(f"📦 Tauri Target Triple: {target_triple}")
    print(f"🚀 Output Sidecar Name: {sidecar_name}")
    
    # Resolve pyinstaller path (check venv first, then fall back to system PATH)
    pyinstaller_bin = "pyinstaller"
    venv_pyinstaller = backend_dir / "venv" / "bin" / "pyinstaller"
    if sys.platform == "win32":
        venv_pyinstaller = backend_dir / "venv" / "Scripts" / "pyinstaller.exe"

    if venv_pyinstaller.exists():
        pyinstaller_bin = str(venv_pyinstaller)
        
    # Clean up the output directory if it exists to prevent PyInstaller conflicts
    dist_dir = backend_dir / "dist" / executable_name
    if dist_dir.exists():
        print(f"🧹 Cleaning up existing output directory: {dist_dir}")
        shutil.rmtree(dist_dir)

    pyinstaller_args = [
        pyinstaller_bin,
        "--clean",
        "--onedir",
        "--noconfirm",
        f"--name={executable_name}",
        "--collect-all=django",
        "--collect-all=rest_framework",
        "--collect-all=rest_framework_simplejwt",
        "--collect-all=corsheaders",
        "--collect-all=django_filters",
        "--collect-all=django_celery_beat",
        "--collect-all=celery",
        "--collect-all=kombu",
        "--collect-all=drf_spectacular",
        "--collect-all=encrypted_model_fields",
        "--collect-all=tzdata",
        "--collect-all=apps",
        "desktop_entry.py"
    ]
    
    print("\n🔨 Running PyInstaller (this might take a minute)...")
    print(" ".join(pyinstaller_args))
    
    env = os.environ.copy()
    env["DJANGO_SETTINGS_MODULE"] = "config.settings.desktop"
    env["PYTHONPATH"] = str(backend_dir)

    try:
        subprocess.run(pyinstaller_args, check=True, cwd=backend_dir, env=env)
        print("✅ PyInstaller compilation finished successfully.")
    except subprocess.CalledProcessError as e:
        print(f"❌ PyInstaller failed: {e}", file=sys.stderr)
        sys.exit(1)
        
    # Locate built executable in --onedir mode
    if sys.platform == "win32":
        built_path = backend_dir / "dist" / executable_name / f"{executable_name}.exe"
        destination_path = binaries_dir / f"{sidecar_name}.exe"
        
        if not built_path.exists():
            print(f"❌ Could not find built executable at: {built_path}", file=sys.stderr)
            sys.exit(1)
            
        print(f"\n🚚 Moving binary to Tauri project:")
        print(f"   From: {built_path}")
        print(f"   To:   {destination_path}")
        shutil.copy2(built_path, destination_path)
        print("🎉 Sidecar binary copied successfully!")
    else:
        # On macOS and Linux, we compile a C wrapper that executes the actual backend in Resources/
        # This keeps the backend fully codesignable inside the app bundle resources, bypassing Gatekeeper load hangs.
        built_path = backend_dir / "dist" / executable_name / executable_name
        destination_path = binaries_dir / sidecar_name
        
        if not built_path.exists():
            print(f"❌ Could not find built executable at: {built_path}", file=sys.stderr)
            sys.exit(1)
            
        # Copy the built --onedir directory to the src-tauri resources folder
        tauri_resources_dir = frontend_dir / "src-tauri" / "resources" / "desktop_entry"
        if tauri_resources_dir.exists():
            shutil.rmtree(tauri_resources_dir)
        tauri_resources_dir.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(backend_dir / "dist" / executable_name, tauri_resources_dir)
        print(f"📦 Copied backend directory to resources: {tauri_resources_dir}")

        print("\n🛠️  Compiling C sidecar wrapper for macOS...")
        wrapper_c_path = Path("/tmp/wrapper.c")
        
        wrapper_source = """#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <libgen.h>
#include <mach-o/dyld.h>

int main(int argc, char *argv[]) {
    char path[2048];
    uint32_t size = sizeof(path);
    if (_NSGetExecutablePath(path, &size) != 0) {
        fprintf(stderr, "Error: failed to get executable path\\n");
        return 1;
    }
    
    char *dir = dirname(path);
    char exe_path[4096];
    
    // Path 1: Clean Release Bundle path (packaged inside Contents/Resources/resources/)
    snprintf(exe_path, sizeof(exe_path), "%s/../Resources/resources/desktop_entry/desktop_entry", dir);
    execv(exe_path, argv);
    
    // Path 2: Dev Mode path (relative to src-tauri/binaries/ when running npm run tauri dev)
    snprintf(exe_path, sizeof(exe_path), "%s/../resources/desktop_entry/desktop_entry", dir);
    execv(exe_path, argv);
    
    // Path 3: Nested Release Bundle path (Tauri _up_ fallback directory structure)
    snprintf(exe_path, sizeof(exe_path), "%s/../Resources/_up_/_up_/backend/dist/desktop_entry/desktop_entry", dir);
    execv(exe_path, argv);
    
    // If all execv attempts fail
    perror("execv failed for all paths");
    return 1;
}
"""
        wrapper_c_path.write_text(wrapper_source)
        
        try:
            subprocess.run(
                ["clang", "-O3", str(wrapper_c_path), "-o", str(destination_path)],
                check=True
            )
            print(f"🎉 C wrapper compiled successfully as sidecar at: {destination_path}")
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to compile C wrapper: {e}", file=sys.stderr)
            sys.exit(1)
        finally:
            if wrapper_c_path.exists():
                wrapper_c_path.unlink()

if __name__ == "__main__":
    main()
