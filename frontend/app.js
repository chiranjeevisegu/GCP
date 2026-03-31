/**
 * AgentFlow — Frontend App Logic
 * Handles SSE streaming, markdown rendering, agent animations, demo queries
 */

let isProcessing = false;
let currentEventSource = null;

// ── Startup ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  lucide.createIcons();
  await checkServerStatus();
  await loadDemoQueries();
  setupTextareaKeydown();
});

async function checkServerStatus() {
  try {
    const res = await fetch('/health');
    if (res.ok) {
      document.getElementById('serverStatus').classList.add('online');
    }
  } catch {
    // server offline — dot stays grey
  }
}

async function loadDemoQueries() {
  const grid = document.getElementById('demoGrid');
  try {
    const res = await fetch('/api/demo');
    const data = await res.json();
    grid.innerHTML = '';
    data.demos.forEach((demo) => {
      const btn = document.createElement('button');
      btn.className = 'demo-btn';
      btn.id = `demo-${demo.id}`;
      // Add a dynamic icon based on category or default to zap
      let icon = 'zap';
      if (demo.category === 'research') icon = 'search';
      if (demo.category === 'planning') icon = 'calendar';
      if (demo.category === 'writing') icon = 'pen-tool';
      if (demo.category === 'summary') icon = 'file-text';
      if (demo.category === 'multi-agent') icon = 'layers';

      btn.innerHTML = `<i data-lucide="${icon}" width="14" height="14" style="display:inline-block;vertical-align:-2px;margin-right:6px;"></i>${escapeHtml(demo.label)}`;
      btn.onclick = () => launchDemo(demo.query);
      grid.appendChild(btn);
    });
    lucide.createIcons();
  } catch {
    grid.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem;">Could not load demos — is the server running?</span>';
  }
}

function setupTextareaKeydown() {
  const textarea = document.getElementById('chatInput');
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

// ── Send Message (public, called from HTML onclick) ──────────────────
function sendMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message || isProcessing) return;
  input.value = '';
  startStreaming(message);
}

function launchDemo(query) {
  if (isProcessing) return;
  document.getElementById('chatInput').value = query;
  startStreaming(query);
}

// ── SSE Streaming ────────────────────────────────────────────────────
function startStreaming(message) {
  if (currentEventSource) {
    currentEventSource.close();
  }

  isProcessing = true;
  setLoading(true);
  clearActivity();
  showResultLoading();
  resetAllAgents();

  const url = `/api/chat/stream?message=${encodeURIComponent(message)}`;
  currentEventSource = new EventSource(url);

  currentEventSource.addEventListener('start', (e) => {
    const data = JSON.parse(e.data);
    addActivity('thinking', data.message);
    activateAgent('orchestrator');
  });

  currentEventSource.addEventListener('progress', (e) => {
    const data = JSON.parse(e.data);
    addActivity(data.type, data.message);
    handleAgentProgress(data);
  });

  currentEventSource.addEventListener('response', (e) => {
    const data = JSON.parse(e.data);
    renderResult(message, data.text, data.timestamp);
  });

  currentEventSource.addEventListener('done', (e) => {
    const data = JSON.parse(e.data);
    addActivity('done', data.message);
    resetAllAgents();
    setLoading(false);
    isProcessing = false;
    currentEventSource.close();
  });

  currentEventSource.addEventListener('error', (e) => {
    let msg = 'An error occurred';
    try { msg = JSON.parse(e.data).message; } catch {}
    addActivity('error', msg);
    showResultError(msg);
    resetAllAgents();
    setLoading(false);
    isProcessing = false;
    currentEventSource.close();
  });

  currentEventSource.onerror = () => {
    if (!isProcessing) return;
    addActivity('error', 'Connection error — is the server running?');
    showResultError('Connection error. Make sure `npm run dev` is running.');
    resetAllAgents();
    setLoading(false);
    isProcessing = false;
    currentEventSource.close();
  };
}

// ── Agent Animation ───────────────────────────────────────────────────
const TOOL_TO_AGENT = {
  web_search: 'research',
  write_content: 'writer',
  summarize_text: 'summary',
  create_task_plan: 'task',
};

function handleAgentProgress(data) {
  if (data.type === 'agent_start') {
    const agentKey = TOOL_TO_AGENT[data.tool];
    if (agentKey) activateAgent(agentKey);
  } else if (data.type === 'agent_done') {
    const agentKey = TOOL_TO_AGENT[data.tool];
    if (agentKey) deactivateAgent(agentKey);
  } else if (data.type === 'synthesizing') {
    activateAgent('orchestrator');
  }
}

function activateAgent(key) {
  const card = document.getElementById(`agent-${key}`);
  if (!card) return;
  card.classList.add('active');
  const pill = card.querySelector('.agent-status-pill');
  if (pill) {
    pill.textContent = 'Active';
    pill.className = 'agent-status-pill busy';
  }
}

