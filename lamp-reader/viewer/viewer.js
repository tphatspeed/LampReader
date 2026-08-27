// Lamp — viewer.js  (ES module)
// pdf.js v6 chỉ phát hành dạng ES module (.mjs) nên bắt buộc phải import,
// không dùng được biến toàn cục pdfjsLib như các bản UMD đời cũ.

import { getDocument, GlobalWorkerOptions } from "../vendor/pdf.mjs";
import { pagesToBlocks } from "../content/pdftext.js";

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



// source phải là OBJECT: { data } cho file trên máy, { url } cho đường dẫn mạng.
// pdf.js v6 không còn nhận chuỗi URL trần như các bản cũ — truyền chuỗi vào là
// nó ném "expected either `data`, `range`, or `url` parameter", và vì lỗi này
// rơi vào catch chung nên người dùng chỉ thấy thông báo đổ cho quyền truy cập.
async function extractPdf(source) {
  const pdf = await getDocument(source).promise;
  const pages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    setStatus(`Đang trích xuất trang ${p}/${pdf.numPages}…`);
    setProgress(p, pdf.numPages);
    const page = await pdf.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    pages.push({
      items: (await page.getTextContent()).items,
      width: vp.width, height: vp.height
    });
    page.cleanup();
  }
  // pagesToBlocks lo phần dựng lại cấu trúc: gom dòng, tách cột, bỏ số trang
  // và header lặp, ghép đoạn, nhận tiêu đề theo cỡ chữ thật.
  return { blocks: pagesToBlocks(pages), numPages: pdf.numPages };
}

// ---------- Mở trình đọc ----------

async function startReading(blocks, title) {
  const chars = blocks.reduce((n, b) => n + b.text.replace(/\s/g, "").length, 0);
  if (chars < 40) {
    setStatus(
      "Không tìm thấy lớp chữ trong PDF này — nhiều khả năng đây là bản quét ảnh, cần OCR để đọc được.",
      true
    );
    return;
  }
  await startReadingBlocks(blocks, title);
}

// Dùng chung cho PDF (đã tách khối thô) và EPUB (đã có khối đúng cấu trúc)
async function openReaderWith(blocks, title, lang) {
  window.__lampExtract = () => ({ title, source: "pdf", blocks, lang });

  // Lấy TOÀN BỘ cài đặt đã lưu. Bản cũ chỉ hỏi 4 khoá, trong đó
  // "pausePunctuation" còn không phải tên thật của tuỳ chọn nào (đúng ra là
  // "rhythm") — hậu quả là mở PDF thì mất hết phông, giao diện, ORP… mà
  // người dùng đã chọn, và theme bị ép về "night".
  const settings = await chrome.storage.sync.get(null);
  window.__lampReader.open(settings);

  const words = blocks.reduce((n, b) => n + b.text.split(/\s+/).filter(Boolean).length, 0);
  setStatus(`Đang đọc ${words.toLocaleString("vi-VN")} từ. Nhấn Esc để quay lại.`);
}

async function startReadingBlocks(blocks, title, lang) {
  if (!window.__lampReader) {
    setStatus("Không nạp được trình đọc (content/reader.js).", true);
    return;
  }
  await openReaderWith(blocks, title, lang);
}

async function handleEpub(file) {
  setStatus("Đang mở EPUB…");
  const buf = await file.arrayBuffer();
  const { title, lang, blocks, chapters } = await window.__lampEpub.parse(buf, (i, n) => {
    setStatus(`Đang đọc chương ${i}/${n}…`);
    setProgress(i, n);
  });
  setProgress(0, 0);
  setStatus(`Đã đọc ${chapters} chương.`);
  // EPUB đã cho sẵn khối có cấu trúc (tiêu đề/đoạn/danh sách) nên đưa thẳng
  // vào trình đọc, không phải đi qua bước tách đoạn thô như PDF.
  await startReadingBlocks(blocks, title || file.name, lang);
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
    const { blocks, numPages } = await extractPdf({ data: buf });
    setStatus(`Đã trích xuất ${numPages} trang.`);
    setProgress(0, 0);
    await startReading(blocks, file.name);
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
    const { blocks, numPages } = await extractPdf({ url: target });
    setStatus(`Đã trích xuất ${numPages} trang.`);
    setProgress(0, 0);
    await startReading(blocks, decodeURIComponent(target.split("/").pop()));
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
