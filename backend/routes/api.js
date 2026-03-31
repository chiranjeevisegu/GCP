const express = require('express');
const router = express.Router();
const { orchestrate } = require('../agents/orchestrator');
const mcpServer = require('../mcp/mcpServer');

// Demo queries for the UI quick-launch buttons
const demoQueries = [
  {
    id: 1,
    label: 'AI Trends Research',
    query:
      'Research the latest AI and machine learning trends in 2025 and write a concise summary report',
    category: 'research',
  },
  {
    id: 2,
    label: 'Product Launch Plan',
    query:
      'Create a detailed 4-week product launch plan for a new AI-powered SaaS productivity app targeting remote teams',
    category: 'planning',
  },
  {
    id: 3,
    label: 'Write a Blog Post',
    query:
      'Write a professional blog post about how Multi-Agent AI systems are transforming enterprise productivity in 2025',
    category: 'writing',
  },
  {
    id: 4,
    label: 'Summarize Text',
    query:
      'Summarize the following into key executive bullet points: Artificial intelligence is rapidly transforming industries across the globe. From healthcare to finance, AI-powered tools are automating complex tasks, reducing costs, and improving outcomes. In healthcare, AI diagnostic tools can detect diseases earlier than human doctors. In finance, algorithmic trading systems execute millions of transactions per second. The retail sector uses AI for personalized recommendations that dramatically increase sales conversions. However, this rapid adoption also raises significant concerns about job displacement, data privacy, and algorithmic bias that society must urgently address.',
    category: 'summary',
  },
  {
    id: 5,
    label: 'Research + Plan',
    query:
      'Research the top 3 AI productivity tools of 2025, then create a 30-day action plan for adopting them in a startup team',
    category: 'multi-agent',
  },
];

// GET /api/agents/status
router.get('/agents/status', (req, res) => {
  res.json({
    success: true,
    agents: mcpServer.getAgentStatus(),
    timestamp: new Date().toISOString(),
  });
});

// GET /api/demo
router.get('/demo', (req, res) => {
  res.json({ success: true, demos: demoQueries });
});

// POST /api/chat — standard (non-streaming)
router.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }
  try {
    const response = await orchestrate(message, null);
    res.json({ success: true, response, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[API /chat]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/chat/stream — SSE streaming endpoint
router.get('/chat/stream', async (req, res) => {
  const { message } = req.query;
  if (!message) {
    return res.status(400).json({ success: false, error: 'Message query param is required' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendEvent('start', { message: 'Multi-agent system activated...', timestamp: new Date().toISOString() });

    const finalResponse = await orchestrate(message, (progress) => {
      sendEvent('progress', progress);
    });

    sendEvent('response', { text: finalResponse, timestamp: new Date().toISOString() });
    sendEvent('done', { message: 'All agents completed successfully' });
  } catch (error) {
    console.error('[API /chat/stream]', error);
    sendEvent('error', { message: error.message });
  } finally {
    res.end();
  }
});

module.exports = router;
