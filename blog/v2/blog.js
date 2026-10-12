'use strict';

document.documentElement.classList.add('js');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealObserver = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    entry.target.classList.add('visible');
    revealObserver.unobserve(entry.target);
  }
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

const progress = document.querySelector('#reading-progress');
function updateReadingProgress() {
  const total = document.documentElement.scrollHeight - innerHeight;
  progress.style.width = `${total > 0 ? Math.min(100, scrollY / total * 100) : 0}%`;
}
addEventListener('scroll', updateReadingProgress, { passive: true });
addEventListener('resize', updateReadingProgress);

const state = { backbone: 'sd35m', metric: 'reward', smooth: false,
  visible: new Set(['v1', 'v2']), tableBackbone: 'sd35m', tableScope: 'opsd' };
let dataset;
let chartId = 0;
let activeCharts = [];
const precision = [2, 3, 3, 2, 2, 2, 2, 3, 3, 3];
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const format = value => value == null ? '—' : Math.abs(value) >= 10 ? value.toFixed(3) : value.toFixed(4);
const tickFormat = value => Math.abs(value) >= 10 ? value.toFixed(1) : Math.abs(value) >= 1 ? value.toFixed(2) : value.toFixed(3);
const metricNames = { reward: 'Native training reward', loss: 'Total training loss', positive: 'Positive fitting loss', negative: 'Negative fitting loss' };

function smooth(points) {
  let last;
  return points.map(([x, y]) => {
    last = last === undefined ? y : 0.6 * last + 0.4 * y;
    return [x, last];
  });
}

