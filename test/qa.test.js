// Lamp — bộ kiểm tra TOÀN VẸN GÓI (QA tĩnh)
//
// Khác với các bộ kia (kiểm tra hành vi), bộ này kiểm tra những thứ chỉ lộ ra
// khi Chrome nạp extension, lúc đó đã muộn và thông báo lỗi thường vô nghĩa
// ("Status code: 15", "Could not load manifest"). Rẻ, chạy trong một giây, và
// bắt đúng lớp lỗi đã hai lần làm hỏng bản cài.
//
//   • manifest trỏ tới file không tồn tại
//   • khoá __MSG_*__ thiếu trong _locales
//   • khoá dịch dùng trong mã / HTML mà không có trong bảng ngôn ngữ
//   • bảng ngôn ngữ lệch nhau giữa các thứ tiếng
//   • rác .DS_Store lọt vào gói (trong _locales là hỏng hẳn phần ngôn ngữ)
//   • gọi API Chrome có callback mà quên đọc runtime.lastError

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = path.join(__dirname, "..");
const BASE = path.join(ROOT, "lamp-reader");

let pass = 0, fail = 0, warn = 0;
const ok = (n, c, e) => c
  ? (pass++, console.log("  ok   " + n))
  : (fail++, console.log("  FAIL " + n + (e ? "\n         → " + e : "")));
const note = (n, d) => { warn++; console.log("  note " + n + (d ? "\n         → " + d : "")); };

const rd = (p) => fs.readFileSync(path.join(BASE, p), "utf8");
const exists = (p) => fs.existsSync(path.join(BASE, p));

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out); else out.push(full);
  }
  return out;
}
const allFiles = walk(BASE).map((f) => path.relative(BASE, f));

// ═══════════════════════════════════════════════════════════════════
console.log("\n== manifest.json ==");
let mf = null;
try { mf = JSON.parse(rd("manifest.json")); ok("manifest.json là JSON hợp lệ", true); }
catch (e) { ok("manifest.json là JSON hợp lệ", false, e.message); }

if (mf) {
  ok("manifest_version = 3", mf.manifest_version === 3);
  ok("có version", /^\d+\.\d+(\.\d+)?$/.test(mf.version || ""), mf.version);
  ok("có default_locale (bắt buộc khi dùng __MSG_*__)", !!mf.default_locale, String(mf.default_locale));

  // Mọi đường dẫn file mà manifest nhắc tới đều phải tồn tại thật
  const refs = [];
  const collect = (v) => {
    if (typeof v === "string") { if (/\.(js|html|css|png|mjs)$/.test(v) && !v.includes("*")) refs.push(v); }
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === "object") Object.values(v).forEach(collect);
  };
  collect(mf);
  const missing = [...new Set(refs)].filter((r) => !exists(r));
  ok(`${new Set(refs).size} file manifest trỏ tới đều tồn tại`, missing.length === 0, missing.join(", "));

  // Mẫu có ký tự đại diện (fonts/*) phải khớp ít nhất một file
  const globs = [];
  (mf.web_accessible_resources || []).forEach((w) => (w.resources || []).forEach((r) => r.includes("*") && globs.push(r)));
  for (const g of globs) {
    const pre = g.split("*")[0];
    ok(`mẫu "${g}" khớp ít nhất một file`, allFiles.some((f) => f.replace(/\\/g, "/").startsWith(pre)));
  }

  // Quyền: khai gì phải dùng nấy, dùng gì phải khai nấy
  const js = allFiles.filter((f) => f.endsWith(".js")).map(rd).join("\n");
  const html = allFiles.filter((f) => f.endsWith(".html")).map(rd).join("\n");
  const src = js + html;
  const NEEDS = { scripting: "chrome.scripting.", storage: "chrome.storage.", contextMenus: "chrome.contextMenus." };
  for (const [perm, marker] of Object.entries(NEEDS)) {
    ok(`quyền "${perm}" có khai báo và có dùng`,
       (mf.permissions || []).includes(perm) && src.includes(marker));
  }
  ok("chrome.permissions.* có được bảo trợ bởi optional_host_permissions",
     !src.includes("chrome.permissions.request") ||
     (mf.optional_host_permissions || []).length > 0);
  ok("KHÔNG xin host_permissions rộng ngay từ đầu",
     !mf.host_permissions || mf.host_permissions.length === 0,
     JSON.stringify(mf.host_permissions));
  // chrome.windows.* không cần quyền riêng, nhưng tabs.query({url}) thì cần "tabs"
  ok('không dùng tabs.query lọc theo url mà thiếu quyền "tabs"',
     !/tabs\.query\(\s*\{[^}]*\burl\b/.test(src) || (mf.permissions || []).includes("tabs"));
}

