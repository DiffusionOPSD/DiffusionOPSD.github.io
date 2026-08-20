(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const METHOD_STYLE = {
    opsd: { color: '#1E5AAA', dash: '', marker: 'circle', width: 3.4 },
    refl: { color: '#CEA831', dash: '12 6 2 6', marker: 'triangle', width: 2.35 },
    flowgrpo: { color: '#5087F2', dash: '2 7', marker: 'diamond', width: 2.35 },
    nft: { color: '#56BCC7', dash: '12 7', marker: 'square', width: 2.35 },
  };
  const NAVY = '#172B4D';
  const GRID = '#E8EDF2';
  const AXIS = '#AEB7C2';
  const TICK = '#52606D';

  const el = (tag, attrs = {}, text = '') => {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') node.setAttribute(key, String(value));
    });
    if (text) node.textContent = text;
    return node;
  };

  const add = (parent, tag, attrs = {}, text = '') => {
    const node = el(tag, attrs, text);
    parent.append(node);
    return node;
  };

  const scale = ([d0, d1], [r0, r1]) => (value) => r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
  const fmt = (value, digits = 2) => Number(value).toFixed(digits).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');

  const linePath = (xs, ys, sx, sy) => {
    let path = '';
    let drawing = false;
    ys.forEach((value, index) => {
      if (value === null || !Number.isFinite(value)) {
        drawing = false;
        return;
      }
      path += `${drawing ? 'L' : 'M'}${sx(xs[index]).toFixed(2)},${sy(value).toFixed(2)}`;
      drawing = true;
    });
    return path;
  };

  const areaPath = (xs, low, high, sx, sy) => {
    const indices = xs.map((_, index) => index).filter((index) =>
      Number.isFinite(low[index]) && Number.isFinite(high[index]));
    if (!indices.length) return '';
    const upper = indices.map((index) => `${sx(xs[index]).toFixed(2)},${sy(high[index]).toFixed(2)}`);
    const lower = [...indices].reverse().map((index) => `${sx(xs[index]).toFixed(2)},${sy(low[index]).toFixed(2)}`);
    return `M${upper.join('L')}L${lower.join('L')}Z`;
  };

  const stepPath = (points, sx, sy) => {
    if (!points?.length) return '';
    let path = `M${sx(points[0][0]).toFixed(2)},${sy(points[0][1]).toFixed(2)}`;
    points.slice(1).forEach(([x, y]) => {
      path += `H${sx(x).toFixed(2)}V${sy(y).toFixed(2)}`;
    });
    return path;
  };

  const marker = (parent, shape, x, y, color, size = 4.3, opacity = 1) => {
    const common = { fill: color, stroke: '#fff', 'stroke-width': 1, opacity };
    if (shape === 'circle') return add(parent, 'circle', { ...common, cx: x, cy: y, r: size });
    if (shape === 'square') return add(parent, 'rect', { ...common, x: x - size, y: y - size, width: size * 2, height: size * 2 });
    if (shape === 'diamond') {
      return add(parent, 'path', { ...common, d: `M${x},${y - size * 1.25}L${x + size * 1.25},${y}L${x},${y + size * 1.25}L${x - size * 1.25},${y}Z` });
    }
    return add(parent, 'path', { ...common, d: `M${x},${y - size * 1.3}L${x + size * 1.2},${y + size}L${x - size * 1.2},${y + size}Z` });
  };

  const makeDefs = (svg, prefix, methods, boxes = []) => {
    const defs = add(svg, 'defs');
    methods.forEach((method) => {
      const pattern = add(defs, 'pattern', {
        id: `${prefix}-dots-${method}`,
        width: 8,
        height: 8,
        patternUnits: 'userSpaceOnUse',
      });
      add(pattern, 'circle', { cx: 2, cy: 2, r: 1.05, fill: METHOD_STYLE[method].color, opacity: .66 });
    });
    boxes.forEach((box, index) => {
      const clip = add(defs, 'clipPath', { id: `${prefix}-clip-${index}` });
      add(clip, 'rect', { x: box.x, y: box.y, width: box.w, height: box.h });
    });
    return defs;
  };

  const drawAxes = (svg, box, config) => {
    const sx = scale(config.xDomain, [box.x, box.x + box.w]);
    const sy = scale(config.yDomain, [box.y + box.h, box.y]);
    const group = add(svg, 'g', { class: 'chart-axes' });
    config.yTicks.forEach((value) => {
      const y = sy(value);
      add(group, 'line', { x1: box.x, x2: box.x + box.w, y1: y, y2: y, stroke: GRID, 'stroke-width': .9 });
      add(group, 'line', { x1: box.x - 5, x2: box.x, y1: y, y2: y, stroke: AXIS, 'stroke-width': 1 });
      add(group, 'text', { x: box.x - 11, y: y + 5, fill: TICK, 'font-size': 14, 'text-anchor': 'end' }, config.yFormat ? config.yFormat(value) : fmt(value, 1));
    });
    config.xTicks.forEach((value, index) => {
      const x = sx(value);
      add(group, 'line', { x1: x, x2: x, y1: box.y, y2: box.y + box.h, stroke: GRID, 'stroke-width': .9 });
      add(group, 'line', { x1: x, x2: x, y1: box.y + box.h, y2: box.y + box.h + 5, stroke: AXIS, 'stroke-width': 1 });
      const label = config.xTickLabels?.[index] ?? (config.xFormat ? config.xFormat(value) : fmt(value, 0));
      add(group, 'text', { x, y: box.y + box.h + 25, fill: TICK, 'font-size': 14, 'text-anchor': 'middle' }, label);
    });
    add(group, 'line', { x1: box.x, x2: box.x, y1: box.y, y2: box.y + box.h, stroke: AXIS, 'stroke-width': 1 });
    add(group, 'line', { x1: box.x, x2: box.x + box.w, y1: box.y + box.h, y2: box.y + box.h, stroke: AXIS, 'stroke-width': 1 });
    if (config.title) add(group, 'text', { x: box.x, y: box.y - 13, fill: NAVY, 'font-size': 18, 'font-weight': 750 }, config.title);
    if (config.xLabel) add(group, 'text', { x: box.x + box.w / 2, y: box.y + box.h + 50, fill: '#111', 'font-size': 16, 'text-anchor': 'middle' }, config.xLabel);
    if (config.yLabel) add(group, 'text', { x: box.x - 56, y: box.y + box.h / 2, fill: '#111', 'font-size': 16, 'text-anchor': 'middle', transform: `rotate(-90 ${box.x - 56} ${box.y + box.h / 2})` }, config.yLabel);
    return { sx, sy };
  };

  const chartPoint = (event, svg) => {
    const rect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    return {
      x: viewBox.x + ((event.clientX - rect.left) / rect.width) * viewBox.width,
      y: viewBox.y + ((event.clientY - rect.top) / rect.height) * viewBox.height,
    };
  };

  const tooltipRows = (rows) => rows.map((row) =>
    `<div class="chart-tooltip-row"><i style="background:${row.color}"></i><span>${row.label}</span><b>${row.value}</b></div>`).join('');

  const showTooltip = (card, event, title, rows) => {
    const tooltip = card.querySelector('.chart-tooltip');
    const stage = card.querySelector('.chart-stage');
    const rect = stage.getBoundingClientRect();
    const x = event.clientX - rect.left + stage.scrollLeft;
    const y = event.clientY - rect.top + stage.scrollTop;
    tooltip.innerHTML = `<strong>${title}</strong>${tooltipRows(rows)}`;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${Math.max(18, Math.min(y, rect.height - 18))}px`;
    tooltip.style.transform = x > stage.scrollLeft + rect.width * .72 ? 'translate(-105%, -50%)' : 'translate(10px, -50%)';
    tooltip.classList.add('show');
  };

  const hideTooltip = (card) => card.querySelector('.chart-tooltip')?.classList.remove('show');

  const legendGlyph = (method) => {
    const svg = el('svg', { viewBox: '0 0 30 14', 'aria-hidden': 'true' });
    const style = METHOD_STYLE[method];
    add(svg, 'line', { x1: 1, x2: 29, y1: 7, y2: 7, stroke: style.color, 'stroke-width': style.width, 'stroke-dasharray': style.dash || undefined });
    marker(svg, style.marker, 15, 7, style.color, 3.2);
    return svg;
  };

  const setupLegend = (card, methods, labels, active, rerender) => {
    const legend = card.querySelector('[data-chart-legend]');
    legend.replaceChildren();
    methods.forEach((method) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chart-legend-button';
      button.dataset.method = method;
      button.setAttribute('aria-pressed', 'true');
      button.append(legendGlyph(method), document.createTextNode(labels[method]));
      button.addEventListener('click', () => {
        if (active.has(method) && active.size === 1) return;
        if (active.has(method)) active.delete(method); else active.add(method);
        button.setAttribute('aria-pressed', String(active.has(method)));
        rerender();
      });
      legend.append(button);
    });
  };

  const addHoverRegion = ({ svg, card, box, xDomain, crosshair, onMove }) => {
    const overlay = add(svg, 'rect', { x: box.x, y: box.y, width: box.w, height: box.h, fill: 'transparent', cursor: 'crosshair' });
    overlay.addEventListener('pointermove', (event) => {
      const point = chartPoint(event, svg);
      const ratio = Math.max(0, Math.min(1, (point.x - box.x) / box.w));
      crosshair.setAttribute('x1', point.x);
      crosshair.setAttribute('x2', point.x);
      crosshair.style.opacity = '1';
      onMove(event, xDomain[0] + ratio * (xDomain[1] - xDomain[0]), point);
    });
    overlay.addEventListener('pointerleave', () => {
      crosshair.style.opacity = '0';
      hideTooltip(card);
    });
  };

  const drawSeries = ({ svg, group, xs, ys, sx, sy, method, clip, markerEvery = 10, raw = false }) => {
    const style = METHOD_STYLE[method];
    add(group, 'path', {
      d: linePath(xs, ys, sx, sy),
      fill: 'none',
      stroke: style.color,
      'stroke-width': raw ? 1.05 : style.width,
      'stroke-dasharray': raw ? undefined : (style.dash || undefined),
      'stroke-opacity': raw ? .18 : 1,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'clip-path': clip,
      'vector-effect': 'non-scaling-stroke',
    });
    if (!raw && markerEvery) {
      ys.forEach((value, index) => {
        if (index % markerEvery === 0 && Number.isFinite(value)) marker(group, style.marker, sx(xs[index]), sy(value), style.color, method === 'opsd' ? 4.1 : 4);
      });
    }
  };

  const renderAggregate = (card, data, labels) => {
    const methods = data.method_order;
    const active = new Set(methods);
    const canvas = card.querySelector('#aggregate-chart');
    const boxes = [{ x: 76, y: 18, w: 654, h: 300 }, { x: 826, y: 18, w: 654, h: 300 }];

    const render = () => {
      const svg = el('svg', { viewBox: '0 0 1505 425', 'aria-hidden': 'true' });
      makeDefs(svg, 'aggregate', methods, boxes);
      const panels = [
        { key: 'native', title: '(a) Native training gain', yLabel: 'Train Reward' },
        { key: 'heldout', title: '(b) Held-out quality gain', yLabel: 'Eval Reward' },
      ];

      panels.forEach((panel, panelIndex) => {
        const box = boxes[panelIndex];
        const { sx, sy } = drawAxes(svg, box, {
          xDomain: [0, 100], yDomain: data.y_range,
          xTicks: [0, 20, 40, 60, 80, 100], yTicks: [-.2, 0, .2, .4, .6, .8, 1],
          xLabel: 'Average Normalized Cumulative GPU-Hours (%)', yLabel: panel.yLabel,
        });
        add(svg, 'line', { x1: box.x, x2: box.x + box.w, y1: sy(1), y2: sy(1), stroke: '#787878', 'stroke-width': 1.1, 'stroke-dasharray': '5 5' });
        const plot = add(svg, 'g', { 'clip-path': `url(#aggregate-clip-${panelIndex})` });
        methods.forEach((method) => {
          if (!active.has(method)) return;
          const series = data[panel.key].methods[method];
          if (!series) return;
          const low = series.mean.map((value, index) => value === null ? null : value - series.se[index]);
          const high = series.mean.map((value, index) => value === null ? null : value + series.se[index]);
          add(plot, 'path', { d: areaPath(data.x, low, high, sx, sy), fill: `url(#aggregate-dots-${method})`, opacity: .62 });
          add(plot, 'path', { d: linePath(data.x, low, sx, sy), fill: 'none', stroke: METHOD_STYLE[method].color, 'stroke-width': .9, 'stroke-dasharray': '2 5', opacity: .75 });
          add(plot, 'path', { d: linePath(data.x, high, sx, sy), fill: 'none', stroke: METHOD_STYLE[method].color, 'stroke-width': .9, 'stroke-dasharray': '2 5', opacity: .75 });
          drawSeries({ svg, group: plot, xs: data.x, ys: series.mean, sx, sy, method, clip: `url(#aggregate-clip-${panelIndex})`, markerEvery: 10 });
          const last = series.mean.reduce((found, value, index) => Number.isFinite(value) ? index : found, -1);
          if (last >= 0) {
            const offsets = panel.key === 'native'
              ? { opsd: -8, refl: 1, flowgrpo: -4, nft: 10 }
              : { opsd: -8, refl: 0, flowgrpo: -4, nft: 10 };
            const atRightEdge = sx(data.x[last]) > box.x + box.w - 88;
            add(svg, 'text', {
              x: atRightEdge ? box.x + box.w - 6 : sx(data.x[last]) + 8,
              y: sy(series.mean[last]) + offsets[method],
              fill: METHOD_STYLE[method].color,
              'font-size': 11,
              'font-weight': 700,
              'text-anchor': atRightEdge ? 'end' : 'start',
            }, labels[method]);
          }
        });
        add(plot, 'path', { d: stepPath(data[panel.key].frontier, sx, sy), fill: 'none', stroke: '#787878', 'stroke-width': 1.5, 'stroke-dasharray': '6 5', 'stroke-linejoin': 'round' });
        data[panel.key].frontier.filter((_, index) => index % Math.max(1, Math.floor(data[panel.key].frontier.length / 8)) === 0).forEach(([x, y]) => {
          add(plot, 'circle', { cx: sx(x), cy: sy(y), r: 4.4, fill: '#fff', stroke: '#787878', 'stroke-width': 1.5 });
        });
        add(svg, 'text', { x: box.x + box.w / 2, y: 404, fill: NAVY, 'font-size': 23, 'font-weight': 800, 'text-anchor': 'middle' }, panel.title);
        const crosshair = add(svg, 'line', { y1: box.y, y2: box.y + box.h, stroke: NAVY, 'stroke-width': 1, 'stroke-dasharray': '3 4', opacity: 0, 'pointer-events': 'none' });
        addHoverRegion({
          svg, card, box, xDomain: [0, 100], crosshair,
          onMove: (event, value) => {
            const index = Math.max(0, Math.min(data.x.length - 1, Math.round(value)));
            const rows = methods.filter((method) => active.has(method) && Number.isFinite(data[panel.key].methods[method]?.mean[index])).map((method) => ({
              color: METHOD_STYLE[method].color,
              label: labels[method],
              value: fmt(data[panel.key].methods[method].mean[index], 3),
            }));
            showTooltip(card, event, `${panel.key === 'native' ? 'Native' : 'Held-out'} · ${index}% budget`, rows);
          },
        });
      });
      canvas.replaceChildren(svg);
      card.classList.add('is-ready');
    };

    setupLegend(card, methods, labels, active, render);
    render();
  };

  const renderRobustness = (card, data, labels) => {
    const methods = data.method_order;
    const active = new Set(methods);
    const canvas = card.querySelector('#robustness-chart');
    const boxes = [{ x: 78, y: 43, w: 480, h: 390 }, { x: 667, y: 43, w: 478, h: 390 }, { x: 1255, y: 43, w: 480, h: 390 }];

    const render = () => {
      const svg = el('svg', { viewBox: '0 0 1764 518', 'aria-hidden': 'true' });
      makeDefs(svg, 'robustness', methods, boxes);
      const axesA = drawAxes(svg, boxes[0], {
        xDomain: [0, 100], yDomain: [-.3, 1.14], xTicks: [0, 20, 40, 60, 80, 100], yTicks: [0, .5, 1],
        title: 'Shared-reference gain', xLabel: 'Training budget (%)', yLabel: 'Native gain (shared scale)',
      });
      add(svg, 'line', { x1: boxes[0].x, x2: boxes[0].x + boxes[0].w, y1: axesA.sy(1), y2: axesA.sy(1), stroke: '#787878', 'stroke-width': 1.35, 'stroke-dasharray': '5 5' });
      const plotA = add(svg, 'g', { 'clip-path': 'url(#robustness-clip-0)' });
      methods.forEach((method) => {
        if (!active.has(method)) return;
        const series = data.progress[method];
        add(plotA, 'path', { d: areaPath(data.x, series.q25, series.q75, axesA.sx, axesA.sy), fill: `url(#robustness-dots-${method})`, opacity: .62 });
        add(plotA, 'path', { d: linePath(data.x, series.q25, axesA.sx, axesA.sy), fill: 'none', stroke: METHOD_STYLE[method].color, 'stroke-width': .9, 'stroke-dasharray': '2 5', opacity: .75 });
        add(plotA, 'path', { d: linePath(data.x, series.q75, axesA.sx, axesA.sy), fill: 'none', stroke: METHOD_STYLE[method].color, 'stroke-width': .9, 'stroke-dasharray': '2 5', opacity: .75 });
        drawSeries({ svg, group: plotA, xs: data.x, ys: series.median, sx: axesA.sx, sy: axesA.sy, method, clip: 'url(#robustness-clip-0)', markerEvery: 10 });
      });

      const axesB = drawAxes(svg, boxes[1], {
        xDomain: [-.45, 3.45], yDomain: [0, 108], xTicks: [0, 1, 2, 3], yTicks: [0, 20, 40, 60, 80, 100],
        xTickLabels: ['OPSD', 'ReFL', 'NFT', 'Flow'], title: 'Cell-wise terminal stability', yLabel: 'Final range position (%)',
      });
      const plotB = add(svg, 'g', { 'clip-path': 'url(#robustness-clip-1)' });
      methods.forEach((method, methodIndex) => {
        if (!active.has(method)) return;
        const terminal = data.terminal[method];
        terminal.values.forEach((value, index) => {
          add(plotB, 'circle', { cx: axesB.sx(methodIndex + terminal.jitter[index]), cy: axesB.sy(value), r: 4.1, fill: METHOD_STYLE[method].color, opacity: .62 });
        });
        add(plotB, 'line', { x1: axesB.sx(methodIndex), x2: axesB.sx(methodIndex), y1: axesB.sy(terminal.q25), y2: axesB.sy(terminal.q75), stroke: '#777', 'stroke-width': 8, opacity: .32 });
        add(plotB, 'line', { x1: axesB.sx(methodIndex - .26), x2: axesB.sx(methodIndex + .26), y1: axesB.sy(terminal.median), y2: axesB.sy(terminal.median), stroke: NAVY, 'stroke-width': 4.1 });
        add(svg, 'text', { x: axesB.sx(methodIndex), y: axesB.sy(Math.min(104, terminal.median + 5)), fill: NAVY, 'font-size': 17, 'font-weight': 800, 'text-anchor': 'middle' }, `${Math.round(terminal.median)}%`);
      });

      const multiRange = data.multi_y_range;
      const yMin = Math.floor(multiRange[0] * 10) / 10;
      const yMax = Math.ceil(multiRange[1] * 10) / 10;
      const yTicksC = [];
      for (let value = yMin; value <= yMax + .001; value += .1) yTicksC.push(Number(value.toFixed(1)));
      const axesC = drawAxes(svg, boxes[2], {
        xDomain: [0, 300], yDomain: multiRange, xTicks: [0, 100, 200, 300], yTicks: yTicksC,
        title: 'Multi-reward composite', xLabel: 'Training update', yLabel: 'Native composite reward',
      });
      const plotC = add(svg, 'g', { 'clip-path': 'url(#robustness-clip-2)' });
      methods.forEach((method) => {
        if (!active.has(method) || !data.multi[method]) return;
        const series = data.multi[method];
        drawSeries({ svg, group: plotC, xs: series.epoch, ys: series.raw, sx: axesC.sx, sy: axesC.sy, method, clip: 'url(#robustness-clip-2)', markerEvery: 0, raw: true });
        drawSeries({ svg, group: plotC, xs: series.epoch, ys: series.smooth, sx: axesC.sx, sy: axesC.sy, method, clip: 'url(#robustness-clip-2)', markerEvery: 25 });
      });

      const crossA = add(svg, 'line', { y1: boxes[0].y, y2: boxes[0].y + boxes[0].h, stroke: NAVY, 'stroke-width': 1, 'stroke-dasharray': '3 4', opacity: 0, 'pointer-events': 'none' });
      addHoverRegion({ svg, card, box: boxes[0], xDomain: [0, 100], crosshair: crossA, onMove: (event, value) => {
        const index = Math.max(0, Math.min(data.x.length - 1, Math.round(value)));
        const rows = methods.filter((method) => active.has(method)).map((method) => ({ color: METHOD_STYLE[method].color, label: labels[method], value: fmt(data.progress[method].median[index], 3) }));
        showTooltip(card, event, `Shared gain · ${index}% budget`, rows);
      }});

      const crossB = add(svg, 'line', { y1: boxes[1].y, y2: boxes[1].y + boxes[1].h, stroke: NAVY, 'stroke-width': 1, 'stroke-dasharray': '3 4', opacity: 0, 'pointer-events': 'none' });
      addHoverRegion({ svg, card, box: boxes[1], xDomain: [-.45, 3.45], crosshair: crossB, onMove: (event, value) => {
        const index = Math.max(0, Math.min(3, Math.round(value)));
        const method = methods[index];
        const terminal = data.terminal[method];
        crossB.setAttribute('x1', axesB.sx(index)); crossB.setAttribute('x2', axesB.sx(index));
        showTooltip(card, event, labels[method], [
          { color: METHOD_STYLE[method].color, label: 'Median', value: `${fmt(terminal.median, 1)}%` },
          { color: '#9da3ad', label: 'IQR', value: `${fmt(terminal.q25, 1)}–${fmt(terminal.q75, 1)}%` },
          { color: NAVY, label: 'Cells', value: terminal.values.length },
        ]);
      }});

      const crossC = add(svg, 'line', { y1: boxes[2].y, y2: boxes[2].y + boxes[2].h, stroke: NAVY, 'stroke-width': 1, 'stroke-dasharray': '3 4', opacity: 0, 'pointer-events': 'none' });
      addHoverRegion({ svg, card, box: boxes[2], xDomain: [0, 300], crosshair: crossC, onMove: (event, value) => {
        const rows = methods.filter((method) => active.has(method) && data.multi[method]).map((method) => {
          const series = data.multi[method];
          const index = series.epoch.reduce((best, epoch, current) => Math.abs(epoch - value) < Math.abs(series.epoch[best] - value) ? current : best, 0);
          return { color: METHOD_STYLE[method].color, label: labels[method], value: fmt(series.smooth[index], 3) };
        });
        showTooltip(card, event, `Multi-reward · update ${Math.round(value)}`, rows);
      }});

      canvas.replaceChildren(svg);
      card.classList.add('is-ready');
    };

    setupLegend(card, methods, labels, active, render);
    render();
  };

  const initialize = async () => {
    const cards = [...document.querySelectorAll('[data-interactive-chart]')];
    if (!cards.length) return;
    try {
      const response = await fetch('assets/interactive-charts.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      cards.forEach((card) => {
        if (card.dataset.interactiveChart === 'aggregate') renderAggregate(card, payload.aggregate, payload.labels);
        if (card.dataset.interactiveChart === 'robustness') renderRobustness(card, payload.robustness, payload.labels);
      });
    } catch (error) {
      console.error('Interactive figure failed to load:', error);
      cards.forEach((card) => card.querySelector('.chart-canvas')?.classList.add('chart-error'));
    }
  };

  initialize();
})();
