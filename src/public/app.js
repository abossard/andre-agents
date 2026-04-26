// src/public/app.js — Learning-First SPA dashboard.
import { sparkline, barChart, progressRing } from '/app/charts.js';

// === State ===
const state = {
  connected: false,
  loading: true,
  profile: null,
  repos: [],
  quizHistory: [],
  quizByTopic: [],
  reviews: [],
  curricula: [],
  currentRepo: null,
  error: null,
};

// === SSE ===
let sseSource = null;
function connectSSE() {
  try {
    if (sseSource) sseSource.close();
    sseSource = new EventSource('/api/v1/sse');
    sseSource.onopen = () => { state.connected = true; render(); };
    sseSource.onerror = () => { state.connected = false; render(); };
    sseSource.onmessage = (e) => {
      let data;
      try { data = JSON.parse(e.data); } catch { return; }
      const types = ['page-update', 'topic-update', 'quiz-recorded', 'achievement-earned'];
      if (types.includes(data.type)) loadAll();
    };
  } catch {
    state.connected = false;
  }
}

// === Data fetching ===
async function api(path) {
  const url = `/api/v1${path}${state.currentRepo ? (path.includes('?') ? '&' : '?') + 'repo=' + encodeURIComponent(state.currentRepo) : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${res.status} on ${path}`);
  return res.json();
}

async function loadAll() {
  try {
    const [profile, repos, quizHistory, quizByTopic, reviews] = await Promise.all([
      api('/profile'),
      api('/repos'),
      api('/quiz/history?bucket=day'),
      api('/quiz/by-topic'),
      api('/review/next-due?limit=10'),
    ]);
    Object.assign(state, {
      profile: profile || { topics: [], achievements: [] },
      repos: Array.isArray(repos) ? repos : [],
      quizHistory: Array.isArray(quizHistory) ? quizHistory : [],
      quizByTopic: Array.isArray(quizByTopic) ? quizByTopic : [],
      reviews: Array.isArray(reviews) ? reviews : [],
      loading: false,
      error: null,
    });
  } catch (err) {
    state.error = err.message;
    state.loading = false;
  }
  render();
}

