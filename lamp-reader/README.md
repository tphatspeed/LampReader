# Lamp — tài liệu sử dụng

Trình đọc nhanh RSVP cho Chrome. Trang này là tài liệu đầy đủ; xem
[README ở gốc](../README.md) nếu chỉ cần giới thiệu ngắn.

*Tài liệu cho phiên bản **2.0.0**.*

**Mục lục**

- [Cài đặt](#cài-đặt) · [Bắt đầu](#bắt-đầu) · [Phím tắt](#phím-tắt)
- [Hai chế độ đọc](#hai-chế-độ-đọc) · [Bốn công cụ để hiểu bài](#bốn-công-cụ-để-hiểu-bài)
- [Thư viện đọc dở](#thư-viện-đọc-dở) · [Bảng cài đặt](#bảng-cài-đặt)
- [Cách Lamp xử lý chữ](#cách-lamp-xử-lý-chữ) · [PDF và EPUB](#pdf-và-epub)
- [Quyền và dữ liệu](#quyền-và-dữ-liệu) · [So với SwiftRead](#so-với-swiftread)
- [Dành cho người sửa code](#dành-cho-người-sửa-code)

---

## Ngôn ngữ

Giao diện có **tiếng Việt và tiếng Anh**, đổi trong bảng cài đặt (mục *Ngôn ngữ
giao diện*). Mặc định là **Theo trình duyệt**: máy đặt tiếng Việt thì ra tiếng
Việt, còn lại ra tiếng Anh.

Đây là bộ từ điển riêng của Lamp (`content/i18n.js`) chứ không dùng
`chrome.i18n` — API đó bám theo ngôn ngữ trình duyệt và **không đổi được lúc
chạy**, trong khi Lamp cần cho bạn tự chọn.

> **Ngôn ngữ giao diện khác ngôn ngữ nội dung.** Đọc bài tiếng Anh trong giao
> diện tiếng Việt vẫn chạy đúng nhịp tiếng Anh — xem
> [Cách Lamp xử lý chữ](#cách-lamp-xử-lý-chữ).

**Thêm một ngôn ngữ mới** — chép khối `en` trong `content/i18n.js`, đổi khoá
thành mã ngôn ngữ, dịch phần giá trị, rồi thêm tên vào `LANG_NAMES` (viết bằng
chính ngôn ngữ đó). Bộ chọn trong cài đặt tự liệt kê theo từ điển, không phải
sửa gì thêm. Khoá nào thiếu thì tự rơi về tiếng Anh nên không sợ vỡ giao diện.

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

Lamp mở trong một **cửa sổ đọc riêng**, không phủ lên trang web bạn đang xem.
Trang gốc vẫn chạy tiếp phía sau (video tự phát, thông báo, script cuộn trang)
và CSS của nó có thể xung đột với overlay — tách hẳn ra thì môi trường đọc sạch
và ổn định, lại xếp cạnh cửa sổ khác được. Cửa sổ nhớ kích thước/vị trí cho lần
sau, và mở bài mới thì dùng lại đúng cửa sổ đó chứ không rải thêm cửa sổ mới.

Muốn quay lại kiểu cũ (phủ overlay lên trang), tắt **Mở ở cửa sổ riêng** trong
bảng cài đặt.

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

Mỗi mục có thêm **nút `?` kiểm tra riêng mục đó** — đọc xong một chương là hỏi
ngay chương đó, không phải đọc hết bài mới kiểm tra được. Bấm nút này không làm
nhảy vị trí đang đọc.

### Kiểm tra hiểu — phím `Q`

Đọc xong sẽ tự hiện, hoặc bấm `Q` bất cứ lúc nào — **không cần đọc hết bài**.
Bảng kiểm tra có bộ chọn phạm vi **Phần đã đọc / Cả bài**; chưa đọc đủ thì tự
chuyển sang *Cả bài* thay vì từ chối tạo câu hỏi.

**Mỗi lần mở là một bộ câu khác.** Câu được chọn ngẫu nhiên trong từng khoảng
của bài, từ bị khoét lấy ngẫu nhiên trong nhóm từ hiếm, và thứ tự các dạng cũng
đảo — nên làm lại để ôn được, không lặp y hệt. Chấm xong có nút **↻ Bộ câu hỏi
khác**.

Số câu hỏi tăng theo lượng nội dung (3–8 câu), trộn **năm dạng** để không đoán
được bằng ngữ pháp:

| Dạng | Hỏi gì | Vì sao khó đoán |
|---|---|---|
| **Điền từ** | Từ còn thiếu trong câu | Từ bị khoét chọn theo *độ hiếm trong bài*; nhiễu cùng số âm tiết và không có mặt trong chính câu đang hỏi |
| **Số liệu** | Con số còn thiếu | Nhiễu là chính con số đó bị bóp méo (×2, ×10, ±1) — không nhớ thì không chọn được |
| **Câu nào đúng** | Bốn câu gần giống hệt, chọn câu khớp bài | Ba câu kia bị đổi đúng một từ khoá; ngữ pháp đều đúng cả bốn |
| **Ý của mục** | Mục này mở đầu bằng ý nào | Nhiễu là câu mở đầu của các mục *khác* — phải nắm bố cục bài |
| **Thứ tự** | Ý nào được nhắc tới trước nhất | Kiểm tra mạch bài, không kiểm tra từ ngữ |

Ba dạng sau không thể đoán bằng ngữ pháp — đó là lý do chúng được thêm vào.
Tiêu đề bị loại khỏi kho câu hỏi (khoét từ trong nhan đề thì vô nghĩa), và một
câu không bao giờ vắt qua ranh giới khối để đáp án không chứa sẵn tên mục.

Sai câu nào thì **hiện lại nguyên câu gốc** kèm nút *Xem lại đoạn này* để nhảy
về. Chấm xong gợi ý điều chỉnh tốc độ theo điểm số. Toàn bộ sinh tại chỗ, không
gọi mạng.

### Trích đoạn — nút dấu trang hoặc phím `H`

Hai cách lưu câu đang đọc: nhấn `H` bất cứ lúc nào, hoặc mở nút **dấu trang**
trên thanh tiêu đề rồi bấm **＋ Lưu câu đang đọc** (có xem trước câu sắp lưu).
Nút dấu trang mang **huy hiệu đếm** số câu đã lưu.

Trong danh sách: bấm một câu để nhảy về đúng chỗ, hoặc **Chép dạng Markdown** /
**Tải file .md** để đưa sang ứng dụng ghi chú. Lưu theo từng tài liệu, ở máy bạn.

Đang đứng ở tiêu đề mà bấm lưu thì Lamp tự nhảy tới câu nội dung đầu tiên của
mục đó — lưu nguyên cái nhan đề thì chẳng để làm gì.

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

### Ngôn ngữ của nội dung

Lamp tự nhận ra bài đang đọc thuộc ngôn ngữ nào rồi chỉnh cách đọc theo — độc lập
với ngôn ngữ giao diện. Nguồn nào khai sẵn (EPUB có `dc:language`) thì tin nó,
không thì đoán qua mặt chữ.

| | Tiếng Việt | Tiếng Anh | Trung / Nhật / Hàn |
|---|---|---|---|
| Nhịp đọc | −15% | chuẩn | −45% |
| Quiz khoét | cụm 2 âm tiết | 1 từ | 1 từ |
| Tách từ | dấu cách | dấu cách | `Intl.Segmenter` |
| Giọng đọc ưu tiên | `vi-*` | `en-*` | `zh-*` |

**Vì sao tiếng Việt chậm hơn:** đây là ngôn ngữ đơn âm tiết, mỗi "từ" cách bởi
dấu cách thường chỉ là một âm tiết, nên cùng một mức WPM thì trôi nhanh hơn tiếng
Anh về mặt ý. Cũng vì thế quiz khoét cả cụm hai âm tiết — khoét "trực" trong
"trực quan" thì câu hỏi vừa dễ vừa vô nghĩa.

**Vì sao CJK cần xử lý riêng:** tiếng Trung/Nhật viết liền, không tách từ bằng
dấu cách. Cắt theo `split(/\s+/)` sẽ ra nguyên cả đoạn văn thành một "từ" và RSVP
thành vô dụng, nên Lamp dùng `Intl.Segmenter` — bộ tách từ có sẵn của trình duyệt.
Dấu câu toàn giác `。！？` cũng được tính là kết câu.

Ước lượng thời gian còn lại và tốc độ giọng đọc đều tính theo nhịp thật của ngôn
ngữ đó, không lấy thẳng số WPM.

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
│   ├── i18n.js              Từ điển giao diện (vi/en) + hàm dịch
│   ├── extractor.js         Tách nội dung chính khỏi menu/quảng cáo/sidebar
│   ├── engine.js            Logic thuần: token, nhịp đọc, dàn bài, sinh quiz
│   ├── epub.js              Đọc EPUB: tự giải nén ZIP, đi theo spine
│   ├── pdftext.js           Dựng cấu trúc từ mẩu chữ PDF: cột, đoạn, tiêu đề
│   ├── reader.js            Giao diện trình đọc RSVP (Shadow DOM)
│   └── overlay.css          5 bảng màu (+ tuỳ chọn theo hệ thống) và bố cục
├── reader/                  Cửa sổ đọc riêng (mặc định) — reader.html + boot.js
├── popup/                   Popup khi bấm icon: thư viện, cài đặt nhanh, quyền
├── viewer/                  Trang đọc PDF/EPUB riêng
├── fonts/                   Be Vietnam Pro, Literata, Noto Serif (nhúng sẵn)
├── _locales/                Tên & mô tả extension hiện trong Chrome (vi, en)
├── vendor/                  pdf.mjs + pdf.worker.mjs
└── icons/

test/                        ← KHÔNG nằm trong extension
├── run-all.sh               CHẠY TẤT CẢ bằng một lệnh
├── run-browser.js           Lái Chrome headless để chạy các bộ .html
├── swmock.js                Chrome giả lập cho ngữ cảnh service worker
├── qa.test.js               37 phép — toàn vẹn gói: manifest, _locales, dịch, rác
├── serviceworker.test.js    77 phép — background.js trong ngữ cảnh SW thật (node)
├── engine.test.js           60 phép — logic thuần, chạy bằng node
├── i18n.test.js             33 phép — từ điển, hồ sơ ngôn ngữ, tách từ CJK (node)
├── harness.html            136 phép — trình đọc, chạy thật trong trình duyệt
├── window.test.html         20 phép — cửa sổ đọc riêng: boot, khoá tài liệu, trích đoạn
├── popup.test.html          43 phép — popup, thư viện, cấp quyền, gom nhịp ghi
├── epub.test.html           33 phép — đọc EPUB
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

Tổng cộng **460 phép kiểm thử**, chạy trên chính mã nguồn thật (chỉ giả lập API
`chrome`), không phải bản sao. Một lệnh là xong:

```bash
bash test/run-all.sh
```

Script tự bật server tĩnh, chạy bốn bộ bằng node, rồi chạy năm bộ còn lại trong
Chrome headless, và tự dọn. Toàn bộ mất khoảng **25 giây**.

Muốn chạy lẻ:

```bash
node test/qa.test.js              # toàn vẹn gói — chạy trước khi đóng gói
node test/serviceworker.test.js   # background.js trong ngữ cảnh service worker
node test/engine.test.js
node test/i18n.test.js
```

```bash
python3 test/serve.py &           # cần cho các bộ chạy trong trình duyệt
node test/run-browser.js          # chạy hết
node test/run-browser.js harness  # hoặc một bộ
```

Dùng `test/serve.py` chứ đừng dùng `python3 -m http.server`: nó gửi header
`no-store` để trình duyệt không giữ lại bản `.js` cũ. Thiếu điều đó, bộ kiểm thử
sẽ âm thầm chạy trên mã nguồn lỗi thời và báo xanh sai.

### Vì sao phải có `run-browser.js`

Các bộ `.html` dùng `setTimeout` thật để chờ hiệu ứng và storage lắng xuống.
Chrome **bóp nhịp bộ đếm của tab không hiển thị**: xuống ~1 lần/giây, rồi
**1 lần mỗi phút** sau 5 phút ẩn. Mở tab ngầm rồi ngồi đợi thì bộ 136 phép bò
suốt hàng giờ và trông y như treo cứng — đã mất thời gian vì đúng chuyện này
nhiều lần.

`run-browser.js` bật Chrome headless kèm ba cờ `--disable-background-timer-throttling`,
`--disable-backgrounding-occluded-windows`, `--disable-renderer-backgrounding`
rồi lái bằng giao thức DevTools. Cùng bộ đó chạy xong trong **14 giây**.

Vẫn mở tay được: `http://localhost:8899/test/harness.html` — nhưng **phải để tab
hiển thị**, nếu không sẽ gặp đúng cảnh trên.

`test/demo.html` mở sẵn trình đọc trên một bài mẫu để xem nhanh giao diện mà không
cần cài extension.

## Muốn sửa gì thì sửa ở đâu

| Muốn thay đổi | Sửa file |
|---|---|
| Thêm/đổi một tuỳ chọn cài đặt | `content/defaults.js` — chỉ sửa ở đây, 4 nơi còn lại tự lấy theo |
| Sửa chữ hiển thị / thêm ngôn ngữ | `content/i18n.js` |
| Cách đọc theo từng ngôn ngữ nội dung | `content/engine.js`, hằng `PROFILES` |
| Thuật toán tách nội dung chính | `content/extractor.js`, hàm `scoreNode` |
| Loại khối (tiêu đề/đoạn/danh sách) | `content/extractor.js`, hàm `blockType` |
| Thời gian dừng ở dấu câu / từ ngắn | `content/engine.js`, hàm `tokenDelay` |
| Thêm/sửa một DẠNG câu hỏi | `content/engine.js`, các hàm `make…` rồi khai vào `groups` trong `buildQuiz` |
| Kích thước cửa sổ đọc mặc định | `background.js`, hằng `DEFAULT_BOUNDS` |
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
- **File nạp vào service worker KHÔNG được chạm `window`/`document`.** Service
  worker không có hai thứ đó; một dòng `if (window.x) return;` trong file được
  `importScripts` là đủ để Chrome từ chối với thông báo cụt lủn *"Service worker
  registration failed. Status code: 15"* — không nói file nào, dòng nào. Dùng
  `self` thay thế. `test/serviceworker.test.js` dựng đúng ngữ cảnh đó và quét
  tĩnh mã nguồn để chặn lỗi này tái diễn.
- **Đừng để `.DS_Store` lọt vào `_locales/`.** Chrome duyệt thư mục con của
  `_locales` để tìm ngôn ngữ; file rác của Finder ở đó gây lỗi nạp locale. Xoá
  bằng `find lamp-reader -name .DS_Store -delete` trước khi đóng gói.
- **`chrome.contextMenus.create` không có bản "tạo-hoặc-cập-nhật".** Gọi hai lần
  cùng một id là lỗi *"Cannot create item with duplicate id"*. Chrome áp dụng
  `removeAll` ngay khi nhận lệnh nhưng trả callback sau, nên hai lượt dựng menu
  chồng nhau sẽ cùng thấy menu trống rồi cùng tạo. Mọi lượt dựng menu phải xếp
  hàng nối đuôi (`menuQueue` trong `background.js`).
- **Callback của API Chrome phải ĐỌC `runtime.lastError`.** Không đọc thì Chrome
  ghi *"Unchecked runtime.lastError"* lên trang lỗi của extension — người dùng mở
  ra thấy báo đỏ dù mọi thứ vẫn chạy. `test/qa.test.js` quét chuyện này.
- **Service worker MV3 bị tắt sau ~30 giây rảnh, mất sạch biến toàn cục.** Mã cửa
  sổ đọc từng nằm trong một `let`, nên chỉ cần rảnh nửa phút là mở bài tiếp theo
  lại đẻ thêm cửa sổ, và "nhớ kích thước cửa sổ" gần như không bao giờ chạy. Thứ
  gì cần sống lâu hơn một lần thức dậy thì phải cất vào `chrome.storage.session`.
- **Listener `async` phải tự bọc `try`.** Chrome không bắt giúp: một lời hứa bị từ
  chối trong `chrome.commands.onCommand` sẽ nổi thẳng lên trang lỗi của extension.
- **Đừng đặt tên hàm dịch là `t`.** `t` đã được dùng làm biến token ở rất nhiều
  hàm trong `reader.js`; biến cục bộ sẽ che mất hàm dịch và gây `t is not a
  function` lúc chạy. Trong mã dùng tên `tr`.
- **Chuỗi đã dịch không được tính ở cấp module.** `const` cấp module chỉ chạy một
  lần lúc nạp file, nên đổi ngôn ngữ xong nhãn vẫn giữ ngôn ngữ cũ. Giữ khoá
  (`labelKey`) rồi dịch lúc dựng giao diện — xem `FONTS` và `THEME_LABEL()`.
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
