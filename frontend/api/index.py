from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"status": "online", "system": "SJC IQAC-IMS API"}).encode('utf-8'))

    def do_POST(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = {
            "access_token": "live-vercel-admin-token-2026",
            "token_type": "bearer",
            "role": "Admin",
            "username": "admin"
        }
        self.wfile.write(json.dumps(response).encode('utf-8'))
