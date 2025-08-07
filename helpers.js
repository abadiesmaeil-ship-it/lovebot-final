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
function generateAnalysisHtml(partnerUsername, userChatId, answers, analysisText) {
  const answerList = answers.map((a, i) =>
    `<li><strong>${i + 1}. ${a.question}</strong><br>پاسخ: ${a.answer}</li>`).join("\n");

  return `
    <!DOCTYPE html>
    <html lang="fa">
    <head>
      <meta charset="UTF-8">
      <title>تحلیل رابطه</title>
      <style>
        body { font-family: sans-serif; max-width: 600px; margin: auto; padding: 2rem; background: #f9f9f9; }
        h2 { color: #444; }
        ul { line-height: 1.6; }
        .analysis { margin-top: 2rem; padding: 1rem; background: #fffbe6; border: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <h2>پاسخ‌ها</h2>
      <ul>${answerList}</ul>

      <div class="analysis">
        <h2>تحلیل</h2>
        <p>${analysisText.replace(/\n/g, "<br>")}</p>
      </div>
    </body>
    </html>
  `;
}

module.exports = { generateAnalysisHtml };
