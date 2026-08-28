// Lamp — reader/boot.js
// Nạp nội dung đã được background trích xuất sẵn rồi mở trình đọc.
//
// Vì sao qua storage mà không truyền thẳng: nội dung một bài báo có thể vài
// chục nghìn ký tự, nhét vào URL là vượt giới hạn. background bỏ vào
// storage.session (tự xoá khi đóng trình duyệt) rồi chỉ chuyển một mã ngắn.

(async () => {
  const fail = (msg) => {
    const box = document.getElementById("fallback");
    if (msg) document.getElementById("fallbackMsg").textContent = msg;
    box.hidden = false;
  };

  const id = new URLSearchParams(location.search).get("doc");
  if (!id) { fail(); return; }

  let doc = null;
  try {
    const key = "doc:" + id;
    const got = await chrome.storage.session.get(key);
    doc = got[key];
    // Dùng xong xoá luôn: nội dung trang web của người dùng không nên nằm lại
    // trong storage lâu hơn mức cần thiết.
    await chrome.storage.session.remove(key);
  } catch (e) { /* rơi xuống nhánh báo lỗi bên dưới */ }

  if (!doc || !doc.blocks || !doc.blocks.length) { fail(); return; }

  document.title = doc.title ? doc.title + " — Lamp" : "Lamp — Đọc nhanh";

  // reader.js lấy nội dung qua window.__lampExtract() — đưa sẵn kết quả vào
  window.__lampExtract = () => doc;

  const settings = await chrome.storage.sync.get(null);
  await window.__lampReader.open(settings);
})();
