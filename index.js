require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");
const { sendQuestion, generatePrompt } = require("./helpers");
const { analyzeRelationship } = require("./analyzer");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const sessions = {};
const questions = JSON.parse(fs.readFileSync("questions.json", "utf-8"));

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  sessions[chatId] = { step: "lang", answers: [], language: null, partner: null };
  bot.sendMessage(chatId, "👋 لطفاً زبان خود را انتخاب کنید / اختر اللغة:", {
    reply_markup: {
      keyboard: [["فارسی", "العربية"]],
      one_time_keyboard: true,
      resize_keyboard: true
    }
  });
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const session = sessions[chatId];

  if (!session || text === "/start") return;

  // زبان
  if (session.step === "lang") {
    session.language = text === "فارسی" ? "fa" : "ar";
    session.step = "partner";
    return bot.sendMessage(chatId, session.language === "fa" ? "یوزرنیم پارتنرت (بدون @):" : "اسم مستخدم شريكك (بدون @):");
  }

  // پارتنر
  if (session.step === "partner") {
    session.partner = text;
    session.step = "q_0";
    return sendQuestion(bot, chatId, questions[session.language][0], session.language);
  }

  // سوالات
  if (session.step.startsWith("q_")) {
    const index = parseInt(session.step.split("_")[1]);
    session.answers.push({
      q: questions[session.language][index].q,
      a: text
    });

    const nextIndex = index + 1;
    if (nextIndex < questions[session.language].length) {
      session.step = `q_${nextIndex}`;
      return sendQuestion(bot, chatId, questions[session.language][nextIndex], session.language);
    } else {
      session.step = "done";
      bot.sendMessage(chatId, session.language === "fa" ? "در حال تحلیل..." : "جاري التحليل...");

      const prompt = generatePrompt(session.answers, session.language);
      const analysis = await analyzeRelationship(prompt);
      return bot.sendMessage(chatId, analysis);
    }
  }
});
