require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");

// ---- Bot ----
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// ---- Data ----
const QUESTIONS = JSON.parse(
  fs.readFileSync(path.join(__dirname, "questions.json"), "utf8")
);

// ---- State ----
/*
sessions[userId] = {
  userId, username, lang, partnerUsername, pairId, role: 'A'|'B',
  section: 's1'|'s2'|'s2H'|'s3', index: number,
  answers: { s1:[], s2:[], s2H:[], s3:[] }
}
pairs[pairId] = {
  users: {A: userId, B: userId},
  usernames: {A: usernameA, B: usernameB},
  langs: {A: 'fa'|'ar'|'en', B: '...'},
  section: 's1', index: 0,
  pending: {A: false, B: false},
  answers: {
    A: { s1:[], s2:[], s2H:[], s3:[] },
    B: { s1:[], s2:[], s2H:[], s3:[] }
  }
}
*/
const sessions = {};
const pairs = {};

// ---- Helpers (lang texts) ----
const T = {
  fa: {
    chooseLang: "👋 لطفاً زبان را انتخاب کن:",
    askPartner: "لطفاً یوزرنیم پارتنرت را بدون @ وارد کن (مثال: partner123):",
    waitPartner: (u) => `⏳ منتظر می‌مانیم تا @${u} هم /start بزند و یوزرنیم تو را تایید کند...`,
    youNeedUsername: "❗️برای بازی باید در تلگرام username داشته باشی. از تنظیمات تلگرام یک یوزرنیم انتخاب کن.",
    partnerSetOk: (p) => `✅ پارتنر تنظیم شد: @${p}\nدر انتظار تأیید او هستیم...`,
    connected: (a,b)=> `🔗 اتصال برقرار شد!\nشما (@${a}) و پارتنرت (@${b}) آماده بازی هستید.\nبریم سرِ بخش اول 🎯`,
    section1: "📘 بخش ۱: سوالات مربوط به رابطه",
    section2: "📗 بخش ۲: سوالات شخصی",
    section2H: "📙 بخش ۲ (H): سوالات هماهنگی/توافق",
    section3: "📕 بخش ۳: پارتنرشناسی",
    invalidOption: "لطفاً از بین گزینه‌های نمایش‌داده‌شده انتخاب کن.",
    nextWhenBoth: "⏳ پاسخ ثبت شد. منتظر پاسخ پارتنرت هستیم...",
    finishedAll: "🏁 بازی تمام شد! در حال محاسبه‌ی امتیازها...",
    resultHeader: "📊 نتیجه‌ی بازی",
    winner: (u)=> `🏆 برنده: @${u}`,
    draw: "🤝 نتیجه مساوی شد!",
    yourScore: (s)=> `امتیاز تو: ${s}`,
    partnerScore: (s)=> `امتیاز پارتنرت: ${s}`,
    answersOf: (who)=> `📝 پاسخ‌های ${who}:`,
    you: "تو",
    partner: "پارتنرت",
    chooseOrientation: "لطفاً گرایش خودت رو انتخاب کن:",
    orientationOpts: [["استریت","گی / لزبین"]],
  },
  ar: {
    chooseLang: "👋 يرجى اختيار اللغة:",
    askPartner: "يرجى إدخال اسم مستخدم شريكك بدون @ (مثال: partner123):",
    waitPartner: (u)=> `⏳ ننتظر أن يبدأ @${u} ويؤكد اسمك...`,
    youNeedUsername: "❗️تحتاج إلى اسم مستخدم في تيليجرام لتشارك باللعبة. عيّنه من الإعدادات.",
    partnerSetOk: (p)=> `✅ تم تعيين الشريك: @${p}\nبانتظار تأكيده...`,
    connected: (a,b)=> `🔗 تم الاتصال!\nأنت (@${a}) وشريكك (@${b}) مستعدان للعبة.\nلنبدأ بالقسم الأول 🎯`,
    section1: "📘 القسم ١: أسئلة العلاقة",
    section2: "📗 القسم ٢: أسئلة شخصية",
    section2H: "📙 القسم ٢ (H): أسئلة التوافق",
    section3: "📕 القسم ٣: معرفة الشريك",
    invalidOption: "يرجى الاختيار من بين الخيارات المعروضة.",
    nextWhenBoth: "⏳ تم حفظ إجابتك. ننتظر إجابة شريكك...",
    finishedAll: "🏁 انتهت اللعبة! يتم الآن حساب النقاط...",
    resultHeader: "📊 نتيجة اللعبة",
    winner: (u)=> `🏆 الفائز: @${u}`,
    draw: "🤝 النتيجة تعادل!",
    yourScore: (s)=> `نقاطك: ${s}`,
    partnerScore: (s)=> `نقاط شريكك: ${s}`,
    answersOf: (who)=> `📝 إجابات ${who}:`,
    you: "أنت",
    partner: "شريكك",
    chooseOrientation: "اختر توجهك:",
    orientationOpts: [["مغاير الجنس","مثلي / مثلية"]],
  },
  en: {
    chooseLang: "👋 Please choose your language:",
    askPartner: "Please enter your partner's username without @ (e.g., partner123):",
    waitPartner: (u)=> `⏳ Waiting for @${u} to /start and confirm you...`,
    youNeedUsername: "❗️You need a Telegram username to play. Set it in Telegram settings.",
    partnerSetOk: (p)=> `✅ Partner set: @${p}\nWaiting for their confirmation...`,
    connected: (a,b)=> `🔗 Paired!\nYou (@${a}) and your partner (@${b}) are ready.\nStarting Section 1 🎯`,
    section1: "📘 Section 1: Relationship",
    section2: "📗 Section 2: Personal",
    section2H: "📙 Section 2 (H): Harmony",
    section3: "📕 Section 3: Partner-Guess",
    invalidOption: "Please choose from the provided options.",
    nextWhenBoth: "⏳ Saved. Waiting for your partner...",
    finishedAll: "🏁 Finished! Scoring now...",
    resultHeader: "📊 Game Result",
    winner: (u)=> `🏆 Winner: @${u}`,
    draw: "🤝 Draw!",
    yourScore: (s)=> `Your score: ${s}`,
    partnerScore: (s)=> `Partner score: ${s}`,
    answersOf: (who)=> `📝 Answers of ${who}:`,
    you: "You",
    partner: "Your partner",
    chooseOrientation: "Choose your orientation:",
    orientationOpts: [["Straight","Gay / Lesbian"]],
  }
};

