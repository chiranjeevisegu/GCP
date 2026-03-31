require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');
const apiRoutes = require('./routes/api');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Multi-Agent Productivity Assistant',
    version: '1.0.0',
    agents: ['Orchestrator', 'Research', 'Writer', 'Summary', 'Task Planner'],
    protocol: 'MCP (Model Context Protocol)',
    timestamp: new Date().toISOString(),
  });
});

// Fallback: serve frontend for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
app.listen(config.port, () => {
  console.log(`\n🚀 Multi-Agent Productivity Assistant`);
  console.log(`   Protocol: MCP (Model Context Protocol)`);
  console.log(`   Server:   http://localhost:${config.port}`);
  console.log(`   Agents:   Orchestrator · Research · Writer · Summary · Task`);
  console.log(`   LLM:      Google Gemini 2.0 Flash Lite`);
  console.log(`   Search:   Tavily API\n`);
});
