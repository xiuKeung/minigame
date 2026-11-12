# 笔画小剧场：开发交接指南

## 目标与边界

`hanzi/` 是一个零构建步骤的静态网页：用户输入汉字后，页面按笔顺播放动画、查看释义与组词，并可在田字格中按笔顺书写。它面向手机优先设计，同时支持安装为 PWA 和下载完整离线字库。

不要将它改为依赖在线 CDN 或服务端接口。笔画数据和 `HanziWriter` 均随仓库发布，以确保弱网和断网可用。

入口位于 [`../entrance/index.html`](../entrance/index.html)，对应的卡片图标、浏览器标签图标和主屏幕图标均来自 `hanzi-mark` 资源。SVG 用于网页展示；`hanzi-mark-180.png`、`hanzi-mark-192.png` 与 `hanzi-mark-512.png` 分别用于 iOS 和 PWA 安装。

## 目录与职责

| 路径 | 用途 |
| --- | --- |
| `index.html` | 页面结构、CSS 与脚本加载顺序。|
| `app.js` | 输入校验、按需加载笔画包、HanziWriter 动画、上下字、重播和书写练习。|
| `steps.js` | 根据当前字数据渲染逐笔分解缩略图。|
| `dictionary.js` / `dictionary.css` | 按需加载并展示拼音、释义与组词。|
| `lookup.js` / `lookup.css` / `lookup-index.js` | 拼音、部首与总笔画查字；候选字可直接进入演示。|
| `data-index.js` | 字符到数据包的索引，以及 `HANZI_LIBRARY_VERSION`。|
| `data-library-version.js` | 当前笔画与离线数据版本；更新字库时在此递增版本。|
| `data/chunks/*.js` | 119 个笔画数据分包，共 9,574 字，约 30 MB。|
| `data/dictionary-chunks/*.js` | 与笔画包同编号的 119 个词典分包，共 9,574 字，约 1.2 MB。|
| `offline.js` | 完整离线字库下载、断点续传、版本检测。|
| `sw.js` | PWA 壳资源缓存，不负责缓存笔画分包。|
| `install.js` / `manifest.webmanifest` | 添加到主屏幕 / PWA 配置。Android 仅在收到安装事件后显示按钮；iOS 显示 Safari 操作指引。|
| `style.css`、`grid.css`、`steps.css`、`input.css`、`topbar.css`、`offline.css` | 页面样式，按功能拆分。|
| `vendor/hanzi-writer.min.js` | 本地 HanziWriter 运行库。|
| `vendor/ARPHICPL.TXT` | 字形数据的许可文本，必须随数据保留。|
| `vendor/CHINESE_XINHUA_LICENSE.txt` | 释义与组词数据的 MIT 许可证，必须随词典数据保留。|
| `tools/build-dictionary.mjs` | 从 chinese-xinhua 源数据生成可发布词典包的脚本。|
| `characters.txt` | 当前完整收录字符清单。|

旧的 `data/*.json` 是早期演示样本，运行时已不读取；新功能请使用分包体系。

## 页面运行流程

1. `index.html` 依次加载 HanziWriter、`data-index.js`、`data-library-version.js`、笔顺与 PWA 脚本、`dictionary.js`、`app.js`、`offline.js`。不要调整索引或版本脚本到 `app.js` 之后。
2. `app.js` 从 `HANZI_INDEX` 判断输入字符是否收录；不收录的字会提示用户，但已收录的字仍会播放。
3. 首次播放某字时，`loadHanziData()` 根据索引动态插入 `data/chunks/<包名>.js?v=<字库版本>`；加载失败会自动重试一次，用户再次点“演示”还可再次触发。
4. 分包脚本将数据合并进全局 `window.HANZI_CHUNK_DATA`；数据到位后 `HanziWriter` 用 `charDataLoader` 播放。
5. `steps.js` 从同一数据对象读取 `strokes`，渲染田字格上方的逐笔缩略图。SVG 坐标系需作 Y 轴翻转，不能删除 `translate(0 1024) scale(1 -1)`。
6. `dictionary.js` 以相同的包编号加载 `data/dictionary-chunks/<包名>.js`，并将条目渲染为拼音、短释义和组词。
7. 笔画动画结束后才显示“开始书写”；`writer.quiz()` 会清空展示字并根据已有笔画数据检查用户书写。不要改为仅按轨迹像素比对。
8. `lookup-index.js` 是完整但紧凑的查询索引；查字只加载该索引，不会预加载所有笔画或词典包。

每个分包的最小格式如下：

```js
window.HANZI_CHUNK_DATA=window.HANZI_CHUNK_DATA||{};
Object.assign(window.HANZI_CHUNK_DATA,{"永":{"strokes":[/* SVG path */],"medians":[/* 路径点 */]}});
```

`HanziWriter` 对数据结构有要求；不要仅凭 Unicode 字形或 CSS 动画伪造笔顺。

## 字库分包与更新

当前策略是约 500 字一个包，实际生成 119 个包。这样首次演示仅下载目标字所在的小包，而用户主动选择“下载离线字库”时才下载全部包。

更新字库时必须同时完成以下事项：

