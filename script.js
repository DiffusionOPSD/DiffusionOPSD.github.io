const header = document.querySelector('#site-header');
const menuButton = document.querySelector('.menu-button');
const mobileNav = document.querySelector('#mobile-nav');
const navLinks = [...document.querySelectorAll('.desktop-nav a, .mobile-nav a[href^="#"]')];

const setHeaderState = () => {
  header.classList.toggle('scrolled', window.scrollY > 40);
};

setHeaderState();
window.addEventListener('scroll', setHeaderState, { passive: true });

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  mobileNav.classList.toggle('open', open);
  document.body.classList.toggle('menu-open', open);
});

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Open navigation');
    mobileNav?.classList.remove('open');
    document.body.classList.remove('menu-open');
  });
});

const sections = [...document.querySelectorAll('main section[id]')];
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    document.querySelectorAll('.desktop-nav a').forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
    });
  });
}, { rootMargin: '-42% 0px -50% 0px', threshold: 0 });
sections.forEach((section) => sectionObserver.observe(section));

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');
    observer.unobserve(entry.target);
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px' });
document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

const countObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const element = entry.target;
    const target = Number(element.dataset.target);
    const duration = 850;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.round(target * eased);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    observer.unobserve(element);
  });
}, { threshold: 0.7 });
document.querySelectorAll('.count-up').forEach((element) => countObserver.observe(element));

const leaderboardRows = [...document.querySelectorAll('[data-main-table-row]')];
const leaderboardTabs = [...document.querySelectorAll('[data-backbone-filter]')];
const leaderboardSearch = document.querySelector('#leaderboard-search');
const leaderboardSummary = document.querySelector('#leaderboard-summary');
const leaderboardBlock = document.querySelector('#leaderboard');
const metricGroupButtons = [...document.querySelectorAll('[data-metric-group]')];
let activeBackbone = 'sd35';

const updateLeaderboard = () => {
  const query = leaderboardSearch?.value.trim().toLowerCase() || '';
  let visibleCount = 0;
  leaderboardRows.forEach((row) => {
    const matchesBackbone = row.dataset.backbone === activeBackbone;
    const matchesQuery = !query || row.dataset.search.includes(query);
    row.hidden = !(matchesBackbone && matchesQuery);
    if (!row.hidden) visibleCount += 1;
  });
  if (leaderboardSummary) leaderboardSummary.textContent = `${visibleCount} ${visibleCount === 1 ? 'method' : 'methods'}`;
};

leaderboardTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    activeBackbone = tab.dataset.backboneFilter;
    leaderboardTabs.forEach((button) => {
      const active = button === tab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    updateLeaderboard();
  });
});
leaderboardSearch?.addEventListener('input', updateLeaderboard);
metricGroupButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const group = button.dataset.metricGroup;
    leaderboardBlock?.classList.toggle('metrics-open', group === 'open');
    leaderboardBlock?.classList.toggle('metrics-internal', group === 'internal');
    metricGroupButtons.forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle('active', active);
      candidate.setAttribute('aria-pressed', String(active));
    });
  });
});
updateLeaderboard();

const comparisonTrack = document.querySelector('#comparison-track');
const comparisonViewport = document.querySelector('#comparison-viewport');
const comparisonSlides = [...document.querySelectorAll('[data-comparison-slide]')];
const comparisonDots = [...document.querySelectorAll('[data-comparison-dot]')];
const comparisonCount = document.querySelector('#comparison-count');
let comparisonIndex = 0;
let swipeStartX = null;

const showComparison = (nextIndex) => {
  if (!comparisonSlides.length) return;
  comparisonIndex = (nextIndex + comparisonSlides.length) % comparisonSlides.length;
  comparisonTrack.style.transform = `translateX(-${comparisonIndex * 100}%)`;
  comparisonSlides.forEach((slide, index) => slide.setAttribute('aria-hidden', String(index !== comparisonIndex)));
  comparisonDots.forEach((dot, index) => {
    const active = index === comparisonIndex;
    dot.classList.toggle('active', active);
    dot.setAttribute('aria-selected', String(active));
  });
  if (comparisonCount) comparisonCount.textContent = `${String(comparisonIndex + 1).padStart(2, '0')} / ${String(comparisonSlides.length).padStart(2, '0')}`;
};

