import json
from http.server import BaseHTTPRequestHandler

from src.skill_runtime import build_skill_response


class handler(BaseHTTPRequestHandler):
    def _send_json(self, status_code, body):
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        self._send_json(
            200,
            {
                "message": "Use POST /api/invoke with a JSON body.",
                "example": {"input": "帮我整理一份发布说明", "mode": "draft"},
            },
        )

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length) if content_length else b"{}"

        try:
            data = json.loads(raw_body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self._send_json(400, {"error": "Request body must be valid JSON."})
            return

        user_input = str(data.get("input", "")).strip()
        mode = str(data.get("mode", "default")).strip() or "default"

        if not user_input:
            self._send_json(400, {"error": '`input` is required.'})
            return

        self._send_json(200, build_skill_response(user_input=user_input, mode=mode))
