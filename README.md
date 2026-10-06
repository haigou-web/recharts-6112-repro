# recharts#6112 — independent reproduction harness

Verification of [recharts#6112](https://github.com/recharts/recharts/issues/6112):
*"Since 3.1.0, charts are empty in print view"*.

## Headline result

**The empty chart is not a 3.1.0 regression.**

The condition that actually empties the chart is: **under `@media print`, the chart's
ancestor height chain collapses** (`height: 0`, `height: auto`, or no fixed-height
ancestor). `ResponsiveContainer` then measures height `0` and renders no `<svg>` —
which is its designed behaviour.

This reproduces **identically on 3.0.2** (the release *before* the reported change) and on
`3.11.0-canary.5`. The 3.1.0 change did alter the inner div's shape
(`600x360 / position: relative` → `0x0 / position: static`, still true today), but that is a
**dormant DOM change and does not by itself empty the chart**.

Full write-up: [`diagnosis-6112.md`](./diagnosis-6112.md)

## Requirements

- Node 18+
- A local Google Chrome. The harness drives it through `playwright-core` with
  `channel: 'chrome'` — **no browser download needed**.

## Run

```bash
npm install --include=dev

npm run matrix          # baseline: 5 versions x 2 scenes x screen/print
npm run matrix:empty    # the scenes that actually empty the chart
npm run matrix:wa       # nickredmark's CSS workaround, on/off
npm run matrix:pad      # padding/border scene (relevant to PR #7898)
```

One line prints per cell; raw JSON lands in `logs/`, PNGs in `screenshots/`.

## Layout

| path | what |
|---|---|
| `index.html` | every scene as a CSS class, plus the `window.__measure()` probe |
| `src/main.jsx` | React entry; reads `?v=<version>&scene=<scene>&wa=1` |
| `run-matrix.mjs` | Vite + Playwright driver; writes JSON + PNG |
| `logs/` | raw measurements (`exp-results.json`, `matrix-results.json`, `pr-results.json`, ...) |
| `screenshots/` | per-cell full-page PNGs |
| `diagnosis-6112.md` | the report |

## Versions under test

Pinned as npm aliases in `package.json` so all five can coexist:

| alias | package |
|---|---|
| `recharts-302` | recharts@3.0.2 |
| `recharts-310` | recharts@3.1.0 |
| `recharts-330` | recharts@3.3.0 |
| `recharts-3101` | recharts@3.10.1 |
| `recharts-canary` | recharts@3.11.0-canary.5 |

## PR #7894 experiment

`logs/_patch7894.cjs` applies PR #7894's single-file change to the **compiled**
`recharts@3.10.1` package, producing `node_modules/recharts-pr7894`, which
`vite.config.js` aliases as `recharts-pr7894`. Rebuild and re-run with:

```bash
node logs/_patch7894.cjs
npm run matrix:pr
```

Result: 24/24 cells identical to plain 3.10.1 — the PR does not affect #6112.

## Limitations

See §12 of [`diagnosis-6112.md`](./diagnosis-6112.md). In short: CSS media emulation
rather than real print preview; Chrome only; and PR #7898 was assessed by diff scope
rather than built from its head.
