// Lamp — background service worker
// Tiêm script vào tab hiện tại khi người dùng bấm Alt+R, bấm nút trong popup,
// hoặc chọn "Đọc bằng Lamp" từ menu chuột phải.

importScripts("content/defaults.js", "content/i18n.js");
const DEFAULTS = self.LAMP_DEFAULTS;

const MENU_ID = "lamp-read-selection";

// Tuỳ chọn đã gỡ khỏi ứng dụng — xoá luôn khỏi storage để không tồn đọng
// những khoá không còn ai đọc tới.
const RETIRED_KEYS = ["bionic"];

// Nhãn menu chuột phải phải theo ngôn ngữ người dùng chọn, và phải dựng lại
// khi họ đổi ngôn ngữ — menu được tạo một lần lúc cài nên không tự cập nhật.
//
// CẨN THẬN: chrome.contextMenus.create ném lỗi nếu id đã tồn tại
// ("Cannot create item with duplicate id"), và không có bản "tạo-hoặc-cập-nhật".
// buildMenu() lại bị gọi từ ba nguồn (onInstalled, onStartup, đổi ngôn ngữ) và
// bên trong có await, nên hai lượt gọi rất dễ lồng vào nhau:
//
//     A: removeAll ──┐            ┌─ create  (ok)
//     B: removeAll ──┴─ ... ──────┴─ create  (TRÙNG ID → lỗi)
//
// Vì removeAll của Chrome là bất đồng bộ thật, cả hai lượt cùng thấy "menu đang
// trống" rồi cùng tạo. Xâu mọi lượt gọi vào một hàng đợi để chúng chạy nối đuôi.
let menuQueue = Promise.resolve();

function buildMenu() {
  menuQueue = menuQueue
    .catch(() => {})
    .then(rebuildMenu)
    .catch((e) => console.warn("Lamp: không dựng được menu —", e && e.message));
  return menuQueue;
}

