let ipcRenderer = null;
let webFrame = null;

try {
  const electron = require('electron');
  ipcRenderer = electron.ipcRenderer;
  webFrame = electron.webFrame;
} catch (e) {
  // 捕获在跨域沙箱子框架 iframe 中 require('electron') 抛出的安全限制异常，防止脚本崩溃中断执行
}

let isFlashModeEnabled = true;
if (ipcRenderer) {
  try {
    isFlashModeEnabled = ipcRenderer.sendSync('settings:get-flash-mode-sync');
  } catch (e) {
    console.error('Failed to get flash mode status:', e);
  }
}

try {
  const antidetectScript = `
    (function() {
      try {
        // 1. 抹除 webdriver 特征
        if (navigator.webdriver !== undefined) {
          Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
          });
        }

        // 1.5 精准区分域名的 User-Agent 伪装：仅在 4399 等 Flash 游戏站中启用 360EE 伪装，而在常规现代网站中老实诚信地声明自己为 GovgBrowser，避免指纹冲突与安全风控
        try {
          const isFlashSite = /4399|7k7k|2144|flash|game|7k7kimg|4399img|bdimg|swf/i.test(location.hostname);
          const mockUA = isFlashSite 
            ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 QIHU 360EE"
            : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 GovgBrowser/0.4.1";
          Object.defineProperty(navigator, 'userAgent', {
            get: () => mockUA
          });
          Object.defineProperty(navigator, 'appVersion', {
            get: () => mockUA
          });
        } catch (e) {}

        // 2. 模拟完整的 window.chrome 属性，避免谷歌等风控校验报错
        const mockChrome = {
          app: {
            isInstalled: false,
            InstallState: {
              DISABLED: 'disabled',
              INSTALLED: 'installed',
              NOT_INSTALLED: 'not_installed'
            },
            runningState: {
              CANNOT_RUN: 'cannot_run',
              READY_TO_RUN: 'ready_to_run',
              RUNNING: 'running'
            }
          },
          runtime: {
            OnInstalledReason: {
              CHROME_UPDATE: 'chrome_update',
              INSTALL: 'install',
              SHARED_MODULE_UPDATE: 'shared_module_update',
              UPDATE: 'update'
            },
            OnRestartRequiredReason: {
              APP_UPDATE: 'app_update',
              OS_UPDATE: 'os_update',
              PERIODIC: 'periodic'
            },
            PlatformArch: {
              ARM: 'arm',
              ARM64: 'arm64',
              MIPS: 'mips',
              MIPS64: 'mips64',
              X86_32: 'x86-32',
              X86_64: 'x86-64'
            },
            PlatformNaclArch: {
              ARM: 'arm',
              MIPS: 'mips',
              MIPS64: 'mips64',
              X86_32: 'x86-32',
              X86_64: 'x86-64'
            },
            PlatformOs: {
              ANDROID: 'android',
              CROS: 'cros',
              LINUX: 'linux',
              MAC: 'mac',
              OPENBSD: 'openbsd',
              WIN: 'win'
            },
            RequestUpdateCheckStatus: {
              NO_UPDATE: 'no_update',
              THROTTLED: 'throttled',
              UPDATE_AVAILABLE: 'update_available'
            }
          },
          csi: function() {
            return {
              startE: Date.now() - 100,
              onloadT: Date.now(),
              pageT: 100,
              tran: 0
            };
          },
          loadTimes: function() {
            return {
              requestTime: (Date.now() - 200) / 1000,
              startLoadTime: (Date.now() - 190) / 1000,
              commitLoadTime: (Date.now() - 100) / 1000,
              finishDocumentLoadTime: (Date.now() - 50) / 1000,
              finishLoadTime: Date.now() / 1000,
              firstPaintTime: (Date.now() - 80) / 1000,
              firstPaintAfterLoadTime: 0,
              navigationType: 'Other',
              wasAlternateProtocolAvailable: false,
              wasFetchedViaSpdy: false,
              wasNpnNegotiated: false,
              npnNegotiatedProtocol: '',
              wasUrlOverridden: false
            };
          }
        };

        if (!window.chrome || !window.chrome.loadTimes) {
          Object.defineProperty(window, 'chrome', {
            get: () => mockChrome
          });
        }

        // 3. 模拟 User-Agent Client Hints
        if (!navigator.userAgentData) {
          const mockUserAgentData = {
            brands: [
              { brand: 'Not/A)Brand', version: '8' },
              { brand: 'Chromium', version: '124' },
              { brand: 'Google Chrome', version: '124' }
            ],
            mobile: false,
            platform: 'Windows',
            getHighEntropyValues: (hints) => Promise.resolve({
              brands: [
                { brand: 'Not/A)Brand', version: '8' },
                { brand: 'Chromium', version: '124' },
                { brand: 'Google Chrome', version: '124' }
              ],
              mobile: false,
              platform: 'Windows',
              platformVersion: '10.0.0',
              architecture: 'x86',
              bitness: '64',
              model: '',
              uaFullVersion: '124.0.0.0'
            })
          };
          Object.defineProperty(navigator, 'userAgentData', {
            get: () => mockUserAgentData
          });
        }

        // 4. 模拟 plugins，完美伪装 Shockwave Flash 插件绕过 SWFObject 检测 (仅在 Flash 模式开启且在 Flash 相关站点时)
        const isFlashSite = /4399|7k7k|2144|flash|game|7k7kimg|4399img|bdimg|swf/i.test(location.hostname);
        if (${isFlashModeEnabled} && isFlashSite) {
          try {
            const mockFlashPlugin = {
              name: "Shockwave Flash",
              description: "Shockwave Flash 32.0 r0",
              filename: "pepflashplayer.dll",
              length: 1,
              item: function(index) { return this; },
              namedItem: function(name) { return this; }
            };
            mockFlashPlugin[0] = {
              type: "application/x-shockwave-flash",
              suffixes: "swf",
              description: "Shockwave Flash",
              enabledPlugin: mockFlashPlugin
            };

            const mockPlugins = {
              "Shockwave Flash": mockFlashPlugin,
              length: 1,
              item: function(index) { return mockFlashPlugin; },
              namedItem: function(name) { return mockFlashPlugin; },
              refresh: function() {}
            };
            mockPlugins[0] = mockFlashPlugin;

            Object.defineProperty(navigator, 'plugins', {
              get: () => mockPlugins
            });

            const mockMimeType = {
              type: "application/x-shockwave-flash",
              suffixes: "swf",
              description: "Shockwave Flash",
              enabledPlugin: mockFlashPlugin
            };

            const mockMimeTypes = {
              "application/x-shockwave-flash": mockMimeType,
              length: 1,
              item: function(index) { return mockMimeType; },
              namedItem: function(name) { return mockMimeType; }
            };
            mockMimeTypes[0] = mockMimeType;

            Object.defineProperty(navigator, 'mimeTypes', {
              get: () => mockMimeTypes
            });
            
            // 注意：彻底移除以前 window.swfobject 的残缺 mock，避免与 Ruffle 内置的 swfobject 模拟库发生变量冲突和缺失函数引发的 JS 崩溃！
          } catch (e) {}

          // 4.5. 原型链防线：在 HTMLObjectElement/HTMLEmbedElement 的 prototype 上硬核注入 checkflash 恒返回 1 瞬间通关
          try {
            Object.defineProperty(HTMLObjectElement.prototype, 'checkflash', {
              get: () => function() { return 1; },
              configurable: true
            });
            Object.defineProperty(HTMLEmbedElement.prototype, 'checkflash', {
              get: () => function() { return 1; },
              configurable: true
            });

            // 积分小游戏交互方法 mock，防止 AS 脚本交互崩溃
            const mockMethods = ['submitscore', 'linkAs3', 'cutshot', 'toggleSound', 'toggleGame'];
            mockMethods.forEach(method => {
              if (!HTMLObjectElement.prototype[method]) {
                HTMLObjectElement.prototype[method] = function() { return 0; };
              }
              if (!HTMLEmbedElement.prototype[method]) {
                HTMLEmbedElement.prototype[method] = function() { return 0; };
              }
            });
          } catch (e) {}

          // 4.6. 全局拦截防线：使用 Object.defineProperty 的 getter/setter 拦截全局容器销毁方法，彻底免疫 4399 覆盖 swfdiv 游戏容器的行为
          try {
            Object.defineProperty(window, 'showBlockFlash', {
              get: () => function() { console.log('[Govg Defender] showBlockFlash was bypassed cleanly'); },
              set: (v) => {},
              configurable: true
            });
            Object.defineProperty(window, 'showBlockFlashIE', {
              get: () => function() { console.log('[Govg Defender] showBlockFlashIE was bypassed cleanly'); },
              set: (v) => {},
              configurable: true
            });
          } catch (e) {}

          // 5. 自动载入 Ruffle Flash 仿真引擎，并装配强力 SWF 主动接管装载引擎
          try {
            // 设置 Ruffle 官方的全局最佳用户体验配置
            window.RufflePlayer = window.RufflePlayer || {};
            window.RufflePlayer.config = {
              "autoplay": "on",
              "unmuteOverlay": "hidden",
              "letterbox": "on",
              "warnOnUnsupportedContent": false,
              "polyfill": true
            };

            const ruffleScript = document.createElement('script');
            // 使用国内极速镜像 JSDMirror 的完整 ruffle.js 浏览器打包路径，确保 100% 成功加载和极速响应，并提供 unpkg.com 作为坚实后盾
            ruffleScript.src = 'https://cdn.jsdmirror.com/npm/@ruffle-rs/ruffle/ruffle.js';
            ruffleScript.onerror = () => {
              const fallback = document.createElement('script');
              fallback.src = 'https://unpkg.com/@ruffle-rs/ruffle';
              fallback.async = true;
              const container = document.head || document.documentElement;
              if (container) container.appendChild(fallback);
            };
            ruffleScript.async = true;
            
            // 安全挂载逻辑，优先注入到已存在的主体标签中，避免在 document_start 阶段 document.head 为 null 的问题
            const container = document.head || document.documentElement;
            if (container) {
              container.appendChild(ruffleScript);
            } else {
              document.addEventListener('DOMContentLoaded', () => {
                (document.head || document.documentElement).appendChild(ruffleScript);
              });
            }

            // 5.5 【核心突破】强强联手的 SWF 主动捕获接管引擎：周期性扫描 DOM 树并强行秒级渲染 SWF 资源
            const runRuffleActiveInterceptor = () => {
              if (!window.RufflePlayer) return;
              
              const candidates = document.querySelectorAll('embed, object');
              candidates.forEach(el => {
                if (el.getAttribute('data-ruffle-intercepted') === 'true') return;
                
                let swfUrl = null;
                if (el.tagName.toLowerCase() === 'embed') {
                  swfUrl = el.getAttribute('src');
                } else if (el.tagName.toLowerCase() === 'object') {
                  swfUrl = el.getAttribute('data');
                  if (!swfUrl) {
                    const movieParam = el.querySelector('param[name="movie"]');
                    if (movieParam) swfUrl = movieParam.getAttribute('value');
                  }
                  if (!swfUrl) {
                    const srcParam = el.querySelector('param[name="src"]');
                    if (srcParam) swfUrl = srcParam.getAttribute('value');
                  }
                }
                
                // 深度提取属性中隐藏的 swf url 兜底
                if (!swfUrl) {
                  const attrs = el.attributes;
                  for (let i = 0; i < attrs.length; i++) {
                    if (/\.swf/i.test(attrs[i].value)) {
                      swfUrl = attrs[i].value;
                      break;
                    }
                  }
                }
                
                if (swfUrl) {
                  el.setAttribute('data-ruffle-intercepted', 'true');
                  try {
                    const ruffle = window.RufflePlayer.newest();
                    if (ruffle) {
                      const player = ruffle.createPlayer();
                      
                      // 完美克隆并应用原有节点的所有尺寸和 CSS 属性
                      player.style.width = el.style.width || el.getAttribute('width') || '100%';
                      player.style.height = el.style.height || el.getAttribute('height') || '100%';
                      if (el.id) player.id = el.id;
                      if (el.className) player.className = el.className;
                      
                      player.style.display = 'block';
                      player.style.visibility = 'visible';
                      
                      // 主动进行 DOM 的替换，杜绝 Chromium 原生 embed 失效引发的加载卡死
                      const parent = el.parentNode;
                      if (parent) {
                        parent.replaceChild(player, el);
                        
                        // 强制拉起 Ruffle SWF 装载
                        player.load({
                          url: swfUrl,
                          allowScriptAccess: true
                        });
                        console.log('[Govg Active Ruffle] Hijacked embed/object successfully. URL:', swfUrl);
                      }
                    }
                  } catch (err) {
                    console.error('[Govg Active Ruffle] Hijack failed:', err);
                  }
                }
              });
            };

            // 高频 250ms 主动触发扫描，确保无论页面以何种异步 JS 渲染，均能即刻秒杀接管
            setInterval(runRuffleActiveInterceptor, 250);
            window.addEventListener('DOMContentLoaded', runRuffleActiveInterceptor);
            window.addEventListener('load', runRuffleActiveInterceptor);
          } catch (e) {}

          // 6. 自动化屏蔽/剔除 4399 等小游戏站点中由于前端检测可能产生的拦截遮罩层，保障底层 Ruffle 游戏界面完美呈现
          try {
            // A. 先注入一层强效全局 CSS 规则，确保哪怕元素是异步渲染出来的，浏览器也能在瞬间隐藏它
            const style = document.createElement('style');
            style.innerHTML = `
              #error_tips, #error-tips, #flash-tips, .flash-tips, .p-tips, .p-mask, .p-box,
              .no-flash-tip, .flash-tip, .flash-upgrade, .flash_upgrade, #p_player_mask, #p_player_tips {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
                z-index: -9999 !important;
              }
            `;
            const styleContainer = document.head || document.documentElement;
            if (styleContainer) styleContainer.appendChild(style);

            const hideFlashBanners = () => {
              // B. 动态覆盖 selectors 样式以确保隐藏
              const selectors = [
                '#error_tips', '#error-tips', '#flash-tips', '.flash-tips', '.p-tips', '.p-mask', '.p-box',
                '.no-flash-tip', '.flash-tip', '.flash-upgrade', '.flash_upgrade', '#p_player_mask', '#p_player_tips'
              ];
              selectors.forEach(sel => {
                try {
                  const nodes = document.querySelectorAll(sel);
                  nodes.forEach(node => {
                    node.style.setProperty('display', 'none', 'important');
                    node.style.setProperty('visibility', 'hidden', 'important');
                    node.style.setProperty('pointer-events', 'none', 'important');
                  });
                } catch(e) {}
              });

              // C. 强效 innerText 高频模糊匹配：对包含不支持/插件等关键词的特定弹出容器直接进行爆破屏蔽
              try {
                const divs = document.querySelectorAll('div');
                divs.forEach(div => {
                  if (div.innerText && (
                    div.innerText.includes('当前浏览器或模式不支持') || 
                    div.innerText.includes('请下载Flash官方插件') || 
                    div.innerText.includes('推荐下载：')
                  )) {
                    const style = window.getComputedStyle(div);
                    if (style.position === 'fixed' || style.position === 'absolute' || div.id.includes('tip') || div.className.includes('tip') || div.id.includes('error')) {
                      div.style.setProperty('display', 'none', 'important');
                      div.style.setProperty('visibility', 'hidden', 'important');
                      div.style.setProperty('pointer-events', 'none', 'important');
                    }
                  }
                });
              } catch(e) {}
            };

            // 尽早在 DOM 生成时处理
            if (document.body || document.documentElement) hideFlashBanners();

            // 监听动态加载出来的遮罩层
            const observer = new MutationObserver(hideFlashBanners);
            observer.observe(document.documentElement, { childList: true, subtree: true });

            // 兼容各种加载阶段
            window.addEventListener('DOMContentLoaded', hideFlashBanners);
            window.addEventListener('load', hideFlashBanners);
            setInterval(hideFlashBanners, 200); // 200ms 高频轮询，彻底扫除死角
          } catch(e) {}
        }
      } catch (e) {}
    })();
  `;

  if (webFrame) {
    try {
      webFrame.executeJavaScript(antidetectScript);
    } catch (e) {
      injectViaDOM(antidetectScript);
    }
  } else {
    injectViaDOM(antidetectScript);
  }
} catch (e) {}

