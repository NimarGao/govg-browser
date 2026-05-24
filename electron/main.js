import { app, BrowserWindow, ipcMain, Menu, safeStorage, session, shell, WebContentsView } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Store from 'electron-store';

app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');

const STANDARD_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development';

const store = new Store({
  name: 'browser-data',
  defaults: {
    bookmarks: [],
    credentials: [],
    history: [],
    downloads: [],
    quickLinks: [
      { id: '1', title: 'Bing', url: 'https://www.bing.com' },
      { id: '2', title: '百度', url: 'https://www.baidu.com' },
      { id: '3', title: 'GitHub', url: 'https://github.com' },
      { id: '4', title: '知乎', url: 'https://www.zhihu.com' }
    ],
    settings: {
      defaultSearchEngine: 'bing',
      startupUrl: 'swift://newtab'
    }
  }
});

const downloadItems = new Map();
const tabViews = new Map();

const DEFAULT_BLOCKED_DOMAINS = [
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'adservice.google.com',
  'adservice.google.cn',
  'adsystem.com',
  'adnxs.com',
  'taboola.com',
  'outbrain.com',
  'scorecardresearch.com',
  'zedo.com',
  'adcolony.com',
  'admob.com',
  'applovin.com',
  'flurry.com',
  'inmobi.com',
  'pubmatic.com',
  'rubiconproject.com',
  'criteo.com',
  'openx.net',
  'amazon-adsystem.com',
  'adroll.com',
  'quantserve.com',
  'hotjar.com',
  'mixpanel.com',
  'amplitude.com',
  'adform.net',
  'optimizely.com',
  'adtech.de',
  'serving-sys.com'
];
const blockedHosts = new Set(DEFAULT_BLOCKED_DOMAINS);

function encryptText(value) {
  const text = String(value ?? '');
  if (!text) return '';
  if (!safeStorage.isEncryptionAvailable()) {
    return Buffer.from(text, 'utf8').toString('base64');
  }
  return safeStorage.encryptString(text).toString('base64');
}

function decryptText(value) {
  if (!value) return '';
  const buffer = Buffer.from(value, 'base64');
  if (!safeStorage.isEncryptionAvailable()) {
    return buffer.toString('utf8');
  }
  return safeStorage.decryptString(buffer);
}

function normalizeOrigin(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.origin;
  } catch {
    return '';
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 620,
    frame: false,
    show: false,
    backgroundColor: '#f6f7f9',
    title: 'Govg Browser',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: false
    }
  });

  win.webContents.setUserAgent(STANDARD_UA);
  win.once('ready-to-show', () => win.show());

  if (isDev) {
    win.loadURL('http://127.0.0.1:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      win.webContents.send('browser:new-tab', url);
      return { action: 'deny' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return win;
}

function installNewTabHandler() {
  app.on('web-contents-created', (_event, contents) => {
    registerBlockerOnSession(contents.session);
    registerDownloadOnSession(contents.session);

    contents.setWindowOpenHandler(({ url }) => {
      const owner = BrowserWindow.getAllWindows()[0];
      if (owner && (url.startsWith('http://') || url.startsWith('https://'))) {
        owner.webContents.send('browser:new-tab', url, contents.isOffTheRecord());
        return { action: 'deny' };
      }
      shell.openExternal(url);
      return { action: 'deny' };
    });

    contents.on('context-menu', (_contextEvent, params) => {
      const menu = Menu.buildFromTemplate([
        {
          label: '后退',
          enabled: contents.canGoBack(),
          click: () => contents.goBack()
        },
        {
          label: '前进',
          enabled: contents.canGoForward(),
          click: () => contents.goForward()
        },
        {
          label: '刷新',
          click: () => contents.reload()
        },
        { type: 'separator' },
        {
          label: '复制',
          role: 'copy',
          enabled: params.selectionText.length > 0
        },
        {
          label: '全选',
          role: 'selectAll'
        },
        { type: 'separator' },
        {
          label: '审查元素',
          click: () => {
            contents.inspectElement(params.x, params.y);
            if (contents.isDevToolsOpened()) contents.devToolsWebContents?.focus();
          }
        }
      ]);
      menu.popup();
    });
  });
}

function broadcast(channel, payload) {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send(channel, payload);
  });
}

