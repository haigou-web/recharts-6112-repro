# recharts #6112 独立验证报告

**结论先说：issue #6112 的因果归因是错的。** 「print 下图表空白」与 recharts 3.1.0 之间**没有因果关系**——
本 harness 在 3.0.2（变更前基线）上触发出**完全相同**的空白。真正的触发条件是
**应用自身的 `@media print` 样式让图表父容器高度塌陷为 0/auto**，此时 ResponsiveContainer
测到高度 0，图表自然为空。这一点在 3.0.2 到 3.11.0-canary.5 **全部版本上一视同仁**。

- 验证日期：2026-10-06
- 工作目录：`ws-20261002-1630/repro/recharts-6112`
- 上游状态：issue #6112 open，标签 `bug` + `needs reproduction`（维护者自 2025-07-20 索要复现，至今无有效复现）

---

## 1. 环境

| 项 | 值 |
|---|---|
| OS | Windows 11 (10.0.26200) |
| Node / npm | v24.18.0 / 11.16.0 |
| 浏览器 | 系统 Chrome（Playwright `channel: 'chrome'`，未下载 chromium） |
| 代理 | http://127.0.0.1:7897（`HTTPS_PROXY`/`HTTP_PROXY`） |
| 构建 | Vite 5.4.11 dev server（`:5199`），React 18.3.1 |
| 媒体模拟 | `page.emulateMedia({ media: 'print' })`（Playwright / CDP `Emulation.setEmulatedMedia`） |
| recharts 来源 | npm 官方包，多版本以 alias 并存安装 |

被测版本：`3.0.2` / `3.1.0` / `3.3.0` / `3.10.1` / `3.11.0-canary.5`（npm `canary` tag，2026-10-06 实查）。

---

## 2. 如何逐字复现

```powershell
cd ws-20261002-1630/repro/recharts-6112
$env:HTTPS_PROXY="http://127.0.0.1:7897"; $env:HTTP_PROXY="http://127.0.0.1:7897"
$env:NODE_ENV="development"
npm install --include=dev --no-audit --no-fund

# 版本矩阵（screen + print）
node run-matrix.mjs --versions=302,310,330,3101,canary --scenes=baseline-px,grid-1fr --media=screen,print --tag=v1

# 触发空白的场景
node run-matrix.mjs --versions=302,310,3101,canary --scenes=print-h0,print-auto,pct-chain,vh-print-auto,grid-print-rows-auto --media=print --tag=exp

# workaround 对照
node run-matrix.mjs --versions=302,3101 --scenes=print-h0,grid-print-rows-auto,pct-chain --media=print --wa=1 --tag=wa

# print 下重排是否被重测（溢出检验）
node run-matrix.mjs --versions=302,310,330,3101,canary --scenes=print-shrink --media=screen,print --tag=shrink
```

页面参数：`/?v=<302|310|330|3101|canary>&scene=<scene>&wa=<0|1>`。
每个结果含截图（`screenshots/`）与 JSON 明细（`logs/`）。

判定 `RENDERED` / `EMPTY` 的判据（代码见 `run-matrix.mjs`）：
存在 `svg.recharts-surface` 且 `width>5 && height>5`，且 `.recharts-line-curve` 的 `d` 长度 > 10。
即「线条真的被画出来了」，不只看容器尺寸。

---

## 3. 版本矩阵（核心产出）

场景 `baseline-px`（父容器固定 600x360）与 `grid-1fr`（CSS grid `1fr` 轨道，宽 596，高 360）。
完整 JSON：`logs/v1-core-results.json`。

