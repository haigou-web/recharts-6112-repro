import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

const params = new URLSearchParams(location.search);
const ver = params.get('v') || '3101';
const scene = params.get('scene') || 'baseline-px';
const wa = params.get('wa') === '1';

window.__ver = ver;
window.__scene = scene;

const DATA = [
  { name: 'Jan', uv: 400, pv: 240 },
  { name: 'Feb', uv: 300, pv: 456 },
  { name: 'Mar', uv: 200, pv: 139 },
  { name: 'Apr', uv: 278, pv: 980 },
  { name: 'May', uv: 189, pv: 480 },
  { name: 'Jun', uv: 239, pv: 380 }
];

async function loadRecharts() {
  if (ver === '302') return import('recharts-302');
  if (ver === '310') return import('recharts-310');
  if (ver === '330') return import('recharts-330');
  if (ver === '3101') return import('recharts-3101');
  if (ver === 'canary') return import('recharts-canary');
  if (ver === 'pr7894') return import('recharts-pr7894');
  throw new Error('unknown version ' + ver);
}

function Chart(props) {
  const R = props.R;
  const h = React.createElement;
  return h(R.ResponsiveContainer, { width: '100%', height: '100%' },
    h(R.LineChart, { data: DATA, margin: { top: 5, right: 10, bottom: 5, left: 0 } },
      h(R.CartesianGrid, { strokeDasharray: '3 3' }),
      h(R.XAxis, { dataKey: 'name' }),
      h(R.YAxis, null),
      h(R.Line, { type: 'monotone', dataKey: 'uv', stroke: '#8884d8', strokeWidth: 2, dot: false, isAnimationActive: false }),
      h(R.Line, { type: 'monotone', dataKey: 'pv', stroke: '#d84315', strokeWidth: 2, dot: false, isAnimationActive: false })
    )
  );
}

function Scene(props) {
  const h = React.createElement;
  const chart = h(Chart, { R: props.R });
  switch (scene) {
    case 'baseline-px':
      return h('div', null, h('div', { className: 'hdr' }), h('div', { className: 'box' }, chart));
    case 'grid-1fr':
      return h('div', { className: 'hdr' }, 'header') && h('div', null,
        h('div', { className: 'hdr' }, 'header'),
        h('div', { className: 'grid2' }, h('div', { className: 'cell' }, chart), h('div', { className: 'cell' }, 'x'))
      );
    case 'grid-print-hide':
      return h('div', { className: 'print-hide-hdr' },
        h('div', { className: 'hdr' }, 'header'),
        h('div', { className: 'grid2' }, h('div', { className: 'cell' }, chart), h('div', { className: 'cell' }, 'x'))
      );
    case 'grid-print-rows-auto':
      return h('div', null,
        h('div', { className: 'grid2 print-gridrows-auto' }, h('div', { className: 'cell' }, chart), h('div', { className: 'cell' }, 'x'))
      );
    case 'flex-1':
      return h('div', null,
        h('div', { className: 'hdr' }, 'header'),
        h('div', { className: 'flexrow' }, h('div', { className: 'cell' }, chart), h('div', { className: 'cell' }, 'x'))
      );
    case 'vh':
      return h('div', null, h('div', { className: 'hdr' }, 'header'), h('div', { className: 'vh' }, chart));
    case 'vh-print-auto':
      return h('div', null, h('div', { className: 'hdr' }, 'header'), h('div', { className: 'vh print-vh-auto' }, chart));
    case 'pct-chain':
      return h('div', { className: 'pct' }, h('div', { className: 'pct' }, chart));
    case 'aspect':
      return h('div', null, h('div', { className: 'hdr' }, 'header'), h('div', { className: 'aspect' }, chart));
    case 'print-h0':
      return h('div', null, h('div', { className: 'hdr' }, 'header'), h('div', { className: 'print-h0' }, chart));
    case 'print-shrink':
      return h('div', null, h('div', { className: 'hdr' }, 'header'),
        h('div', { className: 'shrink-grid' }, h('div', { className: 'cell' }, chart), h('div', { className: 'cell' }, 'x')));
    case 'rc-pad':
      return h('div', null, h('div', { className: 'hdr' }, 'header'),
        h('div', { className: 'rc-pad' }, h('div', null, chart)));
    case 'flex-nozero':
      return h('div', null, h('div', { className: 'hdr' }, 'header'),
        h('div', { className: 'flex-nozero' }, h('div', { className: 'cell' }, chart), h('div', { className: 'cell' }, 'x')));
    case 'grid-pad':
      return h('div', null, h('div', { className: 'hdr' }, 'header'),
        h('div', { className: 'grid-pad-cell' },
          h('div', { className: 'cell' }, h('div', null, chart)),
          h('div', { className: 'cell' }, 'x')));
    case 'print-auto':
      return h('div', null, h('div', { className: 'hdr' }, 'header'), h('div', { className: 'print-auto' }, chart));
    default:
      return h('div', null, 'unknown scene');
  }
}

function installMeasure() {
  window.__measure = function () {
    function rect(el) {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
    }
    const rc = document.querySelector('.recharts-responsive-container');
    const inner = rc ? rc.firstElementChild : null;
    const svg = document.querySelector('.recharts-surface');
    const paths = Array.prototype.slice.call(document.querySelectorAll('.recharts-line-curve'));
    const cs = inner ? getComputedStyle(inner) : null;
    return {
      version: ver,
      scene: scene,
      wa: wa,
      media: window.matchMedia('print').matches ? 'print' : 'screen',
      viewport: { w: window.innerWidth, h: window.innerHeight },
      rc: rect(rc),
      rcParent: rect(rc ? rc.parentElement : null),
      rcParentClass: rc && rc.parentElement ? rc.parentElement.className : null,
      rcTag: rc ? rc.tagName + ' ' + (rc.getAttribute('class') || '') : null,
      inner: rect(inner),
      innerTag: inner ? inner.tagName : null,
      innerStyle: cs ? {
        position: cs.position, display: cs.display, width: cs.width, height: cs.height,
        overflow: cs.overflow, flex: cs.flex, minWidth: cs.minWidth, minHeight: cs.minHeight
      } : null,
      svg: rect(svg),
      svgAttrs: svg ? { width: svg.getAttribute('width'), height: svg.getAttribute('height'), viewBox: svg.getAttribute('viewBox') } : null,
      lineCount: paths.length,
      paths: paths.map(function (p) {
        const d = p.getAttribute('d') || '';
        const b = p.getBoundingClientRect();
        return { dLen: d.length, dHead: d.slice(0, 60), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
      }),
      lineDots: document.querySelectorAll('.recharts-dot').length,
      gridLines: document.querySelectorAll('.recharts-cartesian-grid line').length,
      bodyScrollH: document.documentElement.scrollHeight
    };
  };
}

loadRecharts().then(function (R) {
  installMeasure();
  const root = createRoot(document.getElementById('root'));
  const meta = document.getElementById('meta');
  meta.textContent = 'recharts ' + ver + ' | scene ' + scene + ' | workaround ' + (wa ? 'on' : 'off');
  document.body.className = wa ? 'wa-on' : '';
  root.render(React.createElement(Scene, { R: R }));
  setTimeout(function () { window.__ready = true; }, 600);
}).catch(function (e) {
  document.getElementById('meta').textContent = 'LOAD ERROR: ' + e.message;
  window.__loadError = String(e && e.stack || e);
  window.__ready = true;
});