function saveDownloadRecord(record) {
  const current = store.get('downloads', []);
  const next = [record, ...current.filter((item) => item.id !== record.id)].slice(0, 200);
  store.set('downloads', next);
  return next;
}

function registerDownloadOnSession(sess) {
  if (registeredDownloadSessions.has(sess)) return;
  registeredDownloadSessions.add(sess);

  sess.on('will-download', (_event, item) => {
    const id = crypto.randomUUID();
    const record = {
      id,
      filename: item.getFilename(),
      url: item.getURL(),
      path: item.getSavePath(),
      receivedBytes: 0,
      totalBytes: item.getTotalBytes(),
      state: 'progressing',
      startedAt: Date.now(),
      updatedAt: Date.now()
    };

    downloadItems.set(id, item);
    saveDownloadRecord(record);
    broadcast('downloads:updated', store.get('downloads', []));

    item.on('updated', (_downloadEvent, state) => {
      const nextRecord = {
        ...record,
        path: item.getSavePath(),
        receivedBytes: item.getReceivedBytes(),
        totalBytes: item.getTotalBytes(),
        state,
        updatedAt: Date.now()
      };
      Object.assign(record, nextRecord);
      saveDownloadRecord(record);
      broadcast('downloads:updated', store.get('downloads', []));
    });

    item.once('done', (_downloadEvent, state) => {
      const nextRecord = {
        ...record,
        path: item.getSavePath(),
        receivedBytes: item.getReceivedBytes(),
        totalBytes: item.getTotalBytes(),
        state,
        updatedAt: Date.now(),
        completedAt: Date.now()
      };
      Object.assign(record, nextRecord);
      downloadItems.delete(id);
      saveDownloadRecord(record);
      broadcast('downloads:updated', store.get('downloads', []));
    });
  });
}

const registeredDownloadSessions = new WeakSet();

function installDownloadManager() {
  registerDownloadOnSession(session.defaultSession);
}

const registeredSessions = new WeakSet();
function registerBlockerOnSession(sess) {
  if (registeredSessions.has(sess)) return;
  registeredSessions.add(sess);

  const filter = { urls: ['*://*/*'] };
  sess.webRequest.onBeforeRequest(filter, (details, callback) => {
    try {
      const url = new URL(details.url);
      const hostname = url.hostname.toLowerCase();
      let isAd = false;
      let parts = hostname.split('.');
      while (parts.length >= 2) {
        const domain = parts.join('.');
        if (blockedHosts.has(domain)) {
          isAd = true;
          break;
        }
        parts.shift();
      }
      callback({ cancel: isAd });
    } catch {
      callback({ cancel: false });
    }
  });

  // 针对 Flash 小游戏站点 (如 4399/7k7k 等) 动态重写发送的 HTTP 请求头中的 User-Agent 属性，确保服务端和前端检测皆绿灯放行
  const FLASH_UA = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36 QIHU 360EE";
  sess.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    try {
      const url = new URL(details.url);
      const isFlashSite = /4399|7k7k|2144|flash|game/i.test(url.hostname);
      if (isFlashSite) {
        details.requestHeaders['User-Agent'] = FLASH_UA;
      }
    } catch {}
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  // 拦截并优化 CSP 头部，安全豁免 Ruffle.js 所需的 CDN (unpkg.com) 及 blob: 协议，保障 Flash 仿真引擎在所有网站中完美运行
  sess.webRequest.onHeadersReceived(filter, (details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    const cspKey = Object.keys(responseHeaders).find(k => k.toLowerCase() === 'content-security-policy');
    if (cspKey) {
      const cspValues = responseHeaders[cspKey];
      if (Array.isArray(cspValues)) {
        responseHeaders[cspKey] = cspValues.map(val => {
          let modified = val;
          // 宽松豁免 unpkg CDN 的 script 和 connect
          if (modified.includes('script-src') && !modified.includes('https://unpkg.com')) {
            modified = modified.replace('script-src', "script-src https://unpkg.com 'unsafe-eval' 'unsafe-inline'");
          }
          if (modified.includes('connect-src') && !modified.includes('https://unpkg.com')) {
            modified = modified.replace('connect-src', 'connect-src https://unpkg.com');
          }
          if (modified.includes('worker-src') && !modified.includes('blob:')) {
            modified = modified.replace('worker-src', 'worker-src blob:');
          } else if (modified.includes('child-src') && !modified.includes('blob:')) {
            modified = modified.replace('child-src', 'child-src blob:');
          } else if (!modified.includes('worker-src') && !modified.includes('child-src')) {
            modified += "; worker-src blob:; child-src blob:";
          }
          return modified;
        });
      }
    }
    callback({ cancel: false, responseHeaders });
  });
}