// ---- Utilities ----
function getUsername(msg) {
  return msg.from?.username || null;
}
function makePairId(u1, u2) {
  // deterministic key by sorting usernames
  return [u1.toLowerCase(), u2.toLowerCase()].sort().join("__");
}
function sectionOrder() { return ["s1","s2","s2H","s3"]; }
function getSectionList(lang, sec) {
  if (sec === "s1") return QUESTIONS[lang].section1;
  if (sec === "s2") return QUESTIONS[lang].section2;
  if (sec === "s2H") return QUESTIONS[lang].section2H;
  if (sec === "s3") return QUESTIONS[lang].section3;
  return [];
}
function isValidOption(text, options) {
  if (!Array.isArray(options) || options.length===0) return true;
  // options may be array of strings or array of rows
  const flat = Array.isArray(options[0]) ? options.flat() : options;
  return flat.includes(text);
}
function keyboardFromOptions(options) {
  if (!options) return undefined;
  if (Array.isArray(options[0])) {
    return { keyboard: options, resize_keyboard: true, one_time_keyboard: true };
  }
  // make each option in its own row for easy taps
  return { keyboard: options.map(o=>[o]), resize_keyboard: true, one_time_keyboard: true };
}

// map localized yes/no to boolean using provided options order
function yesNoToKey(answer, q) {
  // assume q.options like ["Yes","No"] or ["بله","خیر"] or ["نعم","لا"]
  if (!q.options || q.options.length<2) return null;
  return (answer === q.options[0]) ? "yes" : (answer === q.options[1]) ? "no" : null;
}

