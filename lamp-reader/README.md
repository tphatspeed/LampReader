# Lamp — Chrome Extension đọc nhanh RSVP

Đọc nhanh bất kỳ trang web nào bằng kỹ thuật RSVP (Rapid Serial Visual Presentation):
từng từ hiện lần lượt tại một vị trí cố định, mắt không phải di chuyển, giảm việc
đọc thầm trong đầu.

## Cài đặt (Load unpacked)

1. Giải nén thư mục `lamp-reader/` ra một chỗ cố định trên máy (đừng xoá sau khi cài).
2. Mở Chrome → gõ `chrome://extensions` vào thanh địa chỉ.
3. Bật **Developer mode** (góc trên bên phải).
4. Bấm **Load unpacked** → chọn thư mục `lamp-reader/`.
5. Ghim icon Lamp vào thanh công cụ cho tiện.

Xong. Mở một bài báo bất kỳ và nhấn **Alt+R**.

## Cách dùng

Trình đọc **không tự chạy** khi mở — nó dừng sẵn ở từ đầu tiên, chờ bạn nhấn `Space`.

| Thao tác | Kết quả |
|---|---|
| `Alt+R` | Mở trình đọc trên trang hiện tại (ở trạng thái dừng) |
| Bấm icon Lamp | Popup: đọc trang này, đọc file PDF, chỉnh tốc độ/số từ/cỡ chữ |
| Bôi đen đoạn văn → chuột phải | "Đọc nhanh đoạn này bằng Lamp" |
| `Space` | Phát / dừng |
| Bấm vào vùng chữ | Phát / dừng (vùng bấm lớn, tiện trên điện thoại) |
| `←` / `→` | Lùi / tiến 10 từ |
| `Shift` + `←` | Đọc lại câu hiện tại |
| `Shift` + `→` | Nhảy sang câu sau |
| `↑` / `↓` | Tăng / giảm tốc độ, bước 50 WPM |
| `+` / `-` | Tăng / giảm cỡ chữ, bước 4px |
| `S` | Mở bảng cài đặt |
| `R` | Đọc lại từ đầu |
| `Esc` | Đóng bảng cài đặt, hoặc đóng trình đọc |

Ba nút `−` / `+` ngay dưới nút phát chỉnh **tốc độ** (bước 50 WPM), **số từ mỗi lần**
(1–6) và **cỡ chữ** (24–120px). Vị trí đọc được lưu tự động theo từng trang, mở lại
là đọc tiếp chỗ cũ.

### Hai chế độ đọc

| Chế độ | Cách hoạt động | Nên dùng khi |
|---|---|---|
| **RSVP** | Từng cụm hiện ở giữa màn hình, mắt đứng yên | Tin tức, blog, đọc lần một để phân loại |
| **Dẫn dòng** | Giữ nguyên đoạn văn, vệt sáng chạy theo | Tài liệu khó, cần đọc lại và nhìn trước |

Đổi chế độ bằng thanh chọn trong dock hoặc phím `M`. Chế độ Dẫn dòng giữ lại được
hai thứ mà RSVP lấy mất: khả năng đọc lại và khả năng nhìn trước từ kế tiếp — nên
đây mới là chế độ dùng cho nội dung bạn cần thật sự hiểu.

### Dàn bài (nút danh sách, phím `O`)

Liệt kê toàn bộ tiêu đề mục của trang kèm vị trí phần trăm. Bấm vào là nhảy thẳng
tới đó. Bù lại phần cấu trúc văn bản mà RSVP xoá mất.

### Kiểm tra hiểu (phím `Q`)

Đọc xong sẽ tự hiện, hoặc bấm `Q` bất cứ lúc nào. Ứng dụng khoét một từ khỏi năm
câu bạn vừa đọc và đưa bốn phương án. Chấm xong sẽ gợi ý điều chỉnh tốc độ dựa
trên điểm số. Toàn bộ sinh tại chỗ, không gửi gì lên mạng.

Với tiếng Việt, ứng dụng khoét cả cụm hai âm tiết thay vì một âm tiết, vì khoét
"trực" trong "trực quan" thì câu hỏi vừa dễ vừa vô nghĩa.

### Bảng cài đặt (nút ⚙)

