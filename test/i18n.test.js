// Kiểm thử bộ từ điển: mọi ngôn ngữ phải phủ đủ khoá, không sót, không thừa.
const fs = require("fs");
const path = require("path");
const BASE = path.join(__dirname, "..", "lamp-reader");

global.self = global;
global.window = global;
// Node mới có sẵn globalThis.navigator dạng CHỈ ĐỌC — gán thẳng sẽ im lặng
// không có tác dụng, phải defineProperty mới ghi đè được.
const setNav = (lang) => Object.defineProperty(global, "navigator",
  { value: { language: lang }, configurable: true, writable: true });
setNav("vi-VN");
eval(fs.readFileSync(path.join(BASE, "content/i18n.js"), "utf8"));
const I = global.self.__lampI18n;

let pass = 0, fail = 0;
const ok = (n, c, e) => c
  ? (pass++, console.log("  ok   " + n))
  : (fail++, console.log("  FAIL " + n + (e ? "  → " + e : "")));

console.log("\n== các ngôn ngữ có sẵn ==");
const langs = I.langs();
console.log("  " + langs.map((c) => `${c} (${I.name(c)})`).join(", "));
ok("có ít nhất 2 ngôn ngữ", langs.length >= 2);
ok("ngôn ngữ nào cũng có tên hiển thị", langs.every((c) => I.name(c) && I.name(c) !== c));

