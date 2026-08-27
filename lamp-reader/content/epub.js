// Lamp — epub.js
// Đọc file EPUB mà KHÔNG nhúng thư viện ngoài.
//
// EPUB thực chất chỉ là một file ZIP chứa XHTML. Trình duyệt đã có sẵn
// DecompressionStream("deflate-raw") — đúng thuật toán mà ZIP dùng — nên chỉ
// còn phải tự đọc phần bảng thư mục của ZIP, chừng trăm dòng, thay vì kéo
// thêm một thư viện vài trăm KB vào extension.
//
// Luồng: ZIP → META-INF/container.xml → file .opf → spine → từng file XHTML
//        → danh sách khối {type, text} đúng định dạng mà engine.js cần.

(() => {
  if (window.__lampEpub) return;

  // ---------- Đọc ZIP ----------

  const SIG_EOCD = 0x06054b50;   // End Of Central Directory
  const SIG_CEN  = 0x02014b50;   // Central directory entry
  const SIG_LOC  = 0x04034b50;   // Local file header

  function findEOCD(view) {
    // EOCD nằm ở cuối file, sau nó tối đa 65535 byte comment
    const max = Math.min(view.byteLength, 65557);
    for (let i = view.byteLength - 22; i >= view.byteLength - max; i--) {
      if (i < 0) break;
      if (view.getUint32(i, true) === SIG_EOCD) return i;
    }
    return -1;
  }

  function readEntries(buf) {
    const view = new DataView(buf);
    const eocd = findEOCD(view);
    if (eocd < 0) throw new Error("Không phải file ZIP hợp lệ (thiếu EOCD)");

    const count = view.getUint16(eocd + 10, true);
    let p = view.getUint32(eocd + 16, true);

    const dec = new TextDecoder("utf-8");
    const entries = new Map();
    for (let i = 0; i < count; i++) {
      if (view.getUint32(p, true) !== SIG_CEN) break;
      const method = view.getUint16(p + 10, true);
      const compSize = view.getUint32(p + 20, true);
      const rawSize = view.getUint32(p + 24, true);
      const nameLen = view.getUint16(p + 28, true);
      const extraLen = view.getUint16(p + 30, true);
      const cmtLen = view.getUint16(p + 32, true);
      const localOff = view.getUint32(p + 42, true);
      const name = dec.decode(new Uint8Array(buf, p + 46, nameLen));
      entries.set(name, { method, compSize, rawSize, localOff });
      p += 46 + nameLen + extraLen + cmtLen;
    }
    return { entries, view };
  }

  async function inflateRaw(bytes) {
    const stream = new Blob([bytes]).stream()
      .pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function readFile(zip, buf, name) {
    const e = zip.entries.get(name);
    if (!e) return null;
    // Độ dài tên/extra ở local header có thể khác central directory, phải đọc lại
    if (zip.view.getUint32(e.localOff, true) !== SIG_LOC) return null;
    const nameLen = zip.view.getUint16(e.localOff + 26, true);
    const extraLen = zip.view.getUint16(e.localOff + 28, true);
    const start = e.localOff + 30 + nameLen + extraLen;
    const raw = new Uint8Array(buf, start, e.compSize);
    if (e.method === 0) return raw;            // lưu nguyên, không nén
    if (e.method === 8) return inflateRaw(raw); // deflate
    throw new Error("Kiểu nén ZIP chưa hỗ trợ: " + e.method);
  }

  const decodeText = (bytes) => new TextDecoder("utf-8").decode(bytes);

  // ---------- Đường dẫn trong ZIP ----------

  function resolvePath(base, rel) {
    if (/^[a-z]+:/i.test(rel)) return rel;
    const parts = (base ? base.split("/").slice(0, -1) : []).concat(rel.split("/"));
    const out = [];
    for (const seg of parts) {
      if (!seg || seg === ".") continue;
      if (seg === "..") out.pop();
      else out.push(seg);
    }
    return out.join("/");
  }

  // ---------- Bóc chữ từ XHTML ----------

  const TEXT_TAGS = "p, li, blockquote, h1, h2, h3, h4, h5, h6, dd, td, pre";
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG"]);
  // Chú thích cuối trang / chú thích bên lề: đúng chỗ của chúng là ngoài mạch
  // đọc. Để nguyên thì đang đọc giữa chừng bị chen một đoạn không liên quan.
  const ASIDE_SEL = 'aside[epub\\:type~="footnote"], aside[epub\\:type~="endnote"], ' +
    'aside[epub\\:type~="rearnote"], [role="doc-footnote"], [role="doc-endnote"], ' +
    '.footnote, .footnotes, .endnote';
  // Số tham chiếu chú thích ("…câu văn¹ tiếp theo") — bỏ luôn cái số, giữ câu
  const NOTEREF_SEL = '[epub\\:type~="noteref"], [role="doc-noteref"], sup a, a.noteref';

  function blockTypeOf(tag) {
    if (/^h[1-6]$/.test(tag)) return "h";
    if (tag === "li" || tag === "dd") return "li";
    return "p";
  }

  function xhtmlToBlocks(html, seen) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script, style, noscript").forEach((el) => el.remove());
    const safeRemove = (sel) => {
      try { doc.querySelectorAll(sel).forEach((el) => el.remove()); } catch (e) {}
    };
    safeRemove(ASIDE_SEL);
    safeRemove(NOTEREF_SEL);
    // <br> là ngắt dòng thật (thơ, địa chỉ). textContent nuốt mất nó khiến hai
    // dòng dính liền thành một từ ghép sai — thay bằng khoảng trắng trước.
    doc.querySelectorAll("br").forEach((el) => el.replaceWith(doc.createTextNode(" \u2028 ")));
    const blocks = [];
    doc.querySelectorAll(TEXT_TAGS).forEach((el) => {
      if (SKIP.has(el.tagName)) return;
      // Bỏ khối lồng nhau: <li> chứa <p> thì chỉ lấy <p>, tránh chữ lặp hai lần
      if (el.querySelector(TEXT_TAGS)) return;
      const raw = (el.textContent || "").replace(/[ \t\r\n]+/g, " ").trim();
      const text = raw.replace(/\s*\u2028\s*/g, " / ").trim();
      if (text.length < 2) return;
      const key = text.slice(0, 80);
      if (seen.has(key)) return;
      seen.add(key);
      const tag = el.tagName.toLowerCase();
      const type = blockTypeOf(tag);
      const isHeading = type === "h" && text.length < 140;
      blocks.push({
        text,
        type: isHeading ? "h" : (type === "h" ? "p" : type),
        heading: isHeading,
        level: isHeading ? parseInt(tag[1], 10) : 0
      });
    });
    return blocks;
  }

  // ---------- Đầu vào chính ----------

  async function parse(buf, onProgress) {
    const zip = readEntries(buf);

    // 0. EPUB có DRM: chữ bên trong đã bị mã hoá, giải nén ra cũng chỉ là rác.
    //    Báo đúng lý do thay vì để người dùng nhận một lỗi khó hiểu.
    if (zip.entries.has("META-INF/encryption.xml")) {
      throw new Error("Sách này có khoá bản quyền (DRM) nên không đọc được chữ bên trong");
    }

    // 1. container.xml chỉ ra file .opf nằm đâu
    const containerRaw = await readFile(zip, buf, "META-INF/container.xml");
    if (!containerRaw) throw new Error("Thiếu META-INF/container.xml — file này không phải EPUB");
    const container = new DOMParser().parseFromString(decodeText(containerRaw), "text/xml");
    const rootEl = container.querySelector("rootfile");
    const opfPath = rootEl && rootEl.getAttribute("full-path");
    if (!opfPath) throw new Error("container.xml không chỉ ra file OPF");

    // 2. OPF: tên sách + thứ tự các chương (spine)
    const opfRaw = await readFile(zip, buf, opfPath);
    if (!opfRaw) throw new Error("Không đọc được file OPF: " + opfPath);
    const opf = new DOMParser().parseFromString(decodeText(opfRaw), "text/xml");

    let title = "";
    const titleEl = opf.getElementsByTagName("dc:title")[0] ||
                    opf.getElementsByTagName("title")[0];
    if (titleEl) title = (titleEl.textContent || "").trim();

    // Ngôn ngữ khai trong OPF đáng tin hơn việc đoán qua dấu thanh — sách tiếng
    // Việt mà chương đầu toàn tên riêng nước ngoài thì đoán dễ trượt.
    const langEl = opf.getElementsByTagName("dc:language")[0] ||
                   opf.getElementsByTagName("language")[0];
    const lang = langEl ? (langEl.textContent || "").trim().toLowerCase() : "";

    const hrefById = new Map();
    Array.from(opf.getElementsByTagName("item")).forEach((it) => {
      const id = it.getAttribute("id");
      const href = it.getAttribute("href");
      const type = it.getAttribute("media-type") || "";
      if (id && href && /html|xml/.test(type)) hrefById.set(id, href);
    });

    const spine = Array.from(opf.getElementsByTagName("itemref"))
      .map((r) => r.getAttribute("idref"))
      .map((id) => hrefById.get(id))
      .filter(Boolean)
      .map((href) => resolvePath(opfPath, href));

    if (!spine.length) throw new Error("EPUB không có chương nào đọc được");

    // 3. Bóc chữ từng chương theo đúng thứ tự spine
    const seen = new Set();
    let blocks = [];
    for (let i = 0; i < spine.length; i++) {
      if (onProgress) onProgress(i + 1, spine.length);
      let bytes;
      try { bytes = await readFile(zip, buf, spine[i]); } catch (e) { bytes = null; }
      if (!bytes) continue;
      blocks = blocks.concat(xhtmlToBlocks(decodeText(bytes), seen));
    }

    if (!blocks.length) throw new Error("Không bóc được chữ nào từ EPUB này");
    return { title, lang, blocks, chapters: spine.length };
  }

  window.__lampEpub = { parse };
})();
