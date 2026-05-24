# Govg Browser

Govg Browser 是一个基于 React + Electron 的 Windows 桌面浏览器。项目目标是提供一个启动快、界面简洁、无广告干扰的可用浏览器壳，支持常见浏览器功能，并保留后续扩展空间。

## 功能

- 网页访问：支持输入网址或关键词搜索。
- 多标签页：支持新建、关闭、切换标签页。
- 基础导航：支持后退、前进、刷新、主页。
- 收藏夹：支持收藏当前页面、打开收藏、删除收藏。
- 历史记录：自动记录访问历史，支持打开、删除和清空。
- 账号密码：登录表单提交后提示保存账号密码，并支持当前网站自动填充。
- 下载管理：支持查看下载进度、打开下载文件、定位到文件夹、取消下载和清空记录。
- 右键菜单：网页内支持后退、前进、刷新、复制、全选和审查元素。
- 自定义窗口栏：使用无边框窗口，右上角提供最小化、最大化和关闭按钮。
- 基础广告拦截：主进程对常见广告域名做请求级拦截。

## 技术栈

- Electron
- React
- Vite
- electron-store
- lucide-react
- electron-builder

## 开发环境

推荐使用 Node.js 20 或更高版本。

安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm start
```

生产构建：

```bash
npm run build
```

生成目录版 Windows 应用：

```bash
npm run pack
```

生成 Windows 安装包和便携版：

```bash
npm run dist
```

## 项目结构

```text
.
├── electron/
│   ├── main.js              # Electron 主进程
│   ├── preload.cjs          # 主窗口 preload
│   └── webview-preload.cjs  # 网页 webview preload
├── src/
│   ├── main.jsx             # React 浏览器界面
│   └── styles.css           # 界面样式
├── index.html               # Vite 入口
├── vite.config.js           # Vite 配置
└── package.json             # 项目与打包配置
```

## 本地数据

收藏夹、历史记录、下载记录和加密后的账号密码保存在 Electron 用户数据目录中。Windows 下默认位于：

```text
%APPDATA%/govg-browser
```

密码使用 Electron `safeStorage` 加密；如果系统加密能力不可用，会退化为 Base64 存储，不建议在生产环境使用该退化模式。

## Windows 打包产物

打包后文件输出到 `release/`：

- `Govg Browser-版本号-x64-setup.exe`：安装包
- `Govg Browser-版本号-x64-portable.exe`：便携版
- `win-unpacked/Govg Browser.exe`：目录版可执行文件

## 已知限制

- 当前浏览器基于 Electron `webview`，与 Chrome 完整浏览器能力仍有差距。
- 广告拦截为基础域名规则，不等同于完整扩展级拦截器。
- 尚未配置正式代码签名证书，Windows 可能提示未知发布者。
