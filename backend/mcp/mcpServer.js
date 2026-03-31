const researchAgent = require('../agents/researchAgent');
const writerAgent = require('../agents/writerAgent');
const summaryAgent = require('../agents/summaryAgent');
const taskAgent = require('../agents/taskAgent');

/**
 * MCP Server — routes tool calls to the appropriate specialist agent.
 * Wraps tool results in the correct { content: string } format
 * that the Gemini functionResponse API requires.
 */
class MCPServer {
  constructor() {
    this.agents = {
      web_search: researchAgent,
      write_content: writerAgent,
      summarize_text: summaryAgent,
      create_task_plan: taskAgent,
    };
    this.agentMeta = {
      web_search: { name: 'Research Agent', icon: 'search', color: '#6366f1' },
      write_content: { name: 'Writer Agent', icon: 'pen-tool', color: '#10b981' },
      summarize_text: { name: 'Summary Agent', icon: 'file-text', color: '#f59e0b' },
      create_task_plan: { name: 'Task Agent', icon: 'calendar', color: '#ec4899' },
    };
  }

  /**
   * Execute a tool call from the orchestrator.
   * Returns { content: string } — the format Gemini expects in functionResponse.
   */
  async executeTool(toolName, args, onProgress) {
    const agent = this.agents[toolName];
    const meta = this.agentMeta[toolName];

    if (!agent) {
      throw new Error(`MCP: Unknown tool "${toolName}"`);
    }

    if (onProgress) {
      onProgress({
        type: 'agent_start',
        agent: meta.name,
        icon: meta.icon,
        tool: toolName,
        message: `${meta.name} activated via MCP...`,
      });
    }

    let rawResult;
    switch (toolName) {
      case 'web_search':
        rawResult = await agent.search(args.query, args.max_results || 5);
        break;
      case 'write_content':
        rawResult = await agent.write(args.content_type, args.topic, args.context || '', args.tone || 'professional');
        break;
      case 'summarize_text':
        rawResult = await agent.summarize(args.text, args.format || 'bullets', args.max_points || 5);
        break;
      case 'create_task_plan':
        rawResult = await agent.createPlan(args.goal, args.timeframe || 'flexible', args.team_size || 1, args.context || '');
        break;
      default:
        rawResult = 'Tool not found';
    }

    if (onProgress) {
      onProgress({
        type: 'agent_done',
        agent: meta.name,
        icon: meta.icon,
        tool: toolName,
        message: `${meta.name} completed`,
      });
    }

    // Ensure the result is always a string (Gemini tool results must be strings)
    const content = typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult);
    return { content };
  }

  getAgentStatus() {
    return Object.entries(this.agentMeta).map(([tool, meta]) => ({
      tool,
      name: meta.name,
      icon: meta.icon,
      color: meta.color,
      status: 'ready',
    }));
  }
}

module.exports = new MCPServer();
