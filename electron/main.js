import { app, BrowserWindow, ipcMain, Menu, safeStorage, session, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Store from 'electron-store';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development';

const store = new Store({
  name: 'browser-data',
  defaults: {
    bookmarks: [],
    credentials: [],
    history: [],
    downloads: []
  }
});

const downloadItems = new Map();

const AD_HOST_PATTERNS = [
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'adservice.google.',
  'adsystem.com',
  'adnxs.com',
  'taboola.com',
  'outbrain.com',
  'scorecardresearch.com',
  'zedo.com'
];

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
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true
    }
  });

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
    contents.setWindowOpenHandler(({ url }) => {
      const owner = BrowserWindow.getAllWindows()[0];
      if (owner && (url.startsWith('http://') || url.startsWith('https://'))) {
        owner.webContents.send('browser:new-tab', url);
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

function installDownloadManager() {
  session.defaultSession.on('will-download', (_event, item) => {
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

function installRequestBlocker() {
  const filter = { urls: ['*://*/*'] };
  session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
    const url = details.url.toLowerCase();
    const isAd = AD_HOST_PATTERNS.some((pattern) => url.includes(pattern));
    callback({ cancel: isAd });
  });
}

app.whenReady().then(() => {
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