document.querySelector('#comparison-prev')?.addEventListener('click', () => showComparison(comparisonIndex - 1));
document.querySelector('#comparison-next')?.addEventListener('click', () => showComparison(comparisonIndex + 1));
comparisonDots.forEach((dot) => dot.addEventListener('click', () => showComparison(Number(dot.dataset.comparisonDot))));
comparisonViewport?.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') showComparison(comparisonIndex - 1);
  if (event.key === 'ArrowRight') showComparison(comparisonIndex + 1);
});
comparisonViewport?.addEventListener('pointerdown', (event) => {
  swipeStartX = event.clientX;
});
comparisonViewport?.addEventListener('pointerup', (event) => {
  if (swipeStartX === null) return;
  const distance = event.clientX - swipeStartX;
  swipeStartX = null;
  if (Math.abs(distance) < 48) return;
  showComparison(comparisonIndex + (distance < 0 ? 1 : -1));
});
comparisonViewport?.addEventListener('pointercancel', () => { swipeStartX = null; });

const endpointChart = document.querySelector('[data-endpoint-chart]');
if (endpointChart) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const readoutTitle = endpointChart.querySelector('[data-cfg-readout-title]');
  const readoutValue = endpointChart.querySelector('[data-cfg-readout-value]');

  const svgNode = (name, attributes = {}, text = '') => {
    const node = document.createElementNS(svgNS, name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    if (text) node.textContent = text;
    return node;
  };

  const bindEndpointMarks = (svg, marks) => {
    let locked = null;
    const show = (entry, emphasize = true) => {
      marks.forEach((candidate) => candidate.node.classList.toggle('is-selected', emphasize && candidate === entry));
      svg.classList.toggle('has-selection', emphasize);
      if (entry) {
        readoutTitle.textContent = entry.title;
        readoutValue.textContent = entry.value;
      }
    };
    marks.forEach((entry) => {
      entry.node.addEventListener('mouseenter', () => show(entry));
      entry.node.addEventListener('focus', () => show(entry));
      entry.node.addEventListener('click', () => {
        locked = locked === entry ? null : entry;
        show(locked || entry, Boolean(locked));
      });
      entry.node.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        entry.node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    });
    svg.addEventListener('mouseleave', () => {
      if (locked) show(locked);
      else marks.forEach((entry) => entry.node.classList.remove('is-selected'));
      if (!locked) svg.classList.remove('has-selection');
    });
    svg.addEventListener('focusout', () => {
      requestAnimationFrame(() => {
        if (svg.contains(document.activeElement)) return;
        if (locked) show(locked);
        else {
          marks.forEach((entry) => entry.node.classList.remove('is-selected'));
          svg.classList.remove('has-selection');
        }
      });
    });
  };

  const directionRoot = endpointChart.querySelector('#direction-endpoint-chart');
  if (directionRoot) {
    const width = 430;
    const height = 300;
    const margin = { top: 12, right: 14, bottom: 58, left: 58 };
    const plotHeight = height - margin.top - margin.bottom;
    const yMin = 0.11;
    const yMax = 0.33;
    const y = (value) => margin.top + (yMax - value) / (yMax - yMin) * plotHeight;
    const data = [
      { name: 'Grad', value: 0.3122, error: 0.0040, color: '#1e5aaa' },
      { name: 'Random', value: 0.2303, error: 0.0050, color: '#5087f2' },
      { name: 'No-op', value: 0.2363, error: 0.0042, color: '#787878' },
      { name: 'Residual', value: 0.1256, error: 0.0045, color: '#cea831' },
    ];
    const ticks = [0.125, 0.175, 0.225, 0.275, 0.325];
    const svg = svgNode('svg', { viewBox: `0 0 ${width} ${height}`, role: 'group', 'aria-label': 'Direction endpoint marks' });
    ticks.forEach((tick) => {
      svg.append(svgNode('line', { x1: margin.left, x2: width - margin.right, y1: y(tick), y2: y(tick), class: 'endpoint-grid-line' }));
      svg.append(svgNode('text', { x: margin.left - 8, y: y(tick) + 3, class: 'endpoint-axis-label', 'text-anchor': 'end' }, tick.toFixed(3)));
    });
    svg.append(svgNode('line', { x1: margin.left, x2: margin.left, y1: margin.top, y2: height - margin.bottom, class: 'endpoint-axis-line' }));
    svg.append(svgNode('line', { x1: margin.left, x2: width - margin.right, y1: height - margin.bottom, y2: height - margin.bottom, class: 'endpoint-axis-line' }));
    const baseY = y(0.236);
    svg.append(svgNode('line', { x1: margin.left, x2: width - margin.right, y1: baseY, y2: baseY, class: 'endpoint-baseline' }));
    svg.append(svgNode('text', { x: width - margin.right - 4, y: baseY - 6, class: 'endpoint-baseline-label', 'text-anchor': 'end' }, 'Base'));
    svg.append(svgNode('text', { x: 15, y: height / 2, class: 'endpoint-axis-title', transform: `rotate(-90 15 ${height / 2})`, 'text-anchor': 'middle' }, 'CLIPScore ↑'));

    const marks = [];
    const span = (width - margin.left - margin.right) / data.length;
    data.forEach((datum, index) => {
      const center = margin.left + span * (index + 0.5);
      const barWidth = span * 0.56;
      const top = y(datum.value);
      const bottom = y(yMin);
      const group = svgNode('g', { class: 'endpoint-mark', tabindex: '0', role: 'button', 'aria-label': `${datum.name}, CLIPScore ${datum.value.toFixed(4)}` });
      group.append(svgNode('rect', { x: center - barWidth / 2 - 5, y: top - 8, width: barWidth + 10, height: bottom - top + 13, rx: 7, class: 'endpoint-focus-ring' }));
      group.append(svgNode('rect', { x: center - barWidth / 2, y: top, width: barWidth, height: bottom - top, rx: 3, fill: datum.color }));
      const high = y(datum.value + datum.error);
      const low = y(datum.value - datum.error);
      group.append(svgNode('line', { x1: center, x2: center, y1: high, y2: low, class: 'endpoint-error' }));
      group.append(svgNode('line', { x1: center - 8, x2: center + 8, y1: high, y2: high, class: 'endpoint-error' }));
      group.append(svgNode('line', { x1: center - 8, x2: center + 8, y1: low, y2: low, class: 'endpoint-error' }));
      group.append(svgNode('text', { x: center, y: top - 12, class: 'endpoint-bar-value' }, datum.value.toFixed(3)));
      group.append(svgNode('text', { x: center, y: height - margin.bottom + 21, class: 'endpoint-axis-label', 'text-anchor': 'middle' }, datum.name));
      svg.append(group);
      const delta = datum.value - 0.236;
      marks.push({ node: group, title: `${datum.name} target direction`, value: `${datum.value.toFixed(4)} CLIPScore · ${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(4)} versus base` });
    });
    directionRoot.append(svg);
    bindEndpointMarks(svg, marks);
  }

  const implementationRoot = endpointChart.querySelector('#implementation-sensitivity-chart');
  if (implementationRoot) {
    const width = 470;
    const height = 300;
    const margin = { top: 14, right: 18, bottom: 52, left: 86 };
    const xMin = -0.011;
    const xMax = 0.006;
    const x = (value) => margin.left + (value - xMin) / (xMax - xMin) * (width - margin.left - margin.right);
    const rows = [
      { label: 'Steps', low: -0.0020, high: 0.0015, color: '#56bcc7' },
      { label: 'η', low: -0.0080, high: -0.0005, color: '#aeb7c2', special: { value: -0.0080, label: 'η = .5' } },
      { label: 'NFE', low: -0.0035, high: 0.0025, color: '#5087f2' },
      { label: 'Target', low: -0.0015, high: 0.0024, color: '#1e5aaa', special: { value: 0.0048, label: 'Decay' } },
      { label: 'Sampler', low: -0.0025, high: 0.0023, color: '#cea831' },
    ];
    const ticks = [-0.01, -0.005, 0, 0.005];
    const plotBottom = height - margin.bottom;
    const rowGap = (plotBottom - margin.top) / rows.length;
    const svg = svgNode('svg', { viewBox: `0 0 ${width} ${height}`, role: 'group', 'aria-label': 'Implementation sensitivity marks' });
    svg.append(svgNode('rect', { x: x(-0.005), y: margin.top, width: x(0.005) - x(-0.005), height: plotBottom - margin.top, fill: '#f3f6f8' }));
    ticks.forEach((tick) => {
      svg.append(svgNode('line', { x1: x(tick), x2: x(tick), y1: margin.top, y2: plotBottom, class: 'endpoint-grid-line' }));
      svg.append(svgNode('text', { x: x(tick), y: plotBottom + 20, class: 'endpoint-axis-label', 'text-anchor': 'middle' }, tick === 0 ? '0' : tick.toFixed(3)));
    });
    svg.append(svgNode('line', { x1: x(0), x2: x(0), y1: margin.top, y2: plotBottom, class: 'endpoint-baseline' }));
    svg.append(svgNode('text', { x: (margin.left + width - margin.right) / 2, y: height - 9, class: 'endpoint-axis-title', 'text-anchor': 'middle' }, 'CLIPScore change'));

    const marks = [];
    rows.forEach((row, index) => {
      const cy = margin.top + rowGap * (index + 0.5);
      svg.append(svgNode('line', { x1: margin.left, x2: width - margin.right, y1: cy, y2: cy, class: 'endpoint-grid-line' }));
      svg.append(svgNode('text', { x: margin.left - 11, y: cy + 4, class: 'endpoint-axis-label', 'text-anchor': 'end' }, row.label));
      const group = svgNode('g', { class: 'endpoint-mark', tabindex: '0', role: 'button', 'aria-label': `${row.label}, CLIPScore change from ${row.low} to ${row.high}` });
      group.append(svgNode('rect', { x: x(row.low) - 8, y: cy - 15, width: x(row.high) - x(row.low) + 16, height: 30, rx: 8, class: 'endpoint-focus-ring' }));
      group.append(svgNode('line', { x1: x(row.low), x2: x(row.high), y1: cy, y2: cy, class: 'endpoint-range', stroke: row.color }));
      group.append(svgNode('circle', { cx: x(row.low), cy, r: 7, class: 'endpoint-range-dot', stroke: row.color }));
      group.append(svgNode('circle', { cx: x(row.high), cy, r: 7, class: 'endpoint-range-dot', stroke: row.color }));
      if (row.special) {
        group.append(svgNode('circle', { cx: x(row.special.value), cy, r: 8, class: 'endpoint-special-dot', fill: row.color }));
        const anchor = row.special.value > 0 ? 'end' : 'start';
        const tx = x(row.special.value) + (row.special.value > 0 ? -7 : 7);
        group.append(svgNode('text', { x: tx, y: cy - 13, class: 'endpoint-range-value', 'text-anchor': anchor }, row.special.label));
      }
      svg.append(group);
      const specialText = row.special ? ` · highlighted control: ${row.special.label} ${row.special.value >= 0 ? '+' : '−'}${Math.abs(row.special.value).toFixed(4)}` : '';
      marks.push({ node: group, title: `${row.label} sensitivity`, value: `${row.low.toFixed(4)} to ${row.high >= 0 ? '+' : ''}${row.high.toFixed(4)} CLIPScore change${specialText}` });
    });
    implementationRoot.append(svg);
    bindEndpointMarks(svg, marks);
  }
}

