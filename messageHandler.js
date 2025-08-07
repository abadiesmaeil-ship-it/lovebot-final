// messageHandler.js
const fs = require("fs");
const path = require("path");
const { sendQuestion } = require("./helpers");

const questions = JSON.parse(fs.readFileSync(path.join(__dirname, "questions.json"), "utf-8"));
const sessions = {};

function handleMessage(bot, msg, openai) {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!sessions[chatId]) return;

  const session = sessions[chatId];

  if (session.step === "language_selection") {
    if (text === "فارسی" || text === "العربية") {
      session.language = text === "فارسی" ? "fa" : "ar";
      session.step = "partner_username";
      bot.sendMessage(chatId, text === "فارسی"
        ? "لطفاً یوزرنیم پارتنرتون رو وارد کنید (بدون @):"
        : "يرجى إدخال اسم مستخدم شريكك (بدون @):");
    } else {
      bot.sendMessage(chatId, "لطفاً یکی از زبان‌های موجود را انتخاب کنید.");
    }
    return;
  }

  if (session.step === "partner_username") {
    session.partner = text;
    session.step = "question_0";
    const q = questions[session.language][0];
    sendQuestion(bot, chatId, q, session.language);
    return;
  }

  if (session.step.startsWith("question_")) {
    const qIndex = parseInt(session.step.split("_")[1]);
    const currentQuestion = questions[session.language][qIndex];

    session.answers.push({ question: currentQuestion.q, answer: text });

    const nextIndex = qIndex + 1;
    if (nextIndex < questions[session.language].length) {
      session.step = `question_${nextIndex}`;
      const nextQ = questions[session.language][nextIndex];
      sendQuestion(bot, chatId, nextQ, session.language);
    } else {
      session.step = "done";
      bot.sendMessage(chatId, session.language === "fa"
        ? "✅ ممنون از پاسخ‌ها. در حال تحلیل رابطه هستم..."
        : "✅ شكراً لإجاباتك. يتم تحليل العلاقة...");

      generateAIResult(session.answers, session.language, openai).then(result => {
        bot.sendMessage(chatId, result);
      });
    }
  }
}

async function generateAIResult(answers, lang, openai) {
  const intro = lang === "fa"
    ? "تو یک روانشناس متخصص در زمینه روابط عاشقانه هستی. تحلیل کن:"
    : "أنت خبير نفسي مختص في العلاقات. قم بالتحليل:";

  let prompt = intro + "\n\n";
  answers.forEach((a, i) => {
    prompt += `${i + 1}. ${a.question}\nپاسخ: ${a.answer}\n\n`;
  });
  prompt += lang === "fa"
    ? "یک تحلیل کلی بده، ۵ نکته مثبت، ۵ نقطه ضعف و ۱۰ پیشنهاد برای بهبود رابطه بنویس."
    : "اعط تحليل عام، 5 نقاط إيجابية، 5 نقاط ضعف، و 10 نصائح لتحسين العلاقة.";

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7
  });

  return completion.choices[0].message.content;
}

module.exports = {
  handleMessage,
  sessions
};
