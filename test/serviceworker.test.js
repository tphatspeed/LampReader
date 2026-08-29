// Kiểm thử background.js trong ĐÚNG môi trường service worker.
//
// Vì sao cần riêng bộ này: mọi kiểm thử khác chạy trong một trang web, nơi luôn
// có `window` và `document`. Service worker KHÔNG có hai thứ đó. Một dòng
// `if (window.x) return;` trong file được importScripts là đủ để Chrome từ chối
// đăng ký service worker với thông báo cụt lủn "Service worker registration
// failed. Status code: 15" — không nói file nào, dòng nào.
//
// Bộ này dựng ngữ cảnh chỉ có đúng những gì service worker có (xem swmock.js),
// rồi chạy thật background.js trên đó.

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { BASE, makeSWContext, restartSW, loadBackground, fire, settle } = require("./swmock.js");

let pass = 0, fail = 0;
const ok = (n, c, e) => c
  ? (pass++, console.log("  ok   " + n))
  : (fail++, console.log("  FAIL " + n + (e ? "  → " + e : "")));

const read = (f) => fs.readFileSync(path.join(BASE, f), "utf8");

console.log("\n== ngữ cảnh mô phỏng đúng service worker ==");
{
  const { sandbox } = makeSWContext();
  ok("không có window", typeof sandbox.window === "undefined");
  ok("không có document", typeof sandbox.document === "undefined");
  ok("có self trỏ về chính global", sandbox.self === sandbox);
  ok("có importScripts", typeof sandbox.importScripts === "function");
}

console.log("\n== các file được importScripts phải chạy được ==");
for (const f of ["content/defaults.js", "content/i18n.js"]) {
  const { ctx } = makeSWContext();
  let err = null;
  try { vm.runInContext(read(f), ctx, { filename: f }); } catch (e) { err = e; }
  ok(`${f} nạp được, không ném lỗi`, !err, err && err.message);
}
{
  const { ctx, sandbox } = makeSWContext();
  vm.runInContext(read("content/defaults.js"), ctx);
  vm.runInContext(read("content/i18n.js"), ctx);
  ok("defaults.js gắn được LAMP_DEFAULTS", !!sandbox.LAMP_DEFAULTS);
  ok("i18n.js gắn được __lampI18n", !!sandbox.__lampI18n);
  ok("dịch được trong service worker",
     sandbox.__lampI18n.t("menu.readSelection").length > 5);
  // Service worker không có navigator.language ở mọi phiên bản Chrome —
  // lang:"auto" phải rơi về ngôn ngữ dự phòng chứ không được ném lỗi.
  let e2 = null;
  try { sandbox.__lampI18n.setLang("auto"); } catch (e) { e2 = e; }
  ok("lang 'auto' không cần navigator", !e2, e2 && e2.message);
}

console.log("\n== quét tĩnh: không được chạm window/document trần ==");
{
  const strip = (src) => src
    .replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ")
    .replace(/"[^"\n]*"/g, '""').replace(/'[^'\n]*'/g, "''").replace(/`[^`]*`/g, "``");
  for (const f of ["content/defaults.js", "content/i18n.js"]) {
    const bad = [...strip(read(f)).matchAll(/(^|[^.\w])(window|document)\b/g)].map((m) => m[2]);
    ok(`${f} không dùng window/document trần`, bad.length === 0, bad.join(", "));
  }
  const bg = strip(read("background.js"));
  const inFunc = /func:\s*\([^)]*\)\s*=>\s*window\./.test(bg);
  const total = [...bg.matchAll(/(^|[^.\w])(window|document)\b/g)].length;
  ok("background.js chỉ nhắc window trong hàm tiêm vào trang",
     total === (inFunc ? 1 : 0), `${total} chỗ`);
}

console.log("\n== background.js đăng ký được ==");
const h0 = makeSWContext();
let bgErr = null;
try { loadBackground(h0); } catch (e) { bgErr = e; }
ok("background.js chạy trọn, không ném lỗi", !bgErr,
   bgErr && (bgErr.message + " @ " + String(bgErr.stack).split("\n")[1]));

if (bgErr) { console.log(`\n${pass} passed, ${fail} failed`); process.exit(1); }

{
  const names = h0.calls.listeners.map((l) => l[0]);
  for (const need of ["onInstalled", "onStartup", "onMessage", "command", "menuClicked", "storageChanged", "bounds", "winRemoved"]) {
    ok(`có listener ${need}`, names.includes(need));
  }
  ok("defaults.js cấp được cho background",
     !!h0.sandbox.LAMP_DEFAULTS && h0.sandbox.LAMP_DEFAULTS.wpm === 350);
}