1. 生成或替换 `data/chunks/*.js`，并保持每个文件可独立执行、可向 `window.HANZI_CHUNK_DATA` 合并。
2. 重建 `data-index.js` 中的字符到包名映射，并更新 `characters.txt`。
3. **递增 `data-library-version.js` 中的 `window.HANZI_LIBRARY_VERSION`**。这个版本号是离线更新开关；不更新它，已下载用户不会获取新包。
4. 若资源数量、名称或结构改变，更新本文件中的说明，并检查离线下载进度的总数。
5. 保留或更新对应的字形数据许可证。

版本号会同时进入按需加载 URL 和离线缓存名，因此可绕开旧 HTTP / Service Worker 缓存。

## 离线下载与缓存规则

`offline.js` 使用 Cache Storage，缓存名为 `hanzi-offline-<HANZI_LIBRARY_VERSION>`：

- 当前版本全部分包存在：显示“已下载”，刷新也不会重新下载。
- 当前版本只下载一部分：显示“继续下载”，已完成分包会跳过。
- 发现旧版离线缓存、但当前版本未下载：显示“下载更新”。
- 新版本完整下载成功后才删除旧的 `hanzi-offline-*` 缓存。

`sw.js` 只预缓存页面壳资源。它必须满足两项约束：

- 激活时只能清理旧 `hanzi-strokes-*` 页面缓存，**不能清掉** `hanzi-offline-*`。
- 不要把 `/data/chunks/` 或 `/data/dictionary-chunks/` 写入页面壳缓存；这些文件由 `offline.js` 按版本精确管理。

若改动 `index.html`、任一 JS/CSS 或 Service Worker 预缓存清单，请同步提高 `sw.js` 内的 `CACHE` 版本（当前为 `hanzi-strokes-v20`），让已安装页面获得新壳资源。对更新频繁的脚本（目前是 `offline.js`）还应同步更新 `index.html` 中的查询版本，避免旧浏览器 HTTP 缓存继续执行旧脚本。

通过 `file://` 直接打开页面时，浏览器通常不能注册 Service Worker 或稳定使用 Cache Storage。此时页面显示“本地文件已完整”；部署验证请使用 HTTP(S)。

## 交互与视觉约束

- 主展示区使用标准田字格：外框实线，中央横竖线为虚线（实现于 `grid.css`）。
- 逐笔分解在田字格上方，必须自动换行，不能横向滚动或超出屏幕。
- 输入框与“演示”按钮在任何屏宽下保持同一行（`input.css` 覆盖了旧移动端换行规则）。
- 输入框初始值必须为空，只有“输入汉字”占位提示。
- 顶部只保留“添加到主屏幕”，不要恢复“回到小游戏乐园”链接。
- 完整离线字库区域固定在页面底部；不要恢复“试试这些”推荐模块。
- 当前动画参数为：`strokeAnimationSpeed:.75`、笔间间隔 `400ms`。若调整速度，需要在手机上确认节奏仍易于跟读。
- 书写练习必须在动画完成后由用户主动开始；笔顺错误时给简短、正向的提示，完成后可“再写一遍”。
- “查字典”以弹窗打开，支持无中文键盘的拼音、部首和总笔画查询；部首、笔画数选择后应立即显示候选字。
- `entrance/` 保持单列、紧凑的卡片布局；不要在大屏改成多列展示墙。

## 本地验证清单

静态页面没有构建命令。变更后至少执行：

```sh
node --check hanzi/app.js
node --check hanzi/steps.js
node --check hanzi/install.js
node --check hanzi/offline.js
node --check hanzi/sw.js
node --check hanzi/dictionary.js
node hanzi/tools/build-dictionary.mjs /path/to/chinese-xinhua
node --check hanzi/data-index.js
git diff --check
```

再用任一静态 HTTP 服务器打开 `hanzi/`，手动确认：

1. 输入“我”“你好”和较少见的已收录字，均能加载并播放；断网或失败后重新点“演示”可再试。
2. 小屏幕中输入框和“演示”按钮仍同行；笔顺缩略图无横向滚动。
3. 下载完成后刷新，按钮仍为“已下载”。中途停止后刷新，按钮为“继续下载”。
4. 将版本号临时改为新值并刷新，应显示“下载更新”。测试结束后恢复或以正式版本发布。
5. 已安装 PWA 更新后，页面可正常打开，且旧离线字库不会在 Service Worker 激活时丢失。
6. 动画结束后点“开始书写”，正确笔顺可完成，错误笔顺会得到提示；释义卡片应显示与当前字一致的内容。

## 提交前注意事项

- `data/chunks/` 很大（约 30 MB），确认只提交有意更新的分包；不要无意格式化全部数据文件。
- 词典数据来自 `pwxcoo/chinese-xinhua`（MIT）；重新生成前需准备其 `data/word.json` 与 `data/ci.json`，并保留许可证文件。
- 全项目的 `.DS_Store` 已由根目录 `.gitignore` 忽略。
- 新增资源应使用相对路径，保证在 GitHub Pages 等静态子路径部署下可用。
- 先查看 `git status --short`，确认没有混入其他小游戏的改动。