const cfgChart = document.querySelector('[data-cfg-chart]');
if (cfgChart) {
  const cfgPlot = cfgChart.querySelector('.cfg-plot');
  const cfgPoints = [...cfgChart.querySelectorAll('.cfg-point')];
  const cfgViewButtons = [...cfgChart.querySelectorAll('[data-cfg-view]')];
  const cfgReadoutTitle = cfgChart.querySelector('[data-cfg-readout-title]');
  const cfgReadoutValue = cfgChart.querySelector('[data-cfg-readout-value]');
  const defaultPoint = cfgChart.querySelector('.cfg-point-best') || cfgPoints[0];
  let cfgMode = 'score';
  let lockedPoint = null;

  const cfgPointLabel = (point) => {
    if (cfgMode === 'score') return String(Math.round(Number(point.dataset.score) * 1000));
    const gap = Math.round(Number(point.dataset.gap) * 1000);
    return gap === 0 ? '0' : `−${Math.abs(gap)}`;
  };

  const updateCfgReadout = (point) => {
    if (!point) return;
    const score = Number(point.dataset.score);
    const gap = Math.round(Number(point.dataset.gap) * 1000);
    cfgReadoutTitle.textContent = `Train ${point.dataset.train} · Eval ${point.dataset.eval}`;
    cfgReadoutValue.textContent = cfgMode === 'score'
      ? `${score.toFixed(3)} CLIPScore · ${point.dataset.note}`
      : `${gap === 0 ? 'Best setting' : `−${Math.abs(gap)} × 10⁻³ from best`} · ${point.dataset.note}`;
  };

  const highlightCfgPoint = (point, emphasize = true) => {
    cfgPoints.forEach((candidate) => {
      const active = candidate === point;
      candidate.classList.toggle('is-selected', active && emphasize);
      candidate.setAttribute('aria-pressed', String(active && Boolean(lockedPoint)));
    });
    cfgPlot.classList.toggle('has-selection', emphasize);
    updateCfgReadout(point || defaultPoint);
  };

  cfgPoints.forEach((point) => {
    point.addEventListener('mouseenter', () => highlightCfgPoint(point));
    point.addEventListener('focus', () => highlightCfgPoint(point));
    point.addEventListener('click', () => {
      lockedPoint = lockedPoint === point ? null : point;
      highlightCfgPoint(lockedPoint || point, Boolean(lockedPoint));
    });
  });

  cfgPlot.addEventListener('mouseleave', () => {
    highlightCfgPoint(lockedPoint || defaultPoint, Boolean(lockedPoint));
  });
  cfgPlot.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      if (!cfgPlot.contains(document.activeElement)) highlightCfgPoint(lockedPoint || defaultPoint, Boolean(lockedPoint));
    });
  });

  cfgViewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      cfgMode = button.dataset.cfgView;
      cfgViewButtons.forEach((candidate) => {
        const active = candidate === button;
        candidate.classList.toggle('active', active);
        candidate.setAttribute('aria-pressed', String(active));
      });
      cfgPoints.forEach((point) => {
        point.querySelector('[data-cfg-value]').textContent = cfgPointLabel(point);
      });
      updateCfgReadout(lockedPoint || defaultPoint);
    });
  });

  highlightCfgPoint(defaultPoint, false);
}