- **Phông chữ** — Hệ thống, Be Vietnam, Tahoma, Serif, Mono, hoặc gõ tên phông bất kỳ đã cài trên máy
- **Giao diện** — Giấy, Sepia, Xám, Đêm, Tương phản cao (đo theo WCAG: chữ/nền ≥ 7:1)
- **Giãn chữ** — nới khoảng cách giữa các ký tự, 0–12px
- **Giọng đọc** — bật text-to-speech, chữ chạy theo giọng qua sự kiện `onboundary`; chọn được giọng, tự ưu tiên giọng cùng ngôn ngữ với bài
- **Tô chữ trung tâm (ORP)** — điểm neo mắt, có thêm gạch chân nên không phụ thuộc riêng vào màu
- **Thanh dẫn** — hai vạch canh vị trí mắt
- **Nhịp dấu câu** — dừng cuối câu, câu càng dài dừng càng lâu
- **Xem ngữ cảnh** — hiện các từ xung quanh, mờ hơn
- **Khởi động chậm** — 40 cụm đầu chạy ở 65% tốc độ rồi tăng dần
- **Nhắc nghỉ mắt** — cứ 20 phút đọc thì dừng, đếm ngược 20 giây (quy tắc 20-20-20)
- **Thống kê** — số từ và thời gian đọc 7 ngày qua, WPM thực tế, và điểm kiểm tra theo từng mức tốc độ

### Tiếng Việt

Ứng dụng tự nhận diện văn bản tiếng Việt qua dấu thanh, rồi giảm nhịp 15%. Lý do:
tiếng Việt là ngôn ngữ đơn âm tiết, mỗi "từ" cách bởi dấu cách thường chỉ là một
âm tiết, nên cùng một mức WPM thì tiếng Việt trôi nhanh hơn tiếng Anh về mặt ý.

Muốn dùng phông cố định không phụ thuộc máy, xem `fonts/README.txt`.

## Hỗ trợ PDF

Thư viện pdf.js **đã được nhúng sẵn** trong `vendor/` (bản v6.2.108, dạng ES module).
Không cần tải thêm gì.

Có 2 cách mở:

- Bấm icon Lamp → **Đọc file PDF…** → chọn hoặc kéo thả file PDF từ máy.
- Đang mở một link `.pdf` trong Chrome → nhấn **Alt+R**, extension tự chuyển sang
  trang đọc PDF của nó.

Với PDF nằm trên máy (`file://`), cần bật thêm **Allow access to file URLs** trong
phần chi tiết của extension tại `chrome://extensions`.

Lưu ý: PDF dạng ảnh quét không có lớp chữ nên không trích xuất được — muốn hỗ trợ
thì cần thêm OCR (ví dụ Tesseract.js).

### Nếu muốn cập nhật pdf.js sau này

Tải bản *prebuilt* mới từ https://mozilla.github.io/pdf.js/getting_started/, rồi
thay 2 file trong `vendor/` và giữ đúng tên: `pdf.mjs` và `pdf.worker.mjs`.
Từ v4 trở đi pdf.js chỉ phát hành dạng ES module, nên `viewer.js` phải dùng
`import` chứ không dùng được biến toàn cục `pdfjsLib` như bản UMD đời cũ.

## Cấu trúc file

```
lamp-reader/
├── manifest.json          # Khai báo extension (Manifest V3)
├── background.js          # Service worker: nhận Alt+R, tiêm script vào tab
├── content/
│   ├── extractor.js       # Tách nội dung chính khỏi menu/quảng cáo/sidebar
│   ├── reader.js          # Engine RSVP + giao diện overlay (Shadow DOM)
│   └── overlay.css        # 3 theme màu cho overlay
├── popup/
│   ├── popup.html         # Bảng cài đặt khi bấm icon
│   └── popup.js
├── viewer/
│   ├── viewer.html        # Trang đọc PDF riêng
│   └── viewer.js          # Trích xuất chữ bằng pdf.js
├── vendor/                # pdf.mjs + pdf.worker.mjs (đã nhúng sẵn)
└── icons/
```

## Muốn sửa gì thì sửa ở đâu

| Muốn thay đổi | Sửa file |
|---|---|
| Thuật toán tách nội dung chính | `content/extractor.js`, hàm `scoreNode` |
| Thời gian dừng ở dấu câu | `content/reader.js`, hàm `delayFor` |
| Vị trí chấm ORP | `content/reader.js`, hàm `pivotIndex` |
| Màu sắc, theme, bố cục responsive | `content/overlay.css` |
| Cách ghép dòng PDF thành đoạn | `viewer/viewer.js`, hàm `itemsToParagraphs` |
| Phím tắt mặc định | `manifest.json`, mục `commands` |

Sau mỗi lần sửa: vào `chrome://extensions` → bấm **Reload** trên thẻ Lamp → tải lại trang web đang test.

## Ý tưởng mở rộng

- **Text-to-speech**: dùng Web Speech API (`speechSynthesis`) để nghe song song.
- **Lưu tiến trình**: ghi `{url, idx}` vào `chrome.storage.local`, đọc tiếp lần sau.
- **Thống kê**: đếm tổng số từ đã đọc mỗi ngày, hiển thị trong popup.
- **Chế độ bionic**: in đậm nửa đầu mỗi từ thay vì chỉ tô một ký tự.
- **Bỏ qua từ ngắn**: các từ như "và", "của", "là" hiển thị nhanh hơn.
