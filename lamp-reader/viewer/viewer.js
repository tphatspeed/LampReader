// Lamp — viewer.js  (ES module)
// pdf.js v6 chỉ phát hành dạng ES module (.mjs) nên bắt buộc phải import,
// không dùng được biến toàn cục pdfjsLib như các bản UMD đời cũ.

import { getDocument, GlobalWorkerOptions } from "../vendor/pdf.mjs";

GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("vendor/pdf.worker.mjs");

const statusEl = document.getElementById("status");
const barEl = document.getElementById("bar");
const barFill = document.getElementById("barFill");
const dropEl = document.getElementById("drop");
const fileEl = document.getElementById("file");

function setStatus(msg, isErr = false) {
  statusEl.textContent = msg;
  statusEl.classList.toggle("err", isErr);
}

function setProgress(done, total) {
  if (total <= 0) {
    barEl.classList.remove("on");
    return;
  }
  barEl.classList.add("on");
  barFill.style.width = (done / total) * 100 + "%";
}

// ---------- Trích xuất văn bản ----------

// pdf.js trả về từng mảnh chữ kèm cờ hasEOL (hết dòng) và toạ độ.
// Dùng cả hai để dựng lại dòng, rồi ghép dòng thành đoạn văn.
function itemsToParagraphs(items) {
  const lines = [];
  let current = [];
  let lastY = null;

  for (const item of items) {
    if (typeof item.str !== "string") continue;
    const y = item.transform ? item.transform[5] : null;

    const newLineByGap = lastY !== null && y !== null && Math.abs(y - lastY) > 2;
    if (newLineByGap && current.length) {
      lines.push(current.join(""));
      current = [];
    }

    current.push(item.str);
    if (y !== null) lastY = y;

    if (item.hasEOL) {
      lines.push(current.join(""));
      current = [];
      lastY = null;
    }
  }
  if (current.length) lines.push(current.join(""));

  const paragraphs = [];
  let buffer = "";
  for (let line of lines) {
    line = line.replace(/\s+/g, " ").trim();
    if (!line) {
      if (buffer) { paragraphs.push(buffer); buffer = ""; }
      continue;
    }
    // Nối từ bị gạch nối cuối dòng
    if (buffer.endsWith("-")) buffer = buffer.slice(0, -1) + line;
    else buffer = buffer ? buffer + " " + line : line;

    if (/[.!?:;]["')\]]?$/.test(line)) {
      paragraphs.push(buffer);
      buffer = "";
    }
  }
  if (buffer) paragraphs.push(buffer);
  return paragraphs;
}

// Bỏ header/footer lặp lại giống nhau ở phần lớn số trang
function dropRepeats(pages) {
  if (pages.length < 4) return pages;
  const counts = new Map();
  pages.forEach((paras) => {
    new Set(paras.map((p) => p.slice(0, 60))).forEach((key) => {
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });
  const threshold = Math.max(3, Math.ceil(pages.length * 0.5));
  return pages.map((paras) =>
    paras.filter((p) => (counts.get(p.slice(0, 60)) || 0) < threshold)
  );
}

async function extractPdf(source) {
  const pdf = await getDocument(source).promise;
  const pages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    setStatus(`Đang trích xuất trang ${p}/${pdf.numPages}…`);
    setProgress(p, pdf.numPages);
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    pages.push(itemsToParagraphs(content.items));
    page.cleanup();
  }
  const text = dropRepeats(pages)
    .map((paras) => paras.join("\n\n"))
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text, numPages: pdf.numPages };
}

// ---------- Mở trình đọc ----------

async function startReading(text, title) {
  if (!text || text.replace(/\s/g, "").length < 40) {
    setStatus(
      "Không tìm thấy lớp chữ trong PDF này — nhiều khả năng đây là bản quét ảnh, cần OCR để đọc được.",
      true
    );
    return;
  }

  if (!window.__lampReader) {
    setStatus("Không nạp được trình đọc (content/reader.js).", true);
    return;
  }

  // reader.js lấy nội dung qua window.__lampExtract() — cung cấp sẵn kết quả PDF
  const blocks = text
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2)
    .map((s) => ({ type: s.length < 70 && !/[.!?]$/.test(s) ? "h" : "p", text: s }));
  await openReaderWith(blocks, title);
}

// Dùng chung cho PDF (đã tách khối thô) và EPUB (đã có khối đúng cấu trúc)
async function openReaderWith(blocks, title) {
  window.__lampExtract = () => ({ title, source: "pdf", blocks });

  // Lấy TOÀN BỘ cài đặt đã lưu. Bản cũ chỉ hỏi 4 khoá, trong đó
  // "pausePunctuation" còn không phải tên thật của tuỳ chọn nào (đúng ra là
  // "rhythm") — hậu quả là mở PDF thì mất hết phông, giao diện, ORP… mà
  // người dùng đã chọn, và theme bị ép về "night".
  const settings = await chrome.storage.sync.get(null);
  window.__lampReader.open(settings);

  const words = blocks.reduce((n, b) => n + b.text.split(/\s+/).filter(Boolean).length, 0);
  setStatus(`Đang đọc ${words.toLocaleString("vi-VN")} từ. Nhấn Esc để quay lại.`);
}

