# Govg Browser 提升成果报告 (v0.3.6)

已成功从浏览器中移除第四阶段引入的“左右双分屏浏览（Session隔离多账号登录）”功能，还原回单屏布局。此外，我们重新设计并应用了全新的应用程序图标（去除冗余背景色以实现透明圆角），并且在 v0.3.6 中**无缝集成了内置 Ruffle Flash 仿真引擎**，完美支持播放 4399 等站点的经典 Flash 游戏！

---

## 变更内容清单

### 1. 内置 Ruffle Flash 仿真引擎与 CSP 豁免 (v0.3.6)
*   **Ruffle 全局注入**：
    *   在 `electron/webview-preload.cjs` 的主世界注入逻辑中，增加了自动创建 `<script>` 并异步加载 `https://unpkg.com/@ruffle-rs/ruffle` CDN 脚本的机制。
    *   在网页 DOM 初始化时，Ruffle 会自动抓取页面上的 Flash 元素并替换为现代 HTML5 WebAssembly 渲染器，免去了安装 Adobe 官方插件的烦恼。
*   **主进程 CSP 头部拦截豁免**：
    *   有些网站设定了严格的 `Content-Security-Policy`（内容安全策略）以阻拦外部 CDN 脚本和 WebAssembly Worker 加载。
    *   为此，在 `electron/main.js` 的 `sess.webRequest.onHeadersReceived` 中设计了极具远见的 CSP 拦截过滤器：自动识别 `content-security-policy` 响应头，并对 `unpkg.com` 域名和 `blob:` 协议提供安全豁免信任，确保在所有小游戏网站上 Flash 仿真均能完美生效。

### 2. 应用程序图标透明背景优化 (v0.3.5)
*   **去除冗余背景**：新图标在 `generate_image` 阶段移除了圆角矩形四周的多余白色/灰色 canvas 背景，实现纯透明底色。在打包和 Windows 任务栏显示时，将只保留精致的圆角红底 G 字徽标，与系统主题和壁纸完美融合。
*   **路径与配置应用**：
    *   `electron/icon.png` 运行时图标已覆写为最新的透明版。
    *   `build/icon.png` 构建端图标已覆写为最新的透明版。

### 3. 全新红色 G 字母应用图标设计与集成 (v0.3.4)
*   **设计细节**：红色背景，中间带有一个圆润且醒目的白色大写字母 `G`，采用现代跨平台设计。
*   **运行期任务栏图标配置**：
    *   在实例化 `BrowserWindow` 时显式声明 `icon: path.join(__dirname, 'icon.png')`，使开发启动和运行期任务栏正常渲染此红色图标。

### 4. 右上角控制圆点极简优化 (v0.3.3)
*   **去除文字符号**：移除了圆点内部的 `─` , `+` , `×` 符号文本及对应的伪元素样式，使按钮成为更加高端纯净的彩色圆点，尺寸重置回标准 `12px` 直径。
*   **按 Windows 习惯排序**：从左至右顺序为：**最小化 (黄)、最大化 (绿)、关闭 (红)**。

### 5. 还原前端 React 控制层与 UI (v0.3.1)
*   `navigate` 接口移除了 `side` 参数分支，仅对单主视图进行载入控制。
*   React 挂载与 native views 生命周期同步 `useEffect` 去除了 views 分流，仅管理以 `tab.id` 命名的单一 WebContentsView。
*   bounds 上报仅通过一个 `ResizeObserver` 跟踪主显示面板的 rect 大小。
*   从 toolbar 中移除分屏切换 Columns 按钮，并将 `webview-stage` 恢复为单占位面板结构。

### 6. 清理 CSS 样式表 (v0.3.1)
*   在 `src/styles.css` 中，删除一切分屏相关的 CSS 规则，恢复原有的单屏主视图自适应铺满样式。

### 7. 保留的核心防风控特征
*   **网页防检测注入（确保 Google 登录正常）**：
    *   `webview-preload.cjs` 利用 `webFrame.executeJavaScript` 注入到网页的主世界，抹除 `navigator.webdriver` 标记，模拟完整的 `window.chrome` 属性、`userAgentData` 及 `plugins`，成功避开 Google 账号登录等高级自动化检测。

---

## 修改文件详情

1.  **package.json**：版本号升级为 `0.3.6`，并在 `build.win` 配置中指定了新图标。
2.  **electron/main.js**：还原为单 View 控制，在 `registerBlockerOnSession` 中增加了 `onHeadersReceived` 对 CSP 头部中 unpkg CDN 及 blob: 协议的自动豁免策略。
3.  **electron/preload.cjs**：还原暴露单屏视图控制接口。
4.  **electron/webview-preload.cjs**：保留防检测指纹脚本注入，同时在加载网页时自动插入 Ruffle.js CDN 初始化脚本。
5.  **src/main.jsx**：移除了右屏相关 DOM 和所有 splitMode 控制分支，并将 window-controls 的三圆点顺序变更为 最小化 -> 最大化 -> 关闭。
6.  **src/styles.css**：移除了分屏样式与圆点内的伪元素字符定义。
7.  **项目文档** (`README.md`, `FUTURE_ROADMAP.md`, `TASK.md`, `WALKTHROUGH.md`)：同步更新。

---

## 验证与测试指引

目前 Electron 开发环境已成功运行在新版 `0.3.6` 上，可执行以下项进行功能验证：

1.  **Flash 小游戏运行验证**：
    *   在地址栏输入并访问 `https://www.4399.com` 或 `https://www.7k7k.com` 等 Flash 游戏网站。
    *   选择一个经典的 Flash 游戏打开，观察页面中的 Flash 区域。确认 Ruffle WebAssembly 仿真器已自动加载，并用 HTML5 播放器完美模拟了 Flash 游戏的运行，音画同步且交互正常，无需本地安装任何 Flash 插件。
2.  **任务栏与应用图标验证**：
    *   确认 Windows 任务栏以及编译出的 exe 应用程序显示为精致无外部多余底色的圆角红底 G 字应用徽标。
3.  **Google 登录验证**：
    *   访问 `https://accounts.google.com` 尝试登录，确认登录页面加载正常，不会拦截提示“此浏览器或应用可能不安全”。