// === Rendering ===
function render() {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    ${renderHeader()}
    ${state.error ? renderError() : ''}
    ${state.loading ? renderSkeleton() : renderDashboard()}
  `;
  if (!state.loading) initCharts();
  bindEvents();
}

function renderHeader() {
  return `
    <header class="header">
      <div class="header-left">
        <h1>🎓 Learning-First</h1>
        <span class="sse-indicator ${state.connected ? 'connected' : 'disconnected'}"
              title="${state.connected ? 'Live updates connected' : 'Disconnected'}"></span>
      </div>
      <div class="header-right">
        ${(state.repos && state.repos.length > 1) ? renderRepoSwitcher() : ''}
      </div>
    </header>
  `;
}

function renderRepoSwitcher() {
  const current = state.currentRepo || '';
  return `
    <select class="repo-switcher" id="repo-switcher" aria-label="Select repository">
      <option value="">All repos</option>
      ${state.repos.map((r) => {
        const id = typeof r === 'string' ? r : (r.repo_id || r.id || '');
        return `<option value="${escapeAttr(id)}" ${id === current ? 'selected' : ''}>${escapeHtml(id)}</option>`;
      }).join('')}
    </select>
  `;
}

function renderError() {
  return `<div class="error-banner">⚠ ${escapeHtml(state.error)}</div>`;
}

function renderSkeleton() {
  return `
    <div class="skeleton-grid">
      <div class="skeleton"></div>
      <div class="skeleton"></div>
      <div class="skeleton"></div>
      <div class="skeleton"></div>
    </div>
  `;
}

function renderDashboard() {
  const p = state.profile;
  const noData = !p || ((p.topics?.length || 0) === 0 && (p.achievements?.length || 0) === 0
    && state.quizByTopic.length === 0 && state.reviews.length === 0);
  if (noData) return renderEmptyState();
  return `
    <main class="dashboard">
      ${renderKPIStrip()}
      <div class="grid">
        ${renderQuizPanel()}
        ${renderReviewPanel()}
        ${renderCurriculumPanel()}
        ${renderAchievementsPanel()}
      </div>
    </main>
  `;
}

function renderEmptyState() {
  return `
    <main class="empty-hero">
      <div class="empty-icon">🚀</div>
      <h2>Welcome to Learning-First!</h2>
      <p>Your knowledge dashboard is ready. Start a learning session in the CLI:</p>
      <pre class="code-block"><code>&gt; Add authentication to the API</code></pre>
      <p class="subtle">As you learn, your progress will appear here automatically.</p>
      <div class="features-grid">
        <div class="feature"><span class="feature-icon">📊</span><span>Quiz Performance</span></div>
        <div class="feature"><span class="feature-icon">🔄</span><span>Spaced Repetition</span></div>
        <div class="feature"><span class="feature-icon">📚</span><span>Curriculum Progress</span></div>
        <div class="feature"><span class="feature-icon">🏆</span><span>Achievements</span></div>
      </div>
    </main>
  `;
}

function renderKPIStrip() {
  const p = state.profile || { topics: [], achievements: [] };
  const topics = p.topics || [];
  const topicCount = topics.length;
  const masteredCount = topics.filter((t) => t.status === 'mastered').length;
  const masteryPct = topicCount ? Math.round((100 * masteredCount) / topicCount) : 0;

  const stats = state.quizByTopic;
  const totalQuizzes = stats.reduce((s, t) => s + (Number(t.total) || 0), 0);
  const totalCorrect = stats.reduce((s, t) => s + (Number(t.correct) || 0), 0);
  const quizPct = totalQuizzes ? Math.round((100 * totalCorrect) / totalQuizzes) : 0;

  return `
    <div class="kpi-strip">
      <div class="kpi">
        <div class="kpi-value">${topicCount}</div>
        <div class="kpi-label">Topics</div>
      </div>
      <div class="kpi">
        <div class="kpi-ring" id="mastery-ring" data-pct="${masteryPct}"></div>
        <div class="kpi-label">Mastery</div>
      </div>
      <div class="kpi">
        <div class="kpi-ring" id="quiz-ring" data-pct="${quizPct}"></div>
        <div class="kpi-label">Quiz Accuracy</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">${(p.achievements || []).length}</div>
        <div class="kpi-label">Achievements</div>
      </div>
    </div>
  `;
}

function renderQuizPanel() {
  const history = state.quizHistory;
  const byTopic = state.quizByTopic;
  if (!history.length && !byTopic.length) {
    return `
      <div class="card">
        <h3>📊 Quiz Performance</h3>
        <div class="empty-state"><p>Complete your first quiz to see performance data</p></div>
      </div>
    `;
  }
  return `
    <div class="card card-wide">
      <h3>📊 Quiz Performance</h3>
      ${history.length >= 1 ? '<div id="quiz-sparkline" class="chart-container"></div>' : ''}
      ${byTopic.length ? '<div id="quiz-by-topic" class="chart-container"></div>' : ''}
    </div>
  `;
}

function renderReviewPanel() {
  const reviews = state.reviews;
  if (!reviews.length) {
    return `
      <div class="card">
        <h3>🔄 Due Reviews</h3>
        <div class="empty-state"><p>No reviews due — you're all caught up! 🎉</p></div>
      </div>
    `;
  }
  return `
    <div class="card">
      <h3>🔄 Due Reviews <span class="badge">${reviews.length}</span></h3>
      <ul class="review-list">
        ${reviews.map((r) => {
          const depth = Number(r.depth_level || r.depth || 1);
          const pillClass = depth > 2 ? 'pill-advanced' : 'pill-basic';
          return `
            <li class="review-item">
              <span class="review-title">${escapeHtml(r.title || r.topic_id || 'topic')}</span>
              <span class="pill ${pillClass}">${escapeHtml(r.domain || 'general')}</span>
            </li>
          `;
        }).join('')}
      </ul>
    </div>
  `;
}

function renderCurriculumPanel() {
  const topics = state.profile?.topics || [];
  const inProgress = topics.filter((t) => t.status === 'in_progress' || t.status === 'mastered').slice(0, 6);
  if (!inProgress.length) {
    return `
      <div class="card">
        <h3>📚 Active Curricula</h3>
        <div class="empty-state"><p>Start a learning task to see curriculum progress</p></div>
      </div>
    `;
  }
  return `
    <div class="card">
      <h3>📚 Active Curricula</h3>
      <ul class="review-list">
        ${inProgress.map((t) => {
          const pct = t.status === 'mastered' ? 100 : Math.min(99, Math.round(((Number(t.depth_level) || 1) / 4) * 100));
          const fillClass = t.status === 'mastered' ? 'success' : (pct >= 50 ? 'warning' : '');
          return `
            <li class="review-item" style="flex-direction: column; align-items: stretch; gap: 8px;">
              <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
                <span class="review-title">${escapeHtml(t.title || t.id)}</span>
                <span class="pill pill-${escapeAttr(t.status || 'not_started')}">${escapeHtml(t.status || 'not_started')}</span>
              </div>
              <div class="progress-bar"><div class="progress-bar-fill ${fillClass}" style="width: ${pct}%"></div></div>
            </li>
          `;
        }).join('')}
      </ul>
    </div>
  `;
}

function renderAchievementsPanel() {
  const achievements = state.profile?.achievements || [];
  if (!achievements.length) {
    return `
      <div class="card">
        <h3>🏆 Achievements</h3>
        <div class="empty-state"><p>Your first achievement is waiting!</p></div>
      </div>
    `;
  }
  return `
    <div class="card">
      <h3>🏆 Achievements <span class="badge">${achievements.length}</span></h3>
      <div class="achievements-grid">
        ${achievements.map((a) => `
          <div class="achievement">
            <div class="achievement-title">${escapeHtml(a.title || a.id || 'Achievement')}</div>
            <div class="achievement-desc">${escapeHtml(a.description || '')}</div>
            <div class="achievement-date">${a.earned_at ? new Date(a.earned_at).toLocaleDateString() : ''}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function initCharts() {
  const sparkContainer = document.getElementById('quiz-sparkline');
  if (sparkContainer && state.quizHistory.length) {
    sparkline(sparkContainer, state.quizHistory);
  }
  const barContainer = document.getElementById('quiz-by-topic');
  if (barContainer && state.quizByTopic.length) {
    barChart(barContainer, state.quizByTopic);
  }
  document.querySelectorAll('.kpi-ring').forEach((el) => {
    const pct = parseInt(el.dataset.pct, 10) || 0;
    progressRing(el, pct);
  });
}

function bindEvents() {
  const sw = document.getElementById('repo-switcher');
  if (sw) {
    sw.addEventListener('change', (e) => {
      state.currentRepo = e.target.value || null;
      state.loading = true;
      render();
      loadAll();
    });
  }
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeAttr(s) { return escapeHtml(s); }

// === Boot ===
function boot() {
  connectSSE();
  loadAll();
  window.addEventListener('focus', loadAll);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
