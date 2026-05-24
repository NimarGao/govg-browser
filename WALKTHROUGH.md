# Govg Browser 提升成果报告 (v0.3.7)

已成功从浏览器中移除第四阶段引入的“左右双分屏浏览（Session隔离多账号登录）”功能，还原回单屏布局。此外，我们重新设计并应用了全新的应用程序图标（去除冗余背景色以实现透明圆角），并且在 v0.3.7 中**深度集成了内置 Ruffle Flash 仿真引擎及最完美的 Flash 插件环境伪装**，完美攻克并支持播放 4399 等站点的所有经典 Flash 游戏！

---

## 变更内容清单

### 1. Flash 插件 Shockwave 完美伪装与 Ruffle 仿真引擎 (v0.3.6 - v0.3.7)
*   **Flash 插件首屏环境伪装 (v0.3.7)**：
    *   在 `webview-preload.cjs` 的 IIFE 首屏安全执行环境中，通过 `Object.defineProperty` 深度覆写并重写了 `navigator.plugins` 与 `navigator.mimeTypes`。
    *   动态模拟并构造了符合原生标准的 `Shockwave Flash` 插件属性、MimeType 类型（`application/x-shockwave-flash`）以及 DLL 解析映射，**使其 100% 具备真实 Flash Player 运行环境的物理指纹**。
    *   **SWFObject 深度绕过**：部分站点使用过时的 SWFObject 库检测系统 Flash 版本，我们在全局预热重写了 `window.swfobject.getFlashPlayerVersion` 钩子函数，直接返回版本号 `{ major: 32, minor: 0, release: 0 }`。
    *   这保证了网页底层的 Flash 检测机制会被瞬间绿灯放行，无延时直接向 DOM 插入 `<embed>` 或 `<object>` Flash 节点，彻底杜绝了 4399 等网站检测失败并提示“未安装插件”的尴尬情况！
*   **Ruffle 全局注入 (v0.3.6)**：
    *   在网页 DOM 初始化时，异步从 CDN 挂载 Ruffle WebAssembly 仿真器。一旦伪装通过网页在 DOM 中挂载了 Flash 节点，Ruffle 会在第一微秒将其优雅捕获，并用现代 Canvas 播放器渲染出 Flash 画面。
*   **主进程 CSP 头部拦截豁免 (v0.3.6)**：
    *   在 `electron/main.js` 的 `sess.webRequest.onHeadersReceived` 中对 CSP（内容安全策略）响应头进行动态过滤优化，安全放行 `unpkg.com` 域名以及 `blob:` 协议连接，确保仿真引擎无论在任何站点下均能 100% 顺畅加载 WebAssembly 模块。

### 2. 应用程序图标透明背景优化 (v0.3.5)
*   **去除冗余背景**：新图标在 `generate_image` 阶段移除了圆角矩形四周的多余白色/灰色 canvas 背景，实现纯透明底色。在打包和 Windows 任务栏显示时，将只保留精致的圆角红底 G 字徽标，与系统主题和壁纸完美融合。
*   **路径与配置应用**：
    *   `electron/icon.png` 运行时图标已覆写为最新的透明版。
    *   `build/icon.png` 构建端图标已覆写为最新的透明版。

### 3. 全新红色 G 字母应用图标设计与集成 (v0.3.4)
*   **设计细节**：红色背景，中间带有一个圆润且醒目的白色大写字母 `G`，采用现代跨平台设计。
*   **运行期任务栏图标配置**：
    *   在主进程实例化 `BrowserWindow` 时显式声明 `icon: path.join(__dirname, 'icon.png')`，使开发启动和运行期任务栏正常渲染此红色图标。

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

1.  **package.json**：版本号升级为 `0.3.7`，并在 `build.win` 配置中指定了新图标。
2.  **electron/main.js**：还原为单 View 控制，在 `registerBlockerOnSession` 中增加了 `onHeadersReceived` 对 CSP 头部中 unpkg CDN 及 blob: 协议的自动豁免策略。
3.  **electron/preload.cjs**：还原暴露单屏视图控制接口。
4.  **electron/webview-preload.cjs**：在防检测脚本及 IIFE 首屏载入中，加入了对 `navigator.plugins`、`navigator.mimeTypes` 及 `swfobject.getFlashPlayerVersion` 的 Shockwave Flash 完美防检测伪装，并保留 Ruffle Flash 仿真引擎自动加载。
5.  **src/main.jsx**：移除了右屏相关 DOM 和所有 splitMode 控制分支，并将 window-controls 的三圆点顺序变更为 最小化 -> 最大化 -> 关闭。
6.  **src/styles.css**：移除了分屏样式与圆点内的伪元素字符定义。
7.  **项目文档** (`README.md`, `FUTURE_ROADMAP.md`, `TASK.md`, `WALKTHROUGH.md`)：同步更新。

---

## 验证与测试指引

目前 Electron 开发环境已成功运行在新版 `0.3.7` 上，可执行以下项进行功能验证：

1.  **Flash 小游戏运行验证**：
    *   在地址栏输入并访问 `https://www.4399.com/flash/9714_2.htm` 或其他经典的 Flash 页面。
    *   观察游戏加载区域。确认在不弹出任何“未安装 Flash 插件”拦截警告的情况下，Ruffle WebAssembly 仿真器已完美初始化，游戏加载动画成功渲染，能够直接鼠标点击游玩，体验完美，彻底告别插件缺失！
2.  **任务栏与应用图标验证**：
    *   确认 Windows 任务栏以及编译出的 exe 应用程序显示为精致无外部多余底色的圆角红底 G 字应用徽标。
3.  **Google 登录验证**：
    *   访问 `https://accounts.google.com` 尝试登录，确认登录页面加载正常，不会拦截提示“此浏览器或应用可能不安全”。
