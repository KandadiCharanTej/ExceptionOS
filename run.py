#!/usr/bin/env python3
"""
ExceptionOS — Unified Local Dev Server Runner
Starts both the FastAPI backend (port 8000) and the Vite frontend (port 5173) concurrently.
"""

import sys
import os
import subprocess
import time
import signal
import socket
from pathlib import Path

def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0

def main():
    root_dir = Path(__file__).resolve().parent
    frontend_dir = root_dir / "frontend"

    print("=" * 70)
    print("  🚀 ExceptionOS — AI Financial Controller Platform")
    print("  Starting Backend & Frontend Development Servers...")
    print("=" * 70)

    # Check port availability
    if is_port_in_use(8000):
        print("⚠️  Warning: Port 8000 is already in use. Backend may fail to bind.")
    if is_port_in_use(5173):
        print("⚠️  Warning: Port 5173 is already in use. Vite may choose another port.")

    processes = []

    try:
        # 1. Start FastAPI backend
        print("\n[1/2] Launching FastAPI Backend on http://localhost:8000...")
        backend_cmd = [
            sys.executable, "-m", "uvicorn",
            "exceptionos.api.main:app",
            "--host", "0.0.0.0",
            "--port", "8000",
            "--reload"
        ]
        backend_proc = subprocess.Popen(
            backend_cmd,
            cwd=str(root_dir)
        )
        processes.append(backend_proc)

        # Give backend a moment to initialize
        time.sleep(1.5)

        # 2. Start Vite frontend
        print("\n[2/2] Launching Vite Frontend on http://localhost:5173...")
        npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
        frontend_proc = subprocess.Popen(
            [npm_cmd, "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"],
            cwd=str(frontend_dir)
        )
        processes.append(frontend_proc)

        time.sleep(1.5)

        print("\n" + "=" * 70)
        print("  ✅ ExceptionOS is RUNNING!")
        print("  • Frontend UI:     http://localhost:5173")
        print("  • Backend API:      http://localhost:8000")
        print("  • API Swagger:      http://localhost:8000/docs")
        print("  • Health Check:     http://localhost:8000/health")
        print("=" * 70)
        print("  Press Ctrl+C to stop all servers.\n")

        # Wait on processes
        while True:
            for p in processes:
                if p.poll() is not None:
                    print(f"⚠️ Process {p.pid} terminated unexpectedly.")
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n🛑 Shutting down ExceptionOS servers...")
    finally:
        for p in processes:
            if p.poll() is None:
                p.terminate()
                try:
                    p.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    p.kill()
        print("👋 All servers stopped.")

if __name__ == "__main__":
    main()