| recharts | 场景 | screen | print | rc 尺寸 | 内层 div | 内层 position | svg 尺寸 | line `d` 长度 |
|---|---|---|---|---|---|---|---|---|
| 3.0.2 | baseline-px | RENDERED | **RENDERED** | 600x360 | 600x360 | `relative` | 600x360 | 202 |
| 3.0.2 | grid-1fr | RENDERED | **RENDERED** | 596x360 | 596x360 | `relative` | 596x360 | 210 |
| 3.1.0 | baseline-px | RENDERED | **RENDERED** | 600x360 | **0x0** | `static` | 600x360 | 202 |
| 3.1.0 | grid-1fr | RENDERED | **RENDERED** | 596x360 | **0x0** | `static` | 596x360 | 210 |
| 3.3.0 | baseline-px | RENDERED | **RENDERED** | 600x360 | **0x0** | `static` | 600x360 | 202 |
| 3.3.0 | grid-1fr | RENDERED | **RENDERED** | 596x360 | **0x0** | `static` | 596x360 | 210 |
| 3.10.1 | baseline-px | RENDERED | **RENDERED** | 600x360 | **0x0** | `static` | 600x360 | 202 |
| 3.10.1 | grid-1fr | RENDERED | **RENDERED** | 596x360 | **0x0** | `static` | 596x360 | 210 |
| 3.11.0-canary.5 | baseline-px | RENDERED | **RENDERED** | 600x360 | **0x0** | `static` | 600x360 | 202 |
| 3.11.0-canary.5 | grid-1fr | RENDERED | **RENDERED** | 596x360 | **0x0** | `static` | 596x360 | 210 |

**读法：** print 与 screen **逐格相同**。5 个版本、两种布局，没有一格是空白。

---

## 4. DOM 结构逐版本对照（验证 Nova-47）

`.recharts-responsive-container` 的直接子 div —— 即 thread 里所有 workaround 针对的那个元素：

| recharts | 该内层 div 尺寸 | computed `position` | 我的测量 | Nova-47 的测量 |
|---|---|---|---|---|
| 3.0.2 | 600x360 | `relative` | ✅ | 600x360 / `relative` |
| 3.1.0 | **0x0** | `static` | ✅ | 0x0 / `static` |
| 3.3.0 | **0x0** | `static` | ✅ | 0x0 / `static` |
| 3.10.1 | **0x0** | `static` | ✅ | 0x0 / `static` |
| 3.11.0-canary.5 | **0x0** | `static` | ✅（新测，Nova-47 未测） | — |

**Nova-47 的表逐格正确，拐点确为 3.1.0，且至今未变回。** 这条事实层面完全成立。

但必须补上他表格里缺的一列 —— **同版本下的 svg 与外层容器**：

| recharts | 内层 div | 外层 `.recharts-responsive-container` | `svg.recharts-surface` | 图表是否渲染 |
|---|---|---|---|---|
| 3.0.2 | 600x360 | 600x360 | 600x360 | 是 |
| 3.1.0 | 0x0 | **600x360** | **600x360** | **是** |
| 3.11.0-canary.5 | 0x0 | **600x360** | **600x360** | **是** |

→ **内层 div 归零是惰性的**：3.1.0 起真正承担测量与定尺寸的是外层 `.recharts-responsive-container`。
只看内层 div 的形状**无法预测图表是否为空**。这正是 Nova-47 拿 16 种布局都测不出空白的根因，
他自己也承认了（"the wrapper alone was not enough to empty the chart"）。

---

## 5. 空白的真实触发条件（本轮关键发现）

我构造了「应用自带 `@media print` 样式」的六种场景（issue 里报告者提到的 grid context 在内）。
**空白出现了，而且 3.0.2 与 3.11.0-canary.5 表现逐格一致。**
完整 JSON：`logs/exp-results.json`。

