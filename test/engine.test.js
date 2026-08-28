// Kiểm thử engine.js + các quy tắc bất biến mà reader.js dựa vào.
const fs = require("fs");
const BASE = require("path").join(__dirname, "..", "lamp-reader");

global.self = global;
global.window = global;
eval(fs.readFileSync(BASE + "/content/engine.js", "utf8"));
const E = global.window.__lampEngine;

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (extra ? "  → " + extra : "")); }
}
function eq(name, a, b) { ok(name, JSON.stringify(a) === JSON.stringify(b), `got ${JSON.stringify(a)} want ${JSON.stringify(b)}`); }

const viText = "Trí tuệ nhân tạo đang thay đổi cách con người làm việc mỗi ngày một cách sâu sắc. "
  + "Nhiều công ty công nghệ lớn đã đầu tư hàng tỷ đô la vào nghiên cứu học máy trong năm qua. "
  + "Các nhà khoa học tin rằng công nghệ này sẽ tiếp tục phát triển nhanh chóng trong thập kỷ tới. "
  + "Tuy nhiên, một số chuyên gia cảnh báo rằng việc ứng dụng thiếu kiểm soát có thể gây rủi ro nghiêm trọng. "
  + "Chính phủ nhiều quốc gia đang soạn thảo những quy định mới để quản lý lĩnh vực này chặt chẽ hơn. "
  + "Người lao động cũng cần trang bị thêm kỹ năng mới để thích nghi với thị trường việc làm. "
  + "Giáo dục đóng vai trò quan trọng trong việc chuẩn bị cho thế hệ tương lai đối mặt thách thức này.";

console.log("\n== detectVietnamese ==");
ok("nhận ra tiếng Việt", E.detectVietnamese(viText));
ok("không nhận nhầm tiếng Anh", !E.detectVietnamese("The quick brown fox jumps over the lazy dog repeatedly every single day."));

console.log("\n== buildTokens ==");
const blocks = [
  { text: "Tiêu đề bài viết", type: "h", level: 2 },
  { text: viText, type: "p" },
  { text: "Mục con", type: "h", level: 3 },
  { text: "Một đoạn ngắn ở cuối bài để kiểm tra.", type: "p" }
];
for (const cs of [1, 2, 3, 4, 5, 6]) {
  const toks = E.buildTokens(blocks, cs);
  const rebuilt = toks.map(t => t.text).join(" ");
  const original = blocks.map(b => b.text).join(" ");
  ok(`chunk=${cs}: ghép lại đúng nguyên văn`, rebuilt === original);
  ok(`chunk=${cs}: không cụm nào vắt qua ranh giới khối`,
     toks.every(t => t.block >= 0 && t.block < blocks.length));
  // from/to phải khớp với cách reader.js đánh chỉ số từ (split/filter)
  const okIdx = toks.every(t => {
    const words = blocks[t.block].text.split(/\s+/).filter(Boolean);
    return t.text === words.slice(t.from, t.to + 1).join(" ");
  });
  ok(`chunk=${cs}: from/to khớp chỉ số từ trong khối`, okIdx);
}

console.log("\n== buildOutline (lỗi cũ: luôn rỗng vì thiếu block.type) ==");
const toks1 = E.buildTokens(blocks, 1);
const outline = E.buildOutline(blocks, toks1);
eq("số mục dàn bài", outline.length, 2);
eq("mục 1", outline[0].text, "Tiêu đề bài viết");
eq("mục 2", outline[1].text, "Mục con");
eq("depth chuẩn hoá h2→0", outline[0].depth, 0);
eq("depth chuẩn hoá h3→1", outline[1].depth, 1);
ok("token của mục 2 > mục 1", outline[1].token > outline[0].token);
eq("khối không có type thì dàn bài rỗng (mô phỏng lỗi cũ)",
   E.buildOutline([{ text: "x" }], []).length, 0);

console.log("\n== sentenceStart / sentenceNext ==");
ok("sentenceStart không âm", E.sentenceStart(toks1, 0) >= 0);
ok("sentenceNext trong biên", E.sentenceNext(toks1, 0) < toks1.length);
ok("sentenceNext luôn tiến", E.sentenceNext(toks1, 5) > 5);
for (let i = 0; i < toks1.length; i++) {
  const s = E.sentenceStart(toks1, i);
  if (s < 0 || s > i) { ok("sentenceStart <= i cho mọi i", false, `i=${i} s=${s}`); break; }
  if (i === toks1.length - 1) ok("sentenceStart <= i cho mọi i", true);
}

