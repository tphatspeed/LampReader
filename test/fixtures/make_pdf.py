#!/usr/bin/env python3
"""Bộ sinh PDF tối giản để kiểm thử phần trích xuất chữ.

Không dùng thư viện ngoài: PDF có chữ chỉ là content stream với toán tử Tm (đặt
toạ độ) và Tj (vẽ chữ). Nhờ tự đặt toạ độ nên dựng được đúng các ca khó mà PDF
thật hay gặp: hai cột, tiêu đề cỡ chữ lớn, số trang, header lặp.
"""
import zlib

def esc(s):
    return s.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")

class PDF:
    def __init__(self, w=612, h=792):
        self.w, self.h, self.pages = w, h, []
    def page(self, items):
        """items: list of (x, y_from_top, size, text)"""
        out = []
        for x, y, size, text in items:
            out.append(f"BT /F1 {size} Tf 1 0 0 1 {x} {self.h - y} Tm ({esc(text)}) Tj ET")
        self.pages.append("\n".join(out))
    def save(self, path):
        objs, n = [], 0
        def add(body):
            nonlocal n; n += 1; objs.append(body); return n
        # 1 catalog, 2 pages — điền sau
        add(""); add("")
        font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
        kids = []
        for content in self.pages:
            data = zlib.compress(content.encode("latin-1", "replace"))
            cid = add(f"<< /Length {len(data)} /Filter /FlateDecode >>\nstream\n@@BIN@@\nendstream")
            objs[cid-1] = (objs[cid-1], data)
            pid = add(f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {self.w} {self.h}] "
                      f"/Contents {cid} 0 R /Resources << /Font << /F1 {font} 0 R >> >> >>")
            kids.append(pid)
        objs[0] = "<< /Type /Catalog /Pages 2 0 R >>"
        objs[1] = (f"<< /Type /Pages /Kids [{' '.join(f'{k} 0 R' for k in kids)}] "
                   f"/Count {len(kids)} >>")

        buf, offsets = bytearray(b"%PDF-1.4\n"), []
        for i, o in enumerate(objs, 1):
            offsets.append(len(buf))
            if isinstance(o, tuple):
                head, data = o
                buf += f"{i} 0 obj\n".encode()
                buf += head.split("@@BIN@@")[0].encode() + data + head.split("@@BIN@@")[1].encode()
                buf += b"\nendobj\n"
            else:
                buf += f"{i} 0 obj\n{o}\nendobj\n".encode()
        xref = len(buf)
        buf += f"xref\n0 {len(objs)+1}\n0000000000 65535 f \n".encode()
        for off in offsets:
            buf += f"{off:010d} 00000 n \n".encode()
        buf += (f"trailer\n<< /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n").encode()
        open(path, "wb").write(bytes(buf))
        print(f"  ok  {path}  ({len(buf)} byte, {len(self.pages)} trang)")

# ---------- 1. Một cột: tiêu đề cỡ lớn + đoạn văn + số trang + header lặp ----------
p = PDF()
LEAD = 16
def col(items, x, y0, lines, size=11):
    for i, t in enumerate(lines):
        items.append((x, y0 + i*LEAD, size, t))

for pg in range(1, 4):
    it = []
    it.append((72, 40, 9, "Machine Learning Quarterly Review"))     # header lặp mọi trang
    if pg == 1:
        it.append((72, 90, 20, "Understanding Neural Networks"))    # H1 cỡ 20
        col(it, 72, 130, [
            "Artificial intelligence is changing the way people work every",
            "single day in ways that are both subtle and profound. Many large",
            "technology companies have invested billions of dollars into machine",
            "learning research over the past year alone.",
        ])
        it.append((72, 210, 15, "Training at Scale"))               # H2 cỡ 15
        col(it, 72, 245, [
            "Scientists believe this technology will continue to develop very",
            "rapidly. However, some experts warn that deploying it without",
            "adequate controls could create serious risks for society at large.",
        ])
    else:
        col(it, 72, 100, [
            f"Chapter continues on page {pg} with additional discussion of the",
            "regulatory landscape and the way governments are drafting rules.",
            "Workers also need new skills to adapt to a shifting job market.",
        ])
    it.append((300, 750, 9, str(pg)))                                # số trang (khác nhau mỗi trang)
    p.page(it)
p.save("pdf-mot-cot.pdf")

# ---------- 2. Hai cột kiểu bài báo khoa học ----------
p = PDF()
LEFT = [
    "Rapid serial visual presentation removes the",
    "need for the eye to move across a line of",
    "text. Each word appears at a fixed point.",
    "This eliminates saccades entirely, which",
    "accounts for a large share of reading time.",
    "However the technique also removes the",
]
RIGHT = [
    "ability to regress, that is to look back at",
    "a word already passed. Regression is not a",
    "bad habit but a genuine error correction",
    "mechanism used constantly by fluent",
    "readers. Removing it measurably lowers",
    "comprehension on difficult material.",
]
it = []
it.append((72, 70, 18, "Reading Without Eye Movement"))
col(it, 72, 110, LEFT)     # cột trái  x=72
col(it, 320, 110, RIGHT)   # cột phải  x=320 — CÙNG khoảng y với cột trái
p.page(it)
p.save("pdf-hai-cot.pdf")
