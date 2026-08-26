# Lamp — Chrome Extension đọc nhanh RSVP

Đọc nhanh bất kỳ trang web nào bằng kỹ thuật RSVP (Rapid Serial Visual Presentation):
từng từ hiện lần lượt tại một vị trí cố định, mắt không phải di chuyển, giảm việc
đọc thầm trong đầu.

## So với SwiftRead

Lamp bám theo bộ tính năng cốt lõi của SwiftRead (RSVP, dẫn dòng, giọng đọc,
PDF, chuột phải đọc đoạn bôi đen, tuỳ chỉnh phông/giao diện) và thêm những thứ
SwiftRead hoặc không có, hoặc tính tiền:

| | Lamp | SwiftRead |
|---|---|---|
| Giá | Miễn phí, không tài khoản | Bản trả phí ~$4/tháng cho tính năng đầy đủ |
| Giới hạn dùng | Không | Bản miễn phí có hạn mức theo ngày cho TTS/PDF/ePub |
| Dữ liệu | Chạy hoàn toàn tại máy, không gửi gì lên mạng | Dịch vụ đám mây |
| Kiểm tra hiểu | Tự sinh câu hỏi từ chính bài vừa đọc, chấm xong gợi ý tốc độ | Thư viện bài tập nằm sau bản trả phí |
| Thống kê | Điểm kiểm tra theo từng mức WPM — tìm ngưỡng của riêng bạn | Theo dõi tốc độ, không đối chiếu mức độ hiểu |
| Tiếng Việt | Tự nhận diện, giảm nhịp 15%, quiz khoét cả cụm 2 âm tiết, phông xử lý dấu chồng | Xử lý như mọi ngôn ngữ Latin khác |
| Dàn bài | Có, thụt lề theo cấp tiêu đề, đánh dấu mục đang đọc | Không |
| Xem toàn văn khi dừng | Có — dừng là hiện cả bài kèm vị trí đang đọc | Không |

Chỗ SwiftRead vẫn hơn: đọc ePub/Kindle/Libby, giọng đọc AI chất lượng cao (Lamp
dùng giọng có sẵn của hệ điều hành), và có ứng dụng di động riêng.

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
| `Alt+R` | Mở trình đọc trên trang hiện tại (ở trạng thái dừng), luôn đọc cả trang |
| Bấm icon Lamp | Popup: đọc trang này, đọc file PDF, chỉnh tốc độ/số từ/cỡ chữ |
| Bôi đen đoạn văn → chuột phải | "Đọc nhanh đoạn này bằng Lamp" — chỉ đọc đúng đoạn đã chọn |
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

Ở chế độ RSVP, mỗi lần dừng (`Space`, kéo thanh tiến độ, lùi/tiến...) trình đọc
tự hiện toàn bộ văn bản kèm vị trí đang đọc được tô sáng, giống hệt chế độ Dẫn
dòng — giúp nắm lại mạch bài trước khi đọc tiếp. Bấm vào một từ bất kỳ trong lúc
này để nhảy thẳng tới đó; bấm `Space` hoặc chỗ trống để đọc tiếp là màn hình
quay lại hiện từng từ như bình thường.

### Dàn bài (nút danh sách, phím `O`)

Liệt kê toàn bộ tiêu đề mục của trang kèm vị trí phần trăm, thụt lề theo cấp
(h1/h2/h3 → 3 mức), và đánh dấu mục bạn đang đọc. Bấm vào là nhảy thẳng tới đó.
Bù lại phần cấu trúc văn bản mà RSVP xoá mất.

Phím `Home` / `End` / `PageUp` / `PageDown` điều khiển được thanh tiến độ khi nó
đang được chọn (Tab tới) — dùng được hoàn toàn bằng bàn phím.

### Kiểm tra hiểu (phím `Q`)

