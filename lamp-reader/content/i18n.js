// Lamp — i18n.js
// Bộ từ điển giao diện + hàm dịch t().
//
// KHÔNG dùng chrome.i18n: API đó bám theo ngôn ngữ của trình duyệt và không đổi
// được lúc chạy, trong khi Lamp cần cho người dùng TỰ CHỌN ngôn ngữ trong cài
// đặt. Nên tự giữ từ điển và tự tra.
//
// THÊM MỘT NGÔN NGỮ MỚI:
//   1. Chép nguyên khối `en` bên dưới, đổi khoá thành mã ngôn ngữ (vd "fr")
//   2. Dịch phần giá trị, giữ nguyên phần khoá và các chỗ {n}, {wpm}…
//   3. Thêm tên ngôn ngữ vào LANG_NAMES — viết bằng CHÍNH ngôn ngữ đó
//   Không phải sửa gì thêm: bộ chọn trong cài đặt tự liệt kê theo từ điển.
//
// Khoá nào thiếu ở một ngôn ngữ thì tự rơi về tiếng Anh, rồi rơi về chính tên
// khoá — sót một chuỗi cũng không làm vỡ giao diện.

// Dùng `self` chứ KHÔNG dùng `window`: file này còn được importScripts vào
// service worker, nơi không hề có `window`. Chạm vào là ném ReferenceError
// ngay lúc nạp, và Chrome báo "Service worker registration failed" cụt lủn
// không nói lý do.
(() => {
  if (self.__lampI18n) return;

  const LANG_NAMES = { vi: "Tiếng Việt", en: "English" };

  const M = {};

  M.vi = {
    // ---- chung ----
    "app.name": "Lamp — trình đọc nhanh",
    "win.title": "Lamp — Đọc nhanh", "pdf.title": "Lamp — Đọc PDF",
    "menu.readSelection": "Đọc nhanh đoạn này bằng Lamp",
    "btn.close": "Đóng", "btn.close.tip": "Đóng (Esc)",
    "btn.skip": "Bỏ qua", "btn.delete": "Xoá", "btn.clearAll": "Xoá hết",
    "a11y.dec": "Giảm {label}", "a11y.inc": "Tăng {label}",

    // ---- thanh tiêu đề & dock ----
    "top.outline": "Dàn bài", "top.outline.tip": "Dàn bài (O)",
    "top.settings": "Cài đặt", "top.settings.tip": "Cài đặt (S)",
    "top.marks": "Trích đoạn đã lưu",
    "top.marks.tip": "Trích đoạn đã lưu (phím H để lưu câu đang đọc)",
    "dock.back": "Lùi 10 (←) · Shift+← đọc lại câu",
    "dock.fwd": "Tiến 10 (→) · Shift+→ câu sau",
    "dock.play": "Phát / dừng (Space)", "dock.play.a11y": "Phát hoặc dừng",
    "dock.progress": "Tiến độ đọc",
    "dock.speed": "Tốc độ", "dock.chunk": "Từ mỗi lần", "dock.size": "Cỡ chữ",
    "dock.left": "còn {time}", "dock.leftZero": "còn 0:00",
    "mode.rsvp": "RSVP", "mode.guide": "Dẫn dòng",
    "ready": "Nhấn {key} để bắt đầu",

    // ---- vùng tốc độ ----
    "zone.safe": "giữ được hiểu", "zone.skim": "đọc lướt", "zone.scan": "chỉ quét ý",

    // ---- cài đặt ----
    "set.lang": "Ngôn ngữ giao diện",
    "set.lang.auto": "Theo trình duyệt",
    "set.font": "Phông chữ", "set.theme": "Giao diện", "set.spacing": "Giãn chữ",
    "set.spacing.label": "Khoảng cách",
    "set.customFont": "Tên phông đã cài trên máy, ví dụ: Literata",
    "set.fontMissing": "Không nạp được file phông này — xem fonts/README.txt",
    "set.tts": "Đọc bằng giọng nói",
    "set.tts.on": "Bật giọng đọc",
    "set.tts.desc": "Chữ chạy theo giọng, nghe và nhìn cùng lúc",
    "set.orp": "Tô chữ trung tâm",
    "set.orp.desc": "Điểm neo mắt, giúp nhận diện từ nhanh hơn",
    "set.ruler": "Thanh dẫn", "set.ruler.desc": "Hai vạch canh vị trí mắt",
    "set.rhythm": "Nhịp dấu câu",
    "set.rhythm.desc": "Dừng lâu hơn ở cuối câu, câu dài dừng lâu hơn",
    "set.shortWords": "Bỏ qua từ ngắn",
    "set.shortWords.desc": "Từ đệm ít nghĩa lướt nhanh hơn",
    "set.context": "Xem ngữ cảnh", "set.context.desc": "Hiện các từ xung quanh, mờ hơn",
    "set.warmup": "Khởi động chậm",
    "set.warmup.desc": "40 cụm đầu chạy ở 65% tốc độ rồi tăng dần",
    "set.rest": "Nhắc nghỉ mắt", "set.rest.desc": "Cứ 20 phút nhắc nhìn xa 20 giây",
    "set.window": "Mở ở cửa sổ riêng",
    "set.window.desc": "Tắt đi thì Lamp phủ lên chính trang web đang xem. Áp dụng từ lần mở sau.",
    "set.stats": "Thống kê",
    "set.keys": "Phím tắt",
    "keys.line1": "{space} phát/dừng · {left}{right} lùi/tiến 10 · {shift}+{left} đọc lại câu",
    "keys.line2": "{up}{down} tốc độ · {m} đổi chế độ · {o} dàn bài",
    "keys.line3": "{h} lưu câu đang đọc · {q} kiểm tra hiểu · {s} cài đặt · {r} đọc lại từ đầu",

    // ---- phông & giao diện ----
    "font.system": "Hệ thống", "font.custom": "Tuỳ chỉnh",
    "theme.auto": "Theo hệ thống", "theme.paper": "Giấy", "theme.sepia": "Sepia",
    "theme.gray": "Xám", "theme.night": "Đêm", "theme.contrast": "Tương phản cao",

    // ---- dàn bài ----
    "outline.empty": "Trang này không có tiêu đề mục nào để dựng dàn bài.",
    "outline.quiz": "Kiểm tra riêng mục này",
    "outline.quiz.a11y": "Kiểm tra mục {name}",
    "outline.section": "Mục: {name}",
    "outline.sectionShort": "Kiểm tra mục này",
    "outline.tooShort": "Mục này quá ngắn để tạo câu hỏi. Hãy thử mục dài hơn, hoặc bấm Q để kiểm tra cả bài.",

    // ---- kiểm tra hiểu ----
    "quiz.title": "Kiểm tra hiểu",
    "quiz.intro": "Chọn phương án đúng. Đây là cách tự kiểm tra xem bạn thật sự hiểu hay chỉ đang nhìn chữ chạy.",
    "quiz.scope": "Phạm vi kiểm tra",
    "quiz.scope.read": "Phần đã đọc", "quiz.scope.all": "Cả bài",
    "quiz.scope.locked": "Đọc thêm một chút rồi mới kiểm tra riêng phần đã đọc được",
    "quiz.empty": "Nội dung quá ngắn để tạo câu hỏi có nghĩa.",
    "quiz.submit": "Chấm điểm", "quiz.submitLeft": "Chấm điểm — còn {n} câu",
    "quiz.again": "↻ Bộ câu hỏi khác",
    "quiz.review": "↺ Xem lại đoạn này",
    "quiz.result": "<b>{score}/{total}</b> đúng ({pct}%) ở tốc độ {wpm} WPM.",
    "quiz.advice.good": "Tốt. {wpm} WPM đang phù hợp với bạn ở loại nội dung này — có thể thử tăng 50.",
    "quiz.advice.ok": "Tạm được, nhưng đang mất chi tiết. Giữ nguyên tốc độ hoặc giảm 50 WPM.",
    "quiz.advice.bad": "Đang quá nhanh. Hãy giảm xuống {wpm} WPM và đọc lại đoạn này.",
    "quiz.kind.cloze": "Điền từ", "quiz.kind.number": "Số liệu",
    "quiz.kind.whichtrue": "Câu nào đúng", "quiz.kind.mainidea": "Ý của mục",
    "quiz.kind.order": "Thứ tự",
    "quiz.ask.whichtrue": "Câu nào dưới đây ĐÚNG với bài viết?",
    "quiz.ask.mainidea": "Mục “{name}” mở đầu bằng ý nào?",
    "quiz.ask.order": "Ý nào được nhắc tới TRƯỚC NHẤT trong phần bạn vừa đọc?",

    // ---- trích đoạn ----
    "hl.title": "Trích đoạn đã lưu",
    "hl.save": "＋ Lưu câu đang đọc",
    "hl.saved": "Đã lưu trích đoạn ({n})",
    "hl.dup": "Câu này đã có trong danh sách",
    "hl.empty": "Chưa lưu trích đoạn nào. Bấm nút trên, hoặc nhấn {key} bất cứ lúc nào đang đọc.",
    "hl.count": "{n} trích đoạn từ bài này. Bấm vào một câu để nhảy về đúng chỗ đó.",
    "hl.copy": "Chép dạng Markdown", "hl.download": "Tải file .md",
    "hl.copied": "Đã chép vào clipboard",
    "hl.copyFail": "Trang này không cho chép — hãy dùng Tải file",
    "hl.fileTitle": "Trích đoạn",

    // ---- luyện tốc độ ----
    "train.title": "Luyện tốc độ", "train.start": "Bắt đầu buổi luyện",
    "train.desc": "Đọc bài này ở 3 mức tốc độ tăng dần, mỗi mức kiểm tra hiểu ngay. Kết thúc sẽ chỉ ra mức WPM phù hợp nhất với bạn.",
    "train.tooShort": "Phần còn lại của bài quá ngắn để luyện. Hãy quay về đầu bài (phím {key}) rồi thử lại.",
    "train.round": "Vòng {i}/{n} — {wpm} WPM",
    "train.roundLabel": "Vòng {i} · {wpm} WPM",
    "train.next": "Vòng tiếp theo →",
    "train.summary": "Kết quả buổi luyện trên chính bài đang đọc.",
    "train.best": "Ở <b>{wpm} WPM</b> bạn vẫn hiểu tốt ({pct}%). Đây là tốc độ nên dùng cho loại nội dung này.",
    "train.none": "Chưa mức nào đạt 80%. Hãy thử lại từ <b>{wpm} WPM</b> — hoặc dùng chế độ Dẫn dòng cho bài khó như thế này.",
    "train.apply": "Dùng {wpm} WPM", "train.applied": "Đã đặt {wpm} WPM",
    "train.again": "Luyện tiếp phần sau",

    // ---- nghỉ mắt ----
    "rest.title": "Nghỉ mắt 20 giây",
    "rest.desc": "Nhìn ra xa khoảng 6 mét. RSVP làm bạn chớp mắt ít hơn bình thường, đây là lúc bù lại.",

    // ---- thống kê ----
    "stats.words": "từ, 7 ngày qua", "stats.time": "thời gian đọc",
    "stats.wpm": "WPM thực tế", "stats.byWpm": "Điểm kiểm tra theo tốc độ",

    // ---- thông báo ----
    "msg.noSelection": "Lamp: đoạn bạn bôi đen quá ngắn hoặc chưa chọn gì. Hãy tô đen đoạn văn muốn đọc rồi thử lại.",
    "msg.noContent": "Lamp: không tìm thấy nội dung đủ dài trên trang này.\nThử bôi đen đoạn văn muốn đọc rồi bấm chuột phải chọn “Đọc nhanh đoạn này bằng Lamp”.",
    "doc.untitled": "Không tên", "doc.selection": "Đoạn đã chọn",

    // ---- popup ----
    "pop.sub": "Đọc nhanh trang hiện tại, đoạn đang bôi đen, hoặc một file PDF.",
    "pop.start": "Đọc trang này", "pop.pdf": "Đọc file PDF…",
    "pop.libTitle": "Đang đọc dở",
    "pop.libEmpty": "Chưa có bài nào đang đọc dở. Đọc được một đoạn rồi đóng lại, bài sẽ hiện ở đây.",
    "pop.permTitle": "Đọc tiếp trên mọi trang",
    "pop.permNeed": "Cần cấp quyền để mở lại bài từ danh sách trên.",
    "pop.permHas": "Đã cấp. Bấm một bài ở trên là mở ra và đọc tiếp ngay.",
    "pop.permGrant": "Cấp quyền", "pop.permRevoke": "Thu hồi",
    "pop.foot": "<b>Alt+R</b> mở nhanh trên mọi trang. Bôi đen một đoạn rồi chuột phải để đọc riêng đoạn đó.<br>Phông chữ, giao diện và các tuỳ chọn khác nằm ở nút <b>⚙</b> trong trình đọc.",
    "pop.err.internal": "Không chạy được trên trang nội bộ của Chrome.",
    "pop.err.empty": "Không tìm thấy nội dung đủ dài trên trang này.",
    "pop.err.selection": "Chưa bôi đen đoạn nào, hoặc đoạn quá ngắn.",
    "pop.err.other": "Không mở được trình đọc trên trang này.",
    "pop.kind.pdfUrl": "PDF", "pop.kind.pdfLocal": "PDF trên máy",
    "time.now": "vừa xong", "time.min": "{n} phút trước", "time.hour": "{n} giờ trước",
    "time.day": "{n} ngày trước", "time.month": "{n} tháng trước",

    // ---- trang đọc file ----
    "pdf.sub": "Trích xuất chữ từ PDF hoặc EPUB rồi đọc nhanh bằng RSVP.",
    "pdf.pick": "Chọn file PDF hoặc EPUB", "pdf.drop": "hoặc kéo thả file vào đây",
    "pdf.none": "Chưa chọn file nào.",
    "pdf.note": "PDF dạng ảnh quét không có lớp chữ nên không trích xuất được — trường hợp đó cần OCR.",
    "pdf.opening": "Đang mở file…", "pdf.openingEpub": "Đang mở EPUB…",
    "pdf.page": "Đang trích xuất trang {i}/{n}…",
    "pdf.chapter": "Đang đọc chương {i}/{n}…",
    "pdf.donePages": "Đã trích xuất {n} trang.", "pdf.doneChapters": "Đã đọc {n} chương.",
    "pdf.reading": "Đang đọc {n} từ. Nhấn Esc để quay lại.",
    "pdf.wrongType": "Chỉ đọc được file PDF hoặc EPUB.",
    "pdf.cantRead": "Không đọc được file này: {err}",
    "pdf.noText": "Không tìm thấy lớp chữ trong PDF này — nhiều khả năng đây là bản quét ảnh, cần OCR để đọc được.",
    "pdf.noReader": "Không nạp được trình đọc (content/reader.js).",
    "pdf.fromUrl": "Đang tải PDF từ đường dẫn…",
    "pdf.needPerm": "Cần cấp quyền để tải PDF từ {host}.",
    "pdf.grant": "Cấp quyền rồi thử lại",
    "pdf.denied": "Chưa được cấp quyền. Hãy chọn file thủ công bên trên.",
    "pdf.failUrl": "Không tải được PDF từ đường dẫn này. Hãy chọn file thủ công bên trên.",

    // ---- cửa sổ đọc ----
    "win.expired": "Không còn nội dung để đọc. Hãy quay lại trang web và nhấn <b>Alt+R</b> lần nữa.",

    // ---- EPUB ----
    "epub.drm": "Sách này có khoá bản quyền (DRM) nên không đọc được chữ bên trong",
    "epub.noContainer": "Thiếu META-INF/container.xml — file này không phải EPUB",
    "epub.noOpf": "container.xml không chỉ ra file OPF",
    "epub.badOpf": "Không đọc được file OPF: {path}",
    "epub.noSpine": "EPUB không có chương nào đọc được",
    "epub.noText": "Không bóc được chữ nào từ EPUB này",
    "epub.badZip": "Không phải file ZIP hợp lệ (thiếu EOCD)",
    "epub.badMethod": "Kiểu nén ZIP chưa hỗ trợ: {n}"
  };

  M.en = {
    "app.name": "Lamp — speed reader",
    "win.title": "Lamp — Speed reader", "pdf.title": "Lamp — Read a PDF",
    "menu.readSelection": "Speed-read this with Lamp",
    "btn.close": "Close", "btn.close.tip": "Close (Esc)",
    "btn.skip": "Skip", "btn.delete": "Delete", "btn.clearAll": "Clear all",
    "a11y.dec": "Decrease {label}", "a11y.inc": "Increase {label}",

    "top.outline": "Outline", "top.outline.tip": "Outline (O)",
    "top.settings": "Settings", "top.settings.tip": "Settings (S)",
    "top.marks": "Saved excerpts",
    "top.marks.tip": "Saved excerpts (press H to save the current sentence)",
    "dock.back": "Back 10 (←) · Shift+← replay sentence",
    "dock.fwd": "Forward 10 (→) · Shift+→ next sentence",
    "dock.play": "Play / pause (Space)", "dock.play.a11y": "Play or pause",
    "dock.progress": "Reading progress",
    "dock.speed": "Speed", "dock.chunk": "Words at a time", "dock.size": "Text size",
    "dock.left": "{time} left", "dock.leftZero": "0:00 left",
    "mode.rsvp": "RSVP", "mode.guide": "Guided",
    "ready": "Press {key} to start",

    "zone.safe": "comprehension holds", "zone.skim": "skimming", "zone.scan": "scanning only",

    "set.lang": "Interface language",
    "set.lang.auto": "Follow browser",
    "set.font": "Typeface", "set.theme": "Theme", "set.spacing": "Letter spacing",
    "set.spacing.label": "Spacing",
    "set.customFont": "A font installed on your machine, e.g. Literata",
    "set.fontMissing": "This font file could not be loaded — see fonts/README.txt",
    "set.tts": "Read aloud",
    "set.tts.on": "Enable narration",
    "set.tts.desc": "Text follows the voice — read and listen at once",
    "set.orp": "Focal letter",
    "set.orp.desc": "An anchor point for the eye, so words register faster",
    "set.ruler": "Guide rails", "set.ruler.desc": "Two marks aligning your gaze",
    "set.rhythm": "Punctuation rhythm",
    "set.rhythm.desc": "Longer pause at sentence ends; longer sentences pause longer",
    "set.shortWords": "Speed past filler words",
    "set.shortWords.desc": "Low-content words flash by faster",
    "set.context": "Show context", "set.context.desc": "Dim the surrounding words into view",
    "set.warmup": "Slow start",
    "set.warmup.desc": "First 40 chunks run at 65% speed, then ramp up",
    "set.rest": "Eye-rest reminder", "set.rest.desc": "Every 20 minutes, look 6 m away for 20 seconds",
    "set.window": "Open in its own window",
    "set.window.desc": "Turn off and Lamp overlays the page you are on. Applies from the next launch.",
    "set.stats": "Statistics",
    "set.keys": "Keyboard",
    "keys.line1": "{space} play/pause · {left}{right} back/forward 10 · {shift}+{left} replay sentence",
    "keys.line2": "{up}{down} speed · {m} switch mode · {o} outline",
    "keys.line3": "{h} save sentence · {q} comprehension check · {s} settings · {r} restart",

    "font.system": "System", "font.custom": "Custom",
    "theme.auto": "Follow system", "theme.paper": "Paper", "theme.sepia": "Sepia",
    "theme.gray": "Grey", "theme.night": "Night", "theme.contrast": "High contrast",

    "outline.empty": "This page has no section headings to build an outline from.",
    "outline.quiz": "Test just this section",
    "outline.quiz.a11y": "Test section {name}",
    "outline.section": "Section: {name}",
    "outline.sectionShort": "Test this section",
    "outline.tooShort": "This section is too short for questions. Try a longer one, or press Q to test the whole piece.",

    "quiz.title": "Comprehension check",
    "quiz.intro": "Pick the right answer. This is how you find out whether you understood it or just watched words go by.",
    "quiz.scope": "Test scope",
    "quiz.scope.read": "What I've read", "quiz.scope.all": "Whole piece",
    "quiz.scope.locked": "Read a little more before testing just the part you've read",
    "quiz.empty": "Too little text here to build meaningful questions.",
    "quiz.submit": "Check answers", "quiz.submitLeft": "Check answers — {n} to go",
    "quiz.again": "↻ Different questions",
    "quiz.review": "↺ Go back to this passage",
    "quiz.result": "<b>{score}/{total}</b> correct ({pct}%) at {wpm} WPM.",
    "quiz.advice.good": "Good. {wpm} WPM suits you for this kind of material — try adding 50.",
    "quiz.advice.ok": "Passable, but you're losing detail. Hold this speed or drop 50 WPM.",
    "quiz.advice.bad": "Too fast. Drop to {wpm} WPM and read this passage again.",
    "quiz.kind.cloze": "Fill the gap", "quiz.kind.number": "Figures",
    "quiz.kind.whichtrue": "Which is true", "quiz.kind.mainidea": "Section point",
    "quiz.kind.order": "Order",
    "quiz.ask.whichtrue": "Which sentence below MATCHES the text?",
    "quiz.ask.mainidea": "How does the section “{name}” open?",
    "quiz.ask.order": "Which point came FIRST in what you just read?",

    "hl.title": "Saved excerpts",
    "hl.save": "＋ Save current sentence",
    "hl.saved": "Excerpt saved ({n})",
    "hl.dup": "That sentence is already on the list",
    "hl.empty": "Nothing saved yet. Use the button above, or press {key} any time while reading.",
    "hl.count": "{n} excerpts from this piece. Tap one to jump back to it.",
    "hl.copy": "Copy as Markdown", "hl.download": "Download .md",
    "hl.copied": "Copied to clipboard",
    "hl.copyFail": "This page blocks copying — use Download instead",
    "hl.fileTitle": "Excerpts",

    "train.title": "Speed training", "train.start": "Start a session",
    "train.desc": "Read this piece at 3 increasing speeds, with a comprehension check after each. At the end you'll see which WPM actually suits you.",
    "train.tooShort": "Too little of the piece left to train on. Go back to the start (press {key}) and try again.",
    "train.round": "Round {i}/{n} — {wpm} WPM",
    "train.roundLabel": "Round {i} · {wpm} WPM",
    "train.next": "Next round →",
    "train.summary": "Session results, measured on the piece you're reading.",
    "train.best": "At <b>{wpm} WPM</b> you still understood it well ({pct}%). That's the speed to use for this kind of material.",
    "train.none": "No speed reached 80%. Try again from <b>{wpm} WPM</b> — or use Guided mode for material this dense.",
    "train.apply": "Use {wpm} WPM", "train.applied": "Set to {wpm} WPM",
    "train.again": "Train on the next part",

    "rest.title": "Rest your eyes — 20 seconds",
    "rest.desc": "Look about 6 metres away. RSVP makes you blink less than usual; this makes up for it.",

    "stats.words": "words, last 7 days", "stats.time": "time reading",
    "stats.wpm": "actual WPM", "stats.byWpm": "Check scores by speed",

    "msg.noSelection": "Lamp: your selection is empty or too short. Highlight the passage you want to read and try again.",
    "msg.noContent": "Lamp: no long-enough content found on this page.\nTry highlighting the passage you want, then right-click and choose “Speed-read this with Lamp”.",
    "doc.untitled": "Untitled", "doc.selection": "Selected passage",

    "pop.sub": "Speed-read this page, a highlighted passage, or a PDF file.",
    "pop.start": "Read this page", "pop.pdf": "Read a PDF file…",
    "pop.libTitle": "Still reading",
    "pop.libEmpty": "Nothing in progress yet. Read part of something and close it — it will show up here.",
    "pop.permTitle": "Resume on any site",
    "pop.permNeed": "Permission is needed to reopen a piece from the list above.",
    "pop.permHas": "Granted. Tap anything above to open it and carry on.",
    "pop.permGrant": "Grant", "pop.permRevoke": "Revoke",
    "pop.foot": "<b>Alt+R</b> works on any page. Highlight a passage and right-click to read just that.<br>Typeface, theme and the rest live behind the <b>⚙</b> button inside the reader.",
    "pop.err.internal": "This doesn't work on Chrome's own pages.",
    "pop.err.empty": "No long-enough content found on this page.",
    "pop.err.selection": "Nothing highlighted, or the selection is too short.",
    "pop.err.other": "Couldn't open the reader on this page.",
    "pop.kind.pdfUrl": "PDF", "pop.kind.pdfLocal": "Local PDF",
    "time.now": "just now", "time.min": "{n} min ago", "time.hour": "{n} h ago",
    "time.day": "{n} d ago", "time.month": "{n} mo ago",

    "pdf.sub": "Pull the text out of a PDF or EPUB, then speed-read it.",
    "pdf.pick": "Choose a PDF or EPUB", "pdf.drop": "or drop the file here",
    "pdf.none": "No file chosen yet.",
    "pdf.note": "Scanned PDFs have no text layer, so nothing can be extracted — those need OCR.",
    "pdf.opening": "Opening file…", "pdf.openingEpub": "Opening EPUB…",
    "pdf.page": "Extracting page {i}/{n}…",
    "pdf.chapter": "Reading chapter {i}/{n}…",
    "pdf.donePages": "Extracted {n} pages.", "pdf.doneChapters": "Read {n} chapters.",
    "pdf.reading": "Reading {n} words. Press Esc to come back.",
    "pdf.wrongType": "Only PDF and EPUB files can be read.",
    "pdf.cantRead": "Couldn't read this file: {err}",
    "pdf.noText": "No text layer in this PDF — most likely a scan, which needs OCR.",
    "pdf.noReader": "Couldn't load the reader (content/reader.js).",
    "pdf.fromUrl": "Fetching the PDF…",
    "pdf.needPerm": "Permission is needed to fetch the PDF from {host}.",
    "pdf.grant": "Grant permission and retry",
    "pdf.denied": "Permission refused. Choose the file manually above.",
    "pdf.failUrl": "Couldn't fetch the PDF from that address. Choose the file manually above.",

    "win.expired": "Nothing left to read here. Go back to the page and press <b>Alt+R</b> again.",

    "epub.drm": "This book is DRM-locked, so its text can't be read",
    "epub.noContainer": "META-INF/container.xml is missing — this is not an EPUB",
    "epub.noOpf": "container.xml doesn't point to an OPF file",
    "epub.badOpf": "Couldn't read the OPF file: {path}",
    "epub.noSpine": "This EPUB has no readable chapters",
    "epub.noText": "No text could be extracted from this EPUB",
    "epub.badZip": "Not a valid ZIP file (no EOCD found)",
    "epub.badMethod": "Unsupported ZIP compression method: {n}"
  };

  const FALLBACK = "en";
  let cur = "vi";

  // "auto" = bám theo ngôn ngữ trình duyệt, có thì dùng, không thì tiếng Anh
  function resolve(code) {
    if (!code || code === "auto") {
      const nav = String((self.navigator && self.navigator.language) || FALLBACK).toLowerCase();
      return Object.keys(M).find((c) => nav.startsWith(c)) || FALLBACK;
    }
    return M[code] ? code : FALLBACK;
  }

  function setLang(code) { cur = resolve(code); return cur; }

  function t(key, vars) {
    let s = M[cur] && M[cur][key];
    if (s === undefined) s = M[FALLBACK] && M[FALLBACK][key];
    if (s === undefined) s = key;          // sót khoá thì hiện tên khoá, không vỡ
    if (vars) for (const k in vars) s = s.split("{" + k + "}").join(vars[k]);
    return s;
  }

  // Định dạng số theo đúng ngôn ngữ đang chọn (1.000 vs 1,000)
  const num = (n) => Number(n).toLocaleString(cur === "vi" ? "vi-VN" : cur);

  // Điền chữ vào các phần tử đánh dấu sẵn trong HTML tĩnh:
  //   data-i18n="key"            → textContent
  //   data-i18n-html="key"       → innerHTML (chuỗi có thẻ <b>)
  //   data-i18n-aria="key|other" → aria-label, {label} lấy từ khoá thứ hai
  //   data-i18n-title="key"      → title
  function apply(root) {
    // Luôn qua self.: file này còn chạy trong service worker, nơi `document`
    // trần sẽ ném ReferenceError.
    const d = root || self.document;
    if (!d) return;
    d.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    d.querySelectorAll("[data-i18n-html]").forEach((el) => {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });
    d.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.title = t(el.getAttribute("data-i18n-title"));
    });
    d.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const [key, labelKey] = el.getAttribute("data-i18n-aria").split("|");
      el.setAttribute("aria-label", t(key, labelKey ? { label: t(labelKey) } : null));
    });
    if (d.documentElement) d.documentElement.lang = cur;
  }

  self.__lampI18n = {
    t, num, setLang, apply,
    lang: () => cur,
    langs: () => Object.keys(M),
    name: (c) => LANG_NAMES[c] || c,
    resolve
  };
})();
