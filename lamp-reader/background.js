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

// ============================ CỬA SỔ ĐỌC RIÊNG ============================
//
// Mặc định Lamp mở trong một CỬA SỔ RIÊNG chứ không phủ overlay lên trang web
// đang đọc. Lý do: trang web vẫn chạy tiếp phía sau (video tự phát, thông báo,
// script cuộn trang) và CSS của nó có thể xung đột; tách hẳn ra một cửa sổ thì
// môi trường đọc sạch và ổn định, lại xếp cạnh cửa sổ khác được.
//
// Vẫn giữ chế độ overlay cho ai thích — bật/tắt bằng tuỳ chọn windowMode.

const WIN_BOUNDS_KEY = "readerWindowBounds";
const DEFAULT_BOUNDS = { width: 980, height: 760 };

let readerWindowId = null;

async function openReaderWindow(doc) {
  // Nội dung bài có thể vài chục nghìn ký tự — không nhét vào URL được.
  // Gửi qua storage.session (tự xoá khi đóng trình duyệt), URL chỉ mang mã ngắn.
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  await chrome.storage.session.set({ ["doc:" + id]: doc });

  const url = chrome.runtime.getURL("reader/reader.html?doc=" + id);

  // Đã có cửa sổ đọc đang mở thì dùng lại, đừng rải thêm cửa sổ mới
  if (readerWindowId !== null) {
    try {
      const win = await chrome.windows.get(readerWindowId, { populate: true });
      const tab = win.tabs && win.tabs[0];
      if (tab) {
        await chrome.tabs.update(tab.id, { url });
        await chrome.windows.update(readerWindowId, { focused: true });
        return { ok: true, reason: "window-reused" };
      }
    } catch (e) {
      readerWindowId = null; // cửa sổ đã bị đóng
    }
  }

  const stored = (await chrome.storage.local.get(WIN_BOUNDS_KEY))[WIN_BOUNDS_KEY];
  const b = { ...DEFAULT_BOUNDS, ...(stored || {}) };
  const win = await chrome.windows.create({
    url,
    type: "popup",   // không thanh địa chỉ, không tab — đúng kiểu một app đọc
    focused: true,
    width: b.width, height: b.height,
    ...(Number.isInteger(b.left) ? { left: b.left } : {}),
    ...(Number.isInteger(b.top) ? { top: b.top } : {})
  });
  readerWindowId = win.id;
  return { ok: true, reason: "window" };
}

// Nhớ kích thước/vị trí cửa sổ cho lần sau
chrome.windows.onBoundsChanged.addListener((win) => {
  if (win.id !== readerWindowId) return;
  chrome.storage.local.set({
    [WIN_BOUNDS_KEY]: { width: win.width, height: win.height, left: win.left, top: win.top }
  });
});
chrome.windows.onRemoved.addListener((id) => {
  if (id === readerWindowId) readerWindowId = null;
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

  const { windowMode } = await chrome.storage.sync.get({ windowMode: DEFAULTS.windowMode });

  try {
    if (windowMode) {
      // Chỉ tiêm bộ TÁCH NỘI DUNG vào trang, lấy kết quả ra rồi thôi —
      // trình đọc chạy ở cửa sổ riêng nên trang web không bị đụng gì thêm.
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content/extractor.js"]
      });
      const [res] = await chrome.scripting.executeScript({
        target: { tabId },
        func: (force) => window.__lampExtract(force),
        args: [forceSelection]
      });
      const doc = res && res.result;
      const joined = doc && doc.blocks ? doc.blocks.map((b) => b.text).join(" ") : "";
      if (joined.trim().length < 40) {
        return { ok: false, reason: forceSelection ? "empty-selection" : "empty-page" };
      }
      doc.url = url;
      return await openReaderWindow(doc);
    }

    // Chế độ overlay (cũ): tiêm cả trình đọc vào trang
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