Đọc xong sẽ tự hiện, hoặc bấm `Q` bất cứ lúc nào. Ứng dụng khoét một từ khỏi năm
câu bạn vừa đọc và đưa bốn phương án. Chấm xong sẽ gợi ý điều chỉnh tốc độ dựa
trên điểm số. Toàn bộ sinh tại chỗ, không gửi gì lên mạng.

Với tiếng Việt, ứng dụng khoét cả cụm hai âm tiết thay vì một âm tiết, vì khoét
"trực" trong "trực quan" thì câu hỏi vừa dễ vừa vô nghĩa.

### Bảng cài đặt (nút ⚙)

Kéo được bằng thanh tiêu đề (có vạch xám nhỏ ở giữa để nhận ra) — kéo sang một
bên hoặc lên trên để vẫn nhìn thấy chữ đang đọc trong lúc chỉnh phông/cỡ chữ.
Đóng rồi mở lại là bảng về đúng vị trí mặc định.

- **Phông chữ** — Hệ thống, Be Vietnam, Tahoma, Serif (Literata), Noto Serif, Mono, hoặc gõ tên phông bất kỳ đã cài trên máy. Mỗi nút tự hiển thị bằng đúng phông nó đại diện; nút nào có dấu ⚠ nghĩa là file phông trong `fonts/` không nạp được (xem `fonts/README.txt`)
- **Giao diện** — Giấy, Sepia, Xám, Đêm, Tương phản cao (đo theo WCAG: chữ/nền ≥ 7:1, xem thêm ghi chú tương phản trong `content/overlay.css`)
- **Giãn chữ** — nới khoảng cách giữa các ký tự, 0–12px
- **Giọng đọc** — bật text-to-speech, chữ chạy theo giọng qua sự kiện `onboundary`; chọn được giọng, tự ưu tiên giọng cùng ngôn ngữ với bài
- **Tô chữ trung tâm (ORP)** — điểm neo mắt, có thêm gạch chân nên không phụ thuộc riêng vào màu
- **Chế độ Bionic** — in đậm khoảng 45% đầu mỗi từ thay cho tô điểm neo, mắt bắt phần đầu rồi não tự đoán phần còn lại
- **Thanh dẫn** — hai vạch canh vị trí mắt
- **Nhịp dấu câu** — dừng cuối câu, câu càng dài dừng càng lâu
- **Bỏ qua từ ngắn** — từ đệm ít nghĩa (và, của, là...) hiện nhanh hơn 40%, dồn thời gian cho từ mang nội dung
- **Xem ngữ cảnh** — hiện các từ xung quanh, mờ hơn
- **Khởi động chậm** — 40 cụm đầu chạy ở 65% tốc độ rồi tăng dần
- **Nhắc nghỉ mắt** — cứ 20 phút đọc thì dừng, đếm ngược 20 giây (quy tắc 20-20-20)
- **Thống kê** — số từ và thời gian đọc 7 ngày qua, WPM thực tế, và điểm kiểm tra theo từng mức tốc độ

### Ngoặc, ngoặc kép, dấu câu

Dấu `()`, `""`, `“”` bám ở đầu/cuối một từ được tách ra và tô nhạt hơn (ở mọi
chế độ) để mắt lướt qua nhanh, không lẫn vào nội dung chính — và không làm
lệch điểm neo ORP/độ đậm Bionic vào đúng dấu thay vì chữ cái. Ở RSVP, từ mở
hoặc đóng một đoạn trong ngoặc/trích dẫn được giữ lại lâu hơn một nhịp, để
kịp nhận ra đây là phần chú thích chứ không phải mạch câu chính. Không áp
dụng cho dấu nháy đơn giữa từ (như "don't") để khỏi làm chậm nhầm từ viết tắt.

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
│   ├── defaults.js        # NGUỒN DUY NHẤT của cài đặt mặc định (dùng chung cả 4 nơi)
│   ├── extractor.js       # Tách nội dung chính khỏi menu/quảng cáo/sidebar
│   ├── engine.js          # Logic thuần: token, nhịp đọc, dàn bài, sinh quiz
│   ├── reader.js          # Giao diện overlay RSVP (Shadow DOM)
│   └── overlay.css        # 5 theme màu + bố cục overlay
├── fonts/                 # Be Vietnam Pro, Literata, Noto Serif (nhúng sẵn)
├── popup/
│   ├── popup.html         # Bảng cài đặt khi bấm icon
│   └── popup.js
├── viewer/
│   ├── viewer.html        # Trang đọc PDF riêng
│   └── viewer.js          # Trích xuất chữ bằng pdf.js
├── vendor/                # pdf.mjs + pdf.worker.mjs (đã nhúng sẵn)
└── icons/

