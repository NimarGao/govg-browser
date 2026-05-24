# Govg Browser

Govg Browser 是一个基于 React + Electron 的 Windows 桌面浏览器。项目已完成重构与升级，采用了现代化的 **`WebContentsView`** 底座架构，并加入了无痕隐私模式、精细化 Cookie 管理及 Hosts 广告拦截等高级功能。

---

## 核心特性

- 🌐 **现代渲染底座**：已重构淘汰旧版的 `<webview>`，升级为现代 Electron 推荐的 `WebContentsView`。通过 React 占位容器的 `ResizeObserver` 实时上报尺寸，实现极速布局同步，彻底杜绝渲染闪烁与拖拽冲突。
- 🔒 **无痕隐私模式**：支持一键开启无痕标签页，使用内存隔离会话（`incognito`），不记录任何历史记录，静默拦截密码保存提示，且配备专属的暗黑高质感皮肤。
- 🍪 **精细化 Cookie 管理**：系统设置面板中支持查看当前网站的 Cookies，并支持选择性地删除单项 Cookie。该操作会根据当前网页的普通或无痕属性自动适配对应的 Session 会话。
- 🛡️ **高性能 adblocker**：在主进程通过哈希 Set 进行 $O(1)$ 高性能匹配过滤，默认静默拦截约 30 个主流广告及追踪服务域名。
- 🔍 **自定义搜索引擎与启动页**：支持在 Bing、百度、Google 之间一键切换默认搜索引擎；支持自定义配置新标签页的启动 URL。
- ⚡ **快捷缩放与全屏**：按下 `Ctrl + = / -` 实现 `50% ~ 400%` 页面无缝缩放，在偏离 `100%` 时于地址栏展示快捷气泡；按 `F11` 即可进入沉浸式全屏。
- 📌 **常用网址自定义**：新标签页磁贴（Quick Links）转由 `electron-store` 持久化，支持悬停删除与快捷添加。

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
│   └── webview-preload.cjs  # 网页 webview/view preload (快捷键与表单捕获)
├── src/
│   ├── main.jsx             # React 浏览器界面 UI 逻辑与状态管理
│   └── styles.css           # 界面样式与无痕暗色皮肤配置
├── index.html               # Vite 入口
├── vite.config.js           # Vite 配置
└── package.json             # 项目与打包配置 (当前版本 0.2.0)
```

---

## 数据存储

收藏夹、历史记录、下载记录和加密后的账号密码保存在 Electron 用户数据目录中。Windows 下默认位于：

```text
%APPDATA%/govg-browser
```

- 密码使用 Electron `safeStorage` 进行加密。
- 提供了“清除所有数据”功能，清除时会同时清空默认 session 和自定义普通分区 `persist:govg-browser` 的全部本地缓存、Cookies 及存储。
