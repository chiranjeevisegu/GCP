const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/config');
const mcpTools = require('../mcp/mcpTools');
const mcpServer = require('../mcp/mcpServer');

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 
 * Extracts "Please retry in X seconds" from Gemini error messages
 * Returns ms to wait, or fallback.
 */
function getRetryDelay(errMsg, fallbackMs = 15000) {
  const match = errMsg.match(/retry in ([\d.]+)s/);
  if (match && match[1]) {
    return Math.ceil(parseFloat(match[1]) * 1000) + 1000; // Add 1s buffer
  }
  return fallbackMs;
}

/**
 * Super-robust retry logic specifically built for Gemini Free Tier limits.
 * Free tier is 15 requests/minute. If we hit 429, we MUST wait.
 * If 503 (Overloaded) occurs, we wait and retry.
 */
async function sendWithRetry(makeFn, maxRetries = 4, onProgress) {
  // Use the most stable model as primary
  const primaryModel = 'gemini-2.5-flash';
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0 && onProgress) {
        onProgress({ type: 'thinking', message: `🔄 Retrying request (attempt ${attempt + 1}/${maxRetries + 1})...` });
      }
      return await makeFn(primaryModel);
    } catch (err) {
      const msg = err.message || '';
      const is429 = msg.includes('429');
      const is503 = msg.includes('503') || msg.includes('500');

      if ((is429 || is503) && attempt < maxRetries) {
        // If 429 quota limit, we MUST wait for the bucket to refill
        const waitMs = is429 ? getRetryDelay(msg, 15000) : 5000 * (attempt + 1);
        
        if (onProgress) {
          onProgress({ 
            type: 'thinking', 
            message: `⏳ Google API busy or limit reached. Pausing for ${Math.round(waitMs / 1000)}s...` 
          });
        }
        await sleep(waitMs);
        // loop continues to retry
      } else {
        throw err; // Out of retries or unrecoverable error
      }
    }
  }
}

const SYSTEM_INSTRUCTION = `You are AgentFlow, a highly capable AI Productivity Assistant. You answer ANYTHING — questions about science, history, math, coding, or any topic.

You have specialist agents available via MCP tools:
- web_search: for current events, recent news, real-time data
- write_content: to write emails, blogs, reports
- summarize_text: to condense long text 
- create_task_plan: for project plans, study schedules, goals

RULES:
1. ONLY call tools for their specific explicit purpose. 
2. Answer general questions directly from your own knowledge (no tools).
3. Always produce a COMPLETE, well-formatted markdown answer.
4. If a tool fails, IGNORE the error and answer from your own knowledge. Never say you cannot help.`;

/**
 * Orchestrator Agent
 */
async function orchestrate(userMessage, onProgress) {
  if (onProgress) {
    onProgress({ type: 'thinking', message: '🧠 Orchestrator analyzing your request...' });
  }

  const getChat = (modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      tools: [{ functionDeclarations: mcpTools }],
      systemInstruction: SYSTEM_INSTRUCTION,
    });
    return model.startChat({ history: [] });
  };

  let chat;
  
  // Phase 1: First Request
  const firstResponse = await sendWithRetry(async (modelName) => {
    chat = getChat(modelName);
    return await chat.sendMessage(userMessage);
  }, 4, onProgress);

  let result = firstResponse.response;
  let loopCount = 0;

  // Phase 2: Agentic Loop
  while (result.functionCalls() && result.functionCalls().length > 0 && loopCount < 5) {
    loopCount++;
    const calls = result.functionCalls();
    const toolResults = [];

    for (const call of calls) {
      if (onProgress) {
         onProgress({ type: 'tool_call', tool: call.name, message: `🔗 MCP routing to ${call.name}...` });
      }
      try {
        const { content } = await mcpServer.executeTool(call.name, call.args, onProgress);
        toolResults.push({ functionResponse: { name: call.name, response: { content } } });
      } catch (toolErr) {
        console.error(`[Orchestrator] Tool ${call.name} error:`, toolErr.message);
        toolResults.push({
          functionResponse: {
            name: call.name,
            response: { content: `Tool error: ${toolErr.message}. Answer from own knowledge.` },
          },
        });
      }
    }

    if (onProgress) {
      onProgress({ type: 'synthesizing', message: '🧠 Orchestrator synthesizing results...' });
    }

    // Phase 3: Synthesis
    const synthResponse = await sendWithRetry(async (modelName) => {
      // Create new chat context with exact history to avoid turn-order errors
      const history = await chat.getHistory();
      const model = genAI.getGenerativeModel({
        model: modelName,
        tools: [{ functionDeclarations: mcpTools }],
        systemInstruction: SYSTEM_INSTRUCTION,
      });
      chat = model.startChat({ history });
      return await chat.sendMessage(toolResults);
    }, 4, onProgress);

    result = synthResponse.response;
  }

  return result.text();
}

module.exports = { orchestrate };
