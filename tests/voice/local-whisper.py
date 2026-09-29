# OpenAI-compatible /audio/transcriptions backed by a local faster-whisper model (for tests only).
# usage: python tests/voice/local-whisper.py [model] [port]
import json, subprocess, sys
from email import policy
from email.parser import BytesParser
from http.server import BaseHTTPRequestHandler, HTTPServer
import numpy as np
from faster_whisper import WhisperModel

MODEL = WhisperModel(sys.argv[1] if len(sys.argv) > 1 else "large-v3-turbo", device="cpu", compute_type="int8")
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 54323
calls = []

def pcm(data: bytes):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
                         input=data, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768

class H(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code); self.send_header("content-type", "application/json"); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        self._send(200, {"calls": calls})
    def do_POST(self):
        if not self.path.endswith("/audio/transcriptions"): return self._send(404, {"error": {"message": "nf"}})
        body = self.rfile.read(int(self.headers["content-length"]))
        msg = BytesParser(policy=policy.default).parsebytes(b"Content-Type: " + self.headers["content-type"].encode() + b"\r\n\r\n" + body)
        fields, file = {}, None
        for part in msg.iter_parts():
            name = part.get_param("name", header="content-disposition")
            if part.get_filename(): file = part
            else: fields[name] = part.get_content().strip()
        data = file.get_payload(decode=True)
        lang = fields.get("language") or None
        segs, _ = MODEL.transcribe(pcm(data), language=lang, beam_size=5)
        text = "".join(s.text for s in segs).strip()
        calls.append({"filename": file.get_filename(), "type": file.get_content_type(), "bytes": len(data), "model": fields.get("model"),
                      "language": lang, "auth": bool(self.headers.get("authorization")), "text": text})
        self._send(200, {"text": text})
    def log_message(self, *a): pass

print(f"local whisper on :{PORT}", flush=True)
HTTPServer(("127.0.0.1", PORT), H).serve_forever()