async function rebuildMenu() {
  const { lang } = await chrome.storage.sync.get({ lang: DEFAULTS.lang });
  self.__lampI18n.setLang(lang);
  const title = self.__lampI18n.t("menu.readSelection");

  await new Promise((r) => chrome.contextMenus.removeAll(r));
  await new Promise((resolve) => {
    chrome.contextMenus.create({ id: MENU_ID, title, contexts: ["selection"] }, () => {
      // PHẢI đọc lastError ngay trong callback. Không đọc thì Chrome ghi
      // "Unchecked runtime.lastError" vào trang lỗi của extension — người dùng
      // thấy extension báo lỗi đỏ dù mọi thứ vẫn chạy.
      const err = chrome.runtime.lastError;
      if (err) console.warn("Lamp: contextMenus.create —", err.message);
      resolve();
    });
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.sync.remove(RETIRED_KEYS);
  // Chỉ ghi những khoá CÒN THIẾU. Ghi đè cả cụm mỗi lần cài/cập nhật vừa tốn
  // hạn mức storage.sync, vừa làm storage.onChanged nổ oan — mà onChanged lại
  // gọi buildMenu(), tức là tự tạo ra đúng cuộc đua nói trên ngay lúc cài.
  const stored = await chrome.storage.sync.get(null);
  const missing = {};
  for (const k of Object.keys(DEFAULTS)) {
    if (!(k in stored)) missing[k] = DEFAULTS[k];
  }
  if (Object.keys(missing).length) await chrome.storage.sync.set(missing);
  buildMenu();
});

chrome.runtime.onStartup.addListener(buildMenu);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync" || !changes.lang) return;
  // Ghi lại đúng giá trị cũ thì không phải "đổi ngôn ngữ", đừng dựng lại menu.
  if (changes.lang.oldValue === changes.lang.newValue) return;
  buildMenu();
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
const WIN_ID_KEY = "readerWindowId";
const DEFAULT_BOUNDS = { width: 980, height: 760 };

// Mã cửa sổ đọc PHẢI cất ngoài bộ nhớ. Service worker của MV3 bị Chrome tắt
// sau khoảng 30 giây không việc, và mọi biến toàn cục mất theo. Trước đây mã
// này nằm trong `let readerWindowId`, nên chỉ cần rảnh nửa phút là:
//   • mở bài tiếp theo → đẻ thêm cửa sổ mới thay vì dùng lại cửa sổ đang mở;
//   • kéo to nhỏ cửa sổ → onBoundsChanged so với null nên không lưu được gì,
//     tức là "nhớ kích thước cửa sổ" hầu như không bao giờ chạy.
// storage.session hợp ở đây: sống qua các lần service worker ngủ/dậy, và tự
// xoá khi đóng trình duyệt — đúng lúc mã cửa sổ cũng hết giá trị.
let winIdCache = null;

async function getReaderWindowId() {
  if (winIdCache !== null) return winIdCache;
  const got = await chrome.storage.session.get(WIN_ID_KEY);
  winIdCache = got[WIN_ID_KEY] ?? null;
  return winIdCache;
}

async function setReaderWindowId(id) {
  winIdCache = id;
  if (id === null) await chrome.storage.session.remove(WIN_ID_KEY);
  else await chrome.storage.session.set({ [WIN_ID_KEY]: id });
}

async function openReaderWindow(doc) {
  // Nội dung bài có thể vài chục nghìn ký tự — không nhét vào URL được.
  // Gửi qua storage.session (tự xoá khi đóng trình duyệt), URL chỉ mang mã ngắn.
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  await chrome.storage.session.set({ ["doc:" + id]: doc });

  const url = chrome.runtime.getURL("reader/reader.html?doc=" + id);

  // Đã có cửa sổ đọc đang mở thì dùng lại, đừng rải thêm cửa sổ mới
  const openId = await getReaderWindowId();
  if (openId !== null) {
    try {
      const win = await chrome.windows.get(openId, { populate: true });
      const tab = win.tabs && win.tabs[0];
      if (tab) {
        await chrome.tabs.update(tab.id, { url });
        await chrome.windows.update(openId, { focused: true });
        return { ok: true, reason: "window-reused" };
      }
    } catch (e) {
      await setReaderWindowId(null); // cửa sổ đã bị đóng
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
  await setReaderWindowId(win.id);
  return { ok: true, reason: "window" };
}

// Nhớ kích thước/vị trí cửa sổ cho lần sau
chrome.windows.onBoundsChanged.addListener(async (win) => {
  if (win.id !== (await getReaderWindowId())) return;
  await chrome.storage.local.set({
    [WIN_BOUNDS_KEY]: { width: win.width, height: win.height, left: win.left, top: win.top }
  });
});
chrome.windows.onRemoved.addListener(async (id) => {
  if (id === (await getReaderWindowId())) await setReaderWindowId(null);
});

// LUÔN trả về một đối tượng, KHÔNG BAO GIỜ ném ra ngoài.
//
// Hai nơi gọi hàm này (phím tắt, menu chuột phải) gọi kiểu bắn-rồi-quên. Một
// lời hứa bị từ chối mà không ai bắt sẽ hiện thành dòng đỏ trên trang lỗi của
// extension — người dùng mở ra thấy báo lỗi mà chẳng biết vì sao. Trước đây
// tabs.create và storage.sync.get nằm NGOÀI try nên vẫn lọt được ra ngoài.
const warnLaunch = (e) => console.warn("Lamp: không mở được trình đọc —", e && e.message);

async function launchReader(tabId, url, forceSelection = false) {
  try {
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
        "content/i18n.js",
        "content/extractor.js",
        "content/engine.js",
        "content/reader.js"
      ]
    });
    const settings = await chrome.storage.sync.get(DEFAULTS);
    await chrome.tabs.sendMessage(tabId, { type: "LAMP_TOGGLE", settings, forceSelection });
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: (err && err.message) || String(err) };
  }
}

// Listener BẤT ĐỒNG BỘ thì thân hàm phải tự bọc try. Chrome không bắt giúp:
// lời hứa bị từ chối ở đây nổi thẳng lên thành lỗi chưa xử lý của extension.
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-reader") return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) await launchReader(tab.id, tab.url);
  } catch (e) { warnLaunch(e); }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  // true = chỉ đọc đúng đoạn đang bôi đen, không đọc cả trang
  if (info.menuItemId === MENU_ID && tab) {
    launchReader(tab.id, tab.url, true).catch(warnLaunch);
  }
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
    let timer = null;
    const finish = (res) => {
      if (done) return;
      done = true;
      // Dọn cả hẹn giờ: để nguyên thì service worker bị giữ thức thêm 20 giây
      // sau khi việc đã xong, chẳng để làm gì.
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve(res);
    };
    const onUpdated = (tabId, info) => {
      if (tabId !== tab.id || info.status !== "complete") return;
      launchReader(tab.id, url).then(finish);
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
    // Trang không bao giờ báo "complete" (tải mãi, bị chặn…) thì cũng phải nhả
    timer = setTimeout(() => finish({ ok: false, reason: "timeout" }), 20000);
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // .catch ở đây không thừa: nếu nhánh nào ném mà không ai trả lời, popup sẽ
  // treo chờ mãi, và lỗi thì hiện lên trang lỗi của extension.
  const reply = (p) => p.then(sendResponse,
    (e) => sendResponse({ ok: false, reason: (e && e.message) || String(e) }));

  if (msg.type === "LAMP_LAUNCH") {
    reply(launchReader(msg.tabId, msg.url, msg.forceSelection));
    return true; // giữ kênh mở cho phản hồi bất đồng bộ
  }
  if (msg.type === "LAMP_RESUME") {
    reply(resumeReading(msg.url));
    return true;
  }
});
