// Lamp — reader.js
// Overlay đọc nhanh, dựng trong Shadow DOM để CSS của trang web không can thiệp được.
// Hai chế độ: RSVP (từng cụm ở giữa) và Dẫn dòng (giữ nguyên đoạn văn, tô sáng chạy).

(() => {
  if (window.__lampReaderLoaded) return;
  window.__lampReaderLoaded = true;

  const E = window.__lampEngine;
  const I = window.__lampI18n;
  // Đặt tên `tr` chứ không phải `t`: `t` đã được dùng làm biến token ở rất
  // nhiều hàm, biến cục bộ sẽ che mất hàm dịch và gây lỗi lúc chạy.
  const tr = (k, v) => I.t(k, v);
  // Ký hiệu phím dùng chung cho các dòng gợi ý phím tắt
  const K = {
    space: "<kbd>Space</kbd>", left: "<kbd>←</kbd>", right: "<kbd>→</kbd>",
    up: "<kbd>↑</kbd>", down: "<kbd>↓</kbd>", shift: "<kbd>Shift</kbd>",
    m: "<kbd>M</kbd>", o: "<kbd>O</kbd>", h: "<kbd>H</kbd>",
    q: "<kbd>Q</kbd>", s: "<kbd>S</kbd>", r: "<kbd>R</kbd>"
  };

  const DEFAULTS = window.LAMP_DEFAULTS; // xem content/defaults.js

  const STEP = { wpm: 50, chunk: 1, size: 4, spacing: 1 };
  const LIMIT = { wpm: [100, 1200], chunk: [1, 6], size: [24, 120], spacing: [0, 12] };

  // Các ngăn xếp phông đều chọn theo tiêu chí hiển thị đủ dấu tiếng Việt,
  // kể cả dấu chồng như ế, ộ, ữ. Xem README nếu muốn thả thêm file font.
  const FONTS = {
    // labelKey thay vì label sẵn: FONTS là const cấp module, tính MỘT LẦN lúc
    // nạp file. Nhét chuỗi đã dịch vào đây thì đổi ngôn ngữ xong nhãn vẫn giữ
    // ngôn ngữ cũ. Tên thương hiệu (Tahoma, Literata…) thì không cần dịch.
    system: { labelKey: "font.system", stack: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
    vietnam: { label: "Be Vietnam", stack: '"Lamp Vietnam", "Be Vietnam Pro", "Be Vietnam", system-ui, sans-serif' },
    tahoma: { label: "Tahoma", stack: 'Tahoma, Verdana, Geneva, sans-serif' },
    serif: { label: "Serif", stack: '"Lamp Serif", Literata, Cambria, Charter, "Times New Roman", Times, serif' },
    notoserif: { label: "Noto Serif", stack: '"Lamp Noto Serif", "Noto Serif", Georgia, serif' },
    mono: { label: "Mono", stack: 'Consolas, "SF Mono", "Roboto Mono", "Courier New", monospace' },
    custom: { labelKey: "font.custom", stack: "" }
  };

  // "auto" không phải một bảng màu riêng — nó bám theo cài đặt sáng/tối của
  // hệ điều hành và quy về Giấy hoặc Đêm. Giữ nguyên state.theme === "auto"
  // để lần sau mở vẫn tiếp tục tự đổi, chỉ phần hiển thị mới quy đổi.
  // Moi bang truot len tu day. Gom ve mot cho de them bang moi khong phai
  // nho sua 4 noi roi rac (dung kieu lech danh sach da tung gay loi truoc day).
  const PANELS = ["#sheet", "#outline", "#quiz", "#highlights", "#train"];

  const THEMES = ["auto", "paper", "sepia", "gray", "night", "contrast"];
  const THEME_LABEL = () => ({
    auto: tr("theme.auto"), paper: tr("theme.paper"), sepia: tr("theme.sepia"),
    gray: tr("theme.gray"), night: tr("theme.night"), contrast: tr("theme.contrast")
  });
  const darkQuery = () =>
    (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)")) || null;
  function resolveTheme(t) {
    if (t !== "auto") return t;
    const q = darkQuery();
    return q && q.matches ? "night" : "paper";
  }

  const REST_INTERVAL = 20 * 60 * 1000; // quy tắc 20-20-20
  const REST_SECONDS = 20;

  const state = {
    ...DEFAULTS,
    blocks: [],
    tokens: [],
    idx: 0,
    playing: false,
    started: false,
    vietnamese: false,
    docLang: "en",   // ngôn ngữ NỘI DUNG, khác ngôn ngữ giao diện
    timer: null,
    host: null,
    root: null,
    open: false,
    docKey: null,
    docUrl: "",
    docTitle: "",
    docKind: "web",   // web | pdf-url | pdf-local — quyết định cách mở lại từ thư viện
    prevOverflow: "",
    prevFocus: null,
    // thống kê phiên
    sessionStart: 0,
    activeMs: 0,
    creditedIdx: 0, // token đã tính vào thống kê, để không cộng trùng
    lastTick: 0,
    sinceRest: 0,
    restTimer: null,
    // đọc bằng giọng nói
    utter: null,
    ttsOffsets: null,
    ttsFallback: null,
    quiz: null,
    quizScope: "read",
    highlights: [],
    training: null
  };

  const $ = (s) => state.root.querySelector(s);
  const $$ = (s) => Array.from(state.root.querySelectorAll(s));
  const clampRange = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));
  const clamp = (i) => Math.min(Math.max(0, i), Math.max(0, state.tokens.length - 1));
  // Escape cả dấu nháy: chuỗi này còn được nhét vào thuộc tính HTML
  // (data-v="…", value="…"), thiếu &quot; là vỡ thuộc tính.
  const esc = (s) => String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${m}:${String(s).padStart(2, "0")}`;
  }

  function pivotIndex(w) {
    const n = w.length;
    if (n <= 1) return 0;
    if (n <= 5) return 1;
    if (n <= 9) return 2;
    if (n <= 13) return 3;
    return 4;
  }

  // Tách dấu ngoặc/ngoặc kép/dấu câu bám ở đầu-cuối ra khỏi phần "lõi" của
  // từ — để điểm neo (ORP) rơi đúng vào chữ cái thật thay vì lệch bởi dấu,
  // và để tô nhạt riêng phần dấu khi hiển thị. Dấu ngoặc dễ lẫn vào nội dung
  // khi đọc nhanh; tô nhạt giúp mắt bỏ qua chúng dễ hơn.
  function splitWord(w) {
    const m = w.match(/^([([{"'“‘«]*)(.*?)([)\]}"'”’»,.;:!?…]*)$/);
    if (!m || !m[2]) return { lead: "", core: w, trail: "" };
    return { lead: m[1], core: m[2], trail: m[3] };
  }
  function wrapPunct(s) {
    return s ? `<span class="punct">${esc(s)}</span>` : "";
  }

  const pacing = () => ({
    wpm: state.wpm,
    rhythm: state.rhythm,
    warmup: state.warmup,
    vietnamese: state.vietnamese,
    lang: state.docLang,
    shortWords: state.shortWords
  });

  // Tốc độ thật sau khi trừ phần giảm nhịp cho tiếng Việt — dùng cho ước
  // lượng thời gian còn lại và cho tốc độ giọng đọc, để hai thứ này khớp với
  // nhịp chữ đang chạy thay vì lệch 15%.
  const effectiveWpm = () => state.wpm * E.profile(state.docLang).pace;

  // ============================ GIAO DIỆN ============================

  function markup() {
    // Xem trước ngay trên nút: mỗi nút tự hiển thị bằng đúng phông nó đại
    // diện, nên không cần mở panel ra xa mới biết phông đã đổi hay chưa.
    const fontBtns = Object.entries(FONTS)
      .map(([k, v]) => {
        const label = v.labelKey ? tr(v.labelKey) : v.label;
        const style = v.stack ? ` style="font-family:${v.stack.replace(/"/g, "&quot;")}"` : "";
        return `<button class="seg" data-font="${k}"${style}>${esc(label)}</button>`;
      }).join("");
    const themeBtns = THEMES.map(
      (x) => { const L = THEME_LABEL()[x];
        return `<button class="swatch" data-theme="${x}" title="${esc(L)}" aria-label="${esc(L)}"><i></i></button>`; }
    ).join("");

    const stepper = (id, label, unit = "") => `
      <div class="stepper">
        <span class="stepper-label">${label}</span>
        <div class="stepper-box">
          <button class="step" data-step="${id}:-1" aria-label="${esc(tr("a11y.dec", { label }))}">−</button>
          <span class="stepper-val"><b id="${id}Val">0</b>${unit ? `<em>${unit}</em>` : ""}</span>
          <button class="step" data-step="${id}:1" aria-label="${esc(tr("a11y.inc", { label }))}">+</button>
        </div>
      </div>`;

    const toggle = (id, label, desc) => `
      <label class="switch-row">
        <span class="switch-text"><b>${label}</b><small>${desc}</small></span>
        <input type="checkbox" id="${id}" class="switch">
        <span class="switch-ui" aria-hidden="true"></span>
      </label>`;

    const icon = {
      gear: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-1 1.47V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9.1 19.4a1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9.1a1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 1-1.47V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>',
      x: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
      list: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>',
      prev: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 19L3 12l8-7M21 19l-8-7 8-7"/></svg>',
      next: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5l8 7-8 7M3 5l8 7-8 7"/></svg>',
      mark: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M6 3.5h12v17l-6-4.2-6 4.2z"/></svg>'
    };

    return `
      <div class="backdrop" data-theme="${resolveTheme(state.theme)}" tabindex="-1">

        <div class="topbar">
          <div class="doc-title" id="docTitle"></div>
          <button class="round" id="hlBtn" title="${esc(tr("top.marks.tip"))}" aria-label="${esc(tr("top.marks"))}">${icon.mark}<i class="badge" id="hlCount" hidden></i></button>
          <button class="round" id="outlineBtn" title="${esc(tr("top.outline.tip"))}" aria-label="${esc(tr("top.outline"))}">${icon.list}</button>
          <button class="round" id="settingsBtn" title="${esc(tr("top.settings.tip"))}" aria-label="${esc(tr("top.settings"))}">${icon.gear}</button>
          <button class="round" id="closeBtn" title="${esc(tr("btn.close.tip"))}" aria-label="${esc(tr("btn.close"))}">${icon.x}</button>
        </div>

        <div class="stage" id="stage">
          <div class="rsvp-view" id="rsvpView">
            <div class="word-wrap">
              <div class="rail top"></div>
              <div class="word" id="word">—</div>
              <div class="rail bottom"></div>
            </div>
            <div class="context" id="context"></div>
          </div>
          <div class="guide-view" id="guideView" hidden></div>
          <div class="focus-view" id="focusView" hidden></div>
          <div class="flash" id="flash" hidden></div>
          <div class="ready" id="ready">${tr("ready", { key: "<kbd>Space</kbd>" })}</div>
        </div>

        <div class="dock">
          <div class="modebar" id="modebar">
            <button class="seg" data-mode="rsvp">${esc(tr("mode.rsvp"))}</button>
            <button class="seg" data-mode="guide">${esc(tr("mode.guide"))}</button>
          </div>

          <div class="track" id="track" role="slider" tabindex="0" aria-label="${esc(tr("dock.progress"))}">
            <div class="fill" id="fill"></div>
            <div class="knob" id="knob"></div>
          </div>
          <div class="meta">
            <span id="pos">0 / 0</span>
            <span id="left">${esc(tr("dock.leftZero"))}</span>
          </div>

          <div class="transport">
            <button class="tbtn" id="back" title="${esc(tr("dock.back"))}">${icon.prev}</button>
            <button class="playbtn" id="play" title="${esc(tr("dock.play"))}" aria-label="${esc(tr("dock.play.a11y"))}">
              <svg id="playIcon" viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>
            </button>
            <button class="tbtn" id="fwd" title="${esc(tr("dock.fwd"))}">${icon.next}</button>
          </div>

          <div class="steppers">
            ${stepper("wpm", tr("dock.speed"), "WPM")}
            <div class="zone-slot"><span class="zone" id="zone"></span></div>
            ${stepper("chunk", tr("dock.chunk"))}
            ${stepper("size", tr("dock.size"), "px")}
          </div>
        </div>

        <!-- Dàn bài -->
        <div class="sheet" id="outline" hidden>
          <div class="sheet-head"><b>${esc(tr("top.outline"))}</b>
            <button class="round sm" id="outlineClose" aria-label="${esc(tr("btn.close"))}">${icon.x}</button></div>
          <div class="sheet-body"><div id="outlineList" class="outline-list"></div></div>
        </div>

        <!-- Cài đặt -->
        <div class="sheet" id="sheet" hidden>
          <div class="sheet-head"><b>${esc(tr("top.settings"))}</b>
            <button class="round sm" id="sheetClose" aria-label="${esc(tr("btn.close"))}">${icon.x}</button></div>
          <div class="sheet-body">
            <div class="group">
              <div class="group-label">${esc(tr("set.lang"))}</div>
              <select id="langSel" class="text-input" style="margin-top:0">
                ${[["auto", tr("set.lang.auto")]].concat(I.langs().map((c) => [c, I.name(c)]))
                  .map(([c, nm]) => `<option value="${esc(c)}">${esc(nm)}</option>`).join("")}
              </select>
            </div>
            <div class="group">
              <div class="group-label">${esc(tr("set.font"))}</div>
              <div class="segbar" id="fonts">${fontBtns}</div>
              <input type="text" id="customFont" class="text-input" placeholder="${esc(tr("set.customFont"))}" hidden>
            </div>
            <div class="group">
              <div class="group-label">${esc(tr("set.theme"))}</div>
              <div class="swatches" id="themes">${themeBtns}</div>
            </div>
            <div class="group">
              <div class="group-label">${esc(tr("set.spacing"))}</div>
              <div class="steppers compact">${stepper("spacing", tr("set.spacing.label"), "px")}</div>
            </div>
            <div class="group">
              <div class="group-label">${esc(tr("set.tts"))}</div>
              ${toggle("tts", tr("set.tts.on"), tr("set.tts.desc"))}
              <select id="voice" class="text-input" hidden></select>
            </div>
            <div class="group">
              ${toggle("orp", tr("set.orp"), tr("set.orp.desc"))}
              ${toggle("ruler", tr("set.ruler"), tr("set.ruler.desc"))}
              ${toggle("rhythm", tr("set.rhythm"), tr("set.rhythm.desc"))}
              ${toggle("shortWords", tr("set.shortWords"), tr("set.shortWords.desc"))}
              ${toggle("context", tr("set.context"), tr("set.context.desc"))}
              ${toggle("warmup", tr("set.warmup"), tr("set.warmup.desc"))}
              ${toggle("restReminder", tr("set.rest"), tr("set.rest.desc"))}
              ${toggle("windowMode", tr("set.window"), tr("set.window.desc"))}
            </div>
            <div class="group">
              <div class="group-label">${esc(tr("train.title"))}</div>
              <button class="primary" id="trainOpen" style="margin-top:0">${esc(tr("train.start"))}</button>
              <small class="hint">${esc(tr("train.desc"))}</small>
            </div>
            <div class="group">
              <div class="group-label">${esc(tr("set.stats"))}</div>
              <div id="stats" class="stats"></div>
            </div>
            <div class="keys">
              <b>${esc(tr("set.keys"))}</b>
              ${["keys.line1", "keys.line2", "keys.line3"].map((k) => `<div>${tr(k, K)}</div>`).join("")}
            </div>
          </div>
        </div>

        <!-- Trích đoạn đã lưu -->
        <div class="sheet" id="highlights" hidden>
          <div class="sheet-head"><b>${esc(tr("hl.title"))}</b>
            <button class="round sm" id="hlClose" aria-label="${esc(tr("btn.close"))}">${icon.x}</button></div>
          <div class="sheet-body"><div id="hlBody"></div></div>
        </div>

        <!-- Luyện tốc độ -->
        <div class="sheet wide" id="train" hidden>
          <div class="sheet-head"><b>${esc(tr("train.title"))}</b>
            <button class="round sm" id="trainClose" aria-label="${esc(tr("btn.close"))}">${icon.x}</button></div>
          <div class="sheet-body"><div id="trainBody"></div></div>
        </div>

        <!-- Kiểm tra hiểu -->
        <div class="sheet wide" id="quiz" hidden>
          <div class="sheet-head"><b>${esc(tr("quiz.title"))}</b>
            <button class="round sm" id="quizClose" aria-label="${esc(tr("btn.close"))}">${icon.x}</button></div>
          <div class="sheet-body"><div id="quizBody"></div></div>
        </div>

        <!-- Nhắc nghỉ mắt -->
        <div class="rest" id="rest" hidden>
          <div class="rest-card">
            <b>${esc(tr("rest.title"))}</b>
            <p>${esc(tr("rest.desc"))}</p>
            <div class="rest-count" id="restCount">20</div>
            <button class="ghost" id="restSkip">${esc(tr("btn.skip"))}</button>
          </div>
        </div>
      </div>`;
  }

  async function buildOverlay() {
    const host = document.createElement("div");
    host.id = "lamp-reader-host";
    host.style.cssText = "all: initial; position: fixed; inset: 0; z-index: 2147483647;";
    // Overlay che kín trang nhưng trước đây không tự khai báo là hộp thoại,
    // nên trình đọc màn hình vẫn đọc nội dung trang phía sau như thể không có
    // gì che. aria-modal cắt hẳn phần đó ra khỏi cây trợ năng.
    host.setAttribute("role", "dialog");
    host.setAttribute("aria-modal", "true");
    host.setAttribute("aria-label", tr("app.name"));
    const root = host.attachShadow({ mode: "open" });

    let css = "";
    try {
      css = await (await fetch(chrome.runtime.getURL("content/overlay.css"))).text();
      // @font-face cần URL tuyệt đối của extension; CSS thuần không tự nội suy được
      css = css.replace(/__LAMP_EXT__/g, chrome.runtime.getURL(""));
    } catch (e) {}

    root.innerHTML = `<style>${css}</style>` + markup();
    document.documentElement.appendChild(host);
    state.host = host;
    state.root = root;
    wireEvents();
    loadFonts();
  }

  // Nạp phông nhúng sẵn.
  //
  // Bắt buộc phải dùng FontFace API chứ không dùng @font-face trong CSS: overlay
  // sống trong Shadow DOM, mà theo chuẩn CSS Scoping thì @font-face khai trong
  // shadow tree bị bỏ qua — chỉ font set của document mới được dùng để so khớp.
  // Bản trước khai trong overlay.css nên ba phông này chưa bao giờ thật sự hiển
  // thị: ngăn xếp phông cứ lặng lẽ rơi về phông hệ thống mà không báo lỗi.
  const EMBEDDED_FONTS = [
    { key: "vietnam",   family: "Lamp Vietnam",    weight: "400",     path: "fonts/Be_Vietnam_Pro/BeVietnamPro-Regular.ttf" },
    { key: "vietnam",   family: "Lamp Vietnam",    weight: "600",     path: "fonts/Be_Vietnam_Pro/BeVietnamPro-SemiBold.ttf" },
    { key: "vietnam",   family: "Lamp Vietnam",    weight: "700",     path: "fonts/Be_Vietnam_Pro/BeVietnamPro-Bold.ttf" },
    { key: "serif",     family: "Lamp Serif",      weight: "100 900", path: "fonts/Literata/Literata-VariableFont_opsz,wght.ttf" },
    { key: "notoserif", family: "Lamp Noto Serif", weight: "100 900", path: "fonts/Noto_Serif/NotoSerif-VariableFont_wdth,wght.ttf" }
  ];

  let fontsLoaded = false;
  async function loadFonts() {
    if (fontsLoaded) return;
    fontsLoaded = true;
    if (typeof FontFace === "undefined" || !document.fonts) return;

    const failed = new Set();
    await Promise.all(EMBEDDED_FONTS.map(async (f) => {
      try {
        const face = new FontFace(f.family, `url("${chrome.runtime.getURL(f.path)}")`,
          { weight: f.weight, display: "swap" });
        await face.load();
        document.fonts.add(face);
      } catch (e) {
        failed.add(f.key);
      }
    }));

    // Nạp hụt file nào thì nút phông tương ứng tự hiện dấu cảnh báo, thay vì
    // âm thầm lùi về phông hệ thống khiến tưởng nhầm là "chưa đủ phông".
    failed.forEach((key) => {
      const btn = $(`[data-font="${key}"]`);
      if (btn) {
        btn.classList.add("font-missing");
        btn.title = tr("set.fontMissing");
      }
    });
    // Phông về muộn hơn lần vẽ đầu: vẽ lại để chữ đổi sang phông đúng
    if (state.open) render();
  }

  // Đổi ngôn ngữ thì phải dựng lại overlay: markup() nhúng thẳng chuỗi đã
  // dịch vào HTML một lần khi tạo, không có ràng buộc động nào để tự cập nhật.
  // Dựng lại là cách gọn và chắc chắn nhất, đổi lại phải khôi phục trạng thái.
  async function applyLang() {
    I.setLang(state.lang);
    if (!state.host) return;
    const wasOpen = state.open;
    const idx = state.idx;

    state.host.remove();
    state.host = null;
    state.root = null;
    await buildOverlay();

    state.host.style.display = wasOpen ? "block" : "none";
    state.idx = idx;
    clearPaintCache();
    if (state.mode === "guide") paintGuide();
    applyStyle();
    syncControls();
    setPlayIcon(state.playing);
    renderOutline();
    paintHlCount();
    render();
    if ("speechSynthesis" in window) loadVoices();
    // Dựng lại overlay là thay cả cây DOM — focus bay mất, và Tab tiếp theo sẽ
    // rơi xuống trang phía sau. Trả focus về đúng chỗ như lúc mới mở.
    if (wasOpen) $(".backdrop").focus({ preventScroll: true });
  }

  // ============================ SỰ KIỆN ============================

  function wireEvents() {
    $("#closeBtn").addEventListener("click", close);
    $("#settingsBtn").addEventListener("click", () => panel("#sheet"));
    $("#outlineBtn").addEventListener("click", () => panel("#outline"));
    $("#hlBtn").addEventListener("click", () => panel("#highlights"));
    $("#hlClose").addEventListener("click", () => panel("#highlights", false));
    $("#trainClose").addEventListener("click", () => { stopTraining(); panel("#train", false); });
    $("#trainOpen").addEventListener("click", () => startTraining());
    $("#sheetClose").addEventListener("click", () => panel("#sheet", false));
    $("#outlineClose").addEventListener("click", () => panel("#outline", false));
    $("#quizClose").addEventListener("click", () => panel("#quiz", false));
    $("#play").addEventListener("click", togglePlay);
    $("#back").addEventListener("click", (e) =>
      e.shiftKey ? jumpTo(E.sentenceStart(state.tokens, state.idx)) : skip(-10));
    $("#fwd").addEventListener("click", (e) =>
      e.shiftKey ? jumpTo(E.sentenceNext(state.tokens, state.idx)) : skip(10));

    $("#stage").addEventListener("click", (e) => {
      if (e.target.closest("button, a, .guide-word")) return;
      togglePlay();
    });

    $("#modebar").addEventListener("click", (e) => {
      const b = e.target.closest("[data-mode]");
      if (b) setMode(b.dataset.mode);
    });

    $$("[data-step]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const [key, dir] = btn.dataset.step.split(":");
        bump(key, parseInt(dir, 10));
      })
    );

    const track = $("#track");
    let dragging = false;
    const seekTo = (x) => {
      const r = track.getBoundingClientRect();
      if (!r.width) return;
      const pct = Math.min(1, Math.max(0, (x - r.left) / r.width));
      state.idx = clamp(Math.round(pct * (state.tokens.length - 1)));
      render();
      saveProgress();
    };
    track.addEventListener("pointerdown", (e) => {
      dragging = true; track.setPointerCapture(e.pointerId); pause(); seekTo(e.clientX);
    });
    track.addEventListener("pointermove", (e) => dragging && seekTo(e.clientX));
    // pointercancel cũng phải nhả: thiếu nó thì một cú vuốt bị hệ điều hành
    // cắt ngang sẽ để dragging kẹt ở true, di chuột là tua lung tung.
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((ev) =>
      track.addEventListener(ev, () => (dragging = false))
    );
    // role="slider" mà không lái được bằng bàn phím thì chỉ là nhãn suông
    track.addEventListener("keydown", (e) => {
      const step = { ArrowLeft: -1, ArrowRight: 1, PageUp: -25, PageDown: 25 }[e.key];
      if (step !== undefined) { e.preventDefault(); e.stopPropagation(); skip(step); }
      else if (e.key === "Home") { e.preventDefault(); e.stopPropagation(); jumpTo(0); }
      else if (e.key === "End") { e.preventDefault(); e.stopPropagation(); jumpTo(state.tokens.length - 1); }
    });

    $("#fonts").addEventListener("click", (e) => {
      const b = e.target.closest("[data-font]");
      if (!b) return;
      state.fontFamily = b.dataset.font;
      applyStyle(); syncControls(); save();
    });
    $("#customFont").addEventListener("input", (e) => {
      state.customFont = e.target.value;
      applyStyle(); save();
    });

    $("#themes").addEventListener("click", (e) => {
      const b = e.target.closest("[data-theme]");
      if (!b) return;
      state.theme = b.dataset.theme;
      applyStyle(); syncControls(); save();
    });

    ["orp", "ruler", "rhythm", "shortWords", "context", "warmup", "restReminder", "tts", "windowMode"].forEach((k) =>
      $("#" + k).addEventListener("change", (e) => {
        state[k] = e.target.checked;
        if (k === "tts") { stopSpeech(); syncControls(); if (state.playing) { pause(); play(); } }
        applyStyle(); render(); save();
      })
    );

    $("#langSel").addEventListener("change", (e) => {
      state.lang = e.target.value;
      save();
      applyLang();
    });

    $("#voice").addEventListener("change", (e) => {
      state.voiceURI = e.target.value;
      save();
      if (state.playing && state.tts) { pause(); play(); }
    });

    $("#outlineList").addEventListener("click", (e) => {
      const q = e.target.closest(".outline-quiz");
      if (q) {
        e.stopPropagation();
        quizSection(parseInt(q.dataset.from, 10), parseInt(q.dataset.to, 10));
        return;
      }
      const b = e.target.closest("[data-token]");
      if (!b) return;
      jumpTo(parseInt(b.dataset.token, 10));
      panel("#outline", false);
    });

    const jumpToGuideWord = (e) => {
      const w = e.target.closest(".guide-word");
      if (!w) return;
      e.stopPropagation();
      const t = state.tokens.findIndex(
        (tk) => tk.block === +w.dataset.b && +w.dataset.w >= tk.from && +w.dataset.w <= tk.to
      );
      if (t >= 0) jumpTo(t);
    };
    $("#guideView").addEventListener("click", jumpToGuideWord);
    $("#focusView").addEventListener("click", jumpToGuideWord);

    $("#restSkip").addEventListener("click", endRest);

    PANELS.forEach((s) => makeDraggable($(s)));

    document.addEventListener("keydown", onKey, true);

    // Hệ thống đổi sáng/tối giữa chừng thì overlay đổi theo ngay, không cần
    // mở lại. Chỉ có tác dụng khi người dùng đang chọn "Theo hệ thống".
    const q = darkQuery();
    if (q) {
      const onScheme = () => { if (state.theme === "auto") applyStyle(); };
      q.addEventListener ? q.addEventListener("change", onScheme) : q.addListener(onScheme);
    }

    // Đóng tab hay chuyển sang tab khác: ghi ngay phần đang chờ, kẻo mất
    // tiến trình đọc vừa rồi. pagehide đáng tin hơn unload trên Chrome.
    window.addEventListener("pagehide", flushWrites);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushWrites();
    });
  }

  // Kéo bảng theo thanh tiêu đề — chủ yếu để kéo bảng Cài đặt sang một bên
  // mà vẫn nhìn thấy chữ đang đọc, xem phông/cỡ chữ đổi ra sao khi chỉnh.
  // Không lưu vị trí: mỗi lần mở lại panel về đúng chỗ mặc định (xem panel()).
  function makeDraggable(panel) {
    const head = panel.querySelector(".sheet-head");
    let dragging = false, ox = 0, oy = 0;
    head.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      dragging = true;
      const r = panel.getBoundingClientRect();
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
      panel.classList.add("dragging");
      head.setPointerCapture(e.pointerId);
    });
    head.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const maxX = Math.max(8, window.innerWidth - panel.offsetWidth - 8);
      const maxY = Math.max(8, window.innerHeight - panel.offsetHeight - 8);
      panel.style.left = clampRange(e.clientX - ox, [8, maxX]) + "px";
      panel.style.top = clampRange(e.clientY - oy, [8, maxY]) + "px";
      panel.style.bottom = "auto";
      panel.style.transform = "none";
    });
    const stopDrag = () => { dragging = false; panel.classList.remove("dragging"); };
    head.addEventListener("pointerup", stopDrag);
    head.addEventListener("pointercancel", stopDrag);
  }

  function resetPanelPos(panel) {
    panel.style.left = "";
    panel.style.top = "";
    panel.style.bottom = "";
    panel.style.transform = "";
  }

  function onKey(e) {
    if (!state.open) return;
    const k = e.key;
    const stop = () => { e.preventDefault(); e.stopPropagation(); };

    // Listener nằm ở document nên e.target bị "retarget" về phần tử host của
    // Shadow DOM (luôn là DIV) — kiểm tra e.target.tagName sẽ không bao giờ
    // thấy INPUT, khiến gõ chữ vào ô "Tuỳ chỉnh phông" lại kích hoạt phím tắt
    // (gõ "s" mở cài đặt, dấu cách chạy/dừng…). Phải lấy phần tử thật qua
    // composedPath()[0].
    const real = (e.composedPath && e.composedPath()[0]) || e.target;
    const tag = real && real.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" ||
        (real && real.isContentEditable)) return;

    // Để nguyên tổ hợp có Ctrl/Cmd/Alt cho trình duyệt và trang web
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (k === "Escape") {
      stop();
      const openPanel = PANELS.find((s) => !$(s).hidden);
      openPanel ? panel(openPanel, false) : close();
    } else if (k === " " || k === "Spacebar") { stop(); togglePlay(); }
    else if (k === "ArrowLeft") {
      stop(); e.shiftKey ? jumpTo(E.sentenceStart(state.tokens, state.idx)) : skip(-10);
    } else if (k === "ArrowRight") {
      stop(); e.shiftKey ? jumpTo(E.sentenceNext(state.tokens, state.idx)) : skip(10);
    } else if (k === "ArrowUp") { stop(); bump("wpm", 1); }
    else if (k === "ArrowDown") { stop(); bump("wpm", -1); }
    else if (k === "+" || k === "=") { stop(); bump("size", 1); }
    else if (k === "-" || k === "_") { stop(); bump("size", -1); }
    else if (k === "s" || k === "S") { stop(); panel("#sheet"); }
    else if (k === "o" || k === "O") { stop(); panel("#outline"); }
    else if (k === "h" || k === "H") { stop(); addHighlight(); }
    else if (k === "q" || k === "Q") { stop(); openQuiz(); }
    else if (k === "m" || k === "M") { stop(); setMode(state.mode === "rsvp" ? "guide" : "rsvp"); }
    else if (k === "r" || k === "R") { stop(); jumpTo(0); }
  }

  function panel(sel, force) {
    const el = $(sel);
    const show = force === undefined ? el.hidden : force;
    PANELS.forEach((s) => ($(s).hidden = true));
    el.hidden = !show;
    if (show) {
      resetPanelPos(el);
      pause();
      if (sel === "#sheet") renderStats();
      if (sel === "#outline") markOutlineCurrent();
      if (sel === "#highlights") renderHighlights();
    }
  }

  function bump(key, dir) {
    if (key === "wpm") state.wpm = clampRange(state.wpm + dir * STEP.wpm, LIMIT.wpm);
    else if (key === "chunk") {
      // Giữ đúng vị trí đang đọc theo (khối, từ) thay vì theo tỉ lệ phần trăm
      // — đổi số từ mỗi lần không được làm nhảy chỗ đang đọc.
      const at = state.tokens[state.idx];
      state.chunkSize = clampRange(state.chunkSize + dir * STEP.chunk, LIMIT.chunk);
      state.tokens = E.buildTokens(state.blocks, state.chunkSize, state.docLang);
      const found = at
        ? state.tokens.findIndex((t) => t.block === at.block && at.from >= t.from && at.from <= t.to)
        : -1;
      state.idx = clamp(found >= 0 ? found : 0);
      state.creditedIdx = Math.min(state.creditedIdx, state.idx);
      // Dàn bài trỏ tới chỉ số token — đổi chunkSize là toàn bộ chỉ số lệch,
      // không dựng lại thì bấm mục nào cũng nhảy sai chỗ.
      renderOutline();
    } else if (key === "size") {
      state.fontSize = clampRange(state.fontSize + dir * STEP.size, LIMIT.size);
    } else if (key === "spacing") {
      state.spacing = clampRange(state.spacing + dir * STEP.spacing, LIMIT.spacing);
    }
    applyStyle(); syncControls(); render();
    if (state.playing) { if (state.tts) { stopSpeech(); startSpeech(); } else schedule(); }
    save();
  }

  // ============================ CHẾ ĐỘ ============================

  function setMode(mode) {
    if (mode === state.mode) return;
    state.mode = mode;
    $("#rsvpView").hidden = mode !== "rsvp";
    $("#guideView").hidden = mode !== "guide";
    if (mode === "guide") paintGuide();
    syncControls(); render(); save();
  }

  // Dựng toàn bộ văn bản, mỗi từ một <span> để tô sáng đúng vị trí.
  // Dùng chung cho chế độ Dẫn dòng (#guideView) và focus view khi RSVP dừng
  // (#focusView) — cùng cấu trúc từ/khối nên tô sáng theo đúng một hàm.
  function paintBlocksInto(container) {
    const html = state.blocks
      .map((b, bi) => {
        // Phải tách y hệt engine.buildTokens, nếu không chỉ số từ lệch và
        // phần tô sáng nhảy sai chỗ (rõ nhất với tiếng Trung/Nhật).
        const words = E.splitWords(b.text, state.docLang);
        const inner = words
          .map((w, wi) => {
            const { lead, core, trail } = splitWord(w);
            const body = wrapPunct(lead) + esc(core) + wrapPunct(trail);
            return `<span class="guide-word" data-b="${bi}" data-w="${wi}">${body}</span>`;
          })
          .join(" ");
        const tag = b.type === "h" ? "h3" : "p";
        const cls = b.type === "li" ? ' class="li"' : "";
        return `<${tag}${cls} data-block="${bi}">${inner}</${tag}>`;
      })
      .join("");
    container.innerHTML = html;

    // Dựng sẵn mảng phẳng + mốc đầu mỗi khối để tô sáng theo chỉ số, khỏi
    // phải quét lại toàn bộ DOM mỗi khung hình (xem highlightInto).
    const words = Array.from(container.querySelectorAll(".guide-word"));
    const offsets = new Map();
    words.forEach((el, i) => {
      const b = +el.dataset.b;
      if (!offsets.has(b)) offsets.set(b, i);
    });
    container.__lamp = { words, offsets, on: null, past: 0, painted: true };
  }

  function clearPaintCache() {
    ["#guideView", "#focusView"].forEach((s) => {
      const el = $(s);
      if (el) { el.innerHTML = ""; el.__lamp = null; }
    });
  }

  // Tô sáng theo phần CHÊNH LỆCH so với lần trước. Bản cũ gọi
  // querySelectorAll(".guide-word") rồi duyệt toàn bộ ở mỗi lần render —
  // với bài vài nghìn từ thì mỗi lần kéo thanh tiến độ là một vòng lặp qua
  // hàng nghìn phần tử, giật thấy rõ. Giờ chỉ đụng tới các từ thật sự đổi.
  function highlightInto(container) {
    const t = state.tokens[state.idx];
    const c = container.__lamp;
    if (!t || !c) return;
    const base = c.offsets.get(t.block);
    if (base === undefined) return;

    const from = Math.min(base + t.from, c.words.length - 1);
    const to = Math.min(base + t.to, c.words.length - 1);

    if (c.on) {
      for (let i = c.on.from; i <= c.on.to; i++) c.words[i].classList.remove("on");
    }
    if (from > c.past) {
      for (let i = c.past; i < from; i++) c.words[i].classList.add("past");
    } else if (from < c.past) {
      for (let i = from; i < c.past; i++) c.words[i].classList.remove("past");
    }
    c.past = from;
    for (let i = from; i <= to; i++) c.words[i].classList.add("on");
    c.on = { from, to };

    const first = c.words[from];
    if (first) {
      const r = first.getBoundingClientRect();
      const vr = container.getBoundingClientRect();
      if (r.top < vr.top + vr.height * 0.3 || r.bottom > vr.top + vr.height * 0.7) {
        first.scrollIntoView({ block: "center", behavior: state.wpm > 500 ? "auto" : "smooth" });
      }
    }
  }

  function paintGuide() {
    const el = $("#guideView");
    if (!el.__lamp) paintBlocksInto(el);
  }
  function highlightGuide() { highlightInto($("#guideView")); }

  // RSVP dừng lại → hiện toàn văn bản kèm vị trí đang đọc, để nắm lại mạch
  // bài trước khi đọc tiếp. Chỉ dựng HTML đúng một lần cho mỗi tài liệu —
  // dựng lại ở mỗi lần dừng thì bài dài sẽ khựng mỗi khi bấm Space.
  function updateFocusOverlay() {
    const fv = $("#focusView");
    const show = state.mode === "rsvp" && state.started && !state.playing;
    if (show) {
      if (!fv.__lamp) paintBlocksInto(fv);
      fv.hidden = false;
      highlightInto(fv);
    } else {
      fv.hidden = true;
    }
  }

  // ============================ HIỂN THỊ ============================

  function applyStyle() {
    const bd = $(".backdrop");
    bd.dataset.theme = resolveTheme(state.theme);
    bd.dataset.orp = state.orp ? "on" : "off";
    bd.dataset.ruler = state.ruler ? "on" : "off";
    const stack = state.fontFamily === "custom"
      ? (state.customFont ? `"${state.customFont}", system-ui, sans-serif` : "system-ui, sans-serif")
      : FONTS[state.fontFamily].stack;
    bd.style.setProperty("--word-font", stack);
    bd.style.setProperty("--word-size", state.fontSize + "px");
    bd.style.setProperty("--word-spacing", state.spacing + "px");
    $("#context").hidden = !state.context;
    $("#customFont").hidden = state.fontFamily !== "custom";
    $("#voice").hidden = !state.tts;
  }

  function syncControls() {
    $("#wpmVal").textContent = state.wpm;
    $("#chunkVal").textContent = state.chunkSize;
    $("#sizeVal").textContent = state.fontSize;
    $("#spacingVal").textContent = state.spacing;
    $("#customFont").value = state.customFont || "";
    const ls = $("#langSel");
    if (ls) ls.value = state.lang || "auto";
    $$("[data-font]").forEach((b) => b.classList.toggle("on", b.dataset.font === state.fontFamily));
    // Giới hạn trong bảng chọn: chính .backdrop cũng mang data-theme
    $$(".swatches [data-theme]").forEach((b) => b.classList.toggle("on", b.dataset.theme === state.theme));
    $$("[data-mode]").forEach((b) => b.classList.toggle("on", b.dataset.mode === state.mode));
    ["orp", "ruler", "rhythm", "shortWords", "context", "warmup", "restReminder", "tts", "windowMode"].forEach(
      (k) => ($("#" + k).checked = state[k])
    );
  }

  function render() {
    const t = state.tokens[state.idx];
    const text = t ? t.text : "";

    if (state.mode === "rsvp") {
      const parts = text.split(" ");
      const first = parts[0] || "";
      const { lead, core, trail } = splitWord(first);
      let coreHTML;
      if (state.orp) {
        const pi = pivotIndex(core);
        coreHTML = esc(core.slice(0, pi)) +
          `<span class="pivot">${esc(core.slice(pi, pi + 1))}</span>` +
          esc(core.slice(pi + 1));
      } else coreHTML = esc(core);
      const html = wrapPunct(lead) + coreHTML + wrapPunct(trail) +
        (parts.length > 1 ? " " + esc(parts.slice(1).join(" ")) : "");
      $("#word").innerHTML = html || "—";

      if (state.context) {
        const before = state.tokens.slice(Math.max(0, state.idx - 4), state.idx).map((x) => x.text).join(" ");
        const after = state.tokens.slice(state.idx + 1, state.idx + 5).map((x) => x.text).join(" ");
        $("#context").innerHTML = `<span>${esc(before)}</span> <b>${esc(text)}</b> <span>${esc(after)}</span>`;
      }
    } else {
      highlightGuide();
    }

    const total = state.tokens.length;
    $("#pos").textContent = total ? `${state.idx + 1} / ${total}` : "0 / 0";
    const pct = total ? ((state.idx + 1) / total) * 100 : 0;
    $("#fill").style.width = pct + "%";
    $("#knob").style.left = pct + "%";

    const track = $("#track");
    track.setAttribute("aria-valuemin", "1");
    track.setAttribute("aria-valuemax", String(Math.max(1, total)));
    track.setAttribute("aria-valuenow", String(state.idx + 1));
    track.setAttribute("aria-valuetext", `${Math.round(pct)}% — ${state.idx + 1}/${total}`);

    // Nhịp thực tế đã tính cả giảm tốc tiếng Việt, nên thời gian còn lại mới
    // khớp với cảm nhận; lấy thẳng wpm sẽ luôn báo ngắn hơn thực tế ~15%.
    const wordsLeft = (total - state.idx) * state.chunkSize;
    $("#left").textContent = tr("dock.left", { time: fmtTime(wordsLeft / (effectiveWpm() / 60)) });

    // Vùng tốc độ: nghiên cứu RSVP cho thấy tới ~350 WPM khả năng hiểu ngang
    // đọc thường, vượt lên thì tụt rõ rệt.
    const z = $("#zone");
    if (state.wpm <= 350) { z.dataset.zone = "safe"; z.textContent = tr("zone.safe"); }
    else if (state.wpm <= 500) { z.dataset.zone = "skim"; z.textContent = tr("zone.skim"); }
    else { z.dataset.zone = "scan"; z.textContent = tr("zone.scan"); }

    $("#ready").hidden = state.started;
    updateFocusOverlay();
    // Chỉ cập nhật khi dàn bài đang mở — không thì mỗi nhịp chữ lại quét DOM
    if (!$("#outline").hidden) markOutlineCurrent();
  }

  // ============================ VÒNG CHẠY ============================

  function setPlayIcon(on) {
    $("#playIcon").innerHTML = on
      ? '<path d="M7 5h3.4v14H7zM13.6 5H17v14h-3.4z"/>'
      : '<path d="M8 5.5v13l11-6.5z"/>';
  }

  function tick() {
    accrue();
    if (state.idx >= state.tokens.length - 1) { finish(); return; }
    state.idx++;
    // Đang luyện: đọc hết khoảng của vòng thì dừng lại để kiểm tra hiểu
    if (state.training && state.training.active && state.idx >= currentRound().to) {
      render();
      endRound();
      return;
    }
    render();
    if (state.idx % 25 === 0) saveProgress();
    schedule();
  }

  function schedule() {
    clearTimeout(state.timer);
    const t = state.tokens[state.idx];
    if (!t) return;
    state.timer = setTimeout(tick, E.tokenDelay(t, state.idx, state.tokens, pacing()));
  }

  function accrue() {
    const now = Date.now();
    if (state.lastTick) {
      const d = now - state.lastTick;
      state.activeMs += d;
      state.sinceRest += d;
      if (state.restReminder && state.sinceRest >= REST_INTERVAL) startRest();
    }
    state.lastTick = now;
  }

  function play() {
    if (!state.tokens.length) return;
    if (state.idx >= state.tokens.length - 1) state.idx = 0;
    state.playing = true;
    state.started = true;
    state.lastTick = Date.now();
    $("#ready").hidden = true;
    setPlayIcon(true);
    updateFocusOverlay();
    state.tts ? startSpeech() : schedule();
  }

  function pause() {
    if (state.playing) accrue();
    state.playing = false;
    state.lastTick = 0;
    clearTimeout(state.timer);
    stopSpeech();
    if (state.root) { setPlayIcon(false); updateFocusOverlay(); }
    saveProgress();
  }

  const togglePlay = () => (state.playing ? pause() : play());

  function jumpTo(i) {
    state.idx = clamp(i);
    render();
    if (state.playing) { if (state.tts) { stopSpeech(); startSpeech(); } else schedule(); }
    saveProgress();
    // Tua tay vượt qua cuối vòng luyện cũng tính là xong vòng — nếu chỉ bắt
    // trong tick() thì kéo thanh tiến độ sẽ làm buổi luyện kẹt vĩnh viễn.
    if (state.training && state.training.active && state.idx >= currentRound().to) endRound();
  }
  const skip = (n) => jumpTo(state.idx + n);

  function finish() {
    pause();
    recordSession();
    openQuiz();
  }

  // ============================ GIỌNG ĐỌC ============================

  function loadVoices() {
    const sel = $("#voice");
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return;
    const want = E.profile(state.docLang).ttsLang;
    const sorted = [...voices].sort((a, b) => {
      const av = a.lang.toLowerCase().startsWith(want) ? 0 : 1;
      const bv = b.lang.toLowerCase().startsWith(want) ? 0 : 1;
      return av - bv || a.name.localeCompare(b.name);
    });
    sel.innerHTML = sorted
      .map((v) => `<option value="${esc(v.voiceURI)}">${esc(v.name)} — ${esc(v.lang)}</option>`)
      .join("");
    if (state.voiceURI && sorted.some((v) => v.voiceURI === state.voiceURI)) sel.value = state.voiceURI;
    else if (sorted.length) { state.voiceURI = sorted[0].voiceURI; sel.value = state.voiceURI; }
  }

  function startSpeech() {
    if (!("speechSynthesis" in window)) { schedule(); return; }
    stopSpeech();

    // Đọc từ vị trí hiện tại tới hết, ghi lại mốc ký tự của từng token
    // để sự kiện onboundary biết đang ở token nào.
    const slice = state.tokens.slice(state.idx);
    const offsets = [];
    let cursor = 0;
    const text = slice
      .map((t) => { offsets.push(cursor); cursor += t.text.length + 1; return t.text; })
      .join(" ");
    state.ttsOffsets = offsets;

    const u = new SpeechSynthesisUtterance(text);
    const v = speechSynthesis.getVoices().find((x) => x.voiceURI === state.voiceURI);
    if (v) u.voice = v;
    // Giọng chuẩn khoảng 180 WPM ở rate 1
    u.rate = Math.min(3, Math.max(0.5, effectiveWpm() / 180));
    const base = state.idx;
    let gotBoundary = false;

    u.onboundary = (e) => {
      if (e.name && e.name !== "word") return;
      gotBoundary = true;
      let lo = 0, hi = offsets.length - 1, found = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (offsets[mid] <= e.charIndex) { found = mid; lo = mid + 1; } else hi = mid - 1;
      }
      state.idx = clamp(base + found);
      render();
      accrue();
    };
    u.onend = () => { if (state.playing) finish(); };
    u.onerror = () => { if (state.playing) schedule(); };

    state.utter = u;
    speechSynthesis.speak(u);

    // Một số giọng không phát onboundary — sau 1.5s không thấy thì quay về đồng hồ
    clearTimeout(state.ttsFallback);
    state.ttsFallback = setTimeout(() => { if (!gotBoundary && state.playing) schedule(); }, 1500);
  }

  function stopSpeech() {
    clearTimeout(state.ttsFallback);
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    state.utter = null;
  }

  // ============================ NGHỈ MẮT ============================

  function startRest() {
    state.sinceRest = 0;
    pause();
    let left = REST_SECONDS;
    $("#restCount").textContent = left;
    $("#rest").hidden = false;
    clearInterval(state.restTimer);
    state.restTimer = setInterval(() => {
      left--;
      $("#restCount").textContent = Math.max(0, left);
      if (left <= 0) endRest();
    }, 1000);
  }

  function endRest() {
    clearInterval(state.restTimer);
    $("#rest").hidden = true;
  }

  // ============================ DÀN BÀI ============================

  function renderOutline() {
    const items = E.buildOutline(state.blocks, state.tokens);
    const list = $("#outlineList");
    if (!items.length) {
      list.innerHTML = '<div class="empty">' + esc(tr("outline.empty")) + '</div>';
      return;
    }
    const total = Math.max(1, state.tokens.length);
    // Mỗi mục kèm nút kiểm tra riêng: đọc xong một chương là hỏi ngay chương
    // đó, thay vì phải đọc hết bài mới kiểm tra được.
    list.innerHTML = items
      .map((it, i) => {
        const to = (i + 1 < items.length ? items[i + 1].token - 1 : state.tokens.length - 1);
        return `<div class="outline-row" data-depth="${it.depth || 0}">
          <button class="outline-item" data-token="${it.token}">
            <span class="outline-text">${esc(it.text)}</span>
            <span class="outline-pos">${Math.round((it.token / total) * 100)}%</span>
          </button>
          <button class="outline-quiz" data-from="${it.token}" data-to="${to}"
            title="${esc(tr("outline.quiz"))}" aria-label="${esc(tr("outline.quiz.a11y", { name: it.text }))}">?</button>
        </div>`;
      })
      .join("");
    markOutlineCurrent();
  }

  // Đánh dấu mục đang đọc để mở dàn bài ra là biết ngay mình đang ở đâu
  function markOutlineCurrent() {
    const rows = $$(".outline-row");
    let cur = -1;
    rows.forEach((r, i) => {
      const b = r.querySelector(".outline-item");
      if (b && +b.dataset.token <= state.idx) cur = i;
    });
    rows.forEach((r, i) => r.classList.toggle("current", i === cur));
  }

  // Kiểm tra riêng một mục trong dàn bài
  function quizSection(from, to) {
    const items = E.buildOutline(state.blocks, state.tokens);
    const it = items.find((x) => x.token === from);
    openQuiz({
      from, upTo: to,
      count: 4,
      title: it ? tr("outline.section", { name: it.text }) : tr("outline.sectionShort"),
      emptyMsg: tr("outline.tooShort")
    });
  }

  // ============================ LUYỆN TỐC ĐỘ ============================
  // Đọc cùng một bài ở nhiều mức tốc độ, mỗi mức kiểm tra hiểu ngay sau đó.
  // Mục đích: tìm ngưỡng WPM của riêng người dùng bằng số liệu thay vì cảm
  // giác — đây là thứ mà app đã có đủ hạ tầng (quiz + thống kê) để làm.

  const ROUND_QUESTIONS = 3;
  const MIN_ROUND = 45;   // ít hơn thì không đủ chữ để sinh câu hỏi có nghĩa
  const MAX_ROUND = 200;  // nhiều hơn thì mỗi vòng đọc quá lâu, nản

  function planRounds() {
    const base = clampRange(state.wpm, LIMIT.wpm);
    // Ba mức: chậm hơn một bậc, mức hiện tại, nhanh hơn một bậc
    const speeds = [base - 100, base, base + 100].map((w) => clampRange(w, LIMIT.wpm));

    // Chia phần CÒN LẠI của bài cho ba mức thay vì cắt cứng 140 cụm mỗi vòng.
    // Cắt cứng thì bài ngắn chỉ xếp nổi một vòng và buổi luyện thành vô nghĩa,
    // còn bài dài thì ba vòng đầu chỉ chạm được một góc nhỏ của bài.
    const remaining = state.tokens.length - 1 - state.idx;
    if (remaining < MIN_ROUND * 2) return [];
    const size = Math.max(MIN_ROUND, Math.min(MAX_ROUND, Math.floor(remaining / speeds.length)));

    const rounds = [];
    let from = state.idx;
    for (const wpm of speeds) {
      const to = Math.min(from + size, state.tokens.length - 1);
      if (to - from < MIN_ROUND) break;
      rounds.push({ wpm, from, to, score: null, total: null });
      from = to;
    }
    return rounds;
  }

  const currentRound = () => state.training.rounds[state.training.i];

  function startTraining() {
    const rounds = planRounds();
    if (rounds.length < 2) {
      state.training = null;
      $("#trainBody").innerHTML =
        '<div class="empty">' + tr("train.tooShort", { key: "<b>R</b>" }) + '</div>';
      panel("#train", true);
      return;
    }
    state.training = { active: true, rounds, i: 0, savedWpm: state.wpm };
    beginRound();
  }

  function stopTraining() {
    if (!state.training) return;
    if (state.training.savedWpm) {
      state.wpm = state.training.savedWpm;
      applyStyle(); syncControls(); render(); save();
    }
    state.training = null;
  }

  function beginRound() {
    const r = currentRound();
    state.wpm = r.wpm;
    state.idx = clamp(r.from);
    syncControls();
    render();
    panel("#train", false);
    flash(tr("train.round", { i: state.training.i + 1, n: state.training.rounds.length, wpm: r.wpm }));
    // Cho một nhịp để đọc thông báo rồi mới chạy
    setTimeout(() => { if (state.training && state.training.active) play(); }, 900);
  }

  function endRound() {
    pause();
    const r = currentRound();
    openQuiz({
      from: r.from,
      count: ROUND_QUESTIONS,
      title: tr("train.roundLabel", { i: state.training.i + 1, wpm: r.wpm }),
      onGraded: (score, total) => {
        r.score = score; r.total = total;
        state.training.i++;
        if (state.training.i < state.training.rounds.length) {
          beginRound();
        } else {
          state.training.active = false;
          renderTrainingSummary();
          panel("#train", true);
        }
      }
    });
  }

  function renderTrainingSummary() {
    const rounds = state.training.rounds.filter((r) => r.total);
    const pctOf = (r) => Math.round((r.score / r.total) * 100);
    // Mức nhanh nhất mà vẫn còn hiểu tốt (>=80%) là ngưỡng nên dùng
    const good = rounds.filter((r) => pctOf(r) >= 80);
    const best = good.length ? good[good.length - 1] : null;

    const rows = rounds.map((r) => {
      const pct = pctOf(r);
      return '<div class="stat-row">' +
        '<span>' + r.wpm + ' WPM</span>' +
        '<span class="bar"><i style="width:' + pct + '%"></i></span>' +
        '<span class="pct">' + r.score + '/' + r.total + '</span>' +
        '</div>';
    }).join("");

    const advice = best
      ? tr("train.best", { wpm: best.wpm, pct: pctOf(best) })
      : tr("train.none", { wpm: clampRange(rounds[0].wpm - 100, LIMIT.wpm) });

    $("#trainBody").innerHTML =
      '<p class="quiz-intro">' + esc(tr("train.summary")) + '</p>' + rows +
      '<div class="quiz-result" style="margin-top:16px"><span>' + advice + '</span></div>' +
      '<div class="hl-actions">' +
      (best ? '<button class="quiz-review" id="trainApply">' + esc(tr("train.apply", { wpm: best.wpm })) + '</button>' : '') +
      '<button class="quiz-review" id="trainAgain">' + esc(tr("train.again")) + '</button>' +
      '</div>';

    const apply = $("#trainApply");
    if (apply) apply.addEventListener("click", () => {
      state.wpm = best.wpm;
      state.training = null;   // đừng để stopTraining() khôi phục tốc độ cũ
      applyStyle(); syncControls(); render(); save();
      panel("#train", false);
      flash(tr("train.applied", { wpm: best.wpm }));
    });
    $("#trainAgain").addEventListener("click", () => { stopTraining(); startTraining(); });
  }

  // ============================ KIỂM TRA HIỂU ============================

  // Đọc càng nhiều thì hỏi càng nhiều, trong khoảng 3–8 câu — bài ngắn 5 câu
  // cố định vừa thừa vừa dễ trùng ý, bài dài 5 câu lại quá ít để đại diện.
  function quizCount(scope) {
    const tokens = scope === "all" ? state.tokens.length : state.idx + 1;
    return Math.max(3, Math.min(8, Math.round((tokens * state.chunkSize) / 120)));
  }

  function highlightAnswer(sentence, answer) {
    const s = esc(sentence), a = esc(answer);
    const i = s.indexOf(a);
    return i < 0 ? s : s.slice(0, i) + "<mark>" + a + "</mark>" + s.slice(i + a.length);
  }

  // opts: { from, count, title, onGraded } — dùng cho chế độ luyện (hỏi riêng
  // một vòng). Gọi openQuiz() không tham số vẫn giữ nguyên hành vi phím Q.
  // opts: { from, upTo, count, title, emptyMsg, onGraded, scope }
  // Gọi openQuiz() không tham số vẫn giữ nguyên hành vi phím Q.
  function openQuiz(opts) {
    const o = opts || {};
    // scope: "read" = phần đã đọc · "all" = cả bài.
    // Chưa đọc đủ để ra câu hỏi thì tự chuyển sang cả bài, thay vì bắt người
    // dùng đọc hết mới được kiểm tra.
    const fixedRange = o.from !== undefined || o.upTo !== undefined;
    let scope = o.scope || state.quizScope || "read";
    if (!fixedRange && scope === "read" && state.idx < 25) scope = "all";

    const from = o.from || 0;
    const upTo = o.upTo !== undefined ? o.upTo
      : (scope === "all" ? state.tokens.length - 1 : state.idx);
    const count = o.count || (fixedRange ? 4 : quizCount(scope));

    const qs = E.buildQuiz(state.tokens, upTo, count, state.docLang, from, state.blocks);
    const body = $("#quizBody");
    state.quizScope = scope;

    // Bộ chọn phạm vi — chỉ hiện khi đang kiểm tra cả bài chứ không phải một mục
    const scopeBar = fixedRange ? "" : `
      <div class="quiz-scope" role="group" aria-label="${esc(tr("quiz.scope"))}">
        <button class="seg${scope === "read" ? " on" : ""}" data-scope="read"
          ${state.idx < 25 ? `disabled title="${esc(tr("quiz.scope.locked"))}"` : ""}>${esc(tr("quiz.scope.read"))}</button>
        <button class="seg${scope === "all" ? " on" : ""}" data-scope="all">${esc(tr("quiz.scope.all"))}</button>
      </div>`;

    if (!qs.length) {
      body.innerHTML = scopeBar + '<div class="empty">' +
        esc(o.emptyMsg || tr("quiz.empty")) + '</div>';
      wireScope(body, o);
      if (o.onGraded) setTimeout(() => o.onGraded(0, 0), 50);
      panel("#quiz", true);
      return;
    }
    state.quiz = { questions: qs, answers: {}, onGraded: o.onGraded, opts: o };

    body.innerHTML = `
      ${o.title ? `<div class="quiz-round">${esc(o.title)}</div>` : ""}
      ${scopeBar}
      <p class="quiz-intro">${esc(tr("quiz.intro"))}</p>
      ${qs.map((q, i) => `
        <div class="quiz-q" data-q="${q.id}">
          <div class="quiz-prompt">
            <b>${i + 1}.</b>${q.label ? `<span class="quiz-kind">${esc(q.label)}</span>` : ""}
            ${esc(q.prompt)}
          </div>
          <div class="quiz-opts">
            ${q.options.map((x) => `<button class="quiz-opt" data-q="${q.id}" data-v="${esc(x)}">${esc(x)}</button>`).join("")}
          </div>
          <div class="quiz-context" data-q="${q.id}" hidden></div>
        </div>`).join("")}
      <button class="primary" id="quizSubmit">${esc(tr("quiz.submit"))}</button>
      <div class="quiz-result" id="quizResult" hidden></div>`;

    wireScope(body, o);

    const submit = body.querySelector("#quizSubmit");
    // Chấm khi chưa chọn hết thì mọi câu bỏ trống đều tính sai, và điểm 0 đó
    // lại được ghi vào thống kê "điểm theo tốc độ" — làm hỏng chính dữ liệu
    // dùng để tìm ngưỡng WPM của bạn. Khoá nút cho tới khi trả lời đủ.
    const refreshSubmit = () => {
      const done = Object.keys(state.quiz.answers).length;
      submit.disabled = done < qs.length;
      submit.textContent = done < qs.length
        ? tr("quiz.submitLeft", { n: qs.length - done })
        : tr("quiz.submit");
    };

    body.querySelectorAll(".quiz-opt").forEach((b) =>
      b.addEventListener("click", () => {
        state.quiz.answers[b.dataset.q] = b.dataset.v;
        body.querySelectorAll(`.quiz-opt[data-q="${b.dataset.q}"]`)
          .forEach((x) => x.classList.remove("picked"));
        b.classList.add("picked");
        refreshSubmit();
      })
    );
    submit.addEventListener("click", gradeQuiz);
    refreshSubmit();
    panel("#quiz", true);
  }

  // Đổi phạm vi hoặc bấm "bộ câu khác" đều là sinh lại bài kiểm tra
  function wireScope(body, o) {
    body.querySelectorAll("[data-scope]").forEach((b) =>
      b.addEventListener("click", () => {
        if (b.disabled) return;
        openQuiz({ ...o, scope: b.dataset.scope });
      })
    );
  }

  function gradeQuiz() {
    if (!state.quiz || state.quiz.graded) return;
    state.quiz.graded = true;
    const { questions, answers } = state.quiz;
    let score = 0;
    questions.forEach((q) => {
      const picked = answers[q.id];
      const correct = picked === q.answer;
      if (correct) score++;
      $$(`.quiz-opt[data-q="${q.id}"]`).forEach((b) => {
        if (b.dataset.v === q.answer) b.classList.add("right");
        else if (b.dataset.v === picked) b.classList.add("wrong");
        b.disabled = true;
      });
      // Sai thì cho xem lại đúng câu gốc kèm đường dẫn nhảy về đó, thay vì
      // chỉ báo điểm — vậy mới thật sự giúp hiểu bài, không chỉ chấm điểm.
      if (!correct) {
        const ctx = $(`.quiz-context[data-q="${q.id}"]`);
        ctx.hidden = false;
        ctx.innerHTML = `<p>“${highlightAnswer(q.sentence, q.answer)}”</p>
          <button class="quiz-review" data-token="${q.token}">${esc(tr("quiz.review"))}</button>`;
        ctx.querySelector(".quiz-review").addEventListener("click", () => {
          jumpTo(parseInt(q.token, 10));
          panel("#quiz", false);
        });
      }
    });

    const pct = Math.round((score / questions.length) * 100);
    const advice = pct >= 80 ? tr("quiz.advice.good", { wpm: state.wpm })
      : pct >= 60 ? tr("quiz.advice.ok")
      : tr("quiz.advice.bad", { wpm: Math.max(150, state.wpm - 100) });

    const r = $("#quizResult");
    r.hidden = false;
    r.innerHTML = tr("quiz.result", { score, total: questions.length, pct, wpm: state.wpm }) +
      `<br><span>${advice}</span>`;
    $("#quizSubmit").disabled = true;

    // Mỗi lần sinh lại là một bộ câu hỏi khác — làm lại được ngay để ôn thêm
    if (!state.quiz.onGraded) {
      const again = document.createElement("button");
      again.className = "quiz-review";
      again.id = "quizAgain";
      again.textContent = tr("quiz.again");
      again.style.marginTop = "12px";
      again.addEventListener("click", () => openQuiz(state.quiz.opts || {}));
      r.appendChild(again);
    }

    recordQuiz(score, questions.length);

    // Chế độ luyện: báo điểm về để chuyển sang vòng kế tiếp
    const cb = state.quiz.onGraded;
    if (cb) {
      const next = $("#quizNext");
      if (next) next.remove();
      const btn = document.createElement("button");
      btn.className = "primary";
      btn.id = "quizNext";
      btn.textContent = tr("train.next");
      btn.addEventListener("click", () => { panel("#quiz", false); cb(score, questions.length); });
      $("#quizBody").appendChild(btn);
    }
  }

  // ============================ TRÍCH ĐOẠN ĐÃ LƯU ============================
  // RSVP đọc xong là chữ trôi mất; muốn giữ lại một câu thì phải chép tay.
  // Phím H lưu nguyên câu đang đọc vào danh sách của tài liệu, xuất được ra
  // Markdown để dán vào ghi chú. Lưu ở storage.local, không gửi đi đâu.

  const isHeadingBlock = (bi) => {
    const b = state.blocks[bi];
    return !!b && b.type === "h";
  };

  function currentSentence() {
    if (!state.tokens.length) return null;
    let at = state.idx;
    // Đang đứng ở tiêu đề thì lưu cái nhan đề là vô nghĩa — nhảy tới câu nội
    // dung đầu tiên của mục đó.
    if (isHeadingBlock((state.tokens[at] || {}).block)) {
      let j = at;
      while (j < state.tokens.length && isHeadingBlock(state.tokens[j].block)) j++;
      if (j < state.tokens.length) at = j;
    }
    const cur = state.tokens[at];
    if (!cur) return null;
    const sameBlock = (i) => !!state.tokens[i] && state.tokens[i].block === cur.block;

    // Tự quét tới token kết câu thay vì dùng sentenceNext: hàm đó bị kẹp ở
    // tokens.length - 1 nên với câu CUỐI bài nó trả về đúng token kết câu,
    // khiến slice() cắt mất chính từ cuối cùng của câu.
    //
    // Đồng thời không cho câu vắt qua ranh giới khối: tiêu đề không có dấu
    // chấm, nên nếu không chặn thì trích đoạn sẽ dính nguyên tiêu đề vào câu
    // đầu của đoạn ngay sau nó.
    let from = E.sentenceStart(state.tokens, at);
    while (from < at && !sameBlock(from)) from++;

    let to = from;
    while (to < state.tokens.length && sameBlock(to) &&
           !E.CLAUSE_END.test(state.tokens[to].text)) to++;
    const end = sameBlock(to) ? Math.min(to + 1, state.tokens.length) : to;

    const text = state.tokens.slice(from, end).map((t) => t.text).join(" ").trim();
    return text ? { text, token: from } : null;
  }

  const hlKey = () => "hl:" + state.docKey;

  async function loadHighlights() {
    state.highlights = [];
    if (!state.docKey) return;
    try {
      const d = await chrome.storage.local.get(hlKey());
      state.highlights = d[hlKey()] || [];
    } catch (e) {}
    paintHlCount();
  }

  function persistHighlights() {
    if (!state.docKey) return;
    quiet(chrome.storage.local.set({ [hlKey()]: state.highlights }));
    paintHlCount();
  }

  function paintHlCount() {
    const el = $("#hlCount");
    if (!el) return;
    el.textContent = state.highlights.length;
    el.hidden = state.highlights.length === 0;
  }

  function addHighlight() {
    const cur = currentSentence();
    if (!cur) return;
    if (state.highlights.some((h) => h.text === cur.text)) {
      flash(tr("hl.dup"));
      return;
    }
    state.highlights.push({ text: cur.text, token: cur.token, at: Date.now() });
    persistHighlights();
    flash(tr("hl.saved", { n: state.highlights.length }));
  }

  // Báo ngắn gọn ngay trên vùng chữ — bấm H mà không thấy phản hồi gì thì
  // không biết đã lưu được hay chưa.
  let flashTimer = null;
  function flash(msg) {
    const el = $("#flash");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { el.hidden = true; }, 1800);
  }

  function wireHlSave(body) {
    const b = body.querySelector("#hlSave");
    if (b) b.addEventListener("click", () => { addHighlight(); renderHighlights(); });
  }

  const cut = (t, n) => (t.length > n ? t.slice(0, n - 1).trim() + "…" : t);

  function highlightsMarkdown() {
    const head = "# " + (state.docTitle || tr("hl.fileTitle")) + "\n\n" +
      (state.docUrl ? state.docUrl + "\n\n" : "");
    return head + state.highlights.map((h) => "> " + h.text).join("\n\n") + "\n";
  }

  function safeFileName(name) {
    return String(name || "lamp").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 60);
  }

  function renderHighlights() {
    const body = $("#hlBody");
    // Nút lưu phải có mặt kể cả khi danh sách rỗng: nút dấu trang trên thanh
    // tiêu đề chỉ MỞ danh sách chứ không lưu, mà phím H thì không ai đoán ra —
    // trước đây người dùng mở bảng, thấy rỗng, tưởng tính năng hỏng.
    const cur = currentSentence();
    const saveBtn =
      '<button class="primary hl-save" id="hlSave" style="margin-top:0">' + esc(tr("hl.save")) + '</button>' +
      (cur ? '<div class="hl-preview">“' + esc(cut(cur.text, 150)) + '”</div>' : "");

    if (!state.highlights.length) {
      body.innerHTML = saveBtn +
        '<div class="empty" style="margin-top:14px">' + tr("hl.empty", { key: "<b>H</b>" }) + '</div>';
      wireHlSave(body);
      return;
    }
    body.innerHTML = saveBtn +
      '<p class="quiz-intro" style="margin-top:16px">' +
      esc(tr("hl.count", { n: state.highlights.length })) + '</p>' +
      '<div class="hl-list">' +
      state.highlights.map(function (h, i) {
        return '<div class="hl-item">' +
          '<button class="hl-text" data-token="' + h.token + '">' + esc(h.text) + '</button>' +
          '<button class="hl-del" data-i="' + i + '" title="' + esc(tr("btn.delete")) + '" aria-label="' + esc(tr("btn.delete")) + '">×</button>' +
          '</div>';
      }).join("") +
      '</div>' +
      '<div class="hl-actions">' +
      '<button class="quiz-review" id="hlCopy">' + esc(tr("hl.copy")) + '</button>' +
      '<button class="quiz-review" id="hlDownload">' + esc(tr("hl.download")) + '</button>' +
      '<button class="quiz-review" id="hlClear">' + esc(tr("btn.clearAll")) + '</button>' +
      '</div>';

    wireHlSave(body);
    body.querySelectorAll(".hl-text").forEach(function (b) {
      b.addEventListener("click", function () {
        jumpTo(parseInt(b.dataset.token, 10));
        panel("#highlights", false);
      });
    });
    body.querySelectorAll(".hl-del").forEach(function (b) {
      b.addEventListener("click", function () {
        state.highlights.splice(parseInt(b.dataset.i, 10), 1);
        persistHighlights();
        renderHighlights();
      });
    });
    body.querySelector("#hlCopy").addEventListener("click", async function () {
      try {
        await navigator.clipboard.writeText(highlightsMarkdown());
        flash(tr("hl.copied"));
      } catch (e) {
        flash(tr("hl.copyFail"));
      }
    });
    body.querySelector("#hlDownload").addEventListener("click", function () {
      // Blob + <a download>: không cần quyền "downloads", chạy ngay trong trang
      const blob = new Blob([highlightsMarkdown()], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = safeFileName(state.docTitle) + ".md";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
    body.querySelector("#hlClear").addEventListener("click", function () {
      state.highlights = [];
      persistHighlights();
      renderHighlights();
    });
  }

  // ============================ THỐNG KÊ ============================

  // Chỉ cộng phần MỚI đọc kể từ lần ghi trước. Trước đây hàm này cộng
  // (idx+1)*chunkSize — tức toàn bộ vị trí tuyệt đối — nên đọc hết bài rồi
  // đóng lại bị cộng hai lần (finish() và close() đều gọi), và chỉ mở ra rồi
  // đóng ngay ở vị trí đã lưu cũng bị cộng khống cả nghìn từ.
  async function recordSession() {
    accrue();
    const newTokens = Math.max(0, state.idx - state.creditedIdx);
    const words = newTokens * state.chunkSize;
    const ms = state.activeMs;
    state.creditedIdx = state.idx;
    state.activeMs = 0;
    if (!words && !ms) return;

    const day = new Date().toISOString().slice(0, 10);
    const { stats = { days: {}, quizzes: [] } } = await chrome.storage.local.get("stats");
    const d = stats.days[day] || { words: 0, ms: 0 };
    d.words += words;
    d.ms += ms;
    stats.days[day] = d;
    // Giữ 90 ngày gần nhất, tránh phình storage vô hạn
    const keep = Object.keys(stats.days).sort().slice(-90);
    stats.days = Object.fromEntries(keep.map((k) => [k, stats.days[k]]));
    await chrome.storage.local.set({ stats });
  }

  async function recordQuiz(score, total) {
    const { stats = { days: {}, quizzes: [] } } = await chrome.storage.local.get("stats");
    stats.quizzes.push({ wpm: state.wpm, score, total, at: Date.now() });
    stats.quizzes = stats.quizzes.slice(-50);
    await chrome.storage.local.set({ stats });
  }

  async function renderStats() {
    const { stats = { days: {}, quizzes: [] } } = await chrome.storage.local.get("stats");
    const days = Object.entries(stats.days).sort().slice(-7);
    const totalWords = days.reduce((n, [, d]) => n + d.words, 0);
    const totalMs = days.reduce((n, [, d]) => n + d.ms, 0);
    const avgWpm = totalMs > 0 ? Math.round(totalWords / (totalMs / 60000)) : 0;

    // Điểm quiz trung bình theo từng mức tốc độ — cho thấy ngưỡng của riêng bạn
    const byWpm = {};
    stats.quizzes.forEach((q) => {
      const b = Math.round(q.wpm / 100) * 100;
      byWpm[b] = byWpm[b] || { score: 0, total: 0, n: 0 };
      byWpm[b].score += q.score; byWpm[b].total += q.total; byWpm[b].n++;
    });
    const rows = Object.entries(byWpm).sort((a, b) => a[0] - b[0])
      .map(([wpm, v]) => {
        const pct = Math.round((v.score / v.total) * 100);
        return `<div class="stat-row">
          <span>${wpm} WPM</span>
          <span class="bar"><i style="width:${pct}%"></i></span>
          <span class="pct">${pct}%</span>
        </div>`;
      }).join("");

    $("#stats").innerHTML = `
      <div class="stat-grid">
        <div><b>${I.num(totalWords)}</b><small>${esc(tr("stats.words"))}</small></div>
        <div><b>${fmtTime(totalMs / 1000)}</b><small>${esc(tr("stats.time"))}</small></div>
        <div><b>${avgWpm || "—"}</b><small>${esc(tr("stats.wpm"))}</small></div>
      </div>
      ${rows ? `<div class="group-label" style="margin-top:14px">${esc(tr("stats.byWpm"))}</div>${rows}` : ""}`;
  }

  // ============================ LƯU TRỮ ============================

  // Gộp nhiều lượt ghi liên tiếp thành một. Lý do bắt buộc phải có:
  // chrome.storage.sync chỉ cho 120 lượt ghi mỗi phút, mà giữ phím ↑/↓ để
  // chỉnh tốc độ thì bàn phím tự lặp ~30 lần/giây — chưa tới 5 giây là vượt
  // hạn mức, Chrome bắt đầu từ chối và cài đặt lặng lẽ không được lưu nữa.
  // Kéo thanh tiến độ cũng bắn ra hàng trăm lượt ghi tiến trình tương tự.
  function debounce(fn, ms) {
    let timer = null;
    const run = () => { timer = null; fn(); };
    const wrapped = () => { clearTimeout(timer); timer = setTimeout(run, ms); };
    // flush(): ghi ngay lập tức — dùng khi đóng trình đọc hoặc rời trang,
    // lúc đó không còn cơ hội chờ hết thời gian gộp nữa.
    wrapped.flush = () => { if (timer) { clearTimeout(timer); run(); } };
    return wrapped;
  }

  // Hạn mức bị vượt hay storage bị chặn thì chỉ mất một lần lưu — không đáng
  // để ném lỗi chưa bắt ra console của trang người dùng.
  const quiet = (p) => Promise.resolve(p).catch(() => {});

  function writeSettings() {
    const out = {};
    Object.keys(DEFAULTS).forEach((k) => (out[k] = state[k]));
    quiet(chrome.storage.sync.set(out));
  }
  const save = debounce(writeSettings, 400);

  // Lưu vị trí theo (khối, từ) chứ không theo chỉ số token: token phụ thuộc
  // "số từ mỗi lần", nên bản cũ lưu theo token thì chỉ cần đổi chunkSize là
  // mất sạch tiến trình. Toạ độ (khối, từ) không đổi theo chunkSize.
  function writeProgress() {
    if (!state.docKey) return;
    const t = state.tokens[state.idx];
    if (!t) return;
    const total = Math.max(1, state.tokens.length);
    quiet(chrome.storage.local.set({
      ["pos:" + state.docKey]: {
        block: t.block, word: t.from, blocks: state.blocks.length, at: Date.now(),
        // Ba trường dưới chỉ để popup dựng danh sách "đang đọc dở" — phần
        // khôi phục vị trí vẫn chỉ dựa vào block/word ở trên.
        title: state.docTitle, url: state.docUrl, kind: state.docKind,
        pct: Math.round(((state.idx + 1) / total) * 100)
      }
    }));
    pruneProgress();
  }

  // Giữ 60 tài liệu gần nhất. Không dọn thì mỗi trang từng đọc để lại một bản
  // ghi vĩnh viễn, vài tháng là danh sách thư viện dài vô dụng.
  let pruning = false;
  async function pruneProgress() {
    if (pruning) return;
    pruning = true;
    try {
      const all = await chrome.storage.local.get(null);
      const keys = Object.keys(all).filter((k) => k.startsWith("pos:"));
      if (keys.length > 60) {
        keys.sort((a, b) => (all[b].at || 0) - (all[a].at || 0));
        await chrome.storage.local.remove(keys.slice(60));
      }
    } catch (e) { /* hết chỗ hoặc bị chặn — bỏ qua, không ảnh hưởng việc đọc */ }
    pruning = false;
  }
  const saveProgress = debounce(writeProgress, 500);

  function flushWrites() { save.flush(); saveProgress.flush(); }

  async function loadProgress() {
    if (!state.docKey) return 0;
    const key = "pos:" + state.docKey;
    let rec;
    try {
      rec = (await chrome.storage.local.get(key))[key];
    } catch (e) { return 0; }
    if (!rec) return 0;
    // Bản ghi cũ (lưu theo token) — bỏ qua, đọc lại từ đầu một lần
    if (rec.block === undefined) return 0;
    // Nội dung trang đã đổi hẳn thì vị trí cũ không còn nghĩa
    if (rec.blocks !== state.blocks.length) return 0;

    const i = state.tokens.findIndex(
      (t) => t.block === rec.block && rec.word >= t.from && rec.word <= t.to
    );
    if (i < 0) return 0;
    // Gần đầu hoặc gần cuối thì đọc lại từ đầu cho gọn
    if (i < 5 || i >= state.tokens.length - 2) return 0;
    return i;
  }

  // ============================ VÒNG ĐỜI ============================

  async function open(settings, forceSelection) {
    Object.keys(DEFAULTS).forEach((k) => {
      if (settings && settings[k] !== undefined) state[k] = settings[k];
    });

    // Phải đặt ngôn ngữ trước khi markup() chạy, vì chuỗi được nhúng lúc dựng
    I.setLang(state.lang);

    const ex = window.__lampExtract(forceSelection);
    const blocks = ex.blocks || [];
    const joined = blocks.map((b) => b.text).join(" ");
    if (joined.trim().length < 40) {
      alert(forceSelection ? tr("msg.noSelection") : tr("msg.noContent"));
      return;
    }

    state.blocks = blocks;
    // Nguồn khai báo ngôn ngữ (EPUB có dc:language) thì tin nó; không thì mới
    // đoán qua dấu thanh. Sách tiếng Việt mà chương đầu đầy tên riêng nước
    // ngoài rất dễ bị đoán trượt.
    // Nguồn khai báo ngôn ngữ (EPUB có dc:language) thì tin nó; không thì đoán.
    state.docLang = E.detectLang(joined, ex.lang);
    state.vietnamese = state.docLang === "vi";
    state.tokens = E.buildTokens(blocks, state.chunkSize, state.docLang);
    // Trang xem PDF luôn có cùng URL nên mọi file PDF mở từ máy sẽ dùng chung
    // một khoá tiến trình — thêm tên tài liệu vào khoá để tách chúng ra.
    // Ở chế độ cửa sổ riêng, location.href là URL của chính trang reader.html
    // kèm mã tài liệu — đổi mỗi lần mở. Lấy nó làm khoá thì tiến trình đọc và
    // thư viện hỏng hoàn toàn. Dùng URL trang gốc mà background gửi kèm.
    const baseUrl = ex.url || (location.href.split("#")[0] || "");
    state.docKey = (baseUrl +
      (ex.source === "pdf" ? "#" + (ex.title || "") : "")).slice(0, 300);
    state.docUrl = baseUrl;
    state.docTitle = (ex.title || state.docUrl || tr("doc.untitled")).slice(0, 200);
    state.docKind = ex.source !== "pdf" ? "web"
      : (/[?&]file=/.test(location.search) ? "pdf-url" : "pdf-local");
    state.playing = false;
    state.started = false;
    state.activeMs = 0;
    state.lastTick = 0;
    state.sinceRest = 0;
    state.sessionStart = Date.now();

    if (!state.host) await buildOverlay();
    state.host.style.display = "block";
    state.open = true;
    PANELS.forEach((s) => ($(s).hidden = true));
    $("#rest").hidden = true;
    $("#focusView").hidden = true;
    // Tài liệu mới → bỏ HTML đã dựng của tài liệu cũ
    clearPaintCache();

    await loadHighlights();
    state.idx = await loadProgress();
    state.creditedIdx = state.idx; // chỉ tính phần đọc thêm từ đây trở đi
    if (state.idx > 0) state.started = true;

    $("#docTitle").textContent = ex.source === "selection"
      ? tr("doc.selection") + (ex.title ? " · " + ex.title : "")
      : (ex.title || "");
    $("#rsvpView").hidden = state.mode !== "rsvp";
    $("#guideView").hidden = state.mode !== "guide";
    if (state.mode === "guide") paintGuide();

    applyStyle();
    syncControls();
    setPlayIcon(false);
    renderOutline();
    render();

    if ("speechSynthesis" in window) {
      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Không tự chạy — chờ người dùng nhấn Space hoặc nút phát
    state.prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    // Đặt focus vào chính overlay (không phải vào một nút — bấm Space khi nút
    // đang focus sẽ vừa kích hoạt nút vừa chạy phím tắt). Nhờ vậy Tab tiếp
    // theo đi vào các nút trong overlay thay vì rơi xuống trang phía sau.
    state.prevFocus = document.activeElement;
    $(".backdrop").focus({ preventScroll: true });
  }

  function close() {
    pause();
    endRest();
    recordSession();
    flushWrites();
    state.open = false;
    // Cửa sổ đọc riêng: đóng trình đọc nghĩa là đóng hẳn cửa sổ, chứ không
    // phải ẩn overlay đi để lộ ra một trang trắng.
    if (window.__lampCloseAction === "window") {
      flushWrites();
      setTimeout(() => window.close(), 60);
      return;
    }
    if (state.host) state.host.style.display = "none";
    document.documentElement.style.overflow = state.prevOverflow || "";
    // Trả con trỏ bàn phím về đúng chỗ người dùng đang đứng trước khi mở
    try { state.prevFocus && state.prevFocus.focus({ preventScroll: true }); } catch (e) {}
  }

  window.__lampReader = {
    open, close,
    toggle: (s, forceSelection) => (state.open ? close() : open(s, forceSelection))
  };

  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type !== "LAMP_TOGGLE") return;
      window.__lampReader.toggle(msg.settings, msg.forceSelection);
    });
  }
})();