console.log("\n== phủ khoá ==");
// Lấy bảng khoá của từng ngôn ngữ bằng cách so kết quả t() với chính tên khoá
const src = fs.readFileSync(path.join(BASE, "content/i18n.js"), "utf8");
const blocks = {};
for (const c of langs) {
  const m = new RegExp(`M\\.${c} = \\{([\\s\\S]*?)\\n  \\};`).exec(src);
  blocks[c] = new Set([...m[1].matchAll(/^\s+"([^"]+)":/gm)].map((x) => x[1]));
}
const all = new Set(Object.values(blocks).flatMap((s) => [...s]));
console.log(`  tổng ${all.size} khoá`);
for (const c of langs) {
  const missing = [...all].filter((k) => !blocks[c].has(k));
  ok(`${c}: đủ ${all.size} khoá`, missing.length === 0, missing.slice(0, 5).join(", "));
}

console.log("\n== chỗ thay biến {x} phải khớp giữa các ngôn ngữ ==");
const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
let mismatch = [];
for (const k of all) {
  const set = new Set();
  for (const c of langs) { I.setLang(c); set.add(vars(I.t(k))); }
  if (set.size > 1) mismatch.push(k);
}
ok("mọi khoá dùng cùng bộ biến ở mọi ngôn ngữ", mismatch.length === 0, mismatch.join(", "));

console.log("\n== tra cứu ==");
I.setLang("vi");
ok("vi trả về tiếng Việt", /Cài đặt/.test(I.t("top.settings")), I.t("top.settings"));
I.setLang("en");
ok("en trả về tiếng Anh", I.t("top.settings") === "Settings", I.t("top.settings"));
ok("thay được biến", I.t("hl.saved", { n: 3 }) === "Excerpt saved (3)", I.t("hl.saved", { n: 3 }));
ok("khoá lạ thì trả về chính nó", I.t("khong.co.khoa.nay") === "khong.co.khoa.nay");
ok("ngôn ngữ lạ rơi về tiếng Anh", I.setLang("xx") === "en");

console.log("\n== auto theo trình duyệt ==");
setNav("vi-VN");
ok("navigator vi → vi", I.setLang("auto") === "vi", I.lang());
setNav("fr-FR");
ok("navigator lạ → en", I.setLang("auto") === "en", I.lang());
setNav("en-GB");
ok("navigator en → en", I.setLang("auto") === "en", I.lang());

console.log("\n== định dạng số theo ngôn ngữ ==");
I.setLang("vi"); const vn = I.num(1234567);
I.setLang("en"); const en = I.num(1234567);
console.log(`  vi: ${vn}   en: ${en}`);
ok("vi và en định dạng số khác nhau", vn !== en, `${vn} vs ${en}`);

console.log("\n== hồ sơ ngôn ngữ NỘI DUNG (engine) ==");
eval(fs.readFileSync(path.join(BASE, "content/engine.js"), "utf8"));
const E = global.window.__lampEngine;
ok("nhận ra tiếng Việt", E.detectLang("Trí tuệ nhân tạo đang thay đổi cách con người làm việc mỗi ngày") === "vi");
ok("nhận ra tiếng Anh", E.detectLang("Artificial intelligence is changing the way people work every day") === "en");
ok("nhận ra chữ Hán/Nhật", E.detectLang("人工知能は私たちの働き方を変えつつあります。これは大きな変化です。") === "zh");
ok("mã ngôn ngữ khai sẵn được ưu tiên", E.detectLang("Artificial intelligence", "vi-VN") === "vi");
ok("tiếng Việt chạy chậm hơn tiếng Anh", E.profile("vi").pace < E.profile("en").pace);
ok("CJK chậm hơn tiếng Việt", E.profile("zh").pace < E.profile("vi").pace);
ok("tiếng Việt khoét cụm 2 âm tiết", E.profile("vi").cloze === 2);
ok("tiếng Anh khoét 1 từ", E.profile("en").cloze === 1);
ok("mỗi ngôn ngữ có mã giọng riêng",
   new Set(["vi","en","zh"].map((c) => E.profile(c).ttsLang)).size === 3);
ok("từ đệm tiếng Anh không lẫn vào hồ sơ CJK", E.profile("zh").stop.length === 0);

console.log("\n== nhịp đọc đổi theo ngôn ngữ nội dung ==");
{
  const tok = { text: "abcd", block: 0, from: 0, to: 0 };
  const base = { wpm: 350, rhythm: false, warmup: false, shortWords: false };
  const d = (lang) => E.tokenDelay(tok, 5, [tok], { ...base, lang });
  console.log(`  vi=${Math.round(d("vi"))}ms  en=${Math.round(d("en"))}ms  zh=${Math.round(d("zh"))}ms`);
  ok("vi chậm hơn en", d("vi") > d("en"));
  ok("zh chậm hơn vi", d("zh") > d("vi"));
  ok("cờ boolean cũ vẫn chạy (tương thích ngược)",
     Math.abs(E.tokenDelay(tok, 5, [tok], { ...base, vietnamese: true }) - d("vi")) < 0.01);
}

console.log("\n== dấu câu CJK kết thúc câu ==");
{
  const text = "人工知能は世界を変える。これは大きな変化だ。未来は明るい。";
  const blocks = [{ text, type: "p" }];

  const wordsVi = E.splitWords(text, "vi");
  const wordsZh = E.splitWords(text, "zh");
  console.log(`  tách kiểu thường: ${wordsVi.length} "từ"  ·  tách CJK: ${wordsZh.length} từ`);
  console.log("  " + JSON.stringify(wordsZh.slice(0, 10)));
  ok("không có dấu cách thì cách thường trả về nguyên đoạn", wordsVi.length === 1);
  ok("Intl.Segmenter tách được thành nhiều từ", wordsZh.length >= 10, String(wordsZh.length));

  const toks = E.buildTokens(blocks, 1, "zh");
  ok("sinh được nhiều token", toks.length >= 10, String(toks.length));
  ok("tách được câu bằng dấu 。", toks.filter((t) => /。$/.test(t.text)).length >= 3,
     JSON.stringify(toks.map((t) => t.text).slice(0, 20)));
  ok("ghép lại đúng nguyên văn (không chèn khoảng trắng thừa)",
     toks.map((t) => t.text).join("") === text,
     toks.map((t) => t.text).join(""));

  // Bất biến sống còn: reader.js dựng chế độ Dẫn dòng bằng chính splitWords,
  // nên from/to phải trỏ đúng vào mảng từ đó.
  ok("from/to khớp chỉ số của splitWords",
     toks.every((t) => t.text === wordsZh.slice(t.from, t.to + 1).join("")));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
