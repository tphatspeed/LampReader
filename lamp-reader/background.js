// Lamp — background service worker
// Tiêm script vào tab hiện tại khi người dùng bấm Alt+R, bấm nút trong popup,
// hoặc chọn "Đọc bằng Lamp" từ menu chuột phải.

importScripts("content/defaults.js");
const DEFAULTS = self.LAMP_DEFAULTS;

const MENU_ID = "lamp-read-selection";

// Tuỳ chọn đã gỡ khỏi ứng dụng — xoá luôn khỏi storage để không tồn đọng
// những khoá không còn ai đọc tới.
const RETIRED_KEYS = ["bionic"];

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.sync.remove(RETIRED_KEYS);
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
      files: [
        "content/defaults.js",
        "content/extractor.js",
        "content/engine.js",
        "content/reader.js"
      ]
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

// Mở lại một tài liệu từ thư viện: tạo tab, chờ tải xong rồi mới tiêm script.
// Tab mới KHÔNG được activeTab bảo trợ (cử chỉ của người dùng thuộc về tab cũ),
// nên bước này chỉ chạy được khi đã cấp quyền cho trang đó — popup lo phần xin
// quyền trước khi gửi thông điệp này xuống.
function resumeReading(url) {
  return new Promise(async (resolve) => {
    let tab;
    try {
      tab = await chrome.tabs.create({ url });
    } catch (err) {
      resolve({ ok: false, reason: err.message });
      return;
    }
    let done = false;
    const finish = (res) => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve(res);
    };
    const onUpdated = (tabId, info) => {
      if (tabId !== tab.id || info.status !== "complete") return;
      launchReader(tab.id, url).then(finish);
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
    // Trang không bao giờ báo "complete" (tải mãi, bị chặn…) thì cũng phải nhả
    setTimeout(() => finish({ ok: false, reason: "timeout" }), 20000);
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "LAMP_LAUNCH") {
    launchReader(msg.tabId, msg.url, msg.forceSelection).then(sendResponse);
    return true; // giữ kênh mở cho phản hồi bất đồng bộ
  }
  if (msg.type === "LAMP_RESUME") {
    resumeReading(msg.url).then(sendResponse);
    return true;
  }
});
