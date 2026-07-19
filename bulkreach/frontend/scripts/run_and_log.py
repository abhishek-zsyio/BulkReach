import subprocess
import time
import sys

print("Spawning desktop_entry with debug=imports...")
log_file = open("/tmp/import_log.txt", "w")

proc = subprocess.Popen(
    ["/Users/apple/untitled folder/job/bulkreach/frontend/src-tauri/binaries/desktop_entry-x86_64-apple-darwin"],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1
)

start_time = time.time()
try:
    while time.time() - start_time < 35:
        line = proc.stdout.readline()
        if line:
            log_file.write(line)
            log_file.flush()
            # If we see any of our own trace prints, write them to standard output as well
            if "🤖" in line or "✅" in line or "❌" in line or "📦" in line:
                print(f"TRACE: {line.strip()}")
                sys.stdout.flush()
        else:
            ret = proc.poll()
            if ret is not None:
                print(f"Process terminated with exit code {ret}")
                break
            time.sleep(0.05)
except KeyboardInterrupt:
    print("Interrupted")

proc.terminate()
try:
    proc.wait(timeout=5)
except subprocess.TimeoutExpired:
    proc.kill()

log_file.close()
print("Done logging.")
