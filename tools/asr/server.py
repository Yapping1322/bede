"""Local-only ASR service for the Bede voice-capture demo.

Binds to 127.0.0.1 ONLY and makes no outbound network calls. Audio is
transcribed on this machine by faster-whisper and is never written to disk
beyond a temp file that is deleted before the response is sent.

Why this exists rather than the browser's Web Speech API: Chrome's
`webkitSpeechRecognition` streams captured audio to Google's servers. On
clinical audio in Australia that is an offshore (Zone C) disclosure under WA
Health Cloud Policy MP 0140/20. The demo must not make that request, so the
recogniser runs here instead.

Production is NOT this file. Production is an AU-region (Zone B) service under a
documented risk assessment, or an on-prem deployment. See STRATEGY.md §4.

Run:  python3 tools/asr/server.py
Env:  BEDE_ASR_MODEL   faster-whisper model size (default: small.en)
      BEDE_ASR_PORT    port (default: 8756)
      BEDE_ASR_PROMPT  optional vocabulary hint, see below
"""

import json
import os
import tempfile
from http.server import BaseHTTPRequestHandler, HTTPServer

from faster_whisper import WhisperModel

MODEL_SIZE = os.environ.get("BEDE_ASR_MODEL", "small.en")
PORT = int(os.environ.get("BEDE_ASR_PORT", "8756"))

# Vocabulary biasing. Whisper mangles drug names at small model sizes
# ("doxycycline" -> "dock see cycling"), which would make the demo look like an
# accuracy problem when it is a model-size problem. An initial_prompt biases the
# decoder toward this vocabulary. This is ordinary domain adaptation and is still
# pure transcription — it does not add anything the speaker did not say. It is
# disclosed here so nobody mistakes it for the engine inventing terms.
DEFAULT_PROMPT = (
    "Ward round. Medications: doxycycline, paracetamol, pantoprazole, "
    "ondansetron, metoclopramide, apixaban, penicillin. Findings: consolidation, "
    "anaphylaxis, haemoglobin, platelets, C-reactive protein."
)
PROMPT = os.environ.get("BEDE_ASR_PROMPT", DEFAULT_PROMPT)

ENGINE = f"faster-whisper {MODEL_SIZE} · local · no network"

print(f"loading {MODEL_SIZE} ...", flush=True)
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
print(f"ready on http://127.0.0.1:{PORT}", flush=True)


def transcribe(path):
    """Return (text, words). Every word's span slices back to text exactly —
    the same [start, end) contract the TypeScript side depends on."""
    segments, _ = model.transcribe(
        path, beam_size=5, word_timestamps=True, initial_prompt=PROMPT
    )

    parts, words, cursor = [], [], 0
    for segment in segments:
        for word in segment.words or []:
            token = word.word  # faster-whisper includes the leading space
            stripped = token.strip()
            if stripped:
                lead = len(token) - len(token.lstrip())
                start = cursor + lead
                words.append(
                    {
                        "text": stripped,
                        "start": round(word.start, 3),
                        "end": round(word.end, 3),
                        "span": [start, start + len(stripped)],
                    }
                )
            parts.append(token)
            cursor += len(token)

    text = "".join(parts)
    for word in words:
        assert text[word["span"][0] : word["span"][1]] == word["text"], (
            f"span invariant broken for {word['text']!r}"
        )
    return text, words


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "http://localhost:5173")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.end_headers()

    def do_POST(self):
        if self.path != "/transcribe":
            self.send_error(404)
            return

        audio = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        tmp = tempfile.NamedTemporaryFile(suffix=".webm", delete=False)
        try:
            tmp.write(audio)
            tmp.close()
            text, words = transcribe(tmp.name)
        finally:
            os.unlink(tmp.name)  # audio never outlives the request

        body = json.dumps({"text": text, "words": words, "engine": ENGINE}).encode()
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):  # noqa: A002 — matches base signature
        # Default logging would put transcript-bearing URLs in the console.
        print(f"{self.command} {self.path}", flush=True)


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
