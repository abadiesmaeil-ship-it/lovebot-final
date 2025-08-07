require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const { generateAnalysisHtml } = require("./helpers");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const sessions = {};
const questions = JSON.parse(fs.readFileSync(path.join(__dirname, "questions.json"), "utf-8"));

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  sessions[chatId] = {
    step: "language_selection",
    answers: [],
    partner: null,
    language: null,
    partnerUsername: null
  };

  bot.sendMessage(chatId, "👋 لطفاً زبان خود را انتخاب کنید:", {
    reply_markup: {
      keyboard: [["فارسی", "العربية"]],
      one_time_keyboard: true,
      resize_keyboard: true
    }
  });
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  const session = sessions[chatId];

  if (!session || !text || text.startsWith("/")) return;

  // انتخاب زبان
  if (session.step === "language_selection") {
    if (text === "فارسی" || text === "العربية") {
      session.language = text === "فارسی" ? "fa" : "ar";
      session.step = "partner_username";
      bot.sendMessage(
        chatId,
        text === "فارسی"
          ? "لطفاً یوزرنیم پارتنرت را بدون @ وارد کن:"
          : "يرجى إدخال اسم مستخدم شريكك (بدون @):"
      );
    } else {
      bot.sendMessage(chatId, "لطفاً یکی از زبان‌های موجود را انتخاب کنید.");
    }
    return;
  }

  // وارد کردن یوزرنیم پارتنر
  if (session.step === "partner_username") {
    session.partnerUsername = text.replace("@", "");
    session.step = "orientation";
    bot.sendMessage(
      chatId,
      session.language === "fa"
        ? "گرایش جنسی خود را انتخاب کن:"
        : "اختر التوجه الجنسي الخاص بك:",
      {
        reply_markup: {
          keyboard: session.language === "fa"
            ? [["استریت", "گی / لزبین"]]
            : [["مغاير الجنس", "مثلي / مثلية"]],
          one_time_keyboard: true,
          resize_keyboard: true
        }
      }
    );
    return;
  }

  // انتخاب گرایش
  if (session.step === "orientation") {
    session.orientation = text;
    session.step = "question_0";
    const firstQ = questions[session.language][0];
    sendQuestion(chatId, firstQ, session.language);
    return;
  }

  // دریافت پاسخ سوالات
  if (session.step.startsWith("question_")) {
    const qIndex = parseInt(session.step.split("_")[1]);
    const currentQuestion = questions[session.language][qIndex];

    session.answers.push({
      question: currentQuestion.q,
      answer: text
    });

    const nextIndex = qIndex + 1;
    if (nextIndex < questions[session.language].length) {
      session.step = `question_${nextIndex}`;
      const nextQ = questions[session.language][nextIndex];
      sendQuestion(chatId, nextQ, session.language);
    } else {
      session.step = "done";
      bot.sendMessage(
        chatId,
        session.language === "fa"
          ? "✅ پاسخ‌ها ثبت شد. لطفاً منتظر دریافت تحلیل رابطه بمانید..."
          : "✅ تم حفظ الردود. الرجاء الانتظار للحصول على تحليل العلاقة..."
      );

      // تولید تحلیل توسط GPT
      const prompt = generatePrompt(session.answers, session.language);
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      });

      const result = completion.choices[0].message.content;

      const html = generateAnalysisHtml(
        session.partnerUsername,
        chatId,
        session.answers,
        result
      );

      const filename = `analysis_${chatId}_${session.partnerUsername}.html`;
      const filePath = path.join(__dirname, "analysis", filename);
      fs.writeFileSync(filePath, html);

      const link = `https://yourdomain.com/analysis/${filename}`;

      bot.sendMessage(
        chatId,
        session.language === "fa"
          ? `📄 تحلیل کامل رابطه آماده شد:\n${link}`
          : `📄 تم إنشاء التحليل الكامل للعلاقة:\n${link}`
      );
    }
  }
});

// ارسال سوال با گزینه‌ها
function sendQuestion(chatId, q, lang) {
  const options = q.options?.length
    ? {
        reply_markup: {
          keyboard: q.options.map(opt => [opt]),
          one_time_keyboard: true,
          resize_keyboard: true
        }
      }
    : {};

  bot.sendMessage(chatId, `❓ ${q.q}`, options);
}

// ساخت پرامپت برای ChatGPT
function generatePrompt(answers, lang) {
  const intro =
    lang === "fa"
      ? "تو یک روانشناس متخصص روابط عاشقانه هستی. این پاسخ‌ها را تحلیل کن:"
      : "أنت خبير نفسي في العلاقات العاطفية. قم بتحليل هذه الردود:";
  const list = answers
    .map((a, i) => `${i + 1}. ${a.question}\nپاسخ: ${a.answer}`)
    .join("\n\n");

  const conclusion =
    lang === "fa"
      ? "لطفاً یک تحلیل جامع، ۵ نکته مثبت، ۵ چالش، و ۱۰ پیشنهاد برای بهبود رابطه بده."
      : "يرجى تقديم تحليل شامل، 5 نقاط إيجابية، 5 تحديات، و 10 اقتراحات لتحسين العلاقة.";

  return `${intro}\n\n${list}\n\n${conclusion}`;
}
