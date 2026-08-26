// Lamp — defaults.js
// NGUỒN DUY NHẤT cho danh sách cài đặt mặc định.
//
// Trước đây danh sách này bị chép ra ba nơi (background.js, popup/popup.js,
// content/reader.js) và viewer/viewer.js còn tự liệt kê một tập con — chúng
// lệch nhau lúc nào không hay. Đó chính là nguyên nhân lỗi "mở PDF là mất hết
// phông và giao diện đã chọn": viewer chỉ xin 4 khoá, trong đó có một khoá
// ("pausePunctuation") không hề tồn tại. Thêm tuỳ chọn mới thì chỉ sửa ở đây.
//
// Nạp được ở cả ba môi trường: service worker (importScripts), trang popup /
// viewer (thẻ script), và content script (chrome.scripting.executeScript).

(() => {
  const DEFAULTS = {
    mode: "rsvp",
    wpm: 350,
    chunkSize: 1,
    fontSize: 56,
    fontFamily: "system",
    customFont: "",
    spacing: 0,
    theme: "sepia",
    orp: true,
    ruler: true,
    rhythm: true,
    context: false,
    warmup: false,
    tts: false,
    voiceURI: "",
    restReminder: true,
    bionic: false,
    shortWords: false
  };

  // self có ở mọi ngữ cảnh (window trong trang, WorkerGlobalScope trong SW)
  self.LAMP_DEFAULTS = DEFAULTS;
})();
