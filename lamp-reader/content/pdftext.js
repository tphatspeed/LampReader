// Lamp — pdftext.js  (ES module, thuần logic, không đụng DOM)
//
// Dựng lại văn bản có cấu trúc từ các mảnh chữ rời rạc mà pdf.js trả về.
// Tách khỏi viewer.js để kiểm thử được bằng file PDF thật.
//
// PDF không lưu "đoạn văn" hay "tiêu đề" — nó chỉ lưu từng mẩu chữ kèm toạ độ
// và cỡ chữ. Muốn đọc bằng RSVP cho ra hồn thì phải suy ngược lại cấu trúc:
//   1. gom mẩu chữ thành DÒNG theo toạ độ y
//   2. phát hiện CỘT (bài báo khoa học hai cột) rồi đọc hết cột trái mới sang phải
//   3. bỏ số trang và header/footer lặp
//   4. ghép dòng thành ĐOẠN, cắt đoạn theo khoảng trắng dọc và cỡ chữ
//   5. nhận ra TIÊU ĐỀ bằng cỡ chữ thật, không đoán theo độ dài chuỗi

const Y_TOL = 2.5;        // hai mẩu chữ lệch nhau dưới ngần này coi như cùng dòng
const HEAD_RATIO = 1.12;  // cỡ chữ lớn hơn thân bài ngần này lần thì là tiêu đề

// ---------- 1. Mẩu chữ → dòng ----------

export function itemsToLines(items) {
  const lines = [];
  for (const it of items) {
    if (typeof it.str !== "string" || !it.str.trim()) continue;
    const tr = it.transform || [1, 0, 0, 1, 0, 0];
    const x = tr[4], y = tr[5];
    // Cỡ chữ = hệ số phóng đại theo trục dọc của ma trận chữ. item.height đôi
    // khi bằng 0 với một số bộ sinh PDF nên không tin được một mình nó.
    const size = Math.abs(tr[3]) || it.height || 0;
    const w = it.width || 0;

    const line = lines.find((l) => Math.abs(l.y - y) <= Y_TOL);
    if (line) {
      line.parts.push({ x, str: it.str, w });
      line.x0 = Math.min(line.x0, x);
      line.x1 = Math.max(line.x1, x + w);
      line.size = Math.max(line.size, size);
    } else {
      lines.push({ y, x0: x, x1: x + w, size, parts: [{ x, str: it.str, w }] });
    }
  }
  // Cùng độ cao y CHƯA CHẮC là cùng một dòng: trang hai cột có chữ của cột trái
  // và cột phải nằm ngang nhau. Gộp chúng lại sẽ ra thứ tự đọc đan xen vô nghĩa.
  // Nên cắt tiếp theo khoảng hở NGANG: hở rộng bất thường = sang cột khác.
  const out = [];
  for (const l of lines) {
    l.parts.sort((a, b) => a.x - b.x);
    const gapLimit = Math.max(l.size * 2.5, 24);
    let run = [];
    const flushRun = () => {
      if (!run.length) return;
      let text = "";
      let prevEnd = null;
      for (const p of run) {
        if (prevEnd !== null && p.x - prevEnd > l.size * 0.18 && !/\s$/.test(text)) text += " ";
        text += p.str;
        prevEnd = p.x + p.w;
      }
      text = text.replace(/\s+/g, " ").trim();
      if (text) out.push({
        y: l.y, size: l.size, text,
        x0: run[0].x, x1: run[run.length - 1].x + run[run.length - 1].w
      });
      run = [];
    };
    let prevEnd = null;
    for (const p of l.parts) {
      if (prevEnd !== null && p.x - prevEnd > gapLimit) flushRun();
      run.push(p);
      prevEnd = p.x + p.w;
    }
    flushRun();
  }
  // Sắp theo y giảm dần (trên xuống), cùng y thì trái trước
  return out.sort((a, b) => (b.y - a.y) || (a.x0 - b.x0));
}

// ---------- 2. Phát hiện cột ----------

// Tìm một "rãnh" dọc mà không dòng nào bắc ngang qua. Có rãnh nghĩa là trang
// chia cột — phải đọc hết cột trái rồi mới sang cột phải, nếu không thứ tự chữ
// sẽ đan xen thành vô nghĩa.
export function splitColumns(lines, pageWidth) {
  if (lines.length < 6) return [lines];
  const mid = pageWidth / 2;
  const spanMid = lines.filter((l) => l.x0 < mid - 10 && l.x1 > mid + 10);
  // Nhiều dòng bắc ngang giữa trang → đây là một cột duy nhất
  if (spanMid.length > lines.length * 0.15) return [lines];

  const left = lines.filter((l) => l.x1 <= mid + 10 && !spanMid.includes(l));
  const right = lines.filter((l) => l.x0 >= mid - 10 && !spanMid.includes(l));
  if (left.length < 3 || right.length < 3) return [lines];

  // Dòng bắc ngang (tiêu đề trải hết chiều rộng) giữ nguyên vị trí theo y,
  // rồi mới tới cột trái, cột phải.
  return [spanMid, left, right].filter((c) => c.length);
}

// ---------- 3. Bỏ số trang và header/footer ----------

const isPageNumber = (t) =>
  /^[\divxlcDIVXLC–—\-—.\s]{1,12}$/.test(t) && /\d|[ivxlcIVXLC]/.test(t);

