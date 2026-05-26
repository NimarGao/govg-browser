# Govg Browser 安全整改报告 (v0.5.1)

本次整改目标是降低账号风控风险，尤其是避免 Google 账号再次在应用内嵌浏览器中触发异常登录判断。

## 排查结论

### 1. Google 账号登录不能放在应用内嵌视图里

Govg Browser 当前使用 Electron `WebContentsView` 承载网页。它比早期 `<webview>` 更适合做浏览器壳，但本质上仍然是嵌入在应用中的网页视图。Google 官方帮助文档明确提到，Google 可能阻止嵌入在其他应用中的浏览器登录账号。

因此，不应该在 Govg Browser 内完成 Google 账号登录、账号选择和 OAuth 授权。

### 2. 不能靠伪装浏览器指纹解决问题

固定覆写 User-Agent、模拟 Chrome 特征、隐藏自动化痕迹等做法会制造更不一致的浏览器指纹。对 Google 这类账号安全系统来说，这不是“更像 Chrome”，而是更像伪造环境。

本次整改删除了固定 Chrome User-Agent 覆写逻辑，项目后续也不应再走指纹伪装路线。

### 3. 密码捕获脚本不能触碰高风险账号页

普通站点的“保存账号密码”功能依赖 preload 捕获登录表单。这个能力对 Google 账号登录页非常敏感，会放大账号风控风险。

本次整改后，Google 账号认证页面不会触发密码表单捕获。

## 已完成改动

- 新增 Google 认证 URL 识别逻辑。
- 检测到 Google 账号登录、账号选择或 OAuth 页面时，阻止应用内加载。
- 自动调用系统默认浏览器打开 Google 认证链接。
- 删除固定 Chrome User-Agent 覆写逻辑。
- Google 账号认证页面禁用密码表单捕获。
- README、TASK、WALKTHROUGH 文档改为合规安全说明。

## 当前策略

Govg Browser 可以继续用于普通网页访问、搜索、下载、收藏和历史记录。

涉及 Google 账号登录时，应用只做一件事：把认证链接交给系统默认浏览器。推荐用户在 Chrome、Edge、Firefox、Safari 等 Google 支持的浏览器中完成登录。

## 后续建议

- 对 Microsoft、Apple、GitHub 等高价值身份提供商应用同样策略。
- 将密码保存改为默认关闭，由用户手动开启。
- 在设置页增加“安全模式”，安全模式下禁用所有表单捕获和注入类功能。
- 对 README 增加“不要使用本项目登录高价值账号”的醒目提醒。
