// Mô phỏng môi trường service worker của Chrome — dùng chung cho các bộ kiểm thử.
//
// Nguyên tắc: mock phải KHÓ TÍNH ĐÚNG NHƯ CHROME THẬT, không dễ dãi hơn.
// Bản mock đầu tiên của bộ này gọi callback của contextMenus.removeAll một cách
// ĐỒNG BỘ. Chrome thật thì bất đồng bộ. Chính khe hở bất đồng bộ đó mới sinh ra
// lỗi "Cannot create item with duplicate id" khi hai lượt buildMenu() đan nhau —
// mock dễ dãi làm test xanh trong khi extension đỏ lòm trên Chrome.
//
// Những chỗ mock này cố tình mô phỏng sát:
//   • removeAll / create trả callback ở lượt tick sau (bất đồng bộ thật)
//   • create ném lỗi trùng id qua chrome.runtime.lastError
//   • lastError không được đọc trong callback → ghi vào danh sách "unchecked"
//   • storage.set kích hoạt storage.onChanged (bất đồng bộ)
//   • KHÔNG có window, KHÔNG có document

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const BASE = path.join(__dirname, "..", "lamp-reader");

const later = (fn) => setTimeout(fn, 0);

function makeSWContext(opts = {}) {
  // `keep` cho phép mô phỏng SERVICE WORKER NGỦ RỒI DẬY: dựng ngữ cảnh mới
  // (mất sạch biến toàn cục) nhưng giữ nguyên storage và menu, đúng như Chrome.
  const store = opts.keep ? opts.keep.store : { sync: {}, local: {}, session: {} };
  const menus = opts.keep ? opts.keep.menus : new Map();
  const calls = {
    listeners: [], created: [], executed: [],
    session: store.session,  // cùng một đối tượng, tiện cho phép kiểm cũ
    unchecked: [],          // lastError bị bỏ quên → Chrome kêu trên trang lỗi
    menuErrors: [],         // lỗi create thực sự xảy ra
    warnings: []
  };

  // ---- runtime.lastError trung thực ----
  // Chrome đặt lastError, gọi callback, rồi kiểm xem callback có ĐỌC nó không.
  let pendingError = null, errorRead = false;
  const deliver = (cb) => {
    errorRead = false;
    try { cb && cb(); } catch (e) { calls.warnings.push("callback ném: " + e.message); }
    if (pendingError && !errorRead) calls.unchecked.push(pendingError.message);
    pendingError = null;
  };

  const fireChanged = (changes, areaName) => later(() => {
    calls.listeners.filter((l) => l[0] === "storageChanged")
      .forEach(([, fn]) => fn(changes, areaName));
  });

  const area = (bag, name) => ({
    get: async (q) => {
      if (q == null) return { ...bag };
      if (typeof q === "string") return q in bag ? { [q]: bag[q] } : {};
      if (Array.isArray(q)) { const o = {}; q.forEach((k) => { if (k in bag) o[k] = bag[k]; }); return o; }
      const o = {}; Object.keys(q).forEach((k) => (o[k] = k in bag ? bag[k] : q[k])); return o;
    },
    set: async (o) => {
      const changes = {};
      for (const k of Object.keys(o)) { changes[k] = { oldValue: bag[k], newValue: o[k] }; bag[k] = o[k]; }
      if (name && Object.keys(changes).length) fireChanged(changes, name);
    },
    remove: async (k) => (Array.isArray(k) ? k : [k]).forEach((x) => delete bag[x])
  });

  const on = (name) => ({ addListener: (fn) => calls.listeners.push([name, fn]) });

  const sandbox = {
    console: { log: () => {}, warn: (...a) => calls.warnings.push(a.join(" ")), error: (...a) => calls.warnings.push(a.join(" ")) },
    setTimeout, clearTimeout, Promise, Date, Math, JSON, Intl,
    URL, URLSearchParams, TextDecoder, Blob, Response, queueMicrotask,
    chrome: {
      runtime: {
        onInstalled: on("onInstalled"), onStartup: on("onStartup"), onMessage: on("onMessage"),
        getURL: (p) => "chrome-extension://test/" + p,
        get lastError() { errorRead = true; return pendingError; }
      },
      storage: {
        sync: area(store.sync, "sync"), local: area(store.local, "local"),
        // storage.session phải là kho THẬT: background dùng nó để giữ mã cửa
        // sổ đọc qua các lần service worker ngủ dậy. Mock cũ trả về {} nên mọi
        // phép kiểm về việc dùng lại cửa sổ đều xanh giả.
        session: area(store.session, null),
        onChanged: on("storageChanged")
      },
      contextMenus: {
        // Chrome áp dụng lệnh NGAY KHI tiến trình trình duyệt nhận được, còn
        // callback mới quay về sau. Hai chuyện đó tách rời nhau, và chính khoảng
        // tách đó sinh ra lỗi trùng id:
        //
        //   A.removeAll ─┐ B.removeAll ─┐   (cả hai đã xoá xong ở phía browser)
        //                └─ cbA → A.create   (tạo được)
        //                              └─ cbB → B.create  ← TRÙNG ID
        //
        // Mock nào xoá đúng lúc callback về sẽ không bao giờ thấy lỗi này.
        removeAll: (cb) => { menus.clear(); later(() => deliver(cb)); },
        create: (o, cb) => {
          if (menus.has(o.id)) {
            pendingError = { message: "Cannot create item with duplicate id " + o.id };
            calls.menuErrors.push(pendingError.message);
          } else {
            menus.set(o.id, o);
          }
          later(() => deliver(cb));
          return o.id;
        },
        update: (id, o, cb) => {
          if (!menus.has(id)) pendingError = { message: "Cannot find menu item with id " + id };
          else Object.assign(menus.get(id), o);
          later(() => deliver(cb));
        },
        onClicked: on("menuClicked")
      },
      commands: { onCommand: on("command") },
      tabs: {
        create: async (o) => { calls.created.push(o.url); return { id: 1 }; },
        update: async () => ({}),
        query: async () => [{ id: 1, url: "https://x.test/a" }],
        onUpdated: on("tabsUpdated"), sendMessage: async () => ({})
      },
      windows: {
        create: async (o) => { calls.created.push(o.url); return { id: 9 }; },
        get: async () => { throw new Error("no window"); },
        update: async () => ({}),
        onBoundsChanged: on("bounds"), onRemoved: on("winRemoved")
      },
      scripting: {
        executeScript: async (o) => {
          calls.executed.push(o.files || "func");
          return [{ result: opts.doc || { title: "T", source: "main", blocks: [{ text: "x ".repeat(40), type: "p" }] } }];
        }
      }
    },
    calls, store, menus
  };
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  // KHÔNG gán window / document — service worker thật không có

  const ctx = vm.createContext(sandbox);
  sandbox.importScripts = (...files) => {
    for (const f of files) {
      vm.runInContext(fs.readFileSync(path.join(BASE, f), "utf8"), ctx, { filename: f });
    }
  };
  return { ctx, sandbox, calls, store, menus, chrome: sandbox.chrome };
}

// Mô phỏng Chrome tắt service worker rồi dựng lại: ngữ cảnh mới, storage cũ.
function restartSW(h, opts = {}) {
  const next = makeSWContext({ ...opts, keep: { store: h.store, menus: h.menus } });
  loadBackground(next);
  return next;
}

const loadBackground = (h) =>
  vm.runInContext(fs.readFileSync(path.join(BASE, "background.js"), "utf8"), h.ctx,
                  { filename: "background.js" });

const fire = (h, name) => h.calls.listeners.filter((l) => l[0] === name).map((l) => l[1]);
const settle = (ms = 60) => new Promise((r) => setTimeout(r, ms));

module.exports = { BASE, makeSWContext, restartSW, loadBackground, fire, settle };