export function stripFurniture(lines, pageHeight) {
  const topEdge = pageHeight * 0.92;   // y lớn = gần đỉnh trang
  const botEdge = pageHeight * 0.08;
  return lines.filter((l) => {
    const atEdge = l.y >= topEdge || l.y <= botEdge;
    if (atEdge && isPageNumber(l.text)) return false;
    if (atEdge && l.text.length <= 3) return false;
    return true;
  });
}

// Header/footer lặp: so khớp sau khi thay mọi chữ số bằng #, để "Trang 1" và
// "Trang 2" được coi là cùng một thứ. Bản cũ so nguyên văn nên không bao giờ
// bắt được, và còn đòi tối thiểu 4 trang.
export function dropRepeatedLines(pages) {
  if (pages.length < 2) return pages;
  const norm = (t) => t.replace(/\d+/g, "#").slice(0, 60);
  const count = new Map();
  pages.forEach((lines) => {
    new Set(lines.map((l) => norm(l.text))).forEach((k) =>
      count.set(k, (count.get(k) || 0) + 1));
  });
  const threshold = Math.max(2, Math.ceil(pages.length * 0.5));
  return pages.map((lines) =>
    lines.filter((l) => (count.get(norm(l.text)) || 0) < threshold));
}

// ---------- 4+5. Dòng → khối có cấu trúc ----------

function median(xs) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

export function linesToBlocks(lines) {
  if (!lines.length) return [];

  // Khoảng cách dòng thường gặp — dùng làm mốc để biết thế nào là "cách xa"
  const gaps = [];
  for (let i = 1; i < lines.length; i++) {
    const g = lines[i - 1].y - lines[i].y;
    if (g > 0 && g < 100) gaps.push(g);
  }
  const normGap = median(gaps) || 14;
  const colRight = Math.max(...lines.map((l) => l.x1));

  const blocks = [];
  let buf = null;
  const flush = () => { if (buf && buf.text.trim()) blocks.push(buf); buf = null; };

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const prev = lines[i - 1];
    let brk = !buf;

    if (buf && prev) {
      const gap = prev.y - l.y;
      if (gap > normGap * 1.5) brk = true;                       // cách xa hẳn
      if (Math.abs(l.size - buf.size) > 0.8) brk = true;          // đổi cỡ chữ
      if (l.x0 > buf.x0 + l.size * 0.9) brk = true;               // thụt đầu dòng
      // Dòng trước kết thúc bằng dấu câu VÀ ngắn hơn hẳn bề rộng cột → hết đoạn.
      // Bản cũ cắt đoạn ở MỌI dòng kết thúc bằng dấu câu, nên một đoạn văn bị
      // băm thành từng câu rời rạc.
      if (/[.!?][")\]]?$/.test(prev.text) && prev.x1 < colRight - l.size * 2) brk = true;
    }

    if (brk) { flush(); buf = { text: "", size: l.size, x0: l.x0 }; }

    // Nối từ bị gạch nối cuối dòng
    if (buf.text.endsWith("-")) buf.text = buf.text.slice(0, -1) + l.text;
    else buf.text = buf.text ? buf.text + " " + l.text : l.text;
    buf.size = Math.max(buf.size, l.size);
  }
  flush();
  blocks.forEach((b) => delete b.x0);
  return blocks;   // chưa phân loại — xem classify()
}

// Phân loại tiêu đề/đoạn văn.
//
// Phải làm trên TOÀN tài liệu chứ không trong từng nhóm dòng: một tiêu đề trải
// ngang trang hai cột nằm một mình trong nhóm của nó, nên nếu lấy trung vị cỡ
// chữ ngay trong nhóm thì "cỡ thân bài" chính là cỡ tiêu đề, và nó không bao
// giờ được nhận là tiêu đề.
export function classify(blocks) {
  if (!blocks.length) return blocks;
  // Trung vị có trọng số theo độ dài: đoạn văn dài quyết định cỡ chữ thân bài,
  // vài dòng tiêu đề ngắn không kéo lệch được.
  const weighted = [];
  blocks.forEach((b) => {
    const n = Math.max(1, Math.round(b.text.length / 40));
    for (let i = 0; i < n; i++) weighted.push(b.size);
  });
  const bodySize = median(weighted) || 11;

  const headSizes = [...new Set(blocks.filter((b) => b.size > bodySize * HEAD_RATIO)
    .map((b) => Math.round(b.size)))].sort((a, b) => b - a);

  for (const b of blocks) {
    const isHead = b.size > bodySize * HEAD_RATIO && b.text.length < 200;
    const rank = headSizes.indexOf(Math.round(b.size));
    b.type = isHead ? "h" : "p";
    b.heading = isHead;
    b.level = isHead ? Math.min(rank + 1, 6) : 0;
  }
  return blocks;
}

// ---------- Đầu vào chính ----------

export function pagesToBlocks(pages) {
  // pages: [{ items, width, height }]
  let perPage = pages.map((p) => stripFurniture(itemsToLines(p.items), p.height || 792));
  perPage = dropRepeatedLines(perPage);

  const blocks = [];
  perPage.forEach((lines, i) => {
    const w = pages[i].width || 612;
    for (const col of splitColumns(lines, w)) {
      blocks.push(...linesToBlocks(col));
    }
  });
  return classify(blocks);
}
