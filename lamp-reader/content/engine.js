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
  // Từ mở đầu hoặc kết thúc một đoạn trong ngoặc/ngoặc kép — chỉ bắt dấu ở
  // đúng đầu/cuối token (không bắt nháy đơn giữa từ như "don't") để tránh
  // làm chậm nhầm các từ viết tắt bình thường.
  const ASIDE_MARK = /^[([{“‘«]|[)\]}”’»]$/;

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
    const { wpm, rhythm, warmup, vietnamese, shortWords } = opts;

    let rate = wpm;
    if (warmup && i < 40) rate = wpm * (0.65 + 0.35 * (i / 40));
    // Âm tiết tiếng Việt ngắn hơn từ tiếng Anh, giữ nguyên WPM sẽ thành quá nhanh
    if (vietnamese) rate *= 0.85;

    const wordCount = token.text.split(" ").length;
    let ms = (60000 / rate) * wordCount;

    // Từ đệm (và, của, là...) mang ít thông tin — cho lướt qua nhanh hơn thay
    // vì buộc mắt dừng lại bằng đúng thời lượng một từ có nghĩa.
    if (shortWords && wordCount === 1 && STOP.has(clean(token.text).toLowerCase())) {
      ms *= 0.6;
    }

    if (rhythm) {
      if (CLAUSE_END.test(token.text)) {
        // Thời gian "tổng hợp cuối câu" — câu càng dài càng cần lâu
        let len = 1;
        for (let j = i - 1; j >= 0 && !CLAUSE_END.test(tokens[j].text); j--) len++;
        ms *= 2.0 + Math.min(1.4, len / 18);
      } else if (SOFT_BREAK.test(token.text)) {
        ms *= 1.5;
      } else if (ASIDE_MARK.test(token.text)) {
        // Vào/ra khỏi phần trong ngoặc hay trích dẫn — cho mắt một nhịp để
        // nhận ra đây là phần chú thích/trích, không phải mạch câu chính.
        ms *= 1.3;
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
    const read = tokens.slice(0, Math.max(1, upTo + 1));

    // Gom theo token thay vì tách chuỗi phẳng, để giữ lại vị trí token đầu
    // câu — cần cho nút "Xem lại đoạn này" khi ôn câu trả lời sai.
    const sentences = [];
    let buf = [], startIdx = 0;
    read.forEach((t, i) => {
      if (!buf.length) startIdx = i;
      buf.push(t);
      if (CLAUSE_END.test(t.text) || i === read.length - 1) {
        const text = buf.map((x) => x.text).join(" ");
        const words = text.split(/\s+/);
        if (words.length >= 9 && words.length <= 45) sentences.push({ text, words, token: startIdx });
        buf = [];
      }
    });
    if (sentences.length < 3) return [];

    // Kho từ nhiễu lấy từ toàn bài
    const fullText = read.map((t) => t.text).join(" ");
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

    // Từ càng hiếm trong bài càng đáng làm đáp án — khoét từ lặp đi lặp lại
    // nhiều lần chỉ kiểm tra trí nhớ mặt chữ, không kiểm tra đã nắm ý chưa.
    const freq = {};
    single.forEach((w) => { const k = w.toLowerCase(); freq[k] = (freq[k] || 0) + 1; });

    // Rải câu hỏi đều khắp phần đã đọc thay vì dồn một chỗ
    const picked = [];
    const gap = Math.max(1, Math.floor(sentences.length / count));
    for (let i = 0; i < sentences.length && picked.length < count; i += gap) {
      picked.push(sentences[i]);
    }

    const used = new Set(); // tránh khoét cùng một từ ở hai câu hỏi khác nhau
    const questions = [];
    picked.forEach((sentence, qi) => {
      const { words, token } = sentence;
      const candidates = words
        .map((w, i) => ({ w, i }))
        .filter(({ w }) => isContentWord(w));
      if (!candidates.length) return;

      // Ưu tiên ứng viên nằm giữa câu (tránh từ mở/kết câu, thường ít mang ý
      // chính), trong số đó chọn từ hiếm nhất trong toàn bài
      const lo = Math.floor(words.length * 0.2), hi = Math.ceil(words.length * 0.8);
      const central = candidates.filter((c) => c.i >= lo && c.i <= hi);
      const ranked = (central.length ? central : candidates).slice().sort(
        (a, b) => (freq[clean(a.w).toLowerCase()] || 1) - (freq[clean(b.w).toLowerCase()] || 1)
      );
      const target = ranked.find((c) => !used.has(clean(c.w).toLowerCase()));
      if (!target) return;

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
      if (used.has(answer.toLowerCase())) return;

      // Nhiễu: cùng độ dài, KHÔNG xuất hiện trong chính câu đang hỏi (kẻo
      // vừa gây rối vừa vô tình lộ đáp án), và ưu tiên cùng kiểu viết hoa
      // với đáp án — để bốn phương án nhìn tự nhiên như nhau
      const sentenceLower = sentence.text.toLowerCase();
      const answerCapitalized = /^[A-ZÀ-Ỹ]/.test(answer);
      const candidatesPool = pool.filter((w) => {
        if (w.toLowerCase() === answer.toLowerCase()) return false;
        if (Math.abs(w.length - answer.length) > 4) return false;
        if (sentenceLower.includes(w.toLowerCase())) return false;
        return true;
      });
      candidatesPool.sort((a, b) => {
        const capA = /^[A-ZÀ-Ỹ]/.test(a) === answerCapitalized ? 0 : 1;
        const capB = /^[A-ZÀ-Ỹ]/.test(b) === answerCapitalized ? 0 : 1;
        return capA - capB || Math.abs(a.length - answer.length) - Math.abs(b.length - answer.length);
      });
      const distractors = candidatesPool.slice(0, 8).sort(() => Math.random() - 0.5).slice(0, 3);
      if (distractors.length < 3) return;

      used.add(answer.toLowerCase());

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
        options: [answer, ...distractors].sort(() => Math.random() - 0.5),
        token,
        sentence: sentence.text
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
