import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent

# Load .env
env_file = ROOT / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ[key.strip()] = value.strip()
else:
    print("Warning: .env not found")

env = os.environ.copy()

print("[backend] Starting Spring Boot...")
backend = subprocess.Popen(
    ["mvnw.cmd", "spring-boot:run"],
    cwd=ROOT / "backend",
    env=env,
    shell=True,
)

print("[frontend] Starting Next.js...")
frontend = subprocess.Popen(
    ["npm", "run", "dev"],
    cwd=ROOT / "frontend",
    env=env,
    shell=True,
)

print()
print("  Backend:  http://localhost:8080")
print("  Frontend: http://localhost:3000")
print()
print("Press Ctrl+C to stop both.")

try:
    backend.wait()
    frontend.wait()
except KeyboardInterrupt:
    print("\nStopping all processes...")
    backend.terminate()
    frontend.terminate()
    backend.wait()
    frontend.wait()
    print("Done.")
    sys.exit(0)
