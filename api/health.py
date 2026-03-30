import json
from http.server import BaseHTTPRequestHandler

from src.skill_runtime import SERVICE_NAME, SKILL_SLUG


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = {
            "status": "ok",
            "service": SERVICE_NAME,
            "skill": SKILL_SLUG,
            "endpoints": ["/api/health", "/api/invoke"],
        }
        payload = json.dumps(body).encode("utf-8")

        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
