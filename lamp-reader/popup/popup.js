// Lamp — popup.js

const DEFAULTS = window.LAMP_DEFAULTS; // xem content/defaults.js

const STEP = { wpm: 50, chunk: 1, size: 4 };
const LIMIT = { wpm: [100, 1200], chunk: [1, 6], size: [24, 120] };

const $ = (id) => document.getElementById(id);
const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));

let settings = { ...DEFAULTS };

function paint() {
  $("wpmVal").textContent = settings.wpm;
  $("chunkVal").textContent = settings.chunkSize;
  $("sizeVal").textContent = settings.fontSize;
}

async function init() {
  settings = await chrome.storage.sync.get(DEFAULTS);
  paint();

  document.querySelectorAll("[data-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [key, dir] = btn.dataset.step.split(":");
      const d = parseInt(dir, 10);
      if (key === "wpm") settings.wpm = clamp(settings.wpm + d * STEP.wpm, LIMIT.wpm);
      if (key === "chunk") settings.chunkSize = clamp(settings.chunkSize + d * STEP.chunk, LIMIT.chunk);
      if (key === "size") settings.fontSize = clamp(settings.fontSize + d * STEP.size, LIMIT.size);
      paint();
      chrome.storage.sync.set(settings);
    });
  });

  $("openPdf").addEventListener("click", async () => {
    await chrome.tabs.create({ url: chrome.runtime.getURL("viewer/viewer.html") });
    window.close();
  });

  $("start").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    const res = await chrome.runtime.sendMessage({
      type: "LAMP_LAUNCH",
      tabId: tab.id,
      url: tab.url
    });

    if (res && res.ok) {
      window.close();
    } else {
      $("err").textContent =
        res && res.reason === "internal-page"
          ? "Không chạy được trên trang nội bộ của Chrome."
          : "Không mở được trình đọc trên trang này.";
    }
  });
}

init();

// ============================ THƯ VIỆN "ĐANG ĐỌC DỞ" ============================
// Dữ liệu lấy từ chính các bản ghi tiến trình mà reader.js đã lưu (khoá "pos:").
// Không có kho dữ liệu riêng nào — chỉ là một cách nhìn khác lên thứ đã có.

const ALL_URLS = { origins: ["<all_urls>"] };

const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return m + " phút trước";
  const h = Math.floor(m / 60);
  if (h < 24) return h + " giờ trước";
  const d = Math.floor(h / 24);
  return d < 30 ? d + " ngày trước" : Math.floor(d / 30) + " tháng trước";
}

const KIND_LABEL = { "pdf-url": "PDF", "pdf-local": "PDF trên máy" };

async function readLibrary() {
  let all = {};
  try { all = await chrome.storage.local.get(null); } catch (e) { return []; }
  return Object.entries(all)
    .filter(([k, v]) => k.startsWith("pos:") && v && v.title)
    // Đọc gần xong rồi thì coi như xong, không bày lại trong danh sách
    .filter(([, v]) => (v.pct || 0) < 95)
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => (b.at || 0) - (a.at || 0))
    .slice(0, 8);
}

async function paintLibrary() {
  const items = await readLibrary();
  const box = $("lib");
  $("libClear").hidden = items.length === 0;

  if (!items.length) {
    box.innerHTML = '<div class="lib-empty">Chưa có bài nào đang đọc dở. Đọc được một đoạn rồi đóng lại, bài sẽ hiện ở đây.</div>';
    return;
  }

  box.innerHTML = items.map((it) => `
    <div class="lib-item" data-key="${esc(it.key)}" data-url="${esc(it.url || "")}" data-kind="${esc(it.kind || "web")}" role="button" tabindex="0">
      <span class="lib-main">
        <span class="lib-title">${esc(it.title)}</span>
        <span class="lib-meta">${KIND_LABEL[it.kind] ? KIND_LABEL[it.kind] + " · " : ""}${timeAgo(it.at || Date.now())}</span>
      </span>
      <span class="lib-ring">${it.pct || 0}%</span>
      <button class="lib-del" title="Xoá khỏi danh sách" aria-label="Xoá khỏi danh sách">×</button>
    </div>`).join("");

  box.querySelectorAll(".lib-item").forEach((el) => {
    el.querySelector(".lib-del").addEventListener("click", async (e) => {
      e.stopPropagation();
      await chrome.storage.local.remove(el.dataset.key);
      paintLibrary();
    });
    el.addEventListener("click", () => openLibraryItem(el.dataset));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLibraryItem(el.dataset); }
    });
  });
}

// Trang PDF là trang của chính extension: mở URL ra là viewer tự nạp reader và
// tự khôi phục vị trí, không cần quyền gì thêm. Trang web thường thì phải tiêm
// script vào tab mới — tab đó không được activeTab bảo trợ (cử chỉ của người
// dùng thuộc về tab đang mở), nên bắt buộc phải có quyền cho trang đó.
async function openLibraryItem({ url, kind }) {
  if (!url) return;
  if (kind !== "web") {
    await chrome.tabs.create({ url });
    window.close();
    return;
  }

  let allowed = false;
  try { allowed = await chrome.permissions.contains(ALL_URLS); } catch (e) {}

  if (!allowed) {
    let origin;
    try { origin = new URL(url).origin + "/*"; } catch (e) { origin = null; }
    if (origin) {
      // request() phải nằm trong cử chỉ người dùng — đây vẫn là trong handler click
      try { allowed = await chrome.permissions.request({ origins: [origin] }); } catch (e) {}
    }
  }

  if (allowed) {
    const res = await chrome.runtime.sendMessage({ type: "LAMP_RESUME", url });
    if (res && res.ok) { window.close(); return; }
  }
  // Không có quyền (hoặc tiêm hụt) thì vẫn mở trang — người dùng bấm Alt+R là xong
  await chrome.tabs.create({ url });
  window.close();
}

// ============================ CẤP QUYỀN ============================

async function paintPerm() {
  let has = false;
  try { has = await chrome.permissions.contains(ALL_URLS); } catch (e) {}
  $("perm").classList.toggle("on", has);
  $("permDesc").textContent = has
    ? "Đã cấp. Bấm một bài ở trên là mở ra và đọc tiếp ngay."
    : "Cần cấp quyền để mở lại bài từ danh sách trên.";
  $("permBtn").textContent = has ? "Thu hồi" : "Cấp quyền";
}

function wirePerm() {
  $("permBtn").addEventListener("click", async () => {
    let has = false;
    try { has = await chrome.permissions.contains(ALL_URLS); } catch (e) {}
    try {
      if (has) await chrome.permissions.remove(ALL_URLS);
      else await chrome.permissions.request(ALL_URLS);
    } catch (e) {}
    paintPerm();
  });

  $("libClear").addEventListener("click", async () => {
    const all = await chrome.storage.local.get(null);
    const keys = Object.keys(all).filter((k) => k.startsWith("pos:"));
    if (keys.length) await chrome.storage.local.remove(keys);
    paintLibrary();
  });
}

wirePerm();
paintLibrary();
paintPerm();
