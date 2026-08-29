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
  const CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/;

  function detectVietnamese(text) {
    const sample = text.slice(0, 4000);
    const hits = (sample.match(new RegExp(VI_RE.source, "gi")) || []).length;
    return hits / Math.max(1, sample.length) > 0.02;
  }

  // ---------- Hồ sơ theo NGÔN NGỮ CỦA NỘI DUNG ----------
  // Khác hẳn ngôn ngữ giao diện: bài tiếng Anh đọc trong giao diện tiếng Việt
  // vẫn phải chạy theo nhịp tiếng Anh. Trước đây chỉ có cờ nhị phân
  // "vietnamese hay không", nên mọi thứ không phải tiếng Việt đều bị gom làm
  // một — kể cả tiếng Trung/Nhật vốn không tách từ bằng dấu cách.
  //
  //   pace   : hệ số nhịp. Tiếng Việt đơn âm tiết nên cùng WPM trôi nhanh hơn
  //            về mặt ý → chậm lại 15%. CJK mỗi "từ" là một chữ mang nhiều
  //            nghĩa hơn nữa → chậm hơn nhiều.
  //   cloze  : số đơn vị bị khoét khi sinh câu hỏi điền từ
  //   stop   : từ đệm của riêng ngôn ngữ đó
  //   ttsLang: tiền tố mã giọng đọc nên ưu tiên
  const STOP_VI = ("và là của có được cho những các một trong với khi này đó thì mà nhưng " +
    "để từ như về vì nên hay hoặc cũng đã sẽ đang rất nhiều ít không phải bị bởi tại trên dưới").split(/\s+/);
  const STOP_EN = ("the a an and or but of to in on for with that this these those is are was were " +
    "be been have has had will would can could should may might do does did not it its as at by from").split(/\s+/);

  const PROFILES = {
    vi: { pace: 0.85, cloze: 2, stop: STOP_VI.concat(STOP_EN), ttsLang: "vi" },
    zh: { pace: 0.55, cloze: 1, stop: [], ttsLang: "zh" },
    en: { pace: 1, cloze: 1, stop: STOP_EN, ttsLang: "en" }
  };

  // code: mã ngôn ngữ nguồn khai báo (EPUB có dc:language), có thì tin nó
  function detectLang(text, code) {
    if (code) {
      const c = String(code).toLowerCase();
      if (c.startsWith("vi")) return "vi";
      if (/^(zh|ja|ko)/.test(c)) return "zh";
      return "en";
    }
    if (detectVietnamese(text)) return "vi";
    const sample = text.slice(0, 4000);
    const cjk = (sample.match(new RegExp(CJK_RE.source, "g")) || []).length;
    if (cjk / Math.max(1, sample.length) > 0.15) return "zh";
    return "en";
  }

  const profile = (lang) => PROFILES[lang] || PROFILES.en;

  // Gồm cả dấu câu toàn giác của tiếng Trung/Nhật, nếu không thì cả đoạn
  // văn CJK thành một "câu" duy nhất.
  const CLAUSE_END = /[.!?…。！？]["')\]」』]?$/;
  const SOFT_BREAK = /[,;:—–]$/;
  // Từ mở đầu hoặc kết thúc một đoạn trong ngoặc/ngoặc kép — chỉ bắt dấu ở
  // đúng đầu/cuối token (không bắt nháy đơn giữa từ như "don't") để tránh
  // làm chậm nhầm các từ viết tắt bình thường.
  const ASIDE_MARK = /^[([{“‘«]|[)\]}”’»]$/;

  // ---------- Tách từ ----------
  // Tiếng Trung/Nhật KHÔNG dùng dấu cách để tách từ, nên split(/\s+/) trả về
  // nguyên cả đoạn văn thành một "từ" — RSVP thành vô dụng. Intl.Segmenter là
  // bộ tách từ có sẵn của trình duyệt, dùng đúng việc này.
  //
  // reader.js PHẢI tách y hệt khi dựng chế độ Dẫn dòng, nếu không chỉ số từ sẽ
  // lệch và phần tô sáng nhảy lung tung — nên hàm này được xuất ra dùng chung.
  function splitWords(text, lang) {
    const plain = text.split(/\s+/).filter(Boolean);
    if (lang !== "zh") return plain;
    // Có sẵn dấu cách (văn bản pha tiếng Anh) thì cứ dùng cách thường
    if (plain.length > text.length / 4) return plain;
    try {
      const seg = new Intl.Segmenter("ja", { granularity: "word" });
      const out = [...seg.segment(text)].map((x) => x.segment).filter((x) => x.trim());
      if (out.length) return out;
    } catch (e) { /* trình duyệt cũ — rơi xuống cách dưới */ }
    return text.split("").filter((c) => c.trim());   // dự phòng: từng chữ một
  }

  // ---------- Token ----------
  // Mỗi token giữ lại vị trí gốc (khối nào, từ thứ mấy) để chế độ dẫn dòng
  // biết cần tô sáng chỗ nào trong văn bản đầy đủ.
  function buildTokens(blocks, chunkSize, lang) {
    // CJK viết liền, ghép cụm bằng dấu cách sẽ chèn khoảng trắng không có thật
    const joiner = lang === "zh" ? "" : " ";
    const tokens = [];
    blocks.forEach((block, bi) => {
      const words = splitWords(block.text, lang);
      let buf = [];
      let from = 0;
      words.forEach((w, wi) => {
        if (!buf.length) from = wi;
        buf.push(w);
        const last = wi === words.length - 1;
        // Không cho một cụm vắt qua ranh giới câu: não cần mốc cuối câu
        // để tổng hợp nghĩa, ghép "…hết. Câu mới…" vào một khung sẽ phá mốc đó.
        if (buf.length >= chunkSize || CLAUSE_END.test(w) || last) {
          tokens.push({ text: buf.join(joiner), block: bi, from, to: wi });
          buf = [];
        }
      });
    });
    return tokens;
  }

  // ---------- Nhịp ----------
  function tokenDelay(token, i, tokens, opts) {
    const { wpm, rhythm, warmup, vietnamese, shortWords } = opts;
    // vietnamese giữ lại cho tương thích ngược; ưu tiên opts.lang nếu có
    const P = profile(opts.lang || (vietnamese ? "vi" : "en"));

    let rate = wpm;
    if (warmup && i < 40) rate = wpm * (0.65 + 0.35 * (i / 40));
    // Mỗi ngôn ngữ một mật độ ý trên mỗi "từ" khác nhau — xem PROFILES
    rate *= P.pace;

    const wordCount = token.text.split(" ").length;
    let ms = (60000 / rate) * wordCount;

    // Từ đệm (và, của, là...) mang ít thông tin — cho lướt qua nhanh hơn thay
    // vì buộc mắt dừng lại bằng đúng thời lượng một từ có nghĩa.
    if (shortWords && wordCount === 1 && P.stop.indexOf(clean(token.text).toLowerCase()) >= 0) {
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
      items.push({
        text: b.text,
        block: bi,
        level: b.level || 1,
        token: firstToken.get(bi) ?? 0
      });
    });
    if (!items.length) return items;

    // Chuẩn hoá cấp về 0,1,2… theo thứ tự cấp có thật trong bài — trang dùng
    // h2/h3 và trang dùng h1/h2 phải thụt lề như nhau, không phụ thuộc việc
    // tác giả bắt đầu từ thẻ nào.
    const levels = [...new Set(items.map((i) => i.level))].sort((a, b) => a - b);
    const depthOf = new Map(levels.map((lv, i) => [lv, Math.min(i, 2)]));
    items.forEach((i) => (i.depth = depthOf.get(i.level) || 0));
    return items;
  }

  // ---------- Câu hỏi kiểm tra ----------
  //
  // Sinh hoàn toàn tại chỗ, không gọi mạng. Có NĂM dạng câu hỏi thay vì chỉ
  // điền từ, vì chỉ khoét một từ thì phần lớn câu đoán được bằng ngữ pháp mà
  // không cần nhớ bài — người đọc thấy "dễ và hời hợt" là đúng.
  //
  //   cloze     — điền từ còn thiếu (dạng cũ, đã siết lại phần nhiễu)
  //   number    — điền con số còn thiếu, nhiễu là số bị bóp méo hợp lý
  //   whichtrue — bốn câu gần giống nhau, chọn câu ĐÚNG với bài
  //   mainidea  — mục này nói về điều gì (cần dàn bài)
  //   order     — ý nào được nhắc tới trước nhất
  //
  // Ba dạng sau không thể đoán bằng ngữ pháp: phải thật sự nhớ nội dung.

  const STOP = new Set(STOP_VI.concat(STOP_EN));

  const clean = (w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

  function isContentWord(w) {
    const c = clean(w);
    return c.length >= 4 && !STOP.has(c.toLowerCase()) && /\p{L}/u.test(c);
  }

  // engine.js phải chạy được cả khi i18n chưa nạp (kiểm thử bằng node)
  const TT = (k, v) => (self.__lampI18n ? self.__lampI18n.t(k, v) : k);

  const shuffle = (a) => a.slice().sort(() => Math.random() - 0.5);
  const cut = (t, n) => (t.length > n ? t.slice(0, n - 1).trim() + "…" : t);

  // ---- Ngữ cảnh dùng chung cho mọi dạng câu hỏi ----
  function quizContext(tokens, upTo, lang, from, blocks) {
    const vietnamese = lang === "vi";
    const start = Math.max(0, Math.min(from, tokens.length - 1));
    const read = tokens.slice(start, Math.max(start + 1, upTo + 1));
    if (!read.length) return null;

    // Gom theo token để giữ vị trí — cần cho nút "Xem lại đoạn này"
    const sentences = [];
    let buf = [], startIdx = 0;
    const flushSentence = () => {
      if (!buf.length) return;
      const text = buf.map((x) => x.text).join(" ").trim();
      const words = text.split(/\s+/);
      if (words.length >= 8 && words.length <= 45) {
        sentences.push({ text, words, token: start + startIdx, block: buf[0].block });
      }
      buf = [];
    };
    read.forEach((t, i) => {
      // KHÔNG cho một câu vắt qua ranh giới khối. Tiêu đề không có dấu chấm,
      // nên nếu không chặn thì tiêu đề dính luôn vào câu đầu của đoạn ngay
      // sau nó — và câu hỏi "Mục X mở đầu bằng ý nào?" sẽ có đáp án chứa
      // sẵn tên mục X, đoán một phát là ra.
      if (buf.length && t.block !== buf[0].block) flushSentence();
      if (!buf.length) startIdx = i;
      buf.push(t);
      if (CLAUSE_END.test(t.text) || i === read.length - 1) flushSentence();
    });
    flushSentence();
    // Tiêu đề là NHAN ĐỀ, không phải nội dung: khoét một từ khỏi tiêu đề bài
    // thì câu hỏi vô nghĩa ("Trí tuệ ___ tạo và tương lai công việc"). Chỉ
    // dạng "ý của mục" mới dùng tới tiêu đề, và nó lấy thẳng từ blocks.
    const headBlocks = new Set(
      (blocks || []).map((b, i) => (b.type === "h" ? i : -1)).filter((i) => i >= 0));
    const body = sentences.filter((x) => !headBlocks.has(x.block));
    if (body.length >= 3) sentences.length = 0, sentences.push(...body);
    if (sentences.length < 3) return null;

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
    if (pool.length < 12) return null;

    const freq = {};
    single.forEach((w) => { const k = w.toLowerCase(); freq[k] = (freq[k] || 0) + 1; });

    return { sentences, pool, freq, vietnamese, start };
  }

  // Rải đều các câu được chọn khắp phần đã đọc thay vì dồn một chỗ, nhưng
  // trong mỗi khoảng thì lấy NGẪU NHIÊN — nhờ vậy làm lại bài kiểm tra sẽ ra
  // bộ câu hỏi khác, thay vì lặp lại y hệt như bản trước.
  function spread(list, n) {
    if (list.length <= n) return shuffle(list);
    const out = [];
    const gap = list.length / n;
    for (let i = 0; i < n; i++) {
      const lo = Math.floor(i * gap);
      const hi = Math.min(list.length - 1, Math.floor((i + 1) * gap) - 1);
      out.push(list[lo + Math.floor(Math.random() * (hi - lo + 1))]);
    }
    return out;
  }

  // ---- Dạng 1: điền từ ----
  function makeCloze(ctx, used) {
    const { sentences, pool, freq, vietnamese } = ctx;
    const out = [];
    for (const sentence of spread(sentences, 8)) {
      const { words, token } = sentence;
      const cands = words.map((w, i) => ({ w, i })).filter(({ w }) => isContentWord(w));
      if (!cands.length) continue;

      const lo = Math.floor(words.length * 0.2), hi = Math.ceil(words.length * 0.8);
      const central = cands.filter((c) => c.i >= lo && c.i <= hi);
      const ranked = (central.length ? central : cands).slice()
        .sort((a, b) => (freq[clean(a.w).toLowerCase()] || 1) - (freq[clean(b.w).toLowerCase()] || 1));
      // Lấy ngẫu nhiên trong nhóm hiếm nhất thay vì luôn lấy đúng từ hiếm nhất:
      // vẫn giữ chất lượng câu hỏi mà mỗi lần làm lại ra từ khác.
      const pickable = shuffle(ranked.slice(0, Math.max(3, Math.ceil(ranked.length / 2))));
      const target = pickable.find((c) => !used.has(clean(c.w).toLowerCase()))
                  || ranked.find((c) => !used.has(clean(c.w).toLowerCase()));
      if (!target) continue;

      // Tiếng Việt đơn âm tiết: khoét cả cụm hai âm tiết, vì khoét "trực"
      // trong "trực quan" thì câu hỏi vừa dễ vừa vô nghĩa.
      let span = 1;
      if (vietnamese) {
        const nxt = words[target.i + 1];
        if (nxt && isContentWord(nxt)) span = 2;
      }
      const answer = words.slice(target.i, target.i + span).map(clean).join(" ");
      if (!answer || used.has(answer.toLowerCase())) continue;

      const low = sentence.text.toLowerCase();
      const capd = /^[A-ZÀ-Ỹ]/.test(answer);
      const cand = pool.filter((w) => {
        if (w.toLowerCase() === answer.toLowerCase()) return false;
        if (Math.abs(w.length - answer.length) > 4) return false;
        if (low.includes(w.toLowerCase())) return false;
        // Cùng số âm tiết: nhiễu một chữ cạnh đáp án hai chữ là lộ ngay
        if (w.split(" ").length !== answer.split(" ").length) return false;
        return true;
      }).sort((a, b) => {
        const ca = /^[A-ZÀ-Ỹ]/.test(a) === capd ? 0 : 1;
        const cb = /^[A-ZÀ-Ỹ]/.test(b) === capd ? 0 : 1;
        return ca - cb || Math.abs(a.length - answer.length) - Math.abs(b.length - answer.length);
      });
      const distractors = shuffle(cand.slice(0, 8)).slice(0, 3);
      if (distractors.length < 3) continue;

      const blanked = words
        .map((w, i) => (i === target.i ? "______" : (i > target.i && i < target.i + span ? null : w)))
        .filter((w) => w !== null).join(" ");

      used.add(answer.toLowerCase());
      out.push({
        kind: "cloze", label: TT("quiz.kind.cloze"),
        prompt: blanked, answer,
        options: shuffle([answer, ...distractors]),
        token, sentence: sentence.text
      });
    }
    return out;
  }

  // ---- Dạng 2: điền con số ----
  // Số liệu là thứ người đọc lướt hay bỏ sót nhất, và không đoán được bằng
  // ngữ pháp — nhiễu là chính con số đó bị bóp méo nên phải nhớ mới chọn đúng.
  const NUM_RE = /^[\d][\d.,]*$/;

  function fakeNumbers(numStr) {
    const digits = numStr.replace(/[^\d]/g, "");
    if (!digits) return [];
    const n = parseInt(digits, 10);
    if (!Number.isFinite(n) || n === 0) return [];
    const fmt = (v) => numStr.replace(digits, String(v));
    const cands = [n * 2, n * 3, Math.max(1, Math.round(n / 2)), n + 1, Math.max(1, n - 1),
                   n * 10, Math.max(1, Math.round(n / 10))];
    return [...new Set(cands)].filter((v) => v !== n && v > 0).map(fmt);
  }

  function makeNumber(ctx, used) {
    const out = [];
    for (const sentence of shuffle(ctx.sentences)) {
      const idx = sentence.words.findIndex((w) => NUM_RE.test(clean(w)) && clean(w).length <= 12);
      if (idx < 0) continue;
      const answer = clean(sentence.words[idx]);
      if (used.has("num:" + answer)) continue;
      const fakes = shuffle(fakeNumbers(answer)).slice(0, 3);
      if (fakes.length < 3) continue;
      used.add("num:" + answer);
      out.push({
        kind: "number", label: TT("quiz.kind.number"),
        prompt: sentence.words.map((w, i) => (i === idx ? "______" : w)).join(" "),
        answer,
        options: shuffle([answer, ...fakes]),
        token: sentence.token, sentence: sentence.text
      });
      if (out.length >= 4) break;
    }
    return out;
  }

  // ---- Dạng 3: câu nào ĐÚNG với bài ----
  // Bốn câu gần như giống hệt, ba câu bị đổi một từ khoá. Không có mẹo ngữ
  // pháp nào giúp được ở đây — phải nhớ bài mới chọn đúng.
  function makeWhichTrue(ctx, used) {
    const { sentences, pool } = ctx;
    const out = [];
    for (const sentence of spread(sentences.filter((s) => s.words.length <= 30), 6)) {
      const cands = sentence.words
        .map((w, i) => ({ w: clean(w), i }))
        .filter(({ w }) => isContentWord(w));
      if (cands.length < 2) continue;
      if (used.has("wt:" + sentence.token)) continue;

      const swaps = shuffle(cands).slice(0, 3);
      const low = sentence.text.toLowerCase();
      const variants = [];
      for (const sw of swaps) {
        const alt = pool.find((w) =>
          w.toLowerCase() !== sw.w.toLowerCase() &&
          !low.includes(w.toLowerCase()) &&
          w.split(" ").length === 1 &&
          Math.abs(w.length - sw.w.length) <= 4 &&
          !variants.some((v) => v.swapped === w));
        if (!alt) continue;
        const words = sentence.words.slice();
        words[sw.i] = words[sw.i].replace(sw.w, alt);
        variants.push({ text: words.join(" "), swapped: alt });
      }
      if (variants.length < 3) continue;

      used.add("wt:" + sentence.token);
      out.push({
        kind: "whichtrue", label: TT("quiz.kind.whichtrue"),
        prompt: TT("quiz.ask.whichtrue"),
        answer: cut(sentence.text, 160),
        options: shuffle([cut(sentence.text, 160), ...variants.slice(0, 3).map((v) => cut(v.text, 160))]),
        token: sentence.token, sentence: sentence.text
      });
      if (out.length >= 3) break;
    }
    return out;
  }

  // ---- Dạng 4: ý chính của mục ----
  // Cần dàn bài. Kiểm tra đúng thứ RSVP hay làm mất nhất: biết nội dung nào
  // thuộc về mục nào, tức là có nắm được bố cục bài hay không.
  function makeMainIdea(ctx, used, blocks) {
    if (!blocks || !blocks.length) return [];
    const { sentences } = ctx;
    // Câu mở đầu của mỗi mục = câu chủ đề
    const sections = [];
    let cur = null;
    for (const b of blocks) {
      if (b.type === "h") {
        if (cur) sections.push(cur);
        cur = { head: b.text, first: null };
      } else if (cur && !cur.first) {
        const s = sentences.find((x) => x.text.includes(b.text.slice(0, 40)));
        if (s) cur.first = s;
      }
    }
    if (cur) sections.push(cur);
    const usable = sections.filter((s) => s.first && s.head);
    if (usable.length < 4) return [];

    const out = [];
    for (const sec of shuffle(usable).slice(0, 3)) {
      if (used.has("mi:" + sec.head)) continue;
      const others = shuffle(usable.filter((s) => s !== sec)).slice(0, 3);
      if (others.length < 3) continue;
      used.add("mi:" + sec.head);
      const answer = cut(sec.first.text, 140);
      out.push({
        kind: "mainidea", label: TT("quiz.kind.mainidea"),
        prompt: TT("quiz.ask.mainidea", { name: cut(sec.head, 60) }),
        answer,
        options: shuffle([answer, ...others.map((o) => cut(o.first.text, 140))]),
        token: sec.first.token, sentence: sec.first.text
      });
    }
    return out;
  }

  // ---- Dạng 5: ý nào được nhắc trước ----
  function makeOrder(ctx, used) {
    const { sentences } = ctx;
    if (sentences.length < 8) return [];
    const out = [];
    for (let round = 0; round < 2; round++) {
      const four = shuffle(sentences).slice(0, 4).sort((a, b) => a.token - b.token);
      if (four.length < 4) break;
      const key = "od:" + four.map((f) => f.token).join(",");
      if (used.has(key)) continue;
      used.add(key);
      const answer = cut(four[0].text, 110);
      const opts = four.map((f) => cut(f.text, 110));
      if (new Set(opts).size < 4) continue;
      out.push({
        kind: "order", label: TT("quiz.kind.order"),
        prompt: TT("quiz.ask.order"),
        answer, options: shuffle(opts),
        token: four[0].token, sentence: four[0].text
      });
    }
    return out;
  }

  // ---- Trộn các dạng lại ----
  // `from`/`upTo` cho phép hỏi riêng một khoảng (luyện tốc độ, quiz theo mục).
  // `blocks` để dựng câu hỏi về bố cục bài.
  function buildQuiz(tokens, upTo, count = 5, vietnamese = false, from = 0, blocks = null) {
    // vietnamese có thể là cờ boolean (bản cũ) hoặc mã ngôn ngữ (bản mới)
    const lang = typeof vietnamese === "string" ? vietnamese : (vietnamese ? "vi" : "en");
    const ctx = quizContext(tokens, upTo, lang, from, blocks);
    if (!ctx) return [];

    const used = new Set();
    // Sinh theo thứ tự cố định (dạng nào cũng có cơ hội dùng câu tốt nhất),
    // nhưng LẤY RA theo thứ tự ngẫu nhiên để bài kiểm tra không lần nào giống
    // lần nào — kể cả về thứ tự các dạng câu hỏi.
    const groups = shuffle([
      makeWhichTrue(ctx, used),
      makeCloze(ctx, used),
      makeMainIdea(ctx, used, blocks),
      makeNumber(ctx, used),
      makeOrder(ctx, used)
    ]);

    // Lấy xen kẽ từng nhóm để một bài kiểm tra có đủ dạng, không dồn một loại.
    // Chốt chặn cuối: không để hai câu hỏi trùng đáp án — các dạng được sinh
    // độc lập nên vẫn có thể chạm nhau (hai câu "thứ tự" cùng ra một câu mở đầu).
    const questions = [];
    const seenAnswer = new Set();
    for (let i = 0; questions.length < count; i++) {
      let added = false;
      for (const g of groups) {
        if (i >= g.length) continue;
        added = true;
        const key = g[i].kind + "|" + g[i].answer.toLowerCase();
        const plain = g[i].answer.toLowerCase();
        if (seenAnswer.has(plain)) continue;
        seenAnswer.add(plain);
        questions.push(g[i]);
        if (questions.length >= count) break;
      }
      if (!added) break;
    }
    return questions.map((q, i) => ({ ...q, id: "q" + i }));
  }

  window.__lampEngine = {
    detectVietnamese, detectLang, profile, splitWords,
    buildTokens,
    tokenDelay,
    sentenceStart,
    sentenceNext,
    buildOutline,
    buildQuiz,
    CLAUSE_END
  };
})();
