#!/usr/bin/env python3
"""
MiniMax Fast-Whisper STT Server

Starts an OpenAI-compatible /v1/audio/transcriptions endpoint
powered by faster-whisper. Auto-downloads the model on first run.

Supports two installation modes:
1. System Python (if faster-whisper can be installed directly)
2. Virtual environment (for Arch Linux and other distros where pip install
   to system Python is restricted)

Usage (system Python):
    python3 scripts/fast-whisper-server.py [--model base] [--port 8000]

Usage (with venv):
    python3 scripts/fast-whisper-server.py --venv ~/.jarvis/venv [--model base] [--port 8000]

To set up a venv and install dependencies:
    python3 scripts/fast-whisper-server.py --setup-venv ~/.jarvis/venv

JARVIS onboard will configure this as STT provider 'local' with
server_type='openai_compatible' pointing to http://localhost:8000
"""

import argparse
import base64
import io
import json
import logging
import os
import shutil
import subprocess
import sys
import threading
import venv
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse

logging.basicConfig(
    level=logging.INFO,
    format="[fast-whisper] %(asctime)s: %(message)s",
)
log = logging.getLogger("fast-whisper")


MODEL_CACHE_DIR = os.path.expanduser("~/.cache/whisper")
DEFAULT_MODEL = "base"
DEFAULT_PORT = 8000

# Global model instance (loaded once)
_model = None
_model_lock = threading.Lock()


def get_python_executable(venv_path: str | None) -> str:
    """Get the Python executable to use. Validates venv exists if provided."""
    if venv_path:
        if os.name == 'nt':
            python_exe = os.path.join(venv_path, 'Scripts', 'python.exe')
        else:
            python_exe = os.path.join(venv_path, 'bin', 'python3')
        if not os.path.isfile(python_exe):
            log.error(f"Virtual environment not found at: {venv_path}")
            log.error(f"Run with --setup-venv {venv_path} first to create it")
            return None
        return python_exe
    return sys.executable


def ensure_faster_whisper(python_executable: str) -> bool:
    """Ensure faster-whisper is installed in the given Python environment."""
    try:
        import importlib
        importlib.import_module('faster_whisper')
        log.info("faster-whisper is already installed")
        return True
    except ImportError:
        pass

    log.info("Installing faster-whisper...")
    result = subprocess.run(
        [python_executable, "-m", "pip", "install", "faster-whisper", "-q"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        log.error(f"Failed to install faster-whisper: {result.stderr}")
        return False
    log.info("faster-whisper installed successfully")
    return True


def setup_venv(venv_path: str) -> bool:
    """Create a virtual environment and install faster-whisper."""
    venv_path = os.path.abspath(venv_path)
    log.info(f"Creating virtual environment at {venv_path}...")

    try:
        venv.create(venv_path, with_pip=True)
        log.info("Virtual environment created")
    except Exception as e:
        log.error(f"Failed to create venv: {e}")
        return False

    python_exe = get_python_executable(venv_path)
    if not ensure_faster_whisper(python_exe):
        return False

    log.info(f"Virtual environment ready at {venv_path}")
    log.info(f"Run with: python3 {os.path.abspath(__file__)} --venv {venv_path}")
    return True


def load_model(model_name: str) -> "WhisperModel":
    """Load or return cached faster-whisper model."""
    global _model
    with _model_lock:
        if _model is None:
            log.info(f"Loading model '{model_name}' (downloads if needed)...")
            _model = WhisperModel(
                model_name,
                device="auto",
                compute_type="auto",
                download_root=MODEL_CACHE_DIR,
            )
            log.info(f"Model '{model_name}' loaded successfully")
        return _model


def transcribe_audio(audio_data: bytes, model: WhisperModel, language: str = "en") -> str:
    """Transcribe audio data to text."""
    # Write audio to a temporary buffer (faster-whisper supports file-like objects)
    audio_io = io.BytesIO(audio_data)

    segments, info = model.transcribe(
        audio_io,
        language=language if language else None,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500),
    )

    full_text = " ".join(segment.text for segment in segments)
    log.info(f"Transcription: {len(full_text)} chars")
    return full_text


class TranscriptionHandler(BaseHTTPRequestHandler):
    """HTTP handler for OpenAI-compatible /v1/audio/transcriptions endpoint."""

    def log_message(self, format, *args):
        log.info(format % args)

    def do_POST(self):
        """Handle POST /v1/audio/transcriptions."""
        parsed = urlparse(self.path)
        if parsed.path != "/v1/audio/transcriptions":
            self.send_error(404, "Not found")
            return

        # Read headers
        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" in content_type:
            self._handle_multipart()
        else:
            self.send_error(415, "Unsupported Media Type")

    def _handle_multipart(self):
        """Handle multipart/form-data audio transcription."""
        try:
            form_data = self._parse_multipart()
            model_name = form_data.get("model", [DEFAULT_MODEL])[0]
            language = form_data.get("language", ["en"])[0]

            # Get audio file
            audio_file = self._get_file_from_form(form_data, "file")
            if not audio_file:
                self.send_error_response(400, "No audio file provided")
                return

            audio_data = audio_file["data"]
            log.info(f"Received {len(audio_data)} bytes of audio")

            # Load model (singleton)
            model = load_model(model_name)

            # Transcribe
            text = transcribe_audio(audio_data, model, language)

            # Return OpenAI-compatible response
            response = {"text": text}
            self.send_json_response(response)

        except Exception as e:
            log.error(f"Transcription error: {e}")
            self.send_error_response(500, str(e))

    def _parse_multipart(self) -> dict:
        """Minimal multipart parsing - get model and file fields."""
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        # Find boundary
        content_type = self.headers.get("Content-Type", "")
        boundary = None
        for part in content_type.split(";"):
            part = part.strip()
            if part.startswith("boundary="):
                boundary = part[9:].encode()
                break

        if not boundary:
            raise ValueError("No boundary found")

        # Parse parts
        fields = {}
        parts = body.split(b"--" + boundary)
        for part in parts:
            if not part or part.strip() in (b"", b"--\r\n"):
                continue

            # Split headers and body
            header_end = part.find(b"\r\n\r\n")
            if header_end < 0:
                continue

            headers_raw = part[:header_end].decode("utf-8", errors="replace")
            body_data = part[header_end + 4:]

            # Parse Content-Disposition
            disposition = {}
            for line in headers_raw.split("\r\n"):
                if ":" in line:
                    key, val = line.split(":", 1)
                    key = key.strip().lower()
                    val = val.strip()
                    if key == "content-disposition":
                        for item in val.split(";"):
                            if "=" in item:
                                k, v = item.split("=", 1)
                                disposition[k.strip()] = v.strip().strip('"')

            name = disposition.get("name")
            filename = disposition.get("filename")

            if name == "model" or name == "language":
                fields[name] = [body_data.decode("utf-8", errors="replace").strip()]
            elif name == "file" and filename:
                fields["file"] = [{
                    "filename": filename,
                    "data": body_data,
                }]

        return fields

    def _get_file_from_form(self, form_data: dict, field_name: str) -> dict | None:
        files = form_data.get(field_name, [])
        return files[0] if files else None

    def send_json_response(self, data: dict, status: int = 200):
        """Send JSON response."""
        response = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(response))
        self.end_headers()
        self.wfile.write(response)

    def send_error_response(self, status: int, message: str):
        """Send error JSON response."""
        self.send_json_response({"error": {"message": message, "type": "invalid_request_error"}}, status)


