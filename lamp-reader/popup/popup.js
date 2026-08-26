// Lamp — popup.js

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
  restReminder: true
};

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
