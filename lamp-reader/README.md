# Lamp — tài liệu sử dụng

Trình đọc nhanh RSVP cho Chrome. Trang này là tài liệu đầy đủ; xem
[README ở gốc](../README.md) nếu chỉ cần giới thiệu ngắn.

**Mục lục**

- [Cài đặt](#cài-đặt) · [Bắt đầu](#bắt-đầu) · [Phím tắt](#phím-tắt)
- [Hai chế độ đọc](#hai-chế-độ-đọc) · [Bốn công cụ để hiểu bài](#bốn-công-cụ-để-hiểu-bài)
- [Thư viện đọc dở](#thư-viện-đọc-dở) · [Bảng cài đặt](#bảng-cài-đặt)
- [Cách Lamp xử lý chữ](#cách-lamp-xử-lý-chữ) · [PDF và EPUB](#pdf-và-epub)
- [Quyền và dữ liệu](#quyền-và-dữ-liệu) · [So với SwiftRead](#so-với-swiftread)
- [Dành cho người sửa code](#dành-cho-người-sửa-code)

---

## Cài đặt

1. Giải nén dự án ra một chỗ cố định trên máy (đừng xoá sau khi cài).
2. Mở Chrome → gõ `chrome://extensions` vào thanh địa chỉ.
3. Bật **Developer mode** (góc trên bên phải).
4. Bấm **Load unpacked** → chọn thư mục `lamp-reader/`.
5. Ghim icon Lamp vào thanh công cụ cho tiện.

> Sau khi cập nhật mã nguồn, bấm **Reload** trên thẻ Lamp rồi **tải lại trang web
> đang test**. Nếu `manifest.json` đổi phần quyền thì phải **gỡ và cài lại** —
> Reload không áp dụng được quyền mới.

## Bắt đầu

Trình đọc **không tự chạy** khi mở — nó dừng sẵn ở từ đầu tiên, chờ bạn nhấn `Space`.

| Muốn | Làm |
|---|---|
| Đọc trang đang mở | `Alt+R`, hoặc bấm icon Lamp → **Đọc trang này** |
| Chỉ đọc một đoạn | Bôi đen đoạn đó → chuột phải → **Đọc nhanh đoạn này bằng Lamp** |
| Đọc file PDF / EPUB | Bấm icon Lamp → **Đọc file PDF…** → chọn hoặc kéo thả file |
| Đọc tiếp bài dang dở | Bấm icon Lamp → chọn trong danh sách **Đang đọc dở** |

`Alt+R` luôn đọc **cả trang**, kể cả khi trên trang đang có sẵn đoạn bôi đen sót
lại. Muốn đọc riêng một đoạn thì dùng menu chuột phải.

## Phím tắt

| Phím | Kết quả |
|---|---|
| `Space` | Phát / dừng (bấm vào vùng chữ cũng được — vùng bấm rất lớn) |
| `←` / `→` | Lùi / tiến 10 cụm |
| `Shift`+`←` | Đọc lại câu hiện tại |
| `Shift`+`→` | Nhảy sang câu sau |
| `↑` / `↓` | Tăng / giảm tốc độ, bước 50 WPM |
| `+` / `−` | Tăng / giảm cỡ chữ, bước 4px |
| `M` | Đổi chế độ đọc |
| `O` | Dàn bài |
| `Q` | Kiểm tra hiểu |
| `H` | Lưu câu đang đọc vào trích đoạn |
| `S` | Bảng cài đặt |
| `R` | Đọc lại từ đầu |
| `Esc` | Đóng bảng đang mở, hoặc đóng trình đọc |

Ba bộ `−`/`+` dưới nút phát chỉnh **tốc độ** (bước 50 WPM, 100–1200), **số từ mỗi
lần** (1–6) và **cỡ chữ** (24–120px).

Dùng `Tab` để chọn thanh tiến độ rồi lái bằng `←` `→` `PageUp` `PageDown` `Home`
`End` — toàn bộ trình đọc điều khiển được bằng bàn phím, không cần chuột.

## Hai chế độ đọc

| Chế độ | Cách hoạt động | Nên dùng khi |
|---|---|---|
| **RSVP** | Từng cụm hiện ở giữa màn hình, mắt đứng yên | Tin tức, blog, đọc lần một để phân loại |
| **Dẫn dòng** | Giữ nguyên đoạn văn, vệt sáng chạy theo | Tài liệu khó, cần đọc lại và nhìn trước |

Đổi bằng thanh chọn trong dock hoặc phím `M`.

RSVP đánh đổi hai thứ để lấy tốc độ: bạn không đọc lại được, và không nhìn thấy từ
kế tiếp. Chế độ **Dẫn dòng** giữ lại cả hai — nên đây mới là chế độ dùng cho nội
dung bạn cần thật sự hiểu.

**Dừng là thấy toàn bài.** Ở chế độ RSVP, mỗi lần dừng (`Space`, kéo thanh tiến độ,
lùi/tiến…) trình đọc tự hiện toàn bộ văn bản kèm vị trí đang đọc được tô sáng.
Bấm vào từ bất kỳ để nhảy thẳng tới đó; đọc tiếp là màn hình quay lại hiện từng cụm.

## Bốn công cụ để hiểu bài

### Dàn bài — phím `O`

Liệt kê toàn bộ tiêu đề mục kèm vị trí phần trăm, thụt lề theo cấp (h1/h2/h3 → 3
mức), và đánh dấu mục bạn đang đọc. Bấm là nhảy tới. Bù lại phần cấu trúc văn bản
mà RSVP xoá mất.

### Kiểm tra hiểu — phím `Q`

Đọc xong sẽ tự hiện, hoặc bấm `Q` bất cứ lúc nào. Ứng dụng khoét một từ khỏi các
câu bạn vừa đọc và đưa bốn phương án; số câu hỏi tăng theo lượng đã đọc (3–8 câu).

- Từ bị khoét chọn theo **độ hiếm trong bài**, không phải từ nằm giữa câu — khoét
  từ lặp đi lặp lại chỉ kiểm tra trí nhớ mặt chữ.
- Phương án nhiễu không bao giờ là từ có mặt trong chính câu đang hỏi.
- Sai câu nào thì **hiện lại nguyên câu gốc** kèm nút *Xem lại đoạn này* để nhảy về.
- Chấm xong gợi ý điều chỉnh tốc độ theo điểm số.

Toàn bộ sinh tại chỗ, không gọi mạng.

### Trích đoạn — phím `H`

Đang đọc bấm `H` là lưu nguyên câu hiện tại. Nút dấu trang trên thanh tiêu đề mở
danh sách: bấm một câu để nhảy về đúng chỗ, hoặc **Chép dạng Markdown** / **Tải
file .md** để đưa sang ứng dụng ghi chú. Lưu theo từng tài liệu, nằm ở máy bạn.

### Luyện tốc độ — bảng cài đặt → *Bắt đầu buổi luyện*

Đọc chính bài đang mở ở 3 mức tốc độ tăng dần (chậm hơn 100, mức hiện tại, nhanh
hơn 100 WPM). Hết mỗi vòng, ứng dụng kiểm tra hiểu ngay bằng 3 câu hỏi. Kết thúc
sẽ chỉ ra mức nhanh nhất mà bạn vẫn hiểu tốt (≥80%) và cho bấm một nút để dùng
luôn mức đó.

Độ dài mỗi vòng tự chia theo phần còn lại của bài, nên bài ngắn vẫn luyện được.
Đóng bảng giữa chừng thì tốc độ trở lại như trước khi luyện.

## Thư viện đọc dở

Bấm icon Lamp là thấy danh sách những bài bạn đọc dở, kèm phần trăm và thời gian.
Bấm một mục để mở lại và đọc tiếp đúng chỗ cũ.

Danh sách dựng từ chính dữ liệu tiến trình có sẵn — không có kho dữ liệu riêng
nào. Giữ 60 tài liệu gần nhất; bài nào đọc quá 95% thì tự ẩn đi.

Vị trí đọc lưu theo toạ độ **(khối, từ)** chứ không theo số thứ tự cụm, nên đổi
"số từ mỗi lần" cũng không mất chỗ đang đọc.

## Bảng cài đặt

Mở bằng nút ⚙ hoặc phím `S`. **Kéo được** bằng thanh tiêu đề (có vạch xám nhỏ ở
giữa để nhận ra) — kéo sang một bên để vẫn nhìn thấy chữ đang đọc trong lúc chỉnh
phông/cỡ chữ. Đóng rồi mở lại là bảng về vị trí mặc định.

| Mục | Nội dung |
|---|---|
| **Phông chữ** | Hệ thống, Be Vietnam, Tahoma, Serif (Literata), Noto Serif, Mono, hoặc gõ tên phông bất kỳ đã cài trên máy. Mỗi nút tự hiển thị bằng đúng phông nó đại diện; nút có dấu ⚠ nghĩa là file phông trong `fonts/` không nạp được |
| **Giao diện** | Theo hệ thống (tự đổi sáng/tối theo máy), Giấy, Sepia, Xám, Đêm, Tương phản cao |
| **Giãn chữ** | Nới khoảng cách giữa các ký tự, 0–12px |
| **Giọng đọc** | Bật text-to-speech, chữ chạy theo giọng qua sự kiện `onboundary`; chọn được giọng, tự ưu tiên giọng cùng ngôn ngữ với bài |

Các công tắc:

- **Tô chữ trung tâm (ORP)** — điểm neo mắt, có thêm gạch chân nên không phụ thuộc riêng vào màu
- **Thanh dẫn** — hai vạch canh vị trí mắt
- **Nhịp dấu câu** — dừng cuối câu, câu càng dài dừng càng lâu
- **Bỏ qua từ ngắn** — từ đệm ít nghĩa (và, của, là…) hiện nhanh hơn 40%, dồn thời gian cho từ mang nội dung
- **Xem ngữ cảnh** — hiện các từ xung quanh, mờ hơn
- **Khởi động chậm** — 40 cụm đầu chạy ở 65% tốc độ rồi tăng dần
- **Nhắc nghỉ mắt** — cứ 20 phút đọc thì dừng, đếm ngược 20 giây (quy tắc 20-20-20)

Cuối bảng là **Thống kê**: số từ và thời gian đọc 7 ngày qua, WPM thực tế, và điểm
kiểm tra theo từng mức tốc độ — đây là thứ giúp bạn tìm ngưỡng của riêng mình bằng
dữ liệu chứ không phải cảm giác.

Bảng màu đo theo WCAG (chữ/nền ≥ 7:1). Ghi chú vì sao chọn từng màu nằm trong
`content/overlay.css`.

## Cách Lamp xử lý chữ

### Tiếng Việt

Ứng dụng tự nhận diện văn bản tiếng Việt qua dấu thanh, rồi **giảm nhịp 15%**. Lý
do: tiếng Việt là ngôn ngữ đơn âm tiết, mỗi "từ" cách bởi dấu cách thường chỉ là
một âm tiết, nên cùng một mức WPM thì tiếng Việt trôi nhanh hơn tiếng Anh về mặt ý.

Vì vậy phần kiểm tra hiểu cũng khoét **cả cụm hai âm tiết** thay vì một âm tiết —
khoét "trực" trong "trực quan" thì câu hỏi vừa dễ vừa vô nghĩa.

Ước lượng thời gian còn lại và tốc độ giọng đọc đều tính theo nhịp thật (đã trừ
15%), không lấy thẳng số WPM.

### Ngoặc, ngoặc kép, dấu câu

Dấu `()`, `""`, `“”` bám ở đầu/cuối một từ được tách ra và tô nhạt hơn ở mọi chế
độ, để mắt lướt qua nhanh và để điểm neo ORP rơi đúng vào chữ cái chứ không rơi
trúng dấu. Ở RSVP, từ mở hoặc đóng một đoạn trong ngoặc/trích dẫn được giữ lâu hơn
một nhịp, đủ để nhận ra đây là phần chú thích chứ không phải mạch câu chính.

Không áp dụng cho dấu nháy đơn giữa từ (như "don't") để khỏi làm chậm nhầm từ viết tắt.

### Ngắt cụm

Một cụm không bao giờ vắt qua ranh giới câu, kể cả khi bạn đặt "số từ mỗi lần" lớn
— não cần mốc cuối câu để tổng hợp nghĩa, ghép "…hết. Câu mới…" vào một khung sẽ
phá mốc đó.

## PDF và EPUB

Bấm icon Lamp → **Đọc file PDF…** → chọn hoặc kéo thả file **PDF hoặc EPUB** từ máy.
Hoặc đang mở một link `.pdf` trong Chrome → nhấn `Alt+R`, extension tự chuyển sang
trang đọc riêng của nó.

**PDF.** Thư viện pdf.js đã nhúng sẵn trong `vendor/` (v6.2.108, dạng ES module) —
không cần tải thêm gì.

PDF không lưu "đoạn văn" hay "tiêu đề" — nó chỉ lưu từng mẩu chữ kèm toạ độ và
cỡ chữ. `content/pdftext.js` dựng ngược lại cấu trúc:

- **Nhận tiêu đề theo cỡ chữ thật**, không đoán theo độ dài chuỗi. Nhờ vậy dàn
  bài dùng được với PDF, và cấp tiêu đề (h1/h2/h3) suy ra từ thứ hạng cỡ chữ.
- **Đọc đúng thứ tự với PDF hai cột** (bài báo khoa học). Chữ cùng độ cao nhưng
  cách nhau một rãnh rộng được tách thành hai dòng khác nhau, rồi đọc hết cột
  trái mới sang cột phải.
- **Bỏ số trang và header/footer lặp.** So khớp sau khi thay chữ số bằng `#` nên
  "Trang 1"/"Trang 2" được nhận ra là cùng một thứ.
- **Giữ đoạn văn nguyên vẹn.** Chỉ cắt đoạn khi có khoảng trắng dọc rộng bất
  thường, đổi cỡ chữ, thụt đầu dòng, hoặc dòng cuối kết thúc bằng dấu câu *và*
  ngắn hơn hẳn bề rộng cột.

- File trên máy (`file://`): cần bật thêm **Allow access to file URLs** trong phần
  chi tiết của extension tại `chrome://extensions`.
- File từ đường dẫn trên mạng: lần đầu sẽ hiện nút **Cấp quyền rồi thử lại** (vì
  extension không xin sẵn quyền cho mọi tên miền).
- PDF dạng ảnh quét không có lớp chữ nên không trích xuất được — cần OCR
  (ví dụ Tesseract.js) mới đọc được.

**EPUB** đọc được mà không cần thư viện ngoài nào. EPUB vốn là file ZIP chứa XHTML,
và trình duyệt đã có sẵn `DecompressionStream("deflate-raw")` — đúng thuật toán ZIP
dùng — nên `content/epub.js` chỉ cần tự đọc bảng thư mục của ZIP rồi đi theo `spine`
trong file `.opf`. Nhờ vậy giữ được cả cấu trúc tiêu đề/đoạn/danh sách, dàn bài
dùng được luôn.

Các trường hợp đã xử lý riêng: `<br>` thành ngắt dòng thật (thơ, địa chỉ) thay
vì dính chữ; chú thích cuối trang và số tham chiếu chú thích bị loại khỏi mạch
đọc; ngôn ngữ lấy từ `dc:language` trong OPF thay vì đoán qua dấu thanh. Sách có
khoá bản quyền (DRM) được báo đúng lý do thay vì một lỗi khó hiểu.

## Quyền và dữ liệu

**Extension không xin quyền truy cập trang web nào khi cài.** `Alt+R`, nút trong
popup và menu chuột phải chạy được nhờ `activeTab` — quyền tạm, chỉ cho đúng tab
bạn đang mở, chỉ trong lúc bạn chủ động gọi.

Hai việc cần quyền rộng hơn, và chỉ hỏi đúng lúc cần:

- Mở lại một bài từ thư viện → xin quyền cho **riêng tên miền đó**.
- Tải PDF từ đường dẫn mạng → nút **Cấp quyền rồi thử lại** trong trang đọc PDF.

Muốn khỏi bị hỏi từng trang thì bấm **Cấp quyền** ở cuối popup một lần. Thu hồi
được bất cứ lúc nào, cũng ở đó.

Toàn bộ dữ liệu — tiến trình đọc, trích đoạn, thống kê, cài đặt — nằm trong
`chrome.storage` trên máy bạn. Không có máy chủ, không tài khoản, không gọi mạng.
Phần kiểm tra hiểu và luyện tốc độ sinh câu hỏi ngay tại chỗ.

## So với SwiftRead

Lamp bám theo bộ tính năng cốt lõi của SwiftRead (RSVP, dẫn dòng, giọng đọc, PDF,
chuột phải đọc đoạn bôi đen, tuỳ chỉnh phông/giao diện) và thêm những thứ SwiftRead
hoặc không có, hoặc tính tiền:

| | Lamp | SwiftRead |
|---|---|---|
| Giá | Miễn phí, không tài khoản | Bản trả phí ~$4/tháng cho tính năng đầy đủ |
| Giới hạn dùng | Không | Bản miễn phí có hạn mức theo ngày cho TTS/PDF/ePub |
| Dữ liệu | Chạy hoàn toàn tại máy | Dịch vụ đám mây, có tài khoản |
| Dữ liệu ra khỏi máy | Không có lệnh gọi mạng nào tới máy chủ ngoài | Khai báo trên Chrome Web Store là có thu thập *User activity* và *Website content* |
| Kiểm tra hiểu | Tự sinh từ chính bài vừa đọc, sai thì hiện lại câu gốc | Thư viện bài tập sau bản trả phí |
| Luyện tốc độ | Đọc bài này ở 3 mức WPM, quiz từng mức, chỉ ra mức phù hợp | Sau bản trả phí |
| Thống kê | Điểm kiểm tra theo từng mức WPM | Theo dõi tốc độ, không đối chiếu mức độ hiểu |
| Tiếng Việt | Nhận diện và giảm nhịp riêng, quiz theo cụm 2 âm tiết, phông xử lý dấu chồng | Như mọi ngôn ngữ Latin khác |
| Dàn bài | Có, thụt lề theo cấp, đánh dấu mục đang đọc | Không |
| Xem toàn văn khi dừng | Có | Không |
| Trích đoạn | Lưu bằng `H`, xuất Markdown | Không |
| EPUB | Có (tự đọc ZIP, không nhúng thư viện) | Có |

Chỗ SwiftRead vẫn hơn: đọc Kindle/Libby, giọng đọc AI chất lượng cao (Lamp dùng
giọng có sẵn của hệ điều hành), và có ứng dụng di động riêng.

---

# Dành cho người sửa code

## Cấu trúc file

```
lamp-reader/                 ← trỏ tới đây khi Load unpacked
├── manifest.json            Khai báo extension (Manifest V3)
├── background.js            Service worker: Alt+R, menu chuột phải, tiêm script
├── content/
│   ├── defaults.js          NGUỒN DUY NHẤT của cài đặt mặc định
│   ├── extractor.js         Tách nội dung chính khỏi menu/quảng cáo/sidebar
│   ├── engine.js            Logic thuần: token, nhịp đọc, dàn bài, sinh quiz
│   ├── epub.js              Đọc EPUB: tự giải nén ZIP, đi theo spine
│   ├── pdftext.js           Dựng cấu trúc từ mẩu chữ PDF: cột, đoạn, tiêu đề
│   ├── reader.js            Giao diện overlay RSVP (Shadow DOM)
│   └── overlay.css          5 bảng màu (+ tuỳ chọn theo hệ thống) và bố cục
├── popup/                   Popup khi bấm icon: thư viện, cài đặt nhanh, quyền
├── viewer/                  Trang đọc PDF/EPUB riêng
├── fonts/                   Be Vietnam Pro, Literata, Noto Serif (nhúng sẵn)
├── vendor/                  pdf.mjs + pdf.worker.mjs
└── icons/

test/                        ← KHÔNG nằm trong extension
├── engine.test.js           53 phép — logic thuần, chạy bằng node
├── harness.html             91 phép — trình đọc, chạy thật trong trình duyệt
├── popup.test.html          29 phép — popup, thư viện, cấp quyền
├── epub.test.html           32 phép — đọc EPUB
├── pdf.test.html            21 phép — trích xuất PDF, so bản cũ với bản mới
├── fixtures/                PDF/EPUB/ZIP mẫu + make_pdf.py (bộ sinh PDF)
├── serve.py                 Server tĩnh không cache — dùng cái này để test
└── demo.html                Bài viết mẫu để xem nhanh giao diện
```

Một điều đáng nhớ: **cài đặt mặc định chỉ khai báo ở `content/defaults.js`**. Trước
đây danh sách này bị chép ra bốn nơi và chúng lệch nhau lúc nào không hay — đó là
nguyên nhân lỗi "mở PDF là mất hết phông và giao diện đã chọn". Thêm tuỳ chọn mới
thì chỉ sửa ở đó.

## Chạy kiểm thử

Tổng cộng **226 phép kiểm thử**, chạy trên chính mã nguồn thật (chỉ giả lập API
`chrome`), không phải bản sao.

Phần logic thuần chạy thẳng bằng node:

```bash
node test/engine.test.js
```

Phần tích hợp cần được phục vụ qua HTTP (mở bằng `file://` sẽ bị chặn khi nạp CSS).
Từ thư mục gốc của dự án:

```bash
python3 test/serve.py
```

Dùng `test/serve.py` chứ đừng dùng `python3 -m http.server`: nó gửi header
`no-store` để trình duyệt không giữ lại bản `.js` cũ. Thiếu điều đó, bộ kiểm thử
sẽ âm thầm chạy trên mã nguồn lỗi thời và báo xanh sai.

Rồi mở lần lượt `harness.html`, `popup.test.html`, `epub.test.html`,
`pdf.test.html` dưới `http://localhost:8899/test/`. Mỗi trang tự lái giao diện
và in ra số phép đạt/hỏng.

`test/demo.html` mở sẵn trình đọc trên một bài mẫu để xem nhanh giao diện mà không
cần cài extension.

> Sửa code mà kết quả không đổi thì thêm `?cb=1` vào URL để bỏ qua cache.
> Nếu bộ kiểm thử chạy chậm bất thường, đưa tab ra trước — trình duyệt bóp timer
> của tab đang ẩn.

## Muốn sửa gì thì sửa ở đâu

| Muốn thay đổi | Sửa file |
|---|---|
| Thêm/đổi một tuỳ chọn cài đặt | `content/defaults.js` — chỉ sửa ở đây, 4 nơi còn lại tự lấy theo |
| Thuật toán tách nội dung chính | `content/extractor.js`, hàm `scoreNode` |
| Loại khối (tiêu đề/đoạn/danh sách) | `content/extractor.js`, hàm `blockType` |
| Thời gian dừng ở dấu câu / từ ngắn | `content/engine.js`, hàm `tokenDelay` |
| Cách sinh câu hỏi kiểm tra | `content/engine.js`, hàm `buildQuiz` |
| Vị trí chấm ORP | `content/reader.js`, hàm `pivotIndex` |
| Cách tô sáng chạy theo chữ | `content/reader.js`, hàm `highlightInto` |
| Nội dung hiện khi RSVP dừng | `content/reader.js`, `updateFocusOverlay` / `paintBlocksInto` |
| Tách/tô nhạt dấu ngoặc ở đầu-cuối từ | `content/reader.js`, hàm `splitWord` |
| Chia vòng luyện tốc độ | `content/reader.js`, hàm `planRounds` |
| Kéo bảng cài đặt/dàn bài/quiz | `content/reader.js`, `makeDraggable`; CSS `.sheet-head`, `.sheet.dragging` |
| Kiểm tra phông có nạp được không | `content/reader.js`, hàm `checkFonts` |
| Danh sách "đang đọc dở" | `popup/popup.js`, hàm `readLibrary` |
| Đọc EPUB / thêm định dạng khác | `content/epub.js`, hàm `parse` |
| Cách dựng cấu trúc từ PDF (cột, đoạn, tiêu đề) | `content/pdftext.js` |
| Màu sắc, theme, bố cục responsive | `content/overlay.css` |
| Phông chữ nhúng sẵn | `content/overlay.css` (các khối `@font-face`); xem `fonts/README.txt` |
| Phím tắt mặc định | `manifest.json`, mục `commands` |

## Vài chỗ dễ vấp

- **`@font-face` trong Shadow DOM bị bỏ qua.** Theo chuẩn CSS Scoping chỉ font
  set của document mới được dùng để so khớp, nên phông nhúng phải nạp bằng
  `FontFace` API rồi `document.fonts.add()` — xem `loadFonts()`. Khai trong CSS
  của overlay thì phông lặng lẽ không hiển thị mà không báo lỗi gì, và kiểm tra
  bằng `FontFace().load()` vẫn báo "ổn" vì nó không đi qua đường CSS. Muốn chắc
  thì phải **đo bề rộng chữ render ra**.
- **`getDocument()` của pdf.js v6 chỉ nhận object**, không nhận chuỗi URL trần
  như bản cũ. Truyền chuỗi vào là nó ném lỗi và rơi vào catch chung.
- **Overlay nằm trong Shadow DOM.** Listener bàn phím gắn ở `document` sẽ nhận
  `e.target` đã bị retarget về phần tử host (luôn là `DIV`), không bao giờ thấy
  `INPUT`. Muốn biết phần tử thật thì dùng `e.composedPath()[0]` — nếu không, gõ
  chữ vào ô nhập sẽ kích hoạt phím tắt.
- **`chrome.storage.sync` giới hạn 120 lượt ghi/phút.** Giữ phím `↑` là bàn phím
  tự lặp ~30 lần/giây, chưa tới 5 giây đã vượt hạn mức. Mọi lượt ghi đều được gộp
  (debounce) và ghi ngay khi đóng trình đọc hoặc rời trang.
- **`block.type` là bắt buộc.** `buildOutline` và `paintBlocksInto` đều phân nhánh
  theo nó; thiếu trường này thì dàn bài rỗng và mọi khối bị vẽ thành `<p>`.
- **Cập nhật pdf.js:** tải bản *prebuilt* mới từ
  <https://mozilla.github.io/pdf.js/getting_started/>, thay 2 file trong `vendor/`
  và giữ đúng tên `pdf.mjs` + `pdf.worker.mjs`. Từ v4 trở đi pdf.js chỉ phát hành
  dạng ES module, nên `viewer.js` phải dùng `import` chứ không dùng được biến toàn
  cục `pdfjsLib` như bản UMD đời cũ.

## Ý tưởng mở rộng

- **OCR cho PDF ảnh quét** — Tesseract.js, đổi lại gói cài nặng thêm đáng kể.
- **Tính nhịp theo âm tiết thay vì ký tự** — với tiếng Việt, thời lượng một cụm
  hiện tính theo độ dài chuỗi (`engine.js`, `tokenDelay`); đếm âm tiết thật sẽ sát
  hơn vì độ dài ký tự không phản ánh đúng số nhịp cần đọc.
- **Đồng bộ tiến trình giữa các máy** — hiện lưu ở `storage.local`. Chuyển sang
  `storage.sync` được, nhưng phải cắt bớt vì quota chỉ 100KB.
- **Đa ngôn ngữ giao diện** — hiện hardcode tiếng Việt; cần `_locales` nếu muốn
  đưa lên Chrome Web Store cho người dùng quốc tế.