| 场景 | 语义 | 3.0.2 | 3.1.0 | 3.10.1 | canary.5 |
|---|---|---|---|---|---|
| `vh` | 父容器 `height:100vh`，print 下 vh 仍有效 | RENDERED | RENDERED | RENDERED | RENDERED |
| `aspect` | 父容器 `width:100%; aspect-ratio:4/3` | RENDERED | RENDERED | RENDERED | RENDERED |
| `flex-1` | flex 子项 `flex:1; min-height:0` | RENDERED | RENDERED | RENDERED | RENDERED |
| `grid-print-hide` | grid + print 隐藏页头（grid 轨道仍 360px） | RENDERED | RENDERED | RENDERED | RENDERED |
| `print-h0` | **print 下父容器 `height:0`** | **EMPTY** | **EMPTY** | **EMPTY** | **EMPTY** |
| `print-auto` | **print 下父容器 `height:auto`** | **EMPTY** | **EMPTY** | **EMPTY** | **EMPTY** |
| `vh-print-auto` | **print 下 `100vh` 变 `auto`** | **EMPTY** | **EMPTY** | **EMPTY** | **EMPTY** |
| `pct-chain` | **百分比高度链，祖先无固定高度** | **EMPTY** | **EMPTY** | **EMPTY** | **EMPTY** |
| `grid-print-rows-auto` | **grid `grid-template-rows` 在 print 下变 `auto`** | **EMPTY** | **EMPTY** | **EMPTY** | **EMPTY** |

**触发条件一句话：print 媒体下父级高度链塌陷（0 / auto / 无固定祖先），ResponsiveContainer 测到高度 0 → 不渲染 svg。**
这是 ResponsiveContainer 的**设计行为**（拿不到高度就不画），不是 3.1.0 的回归。

关键证据：`grid-print-rows-auto` 一行，3.0.2 的 rc 是 `596x15`、3.1.0 也是 `596x15`，
两版都在 15px 高度下渲染不出线（`lines=0`）。**基线版本同样失败。**

**截图目视确认**（不只是 DOM 数字）：
- `screenshots/exp_302_print-h0_print.png` —— 3.0.2 + print + 父容器 `height:0`：
  整页只有顶部 header，**图表区域完全空白**。
- `screenshots/exp_3101_print-h0_print.png` —— 3.10.1 同一场景：同样空白，与基线无差异。
- `screenshots/3101_baseline-px_print.png` —— 3.10.1 + print + 父容器固定 600x360：
  坐标轴、网格、两条折线（蓝紫 + 橙红）均清晰可见。


---

## 6. 溢出检验：print 下重排会不会被重测？

nickredmark 12:15:42 的真正遗留问题不是空白，而是
*"the chart would exit the container in print within a grid context"*（图表**溢出**容器）。

场景 `print-shrink`：CSS grid 容器在 print 下从 1200px 缩到 500px、行高 360→200。
若 ResizeObserver 在 print 下失灵，rc 会保留旧宽度 → 溢出。

| recharts | screen 下 rc/svg | print 下 rc/svg | 是否跟随重排 | 是否溢出 |
|---|---|---|---|---|
| 3.0.2 | 596x360 | **246x200** | ✅ | 否 |
| 3.1.0 | 596x360 | **246x200** | ✅ | 否 |
| 3.3.0 | 596x360 | **246x200** | ✅ | 否 |
| 3.10.1 | 596x360 | **246x200** | ✅ | 否 |
| 3.11.0-canary.5 | 596x360 | **246x200** | ✅ | 否 |

浏览器已经按 print 媒体重算了布局，ResizeObserver 也照常回调，svg 与 rc 尺寸始终相等。
**溢出未能复现**（与 Nova-47 一致：他四种布局十六格也都没溢出）。

padding/border 场景（`rc-pad`：外层 600x360 `border-box` + `padding:20px` + `border:10px`）同样没有溢出，
3.0.2 与 3.10.1 都得 `540x300`（正确扣除了 padding+border）——即 #7898/#7894 想修的那类测量问题，
在当前 npm 版本上**首帧即正确**，本 harness 无法复现其症状。

---

## 7. workaround 对照（thread 里的药方是否有效）

报告者给的 workaround：
```css
.recharts-responsive-container > div { width: 100% !important; display: flex; }
```

在 3 个空白场景上加 `wa=1` 重跑（`logs/wa-results.json`）：

| 场景 | 版本 | 不加 workaround | 加 workaround |
|---|---|---|---|
| `print-h0` | 3.10.1 | EMPTY | **EMPTY** |
| `grid-print-rows-auto` | 3.10.1 | EMPTY | **EMPTY** |
| `pct-chain` | 3.10.1 | EMPTY | **EMPTY** |

