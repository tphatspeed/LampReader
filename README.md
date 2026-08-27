# Lamp

**Đọc nhanh mọi trang web, PDF và EPUB bằng kỹ thuật RSVP — ngay trong Chrome.**

RSVP (Rapid Serial Visual Presentation) hiện từng cụm từ tại một vị trí cố định,
mắt không phải quét qua lại từng dòng. Lamp làm việc đó, nhưng không dừng ở đó:
nó bù lại đúng những thứ mà RSVP lấy mất của bạn — khả năng đọc lại, nhìn trước,
và nắm cấu trúc bài.

Chạy hoàn toàn trên máy bạn. Không tài khoản, không máy chủ, không gửi đi đâu cả.

> Phiên bản hiện tại: **1.7.0** · Manifest V3 · Giao diện tiếng Việt

---

## Có gì đáng chú ý

- **Hai chế độ đọc** — RSVP để lướt nhanh, *Dẫn dòng* (vệt sáng chạy trên đoạn văn
  nguyên vẹn) cho tài liệu cần hiểu thật sự.
- **Dừng là thấy toàn bài** — mỗi lần dừng RSVP, cả bài hiện ra kèm vị trí đang
  đọc được tô sáng, để nắm lại mạch trước khi đọc tiếp.
- **Kiểm tra hiểu tự sinh** — khoét từ khỏi chính câu bạn vừa đọc, chấm xong gợi ý
  tốc độ. Sai câu nào thì hiện lại câu gốc kèm nút nhảy về đúng chỗ.
- **Luyện tốc độ có số liệu** — đọc cùng một bài ở 3 mức WPM, quiz từng mức, rồi
  chỉ ra mức nhanh nhất mà bạn vẫn hiểu ≥80%.
- **Trích đoạn** — bấm `H` lưu câu đang đọc, xuất ra Markdown.
- **Thư viện đọc dở** — bài nào chưa đọc xong nằm sẵn trong popup, bấm là đọc tiếp.
- **Tiếng Việt được xử lý riêng** — tự nhận diện rồi giảm nhịp 15%, quiz khoét cả
  cụm hai âm tiết, phông nhúng sẵn hiển thị đúng dấu chồng (ế, ộ, ữ).
- **Không xin quyền khi cài** — chỉ dùng `activeTab`; quyền rộng hơn chỉ hỏi khi
  bạn thật sự cần, và thu hồi được bất cứ lúc nào.

## Cài đặt

```
1. Tải/giải nén dự án ra một chỗ cố định trên máy (đừng xoá sau khi cài).
2. Mở Chrome → gõ  chrome://extensions  vào thanh địa chỉ.
3. Bật Developer mode (góc trên bên phải).
4. Bấm Load unpacked → chọn thư mục  lamp-reader/
5. Ghim icon Lamp vào thanh công cụ cho tiện.
```

Xong. Mở một bài báo bất kỳ và nhấn **Alt+R**, rồi `Space` để chạy.

## Tài liệu đầy đủ

Hướng dẫn sử dụng chi tiết, toàn bộ phím tắt, cách hoạt động bên trong và ghi chú
cho người sửa code nằm ở **[lamp-reader/README.md](lamp-reader/README.md)**.

## Cấu trúc kho

```
lamp-reader/     Extension — đây là thư mục bạn trỏ tới khi Load unpacked
test/            Bộ kiểm thử (không nằm trong extension)
```

## Kiểm thử

191 phép kiểm thử, chạy trên chính mã nguồn thật:

```bash
node test/engine.test.js          # 53 phép — logic thuần, không cần trình duyệt
python3 -m http.server 8899       # rồi mở các trang test/ trong trình duyệt
```

Chi tiết ở [phần Kiểm thử](lamp-reader/README.md#chạy-kiểm-thử) của tài liệu chính.

## Giấy phép

Xem [LICENSE](LICENSE). Phông chữ trong `lamp-reader/fonts/` phát hành theo giấy
phép SIL Open Font License, kèm bản gốc trong từng thư mục con. pdf.js
(`lamp-reader/vendor/`) theo giấy phép Apache 2.0 của Mozilla.
