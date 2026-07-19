#!/usr/bin/env python
"""
Desktop entry point for BulkReach backend.
Bootstraps Django with desktop settings, runs auto-migrations, and starts the local server.
"""
import os
import sys

# Prevent macOS Sequoia hang inside _uuid.so initialization (network interface check for MAC address)
# by forcing Python's uuid module to fall back to its pure-python implementation.
sys.modules['_uuid'] = None

import socket
import django


def is_port_in_use(host: str, port: int) -> bool:
    """Return True if something is already listening on host:port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        try:
            s.connect((host, port))
            return True
        except (ConnectionRefusedError, OSError):
            return False


def main():
    print("🤖 Step 1: Starting main()", flush=True)
    # Force the Django settings module to desktop configuration
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.desktop")

    # ── Port guard: if a backend is already running, reuse it ────────────────
    # This prevents "That port is already in use" crashes when the app is
    # reopened without the previous sidecar being killed first.
    print("🤖 Step 2: Checking if port 8000 is in use...", flush=True)
    if is_port_in_use("127.0.0.1", 8000):
        print(
            "ℹ️  Port 8000 is already in use — "
            "an existing TalentStream backend is running. "
            "Skipping server startup; the frontend will connect to the live instance.",
            flush=True
        )
        # Block forever so Tauri doesn't consider the sidecar as crashed.
        # The main app window will successfully reach the already-running backend.
        try:
            import time
            while True:
                time.sleep(60)
        except KeyboardInterrupt:
            pass
        return

    print("🤖 Step 3: Initializing Django settings and apps...", flush=True)
    # Bootstrap Django settings and apps
    try:
        django.setup()
        print("🤖 Step 4: Django setup completed.", flush=True)
    except Exception as e:
        print(f"❌ Error during django.setup(): {e}", file=sys.stderr, flush=True)
        sys.exit(1)

    # Auto-run migrations programmatically on startup
    from django.core.management import call_command
    print("📦 Step 5: Running database migrations (SQLite)...", flush=True)
    try:
        call_command("migrate", interactive=False)
        print("✅ Step 6: Database migrations applied successfully.", flush=True)
    except Exception as e:
        print(f"❌ Error applying database migrations: {e}", file=sys.stderr, flush=True)
        # Continue execution, as the DB might already be up-to-date or writable

    # Start the Django server on localhost port 8000.
    # We run dual-stack servers (both IPv4 and IPv6) to prevent connection
    # refused issues in browsers (like Brave) that translate "localhost" → ::1.
    import threading

    def run_ipv6():
        print("🚀 Starting IPv6 server thread...", flush=True)
        try:
            call_command("runserver", "[::1]:8000", use_reloader=False)
        except Exception as e:
            print(f"⚠️ IPv6 server thread error: {e}", flush=True)

    print("🚀 Step 7: Starting dual-stack local servers (IPv4 127.0.0.1:8000 & IPv6 [::1]:8000)...", flush=True)

    ipv6_thread = threading.Thread(target=run_ipv6, daemon=True)
    ipv6_thread.start()

    print("🚀 Step 8: Running IPv4 server in main thread...", flush=True)
    try:
        call_command("runserver", "127.0.0.1:8000", use_reloader=False)
    except KeyboardInterrupt:
        print("\nStopping TalentStream Desktop Backend.", flush=True)
    except Exception as e:
        print(f"❌ Server startup failed: {e}", file=sys.stderr, flush=True)



if __name__ == "__main__":
    main()