function makeChart(host, task, options = {}) {
  const hero = Boolean(options.hero);
  const metric = hero ? 'reward' : state.metric;
  const visible = hero ? new Set(['v1', 'v2']) : state.visible;
  const smoothed = !hero && state.smooth;
  const width = hero ? 560 : 470;
  const height = hero ? 200 : 230;
  const margins = hero ? { left: 12, right: 17, top: 16, bottom: 33 } : { left: 49, right: 14, top: 12, bottom: 33 };
  const plotWidth = width - margins.left - margins.right;
  const plotHeight = height - margins.top - margins.bottom;
  const id = `plot-clip-${++chartId}`;
  const series = ['v1', 'v2'].filter(version => visible.has(version)).map(version => {
    const original = task[version][metric];
    const hours = new Map(task[version].timeHours || []);
    const points = hero ? original.map(([epoch, value]) => [hours.get(epoch), value]) : original;
    return { version, original, points, plotted: smoothed ? smooth(points) : points };
  });
  const domain = hero ? Math.ceil(Math.max(...series.flatMap(s => s.points.map(p => p[0]))) / 4) * 4 : task.budget - 1;
  const values = series.flatMap(s => s.points.map(p => p[1]));
  if (!values.length) {
    host.innerHTML = '<p class="loading">No recorded values for this metric.</p>';
    return null;
  }
  const min = Math.min(...values), max = Math.max(...values);
  const pad = Math.max((max - min) * 0.13, Math.abs(max) * 0.015, 0.0001);
  const lower = min - pad, upper = max + pad;
  const x = value => margins.left + value / domain * plotWidth;
  const y = value => margins.top + (upper - value) / (upper - lower) * plotHeight;
  const path = points => points.map(([px, py], i) => `${i ? 'L' : 'M'}${x(px).toFixed(2)},${y(py).toFixed(2)}`).join(' ');
  let axes = '';
  for (let i = 0; i < 3; i++) {
    const value = lower + (upper - lower) * i / 2;
    axes += `<line class="chart-grid" x1="${margins.left}" x2="${width - margins.right}" y1="${y(value)}" y2="${y(value)}"/>`;
    if (!hero) axes += `<text class="axis-text" text-anchor="end" x="${margins.left - 9}" y="${y(value) + 3}">${tickFormat(value)}</text>`;
  }
  for (const fraction of (hero ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.5, 1])) {
    const value = hero ? domain * fraction : Math.round(domain * fraction);
    axes += `<text class="axis-text" text-anchor="middle" x="${x(value)}" y="${height - 14}">${value}${hero ? ' h' : ''}</text>`;
  }
  if (!hero) axes += `<text class="axis-text" text-anchor="end" x="${width - margins.right}" y="${height + 1}">epoch</text>`;
  const lines = series.map(s => {
    const klass = s.version === 'v1' ? 'old' : 'new';
    const last = s.plotted.at(-1);
    if (!last) return '';
    return `${smoothed ? `<path class="plot-line ${klass} ghost" d="${path(s.points)}"/>` : ''}<path class="plot-line ${klass}" d="${path(s.plotted)}"/><circle class="end-point" cx="${x(last[0])}" cy="${y(last[1])}" r="${hero ? 3.5 : 3}" style="fill:${s.version === 'v1' ? 'var(--old)' : 'var(--blue)'}"/>${hero ? `<text class="finish-label ${klass}" text-anchor="end" x="${x(last[0]) - 7}" y="${y(last[1]) - 10}">${last[0].toFixed(1)} h</text>` : ''}`;
  }).join('');
  const label = `${task.backbone === 'sd35m' ? 'SD3.5-M' : 'Z-Image-Turbo'}, ${task.label}, ${metricNames[metric]}${hero ? ' by recorded wall time in hours' : ''}. ${task.v2.updates} of ${task.budget} v2 updates recorded. Use arrow keys to inspect.`;
  host.innerHTML = `<div class="plot-wrap"><svg viewBox="0 0 ${width} ${height}" tabindex="0" role="group" aria-roledescription="interactive line chart" aria-label="${escape(label)}"><title>${escape(label)}</title><defs><clipPath id="${id}"><rect class="plot-reveal" x="${margins.left - 5}" y="0" width="${plotWidth + 11}" height="${height}"/></clipPath></defs>${axes}<g class="data-lines" clip-path="url(#${id})">${lines}</g><g class="plot-cursor" visibility="hidden"><line class="cursor-line" y1="${margins.top}" y2="${height - margins.bottom}"/><g class="cursor-points"></g></g></svg><div class="tooltip" hidden role="status" aria-live="polite"></div></div>`;
  const svg = host.querySelector('svg');
  const tooltip = host.querySelector('.tooltip');
  const cursor = host.querySelector('.plot-cursor');
  let selected = 0;
  function inspect(position) {
    selected = Math.max(0, Math.min(domain, hero ? position : Math.round(position)));
    const rows = [], dots = [];
    for (const s of series) {
      const index = hero ? s.points.reduce((best, point, i) => Math.abs(point[0] - selected) < Math.abs(s.points[best][0] - selected) ? i : best, 0) : s.points.findIndex(p => p[0] === selected);
      const point = s.points[index], shown = s.plotted[index];
      const finished = hero && selected > s.points.at(-1)[0];
      const context = hero ? (finished ? ` · finished at ${s.points.at(-1)[0].toFixed(1)} h` : ` · epoch ${s.original[index][0]}`) : metric === 'reward' ? ` · ${task[s.version].scope}` : '';
      rows.push(`<div class="tip-row ${s.version === 'v1' ? 'old' : 'new'}"><span><i></i>${s.version}${context}</span><span>${point ? format(point[1]) : 'not recorded'}</span></div>`);
      if (shown) dots.push(`<circle class="hover-dot" cx="${x(shown[0])}" cy="${y(shown[1])}" r="4" fill="${s.version === 'v1' ? 'var(--old)' : 'var(--blue)'}"/>`);
    }
    cursor.setAttribute('visibility', 'visible');
    const line = cursor.querySelector('line');
    line.setAttribute('x1', x(selected)); line.setAttribute('x2', x(selected));
    cursor.querySelector('.cursor-points').innerHTML = dots.join('');
    tooltip.hidden = false;
    tooltip.innerHTML = `<b>${hero ? `${selected.toFixed(2)} h elapsed` : `Epoch ${selected}`}${smoothed ? ' · raw values' : ''}</b>${rows.join('')}`;
    tooltip.style.right = selected > domain * 0.55 ? 'auto' : '8px';
    tooltip.style.left = selected > domain * 0.55 ? '8px' : 'auto';
  }
  function clear() { tooltip.hidden = true; cursor.setAttribute('visibility', 'hidden'); }
  {
    svg.addEventListener('pointermove', event => {
      const box = svg.getBoundingClientRect();
      inspect(((event.clientX - box.left) / box.width * width - margins.left) / plotWidth * domain);
    });
    svg.addEventListener('pointerleave', clear);
    svg.addEventListener('focus', () => inspect(selected));
    svg.addEventListener('blur', clear);
    svg.addEventListener('keydown', event => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(event.key)) event.preventDefault();
      if (event.key === 'ArrowLeft') inspect(selected - (hero ? domain / 100 : 1));
      if (event.key === 'ArrowRight') inspect(selected + (hero ? domain / 100 : 1));
      if (event.key === 'Home') inspect(0);
      if (event.key === 'End') inspect(domain);
      if (event.key === 'Escape') clear();
    });
  }
  const reveal = svg.querySelector('.plot-reveal');
  function animate() {
    if (reducedMotion) return;
    reveal.getAnimations().forEach(animation => animation.cancel());
    reveal.style.transformBox = 'fill-box'; reveal.style.transformOrigin = 'left center';
    reveal.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 1700, easing: 'cubic-bezier(.25,.6,.35,1)', fill: 'both' });
  }
  const observer = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) { animate(); observer.disconnect(); }
  }, { threshold: 0.18 });
  observer.observe(svg);
  return { animate, destroy: () => observer.disconnect() };
}

