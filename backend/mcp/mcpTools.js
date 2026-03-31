/**
 * MCP Tool Definitions
 * These are the tool schemas used by the Orchestrator Agent
 * to decide which specialist agent to invoke.
 */

const mcpTools = [
  {
    name: 'web_search',
    description:
      'Search the web for real-time information, news, trends, and facts using Tavily. Use this when the user needs up-to-date information on any topic.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to look up on the web',
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of search results to return (default: 5)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'write_content',
    description:
      'Write structured content like emails, blog posts, reports, proposals, or any other document. Use this when the user needs help creating written content.',
    parameters: {
      type: 'object',
      properties: {
        content_type: {
          type: 'string',
          description:
            'Type of content to write (e.g., "email", "blog post", "report", "proposal", "summary")',
        },
        topic: {
          type: 'string',
          description: 'The main topic or subject of the content',
        },
        context: {
          type: 'string',
          description: 'Additional context, requirements, or instructions for writing the content',
        },
        tone: {
          type: 'string',
          description: 'The tone of the content (e.g., "professional", "casual", "persuasive")',
        },
      },
      required: ['content_type', 'topic'],
    },
  },
  {
    name: 'summarize_text',
    description:
      'Summarize long text, articles, documents, or any content into concise key points. Use this when the user needs to condense information.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text or content to summarize',
        },
        format: {
          type: 'string',
          description:
            'Output format: "bullets" for bullet points, "paragraph" for prose, "executive" for executive summary',
        },
        max_points: {
          type: 'number',
          description: 'Maximum number of key points to include (default: 5)',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'create_task_plan',
    description:
      'Break down a goal or project into a structured, actionable task plan with steps, priorities, and time estimates. Use this when the user needs help planning or project management.',
    parameters: {
      type: 'object',
      properties: {
        goal: {
          type: 'string',
          description: 'The main goal or objective to plan for',
        },
        timeframe: {
          type: 'string',
          description: 'The target timeframe (e.g., "1 week", "1 month", "sprint")',
        },
        team_size: {
          type: 'number',
          description: 'Number of people working on this (default: 1)',
        },
        context: {
          type: 'string',
          description: 'Additional context about the project or constraints',
        },
      },
      required: ['goal'],
    },
  },
];

module.exports = mcpTools;
