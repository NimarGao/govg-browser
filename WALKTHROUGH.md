# Govg Browser 提升成果报告

我们已成功完成 Govg Browser 全部四个阶段的重构、优化与提升！本文档详细汇总了各阶段的开发成果、架构设计、修改的文件列表以及相关的验证方法。

---

## 变更内容清单

### 1. 第一阶段：核心交互体验优化 (已完成)
*   **常用网址自定义**：主页磁贴（Quick Links）转由 `electron-store` 持久化，支持悬停删除与添加自定义网站（自动补全 `https://`）。
*   **快捷网页缩放**：按下键盘 `Ctrl + = / - / 0` 可实现 `50% ~ 400%` 的网页缩放，并在偏离 `100%` 时于地址栏展示气泡，支持点击一键恢复重置。
*   **F11 全屏切换**：按 `F11` 进入/退出无干扰沉浸全屏，标签和工具栏以平滑的滑入滑出动效呈现。
*   **侧边栏实时过滤**：历史记录和书签侧边栏顶部增加即时过滤输入框。

### 2. 第二阶段：隐私保护与系统设置 (已完成)
*   **无痕隐私模式**：支持新建无痕标签页，采用临时会话分区 `incognito`，Cookie 和本地缓存在关闭时直接销毁。无痕标签页下，浏览器采用高质感的深紫色/暗黑色皮肤，并不记录任何历史记录、禁用密码自动捕获。
*   **默认搜索引擎切换**：支持在设置侧边栏内于 Bing、百度、Google 之间即时切换。
*   **启动页自定义**：允许用户自定义主页/启动页 URL（默认为 `swift://newtab`）。
*   **高性能广告拦截**：在主进程使用 `Set` 过滤（$O(1)$ 复杂度），提供约 30 个主流广告域名的静默拦截，并覆盖所有普通与无痕 Session。

### 3. 第三阶段：渲染架构升级与精细化 Cookie 管理 (已完成)
*   **`WebContentsView` 架构重构**：
    *   淘汰已弃用且性能较差的 `<webview>` Shadow DOM 容器。
    *   主进程 `main.js` 统一接管所有网页的生命周期。每新建一个标签页，主进程创建一个 `WebContentsView` 实例，并根据 React 占位符 `ResizeObserver` 实时上报的 bounds 进行位置和尺寸的同步（`setBounds`）。
    *   完美解决了侧边栏折叠/展开、全屏切换时的布局平滑自适应，无白边、无闪烁。
*   **精细化 Cookie 管理**：
    *   在“系统设置”下增加了“当前网站 Cookies”列表。
    *   支持根据当前标签页的属性（普通模式或无痕模式）自动路由到相应的 Session 分区（`persist:govg-browser` 或 `incognito`）动态获取单站 Cookie 列表。
    *   实现了单项 Cookie 的精细化安全删除，删除后列表即时刷新。
*   **深度隐私清理升级**：
    *   一键“清除所有浏览器数据”操作不仅清理 `defaultSession`，还会彻底清除普通模式分区 `persist:govg-browser` 目录下的所有本地数据（Cookies、LocalStorage、Cache、IndexDB等），保证清理的彻底性。

### 4. 第四阶段：独立双分屏、Mac 控制圆点与网页防风控 (已完成)
*   **独立分屏隔离（Session 隔离）**：
    *   顶部栏新增一个“分屏 (Columns)”切换按钮。
    *   启用分屏后，右分屏挂载在独立的隔离 Session 会话上（普通模式：`persist:govg-split-${tabId}`；无痕模式：`incognito-split-${tabId}`）。
    *   右分屏采用独立的轻量级地址导航栏（包含后退、前进、刷新和专属输入框）。
    *   左右分屏的 Cookies/缓存物理隔离，**支持同时登录同一个网站的不同账号**。
    *   退出分屏时，销毁右分屏并安全清空右侧缓存，页面自动切回单屏并无缝保留左屏的已登录态和缓存。
*   **macOS 圆点控制按钮**：
    *   窗口控制按钮重塑为 macOS 风格的“红、黄、绿”三色交通灯圆点。
    *   当鼠标 Hover 到控制区域时，圆点内部平滑渐显出对应的 `×`、`─`、`+` 细线符号，提供细腻的操作手感和高度的视觉美感。
