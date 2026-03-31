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
        console.log(`[TaskAgent] API limit hit. Waiting ${waitMs / 1000}s...`);
        await sleep(waitMs);
      } else {
        throw err;
      }
    }
  }
}

/**
 * Task Planning Agent — creates structured, actionable roadmaps.
 */
async function createPlan(goal, timeframe = 'flexible', teamSize = 1, context = '') {
  const systemInstruction = `You are an expert project manager and productivity coach. Create clear, actionable task plans with milestones, priorities (High/Medium/Low), time estimates, and success metrics. Format with markdown: ##, tables, checkboxes (- [ ]).`;

  const prompt = `Create a detailed, actionable plan for:

**Goal:** ${goal}
**Timeframe:** ${timeframe || 'Flexible'}
**Team Size:** ${teamSize || 1} person(s)
${context ? `**Context:** ${context}` : ''}

Include:
1. Executive Summary
2. Key Milestones / Phases
3. Detailed Task Breakdown with priorities & time estimates
4. Success Metrics
5. Potential Risks & Mitigations

Use markdown, checkboxes, and tables. Make it immediately actionable.`;

  return generateWithRetry(prompt, systemInstruction);
}

module.exports = { createPlan };
