function sendQuestion(bot, chatId, qObj, lang) {
  const options = qObj.options ? {
    reply_markup: {
      keyboard: [qObj.options],
      one_time_keyboard: true,
      resize_keyboard: true
    }
  } : {};
  bot.sendMessage(chatId, `❓ ${qObj.q}`, options);
}

function generatePrompt(answers, lang) {
  const intro = lang === "fa"
    ? "تو یک روانشناس متخصص هستی. تحلیل کن:"
    : "أنت طبيب نفسي مختص في العلاقات. قم بالتحليل:";

  let result = intro + "\n\n";
  answers.forEach((a, i) => {
    result += `${i + 1}. ${a.q}\nپاسخ: ${a.a}\n\n`;
  });

  result += lang === "fa"
    ? "نتیجه کلی، ۵ نقطه قوت، ۵ ضعف و ۱۰ پیشنهاد برای بهبود رابطه بنویس."
    : "قم بإعطاء نتائج عامة، ٥ نقاط قوة، ٥ ضعف، و ١٠ نصائح لتحسين العلاقة.";

  return result;
}

module.exports = { sendQuestion, generatePrompt };