async function startReadingBlocks(blocks, title) {
  if (!window.__lampReader) {
    setStatus("Không nạp được trình đọc (content/reader.js).", true);
    return;
  }
  await openReaderWith(blocks, title);
}

async function handleEpub(file) {
  setStatus("Đang mở EPUB…");
  const buf = await file.arrayBuffer();
  const { title, blocks, chapters } = await window.__lampEpub.parse(buf, (i, n) => {
    setStatus(`Đang đọc chương ${i}/${n}…`);
    setProgress(i, n);
  });
  setProgress(0, 0);
  setStatus(`Đã đọc ${chapters} chương.`);
  // EPUB đã cho sẵn khối có cấu trúc (tiêu đề/đoạn/danh sách) nên đưa thẳng
  // vào trình đọc, không phải đi qua bước tách đoạn thô như PDF.
  await startReadingBlocks(blocks, title || file.name);
}

async function handleFile(file) {
  if (!file) return;
  const isPdf = /\.pdf$/i.test(file.name) || file.type === "application/pdf";
  const isEpub = /\.epub$/i.test(file.name) || file.type === "application/epub+zip";
  if (!isPdf && !isEpub) {
    setStatus("Chỉ đọc được file PDF hoặc EPUB.", true);
    return;
  }
  try {
    if (isEpub) { await handleEpub(file); return; }
    setStatus("Đang mở file…");
    const buf = await file.arrayBuffer();
    const { text, numPages } = await extractPdf({ data: buf });
    setStatus(`Đã trích xuất ${numPages} trang.`);
    setProgress(0, 0);
    await startReading(text, file.name);
  } catch (err) {
    setProgress(0, 0);
    setStatus("Không đọc được file này: " + err.message, true);
  }
}

// ---------- Sự kiện ----------

fileEl.addEventListener("change", (e) => handleFile(e.target.files[0]));

["dragenter", "dragover"].forEach((ev) =>
  dropEl.addEventListener(ev, (e) => {
    e.preventDefault();
    dropEl.classList.add("over");
  })
);
["dragleave", "drop"].forEach((ev) =>
  dropEl.addEventListener(ev, (e) => {
    e.preventDefault();
    dropEl.classList.remove("over");
  })
);
dropEl.addEventListener("drop", (e) => {
  handleFile(e.dataTransfer?.files?.[0]);
});

// Nếu trang được mở kèm ?file=<url> (từ Alt+R trên một link .pdf), tự tải luôn.
//
// Extension không còn xin sẵn quyền cho mọi trang (xem optional_host_permissions
// trong manifest), nên việc tải PDF từ một tên miền bất kỳ cần được cho phép
// riêng. Thay vì báo lỗi cụt ngủn, hiện hẳn một nút để cấp quyền ngay tại chỗ —
// bấm nút là một cử chỉ người dùng hợp lệ để gọi permissions.request().
async function loadRemotePdf(target) {
  setStatus("Đang tải PDF từ đường dẫn…");
  try {
    const { text, numPages } = await extractPdf(target);
    setStatus(`Đã trích xuất ${numPages} trang.`);
    setProgress(0, 0);
    await startReading(text, decodeURIComponent(target.split("/").pop()));
    return true;
  } catch (err) {
    setProgress(0, 0);
    return false;
  }
}

function askPermissionFor(target, onGranted) {
  let origin = null;
  try { origin = new URL(target).origin + "/*"; } catch (e) {}
  if (!origin || !chrome.permissions) {
    setStatus("Không tải được PDF từ đường dẫn này. Hãy chọn file thủ công bên trên.", true);
    return;
  }
  setStatus("Cần cấp quyền để tải PDF từ " + new URL(target).hostname + ".", true);
  const btn = document.createElement("button");
  btn.className = "pdf";
  btn.textContent = "Cấp quyền rồi thử lại";
  btn.addEventListener("click", async () => {
    let granted = false;
    try { granted = await chrome.permissions.request({ origins: [origin] }); } catch (e) {}
    if (!granted) {
      setStatus("Chưa được cấp quyền. Hãy chọn file thủ công bên trên.", true);
      return;
    }
    btn.remove();
    onGranted();
  });
  statusEl.parentNode.appendChild(btn);
}

(async () => {
  const target = new URLSearchParams(location.search).get("file");
  if (!target) return;
  if (await loadRemotePdf(target)) return;
  askPermissionFor(target, () => loadRemotePdf(target));
})();
