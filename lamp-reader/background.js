// Lamp — background service worker
// Tiêm script vào tab hiện tại khi người dùng bấm Alt+R, bấm nút trong popup,
// hoặc chọn "Đọc bằng Lamp" từ menu chuột phải.

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

const MENU_ID = "lamp-read-selection";

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get(DEFAULTS);
  await chrome.storage.sync.set({ ...DEFAULTS, ...stored });

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Đọc nhanh đoạn này bằng Lamp",
      contexts: ["selection"]
    });
  });
});

async function launchReader(tabId, url, forceSelection = false) {
  if (!url || /^(chrome|edge|about|chrome-extension|devtools|view-source):/.test(url)) {
    return { ok: false, reason: "internal-page" };
  }

  // Chrome hiển thị PDF bằng plugin riêng, content script không đọc được chữ.
  // Chuyển sang trang đọc PDF của extension.
  if (/\.pdf(\?|#|$)/i.test(url)) {
    const viewer = chrome.runtime.getURL(
      "viewer/viewer.html?file=" + encodeURIComponent(url)
    );
    await chrome.tabs.create({ url: viewer });
    return { ok: true, reason: "pdf-viewer" };
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content/extractor.js", "content/engine.js", "content/reader.js"]
    });
    const settings = await chrome.storage.sync.get(DEFAULTS);
    await chrome.tabs.sendMessage(tabId, { type: "LAMP_TOGGLE", settings, forceSelection });
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-reader") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) launchReader(tab.id, tab.url);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  // true = chỉ đọc đúng đoạn đang bôi đen, không đọc cả trang
  if (info.menuItemId === MENU_ID && tab) launchReader(tab.id, tab.url, true);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "LAMP_LAUNCH") {
    launchReader(msg.tabId, msg.url).then(sendResponse);
    return true; // giữ kênh mở cho phản hồi bất đồng bộ
  }
});
