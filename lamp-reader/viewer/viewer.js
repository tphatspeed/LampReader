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
  window.__lampExtract = () => ({ title, source: "pdf", blocks });

  // Lấy TOÀN BỘ cài đặt đã lưu. Bản cũ chỉ hỏi 4 khoá, trong đó
  // "pausePunctuation" còn không phải tên thật của tuỳ chọn nào (đúng ra là
  // "rhythm") — hậu quả là mở PDF thì mất hết phông, giao diện, ORP… mà
  // người dùng đã chọn, và theme bị ép về "night".
  const settings = await chrome.storage.sync.get(null);
  window.__lampReader.open(settings);

  const words = text.split(/\s+/).filter(Boolean).length;
  setStatus(`Đang đọc ${words.toLocaleString("vi-VN")} từ. Nhấn Esc để quay lại.`);
}

async function handleFile(file) {
  if (!file) return;
  if (!/pdf$/i.test(file.name) && file.type !== "application/pdf") {
    setStatus("File này không phải PDF.", true);
    return;
  }
  setStatus("Đang mở file…");
  try {
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

// Nếu trang được mở kèm ?file=<url> (từ Alt+R trên một link .pdf), tự tải luôn
(async () => {
  const target = new URLSearchParams(location.search).get("file");
  if (!target) return;
  setStatus("Đang tải PDF từ đường dẫn…");
  try {
    const { text, numPages } = await extractPdf(target);
    setStatus(`Đã trích xuất ${numPages} trang.`);
    setProgress(0, 0);
    await startReading(text, decodeURIComponent(target.split("/").pop()));
  } catch (err) {
    setProgress(0, 0);
    setStatus(
      "Không tải được PDF từ đường dẫn này (có thể do quyền truy cập). Hãy chọn file thủ công bên trên.",
      true
    );
  }
})();
