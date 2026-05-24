try {
  // 1. 抹除 webdriver 特征
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined
  });

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

  // 4. 模拟 plugins，防止被判定为 Headless 环境
  if (!navigator.plugins || navigator.plugins.length === 0) {
    const mockPlugins = [
      { name: 'PDF Viewer', description: 'Portable Document Format', filename: 'internal-pdf-viewer' },
      { name: 'Chrome PDF Viewer', description: 'Portable Document Format', filename: 'internal-pdf-viewer' },
      { name: 'Chromium PDF Viewer', description: 'Portable Document Format', filename: 'internal-pdf-viewer' }
    ];
    Object.defineProperty(navigator, 'plugins', {
      get: () => mockPlugins
    });
  }
} catch (e) {}

const { ipcRenderer } = require('electron');

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
