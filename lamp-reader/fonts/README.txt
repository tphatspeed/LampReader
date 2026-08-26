Thư mục này để thả file phông chữ nếu bạn muốn Lamp dùng một phông cố định,
không phụ thuộc vào phông đã cài trên máy.

CÁCH LÀM
1. Vào Google Fonts, tải nguyên thư mục của phông muốn dùng (bấm "Get font"
   > "Download all"), rồi giải nén thẳng vào đây — GIỮ NGUYÊN tên thư mục
   và tên file, không cần đổi tên gì cả:
   - Be Vietnam Pro  https://fonts.google.com/specimen/Be+Vietnam+Pro
     → fonts/Be_Vietnam_Pro/BeVietnamPro-Regular.ttf (+ SemiBold, Bold)
   - Literata        https://fonts.google.com/specimen/Literata
     → fonts/Literata/Literata-VariableFont_opsz,wght.ttf (+ bản Italic)
   - Noto Serif      https://fonts.google.com/specimen/Noto+Serif
     → fonts/Noto_Serif/NotoSerif-VariableFont_wdth,wght.ttf (+ bản Italic)

2. Vào chrome://extensions bấm Reload trên thẻ Lamp, mở lại trình đọc, vào
   bảng cài đặt (⚙) chọn phông tương ứng (Be Vietnam / Serif / Noto Serif)
   để xác nhận đã nạp đúng — nếu chữ không đổi dáng, mở DevTools của trang
   (F12) → tab Network, tìm dòng .ttf báo lỗi 404 để biết sai đường dẫn nào.

Nếu không có file nào ở đây, Lamp tự động dùng phông hệ thống — vẫn chạy bình
thường, không báo lỗi (overlay.css khai __LAMP_EXT__fonts/... qua @font-face,
thiếu file thì trình duyệt lặng lẽ rơi về phông kế tiếp trong ngăn xếp).

Muốn dùng phông khác ba phông trên, hoặc đổi tên/đường dẫn file: sửa các khối
@font-face ở cuối content/overlay.css cho khớp tên file thật, rồi thêm một
dòng vào FONTS trong content/reader.js để phông đó xuất hiện trong bảng chọn.

VÌ SAO CẦN CHÚ Ý PHÔNG VỚI TIẾNG VIỆT
Tiếng Việt có dấu chồng hai tầng (ế, ộ, ữ, ằ). Nhiều phông đẹp cho tiếng Anh
lại thiết kế dấu như phần thêm vào sau, nên ở cỡ chữ lớn dấu dễ bị cắt cụt
hoặc lệch. Ba phông gợi ý ở trên đều xử lý tốt phần này.