(async () => {
  // ─────────────────────────────────────────────────────────────────────
  // MENU CHUỘT PHẢI — nhóm hồi quy cho lỗi
  //   "Cannot create item with duplicate id lamp-read-selection"
  //
  // buildMenu() bị gọi từ ba nguồn và bên trong có await. Chrome áp dụng
  // removeAll ngay khi nhận lệnh nhưng trả callback sau, nên hai lượt gọi
  // chồng nhau sẽ cùng thấy menu trống rồi cùng create → trùng id.
  // ─────────────────────────────────────────────────────────────────────
  console.log("\n== menu chuột phải: đúng ngôn ngữ ==");
  {
    const h = makeSWContext(); loadBackground(h);
    h.store.sync.lang = "vi";
    await fire(h, "onStartup")[0](); await settle();
    ok("menu dựng bằng tiếng Việt",
       [...h.menus.values()][0].title === "Đọc nhanh đoạn này bằng Lamp",
       [...h.menus.values()].map((m) => m.title).join());

    h.store.sync.lang = "en";
    await fire(h, "storageChanged")[0]({ lang: { oldValue: "vi", newValue: "en" } }, "sync");
    await settle();
    ok("đổi ngôn ngữ thì dựng lại menu",
       [...h.menus.values()][0].title === "Speed-read this with Lamp",
       [...h.menus.values()].map((m) => m.title).join());
    ok("vẫn chỉ có đúng một mục", h.menus.size === 1, String(h.menus.size));
  }

  console.log("\n== menu chuột phải: chống trùng id ==");
  {
    // Kịch bản đúng như người dùng gặp: CÀI MỚI, storage rỗng.
    // onInstalled ghi mặc định → storage.onChanged nổ → buildMenu (lượt 1),
    // rồi onInstalled tự gọi buildMenu (lượt 2). Hai lượt đan vào nhau.
    const h = makeSWContext(); loadBackground(h);
    await fire(h, "onInstalled")[0](); await settle(200);
    ok("[cài mới] tạo đúng 1 mục menu", h.menus.size === 1, String(h.menus.size));
    ok("[cài mới] không có lỗi trùng id", h.calls.menuErrors.length === 0,
       h.calls.menuErrors.join(" | "));
    ok("[cài mới] không bỏ quên lastError", h.calls.unchecked.length === 0,
       h.calls.unchecked.join(" | "));
  }
  {
    // Bốn nguồn dồn cùng lúc, không await giữa chừng
    const h = makeSWContext(); loadBackground(h);
    fire(h, "onInstalled")[0]();
    fire(h, "onStartup")[0]();
    fire(h, "storageChanged")[0]({ lang: { oldValue: "vi", newValue: "en" } }, "sync");
    fire(h, "storageChanged")[0]({ lang: { oldValue: "en", newValue: "vi" } }, "sync");
    await settle(300);
    ok("[4 nguồn dồn] đúng 1 mục menu", h.menus.size === 1, String(h.menus.size));
    ok("[4 nguồn dồn] không lỗi trùng id", h.calls.menuErrors.length === 0,
       h.calls.menuErrors.join(" | "));
    ok("[4 nguồn dồn] không bỏ quên lastError", h.calls.unchecked.length === 0,
       h.calls.unchecked.join(" | "));
  }
  {
    // Bấm đổi ngôn ngữ liên tục
    const h = makeSWContext(); loadBackground(h);
    const ch = fire(h, "storageChanged")[0];
    for (let i = 0; i < 20; i++) {
      ch({ lang: { oldValue: i % 2 ? "vi" : "en", newValue: i % 2 ? "en" : "vi" } }, "sync");
    }
    await settle(400);
    ok("[20 lượt đổi] đúng 1 mục menu", h.menus.size === 1, String(h.menus.size));
    ok("[20 lượt đổi] không lỗi trùng id", h.calls.menuErrors.length === 0,
       String(h.calls.menuErrors.length) + " lỗi");
  }
  {
    // Ghi lại đúng giá trị cũ (popup lưu cả cụm cài đặt mỗi lần chỉnh bất cứ gì)
    // thì KHÔNG phải đổi ngôn ngữ — đừng dựng lại menu cho tốn công.
    const h = makeSWContext(); loadBackground(h);
    await fire(h, "onStartup")[0](); await settle();
    const before = h.calls.menuErrors.length;
    for (let i = 0; i < 10; i++) {
      fire(h, "storageChanged")[0]({ lang: { oldValue: "vi", newValue: "vi" } }, "sync");
    }
    await settle(150);
    ok("ghi lại cùng giá trị thì bỏ qua", h.menus.size === 1 && h.calls.menuErrors.length === before);
  }
  {
    // storage.onChanged của vùng khác (local/session) không được đụng menu
    const h = makeSWContext(); loadBackground(h);
    await fire(h, "onStartup")[0](); await settle();
    fire(h, "storageChanged")[0]({ lang: { oldValue: "vi", newValue: "en" } }, "local");
    await settle(80);
    ok("đổi ở vùng local không dựng lại menu", h.menus.size === 1 && h.calls.menuErrors.length === 0);
  }

  console.log("\n== cài đặt lần đầu ==");
  {
    const h = makeSWContext(); loadBackground(h);
    await fire(h, "onInstalled")[0](); await settle(150);
    const keys = Object.keys(h.sandbox.LAMP_DEFAULTS);
    ok("điền đủ mọi khoá mặc định",
       keys.every((k) => k in h.store.sync),
       keys.filter((k) => !(k in h.store.sync)).join(","));
  }
  {
    // Cập nhật extension: KHÔNG được ghi đè lựa chọn của người dùng
    const h = makeSWContext(); loadBackground(h);
    h.store.sync.wpm = 600; h.store.sync.theme = "dark"; h.store.sync.lang = "en";
    await fire(h, "onInstalled")[0](); await settle(150);
    ok("cập nhật không đè cài đặt cũ",
       h.store.sync.wpm === 600 && h.store.sync.theme === "dark" && h.store.sync.lang === "en",
       JSON.stringify({ wpm: h.store.sync.wpm, theme: h.store.sync.theme }));
    ok("vẫn bổ sung khoá còn thiếu", h.store.sync.chunkSize === 1);
  }
  {
    // Khoá đã gỡ khỏi ứng dụng phải bị dọn
    const h = makeSWContext(); loadBackground(h);
    h.store.sync.bionic = true;
    await fire(h, "onInstalled")[0](); await settle(150);
    ok("xoá khoá đã ngừng dùng (bionic)", !("bionic" in h.store.sync));
  }

  console.log("\n== mở cửa sổ đọc ==");
  {
    const h = makeSWContext(); loadBackground(h);
    h.store.sync.windowMode = true;
    const res = await new Promise((r) =>
      fire(h, "onMessage")[0]({ type: "LAMP_LAUNCH", tabId: 1, url: "https://x.test/a" }, {}, r));
    ok("trả về ok", res && res.ok, JSON.stringify(res));
    ok("mở bằng CỬA SỔ, không phải tab", res.reason === "window", res.reason);
    ok("chỉ tiêm extractor vào trang",
       JSON.stringify(h.calls.executed[0]) === JSON.stringify(["content/extractor.js"]),
       JSON.stringify(h.calls.executed[0]));
    ok("nội dung cất vào storage.session",
       Object.keys(h.calls.session).some((k) => k.startsWith("doc:")));
    ok("cửa sổ mở đúng trang reader",
       h.calls.created.some((u) => /reader\/reader\.html\?doc=/.test(u)));
  }
  {
    const h = makeSWContext(); loadBackground(h);
    h.store.sync.windowMode = false;
    const res = await new Promise((r) =>
      fire(h, "onMessage")[0]({ type: "LAMP_LAUNCH", tabId: 1, url: "https://x.test/a" }, {}, r));
    ok("chế độ overlay tiêm đủ 5 file",
       Array.isArray(h.calls.executed[0]) && h.calls.executed[0].length === 5,
       JSON.stringify(h.calls.executed[0]));
    ok("chế độ overlay không mở cửa sổ", h.calls.created.length === 0);
    ok("chế độ overlay trả ok", res && res.ok);
  }

  // ─────────────────────────────────────────────────────────────────────
  // SERVICE WORKER NGỦ RỒI DẬY
  //
  // MV3 tắt service worker sau ~30 giây rảnh; mọi biến toàn cục mất sạch.
  // Bất cứ thứ gì cần sống lâu hơn phải nằm trong storage. Nhóm này bắt đúng
  // lớp lỗi đó — nhóm cũ chỉ chạy trong MỘT vòng đời nên không bao giờ thấy.
  // ─────────────────────────────────────────────────────────────────────
  console.log("\n== sống sót qua lần service worker ngủ dậy ==");
  {
    const launch = (ctx) => new Promise((r) =>
      fire(ctx, "onMessage")[0]({ type: "LAMP_LAUNCH", tabId: 1, url: "https://x.test/a" }, {}, r));

    let h = makeSWContext(); loadBackground(h);
    h.store.sync.windowMode = true;
    const first = await launch(h);
    ok("lần đầu mở cửa sổ mới", first.reason === "window", first.reason);
    const winId = h.store.session.readerWindowId;
    ok("mã cửa sổ được cất vào storage.session", Number.isInteger(winId), String(winId));

    // …service worker ngủ, Chrome dựng lại từ đầu…
    h = restartSW(h);
    // cửa sổ vẫn đang mở
    h.chrome.windows.get = async (id) => ({ id, tabs: [{ id: 77 }] });
    const second = await launch(h);
    ok("sau khi dậy vẫn DÙNG LẠI cửa sổ cũ", second.reason === "window-reused", second.reason);
    ok("không đẻ thêm cửa sổ", h.calls.created.length === 0, h.calls.created.join(","));
  }
  {
    // Cửa sổ đã bị người dùng đóng trong lúc service worker ngủ
    let h = makeSWContext(); loadBackground(h);
    h.store.sync.windowMode = true;
    await new Promise((r) => fire(h, "onMessage")[0]({ type: "LAMP_LAUNCH", tabId: 1, url: "https://x.test/a" }, {}, r));
    h = restartSW(h);   // windows.get mặc định của mock sẽ ném lỗi = cửa sổ đã đóng
    const res = await new Promise((r) =>
      fire(h, "onMessage")[0]({ type: "LAMP_LAUNCH", tabId: 1, url: "https://x.test/b" }, {}, r));
    ok("cửa sổ đã đóng thì mở cái mới", res.reason === "window", res.reason);
    ok("mã cũ được dọn khỏi session, thay bằng mã mới",
       h.store.session.readerWindowId === 9, String(h.store.session.readerWindowId));
  }
  {
    // Nhớ kích thước cửa sổ — trước đây gần như không bao giờ chạy, vì
    // onBoundsChanged so với biến toàn cục đã mất sau khi service worker ngủ.
    let h = makeSWContext(); loadBackground(h);
    h.store.sync.windowMode = true;
    await new Promise((r) => fire(h, "onMessage")[0]({ type: "LAMP_LAUNCH", tabId: 1, url: "https://x.test/a" }, {}, r));
    h = restartSW(h);
    await fire(h, "bounds")[0]({ id: 9, width: 1200, height: 800, left: 40, top: 20 });
    await settle();
    const b = h.store.local.readerWindowBounds;
    ok("kéo cửa sổ sau khi service worker dậy vẫn nhớ được kích thước",
       b && b.width === 1200 && b.height === 800, JSON.stringify(b));

    // cửa sổ của người khác thì kệ
    await fire(h, "bounds")[0]({ id: 12345, width: 300, height: 300, left: 0, top: 0 });
    await settle();
    ok("không ghi đè bằng cửa sổ không phải trình đọc",
       h.store.local.readerWindowBounds.width === 1200,
       JSON.stringify(h.store.local.readerWindowBounds));
  }
  {
    // Đóng cửa sổ đọc thì xoá mã, lần sau mở cái mới
    let h = makeSWContext(); loadBackground(h);
    h.store.sync.windowMode = true;
    await new Promise((r) => fire(h, "onMessage")[0]({ type: "LAMP_LAUNCH", tabId: 1, url: "https://x.test/a" }, {}, r));
    h = restartSW(h);
    await fire(h, "winRemoved")[0](9); await settle();
    ok("đóng cửa sổ thì xoá mã khỏi session",
       !("readerWindowId" in h.store.session), JSON.stringify(h.store.session.readerWindowId));
  }

  console.log("\n== trang không đọc được ==");
  {
    const h = makeSWContext(); loadBackground(h);
    for (const url of ["chrome://extensions", "about:blank", "devtools://x",
                       "view-source:https://a.test", "chrome-extension://abc/x.html"]) {
      const res = await new Promise((r) =>
        fire(h, "onMessage")[0]({ type: "LAMP_LAUNCH", tabId: 1, url }, {}, r));
      ok(`chặn ${url}`, res && res.ok === false && res.reason === "internal-page", JSON.stringify(res));
    }
    const res = await new Promise((r) =>
      fire(h, "onMessage")[0]({ type: "LAMP_LAUNCH", tabId: 1, url: "" }, {}, r));
    ok("URL rỗng bị chặn", res && res.ok === false);
  }
  {
    const h = makeSWContext(); loadBackground(h);
    const res = await new Promise((r) =>
      fire(h, "onMessage")[0]({ type: "LAMP_LAUNCH", tabId: 1, url: "https://a.test/x.pdf" }, {}, r));
    ok("PDF chuyển sang trang xem riêng", res.reason === "pdf-viewer", JSON.stringify(res));
    ok("mở đúng viewer kèm file",
       h.calls.created.some((u) => u.includes("viewer/viewer.html?file=")));
  }
  {
    // Trang không có đủ chữ
    const h = makeSWContext({ doc: { title: "T", blocks: [{ text: "ngắn", type: "p" }] } });
    loadBackground(h);
    h.store.sync.windowMode = true;
    const res = await new Promise((r) =>
      fire(h, "onMessage")[0]({ type: "LAMP_LAUNCH", tabId: 1, url: "https://a.test/x" }, {}, r));
    ok("trang quá ít chữ → báo empty-page", res.ok === false && res.reason === "empty-page",
       JSON.stringify(res));
    const res2 = await new Promise((r) =>
      fire(h, "onMessage")[0]({ type: "LAMP_LAUNCH", tabId: 1, url: "https://a.test/x", forceSelection: true }, {}, r));
    ok("bôi đen quá ngắn → báo empty-selection", res2.reason === "empty-selection");
  }

  // ─────────────────────────────────────────────────────────────────────
  // KHÔNG ĐƯỢC ĐỂ LỜI HỨA BỊ TỪ CHỐI LỌT RA NGOÀI
  //
  // Phím tắt và menu chuột phải gọi launchReader kiểu bắn-rồi-quên. Bất cứ
  // lỗi nào lọt ra sẽ thành dòng đỏ trên trang lỗi của extension — đúng chỗ
  // người dùng đã chụp màn hình gửi tới.
  // ─────────────────────────────────────────────────────────────────────
  console.log("\n== Chrome trở chứng thì cũng không được văng lỗi ==");
  {
    const NO = () => { throw new Error("Chrome hỏng"); };
    const REJ = () => Promise.reject(new Error("Chrome từ chối"));

    const cases = [
      ["tabs.create hỏng (mở PDF)", (c) => { c.tabs.create = REJ; }, "https://a.test/x.pdf"],
      ["storage.sync.get hỏng", (c) => { c.storage.sync.get = REJ; }, "https://a.test/x"],
      ["executeScript bị từ chối", (c) => { c.scripting.executeScript = REJ; }, "https://a.test/x"],
      ["executeScript ném thẳng", (c) => { c.scripting.executeScript = NO; }, "https://a.test/x"],
      ["windows.create hỏng", (c) => { c.windows.create = REJ; }, "https://a.test/x"],
      ["storage.session.set hỏng", (c) => { c.storage.session.set = REJ; }, "https://a.test/x"]
    ];

    for (const [ten, pha, url] of cases) {
      const h = makeSWContext(); loadBackground(h);
      h.store.sync.windowMode = true;
      pha(h.chrome);
      let res = null, threw = null;
      try {
        res = await new Promise((r) =>
          fire(h, "onMessage")[0]({ type: "LAMP_LAUNCH", tabId: 1, url }, {}, r));
      } catch (e) { threw = e; }
      ok(`${ten} → vẫn trả về đối tượng, không ném`,
         !threw && res && typeof res.ok === "boolean",
         threw ? "NÉM: " + threw.message : JSON.stringify(res));
    }

    // Phím tắt và menu chuột phải: gọi bắn-rồi-quên, phải có lưới an toàn
    for (const [ten, nguon, arg] of [
      ["phím tắt Alt+R", "command", "toggle-reader"],
      ["menu chuột phải", "menuClicked", null]
    ]) {
      const h = makeSWContext(); loadBackground(h);
      h.chrome.scripting.executeScript = REJ;
      h.chrome.tabs.query = REJ;                    // hỏng cả chỗ lấy tab
      let esc = null;
      const fn = fire(h, nguon)[0];
      try {
        const r = nguon === "command"
          ? fn(arg)
          : fn({ menuItemId: "lamp-read-selection" }, { id: 1, url: "https://a.test/x" });
        if (r && r.catch) await r.catch((e) => { esc = e; });
        await settle(60);
      } catch (e) { esc = e; }
      ok(`${ten} không để lỗi lọt ra trang lỗi`, !esc, esc && esc.message);
    }
  }

  console.log("\n== thông điệp lạ không làm chết service worker ==");
  {
    const h = makeSWContext(); loadBackground(h);
    const onMsg = fire(h, "onMessage")[0];
    let threw = null;
    try {
      ok("thông điệp không rõ type trả về undefined", onMsg({ type: "KHONG_BIET" }, {}, () => {}) !== true);
      onMsg({}, {}, () => {});
    } catch (e) { threw = e; }
    ok("thông điệp rỗng không ném lỗi", !threw, threw && threw.message);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log("  THROWN: " + e.stack); process.exit(1); });
