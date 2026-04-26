// src/public/charts.js — Dependency-free SVG chart helpers.

const COLORS = {
  blue: '#58a6ff',
  purple: '#bc8cff',
  green: '#3fb950',
  yellow: '#d29922',
  red: '#f85149',
  border: '#30363d',
  textDim: '#8b949e',
};

function colorForPct(pct) {
  if (pct >= 80) return COLORS.green;
  if (pct >= 50) return COLORS.yellow;
  return COLORS.red;
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function ensureTooltip(container) {
  let tip = container.querySelector('.chart-tooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'chart-tooltip';
    container.appendChild(tip);
  }
  return tip;
}

// Sparkline: accuracy over time.
// data = [{ bucket: '2026-04-20', pct: 85 }, ...]
export function sparkline(container, data, opts = {}) {
  if (!container) return;
  container.innerHTML = '';
  if (!data || data.length === 0) return;

  const width = opts.width || container.clientWidth || 400;
  const height = opts.height || 120;
  const padding = 20;

  const points = data.map((d, i) => ({
    x: padding + (i * (width - padding * 2)) / Math.max(1, data.length - 1),
    y: padding + (1 - (Number(d.pct) || 0) / 100) * (height - padding * 2),
    raw: d,
  }));

  const gradId = uid('spark-grad');
  const stroke = COLORS.blue;

  // For < 3 points, dots only.
  const showLine = points.length >= 3;

  let pathD = '';
  let areaD = '';
  if (showLine) {
    pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    areaD = pathD +
      ` L${points[points.length - 1].x.toFixed(1)},${(height - padding).toFixed(1)}` +
      ` L${points[0].x.toFixed(1)},${(height - padding).toFixed(1)} Z`;
  }

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', height);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Quiz accuracy over time');

  svg.innerHTML = `
    <defs>
      <linearGradient id="${gradId}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${stroke}" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="${stroke}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${[0, 25, 50, 75, 100].map((g) => {
      const y = padding + (1 - g / 100) * (height - padding * 2);
      return `<line x1="${padding}" x2="${width - padding}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"
                stroke="${COLORS.border}" stroke-width="0.5" stroke-dasharray="2,3"/>`;
    }).join('')}
    ${showLine ? `<path d="${areaD}" fill="url(#${gradId})"/>` : ''}
    ${showLine ? `<path d="${pathD}" fill="none" stroke="${stroke}" stroke-width="2"
                       stroke-linecap="round" stroke-linejoin="round"/>` : ''}
    ${points.map((p) => `
      <circle class="spark-dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5"
              fill="${COLORS.blue}" stroke="#0d1117" stroke-width="2"
              data-bucket="${p.raw.bucket}" data-pct="${Math.round(Number(p.raw.pct) || 0)}"/>
    `).join('')}
  `;

  container.appendChild(svg);

  const tip = ensureTooltip(container);
  svg.querySelectorAll('.spark-dot').forEach((dot) => {
    dot.addEventListener('mouseenter', (e) => {
      const cx = parseFloat(dot.getAttribute('cx'));
      const cy = parseFloat(dot.getAttribute('cy'));
      const ratio = container.clientWidth / width;
      tip.style.left = `${cx * ratio}px`;
      tip.style.top = `${cy * ratio}px`;
      tip.textContent = `${dot.dataset.bucket} • ${dot.dataset.pct}%`;
      tip.classList.add('visible');
    });
    dot.addEventListener('mouseleave', () => tip.classList.remove('visible'));
  });
}

// Horizontal bar chart: per-topic accuracy.
// data = [{ topic_id, pct, total, correct }, ...]
export function barChart(container, data, opts = {}) {
  if (!container) return;
  container.innerHTML = '';
  if (!data || data.length === 0) return;

  const sorted = [...data].sort((a, b) => (Number(b.pct) || 0) - (Number(a.pct) || 0)).slice(0, 8);

  const rowHeight = 28;
  const labelWidth = 130;
  const countWidth = 50;
  const width = opts.width || container.clientWidth || 400;
  const height = sorted.length * rowHeight + 8;
  const barAreaWidth = Math.max(40, width - labelWidth - countWidth - 12);

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', height);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Per-topic quiz accuracy');

  svg.innerHTML = sorted.map((d, i) => {
    const pct = Math.max(0, Math.min(100, Number(d.pct) || 0));
    const y = i * rowHeight + 4;
    const barWidth = (pct / 100) * barAreaWidth;
    const color = colorForPct(pct);
    const label = String(d.topic_id || '').slice(0, 16);
    const count = `${d.correct ?? Math.round((pct / 100) * (d.total || 0))}/${d.total || 0}`;
    return `
      <g>
        <text x="0" y="${y + rowHeight / 2}" dominant-baseline="middle"
              fill="${COLORS.textDim}" font-size="12" font-family="system-ui, sans-serif">${escapeXml(label)}</text>
        <rect x="${labelWidth}" y="${y + 6}" width="${barAreaWidth}" height="${rowHeight - 14}"
              fill="${COLORS.border}" rx="3" opacity="0.4"/>
        <rect x="${labelWidth}" y="${y + 6}" width="${barWidth.toFixed(1)}" height="${rowHeight - 14}"
              fill="${color}" rx="3">
          <animate attributeName="width" from="0" to="${barWidth.toFixed(1)}" dur="0.6s" fill="freeze"/>
        </rect>
        <text x="${labelWidth + barAreaWidth + 8}" y="${y + rowHeight / 2}" dominant-baseline="middle"
              fill="${COLORS.textDim}" font-size="11" font-family="system-ui, sans-serif">${count}</text>
      </g>
    `;
  }).join('');

  container.appendChild(svg);
}

// Progress ring rendered into a container element.
export function progressRing(container, pct, opts = {}) {
  if (!container) return;
  container.innerHTML = '';

  const size = opts.size || container.clientWidth || 72;
  const stroke = opts.stroke || 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = Math.max(0, Math.min(100, Number(pct) || 0));
  const offset = circumference * (1 - value / 100);
  const color = colorForPct(value);

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${value}%`);

  svg.innerHTML = `
    <circle cx="${size / 2}" cy="${size / 2}" r="${radius}"
            fill="none" stroke="${COLORS.border}" stroke-width="${stroke}" opacity="0.5"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${radius}"
            fill="none" stroke="${color}" stroke-width="${stroke}"
            stroke-linecap="round"
            stroke-dasharray="${circumference.toFixed(2)}"
            stroke-dashoffset="${circumference.toFixed(2)}"
            transform="rotate(-90 ${size / 2} ${size / 2})">
      <animate attributeName="stroke-dashoffset"
               from="${circumference.toFixed(2)}"
               to="${offset.toFixed(2)}"
               dur="0.8s" fill="freeze"
               calcMode="spline" keySplines="0.22 1 0.36 1"/>
    </circle>
    <text x="${size / 2}" y="${size / 2}" dominant-baseline="central" text-anchor="middle"
          fill="#e6edf3" font-size="${Math.max(12, size / 4)}" font-weight="600"
          font-family="system-ui, sans-serif">${value}%</text>
  `;

  container.appendChild(svg);
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
