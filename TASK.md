# Govg Browser 提升任务跟踪 - 第四阶段优化与功能还原 (v0.3.1)

- `[x]` 1. 前端 React 控制层与 UI 还原
  - `[x]` 简化 `navigate` 接口并清除右侧导航参数
  - `[x]` 简化 `handleBrowserShortcut` 缩放快捷键逻辑，仅处理单个视图
  - `[x]` 重构 View 生命周期绑定，去除 `side` 参数，以 `tab.id` 为单 View 键值
  - `[x]` 重构 `ResizeObserver` 以及 bounds 上报，绑定到单一 `stageRef` 容器
  - `[x]` 移除顶部 toolbar 的“双屏分屏”按钮及 Lucide 库中的 `Columns` 导入
  - `[x]` 移除右侧分屏及其专属工具栏 DOM 节点，还原 `webview-stage` 为单视图容器
- `[x]` 2. 样式表清理
  - `[x]` 彻底清除 [styles.css](file:///D:/ai/bs/src/styles.css) 尾部追加的双屏网格、右分屏工具栏及地址栏的所有 CSS 规则
- `[x]` 3. 防风控与 macOS 控制按钮保留
  - `[x]` 确保右上角 macOS 三色交通灯控制按钮及 Hover 细线字符完全正常工作
  - `[x]` 确保 `webview-preload.cjs` 中跨越隔离沙箱向网页主世界（Main World）注入的 anti-detect 脚本完全保留且正常运行，以保障 Google 账号登录通过验证
- `[x]` 4. 版本与文档发布
  - `[x]` 在 [package.json](file:///D:/ai/bs/package.json) 中更新版本号为 `0.3.1`
  - `[x]` 同步清理 `README.md`、`FUTURE_ROADMAP.md`、`WALKTHROUGH.md` 及 `TASK.md` 中的双分屏相关陈述
  - `[x]` 使用规范的中文注释执行 Git 提交并推送至远端仓库