function injectViaDOM(scriptText) {
  try {
    const script = document.createElement('script');
    script.textContent = scriptText;
    const container = document.head || document.documentElement;
    if (container) {
      container.appendChild(script);
      script.remove();
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        const c = document.head || document.documentElement;
        if (c) {
          c.appendChild(script);
          script.remove();
        }
      });
    }
  } catch (e) {}
}

function getFieldLabel(input) {
  const form = input.form;
  const explicitLabel = input.id ? document.querySelector(`label[for="${CSS.escape(input.id)}"]`) : null;
  if (explicitLabel?.textContent) return explicitLabel.textContent.trim();
  if (input.getAttribute('aria-label')) return input.getAttribute('aria-label').trim();
  if (input.placeholder) return input.placeholder.trim();
  if (input.name) return input.name.trim();
  if (form) {
    const index = Array.from(form.elements).indexOf(input);
    return index >= 0 ? `field-${index}` : '';
  }
  return '';
}

function findUsernameField(form, passwordField) {
  const candidates = Array.from(form.querySelectorAll('input'))
    .filter((input) => ['text', 'email', 'tel', 'url', 'number', ''].includes((input.type || '').toLowerCase()))
    .filter((input) => !input.disabled && !input.readOnly);
  const beforePassword = candidates.filter((input) => input.compareDocumentPosition(passwordField) & Node.DOCUMENT_POSITION_FOLLOWING);
  return beforePassword.at(-1) || candidates.at(-1) || null;
}