// ---- Pair lifecycle ----
function tryConnectPairs(userId) {
  const s = sessions[userId];
  if (!s || !s.partnerUsername) return false;

  // find partner session by username
  const partnerSession = Object.values(sessions).find(
    ss => ss.username?.toLowerCase() === s.partnerUsername.toLowerCase()
  );
  if (!partnerSession) return false;

  // partner must also point back to this username
  if (!partnerSession.partnerUsername ||
      partnerSession.partnerUsername.toLowerCase() !== s.username.toLowerCase()) {
    return false;
  }

  // build pair if not exists
  const pairId = makePairId(s.username, s.partnerUsername);
  if (!pairs[pairId]) {
    // assign roles deterministically by username order
    const sorted = [s.username, s.partnerUsername].sort((a,b)=>a.localeCompare(b));
    const A = sorted[0];
    const B = sorted[1];
    const roleForS   = (s.username === A) ? "A" : "B";
    const roleForPtn = (partnerSession.username === A) ? "A" : "B";

    pairs[pairId] = {
      users: { A: (roleForS==="A"? s.userId : partnerSession.userId),
               B: (roleForS==="B"? s.userId : partnerSession.userId) },
      usernames: { A: A, B: (A===s.username? s.partnerUsername : s.username) },
      langs: { A: null, B: null },
      section: "s1",
      index: 0,
      pending: { A:false, B:false },
      answers: {
        A: { s1:[], s2:[], s2H:[], s3:[] },
        B: { s1:[], s2:[], s2H:[], s3:[] }
      }
    };

    // store pair linkage in sessions
    s.pairId = pairId; s.role = roleForS;
    partnerSession.pairId = pairId; partnerSession.role = roleForPtn;
    pairs[pairId].langs[roleForS] = s.lang;
    pairs[pairId].langs[roleForPtn] = partnerSession.lang;

    // notify both
    const aU = pairs[pairId].usernames.A;
    const bU = pairs[pairId].usernames.B;
    const uidA = pairs[pairId].users.A;
    const uidB = pairs[pairId].users.B;
    bot.sendMessage(uidA, T[s.lang].connected(aU, bU));
    bot.sendMessage(uidB, T[partnerSession.lang].connected(aU, bU));

    // start section 1, question 0 for both
    sendCurrentQuestionToBoth(pairId);
    return true;
  } else {
    // already paired; ensure sessions have pair info
    s.pairId = pairId;
    s.role = (pairs[pairId].usernames.A.toLowerCase()===s.username.toLowerCase()) ? "A" : "B";
    pairs[pairId].langs[s.role] = s.lang;

    partnerSession.pairId = pairId;
    partnerSession.role = (s.role==="A")?"B":"A";
    pairs[pairId].langs[partnerSession.role] = partnerSession.lang;
    return true;
  }
}

// send current q to both users
function sendCurrentQuestionToBoth(pairId) {
  const pair = pairs[pairId];
  const { section, index } = pair;

  ["A","B"].forEach(role=>{
    const userId = pair.users[role];
    const lang = pair.langs[role];
    const list = getSectionList(lang, section);
    const q = list[index];
    sendQuestion(userId, role, pairId, q, lang, section);
  });
}

// send a question to a single user with proper keyboard
function sendQuestion(userId, role, pairId, q, lang, section) {
  const labelBySection = {
    s1: T[lang].section1,
    s2: T[lang].section2,
    s2H: T[lang].section2H,
    s3: T[lang].section3
  };
  const header = labelBySection[section];

  let options = q.options ? [...q.options] : undefined;

  // dynamic options for pairChoice (AorB)
  if (section === "s2H" && q.type === "pairChoice" && q.optionsDynamic === "AorB") {
    const pair = pairs[pairId];
    const opts = [ `@${pair.usernames.A}`, `@${pair.usernames.B}` ];
    options = opts;
  }

  const reply_markup = keyboardFromOptions(options);

  bot.sendMessage(userId, `${header}\n\n❓ ${q.q}`, {
    reply_markup: reply_markup
  });
}

// after both answered current index -> advance
function tryAdvance(pairId) {
  const pair = pairs[pairId];
  if (!pair) return;
  if (!(pair.pending.A && pair.pending.B)) return;

  pair.pending.A = false;
  pair.pending.B = false;

  const currentSection = pair.section;
  const lenA = getSectionList(pair.langs.A, currentSection).length;
  const lenB = getSectionList(pair.langs.B, currentSection).length;
  const len = Math.min(lenA, lenB); // should be equal by design

  pair.index += 1;

  if (pair.index >= len) {
    // move to next section
    const order = sectionOrder();
    const idx = order.indexOf(currentSection);
    if (idx < order.length - 1) {
      pair.section = order[idx+1];
      pair.index = 0;
      // send first q of next section to both
      sendCurrentQuestionToBoth(pairId);
    } else {
      // finished all
      finishGame(pairId);
    }
  } else {
    // same section next question
    sendCurrentQuestionToBoth(pairId);
  }
}