function renderCurves() {
  activeCharts.forEach(c => c.destroy()); activeCharts = [];
  const grid = document.querySelector('#curve-grid');
  grid.classList.toggle('joint-grid', state.backbone === 'joint');
  const tasks = dataset.tasks.filter(task => state.backbone === 'joint' ? task.metric === 'multi_open3' : task.backbone === state.backbone && task.metric !== 'multi_open3');
  grid.innerHTML = '';
  for (const task of tasks) {
    const card = document.createElement('article'); card.className = 'chart-card'; card.dataset.task = task.id;
    const pending = task.status !== 'complete';
    card.innerHTML = `<div class="chart-title"><h4>${escape(task.label)}</h4>${pending ? `<span class="run-badge pending" title="In progress" aria-label="${task.v2.updates} of ${task.budget} updates; in progress">${task.v2.updates} / ${task.budget}</span>` : ''}</div><div class="chart-canvas"></div>`;
    grid.append(card);
    const chart = makeChart(card.querySelector('.chart-canvas'), task);
    if (chart) activeCharts.push(chart);
  }
  updateReadingProgress();
}

function tableRows() {
  return dataset.table.filter(row => row.backbone === state.tableBackbone && (state.tableScope === 'all' || row.kind !== 'baseline')).sort((a, b) => {
    if (state.tableScope === 'all') {
      return 0;
    }
    return Number(b.specific) - Number(a.specific) || Number(a.kind === 'v2') - Number(b.kind === 'v2');
  });
}

function renderTable() {
  const table = document.querySelector('#results-table');
  table.querySelector('thead').innerHTML = `<tr><th scope="col">Model / method</th><th scope="col">Reward-Specific</th><th scope="col">Updates</th>${dataset.metricLabels.map(label => `<th scope="col">${escape(label)}</th>`).join('')}</tr>`;
  table.querySelector('tbody').innerHTML = tableRows().map(row => {
    const old = dataset.table.find(r => r.backbone === row.backbone && r.kind === 'v1' && r.specific === row.specific);
    const values = row.values.map((value, i) => {
      let source = 'Table 1 value.';
      if (value == null) source = 'Final evaluation pending. The partial training curve is available above.';
      else if (row.kind === 'v2' && old) {
        const delta = Number(value.toFixed(precision[i])) - Number(old.values[i].toFixed(precision[i]));
        source += ` Difference from v1 at displayed precision: ${delta >= 0 ? '+' : ''}${delta.toFixed(precision[i])}.`;
      }
      return `<td title="${escape(source)}" ${value == null ? 'class="pending-value"' : ''}>${value == null ? '—' : value.toFixed(precision[i])}</td>`;
    }).join('');
    let name = row.name.replace(/^\+\s*/, '');
    if (row.kind === 'v1') name = `DiffusionOPSD v1${row.specific ? '' : ' · joint'}`;
    return `<tr class="${row.kind}"><th scope="row">${escape(name)}</th><td>${row.specific ? '✓' : '×'}</td><td>${escape(row.updates)}</td>${values}</tr>`;
  }).join('');
}

