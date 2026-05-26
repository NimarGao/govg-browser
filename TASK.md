# Govg Browser 安全整改任务跟踪 (v0.5.1)

- `[x]` 1. Google 账号认证护栏
  - `[x]` 识别 `accounts.google.com`、`myaccount.google.com`、Google 登录页和 OAuth 路径。
  - `[x]` 在应用内视图中阻止 Google 账号登录流程继续加载。
  - `[x]` 自动调用系统默认浏览器打开 Google 认证链接。

- `[x]` 2. 移除浏览器身份伪装方向
  - `[x]` 删除固定 Chrome User-Agent 覆写逻辑。
  - `[x]` 不再把 Govg Browser 包装成标准 Chrome。
  - `[x]` 文档中明确禁止通过指纹伪装、自动化隐藏等方式规避风控。

- `[x]` 3. 密码保存降风险
  - `[x]` Google 账号认证页面不触发密码表单捕获。
  - `[x]` 无痕标签页继续禁用密码保存提示。
  - `[x]` 普通站点的保存密码功能保留，但不覆盖高风险身份认证页面。

- `[x]` 4. 文档同步
  - `[x]` README 增加 Google 账号登录说明。
  - `[x]` WALKTHROUGH 改为安全整改报告。
  - `[x]` TASK 改为安全整改任务记录。

- `[ ]` 5. 后续建议
  - `[ ]` 为更多身份提供商增加同类外部浏览器护栏，例如 Microsoft、Apple、GitHub。
  - `[ ]` 增加“账号安全模式”开关，默认禁止保存任何登录密码。
  - `[ ]` 在设置页增加安全说明和清理认证相关 Cookie 的快捷入口。