function deactivateAgent(key) {
  const card = document.getElementById(`agent-${key}`);
  if (!card) return;
  card.classList.remove('active');
  const pill = card.querySelector('.agent-status-pill');
  if (pill) {
    pill.textContent = 'Done ✓';
    pill.className = 'agent-status-pill ready';
    pill.style.color = 'var(--accent-green)';
  }
}

function resetAllAgents() {
  ['orchestrator', 'research', 'writer', 'summary', 'task'].forEach((key) => {
    const card = document.getElementById(`agent-${key}`);
    if (!card) return;
    card.classList.remove('active');
    const pill = card.querySelector('.agent-status-pill');
    if (pill) {
      pill.textContent = 'Ready';
      pill.className = 'agent-status-pill ready';
      pill.style.color = '';
    }
  });
}

// ── Activity Feed ────────────────────────────────────────────────────
function clearActivity() {
  document.getElementById('activityFeed').innerHTML = '';
}

function addActivity(type, message) {
  const feed = document.getElementById('activityFeed');
  // Remove placeholder if present
  const placeholder = feed.querySelector('.activity-placeholder');
  if (placeholder) placeholder.remove();

  const item = document.createElement('div');
  item.className = `activity-item ${type}`;

  // Assign dynamic icon mapping for activity items
  let iconName = 'activity';
  if (type === 'thinking') iconName = 'loader';
  else if (type === 'agent_start') iconName = 'play-circle';
  else if (type === 'agent_done') iconName = 'check-circle';
  else if (type === 'tool_call') iconName = 'settings';
  else if (type === 'synthesizing') iconName = 'cpu';
  else if (type === 'done') iconName = 'check-square';
  else if (type === 'error') iconName = 'alert-triangle';

  const iconClass = type === 'thinking' ? 'spin-icon' : '';
  
  item.innerHTML = `
    <i data-lucide="${iconName}" width="14" height="14" class="${iconClass}" style="flex-shrink:0;margin-top:2px;"></i>
    <div>${escapeHtml(message)}</div>
  `;
  
  feed.appendChild(item);
  feed.scrollTop = feed.scrollHeight;
  lucide.createIcons();
}

// ── Result Rendering ─────────────────────────────────────────────────
function showResultLoading() {
  const area = document.getElementById('resultArea');
  area.innerHTML = `
    <div class="result-content">
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:200px;gap:1rem;color:var(--text-muted);">
        <div style="width:40px;height:40px;border:3px solid rgba(99,102,241,0.2);border-top-color:var(--accent-purple);border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        <div style="font-size:0.85rem;">Agents processing your request...</div>
      </div>
    </div>`;
}

function showResultError(message) {
  const area = document.getElementById('resultArea');
  area.innerHTML = `
    <div class="result-content" style="color:var(--text-muted);text-align:center;padding:3rem;">
      <div style="margin-bottom:1rem;display:flex;justify-content:center;"><i data-lucide="x-circle" width="48" height="48" style="color:var(--accent-pink)"></i></div>
      <div style="font-size:0.9rem;">${escapeHtml(message)}</div>
    </div>`;
  lucide.createIcons();
}

function renderResult(query, rawText, timestamp) {
  const area = document.getElementById('resultArea');
  const timeStr = new Date(timestamp).toLocaleTimeString();

  // Try to extract sources from text if it mentions URLs
  const html = markdownToHtml(rawText);

  area.innerHTML = `
    <div class="result-content">
      <div class="result-header">
        <i data-lucide="bot" width="24" height="24" style="color:var(--accent-purple)"></i>
        <div class="result-title">AgentFlow Response</div>
        <span class="result-time">${timeStr}</span>
      </div>
      <div class="result-body" id="resultBody"></div>
    </div>`;

  document.getElementById('resultBody').innerHTML = html;
  lucide.createIcons();
}

// ── Minimal Markdown → HTML ───────────────────────────────────────────
function markdownToHtml(md) {
  let html = escapeHtml(md);

  // Code blocks (must come before inline code)
  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) =>
    `<pre><code>${code.trim()}</code></pre>`);

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr>');

  // Blockquote
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // Checkbox lists
  html = html.replace(/^- \[ \] (.+)$/gm, '<li>☐ $1</li>');
  html = html.replace(/^- \[x\] (.+)$/gm, '<li style="color:var(--accent-green)">☑ $1</li>');

  // Unordered lists
  html = html.replace(/^[\*\-] (.+)$/gm, '<li>$1</li>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Paragraphs — wrap bare lines
  html = html.split('\n\n').map((block) => {
    block = block.trim();
    if (!block) return '';
    if (/^<(h[1-6]|ul|ol|li|pre|hr|blockquote|table)/.test(block)) return block;
    return `<p>${block.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  return html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── UI Helpers ────────────────────────────────────────────────────────
function setLoading(loading) {
  const btn = document.getElementById('sendBtn');
  const btnText = document.getElementById('sendBtnText');
  const spinner = document.getElementById('sendSpinner');

  btn.disabled = loading;
  if (loading) {
    btnText.classList.add('hidden');
    spinner.classList.remove('hidden');
  } else {
    btnText.classList.remove('hidden');
    spinner.classList.add('hidden');
  }
}