function downloadTable() {
  const header = ['Backbone', 'Method', 'Reward-specific', 'Updates', ...dataset.metricLabels];
  const rows = dataset.table.map(row => [row.backbone, row.name.replace(/^\+\s*/, ''), row.specific, row.updates, ...row.values.map((v, i) => v == null ? '' : v.toFixed(precision[i]))]);
  const csv = [header, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n') + '\r\n';
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'opsd-v2-table1.csv'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function bindControls() {
  for (const [selector, property, attr, render] of [
    ['[data-backbone]', 'backbone', 'backbone', renderCurves],
    ['[data-table-backbone]', 'tableBackbone', 'tableBackbone', renderTable],
    ['[data-table-scope]', 'tableScope', 'tableScope', renderTable]
  ]) {
    document.querySelectorAll(selector).forEach(button => button.addEventListener('click', () => {
      state[property] = button.dataset[attr];
      document.querySelectorAll(selector).forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      render();
    }));
  }
  document.querySelector('#curve-metric').addEventListener('change', event => { state.metric = event.target.value; renderCurves(); });
  document.querySelector('#smooth').addEventListener('change', event => { state.smooth = event.target.checked; renderCurves(); });
  document.querySelectorAll('[data-series]').forEach(button => button.addEventListener('click', () => {
    const version = button.dataset.series;
    if (state.visible.has(version)) {
      if (state.visible.size === 1) return;
      state.visible.delete(version);
    } else state.visible.add(version);
    button.setAttribute('aria-pressed', String(state.visible.has(version)));
    renderCurves();
  }));
  document.querySelector('#replay').addEventListener('click', () => activeCharts.forEach(chart => chart.animate()));
  document.querySelector('#download-table').addEventListener('click', downloadTable);
}

async function start() {
  try {
    const response = await fetch('data.json');
    if (!response.ok) throw new Error(`Data request failed: HTTP ${response.status}`);
    dataset = await response.json();
    if (dataset.schema !== 1 || !Array.isArray(dataset.tasks) || !Array.isArray(dataset.table)) throw new Error('Unsupported dataset schema.');
    renderCurves(); renderTable(); bindControls();
    makeChart(document.querySelector('#hero-plot'), dataset.tasks.find(t => t.id === 'sd35m_multi_open3'), { hero: true });
    const pending = dataset.tasks.filter(t => t.status !== 'complete');
    const date = new Date(dataset.snapshot).toLocaleString('en-GB', { timeZone: 'Asia/Singapore', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    document.querySelector('#snapshot-note').innerHTML = `<span class="status-dot" aria-hidden="true"></span><span><b>${dataset.completed} / ${dataset.total}</b> v2 runs complete${pending.length ? ` · ${pending.length} partial runs` : ' · Final evaluations available'}</span>`;
    const completion = pending.length
      ? `The snapshot includes ${pending.map(t => `${t.backbone === 'sd35m' ? 'SD3.5-M Pairwise' : 'Z-Image-Turbo Pairwise'} through ${t.v2.updates} updates`).join(' and ')}.`
      : `All ${dataset.total} v2 runs have completed training and final evaluation, including both Pairwise runs through 100 updates.`;
    updateReadingProgress();
  } catch (error) {
    document.querySelector('#curve-grid').innerHTML = '<p class="loading error-message">The training data could not be loaded. Serve this folder over HTTP and reload. <a href="data.json">Open the data file ↗</a></p>';
    console.error('OPSD blog:', error.message);
  }
}
start();