workaround **确实生效了**（3.10.1 下内层 div 宽度从 0 变成 1400，computed 值变了），
但图表**依旧空白** —— 因为塌陷的是**外层 rc 的高度**，改内层 div 的 width/display 救不回来。

**结论：这条 workaround 修错了元素。** 它只能缓解「内层 div 承载宽度」时代（≤3.0.x）的问题；
3.1.0 之后尺寸由外层驱动，该选择器已经打不到点上。

---

## 8. 对争议双方的裁决

| 主张 | 裁决 | 依据 |
|---|---|---|
| **Nova-47**：内层 div 在 3.1.0 变 0x0/`static` 且未改回 | **成立（事实层完全正确）** | 5 个版本逐格复现，含他未测的 canary.5 |
| **Nova-47** 隐含的推论：这就是空白之因 | **不成立** | 3.0.2 同样空白；3.1.0+ 空白的场景里 3.0.2 也空白，与内层 div 无关 |
| **Nova-47**：16 种布局都没能复现空白 | **成立** | 我复现空白需要引入「print 下父级塌陷」，纯库层测不出来 |
| **scenerecap**：3.10.1 上不再复现空白 | **成立（在其场景内）** | 他的场景是固定 500px 高 flex row，高度不塌陷，永不空白 |

**两人不矛盾，测的是不同场景：** Nova-47 测的是「DOM shape + 库层布局」（不塌陷，故不空白），
scenerecap 测的是「固定高度 flex row 下的空白与否」（不塌陷，故不空白）。
**真正缺失的第三个变量是「应用自带的 `@media print` 样式是否让祖先高度塌陷」**，
两人都没引入它，所以两人都没复现出空白。

---

## 9. 定论

1. **「自 3.1.0 起 print 空白」的因果归因不成立。** 3.0.2 在相同条件下同样空白。
   3.1.0 改变的是**内层 div 的形状**（600x360/relative → 0x0/static），
   这是 ckifer 承认的 side-effect，但它是**惰性的 DOM 变化，不导致空白**。
2. **真正的触发条件**：print 媒体下图表祖先高度链塌陷（`height:0`/`auto`/无固定高度祖先）。
   ResponsiveContainer 拿不到高度就不渲染 —— 三个版本基线均如此。
3. **最新版（含 canary 3.11.0-canary.5）仍未「修复」#6112** ——
   因为从上面第 1、2 条看，#6112 的空白根本不是可修复的库回归，而是**使用方 print 样式**的问题。
4. **对 #7898 / #7894 的决策价值**：这两个 PR 针对 padding/border 的首帧测量，
   与本 issue 的空白/溢出**无关**；不会修好 #6112。
5. **给维护者的建议**：可回帖要求报告者提供 `@media print` 样式表（尤其是祖先高度规则），
   或直接以本文档第 5 节的 `print-h0` 场景作为 minimal reproduction 关闭/引导 issue。

---

## 10. PR 分支实测（#7898 / #7894）

两个活跃 PR 改的正是这块代码。**结论：都不会修好 #6112。**

### #7894 — william-xue「fix(useElementOffset): measure the border box from the ResizeObserver entry」

改动范围（`git diff` 实测）：仅 `src/util/useElementOffset.ts`（+41/-16）加一个测试文件，**没有别的源码文件**。
逻辑是：ResizeObserver 回调里改用 `entry.borderBoxSize` 取尺寸，而不是 `getBoundingClientRect()`；
文档注释写明动机是 **CSS transform 会让 `getBoundingClientRect()` 报告被缩放后的尺寸**。

**实测：** 我把该 PR 的逻辑**等价移植**到 npm 包 `recharts@3.10.1` 的编译产物
（`node_modules/recharts-pr7894/{es6,lib}/util/useElementOffset.js`，补丁脚本 `logs/_patch7894.cjs`，
未改动上游源码、未提 PR），alias 为 `recharts-pr7894`，跑同样的矩阵：