def main():
    parser = argparse.ArgumentParser(description="MiniMax Fast-Whisper STT Server")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Whisper model to use (default: base)")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="Port to listen on (default: 8000)")
    parser.add_argument("--language", default="en", help="Default language code (default: en)")
    parser.add_argument("--venv", default=None, help="Path to virtual environment to use")
    parser.add_argument("--setup-venv", default=None, help="Path to set up virtual environment and install dependencies")
    args = parser.parse_args()

    # Handle venv setup
    if args.setup_venv:
        success = setup_venv(args.setup_venv)
        sys.exit(0 if success else 1)

    # Determine Python executable
    python_exe = get_python_executable(args.venv) if args.venv else sys.executable
    if not python_exe:
        log.error("Virtual environment not found. Run with --setup-venv to create it first.")
        sys.exit(1)

    # Ensure faster-whisper is installed
    if not ensure_faster_whisper(python_exe):
        log.error("Cannot proceed without faster-whisper. Run with --setup-venv to create a venv first.")
        sys.exit(1)

    # Pre-load model so first request is fast
    log.info(f"Pre-loading model '{args.model}'...")

    # Import faster-whisper using the correct Python
    if args.venv:
        site_packages = os.path.join(args.venv, 'lib', f'python{sys.version_info.major}.{sys.version_info.minor}', 'site-packages')
        sys.path.insert(0, site_packages)

    try:
        from faster_whisper import WhisperModel
    except ImportError as e:
        log.error(f"Failed to import faster-whisper: {e}")
        sys.exit(1)

    _model_instance = None

    def load_model_with_venv(model_name: str):
        global _model_instance
        if _model_instance is None:
            log.info(f"Loading model '{model_name}' (downloads if needed)...")
            _model_instance = WhisperModel(
                model_name,
                device="auto",
                compute_type="auto",
                download_root=MODEL_CACHE_DIR,
            )
            log.info(f"Model '{model_name}' loaded successfully")
        return _model_instance

    # Monkey-patch load_model for this instance
    global load_model
    original_load_model = load_model

    def gated_load_model(model_name: str):
        if args.venv:
            return load_model_with_venv(model_name)
        return original_load_model(model_name)

    # Pre-load model so first request is fast
    log.info(f"Pre-loading model '{args.model}'...")
    gated_load_model(args.model)

    server_address = ("", args.port)
    httpd = HTTPServer(server_address, TranscriptionHandler)
    log.info(f"Server listening on http://localhost:{args.port}")
    log.info(f"Transcriptions endpoint: POST http://localhost:{args.port}/v1/audio/transcriptions")
    log.info(f"Open in browser or connect from JARVIS with STT provider 'local', server_type 'openai_compatible'")

    # Override load_model in the handler
    TranscriptionHandler._load_model = gated_load_model

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        log.info("Shutting down...")
        httpd.shutdown()


if __name__ == "__main__":
    main()
