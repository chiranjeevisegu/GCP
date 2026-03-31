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
        console.log(`[WriterAgent] API limit hit. Waiting ${waitMs / 1000}s...`);
        await sleep(waitMs);
      } else {
        throw err;
      }
    }
  }
}

/**
 * Writer Agent — writes structured content.
 */
async function write(contentType, topic, context = '', tone = 'professional') {
  const systemInstruction = `You are an expert content writer. Write clear, engaging, well-structured content in markdown format. Use headers, bullets, and bold text appropriately. Always produce complete, polished content.`;

  const prompt = `Write a ${tone} ${contentType} about: "${topic}"
${context ? `\nContext/Requirements:\n${context}` : ''}

Produce complete, ready-to-use content formatted with markdown.`;

  return generateWithRetry(prompt, systemInstruction);
}

module.exports = { write };