const lightbox = document.querySelector('#lightbox');
const lightboxImage = document.querySelector('#lightbox-image');
const lightboxCaption = document.querySelector('#lightbox-caption');
const closeLightbox = () => {
  lightbox.close();
  document.body.classList.remove('dialog-open');
};

document.querySelectorAll('[data-lightbox]').forEach((button) => {
  button.addEventListener('click', () => {
    lightboxImage.src = button.dataset.lightbox;
    lightboxImage.alt = button.querySelector('img')?.alt || button.dataset.caption || 'Expanded research figure';
    lightboxCaption.textContent = button.dataset.caption || '';
    lightbox.showModal();
    document.body.classList.add('dialog-open');
  });
});
document.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox();
});
lightbox?.addEventListener('close', () => document.body.classList.remove('dialog-open'));

const citationCode = document.querySelector('#citation-code');
const toast = document.querySelector('#toast');
const researchMenu = document.querySelector('#research-menu');
const researchButton = document.querySelector('#more-research-button');
let toastTimer;

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
};

const copyCitation = async () => {
  try {
    await navigator.clipboard.writeText(citationCode.textContent.trim());
    showToast('BibTeX copied');
  } catch {
    showToast('Select the citation to copy');
  }
};

document.querySelector('#copy-citation')?.addEventListener('click', copyCitation);