// ═══════════════════════════════════════════════════════════════════
console.log("\n== _locales (chuỗi trong manifest) ==");
if (mf) {
  const msgKeys = [...JSON.stringify(mf).matchAll(/__MSG_([A-Za-z0-9_]+)__/g)].map((m) => m[1]);
  const localeDirs = fs.existsSync(path.join(BASE, "_locales"))
    ? fs.readdirSync(path.join(BASE, "_locales"), { withFileTypes: true })
        .filter((e) => e.isDirectory()).map((e) => e.name)
    : [];
  ok("có thư mục _locales", localeDirs.length > 0, localeDirs.join(","));
  ok(`default_locale "${mf.default_locale}" có thật`, localeDirs.includes(mf.default_locale));

  // Chrome DUYỆT thư mục con của _locales. File rác của Finder ở đó làm hỏng
  // phần ngôn ngữ mà không báo lỗi rõ ràng.
  const junkInLocales = allFiles.filter((f) =>
    f.replace(/\\/g, "/").startsWith("_locales/") && !f.endsWith("messages.json"));
  ok("trong _locales chỉ có messages.json", junkInLocales.length === 0, junkInLocales.join(", "));

  for (const loc of localeDirs) {
    let m = null;
    try { m = JSON.parse(rd(path.join("_locales", loc, "messages.json"))); }
    catch (e) { ok(`_locales/${loc}/messages.json hợp lệ`, false, e.message); continue; }
    const miss = msgKeys.filter((k) => !m[k]);
    ok(`_locales/${loc} có đủ ${msgKeys.length} khoá manifest`, miss.length === 0, miss.join(", "));
    const noMsg = Object.keys(m).filter((k) => !m[k] || typeof m[k].message !== "string");
    ok(`_locales/${loc} mọi khoá đều có trường "message"`, noMsg.length === 0, noMsg.join(", "));
    const unused = Object.keys(m).filter((k) => !msgKeys.includes(k));
    if (unused.length) note(`_locales/${loc} có khoá không ai dùng`, unused.join(", "));
  }
}

// ═══════════════════════════════════════════════════════════════════
console.log("\n== bảng dịch trong ứng dụng (content/i18n.js) ==");
let I = null;
{
  const sb = { console, Intl, Object, JSON, String, Number, Math };
  sb.self = sb; sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(rd("content/i18n.js"), sb, { filename: "i18n.js" });
  I = sb.__lampI18n;
  ok("i18n.js nạp được ngoài trình duyệt", !!I);
}

