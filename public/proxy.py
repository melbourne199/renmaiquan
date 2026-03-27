#!/usr/bin/env python3
"""
带API代理的静态文件服务器
把所有 /api/* 请求转发到后端 3002 端口
"""
import os
import http.server
import socketserver
import urllib.request
import urllib.error

PORT = 8000
BACKEND = 'http://localhost:3002'

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/api/'):
            self.proxy_request()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/'):
            self.proxy_request(method='POST')
        else:
            self.send_error(405)

    def proxy_request(self, method='GET'):
        try:
            url = BACKEND + self.path
            req = urllib.request.Request(url, method=method)
            # Forward headers
            for header in ['Content-Type', 'Authorization', 'Accept']:
                if header in self.headers:
                    req.add_header(header, self.headers[header])
            # Read body for POST
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else None
            if body:
                req.data = body
            with urllib.request.urlopen(req, timeout=10) as response:
                self.send_response(response.status)
                self.send_header('Content-Type', response.headers.get('Content-Type', 'application/json'))
                self.wfile.write(response.read())
        except urllib.error.HTTPError as e:
            self.send_error(e.code)
        except Exception as e:
            self.send_error(500, str(e))

    def log_message(self, format, *args):
        pass  # 静默，减少噪音

os.chdir(os.path.dirname(os.path.abspath(__file__)))
with socketserver.TCPServer(('', PORT), ProxyHTTPRequestHandler) as httpd:
    print(f'Server running at http://localhost:{PORT}/ with API proxy to {BACKEND}')
    httpd.serve_forever()
