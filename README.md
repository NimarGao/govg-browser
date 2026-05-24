# Govg Browser

Govg Browser 是一个基于 React + Electron 的 Windows 桌面浏览器。项目已完成重构与升级，采用了现代化的 **`WebContentsView`** 底座架构，并加入了无痕隐私模式、精细化 Cookie 管理及 Hosts 广告拦截等高级功能。

---

## 核心特性

- 🌐 **现代渲染底座**：已重构淘汰旧版的 `<webview>`，升级为现代 Electron 推荐的 `WebContentsView`。通过 React 占位容器的 `ResizeObserver` 实时上报尺寸，实现极速布局同步，彻底杜绝渲染闪烁与拖拽冲突。
- 🎨 **macOS 交通灯控制按钮**：
  - 右上角窗口控制按钮重构为 macOS 风格的“红、黄、绿”三色交通灯圆点。
  - 当鼠标 Hover 悬停到该区域时，圆点内部会平滑渐显出对应的极细控制符号（`×`、`─`、`+`），提供极致的高端视觉体验。
- 🛡️ **正规浏览器防风控**：
  - **User-Agent 伪装**：全量覆写包括默认、无痕等所有 Session 会话的 User-Agent，统一使用最新标准 Chrome 代理字串，彻底剔除 `Electron` 等特征指纹。
  - **webdriver 抹除**：在 Preload 脚本最前端注入 antidetect 机制，抹除 `navigator.webdriver` 探测指纹并隐藏 Chrome 自动化检测痕迹，避开大部分正规网站的安全风控（如 WAF、强验证码拦截）。
- 🔒 **无痕隐私模式**：支持一键开启无痕标签页，使用内存隔离会话（`incognito`），不记录任何历史记录，静默拦截密码保存提示，且配备专属的暗黑高质感皮肤。
- 🍪 **精细化 Cookie 管理**：系统设置面板中支持查看当前网站的 Cookies，并支持选择性地删除单项 Cookie。该操作会根据当前网页的普通或无痕属性自动适配对应的 Session 会话。
- 🛡️ **高性能 adblocker**：在主进程通过哈希 Set 进行 $O(1)$ 高性能匹配过滤，默认静默拦截约 30 个主流广告及追踪服务域名。
- 🎮 **内置 Ruffle Flash 仿真引擎**：通过 Preload 全局安全加载 Ruffle WebAssembly 仿真器，并利用主进程 `webRequest` 优化豁免 Content-Security-Policy 头部限制。无缝兼容并支持播放 4399、7k7k 等怀旧经典 Flash 小游戏，无需安装庞大且不安全的 Adobe 插件。
- 🔍 **自定义搜索引擎与启动页**：支持在 Bing、百度、Google 之间一键切换默认搜索引擎；支持自定义配置新标签页的启动 URL。
- ⚡ **快捷缩放与全屏**：按下 `Ctrl + = / -` 实现 `50% ~ 400%` 页面无缝缩放，在偏离 `100%` 时于地址栏展示快捷气泡；按 `F11` 即可进入沉浸式全屏。

---

## 技术栈

- **Electron** (现代版，支持 WebContentsView)
- **React** (v18+)
- **Vite** (v6+)
- **electron-store**
- **lucide-react**
- **electron-builder**

---

## 开发与构建

### 1. 开发环境
推荐使用 Node.js 20 或更高版本。

```bash
# 安装依赖
npm install

# 启动开发环境
npm start
```

### 2. 生产打包
```bash
# 构建前端包
npm run build

# 生成解包版 Windows 应用目录
npm run pack

# 生成 Windows 安装包及便携式应用
npm run dist
```
打包后生成的文件将输出在 `release/` 目录下。

---

## 项目结构

```text
.
├── electron/
│   ├── main.js              # Electron 主进程 (生命周期、IPC 通道与 View 控制)
│   ├── preload.cjs          # 主窗口 preload
│   └── webview-preload.cjs  # 网页 preload (防风控注入与快捷键捕获)
├── src/
│   ├── main.jsx             # React 浏览器界面 UI 逻辑与窗口控制
│   └── styles.css           # 界面样式与 mac 交通灯布局
├── index.html               # Vite 入口
├── vite.config.js           # Vite 配置
└── package.json             # 项目与打包配置 (当前版本 0.3.7)
```
