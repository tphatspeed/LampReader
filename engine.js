// Lamp — engine.js
// Phần logic thuần: tách token, nhịp đọc, dàn bài, sinh câu hỏi kiểm tra.
// Tách riêng khỏi reader.js để dễ đọc và dễ sửa từng phần.

(() => {
  if (window.__lampEngine) return;

  // ---------- Nhận diện tiếng Việt ----------
  // Tiếng Việt là ngôn ngữ đơn âm tiết: mỗi "từ" cách bởi dấu cách thường chỉ
  // là một âm tiết, trong khi một từ có nghĩa hay gồm 2 âm tiết ("nghiên cứu").
  // Vì vậy cùng một mức WPM, tiếng Việt trôi nhanh hơn tiếng Anh về mặt ý.
  const VI_RE = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

  function detectVietnamese(text) {
    const sample = text.slice(0, 4000);
    const hits = (sample.match(new RegExp(VI_RE.source, "gi")) || []).length;
    return hits / Math.max(1, sample.length) > 0.02;
  }

  const CLAUSE_END = /[.!?…]["')\]]?$/;
  const SOFT_BREAK = /[,;:—–]$/;

  // ---------- Token ----------
  // Mỗi token giữ lại vị trí gốc (khối nào, từ thứ mấy) để chế độ dẫn dòng
  // biết cần tô sáng chỗ nào trong văn bản đầy đủ.
  function buildTokens(blocks, chunkSize) {
    const tokens = [];
    blocks.forEach((block, bi) => {
      const words = block.text.split(/\s+/).filter(Boolean);
      let buf = [];
      let from = 0;
      words.forEach((w, wi) => {
        if (!buf.length) from = wi;
        buf.push(w);
        const last = wi === words.length - 1;
        // Không cho một cụm vắt qua ranh giới câu: não cần mốc cuối câu
        // để tổng hợp nghĩa, ghép "…hết. Câu mới…" vào một khung sẽ phá mốc đó.
        if (buf.length >= chunkSize || CLAUSE_END.test(w) || last) {
          tokens.push({ text: buf.join(" "), block: bi, from, to: wi });
          buf = [];
        }
      });
    });
    return tokens;
  }

  // ---------- Nhịp ----------
  function tokenDelay(token, i, tokens, opts) {
    const { wpm, rhythm, warmup, vietnamese } = opts;

    let rate = wpm;
    if (warmup && i < 40) rate = wpm * (0.65 + 0.35 * (i / 40));
    // Âm tiết tiếng Việt ngắn hơn từ tiếng Anh, giữ nguyên WPM sẽ thành quá nhanh
    if (vietnamese) rate *= 0.85;

    const wordCount = token.text.split(" ").length;
    let ms = (60000 / rate) * wordCount;

    if (rhythm) {
      if (CLAUSE_END.test(token.text)) {
        // Thời gian "tổng hợp cuối câu" — câu càng dài càng cần lâu
        let len = 1;
        for (let j = i - 1; j >= 0 && !CLAUSE_END.test(tokens[j].text); j--) len++;
        ms *= 2.0 + Math.min(1.4, len / 18);
      } else if (SOFT_BREAK.test(token.text)) {
        ms *= 1.5;
      }
    }

    if (token.text.length > 9 * wordCount) ms *= 1.15;
    return ms;
  }

  function sentenceStart(tokens, from) {
    for (let i = from - 1; i >= 0; i--) if (CLAUSE_END.test(tokens[i].text)) return i + 1;
    return 0;
  }
  function sentenceNext(tokens, from) {
    for (let i = from; i < tokens.length; i++) {
      if (CLAUSE_END.test(tokens[i].text)) return Math.min(i + 1, tokens.length - 1);
    }
    return tokens.length - 1;
  }

  // ---------- Dàn bài ----------
  function buildOutline(blocks, tokens) {
    // Token đầu tiên của mỗi khối, để bấm vào mục là nhảy tới đúng chỗ
    const firstToken = new Map();
    tokens.forEach((t, i) => {
      if (!firstToken.has(t.block)) firstToken.set(t.block, i);
    });

    const items = [];
    blocks.forEach((b, bi) => {
      if (b.type !== "h") return;
      items.push({ text: b.text, block: bi, token: firstToken.get(bi) ?? 0 });
    });
    return items;
  }

  // ---------- Câu hỏi kiểm tra ----------
  // Sinh tại chỗ, không cần mạng: khoét một từ nội dung khỏi câu vừa đọc
  // rồi lấy 3 phương án nhiễu là các từ khác cùng độ dài trong bài.
  const STOP = new Set(("và là của có được cho những các một trong với khi này đó thì mà nhưng " +
    "để từ như về vì nên hay hoặc cũng đã sẽ đang rất nhiều ít không phải bị bởi tại trên dưới " +
    "the a an and or but of to in on for with that this these those is are was were be been " +
    "have has had will would can could should may might do does did not it its as at by from"
  ).split(/\s+/));

  const clean = (w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

  function isContentWord(w) {
    const c = clean(w);
    return c.length >= 4 && !STOP.has(c.toLowerCase()) && /\p{L}/u.test(c);
  }

  function buildQuiz(tokens, upTo, count = 5, vietnamese = false) {
    const read = tokens.slice(0, Math.max(1, upTo + 1)).map((t) => t.text);
    const fullText = read.join(" ");

    const sentences = fullText
      .split(/(?<=[.!?…])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.split(/\s+/).length >= 9 && s.split(/\s+/).length <= 45);

    if (sentences.length < 3) return [];

    // Kho từ nhiễu lấy từ toàn bài
    const words0 = fullText.split(/\s+/);
    const single = words0.filter(isContentWord).map(clean);
    const pairs = vietnamese
      ? words0.reduce((acc, w, i) => {
          const nxt = words0[i + 1];
          if (isContentWord(w) && nxt && isContentWord(nxt)) acc.push(clean(w) + " " + clean(nxt));
          return acc;
        }, [])
      : [];
    const pool = [...new Set(vietnamese ? pairs.concat(single) : single)];
    if (pool.length < 12) return [];

    // Rải câu hỏi đều khắp phần đã đọc thay vì dồn một chỗ
    const picked = [];
    const gap = Math.max(1, Math.floor(sentences.length / count));
    for (let i = 0; i < sentences.length && picked.length < count; i += gap) {
      picked.push(sentences[i]);
    }

    const questions = [];
    picked.forEach((sentence, qi) => {
      const words = sentence.split(/\s+/);
      const candidates = words
        .map((w, i) => ({ w, i }))
        .filter(({ w }) => isContentWord(w));
      if (!candidates.length) return;

      const target = candidates[Math.floor(candidates.length / 2)];

      // Tiếng Việt là ngôn ngữ đơn âm tiết: khoét một "từ" cách bởi dấu cách
      // thường chỉ xoá nửa của một từ ghép ("trực" trong "trực quan"), khiến
      // câu hỏi vừa dễ vừa kỳ. Với tiếng Việt ta khoét cả cụm hai âm tiết.
      let span = 1;
      if (vietnamese) {
        const nxt = words[target.i + 1];
        if (nxt && isContentWord(nxt)) span = 2;
      }

      const answer = words
        .slice(target.i, target.i + span)
        .map(clean)
        .join(" ");

      const distractors = pool
        .filter((w) => w !== answer && Math.abs(w.length - answer.length) <= 4)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      if (distractors.length < 3) return;

      const blanked = words
        .map((w, i) => {
          if (i === target.i) return "______";
          if (i > target.i && i < target.i + span) return null;
          return w;
        })
        .filter((w) => w !== null)
        .join(" ");

      questions.push({
        id: "q" + qi,
        prompt: blanked,
        answer,
        options: [answer, ...distractors].sort(() => Math.random() - 0.5)
      });
    });

    return questions;
  }

  window.__lampEngine = {
    detectVietnamese,
    buildTokens,
    tokenDelay,
    sentenceStart,
    sentenceNext,
    buildOutline,
    buildQuiz,
    CLAUSE_END
  };
})();