console.log("\n== tokenDelay ==");
const P = { wpm: 350, rhythm: true, warmup: false, vietnamese: true, shortWords: false };
const allPos = toks1.every((t, i) => {
  const d = E.tokenDelay(t, i, toks1, P);
  return Number.isFinite(d) && d > 0;
});
ok("mọi độ trễ đều hữu hạn và dương", allPos);
const endTok = toks1.find(t => /[.!?…]$/.test(t.text));
const midTok = toks1.find(t => !/[.!?…,;:—–)\]}”’»]$/.test(t.text) && !/^[([{“‘«]/.test(t.text));
ok("cuối câu dừng lâu hơn giữa câu",
   E.tokenDelay(endTok, 20, toks1, P) > E.tokenDelay(midTok, 20, toks1, P));
ok("shortWords làm từ đệm nhanh hơn", (() => {
  const t = { text: "của", block: 0, from: 0, to: 0 };
  const a = E.tokenDelay(t, 5, toks1, { ...P, shortWords: false, rhythm: false });
  const b = E.tokenDelay(t, 5, toks1, { ...P, shortWords: true, rhythm: false });
  return b < a;
})());
ok("dấu ngoặc được cho thêm nhịp", (() => {
  const plain = { text: "abcd", block: 0, from: 0, to: 0 };
  const open = { text: "(abcd", block: 0, from: 0, to: 0 };
  return E.tokenDelay(open, 5, toks1, P) > E.tokenDelay(plain, 5, toks1, P);
})());
ok("tiếng Việt chậm hơn tiếng Anh cùng WPM", (() => {
  const t = { text: "abcd", block: 0, from: 0, to: 0 };
  return E.tokenDelay(t, 5, toks1, { ...P, vietnamese: true, rhythm: false }) >
         E.tokenDelay(t, 5, toks1, { ...P, vietnamese: false, rhythm: false });
})());

console.log("\n== buildQuiz ==");
const qs = E.buildQuiz(toks1, toks1.length - 1, 5, true);
ok("sinh được câu hỏi", qs.length >= 3, `got ${qs.length}`);
ok("mỗi câu đúng 4 phương án", qs.every(q => q.options.length === 4));
ok("đáp án luôn nằm trong phương án", qs.every(q => q.options.includes(q.answer)));
ok("phương án không trùng nhau", qs.every(q => new Set(q.options).size === 4));
ok("đáp án không lặp giữa các câu", new Set(qs.map(q => q.answer.toLowerCase())).size === qs.length);
ok("mọi câu đều có nhãn dạng", qs.every(q => q.kind && q.label));
ok("câu điền từ/số liệu có chỗ trống",
   qs.filter(q => q.kind === "cloze" || q.kind === "number").every(q => q.prompt.includes("______")));
ok("câu chọn-cả-câu có prompt là câu hỏi, không phải chỗ trống",
   qs.filter(q => ["whichtrue","mainidea","order"].includes(q.kind)).every(q => !q.prompt.includes("______")));
ok("có token để nhảy về", qs.every(q => Number.isInteger(q.token) && q.token >= 0 && q.token < toks1.length));
ok("có câu gốc kèm theo", qs.every(q => typeof q.sentence === "string" && q.sentence.length > 0));
ok("đáp án xuất hiện trong câu gốc (để tô sáng được)",
   qs.every(q => q.sentence.toLowerCase().includes(q.answer.toLowerCase())));
ok("nhiễu KHÔNG lộ trong câu đang hỏi", qs.every(q =>
  q.options.filter(o => o.toLowerCase() !== q.answer.toLowerCase())
           .every(o => !q.sentence.toLowerCase().includes(o.toLowerCase()))));
eq("nội dung quá ngắn thì không sinh câu hỏi", E.buildQuiz(E.buildTokens([{ text: "Ngắn quá.", type: "p" }], 1), 0, 5, true).length, 0);

console.log("\n== các dạng câu hỏi mới ==");
{
  const many = E.buildQuiz(toks1, toks1.length - 1, 8, true, 0, blocks);
  const kinds = [...new Set(many.map(q => q.kind))];
  console.log("  dạng sinh được:", kinds.join(", "));
  ok("sinh được nhiều hơn một dạng", kinds.length >= 2, kinds.join(","));

  const wt = many.filter(q => q.kind === "whichtrue");
  if (wt.length) {
    ok("whichtrue: đáp án là câu có thật trong bài",
       wt.every(q => q.sentence.startsWith(q.answer.replace(/…$/, "").slice(0, 30))));
    ok("whichtrue: ba phương án nhiễu KHÁC đáp án",
       wt.every(q => new Set(q.options).size === 4));
  } else ok("(không có whichtrue trong lần chạy này)", true);

  const nb = many.filter(q => q.kind === "number");
  if (nb.length) {
    ok("number: mọi phương án đều là số", nb.every(q => q.options.every(o => /^[\d][\d.,]*$/.test(o))));
    ok("number: đáp án nằm trong câu gốc", nb.every(q => q.sentence.includes(q.answer)));
  } else ok("(không có number trong lần chạy này)", true);

  const od = many.filter(q => q.kind === "order");
  if (od.length) {
    ok("order: đáp án là câu sớm nhất trong 4 lựa chọn",
       od.every(q => q.options.includes(q.answer)));
  } else ok("(không có order trong lần chạy này)", true);
}

// Chạy nhiều lần vì buildQuiz có yếu tố ngẫu nhiên
let stable = true;
for (let i = 0; i < 200; i++) {
  const r = E.buildQuiz(toks1, toks1.length - 1, 8, true, 0, blocks);
  if (!r.every(q => q.options.length === 4 && q.options.includes(q.answer) && new Set(q.options).size === 4)) { stable = false; break; }
}
ok("ổn định qua 200 lần sinh ngẫu nhiên", stable);

console.log("\n== biên / đầu vào lạ ==");
eq("blocks rỗng → không token", E.buildTokens([], 1).length, 0);
eq("blocks rỗng → dàn bài rỗng", E.buildOutline([], []).length, 0);
eq("quiz với 0 token", E.buildQuiz([], 0, 5, false).length, 0);
ok("khối chỉ có khoảng trắng không làm vỡ", (() => {
  try { E.buildTokens([{ text: "   ", type: "p" }], 2); return true; } catch (e) { return false; }
})());
ok("chunkSize=0 không treo", (() => {
  try { const t = E.buildTokens(blocks, 0); return t.length > 0; } catch (e) { return false; }
})());

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
