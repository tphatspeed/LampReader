#!/usr/bin/env node
// Chạy các bộ kiểm thử chạy-trong-trang mà KHÔNG cần người ngồi nhìn.
//
// Vì sao cần: harness.html, window.test.html… dùng setTimeout thật để chờ hiệu
// ứng và storage lắng xuống. Chrome bóp nhịp bộ đếm của tab không hiển thị —
// xuống 1 lần/giây, rồi 1 lần/PHÚT sau 5 phút. Mở tab ngầm rồi chờ kết quả thì
// bộ 136 phép sẽ bò suốt vài tiếng, và người chạy tưởng là treo. Đã mất thời
// gian vì đúng chuyện này nhiều lần.
//
// Cách làm: bật Chrome headless kèm ba cờ tắt bóp nhịp, rồi lái bằng giao thức
// DevTools. Mỗi trang kiểm thử gắn kết quả vào window.__lampTestResult —
// script này chỉ việc hỏi cho tới khi có.
//
//     node test/run-browser.js            # chạy hết
//     node test/run-browser.js harness    # chạy một bộ
//
// Cần server tĩnh đang chạy: python3 test/serve.py

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const PORT = process.env.LAMP_TEST_PORT || 8899;
const CDP = 9222;
const CHROME = process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const SUITES = ["harness", "window.test", "popup.test", "epub.test", "pdf.test"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Mỗi bộ kiểm thử đặt tên biến kết quả một kiểu (__lampTestResult,
// __winTestResult…). Thay vì bắt cả năm file phải đổi theo, dò mọi biến kết
// thúc bằng "TestResult"; không có thì đọc thẳng dòng tổng kết trong log.
const PROBE = `(() => {
  for (const k of Object.keys(window)) {
    if (/TestResult$/.test(k) && window[k] && typeof window[k].pass === "number") {
      return JSON.stringify(window[k]);
    }
  }
  const L = (document.getElementById("log") || { textContent: "" }).textContent;
  const m = L.match(/(\\d+)\\s*passed,\\s*(\\d+)\\s*failed/);
  if (!m) return null;
  return JSON.stringify({
    pass: +m[1], fail: +m[2],
    failed: [...L.matchAll(/(?:FAIL|THROWN|REJECTED)[^\\n]*/g)].map((x) => x[0])
  });
})()`;

async function getJSON(url) {
  const r = await fetch(url);
  return r.json();
}

// ---- lớp bọc mỏng quanh giao thức DevTools ----
class CDPSession {
  constructor(ws) { this.ws = ws; this.id = 0; this.waiting = new Map(); this.sessionId = null;
    ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.waiting.has(m.id)) {
        const { resolve, reject } = this.waiting.get(m.id);
        this.waiting.delete(m.id);
        m.error ? reject(new Error(m.error.message)) : resolve(m.result);
      }
    });
  }
  send(method, params = {}, sessionId = this.sessionId) {
    const id = ++this.id;
    const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    this.ws.send(JSON.stringify(msg));
    return new Promise((resolve, reject) => {
      this.waiting.set(id, { resolve, reject });
      setTimeout(() => { if (this.waiting.delete(id)) reject(new Error("CDP hết giờ: " + method)); }, 30000);
    });
  }
}

(async () => {
  // server tĩnh phải sẵn sàng
  try { await fetch(`http://localhost:${PORT}/test/harness.html`); }
  catch {
    console.error(`Không thấy server ở cổng ${PORT}. Chạy trước:\n  python3 test/serve.py`);
    process.exit(2);
  }
  if (!fs.existsSync(CHROME)) {
    console.error("Không thấy Chrome ở:\n  " + CHROME + "\nĐặt biến CHROME_PATH để trỏ đúng chỗ.");
    process.exit(2);
  }

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "lamp-test-"));
  const chrome = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`,
    // BA CỜ QUAN TRỌNG NHẤT: không có chúng thì bộ đếm bị bóp và bộ kiểm thử bò
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "about:blank"
  ], { stdio: "ignore" });

  const cleanup = () => { try { chrome.kill(); } catch {} try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} };
  process.on("exit", cleanup);
  process.on("SIGINT", () => { cleanup(); process.exit(130); });

  // chờ CDP mở cổng
  let ver = null;
  for (let i = 0; i < 60 && !ver; i++) {
    try { ver = await getJSON(`http://localhost:${CDP}/json/version`); } catch { await sleep(250); }
  }
  if (!ver) { console.error("Chrome không mở được cổng gỡ lỗi."); cleanup(); process.exit(2); }

  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
  const cdp = new CDPSession(ws);

  const want = process.argv.slice(2);
  const suites = want.length
    ? SUITES.filter((s) => want.some((w) => s.startsWith(w.replace(/\.html$/, ""))))
    : SUITES;
  if (!suites.length) { console.error("Không khớp bộ nào. Có: " + SUITES.join(", ")); cleanup(); process.exit(2); }

  let totalPass = 0, totalFail = 0;
  const summary = [];

  for (const suite of suites) {
    const url = `http://localhost:${PORT}/test/${suite}.html`;
    const { targetId } = await cdp.send("Target.createTarget", { url }, null);
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true }, null);

    let res = null, waited = 0;
    const LIMIT = 180000;
    while (!res && waited < LIMIT) {
      await sleep(400); waited += 400;
      try {
        const r = await cdp.send("Runtime.evaluate", { expression: PROBE, returnByValue: true }, sessionId);
        const v = r.result && r.result.value;
        if (v && v !== "null") res = JSON.parse(v);
      } catch { /* trang chưa nạp xong */ }
    }

    if (!res) {
      // Lấy log ra để biết nó dừng ở đâu, đừng chỉ báo "hết giờ"
      let tail = "";
      try {
        const r = await cdp.send("Runtime.evaluate", {
          expression: "(document.getElementById('log')||{textContent:''}).textContent.slice(-400)",
          returnByValue: true
        }, sessionId);
        tail = r.result.value || "";
      } catch {}
      console.log(`\n✗ ${suite}: HẾT GIỜ sau ${LIMIT / 1000}s`);
      if (tail) console.log("  dừng ở:\n" + tail.split("\n").map((l) => "    " + l).join("\n"));
      totalFail++; summary.push([suite, "HẾT GIỜ", 0, 1]);
    } else {
      totalPass += res.pass; totalFail += res.fail;
      const mark = res.fail ? "✗" : "✓";
      console.log(`${mark} ${suite.padEnd(12)} ${String(res.pass).padStart(4)} passed, ${res.fail} failed  (${(waited / 1000).toFixed(1)}s)`);
      (res.failed || []).forEach((f) => console.log("      · " + f));
      summary.push([suite, res.fail ? "ĐỎ" : "XANH", res.pass, res.fail]);
    }
    await cdp.send("Target.closeTarget", { targetId }, null);
  }

  console.log("\n" + "─".repeat(52));
  console.log(`TỔNG (trong trình duyệt): ${totalPass} passed, ${totalFail} failed`);
  ws.close(); cleanup();
  process.exit(totalFail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
