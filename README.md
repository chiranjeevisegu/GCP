# 🤖 AgentFlow — Multi-Agent Productivity Assistant

> **GenAI APAC Hackathon · Multi-Agent Productivity Track**

An orchestrated team of specialist AI agents powered by **Google Gemini**, **Tavily Search**, and the **Model Context Protocol (MCP)**.

## 🏗️ Architecture

```
User  →  Express Server (SSE Stream)
              ↓
        Orchestrator Agent (Gemini 1.5 Flash)
              ↓ MCP Protocol
    ┌─────────┼──────────┬─────────────┐
    ▼         ▼          ▼             ▼
Research   Writer    Summarizer   Task Planner
(Tavily)  (Gemini)   (Gemini)     (Gemini)
```

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (live reload)
npm run dev

# 3. Open browser
open http://localhost:3000
```

## 🎯 Features

| Agent | Capability | Powered By |
|-------|-----------|------------|
| 🧠 Orchestrator | Routes requests via MCP function-calling | Gemini 1.5 Flash |
| 🔍 Research | Real-time web search with sources | Tavily API |
| ✍️ Writer | Emails, blog posts, reports, proposals | Gemini 1.5 Flash |
| 📋 Summarizer | Bullet points, executive summaries | Gemini 1.5 Flash |
| 📅 Task Planner | Roadmaps, milestones, priorities | Gemini 1.5 Flash |

## 💬 Demo Queries

1. `"Research the latest AI trends in 2025 and write a summary report"`
2. `"Create a 4-week product launch plan for a new SaaS app"`
3. `"Write a professional blog post about Multi-Agent AI systems"`
4. `"Summarize this text: [paste any long article]"`
5. `"Research top AI tools and create a 30-day adoption plan"` (multi-agent)

## 🔑 Environment Variables

```env
GEMINI_API_KEY=your_gemini_key_here
TAVILY_API_KEY=your_tavily_key_here
PORT=3000
```

## 📁 Project Structure

```
├── backend/
│   ├── agents/
│   │   ├── orchestrator.js    # Gemini function-calling orchestrator
│   │   ├── researchAgent.js   # Tavily web search
│   │   ├── writerAgent.js     # Content writing
│   │   ├── summaryAgent.js    # Summarization
│   │   └── taskAgent.js       # Task planning
│   ├── mcp/
│   │   ├── mcpTools.js        # MCP tool schemas
│   │   └── mcpServer.js       # MCP routing server
│   ├── routes/api.js          # REST + SSE endpoints
│   ├── config/config.js       # Environment config
│   └── server.js              # Express entry point
├── frontend/
│   ├── index.html             # SPA markup
│   ├── style.css              # Dark-mode glassmorphism styles
│   └── app.js                 # SSE streaming + UI logic
├── .env                       # API keys (gitignored)
└── package.json
```