function installRequestBlocker() {
  registerBlockerOnSession(session.defaultSession);
}

app.whenReady().then(() => {
  session.defaultSession.setUserAgent(STANDARD_UA);
  app.setAppUserModelId('com.nimargao.govgbrowser');
  Menu.setApplicationMenu(null);
  installNewTabHandler();
  installRequestBlocker();
  installDownloadManager();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('bookmarks:list', () => store.get('bookmarks', []));

ipcMain.handle('bookmarks:save', (_event, bookmark) => {
  const bookmarks = store.get('bookmarks', []);
  const clean = {
    id: bookmark.id || crypto.randomUUID(),
    title: String(bookmark.title || bookmark.url || '未命名书签').slice(0, 120),
    url: String(bookmark.url || ''),
    createdAt: bookmark.createdAt || Date.now()
  };
  if (!clean.url.startsWith('http://') && !clean.url.startsWith('https://')) return bookmarks;
  const next = [clean, ...bookmarks.filter((item) => item.url !== clean.url)];
  store.set('bookmarks', next);
  return next;
});

ipcMain.handle('bookmarks:remove', (_event, id) => {
  const next = store.get('bookmarks', []).filter((item) => item.id !== id);
  store.set('bookmarks', next);
  return next;
});

ipcMain.handle('history:list', () => store.get('history', []));

ipcMain.handle('history:add', (_event, entry) => {
  const url = String(entry?.url || '');
  if (!url.startsWith('http://') && !url.startsWith('https://')) return store.get('history', []);

  const current = store.get('history', []);
  const clean = {
    id: crypto.randomUUID(),
    title: String(entry?.title || url).slice(0, 160),
    url,
    visitedAt: Date.now()
  };
  const next = [clean, ...current.filter((item) => item.url !== url)].slice(0, 500);
  store.set('history', next);
  return next;
});

ipcMain.handle('history:remove', (_event, id) => {
  const next = store.get('history', []).filter((item) => item.id !== id);
  store.set('history', next);
  return next;
});

ipcMain.handle('history:clear', () => {
  store.set('history', []);
  return [];
});

ipcMain.handle('downloads:list', () => store.get('downloads', []));

ipcMain.handle('downloads:clear', () => {
  const activeIds = new Set(downloadItems.keys());
  const active = store.get('downloads', []).filter((item) => activeIds.has(item.id));
  store.set('downloads', active);
  return active;
});

ipcMain.handle('downloads:cancel', (_event, id) => {
  const item = downloadItems.get(id);
  if (item) item.cancel();
  return store.get('downloads', []);
});

ipcMain.handle('downloads:show-in-folder', (_event, filePath) => {
  if (filePath) shell.showItemInFolder(filePath);
  return true;
});

ipcMain.handle('downloads:open', (_event, filePath) => {
  if (!filePath) return false;
  shell.openPath(filePath);
  return true;
});

ipcMain.handle('credentials:list-for-origin', (_event, rawUrl) => {
  const origin = normalizeOrigin(rawUrl);
  if (!origin) return [];
  return store.get('credentials', [])
    .filter((item) => item.origin === origin)
    .map((item) => ({
      id: item.id,
      origin: item.origin,
      username: decryptText(item.username),
      password: decryptText(item.password),
      updatedAt: item.updatedAt
    }));
});

ipcMain.handle('credentials:save', (_event, payload) => {
  const origin = normalizeOrigin(payload?.url || payload?.origin || '');
  const username = String(payload?.username || '').trim();
  const password = String(payload?.password || '');
  if (!origin || !username || !password) return false;

  const credentials = store.get('credentials', []);
  const nextItem = {
    id: payload.id || crypto.randomUUID(),
    origin,
    username: encryptText(username),
    password: encryptText(password),
    updatedAt: Date.now()
  };
  const next = [
    nextItem,
    ...credentials.filter((item) => !(item.origin === origin && decryptText(item.username) === username))
  ];
  store.set('credentials', next);
  return true;
});

ipcMain.handle('credentials:remove', (_event, id) => {
  const next = store.get('credentials', []).filter((item) => item.id !== id);
  store.set('credentials', next);
  return true;
});

ipcMain.handle('app:get-webview-preload', () => path.join(__dirname, 'webview-preload.cjs'));

ipcMain.handle('window:minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.handle('window:maximize-toggle', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return false;
  if (window.isMaximized()) {
    window.unmaximize();
    return false;
  }
  window.maximize();
  return true;
});

ipcMain.handle('window:close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

ipcMain.handle('window:fullscreen-toggle', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return false;
  const next = !window.isFullScreen();
  window.setFullScreen(next);
  return next;
});

ipcMain.handle('quicklinks:list', () => store.get('quickLinks', []));

ipcMain.handle('quicklinks:save', (_event, item) => {
  const list = store.get('quickLinks', []);
  const clean = {
    id: item.id || crypto.randomUUID(),
    title: String(item.title || item.url || '未命名').slice(0, 100),
    url: String(item.url || '')
  };
  if (!clean.url.startsWith('http://') && !clean.url.startsWith('https://')) return list;
  const next = [...list.filter((i) => i.url !== clean.url), clean];
  store.set('quickLinks', next);
  return next;
});

ipcMain.handle('quicklinks:remove', (_event, id) => {
  const next = store.get('quickLinks', []).filter((i) => i.id !== id);
  store.set('quickLinks', next);
  return next;
});

ipcMain.handle('settings:get', () => store.get('settings', { defaultSearchEngine: 'bing', startupUrl: 'swift://newtab' }));

ipcMain.handle('settings:set', (_event, patch) => {
  const current = store.get('settings', { defaultSearchEngine: 'bing', startupUrl: 'swift://newtab' });
  const next = { ...current, ...patch };
  store.set('settings', next);
  return next;
});

ipcMain.handle('session:clear-all-data', async () => {
  try {
    const normalSess = session.fromPartition('persist:govg-browser');
    await normalSess.clearStorageData({
      storages: ['cookies', 'localstorage', 'cache', 'indexdb', 'websql', 'serviceworkers']
    });
    await session.defaultSession.clearStorageData({
      storages: ['cookies', 'localstorage', 'cache', 'indexdb', 'websql', 'serviceworkers']
    });
    store.set('history', []);
    store.set('downloads', []);
    return true;
  } catch (err) {
    console.error('Clear storage error:', err);
    return false;
  }
});

function createTabView(win, tabId, url, isPrivate) {
  const sess = session.fromPartition(isPrivate ? 'incognito' : 'persist:govg-browser');
  sess.setUserAgent(STANDARD_UA);
  registerBlockerOnSession(sess);
  registerDownloadOnSession(sess);

  const view = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'webview-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      session: sess
    }
  });

  tabViews.set(tabId, {
    view,
    isPrivate,
    zoomLevel: 0
  });

  const wc = view.webContents;

  wc.on('did-start-loading', () => {
    win.webContents.send('views:event', tabId, 'did-start-loading');
  });

  wc.on('dom-ready', () => {
    win.webContents.send('views:event', tabId, 'dom-ready');
    const tv = tabViews.get(tabId);
    if (tv && tv.zoomLevel !== 0) {
      wc.setZoomLevel(tv.zoomLevel);
    }
  });

  wc.on('did-stop-loading', () => {
    win.webContents.send('views:event', tabId, 'did-stop-loading', {
      canGoBack: wc.canGoBack(),
      canGoForward: wc.canGoForward(),
      url: wc.getURL(),
      title: wc.getTitle() || wc.getURL()
    });
  });

  wc.on('page-title-updated', (event, title) => {
    win.webContents.send('views:event', tabId, 'page-title-updated', { title });
  });

  wc.on('did-navigate', (event, newUrl) => {
    win.webContents.send('views:event', tabId, 'did-navigate', { url: newUrl });
  });

  wc.on('did-navigate-in-page', (event, newUrl) => {
    win.webContents.send('views:event', tabId, 'did-navigate-in-page', { url: newUrl });
  });

  wc.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) return;
    win.webContents.send('views:event', tabId, 'did-fail-load', {
      errorCode,
      errorDescription: errorDescription || '页面加载失败',
      validatedURL
    });
  });

  wc.on('ipc-message', (event, channel, ...args) => {
    win.webContents.send('views:event', tabId, 'ipc-message', { channel, args });
  });

  wc.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      win.webContents.send('browser:new-tab', url, isPrivate);
      return { action: 'deny' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  wc.on('context-menu', (event, params) => {
    const menu = Menu.buildFromTemplate([
      {
        label: '后退',
        enabled: wc.canGoBack(),
        click: () => wc.goBack()
      },
      {
        label: '前进',
        enabled: wc.canGoForward(),
        click: () => wc.goForward()
      },
      {
        label: '刷新',
        click: () => wc.reload()
      },
      { type: 'separator' },
      {
        label: '复制',
        role: 'copy',
        enabled: params.selectionText.length > 0
      },
      {
        label: '全选',
        role: 'selectAll'
      },
      { type: 'separator' },
      {
        label: '审查元素',
        click: () => {
          wc.inspectElement(params.x, params.y);
          if (wc.isDevToolsOpened()) wc.devToolsWebContents?.focus();
        }
      }
    ]);
    menu.popup();
  });

  if (url && url !== 'swift://newtab') {
    wc.loadURL(url).catch(() => {});
  }
}

