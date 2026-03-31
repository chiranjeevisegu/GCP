const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/config');

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getRetryDelay(errMsg, fallbackMs = 15000) {
  const match = errMsg.match(/retry in ([\d.]+)s/);
  if (match && match[1]) {
    return Math.ceil(parseFloat(match[1]) * 1000) + 1000;
  }
  return fallbackMs;
}

async function generateWithRetry(prompt, systemInstruction, maxRetries = 4) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      const msg = err.message || '';
      if ((msg.includes('429') || msg.includes('503') || msg.includes('500')) && attempt < maxRetries) {
        const waitMs = msg.includes('429') ? getRetryDelay(msg, 15000) : 5000 * (attempt + 1);
        console.log(`[SummaryAgent] API limit hit. Waiting ${waitMs / 1000}s...`);
        await sleep(waitMs);
      } else {
        throw err;
      }
    }
  }
}

/**
 * Summary Agent — condenses content into key insights.
 */
async function summarize(text, format = 'bullets', maxPoints = 5) {
  const systemInstruction = `You are a specialist summarization agent. Distill information into clear, concise insights. Use proper markdown formatting.`;

  const formatMap = {
    bullets: `${maxPoints} clear bullet points, each starting with a **bold key term**`,
    paragraph: `${Math.min(maxPoints, 3)} concise paragraphs`,
    executive: `Executive summary: Overview (2 sentences), Key Findings (${maxPoints} bullets), Recommendation (1-2 sentences)`,
  };

  const prompt = `Summarize the following content.
Format: ${formatMap[format] || formatMap.bullets}

Content:
---
${text}
---

Provide a clear, accurate summary.`;

  return generateWithRetry(prompt, systemInstruction);
}

module.exports = { summarize };