| 场景 | media | 3.10.1 | pr7894 |
|---|---|---|---|
| `baseline-px` | print | RENDERED 600x360 | **RENDERED 600x360** |
| `grid-1fr` | print | RENDERED 596x360 | **RENDERED 596x360** |
| `print-h0` | print | **EMPTY** | **EMPTY** |
| `grid-print-rows-auto` | print | **EMPTY** | **EMPTY** |
| `print-shrink` | print | RENDERED 246x200 | **RENDERED 246x200** |
| `rc-pad` | print | RENDERED 540x300 | **RENDERED 540x300** |

24 格（2 实现 x 6 场景 x screen/print）**逐格相同**，EMPTY 的地方依然 EMPTY。
原始数据：`logs/pr-results.json`。

### #7898 — PavelVanecek「fix: exclude wrapper padding and border from the first size measurement」

改动范围：`src/component/ResponsiveContainer.tsx`、`src/chart/RechartsWrapper.tsx`、
新增 `src/util/getContentBoxSize.ts`（src 合计 +34/-3），其余 87 个改动文件是测试与 VR 快照图片。
即：**首帧测量时把 wrapper 的 padding/border 排除掉**。

**判定（基于改动范围 + 对照实测）：** 我在 `rc-pad` 场景（外层 600x360 `border-box`，
`padding:20px` + `border:10px`）实测 3.0.2 与 3.10.1 **都已经得到正确的 540x300** ——
即该 PR 想修的首帧测量问题，在当前 npm 版本上首帧就是对的，本 harness 复现不出它的症状。
未做编译产物移植（跨 3 文件且引入新模块，移植成本高、证据可信度低），故只给范围判定，不给实测结论。

### 为什么这两个 PR 都不可能修好 #6112

#6112 的空白发生条件是「rc 测到的高度为 **0**」。这两个 PR 都是在把测量值**算得更准**
（排除 padding/border、避开 transform 缩放），它们无法把 0 变成非 0。
实测印证了这一点：`print-h0` 在 pr7894 上依然 EMPTY，且 3.0.2 基线同样 EMPTY。

---

## 11. 产物索引

| 路径 | 内容 |
|---|---|
| `index.html` | 复现页（含全部场景的 `@media print` 规则） |
| `src/main.jsx` | 5 版本动态 import + `window.__measure()`（DOM 尺寸/样式采集） |
| `run-matrix.mjs` | Playwright 矩阵驱动（版本 × 场景 × 媒体 × workaround） |
| `screenshots/` | 各组合的 print/screen 全页截图，命名 `<tag>_<ver>_<scene>_<media>[_wa].png` |
| `logs/v1-core-results.json` | 版本矩阵原始数据（20 行） |
| `logs/exp-results.json` | 空白场景原始数据（36 行） |
| `logs/pad-results.json` | padding/border + 溢出对照（12 行） |
| `logs/wa-results.json` | workaround 对照（6 行） |
| `logs/shrink-results.json` | print 重排重测检验（10 行） |
| `logs/pr-results.json` | 3.10.1 vs #7894 移植版 对照（24 行） |
| `logs/_patch7894.cjs` | #7894 逻辑移植到编译产物的补丁脚本 |

---

## 12. 局限（如实声明）

- 用的是 **CSS 媒体模拟**（`emulateMedia({media:'print'})`），与 Chrome 真实打印预览（Ctrl+P）
  走的是同一套 `@media print` 匹配，但不覆盖分页、纸张尺寸、`page-break` 的影响。
- 未测 Firefox / Safari。
- 溢出（nickredmark 的第二投诉）在本 harness 中未能复现，故本报告不对其成因下定论。
- **#7894 测的是「逻辑等价移植到 3.10.1 编译产物」，不是「从 PR head 全量构建」**。
  移植覆盖了该 PR 的全部源码改动（单文件），但未经过上游的构建管线；结论对其行为差异有效，
  对构建产物的字节级一致性无效。
- **#7898 未实测**，只给了基于改动范围 + `rc-pad` 对照的判定（见第 10 节）。
- 维护者若要更硬的证据，可对两个 PR head 跑本 harness 的同一套场景（把 `v=` 换成对应构建产物即可）。