if (I) {
  const langs = I.langs();
  console.log("  ngôn ngữ: " + langs.join(", "));

  // Lấy bảng khoá của từng ngôn ngữ bằng cách so chuỗi trả về với chính khoá
  // (t() trả về nguyên khoá khi không tìm thấy ở cả ngôn ngữ hiện tại lẫn dự phòng)
  const srcI18n = rd("content/i18n.js");
  const tables = {};
  for (const L of langs) {
    const seg = srcI18n.split(new RegExp(`M\\.${L}\\s*=`))[1];
    if (!seg) continue;
    const end = seg.indexOf("\n  };");
    // KHÔNG neo ^ : bảng dịch gói nhiều khoá trên cùng một dòng
    // ("btn.skip": "Bỏ qua", "btn.delete": "Xoá", …) nên regex neo đầu dòng
    // chỉ bắt được khoá đầu tiên và báo oan là "thiếu bản dịch".
    tables[L] = new Set([...seg.slice(0, end > 0 ? end : seg.length)
      .matchAll(/"([A-Za-z0-9_.]+)"\s*:/g)].map((m) => m[1]));
  }
  const ref = tables[langs[0]];
  ok(`ngôn ngữ gốc "${langs[0]}" có ${ref ? ref.size : 0} khoá`, ref && ref.size > 50, String(ref && ref.size));
  for (const L of langs.slice(1)) {
    const miss = [...ref].filter((k) => !tables[L].has(k));
    const extra = [...tables[L]].filter((k) => !ref.has(k));
    ok(`"${L}" không thiếu khoá nào so với "${langs[0]}"`, miss.length === 0, miss.join(", "));
    ok(`"${L}" không có khoá thừa`, extra.length === 0, extra.join(", "));
  }

  // Mọi khoá dùng trong MÃ NGUỒN phải có trong bảng.
  //
  // Không dò theo tên hàm ("tr(", "t(", "__lampI18n.t(" …): mỗi file đặt một
  // tên khác nhau và bản dò đầu tiên của bộ này đã báo oan 34 khoá vì bỏ sót
  // hai cách gọi. Thay vào đó quét MỌI chuỗi ký tự trong mã và HTML — khoá
  // dịch trông rất đặc trưng nên gần như không đụng nhầm.
  const codeText = allFiles
    .filter((f) => /\.(js|html)$/.test(f) && !f.startsWith("vendor") && f !== "content/i18n.js")
    .map(rd).join("\n");
  const literals = new Set([
    ...[...codeText.matchAll(/"([A-Za-z0-9_.|]+)"/g)].map((m) => m[1]),
    ...[...codeText.matchAll(/'([A-Za-z0-9_.|]+)'/g)].map((m) => m[1])
  ]);
  // data-i18n-aria="key|labelKey" — tách đôi
  for (const l of [...literals]) if (l.includes("|")) l.split("|").forEach((x) => literals.add(x));
  // Khoá ghép động: tr("quiz.kind." + q.kind) → chuỗi "quiz.kind." có mặt
  const prefixes = [...literals].filter((l) => l.endsWith("."));

  const used = new Set([...ref].filter((k) =>
    literals.has(k) || prefixes.some((p) => k.startsWith(p) && k !== p)));
  const undef = [...literals].filter((l) =>
    !l.includes("|") &&                       // dạng ghép "key|labelKey" đã tách ở trên
    /^[a-z][A-Za-z0-9]*\.[a-z]/.test(l) && !ref.has(l) &&
    [...ref].some((k) => k.split(".")[0] === l.split(".")[0])).sort();
  ok(`không có khoá dịch nào bị dùng mà thiếu bản dịch`, undef.length === 0,
     undef.join("\n           "));
  console.log(`  ${used.size}/${ref.size} khoá được dùng tới`);

  const unused = [...ref].filter((k) => !used.has(k)).sort();
  if (unused.length) note(`${unused.length} khoá trong bảng không thấy ai dùng`, unused.join(", "));

  // Chỗ trống {var} phải khớp nhau giữa các ngôn ngữ, nếu không bản dịch sẽ
  // hiện nguyên chữ "{n}" trước mặt người dùng.
  let mismatch = [];
  for (const k of ref) {
    const varsOf = (L) => {
      const prev = I.lang(); I.setLang(L);
      const s = I.t(k); I.setLang(prev);
      return [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
    };
    const base = varsOf(langs[0]);
    for (const L of langs.slice(1)) if (varsOf(L) !== base) mismatch.push(`${k}: ${langs[0]}[${base}] ≠ ${L}[${varsOf(L)}]`);
  }
  ok("chỗ trống {var} khớp nhau giữa các ngôn ngữ", mismatch.length === 0, mismatch.join("\n           "));

  // Không được có bản dịch rỗng
  let empties = [];
  for (const L of langs) { I.setLang(L); for (const k of ref) if (!String(I.t(k)).trim()) empties.push(`${L}:${k}`); }
  ok("không có bản dịch rỗng", empties.length === 0, empties.join(", "));
  I.setLang("vi");
}

// ═══════════════════════════════════════════════════════════════════
console.log("\n== vệ sinh gói ==");
{
  const junk = allFiles.filter((f) => /(^|[\\/])\.DS_Store$|(^|[\\/])Thumbs\.db$|~$|\.orig$|\.rej$/.test(f));
  ok("không có file rác trong gói", junk.length === 0,
     junk.length ? junk.join(", ") + "\n           xoá bằng:  find lamp-reader -name .DS_Store -delete" : "");

  // Mọi file .js/.css/.html phải được ai đó nhắc tới — file mồ côi là dấu hiệu
  // của bản sao chết còn sót lại sau khi tái cấu trúc.
  const referenced = new Set();
  const allText = allFiles.filter((f) => /\.(js|html|json|css)$/.test(f) && !f.startsWith("vendor"))
    .map(rd).join("\n");
  for (const f of allFiles) {
    if (!/\.(js|css|html|mjs)$/.test(f)) continue;
    const base = path.basename(f);
    if (allText.includes(base)) referenced.add(f);
  }
  const orphans = allFiles.filter((f) => /\.(js|css|html|mjs)$/.test(f) && !referenced.has(f));
  ok("không có file mã mồ côi", orphans.length === 0, orphans.join(", "));

  // Giấy phép phông chữ: SIL OFL bắt buộc phát hành kèm bản quyền
  const fontDirs = new Set(allFiles.filter((f) => f.startsWith("fonts" + path.sep) && /\.(woff2?|ttf|otf)$/i.test(f))
    .map((f) => path.dirname(f)));
  const noLicense = [...fontDirs].filter((d) => !allFiles.some((f) => path.dirname(f) === d && /OFL|LICENSE/i.test(path.basename(f))));
  ok("mỗi thư mục phông đều kèm giấy phép", noLicense.length === 0, noLicense.join(", "));

  const bytes = walk(BASE).reduce((n, f) => n + fs.statSync(f).size, 0);
  ok("gói dưới 20MB", bytes < 20 * 1024 * 1024, (bytes / 1048576).toFixed(1) + "MB");
  console.log("  kích thước gói: " + (bytes / 1048576).toFixed(1) + "MB");
}

// ═══════════════════════════════════════════════════════════════════
console.log("\n== gọi API Chrome đúng cách ==");
{
  // API nào có thể đặt runtime.lastError mà nếu không đọc thì Chrome ghi
  // "Unchecked runtime.lastError" ra trang lỗi của extension — người dùng thấy
  // extension báo lỗi đỏ dù mọi thứ vẫn chạy. Chỉ những API dạng-callback mới
  // vướng; dạng Promise thì lỗi đi vào .catch/await.
  const RISKY = ["contextMenus.create", "contextMenus.update", "contextMenus.remove"];
  const codeFiles = allFiles.filter((f) => f.endsWith(".js") && !f.startsWith("vendor"));
  let bad = [];
  for (const f of codeFiles) {
    const s = rd(f);
    for (const api of RISKY) {
      const re = new RegExp("chrome\\." + api.replace(".", "\\.") + "\\(", "g");
      for (const m of s.matchAll(re)) {
        // cắt lấy lời gọi rồi xem có tham số callback cuối không
        const tail = s.slice(m.index, m.index + 600);
        const hasCb = /\}\s*,\s*(\(\)|function|\w+)\s*(=>|\()/.test(tail) || /,\s*(\(\)\s*=>|function\s*\()/.test(tail);
        if (!hasCb) bad.push(`${f}: chrome.${api} không có callback đọc lastError`);
      }
    }
  }
  ok("mọi lời gọi contextMenus đều có callback", bad.length === 0, bad.join("\n           "));

  // Nơi nào có callback thì phải THỰC SỰ đọc lastError bên trong
  const bg = rd("background.js");
  ok("callback của contextMenus.create có đọc runtime.lastError",
     /contextMenus\.create\([\s\S]{0,400}?lastError/.test(bg));

  // onMessage bất đồng bộ PHẢI return true, nếu không sendResponse rơi vào hư vô
  const asyncMsg = /onMessage\.addListener\(([\s\S]*?)\n\}\);/.exec(bg);
  if (asyncMsg) {
    const body = asyncMsg[1];
    const branches = (body.match(/\.then\(sendResponse\)/g) || []).length;
    const returns = (body.match(/return true;/g) || []).length;
    ok("mỗi nhánh onMessage bất đồng bộ đều return true",
       returns >= branches, `${branches} nhánh async / ${returns} lần return true`);
  }

  // Service worker MV3 bị ngủ sau ~30 giây rảnh và mất sạch biến toàn cục.
  // Chỉ được để ở đó những thứ MẤT ĐI CŨNG KHÔNG SAO:
  //   menuQueue  — hàng đợi dựng menu, mỗi lượt tự đủ
  //   winIdCache — bản nhớ tạm của mã cửa sổ, nguồn thật nằm ở storage.session
  // Thêm biến mới vào đây thì phải tự hỏi: mất nó giữa chừng có hỏng gì không?
  const globals = [...bg.matchAll(/^let\s+(\w+)\s*=/gm)].map((m) => m[1]);
  const allowed = ["menuQueue", "winIdCache"];
  const risky = globals.filter((g) => !allowed.includes(g));
  ok("không cất dữ liệu bền vào biến toàn cục của service worker",
     risky.length === 0, risky.join(", "));
  ok("mã cửa sổ đọc có nguồn thật trong storage.session",
     /storage\.session\.(set|get)\([^)]*WIN_ID_KEY|\[WIN_ID_KEY\]/.test(bg));
}

// ═══════════════════════════════════════════════════════════════════
console.log("\n== nhất quán phiên bản ==");
if (mf) {
  const rootReadme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  const pkgReadme = rd("README.md");
  const short = mf.version.replace(/\.0$/, "");
  const hit = (s) => s.includes(mf.version) || s.includes(short);
  ok(`README gốc nhắc phiên bản ${mf.version}`, hit(rootReadme));
  ok(`README trong gói nhắc phiên bản ${mf.version}`, hit(pkgReadme));
}

console.log(`\n${pass} passed, ${fail} failed` + (warn ? `, ${warn} ghi chú` : ""));
process.exit(fail ? 1 : 0);