ipcMain.handle('views:create', (event, tabId, url, isPrivate) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) createTabView(win, tabId, url, isPrivate);
});

ipcMain.handle('views:destroy', (event, tabId) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const tv = tabViews.get(tabId);
  if (tv) {
    try {
      win.contentView.removeChildView(tv.view);
    } catch {}
    tabViews.delete(tabId);
  }
});

ipcMain.handle('views:select', (event, tabId) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  for (const [id, tv] of tabViews.entries()) {
    if (id !== tabId) {
      try {
        win.contentView.removeChildView(tv.view);
      } catch {}
    }
  }

  const activeTv = tabViews.get(tabId);
  if (activeTv) {
    try {
      win.contentView.addChildView(activeTv.view);
    } catch {}
  }
});

ipcMain.handle('views:set-bounds', (event, tabId, bounds) => {
  const tv = tabViews.get(tabId);
  if (tv && bounds) {
    tv.view.setBounds({
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height)
    });
  }
});

ipcMain.handle('views:load-url', (event, tabId, url) => {
  const tv = tabViews.get(tabId);
  if (tv && url && url !== 'swift://newtab') {
    tv.view.webContents.loadURL(url).catch(() => {});
  }
});

ipcMain.handle('views:go-back', (event, tabId) => {
  const tv = tabViews.get(tabId);
  if (tv && tv.view.webContents.canGoBack()) {
    tv.view.webContents.goBack();
  }
});