test/                      # Chỉ dùng khi phát triển, KHÔNG nằm trong extension
├── harness.html           # 50 phép kiểm thử tích hợp, chạy thật trong trình duyệt
└── demo.html              # Bài viết mẫu để xem nhanh giao diện
```

### Chạy kiểm thử

Thư mục `test/` cần được phục vụ qua HTTP (mở thẳng bằng `file://` sẽ bị chặn
khi nạp CSS). Từ thư mục gốc của dự án:

```bash
python3 -m http.server 8899
```

Rồi mở `http://localhost:8899/test/harness.html` — trang tự chạy và in ra
số phép kiểm thử đạt/hỏng. `test/demo.html` mở sẵn trình đọc trên một bài mẫu
để xem nhanh giao diện mà không cần cài extension.

## Muốn sửa gì thì sửa ở đâu

| Muốn thay đổi | Sửa file |
|---|---|
| Thêm/đổi một tuỳ chọn cài đặt | `content/defaults.js` — chỉ sửa ở đây, 4 nơi còn lại tự lấy theo |
| Thuật toán tách nội dung chính | `content/extractor.js`, hàm `scoreNode` |
| Loại khối (tiêu đề/đoạn/danh sách) | `content/extractor.js`, hàm `blockType` |
| Cách tô sáng chạy theo chữ | `content/reader.js`, hàm `highlightInto` |
| Thời gian dừng ở dấu câu / từ ngắn | `content/engine.js`, hàm `tokenDelay` |
| Vị trí chấm ORP / độ dài bôi đậm Bionic | `content/reader.js`, hàm `pivotIndex` / `bionicSplit` |
| Nội dung focus view khi RSVP dừng | `content/reader.js`, hàm `updateFocusOverlay`, `paintBlocksInto` |
| Phông chữ nhúng sẵn (Be Vietnam, Serif, Noto Serif) | `content/overlay.css`, các khối `@font-face`; xem `fonts/README.txt` |
| Kiểm tra phông có nạp được không | `content/reader.js`, hàm `checkFonts` |
| Tách/tô nhạt dấu ngoặc, ngoặc kép ở đầu-cuối từ | `content/reader.js`, hàm `splitWord` |
| Kéo bảng cài đặt/dàn bài/quiz | `content/reader.js`, hàm `makeDraggable`; CSS `.sheet-head`, `.sheet.dragging` |
| Màu sắc, theme, bố cục responsive | `content/overlay.css` |
| Cách ghép dòng PDF thành đoạn | `viewer/viewer.js`, hàm `itemsToParagraphs` |
| Phím tắt mặc định | `manifest.json`, mục `commands` |

Sau mỗi lần sửa: vào `chrome://extensions` → bấm **Reload** trên thẻ Lamp → tải lại trang web đang test.

## Ý tưởng mở rộng

- **Tính thời lượng theo âm tiết thay vì ký tự** — với tiếng Việt, thời gian hiện
  một cụm hiện tính theo độ dài chuỗi ký tự (`content/engine.js`, `tokenDelay`);
  chính xác hơn nếu tính theo số âm tiết thật, vì độ dài ký tự không phản ánh
  đúng số "nhịp" cần đọc.
