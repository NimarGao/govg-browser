const { ipcRenderer, webFrame } = require('electron');

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

        // 4. 模拟 plugins，完美伪装 Shockwave Flash 插件绕过 SWFObject 检测
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

          // 注入 mock 版本的 swfobject.getFlashPlayerVersion 预热以绕过特定的 JS 库检测
          window.swfobject = window.swfobject || {};
          window.swfobject.getFlashPlayerVersion = function() {
            return { major: 32, minor: 0, release: 0 };
          };
        } catch (e) {}

        // 5. 自动载入 Ruffle Flash 仿真引擎，无缝支持 4399 等 Flash 小游戏
        try {
          const ruffleScript = document.createElement('script');
          ruffleScript.src = 'https://unpkg.com/@ruffle-rs/ruffle';
          ruffleScript.async = true;
          document.head.appendChild(ruffleScript);
        } catch (e) {}
      } catch (e) {}
    })();
  `;
  webFrame.executeJavaScript(antidetectScript);
} catch (e) {}

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