*   **网页防风控伪装（正规浏览器指纹对齐）**：
    *   **User-Agent 全面伪装**：统一将包含默认、无痕、分屏等所有 Session 的 UA 重写为最新最正规的标准 Chrome UA，剔除 `Electron` 等指纹标记。
    *   **抹除 webdriver**：在 `webview-preload.cjs` 的最开头注入安全保护脚本，拦截并重写 `navigator.webdriver` 属性为 `undefined`，并移除 Chrome 自动化探测特有的变量，避开绝大部分安全防护系统（如 Cloudflare WAF、登录页面防爬风控等）。

---

## 修改文件详情

1.  **package.json**：
    *   版本号已升级至 `0.3.0`。
2.  **electron/main.js**：
    *   在头部定义 `STANDARD_UA` 并应用到 `createWindow` 及 `whenReady` 中；
    *   重塑 `tabViews` 映射表以记录 `leftView` 和 `rightView` 左右两个网页视窗；
    *   升级 `views:` 系列 IPC 处理接口，接收 `side`（`'left'` / `'right'`）参数，并对右分屏配置独立的 session 分区；
    *   在右分屏销毁时，主动调用 `clearStorageData` 释放右屏专属分区的本地存储。
3.  **electron/preload.cjs**：
    *   扩展 `createView`, `destroyView`, `setViewBounds`, `loadViewUrl`, `goBackView`, `goForwardView`, `reloadView`, `setViewZoom` 以及 `executeViewJavaScript` 接口，支持传递 `side` 参数。
4.  **electron/webview-preload.cjs**：
    *   在文件头部注入 `navigator.webdriver` 抹除和 `chrome.runtime` 的防自动化探测处理脚本，防止网页安全风控判定。
5.  **src/main.jsx**：
    *   将右上角窗口控制重塑为 macOS 交通灯三圆点 HTML 结构（`mac-btn close`, `mac-btn minimize`, `mac-btn maximize`）；
    *   在 toolbar 末尾增加了分屏 Columns 控制按钮；
    *   重构 `navigate`、`tabs` 同步逻辑、Bounds 尺寸上报（双 `ResizeObserver` 分别定位左、右屏 placeholder 的 rect 边界），并在 ViewsEvent 监听里对 `side` 事件做精准的状态同步；
    *   在双屏分屏时，右侧渲染带轻量地址栏和独立加载状态的分屏区域。
6.  **src/styles.css**：
    *   为 `.window-controls.macos-style` 交通灯红黄绿圆点及 Hover 时显示的 `×`、`─`、`+` 符号设计了细腻的动效样式；
    *   编写了双屏分屏的网格分割布局、右侧 `.split-toolbar` 专属工具栏及地址栏的视觉美化样式。

---

## 验证与测试指引

目前 Electron 主进程已成功启动并顺畅运行，请按以下步骤验证第四阶段的核心功能：

1.  **macOS 交通灯按钮验证**：
    *   确认右上角三个按钮变为精致的红、黄、绿圆点。
    *   鼠标 Hover 到该区域时，验证圆点中隐约显出极细的操作图标。
2.  **左右屏多账号登录验证**：
    *   点击工具栏右侧的“分屏”按钮，开启双屏。
    *   在左屏输入 `https://www.bing.com` 并登录账号 A。
    *   在右屏的紧凑地址栏中输入 `https://www.bing.com`，确认右屏并没有继承账号 A，然后登录账号 B。
    *   验证左右屏是否可以**同时保持两个不同账号的在线状态**，且互不干扰。
    *   点击右侧分屏的“关闭分屏”按钮，刷新左屏，验证左屏的账号 A 登录态依然存在，这证明了 Session 缓存物理隔离的正确性。
3.  **防风控与 UA 检查**：
    *   在左屏或右分屏输入 `https://bot.sannysoft.com`。
    *   确认检测结果中：
        *   `User-Agent` 不包含任何 `Electron` 关键字，呈现为标准 Chrome。
        *   `navigator.webdriver` 判定为 `false` 或 `undefined`，成功绕过自动化指纹检测。