ipcMain.handle('views:go-forward', (event, tabId) => {
  const tv = tabViews.get(tabId);
  if (tv && tv.view.webContents.canGoForward()) {
    tv.view.webContents.goForward();
  }
});

ipcMain.handle('views:reload', (event, tabId) => {
  const tv = tabViews.get(tabId);
  if (tv) {
    tv.view.webContents.reload();
  }
});

ipcMain.handle('views:set-zoom', (event, tabId, zoomLevel) => {
  const tv = tabViews.get(tabId);
  if (tv) {
    tv.zoomLevel = zoomLevel;
    tv.view.webContents.setZoomLevel(zoomLevel);
  }
});

ipcMain.handle('session:get-cookies', async (event, domain, isPrivate) => {
  try {
    const sess = session.fromPartition(isPrivate ? 'incognito' : 'persist:govg-browser');
    const cookies = await sess.cookies.get({ domain });
    return cookies;
  } catch (err) {
    console.error('Get cookies error:', err);
    return [];
  }
});

ipcMain.handle('session:remove-cookie', async (event, url, name, isPrivate) => {
  try {
    const sess = session.fromPartition(isPrivate ? 'incognito' : 'persist:govg-browser');
    await sess.cookies.remove(url, name);
    return true;
  } catch (err) {
    console.error('Remove cookie error:', err);
    return false;
  }
});

ipcMain.handle('views:execute-javascript', (event, tabId, script) => {
  const tv = tabViews.get(tabId);
  if (tv) {
    return tv.view.webContents.executeJavaScript(script).catch(() => {});
  }
  return false;
});
