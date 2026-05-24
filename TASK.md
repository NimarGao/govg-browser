# Govg Browser 提升任务跟踪 - 第四阶段优化与功能还原 (v0.3.2)

- `[x]` 1. 前端 React 控制层与 UI 还原 (v0.3.1)
  - `[x]` 简化 `navigate` 接口并清除右侧导航参数
  - `[x]` 简化 `handleBrowserShortcut` 缩放快捷键逻辑，仅处理单个视图
  - `[x]` 重构 View 生命周期绑定，去除 `side` 参数，以 `tab.id` 为单 View 键值
  - `[x]` 重构 `ResizeObserver` 以及 bounds 上报，绑定到单一 `stageRef` 容器
  - `[x]` 移除顶部 toolbar 的“双屏分屏”按钮及 Lucide 库中的 `Columns` 导入
  - `[x]` 移除右侧分屏及其专属工具栏 DOM 节点，还原 `webview-stage` 为单视图容器
- `[x]` 2. 样式表清理 (v0.3.1)
  - `[x]` 彻底清除 [styles.css](file:///D:/ai/bs/src/styles.css) 尾部追加的双屏网格、右分屏工具栏及地址栏的所有 CSS 规则
- `[x]` 3. 右上角控制圆点排序与尺寸优化 (v0.3.2)
  - `[x]` 在 `src/main.jsx` 中调整三个控制按钮的左右顺序，变更为：最小化、最大化、关闭（符合 Windows 习惯）
  - `[x]` 在 `src/styles.css` 中将控制圆点的尺寸从 `12px` 放大至 `14px`
  - `[x]` 将圆点内部的 `─` , `+` , `×` 符号字体大小相应放大，使其更加清晰可见
  - `[x]` 优化符号在圆点内部的显示方式：默认以 `0.45` 虚化可见状态显示，悬停到按钮区域时提高至 `0.8` 可见度，悬停在单个按钮上时全亮（`1.0` 亮度且颜色加深），保证操作直观性
- `[x]` 4. 版本与文档发布 (v0.3.2)
  - `[x]` 在 [package.json](file:///D:/ai/bs/package.json) 中更新版本号为 `0.3.2`
  - `[x]` 同步更新 `README.md`、`WALKTHROUGH.md` 及 `TASK.md` 中的版本和修改说明
  - `[x]` 使用规范的中文注释执行 Git 提交并推送至远端仓库
