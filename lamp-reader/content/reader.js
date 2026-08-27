// Lamp — reader.js
// Overlay đọc nhanh, dựng trong Shadow DOM để CSS của trang web không can thiệp được.
// Hai chế độ: RSVP (từng cụm ở giữa) và Dẫn dòng (giữ nguyên đoạn văn, tô sáng chạy).

(() => {
  if (window.__lampReaderLoaded) return;
  window.__lampReaderLoaded = true;

  const E = window.__lampEngine;

  const DEFAULTS = window.LAMP_DEFAULTS; // xem content/defaults.js

  const STEP = { wpm: 50, chunk: 1, size: 4, spacing: 1 };
  const LIMIT = { wpm: [100, 1200], chunk: [1, 6], size: [24, 120], spacing: [0, 12] };

  // Các ngăn xếp phông đều chọn theo tiêu chí hiển thị đủ dấu tiếng Việt,
  // kể cả dấu chồng như ế, ộ, ữ. Xem README nếu muốn thả thêm file font.
  const FONTS = {
    system: { label: "Hệ thống", stack: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
    vietnam: { label: "Be Vietnam", stack: '"Lamp Vietnam", "Be Vietnam Pro", "Be Vietnam", system-ui, sans-serif' },
    tahoma: { label: "Tahoma", stack: 'Tahoma, Verdana, Geneva, sans-serif' },
    serif: { label: "Serif", stack: '"Lamp Serif", Literata, Cambria, Charter, "Times New Roman", Times, serif' },
    notoserif: { label: "Noto Serif", stack: '"Lamp Noto Serif", "Noto Serif", Georgia, serif' },
    mono: { label: "Mono", stack: 'Consolas, "SF Mono", "Roboto Mono", "Courier New", monospace' },
    custom: { label: "Tuỳ chỉnh", stack: "" }
  };

  const THEMES = ["paper", "sepia", "gray", "night", "contrast"];
  const THEME_LABEL = { paper: "Giấy", sepia: "Sepia", gray: "Xám", night: "Đêm", contrast: "Tương phản cao" };

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
    timer: null,
    host: null,
    root: null,
    open: false,
    docKey: null,
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
    quiz: null
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
    shortWords: state.shortWords
  });

  // Tốc độ thật sau khi trừ phần giảm nhịp cho tiếng Việt — dùng cho ước
  // lượng thời gian còn lại và cho tốc độ giọng đọc, để hai thứ này khớp với
  // nhịp chữ đang chạy thay vì lệch 15%.
  const effectiveWpm = () => state.wpm * (state.vietnamese ? 0.85 : 1);

  // ============================ GIAO DIỆN ============================

  function markup() {
    // Xem trước ngay trên nút: mỗi nút tự hiển thị bằng đúng phông nó đại
    // diện, nên không cần mở panel ra xa mới biết phông đã đổi hay chưa.
    const fontBtns = Object.entries(FONTS)
      .map(([k, v]) => `<button class="seg" data-font="${k}"${v.stack ? ` style="font-family:${v.stack.replace(/"/g, "&quot;")}"` : ""}>${v.label}</button>`).join("");
    const themeBtns = THEMES.map(
      (t) => `<button class="swatch" data-theme="${t}" title="${THEME_LABEL[t]}" aria-label="${THEME_LABEL[t]}"><i></i></button>`
    ).join("");

    const stepper = (id, label, unit = "") => `
      <div class="stepper">
        <span class="stepper-label">${label}</span>
        <div class="stepper-box">
          <button class="step" data-step="${id}:-1" aria-label="Giảm ${label}">−</button>
          <span class="stepper-val"><b id="${id}Val">0</b>${unit ? `<em>${unit}</em>` : ""}</span>
          <button class="step" data-step="${id}:1" aria-label="Tăng ${label}">+</button>
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
      next: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5l8 7-8 7M3 5l8 7-8 7"/></svg>'
    };

    return `
      <div class="backdrop" data-theme="${state.theme}" tabindex="-1">

        <div class="topbar">
          <div class="doc-title" id="docTitle"></div>
          <button class="round" id="outlineBtn" title="Dàn bài (O)" aria-label="Dàn bài">${icon.list}</button>
          <button class="round" id="settingsBtn" title="Cài đặt (S)" aria-label="Cài đặt">${icon.gear}</button>
          <button class="round" id="closeBtn" title="Đóng (Esc)" aria-label="Đóng">${icon.x}</button>
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
          <div class="ready" id="ready">Nhấn <kbd>Space</kbd> để bắt đầu</div>
        </div>

        <div class="dock">
          <div class="modebar" id="modebar">
            <button class="seg" data-mode="rsvp">RSVP</button>
            <button class="seg" data-mode="guide">Dẫn dòng</button>
          </div>

          <div class="track" id="track" role="slider" tabindex="0" aria-label="Tiến độ đọc">
            <div class="fill" id="fill"></div>
            <div class="knob" id="knob"></div>
          </div>
          <div class="meta">
            <span id="pos">0 / 0</span>
            <span id="left">còn 0:00</span>
          </div>

          <div class="transport">
            <button class="tbtn" id="back" title="Lùi 10 (←) · Shift+← đọc lại câu">${icon.prev}</button>
            <button class="playbtn" id="play" title="Phát / dừng (Space)" aria-label="Phát hoặc dừng">
              <svg id="playIcon" viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>
            </button>
            <button class="tbtn" id="fwd" title="Tiến 10 (→) · Shift+→ câu sau">${icon.next}</button>
          </div>

          <div class="steppers">
            ${stepper("wpm", "Tốc độ", "WPM")}
            <div class="zone-slot"><span class="zone" id="zone"></span></div>
            ${stepper("chunk", "Từ mỗi lần")}
            ${stepper("size", "Cỡ chữ", "px")}
          </div>
        </div>

        <!-- Dàn bài -->
        <div class="sheet" id="outline" hidden>
          <div class="sheet-head"><b>Dàn bài</b>
            <button class="round sm" id="outlineClose" aria-label="Đóng">${icon.x}</button></div>
          <div class="sheet-body"><div id="outlineList" class="outline-list"></div></div>
        </div>

        <!-- Cài đặt -->
        <div class="sheet" id="sheet" hidden>
          <div class="sheet-head"><b>Cài đặt</b>
            <button class="round sm" id="sheetClose" aria-label="Đóng">${icon.x}</button></div>
          <div class="sheet-body">
            <div class="group">
              <div class="group-label">Phông chữ</div>
              <div class="segbar" id="fonts">${fontBtns}</div>
              <input type="text" id="customFont" class="text-input" placeholder="Tên phông đã cài trên máy, ví dụ: Literata" hidden>
            </div>
            <div class="group">
              <div class="group-label">Giao diện</div>
              <div class="swatches" id="themes">${themeBtns}</div>
            </div>
            <div class="group">
              <div class="group-label">Giãn chữ</div>
              <div class="steppers compact">${stepper("spacing", "Khoảng cách", "px")}</div>
            </div>
            <div class="group">
              <div class="group-label">Đọc bằng giọng nói</div>
              ${toggle("tts", "Bật giọng đọc", "Chữ chạy theo giọng, nghe và nhìn cùng lúc")}
              <select id="voice" class="text-input" hidden></select>
            </div>
            <div class="group">
              ${toggle("orp", "Tô chữ trung tâm", "Điểm neo mắt, giúp nhận diện từ nhanh hơn")}
              ${toggle("ruler", "Thanh dẫn", "Hai vạch canh vị trí mắt")}
              ${toggle("rhythm", "Nhịp dấu câu", "Dừng lâu hơn ở cuối câu, câu dài dừng lâu hơn")}
              ${toggle("shortWords", "Bỏ qua từ ngắn", "Từ đệm như “và”, “của”, “là” lướt nhanh hơn")}
              ${toggle("context", "Xem ngữ cảnh", "Hiện các từ xung quanh, mờ hơn")}
              ${toggle("warmup", "Khởi động chậm", "40 cụm đầu chạy ở 65% tốc độ rồi tăng dần")}
              ${toggle("restReminder", "Nhắc nghỉ mắt", "Cứ 20 phút nhắc nhìn xa 20 giây")}
            </div>
            <div class="group">
              <div class="group-label">Thống kê</div>
              <div id="stats" class="stats"></div>
            </div>
            <div class="keys">
              <b>Phím tắt</b>
              <div><kbd>Space</kbd> phát/dừng · <kbd>←</kbd><kbd>→</kbd> lùi/tiến 10 · <kbd>Shift</kbd>+<kbd>←</kbd> đọc lại câu</div>
              <div><kbd>↑</kbd><kbd>↓</kbd> tốc độ · <kbd>M</kbd> đổi chế độ · <kbd>O</kbd> dàn bài · <kbd>Q</kbd> kiểm tra · <kbd>S</kbd> cài đặt</div>
            </div>
          </div>
        </div>

        <!-- Kiểm tra hiểu -->
        <div class="sheet wide" id="quiz" hidden>
          <div class="sheet-head"><b>Kiểm tra hiểu</b>
            <button class="round sm" id="quizClose" aria-label="Đóng">${icon.x}</button></div>
          <div class="sheet-body"><div id="quizBody"></div></div>
        </div>

        <!-- Nhắc nghỉ mắt -->
        <div class="rest" id="rest" hidden>
          <div class="rest-card">
            <b>Nghỉ mắt 20 giây</b>
            <p>Nhìn ra xa khoảng 6 mét. RSVP làm bạn chớp mắt ít hơn bình thường, đây là lúc bù lại.</p>
            <div class="rest-count" id="restCount">20</div>
            <button class="ghost" id="restSkip">Bỏ qua</button>
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
    host.setAttribute("aria-label", "Lamp — trình đọc nhanh");
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
    checkFonts();
  }

  // Ba phông nhúng sẵn — nếu người dùng thả sai tên/đường dẫn file vào
  // fonts/, nút chọn phông tương ứng tự hiện dấu cảnh báo thay vì âm thầm
  // lùi về phông hệ thống khiến tưởng nhầm là "chưa đủ phông".
  const EMBEDDED_FONTS = {
    vietnam: "fonts/Be_Vietnam_Pro/BeVietnamPro-Regular.ttf",
    serif: "fonts/Literata/Literata-VariableFont_opsz,wght.ttf",
    notoserif: "fonts/Noto_Serif/NotoSerif-VariableFont_wdth,wght.ttf"
  };
  async function checkFonts() {
    if (typeof FontFace === "undefined") return;
    await Promise.all(Object.entries(EMBEDDED_FONTS).map(async ([key, path]) => {
      try {
        await new FontFace("__lamp_check_" + key, `url("${chrome.runtime.getURL(path)}")`).load();
      } catch (e) {
        const btn = $(`[data-font="${key}"]`);
        if (btn) {
          btn.classList.add("font-missing");
          btn.title = "Không nạp được file phông này — xem fonts/README.txt";
        }
      }
    }));
  }

  // ============================ SỰ KIỆN ============================

  function wireEvents() {
    $("#closeBtn").addEventListener("click", close);
    $("#settingsBtn").addEventListener("click", () => panel("#sheet"));
    $("#outlineBtn").addEventListener("click", () => panel("#outline"));
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

    ["orp", "ruler", "rhythm", "shortWords", "context", "warmup", "restReminder", "tts"].forEach((k) =>
      $("#" + k).addEventListener("change", (e) => {
        state[k] = e.target.checked;
        if (k === "tts") { stopSpeech(); syncControls(); if (state.playing) { pause(); play(); } }
        applyStyle(); render(); save();
      })
    );

    $("#voice").addEventListener("change", (e) => {
      state.voiceURI = e.target.value;
      save();
      if (state.playing && state.tts) { pause(); play(); }
    });

    $("#outlineList").addEventListener("click", (e) => {
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

    ["#sheet", "#outline", "#quiz"].forEach((s) => makeDraggable($(s)));

    document.addEventListener("keydown", onKey, true);
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
      const openPanel = ["#sheet", "#outline", "#quiz"].find((s) => !$(s).hidden);
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
    else if (k === "q" || k === "Q") { stop(); openQuiz(); }
    else if (k === "m" || k === "M") { stop(); setMode(state.mode === "rsvp" ? "guide" : "rsvp"); }
    else if (k === "r" || k === "R") { stop(); jumpTo(0); }
  }

  function panel(sel, force) {
    const el = $(sel);
    const show = force === undefined ? el.hidden : force;
    ["#sheet", "#outline", "#quiz"].forEach((s) => ($(s).hidden = true));
    el.hidden = !show;
    if (show) {
      resetPanelPos(el);
      pause();
      if (sel === "#sheet") renderStats();
      if (sel === "#outline") markOutlineCurrent();
    }
  }

  function bump(key, dir) {
    if (key === "wpm") state.wpm = clampRange(state.wpm + dir * STEP.wpm, LIMIT.wpm);
    else if (key === "chunk") {
      // Giữ đúng vị trí đang đọc theo (khối, từ) thay vì theo tỉ lệ phần trăm
      // — đổi số từ mỗi lần không được làm nhảy chỗ đang đọc.
      const at = state.tokens[state.idx];
      state.chunkSize = clampRange(state.chunkSize + dir * STEP.chunk, LIMIT.chunk);
      state.tokens = E.buildTokens(state.blocks, state.chunkSize);
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
        const words = b.text.split(/\s+/).filter(Boolean);
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
    bd.dataset.theme = state.theme;
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
    $$("[data-font]").forEach((b) => b.classList.toggle("on", b.dataset.font === state.fontFamily));
    $$("[data-theme]").forEach((b) => b.classList.toggle("on", b.dataset.theme === state.theme));
    $$("[data-mode]").forEach((b) => b.classList.toggle("on", b.dataset.mode === state.mode));
    ["orp", "ruler", "rhythm", "shortWords", "context", "warmup", "restReminder", "tts"].forEach(
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
    track.setAttribute("aria-valuetext", `${Math.round(pct)}% — ${state.idx + 1} trên ${total}`);

    // Nhịp thực tế đã tính cả giảm tốc tiếng Việt, nên thời gian còn lại mới
    // khớp với cảm nhận; lấy thẳng wpm sẽ luôn báo ngắn hơn thực tế ~15%.
    const wordsLeft = (total - state.idx) * state.chunkSize;
    $("#left").textContent = "còn " + fmtTime(wordsLeft / (effectiveWpm() / 60));

    // Vùng tốc độ: nghiên cứu RSVP cho thấy tới ~350 WPM khả năng hiểu ngang
    // đọc thường, vượt lên thì tụt rõ rệt.
    const z = $("#zone");
    if (state.wpm <= 350) { z.dataset.zone = "safe"; z.textContent = "giữ được hiểu"; }
    else if (state.wpm <= 500) { z.dataset.zone = "skim"; z.textContent = "đọc lướt"; }
    else { z.dataset.zone = "scan"; z.textContent = "chỉ quét ý"; }

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
    const want = state.vietnamese ? "vi" : "en";
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
      list.innerHTML = '<div class="empty">Trang này không có tiêu đề mục nào để dựng dàn bài.</div>';
      return;
    }
    const total = Math.max(1, state.tokens.length);
    list.innerHTML = items
      .map((it) => `<button class="outline-item" data-token="${it.token}" data-depth="${it.depth || 0}">
          <span class="outline-text">${esc(it.text)}</span>
          <span class="outline-pos">${Math.round((it.token / total) * 100)}%</span>
        </button>`)
      .join("");
    markOutlineCurrent();
  }

  // Đánh dấu mục đang đọc để mở dàn bài ra là biết ngay mình đang ở đâu
  function markOutlineCurrent() {
    const btns = $$(".outline-item");
    let cur = -1;
    btns.forEach((b, i) => {
      if (+b.dataset.token <= state.idx) cur = i;
    });
    btns.forEach((b, i) => b.classList.toggle("current", i === cur));
  }

  // ============================ KIỂM TRA HIỂU ============================

  // Đọc càng nhiều thì hỏi càng nhiều, trong khoảng 3–8 câu — bài ngắn 5 câu
  // cố định vừa thừa vừa dễ trùng ý, bài dài 5 câu lại quá ít để đại diện.
  function quizCount() {
    const wordsRead = (state.idx + 1) * state.chunkSize;
    return Math.max(3, Math.min(8, Math.round(wordsRead / 120)));
  }

  function highlightAnswer(sentence, answer) {
    const s = esc(sentence), a = esc(answer);
    const i = s.indexOf(a);
    return i < 0 ? s : s.slice(0, i) + "<mark>" + a + "</mark>" + s.slice(i + a.length);
  }

  function openQuiz() {
    const qs = E.buildQuiz(state.tokens, state.idx, quizCount(), state.vietnamese);
    const body = $("#quizBody");
    if (!qs.length) {
      body.innerHTML = '<div class="empty">Chưa đọc đủ nội dung để tạo câu hỏi. Đọc thêm rồi thử lại.</div>';
      panel("#quiz", true);
      return;
    }
    state.quiz = { questions: qs, answers: {} };

    body.innerHTML = `
      <p class="quiz-intro">Điền từ còn thiếu. Đây là cách tự kiểm tra xem bạn thật sự hiểu hay chỉ đang nhìn chữ chạy.</p>
      ${qs.map((q, i) => `
        <div class="quiz-q" data-q="${q.id}">
          <div class="quiz-prompt"><b>${i + 1}.</b> ${esc(q.prompt)}</div>
          <div class="quiz-opts">
            ${q.options.map((o) => `<button class="quiz-opt" data-q="${q.id}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}
          </div>
          <div class="quiz-context" data-q="${q.id}" hidden></div>
        </div>`).join("")}
      <button class="primary" id="quizSubmit">Chấm điểm</button>
      <div class="quiz-result" id="quizResult" hidden></div>`;

    const submit = body.querySelector("#quizSubmit");
    // Chấm khi chưa chọn hết thì mọi câu bỏ trống đều tính sai, và điểm 0 đó
    // lại được ghi vào thống kê "điểm theo tốc độ" — làm hỏng chính dữ liệu
    // dùng để tìm ngưỡng WPM của bạn. Khoá nút cho tới khi trả lời đủ.
    const refreshSubmit = () => {
      const done = Object.keys(state.quiz.answers).length;
      submit.disabled = done < qs.length;
      submit.textContent = done < qs.length
        ? `Chấm điểm — còn ${qs.length - done} câu`
        : "Chấm điểm";
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
          <button class="quiz-review" data-token="${q.token}">↺ Xem lại đoạn này</button>`;
        ctx.querySelector(".quiz-review").addEventListener("click", () => {
          jumpTo(parseInt(q.token, 10));
          panel("#quiz", false);
        });
      }
    });

    const pct = Math.round((score / questions.length) * 100);
    let advice;
    if (pct >= 80) advice = `Tốt. ${state.wpm} WPM đang phù hợp với bạn ở loại nội dung này — có thể thử tăng 50.`;
    else if (pct >= 60) advice = `Tạm được, nhưng đang mất chi tiết. Giữ nguyên tốc độ hoặc giảm 50 WPM.`;
    else advice = `Đang quá nhanh. Hãy giảm xuống ${Math.max(150, state.wpm - 100)} WPM và đọc lại đoạn này.`;

    const r = $("#quizResult");
    r.hidden = false;
    r.innerHTML = `<b>${score}/${questions.length}</b> đúng (${pct}%) ở tốc độ ${state.wpm} WPM.<br><span>${advice}</span>`;
    $("#quizSubmit").disabled = true;

    recordQuiz(score, questions.length);
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
        <div><b>${totalWords.toLocaleString("vi-VN")}</b><small>từ, 7 ngày qua</small></div>
        <div><b>${fmtTime(totalMs / 1000)}</b><small>thời gian đọc</small></div>
        <div><b>${avgWpm || "—"}</b><small>WPM thực tế</small></div>
      </div>
      ${rows ? `<div class="group-label" style="margin-top:14px">Điểm kiểm tra theo tốc độ</div>${rows}` : ""}`;
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
    quiet(chrome.storage.local.set({
      ["pos:" + state.docKey]: {
        block: t.block, word: t.from, blocks: state.blocks.length, at: Date.now()
      }
    }));
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

    const ex = window.__lampExtract(forceSelection);
    const blocks = ex.blocks || [];
    const joined = blocks.map((b) => b.text).join(" ");
    if (joined.trim().length < 40) {
      alert(forceSelection
        ? "Lamp: đoạn bạn bôi đen quá ngắn hoặc chưa chọn gì. Hãy tô đen đoạn văn muốn đọc rồi thử lại."
        : "Lamp: không tìm thấy nội dung đủ dài trên trang này.\nThử bôi đen đoạn văn muốn đọc rồi bấm chuột phải chọn “Đọc nhanh đoạn này bằng Lamp”.");
      return;
    }

    state.blocks = blocks;
    state.vietnamese = E.detectVietnamese(joined);
    state.tokens = E.buildTokens(blocks, state.chunkSize);
    // Trang xem PDF luôn có cùng URL nên mọi file PDF mở từ máy sẽ dùng chung
    // một khoá tiến trình — thêm tên tài liệu vào khoá để tách chúng ra.
    state.docKey = ((location.href.split("#")[0] || "") +
      (ex.source === "pdf" ? "#" + (ex.title || "") : "")).slice(0, 300);
    state.playing = false;
    state.started = false;
    state.activeMs = 0;
    state.lastTick = 0;
    state.sinceRest = 0;
    state.sessionStart = Date.now();

    if (!state.host) await buildOverlay();
    state.host.style.display = "block";
    state.open = true;
    ["#sheet", "#outline", "#quiz"].forEach((s) => ($(s).hidden = true));
    $("#rest").hidden = true;
    $("#focusView").hidden = true;
    // Tài liệu mới → bỏ HTML đã dựng của tài liệu cũ
    clearPaintCache();

    state.idx = await loadProgress();
    state.creditedIdx = state.idx; // chỉ tính phần đọc thêm từ đây trở đi
    if (state.idx > 0) state.started = true;

    $("#docTitle").textContent = ex.source === "selection"
      ? "Đoạn đã chọn" + (ex.title ? " · " + ex.title : "")
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