const closeMobileNav = () => {
  menuButton?.setAttribute('aria-expanded', 'false');
  menuButton?.setAttribute('aria-label', 'Open navigation');
  mobileNav?.classList.remove('open');
  document.body.classList.remove('menu-open');
};

const closeResearchMenu = () => {
  researchMenu?.classList.remove('is-open');
  researchButton?.setAttribute('aria-expanded', 'false');
};

researchButton?.addEventListener('click', (event) => {
  event.stopPropagation();
  const open = !researchMenu.classList.contains('is-open');
  researchMenu.classList.toggle('is-open', open);
  researchButton.setAttribute('aria-expanded', String(open));
});
researchMenu?.addEventListener('mouseenter', () => researchButton?.setAttribute('aria-expanded', 'true'));
researchMenu?.addEventListener('mouseleave', () => {
  if (document.activeElement === researchButton) researchButton.blur();
  closeResearchMenu();
});
researchMenu?.addEventListener('focusin', () => researchButton?.setAttribute('aria-expanded', 'true'));
researchMenu?.addEventListener('focusout', () => {
  requestAnimationFrame(() => {
    if (!researchMenu.contains(document.activeElement)) closeResearchMenu();
  });
});
document.addEventListener('click', (event) => {
  if (!researchMenu?.contains(event.target)) closeResearchMenu();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (lightbox?.open) closeLightbox();
    closeResearchMenu();
  }
});
