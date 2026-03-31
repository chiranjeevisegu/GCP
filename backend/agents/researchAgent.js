const config = require('../config/config');

const TAVILY_API_URL = 'https://api.tavily.com/search';

/**
 * Research Agent — powered by Tavily Search API.
 * api_key goes in the REQUEST BODY — that is what Tavily requires.
 */
async function search(query, maxResults = 5) {
  try {
    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: config.tavilyApiKey,   // ← Tavily key belongs in the body
        query,
        max_results: maxResults,
        search_depth: 'advanced',
        include_answer: true,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Tavily API error (${response.status}): ${err}`);
    }

    const data = await response.json();

    const result = {
      answer: data.answer || '',
      sources: (data.results || []).map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.content ? r.content.slice(0, 500) : '',
      })),
      query: data.query || query,
    };

    return JSON.stringify(result);
  } catch (error) {
    console.error('[ResearchAgent] Error:', error.message);
    // Return a descriptive error string so Gemini can still try to help
    return JSON.stringify({
      error: true,
      message: `Web search failed: ${error.message}. Please answer from your own knowledge.`,
      query,
    });
  }
}

module.exports = { search };
