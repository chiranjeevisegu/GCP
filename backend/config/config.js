require('dotenv').config();

module.exports = {
  geminiApiKey: process.env.GEMINI_API_KEY,
  tavilyApiKey: process.env.TAVILY_API_KEY,
  port: parseInt(process.env.PORT) || 3000,
  // Model cascade — tried in order until one succeeds
  geminiModels: [
    'gemini-2.0-flash-001',   // most stable versioned build
    'gemini-2.0-flash',       // standard 2.0
    'gemini-2.0-flash-lite',  // lightweight fallback
    'gemini-2.5-flash',       // latest (sometimes overloaded)
  ],
};
