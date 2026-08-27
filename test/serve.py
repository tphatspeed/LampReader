#!/usr/bin/env python3
"""Server tĩnh cho bộ kiểm thử, KHÔNG cho trình duyệt cache.

Dùng thẳng `python3 -m http.server` sẽ khiến trình duyệt giữ lại bản .js/.css cũ
sau khi ta vừa sửa, và bộ kiểm thử âm thầm chạy trên mã nguồn lỗi thời — đã mất
thời gian vì đúng chuyện này vài lần.

    python3 test/serve.py [cổng]     (mặc định 8899, chạy từ thư mục gốc dự án)
"""
import sys, http.server, socketserver

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()
    def log_message(self, *a):
        pass

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8899
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", port), NoCache) as httpd:
    print(f"Phục vụ trên http://localhost:{port}/  (không cache)")
    httpd.serve_forever()
