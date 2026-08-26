// Lamp — extractor.js
// Tách nội dung chính của trang khỏi menu, quảng cáo, sidebar, footer,
// đồng thời lấy dàn ý (các tiêu đề) để xem trước cấu trúc bài viết.

(() => {
  if (window.__lampExtractorLoaded) return;
  window.__lampExtractorLoaded = true;

  const NOISE_RE =
    /(^|[\s_-])(comment|footer|nav|sidebar|menu|promo|share|social|related|advert|banner|cookie|subscribe|newsletter|breadcrumb|pagination|widget|toolbar)([\s_-]|$)/i;

  const STRIP_TAGS = [
    "script", "style", "noscript", "svg", "canvas", "iframe",
    "nav", "aside", "footer", "header", "form", "button",
    "figcaption", "video", "audio"
  ];

  const TEXT_TAGS = "p, li, blockquote, h1, h2, h3, h4, pre, dd, td";

  function visible(el) {
    const s = window.getComputedStyle(el);
    return s.display !== "none" && s.visibility !== "hidden" && s.opacity !== "0";
  }

  function scoreNode(node) {
    let textLen = 0;
    node.querySelectorAll(TEXT_TAGS).forEach((el) => {
      const t = (el.innerText || "").trim();
      if (t.length > 25) textLen += t.length;
    });
    if (textLen < 200) return 0;

    const linkLen = Array.from(node.querySelectorAll("a")).reduce(
      (sum, a) => sum + (a.innerText || "").length, 0
    );
    const linkDensity = Math.min(linkLen / textLen, 0.95);
    let score = textLen * (1 - linkDensity);

    const marker = `${node.className || ""} ${node.id || ""}`;
    if (NOISE_RE.test(marker)) score *= 0.15;
    if (/(^|[\s_-])(article|post|content|entry|story|body|main|read)([\s_-]|$)/i.test(marker)) score *= 1.4;
    if (node.tagName === "ARTICLE" || node.tagName === "MAIN") score *= 1.5;
    return score;
  }

  function pickBestContainer() {
    const candidates = Array.from(
      document.querySelectorAll("article, main, [role='main'], section, div")
    ).filter((el) => visible(el) && el.querySelectorAll("p").length >= 2);

    let best = null, bestScore = 0;
    for (const el of candidates) {
      const s = scoreNode(el);
      if (s > bestScore) { bestScore = s; best = el; }
    }
    return best || document.body;
  }

  function cleanClone(node) {
    const clone = node.cloneNode(true);
    STRIP_TAGS.forEach((tag) => clone.querySelectorAll(tag).forEach((el) => el.remove()));
    clone.querySelectorAll("[class],[id]").forEach((el) => {
      const marker = `${el.className || ""} ${el.id || ""}`;
      if (typeof marker === "string" && NOISE_RE.test(marker)) el.remove();
    });
    clone.querySelectorAll("[aria-hidden='true'], [hidden]").forEach((el) => el.remove());
    return clone;
  }

  // Trả về danh sách khối kèm loại, để dựng dàn ý và giữ ranh giới đoạn.
  // QUAN TRỌNG: engine.js (buildOutline) và reader.js (paintBlocksInto) đều
  // phân nhánh theo `type` — thiếu trường này thì dàn bài rỗng và mọi khối
  // đều bị vẽ thành <p>, mất hết tiêu đề trong chế độ Dẫn dòng.
  function blockType(tag) {
    if (/^h[1-4]$/.test(tag)) return "h";
    if (tag === "li" || tag === "dd") return "li";
    return "p";
  }

  function toBlocks(clone) {
    const blocks = [];
    const seen = new Set();
    clone.querySelectorAll(TEXT_TAGS).forEach((el) => {
      const t = (el.innerText || "").replace(/\s+/g, " ").trim();
      if (t.length < 3) return;
      const key = t.slice(0, 80);
      if (seen.has(key)) return;
      seen.add(key);

      const tag = el.tagName.toLowerCase();
      const type = blockType(tag);
      // Tiêu đề quá dài thường là đoạn văn bị gắn nhầm thẻ h — không đưa vào
      // dàn bài để danh sách khỏi loãng.
      const isHeading = type === "h" && t.length < 140;
      blocks.push({
        text: t,
        type: isHeading ? "h" : (type === "h" ? "p" : type),
        heading: isHeading,
        level: isHeading ? parseInt(tag[1], 10) : 0
      });
    });
    return blocks;
  }

  const plainBlock = (t) => ({ text: t.trim(), type: "p", heading: false, level: 0 });

  window.__lampExtract = function extract(forceSelection) {
    // Chỉ ưu tiên đoạn bôi đen khi người dùng chủ động chọn "Đọc nhanh đoạn
    // này bằng Lamp" từ menu chuột phải. Nếu không, Alt+R / nút trong popup
    // luôn đọc toàn trang — kể cả khi trang đang có sẵn một đoạn bôi đen sót
    // lại từ thao tác khác (copy, bôi để xem thử...).
    if (forceSelection) {
      const sel = (window.getSelection()?.toString() || "").trim();
      return {
        title: document.title,
        source: "selection",
        text: sel,
        blocks: sel.split(/\n{2,}/).map(plainBlock).filter((b) => b.text),
        headings: []
      };
    }

    const container = pickBestContainer();
    const clone = cleanClone(container);
    let blocks = toBlocks(clone);
    let text = blocks.map((b) => b.text).join("\n\n");

    if (text.length < 200) {
      text = (document.body.innerText || "").replace(/\n{3,}/g, "\n\n").trim();
      blocks = text.split(/\n{2,}/).map(plainBlock).filter((b) => b.text);
    }

    const headings = blocks
      .filter((b) => b.heading && b.text.length < 140)
      .map((b) => ({ text: b.text, level: b.level }));

    return { title: document.title, source: container.tagName.toLowerCase(), text, blocks, headings };
  };
})();