function captureForm(form) {
  const passwordField = form.querySelector('input[type="password"]');
  if (!passwordField?.value) return;
  const usernameField = findUsernameField(form, passwordField);
  const username = usernameField?.value || '';
  if (!username) return;

  ipcRenderer.sendToHost('credential-captured', {
    origin: location.origin,
    url: location.href,
    username,
    password: passwordField.value,
    usernameLabel: usernameField ? getFieldLabel(usernameField) : '',
    passwordLabel: getFieldLabel(passwordField)
  });
}

window.addEventListener('submit', (event) => {
  if (event.target instanceof HTMLFormElement) captureForm(event.target);
}, true);

window.addEventListener('click', (event) => {
  const button = event.target?.closest?.('button,input[type="submit"],input[type="button"]');
  if (!button) return;
  const form = button.form || button.closest('form');
  if (form) setTimeout(() => captureForm(form), 0);
}, true);

window.addEventListener('keydown', (event) => {
  const isZoomIn = event.ctrlKey && (event.key === '=' || event.key === '+');
  const isZoomOut = event.ctrlKey && event.key === '-';
  const isZoomReset = event.ctrlKey && event.key === '0';
  const isFullscreen = event.key === 'F11';

  if (isZoomIn || isZoomOut || isZoomReset || isFullscreen) {
    event.preventDefault();
    ipcRenderer.sendToHost('webview-keydown', {
      key: event.key,
      ctrlKey: event.ctrlKey
    });
  }
}, true);