// scoring functions
function scoreSection1Answer(answer, q) {
  if (q.type === "scale" && q.scoreMode === "scale10") {
    // answer should be a string number "1".."10"
    const n = parseInt(answer, 10);
    if (!isNaN(n) && n >= 1 && n <= 10) return n;
    return 0;
  }
  if (q.type === "yesno" && q.score) {
    const key = yesNoToKey(answer, q); // 'yes' or 'no'
    if (key && typeof q.score[key] === "number") return q.score[key];
    return 0;
  }
  return 0;
}

function scoreH(aAnswer, bAnswer, q) {
  // +matchScore if answers equal
  if (!q.matchScore) return 0;
  return (aAnswer === bAnswer) ? q.matchScore : 0;
}

function scoreGuess(myGuess, partnerRealAnswer, q) {
  if (!q.correctScore) return 0;
  return (myGuess === partnerRealAnswer) ? q.correctScore : 0;
}

function finishGame(pairId) {
  const pair = pairs[pairId];
  if (!pair) return;

  const { A:uidA, B:uidB } = pair.users;
  const { A:langA, B:langB } = pair.langs;

  // compute scores
  let scoreA = 0;
  let scoreB = 0;

  // Section 1 scoring (independent)
  // answers arrays store {id, q, answer}
  const s1A = pair.answers.A.s1;
  const s1B = pair.answers.B.s1;

  // Need question objects to evaluate yes/no maps
  const s1Q_A = getSectionList(langA, "s1");
  const s1Q_B = getSectionList(langB, "s1");

  s1A.forEach((a, i)=>{
    const q = s1Q_A.find(qq=>qq.id===a.id) || s1Q_A[i];
    scoreA += scoreSection1Answer(a.answer, q);
  });
  s1B.forEach((a, i)=>{
    const q = s1Q_B.find(qq=>qq.id===a.id) || s1Q_B[i];
    scoreB += scoreSection1Answer(a.answer, q);
  });

  // Section 2H (match both)
  const s2H_A = pair.answers.A.s2H;
  const s2H_B = pair.answers.B.s2H;
  const s2H_QA = getSectionList(langA, "s2H");
  // compute by question id
  s2H_QA.forEach(q=>{
    const aAns = s2H_A.find(x=>x.id===q.id)?.answer;
    const bAns = s2H_B.find(x=>x.id===q.id)?.answer;
    if (aAns && bAns) {
      const add = scoreH(aAns, bAns, q);
      scoreA += add;
      scoreB += add;
    }
  });

  // Section 3 (guess against partner's Section 2 real answers)
  const s3A = pair.answers.A.s3;
  const s3B = pair.answers.B.s3;

  // build partner real answers map by id from section2
  const realA = Object.fromEntries(pair.answers.A.s2.map(x=>[x.id, x.answer]));
  const realB = Object.fromEntries(pair.answers.B.s2.map(x=>[x.id, x.answer]));

  const s3QA = getSectionList(langA, "s3");
  const s3QB = getSectionList(langB, "s3");

  s3A.forEach(g=>{
    const q = s3QA.find(qq=>qq.id===g.id);
    if (q && q.refId) {
      const partnerReal = realB[q.refId];
      scoreA += scoreGuess(g.answer, partnerReal, q);
    }
  });
  s3B.forEach(g=>{
    const q = s3QB.find(qq=>qq.id===g.id);
    if (q && q.refId) {
      const partnerReal = realA[q.refId];
      scoreB += scoreGuess(g.answer, partnerReal, q);
    }
  });

  // result texts
  const txtA = T[langA], txtB = T[langB];

  bot.sendMessage(uidA, `${txtA.finishedAll}\n\n${txtA.resultHeader}\n${txtA.yourScore(scoreA)}\n${txtA.partnerScore(scoreB)}\n` + winnerText(scoreA, scoreB, txtA));
  bot.sendMessage(uidB, `${txtB.finishedAll}\n\n${txtB.resultHeader}\n${txtB.yourScore(scoreB)}\n${txtB.partnerScore(scoreA)}\n` + winnerText(scoreB, scoreA, txtB));

  // send answers cross to each partner
  sendAnswersCross(pairId);
}

function winnerText(my, partner, TXT) {
  if (my === partner) return TXT.draw;
  return (my > partner) ? TXT.winner("you") : TXT.winner("partner");
}

// send each partner the other's answers (pretty)
function sendAnswersCross(pairId) {
  const pair = pairs[pairId];
  if (!pair) return;
  const { A:uidA, B:uidB } = pair.users;
  const { A:langA, B:langB } = pair.langs;

  const txtA = T[langA], txtB = T[langB];

  const pretty = (arr)=> arr.map((x,i)=>`${i+1}) ${x.q}\n→ ${x.answer}`).join("\n\n");

  const aAll = [
    ...pair.answers.A.s1,
    ...pair.answers.A.s2,
    ...pair.answers.A.s2H,
    ...pair.answers.A.s3
  ];
  const bAll = [
    ...pair.answers.B.s1,
    ...pair.answers.B.s2,
    ...pair.answers.B.s2H,
    ...pair.answers.B.s3
  ];

  bot.sendMessage(uidA, `${txtA.answersOf(txtA.partner)}\n\n${pretty(bAll)}`);
  bot.sendMessage(uidB, `${txtB.answersOf(txtB.partner)}\n\n${pretty(aAll)}`);
}

// ---- Flow ----

// /start -> choose language
bot.onText(/\/start/i, (msg)=>{
  const chatId = msg.chat.id;
  const username = getUsername(msg);

  if (!username) {
    bot.sendMessage(chatId, T.fa.youNeedUsername); // fallback Persian
    return;
  }

  sessions[chatId] = {
    userId: chatId,
    username,
    lang: null,
    partnerUsername: null,
    pairId: null,
    role: null,
    section: null,
    index: 0,
    answers: { s1:[], s2:[], s2H:[], s3:[] }
  };

  bot.sendMessage(chatId, `${T.fa.chooseLang}\n${T.ar.chooseLang}\n${T.en.chooseLang}`, {
    reply_markup: { keyboard: [["فارسی","العربية","English"]], resize_keyboard: true, one_time_keyboard: true }
  });
});

// handle messages
bot.on("message", (msg)=>{
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  if (!text || text.startsWith("/")) return;

  const s = sessions[chatId];
  if (!s) return;

  // language selection
  if (!s.lang) {
    if (text === "فارسی") s.lang = "fa";
    else if (text === "العربية") s.lang = "ar";
    else if (text === "English") s.lang = "en";
    else {
      bot.sendMessage(chatId, T.fa.invalidOption);
      return;
    }
    bot.sendMessage(chatId, T[s.lang].askPartner);
    return;
  }

  // partner username input phase (until pairId is set)
  if (!s.partnerUsername || !s.pairId) {
    // set partner username (strip @)
    if (!s.partnerUsername) {
      const uname = text.replace(/^@/, "");
      s.partnerUsername = uname;
      bot.sendMessage(chatId, T[s.lang].partnerSetOk(uname));
      bot.sendMessage(chatId, T[s.lang].waitPartner(uname));
      // try to connect if partner already set
      tryConnectPairs(chatId);
      return;
    } else {
      // already have partner username, just retry connect
      tryConnectPairs(chatId);
      return;
    }
  }

  // if paired, we're in Q/A flow
  const pair = pairs[s.pairId];
  if (!pair) return;

  const role = s.role; // 'A' or 'B'
  const lang = s.lang;
  const currentSection = pair.section;
  const qList = getSectionList(lang, currentSection);
  const q = qList[pair.index];

  // build the options we sent (for validation)
  let options = q.options ? [...q.options] : undefined;
  if (currentSection === "s2H" && q.type === "pairChoice" && q.optionsDynamic === "AorB") {
    const opts = [ `@${pair.usernames.A}`, `@${pair.usernames.B}` ];
    options = opts;
  }

  if (!isValidOption(text, options)) {
    bot.sendMessage(chatId, T[lang].invalidOption);
    return;
  }

  // record answer
  const answerObj = { id: q.id, q: q.q, answer: text };
  pair.answers[role][currentSection].push(answerObj);
  pair.pending[role] = true;

  // inform waiting
  bot.sendMessage(chatId, T[lang].nextWhenBoth);

  // if both answered this index -> advance
  tryAdvance(s.pairId);
});

// ---- Ready ----
console.log("🤖 Love-Game bot is running (polling)...");
