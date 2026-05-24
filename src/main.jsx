import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkPlus,
  Clock3,
  Columns,
  Download,
  Eye,
  EyeOff,
  FolderOpen,
  Home,
  KeyRound,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Square,
  Star,
  Trash2,
  X
} from 'lucide-react';
import './styles.css';

const HOME_URL = 'swift://newtab';
const SEARCH_URL = 'https://www.bing.com/search?q=';

const ZOOM_LEVELS = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8];
const ZOOM_PERCENTAGES = {
  '-5': '50%',
  '-4': '60%',
  '-3': '70%',
  '-2': '80%',
  '-1': '90%',
  '0': '100%',
  '1': '110%',
  '2': '125%',
  '3': '150%',
  '4': '175%',
  '5': '200%',
  '6': '250%',
  '7': '300%',
  '8': '400%'
};

function isAppHome(url) {
  return url === HOME_URL;
}

function createTab(url = HOME_URL, isPrivate = false) {
  return {
    id: crypto.randomUUID(),
    title: isPrivate ? '无痕新标签页' : '新标签页',
    url,
    input: isAppHome(url) ? '' : url,
    loading: false,
    error: null,
    canGoBack: false,
    canGoForward: false,
    zoomLevel: 0,
    isPrivate,
    // 分屏相关参数
    splitMode: false,
    rightUrl: HOME_URL,
    rightInput: '',
    rightLoading: false,
    rightError: null,
    rightCanGoBack: false,
    rightCanGoForward: false,
    rightZoomLevel: 0,
    rightTitle: '新标签页'
  };
}

function toNavigableUrl(value, engine = 'bing') {
  const input = value.trim();
  if (!input) return HOME_URL;
  if (input === HOME_URL) return HOME_URL;
  if (/^(https?:\/\/)/i.test(input)) return input;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(input) || /^localhost(:\d+)?/i.test(input)) {
    return `https://${input}`;
  }
  const engines = {
    bing: 'https://www.bing.com/search?q=',
    baidu: 'https://www.baidu.com/s?wd=',
    google: 'https://www.google.com/search?q='
  };
  const baseUrl = engines[engine] || engines.bing;
  return `${baseUrl}${encodeURIComponent(input)}`;
}

function getOriginLabel(url) {
  try {
    return new URL(url).host;
  } catch {
    return '当前页面';
  }
}

function formatVisitedAt(timestamp) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function getDownloadStateLabel(state) {
  const labels = {
    progressing: '下载中',
    interrupted: '已中断',
    completed: '已完成',
    cancelled: '已取消'
  };
  return labels[state] || state || '未知';
}

// refreshWebviewLayout removed because layout bounds are directly handled by WebContentsView bounds sync.

function PasswordPrompt({ credential, onSave, onDismiss }) {
  if (!credential) return null;
  return (
    <div className="password-prompt">
      <div className="prompt-icon"><KeyRound size={18} /></div>
      <div className="prompt-copy">
        <strong>保存此账号密码？</strong>
        <span>{credential.username} · {getOriginLabel(credential.url)}</span>
      </div>
      <button className="text-button" onClick={onDismiss}>取消</button>
      <button className="primary-button" onClick={() => onSave(credential)}>保存</button>
    </div>
  );
}

function NewTabPage({ onNavigate, quickLinks, onAddQuickLink, onRemoveQuickLink }) {
  const [query, setQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  return (
    <div className="new-tab-page">
      <form className="new-tab-search" onSubmit={(event) => {
        event.preventDefault();
        onNavigate(query);
      }}>
        <Search size={22} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索或输入网址"
          autoFocus
          spellCheck="false"
        />
      </form>
      <div className="quick-links">
        {quickLinks.map((link) => (
          <div key={link.id || link.url} className="quick-link-tile">
            <button className="tile-btn" onClick={() => onNavigate(link.url)}>
              <span className="tile-letter">{link.title.slice(0, 1)}</span>
              <strong>{link.title}</strong>
            </button>
            <button
              className="tile-remove"
              title="删除"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveQuickLink(link.id);
              }}
            >
              <X size={13} />
            </button>
          </div>
        ))}
        <button className="quick-link-add-tile" onClick={() => setShowAddModal(true)}>
          <span className="tile-letter-add">+</span>
          <strong>添加快捷方式</strong>
        </button>
      </div>

      {showAddModal && (
        <div className="quick-link-modal-overlay">
          <div className="quick-link-modal">
            <h3>添加快捷方式</h3>
            <div className="modal-input-group">
              <label>名称</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="例如: GitHub"
                spellCheck="false"
              />
            </div>
            <div className="modal-input-group">
              <label>网址</label>
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="例如: github.com"
                spellCheck="false"
              />
            </div>
            <div className="modal-actions">
              <button className="text-button" onClick={() => {
                setShowAddModal(false);
                setNewTitle('');
                setNewUrl('');
              }}>
                取消
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  let url = newUrl.trim();
                  if (!url) return;
                  if (!/^https?:\/\//i.test(url)) {
                    url = 'https://' + url;
                  }
                  onAddQuickLink({
                    title: newTitle.trim() || url,
                    url
                  });
                  setNewTitle('');
                  setNewUrl('');
                  setShowAddModal(false);
                }}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [tabs, setTabs] = useState([createTab()]);
  const [activeId, setActiveId] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [history, setHistory] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [quickLinks, setQuickLinks] = useState([]);
  const [webviewPreload, setWebviewPreload] = useState('');
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({ defaultSearchEngine: 'bing', startupUrl: 'swift://newtab' });
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [pendingCredential, setPendingCredential] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bookmarkSearch, setBookmarkSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [currentCookies, setCurrentCookies] = useState([]);

  const resolvedActiveId = activeId || tabs[0]?.id;
  const activeTab = tabs.find((tab) => tab.id === resolvedActiveId) || tabs[0];

  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const resolvedActiveIdRef = useRef(resolvedActiveId);
  useEffect(() => {
    resolvedActiveIdRef.current = resolvedActiveId;
  }, [resolvedActiveId]);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const createdViewsRef = useRef(new Set());
  const tabsRef = useRef(tabs);
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  const activeBookmarked = useMemo(
    () => bookmarks.some((bookmark) => bookmark.url === activeTab?.url),
    [bookmarks, activeTab?.url]
  );
  const hasSidePanel = showBookmarks || showHistory || showDownloads || showPasswords || showSettings;

  const updateTab = useCallback((id, patch) => {
    setTabs((current) => current.map((tab) => (tab.id === id ? { ...tab, ...patch } : tab)));
  }, []);

  useEffect(() => {
    setActiveId((current) => current || tabs[0]?.id);
  }, [tabs]);

  useEffect(() => {
    window.browserAPI.listBookmarks().then(setBookmarks);
    window.browserAPI.listHistory().then(setHistory);
    window.browserAPI.listDownloads().then(setDownloads);
    window.browserAPI.listQuickLinks().then(setQuickLinks);
    window.browserAPI.getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    if (!activeTab?.url || isAppHome(activeTab.url)) return;
    window.browserAPI.listCredentialsForOrigin(activeTab.url).then(setCredentials);
  }, [activeTab?.url]);

  const navigate = useCallback((id, value, side = 'left') => {
    const url = toNavigableUrl(value, settingsRef.current?.defaultSearchEngine || 'bing');
    if (side === 'left') {
      updateTab(id, { url, input: url, loading: true, error: null });
      if (createdViewsRef.current.has(id + '-left')) {
        window.browserAPI.loadViewUrl(id, 'left', url);
      }
    } else {
      updateTab(id, { rightUrl: url, rightInput: url, rightLoading: true, rightError: null });
      if (createdViewsRef.current.has(id + '-right')) {
        window.browserAPI.loadViewUrl(id, 'right', url);
      }
    }
  }, [updateTab]);

  const addTab = useCallback((url = null, isPrivate = false) => {
    const targetUrl = url || settingsRef.current?.startupUrl || HOME_URL;
    const tab = createTab(targetUrl, isPrivate);
    setTabs((current) => [...current, tab]);
    setActiveId(tab.id);
  }, []);

  useEffect(() => {
    return window.browserAPI.onNewTabRequest((url, isPrivate) => addTab(url, isPrivate));
  }, [addTab]);

  useEffect(() => {
    return window.browserAPI.onDownloadsUpdated(setDownloads);
  }, []);

  const handleBrowserShortcut = useCallback((key, ctrlKey) => {
    if (key === 'F11') {
      window.browserAPI.toggleFullscreen().then(setIsFullscreen);
      return;
    }
    
    const currActiveTab = activeTabRef.current;
    const currActiveId = resolvedActiveIdRef.current;
    if (!currActiveTab || !currActiveId) return;

    if (ctrlKey && (key === '=' || key === '+')) {
      const idx = ZOOM_LEVELS.indexOf(currActiveTab.zoomLevel || 0);
      if (idx < ZOOM_LEVELS.length - 1) {
        const nextZoom = ZOOM_LEVELS[idx + 1];
        updateTab(currActiveId, { zoomLevel: nextZoom });
        window.browserAPI.setViewZoom(currActiveId, 'left', nextZoom);
        if (currActiveTab.splitMode) {
          window.browserAPI.setViewZoom(currActiveId, 'right', nextZoom);
        }
      }
    } else if (ctrlKey && key === '-') {
      const idx = ZOOM_LEVELS.indexOf(currActiveTab.zoomLevel || 0);
      if (idx > 0) {
        const nextZoom = ZOOM_LEVELS[idx - 1];
        updateTab(currActiveId, { zoomLevel: nextZoom });
        window.browserAPI.setViewZoom(currActiveId, 'left', nextZoom);
        if (currActiveTab.splitMode) {
          window.browserAPI.setViewZoom(currActiveId, 'right', nextZoom);
        }
      }
    } else if (ctrlKey && key === '0') {
      updateTab(currActiveId, { zoomLevel: 0 });
      window.browserAPI.setViewZoom(currActiveId, 'left', 0);
      if (currActiveTab.splitMode) {
        window.browserAPI.setViewZoom(currActiveId, 'right', 0);
      }
    }
  }, [updateTab]);

  const handleBrowserShortcutRef = useRef(handleBrowserShortcut);
  useEffect(() => {
    handleBrowserShortcutRef.current = handleBrowserShortcut;
  }, [handleBrowserShortcut]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const isZoomIn = event.ctrlKey && (event.key === '=' || event.key === '+');
      const isZoomOut = event.ctrlKey && event.key === '-';
      const isZoomReset = event.ctrlKey && event.key === '0';
      const isFullscreen = event.key === 'F11';
      
      if (isZoomIn || isZoomOut || isZoomReset || isFullscreen) {
        event.preventDefault();
        handleBrowserShortcutRef.current(event.key, event.ctrlKey);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Synchronize tabs with native views
  useEffect(() => {
    tabs.forEach((tab) => {
      if (!isAppHome(tab.url) && !createdViewsRef.current.has(tab.id + '-left')) {
        createdViewsRef.current.add(tab.id + '-left');
        window.browserAPI.createView(tab.id, tab.url, tab.isPrivate, 'left');
      }
      if (tab.splitMode && !isAppHome(tab.rightUrl) && !createdViewsRef.current.has(tab.id + '-right')) {
        createdViewsRef.current.add(tab.id + '-right');
        window.browserAPI.createView(tab.id, tab.rightUrl, tab.isPrivate, 'right');
      }
      if (!tab.splitMode && createdViewsRef.current.has(tab.id + '-right')) {
        createdViewsRef.current.delete(tab.id + '-right');
        window.browserAPI.destroyView(tab.id, 'right');
      }
    });

    const currentTabLeftIds = new Set(tabs.map((t) => t.id + '-left'));
    const currentTabRightIds = new Set(tabs.filter(t => t.splitMode).map((t) => t.id + '-right'));
    for (const key of createdViewsRef.current) {
      if (!currentTabLeftIds.has(key) && !currentTabRightIds.has(key)) {
        createdViewsRef.current.delete(key);
        const parts = key.split('-');
        const side = parts.pop();
        const tabId = parts.join('-');
        window.browserAPI.destroyView(tabId, side);
      }
    }
  }, [tabs]);

  // Handle ResizeObserver and selectView bounds synchronization
  const stageLeftRef = useRef(null);
  const stageRightRef = useRef(null);

  useEffect(() => {
    if (!activeTab) return;

    window.browserAPI.selectView(activeTab.id);

    const reportBounds = () => {
      if (stageLeftRef.current && !isAppHome(activeTab.url)) {
        const rect = stageLeftRef.current.getBoundingClientRect();
        window.browserAPI.setViewBounds(activeTab.id, 'left', {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        });
      }
      if (stageRightRef.current && activeTab.splitMode && !isAppHome(activeTab.rightUrl)) {
        const rect = stageRightRef.current.getBoundingClientRect();
        window.browserAPI.setViewBounds(activeTab.id, 'right', {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        });
      }
    };

    reportBounds();

    const observer = new ResizeObserver(() => {
      reportBounds();
    });
    if (stageLeftRef.current) observer.observe(stageLeftRef.current);
    if (stageRightRef.current) observer.observe(stageRightRef.current);

    window.addEventListener('resize', reportBounds);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', reportBounds);
    };
  }, [activeTab?.id, activeTab?.url, activeTab?.splitMode, activeTab?.rightUrl, showBookmarks, showHistory, showDownloads, showPasswords, showSettings]);

  // Listen to native views IPC & lifecycle events
  useEffect(() => {
    return window.browserAPI.onViewsEvent(async (tabId, eventName, details) => {
      const { side } = details || {};
      if (eventName === 'did-start-loading') {
        if (side === 'left') {
          updateTab(tabId, { loading: true });
        } else {
          updateTab(tabId, { rightLoading: true });
        }
      } else if (eventName === 'did-stop-loading') {
        const { canGoBack, canGoForward, url, title } = details;
        if (side === 'left') {
          updateTab(tabId, {
            loading: false,
            canGoBack,
            canGoForward,
            url,
            input: url,
            title: title || '未命名页面'
          });
          const currTabs = tabsRef.current;
          const tab = currTabs.find(t => t.id === tabId);
          if (tab && !tab.isPrivate && url) {
            setHistory(await window.browserAPI.addHistory({ title, url }));
          }
          if (tabId === resolvedActiveIdRef.current && url) {
            setCredentials(await window.browserAPI.listCredentialsForOrigin(url));
          }
        } else {
          updateTab(tabId, {
            rightLoading: false,
            rightCanGoBack: canGoBack,
            rightCanGoForward: canGoForward,
            rightUrl: url,
            rightInput: url,
            rightTitle: title || '未命名页面'
          });
        }
      } else if (eventName === 'page-title-updated') {
        if (side === 'left') {
          updateTab(tabId, { title: details.title || '未命名页面' });
        } else {
          updateTab(tabId, { rightTitle: details.title || '未命名页面' });
        }
      } else if (eventName === 'did-navigate' || eventName === 'did-navigate-in-page') {
        if (side === 'left') {
          updateTab(tabId, { url: details.url, input: details.url });
        } else {
          updateTab(tabId, { rightUrl: details.url, rightInput: details.url });
        }
      } else if (eventName === 'did-fail-load') {
        if (side === 'left') {
          updateTab(tabId, {
            loading: false,
            error: {
              code: details.errorCode,
              description: details.errorDescription || '页面加载失败',
              url: details.validatedURL
            }
          });
        } else {
          updateTab(tabId, {
            rightLoading: false,
            rightError: {
              code: details.errorCode,
              description: details.errorDescription || '页面加载失败',
              url: details.validatedURL
            }
          });
        }
      } else if (eventName === 'ipc-message') {
        const { channel, args } = details;
        if (channel === 'credential-captured') {
          if (side !== 'left') return;
          const currTabs = tabsRef.current;
          const tab = currTabs.find(t => t.id === tabId);
          if (tab && tab.isPrivate) return;
          const credential = args?.[0];
          if (credential?.username && credential?.password) setPendingCredential(credential);
        } else if (channel === 'webview-keydown') {
          const { key, ctrlKey } = args?.[0] || {};
          handleBrowserShortcutRef.current(key, ctrlKey);
        }
      }
    });
  }, [updateTab]);

  // Fetch cookies for the active domain when Settings is open
  useEffect(() => {
    if (!showSettings || !activeTab || isAppHome(activeTab.url)) {
      setCurrentCookies([]);
      return;
    }
    const host = getOriginLabel(activeTab.url);
    window.browserAPI.getCookies(host, activeTab.isPrivate).then(setCurrentCookies);
  }, [showSettings, activeTab?.url, activeTab?.isPrivate]);

  const closeTab = useCallback((id) => {
    setTabs((current) => {
      if (current.length === 1) return [createTab()];
      const index = current.findIndex((tab) => tab.id === id);
      const next = current.filter((tab) => tab.id !== id);
      if (id === resolvedActiveId) {
        const fallback = next[Math.max(0, index - 1)] || next[0];
        setActiveId(fallback.id);
      }
      return next;
    });
  }, [resolvedActiveId]);

  const toggleBookmark = useCallback(async () => {
    if (!activeTab?.url || isAppHome(activeTab.url)) return;
    if (activeBookmarked) {
      const match = bookmarks.find((bookmark) => bookmark.url === activeTab.url);
      if (match) setBookmarks(await window.browserAPI.removeBookmark(match.id));
      return;
    }
    setBookmarks(await window.browserAPI.saveBookmark({
      title: activeTab.title || activeTab.url,
      url: activeTab.url
    }));
  }, [activeBookmarked, activeTab, bookmarks]);

  const saveCredential = useCallback(async (credential) => {
    await window.browserAPI.saveCredential(credential);
    setPendingCredential(null);
    if (activeTab?.url) {
      setCredentials(await window.browserAPI.listCredentialsForOrigin(activeTab.url));
    }
  }, [activeTab?.url]);

  const autofill = useCallback((credential) => {
    const script = `
      (() => {
        const username = ${JSON.stringify(credential.username)};
        const password = ${JSON.stringify(credential.password)};
        const passwordField = document.querySelector('input[type="password"]');
        if (!passwordField) return false;
        const inputs = Array.from(document.querySelectorAll('input')).filter((input) => {
          const type = (input.type || '').toLowerCase();
          return ['text', 'email', 'tel', 'url', 'number', ''].includes(type) && !input.disabled && !input.readOnly;
        });
        const usernameField = inputs.filter((input) => input.compareDocumentPosition(passwordField) & Node.DOCUMENT_POSITION_FOLLOWING).at(-1) || inputs.at(-1);
        if (usernameField) {
          usernameField.focus();
          usernameField.value = username;
          usernameField.dispatchEvent(new Event('input', { bubbles: true }));
          usernameField.dispatchEvent(new Event('change', { bubbles: true }));
        }
        passwordField.focus();
        passwordField.value = password;
        passwordField.dispatchEvent(new Event('input', { bubbles: true }));
        passwordField.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })();
    `;
    window.browserAPI.executeViewJavaScript(activeTab.id, script);
  }, [activeTab?.id]);

  // WebContentsView does not require direct mounting/attachment callbacks in DOM.

  return (
    <main className={`app-shell ${isFullscreen ? 'fullscreen' : ''} ${activeTab?.isPrivate ? 'private-mode' : ''}`}>
      <section className="tab-strip">
        <div className="tabs-area">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab ${tab.id === resolvedActiveId ? 'active' : ''} ${tab.isPrivate ? 'private' : ''}`}
              onClick={() => setActiveId(tab.id)}
              title={tab.title}
            >
              <span className="tab-title">
                {tab.loading ? <Loader2 className="spin" size={14} /> : null}
                {tab.isPrivate ? <EyeOff size={13} className="private-tab-icon" /> : null}
                {tab.title}
              </span>
              <span
                className="tab-close"
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                <X size={14} />
              </span>
            </button>
          ))}
          <button className="icon-button" title="新建标签页" onClick={() => addTab()}>
            <Plus size={18} />
          </button>
          <button className="icon-button private-tab-btn" title="新建无痕标签页" onClick={() => addTab(null, true)}>
            <EyeOff size={15} />
          </button>
        </div>
        <div className="window-controls macos-style">
          <button className="mac-btn close" title="关闭" onClick={() => window.browserAPI.closeWindow()}></button>
          <button className="mac-btn minimize" title="最小化" onClick={() => window.browserAPI.minimizeWindow()}></button>
          <button className="mac-btn maximize" title="最大化" onClick={() => window.browserAPI.toggleMaximizeWindow()}></button>
        </div>
      </section>

      <section className="toolbar">
        <button className="icon-button" title="后退" disabled={!activeTab?.canGoBack} onClick={() => window.browserAPI.goBackView(activeTab.id)}>
          <ArrowLeft size={18} />
        </button>
        <button className="icon-button" title="前进" disabled={!activeTab?.canGoForward} onClick={() => window.browserAPI.goForwardView(activeTab.id)}>
          <ArrowRight size={18} />
        </button>
        <button className="icon-button" title="刷新" onClick={() => window.browserAPI.reloadView(activeTab.id)}>
          <RefreshCw size={18} />
        </button>
        <button className="icon-button" title="主页" onClick={() => navigate(activeTab.id, settings.startupUrl || HOME_URL)}>
          <Home size={18} />
        </button>

        <form className="address-bar" onSubmit={(event) => {
          event.preventDefault();
          navigate(activeTab.id, activeTab.input);
        }}>
          <Search size={17} />
          <input
            value={activeTab?.input || ''}
            onChange={(event) => updateTab(activeTab.id, { input: event.target.value })}
            placeholder="搜索或输入网址"
            spellCheck="false"
          />
          {activeTab && activeTab.zoomLevel !== 0 && (
            <button
              type="button"
              className="zoom-badge"
              title="重置缩放"
              onClick={() => {
                updateTab(activeTab.id, { zoomLevel: 0 });
                window.browserAPI.setViewZoom(activeTab.id, 0);
              }}
            >
              {ZOOM_PERCENTAGES[activeTab.zoomLevel] || '100%'}
            </button>
          )}
          <ShieldCheck size={17} className="secure-icon" />
        </form>

        <button className={`icon-button ${activeBookmarked ? 'marked' : ''}`} title="收藏当前页面" onClick={toggleBookmark}>
          {activeBookmarked ? <Star size={18} /> : <BookmarkPlus size={18} />}
        </button>
        <button className={`icon-button ${showBookmarks ? 'active' : ''}`} title="收藏夹" onClick={() => {
          setShowBookmarks((value) => !value);
          setShowHistory(false);
          setShowDownloads(false);
          setShowPasswords(false);
          setShowSettings(false);
        }}>
          <Bookmark size={18} />
        </button>
        <button className={`icon-button ${showHistory ? 'active' : ''}`} title="历史记录" onClick={() => {
          setShowHistory((value) => !value);
          setShowBookmarks(false);
          setShowDownloads(false);
          setShowPasswords(false);
          setShowSettings(false);
        }}>
          <Clock3 size={18} />
        </button>
        <button className={`icon-button ${showDownloads ? 'active' : ''}`} title="下载管理" onClick={() => {
          setShowDownloads((value) => !value);
          setShowBookmarks(false);
          setShowHistory(false);
          setShowPasswords(false);
          setShowSettings(false);
        }}>
          <Download size={18} />
        </button>
        <button className={`icon-button ${showPasswords ? 'active' : ''}`} title="账号密码" onClick={() => {
          setShowPasswords((value) => !value);
          setShowBookmarks(false);
          setShowHistory(false);
          setShowDownloads(false);
          setShowSettings(false);
        }}>
          <KeyRound size={18} />
        </button>
        <button className={`icon-button ${showSettings ? 'active' : ''}`} title="设置" onClick={() => {
          setShowSettings((value) => !value);
          setShowBookmarks(false);
          setShowHistory(false);
          setShowDownloads(false);
          setShowPasswords(false);
        }}>
          <Settings size={18} />
        </button>
        <button
          className={`icon-button ${activeTab?.splitMode ? 'active' : ''}`}
          title={activeTab?.splitMode ? "退出分屏" : "双屏分屏"}
          onClick={() => {
            if (!activeTab) return;
            const nextMode = !activeTab.splitMode;
            updateTab(activeTab.id, { splitMode: nextMode });
          }}
        >
          <Columns size={18} />
        </button>
      </section>

      <section className={`content-area ${hasSidePanel ? 'with-side-panel' : ''}`}>
        {hasSidePanel && (
          <aside className="side-panel">
            {showBookmarks && (
              <div className="panel-section">
                <h2>收藏夹</h2>
                <div className="panel-search">
                  <Search size={14} />
                  <input
                    value={bookmarkSearch}
                    onChange={(e) => setBookmarkSearch(e.target.value)}
                    placeholder="搜索书签..."
                    spellCheck="false"
                  />
                  {bookmarkSearch && (
                    <button className="clear-search" onClick={() => setBookmarkSearch('')}>
                      <X size={14} />
                    </button>
                  )}
                </div>
                {bookmarks.filter(item => 
                  (item.title || '').toLowerCase().includes(bookmarkSearch.toLowerCase()) || 
                  (item.url || '').toLowerCase().includes(bookmarkSearch.toLowerCase())
                ).length === 0 ? (
                  <p className="empty">{bookmarks.length === 0 ? '暂无收藏' : '没有匹配的书签'}</p>
                ) : (
                  bookmarks.filter(item => 
                    (item.title || '').toLowerCase().includes(bookmarkSearch.toLowerCase()) || 
                    (item.url || '').toLowerCase().includes(bookmarkSearch.toLowerCase())
                  ).map((bookmark) => (
                    <div className="list-row" key={bookmark.id}>
                      <button className="row-main" onClick={() => navigate(activeTab.id, bookmark.url)}>
                        <strong>{bookmark.title}</strong>
                        <span>{getOriginLabel(bookmark.url)}</span>
                      </button>
                      <button className="icon-button small" title="删除" onClick={() => window.browserAPI.removeBookmark(bookmark.id).then(setBookmarks)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {showHistory && (
              <div className="panel-section">
                <div className="panel-heading">
                  <h2>历史记录</h2>
                  {history.length > 0 && (
                    <button className="text-button compact" onClick={() => window.browserAPI.clearHistory().then(setHistory)}>
                      清空
                    </button>
                  )}
                </div>
                <div className="panel-search">
                  <Search size={14} />
                  <input
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="搜索历史记录..."
                    spellCheck="false"
                  />
                  {historySearch && (
                    <button className="clear-search" onClick={() => setHistorySearch('')}>
                      <X size={14} />
                    </button>
                  )}
                </div>
                {history.filter(item => 
                  (item.title || '').toLowerCase().includes(historySearch.toLowerCase()) || 
                  (item.url || '').toLowerCase().includes(historySearch.toLowerCase())
                ).length === 0 ? (
                  <p className="empty">{history.length === 0 ? '暂无历史记录' : '没有匹配的历史记录'}</p>
                ) : (
                  history.filter(item => 
                    (item.title || '').toLowerCase().includes(historySearch.toLowerCase()) || 
                    (item.url || '').toLowerCase().includes(historySearch.toLowerCase())
                  ).map((item) => (
                    <div className="list-row" key={item.id}>
                      <button className="row-main" onClick={() => navigate(activeTab.id, item.url)}>
                        <strong>{item.title}</strong>
                        <span>{formatVisitedAt(item.visitedAt)} · {getOriginLabel(item.url)}</span>
                      </button>
                      <button className="icon-button small" title="删除" onClick={() => window.browserAPI.removeHistory(item.id).then(setHistory)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {showDownloads && (
              <div className="panel-section">
                <div className="panel-heading">
                  <h2>下载管理</h2>
                  {downloads.length > 0 && (
                    <button className="text-button compact" onClick={() => window.browserAPI.clearDownloads().then(setDownloads)}>
                      清空
                    </button>
                  )}
                </div>
                {downloads.length === 0 ? <p className="empty">暂无下载</p> : downloads.map((item) => {
                  const total = item.totalBytes || 0;
                  const received = item.receivedBytes || 0;
                  const percent = total > 0 ? Math.min(100, Math.round((received / total) * 100)) : 0;
                  return (
                    <div className="download-row" key={item.id}>
                      <button className="row-main" onClick={() => item.path && window.browserAPI.openDownload(item.path)}>
                        <strong>{item.filename}</strong>
                        <span>{getDownloadStateLabel(item.state)} · {formatBytes(received)}{total ? ` / ${formatBytes(total)}` : ''}</span>
                      </button>
                      <div className="download-progress"><span style={{ width: `${percent}%` }} /></div>
                      <div className="download-actions">
                        <button className="icon-button small" title="在文件夹中显示" disabled={!item.path} onClick={() => window.browserAPI.showDownloadInFolder(item.path)}>
                          <FolderOpen size={15} />
                        </button>
                        {item.state === 'progressing' && (
                          <button className="icon-button small" title="取消下载" onClick={() => window.browserAPI.cancelDownload(item.id).then(setDownloads)}>
                            <Square size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {showPasswords && (
              <div className="panel-section">
                <h2>当前网站账号</h2>
                {credentials.length === 0 ? <p className="empty">此网站暂无保存账号</p> : credentials.map((credential) => (
                  <div className="password-row" key={credential.id}>
                    <button className="row-main" onClick={() => autofill(credential)}>
                      <strong>{credential.username}</strong>
                      <span>{revealedPasswords[credential.id] ? credential.password : '••••••••'}</span>
                    </button>
                    <button className="icon-button small" title="显示或隐藏密码" onClick={() => setRevealedPasswords((value) => ({ ...value, [credential.id]: !value[credential.id] }))}>
                      {revealedPasswords[credential.id] ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button className="icon-button small" title="删除" onClick={() => window.browserAPI.removeCredential(credential.id).then(() => window.browserAPI.listCredentialsForOrigin(activeTab.url).then(setCredentials))}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showSettings && (
              <div className="panel-section">
                <h2>系统设置</h2>
                
                <div className="settings-group">
                  <label className="settings-label">默认搜索引擎</label>
                  <select
                    className="settings-select"
                    value={settings.defaultSearchEngine || 'bing'}
                    onChange={async (e) => {
                      const next = await window.browserAPI.setSettings({ defaultSearchEngine: e.target.value });
                      setSettings(next);
                    }}
                  >
                    <option value="bing">Bing 搜索</option>
                    <option value="baidu">百度搜索</option>
                    <option value="google">Google 搜索</option>
                  </select>
                </div>

                <div className="settings-group">
                  <label className="settings-label">主页地址 / 启动页</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={settings.startupUrl || ''}
                    onChange={async (e) => {
                      const next = await window.browserAPI.setSettings({ startupUrl: e.target.value });
                      setSettings(next);
                    }}
                    placeholder="例如: swift://newtab"
                    spellCheck="false"
                  />
                </div>

                <div className="settings-group cookies-sec">
                  <label className="settings-label">当前网站 Cookies ({currentCookies.length} 个)</label>
                  <div className="cookies-list">
                    {currentCookies.length === 0 ? (
                      <p className="empty">暂无 Cookie 数据</p>
                    ) : (
                      currentCookies.map((cookie) => (
                        <div key={cookie.name} className="cookie-row">
                          <div className="cookie-info">
                            <strong>{cookie.name}</strong>
                            <span>{cookie.value.slice(0, 15)}{cookie.value.length > 15 ? '...' : ''}</span>
                          </div>
                          <button
                            type="button"
                            className="cookie-remove"
                            title="删除"
                            onClick={async () => {
                              const url = `https://${cookie.domain.replace(/^\./, '')}${cookie.path}`;
                              const success = await window.browserAPI.removeCookie(url, cookie.name, activeTab.isPrivate);
                              if (success) {
                                const host = getOriginLabel(activeTab.url);
                                window.browserAPI.getCookies(host, activeTab.isPrivate).then(setCurrentCookies);
                              }
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="settings-group clear-data-sec">
                  <label className="settings-label">隐私清理</label>
                  <button
                    className="danger-button"
                    onClick={async () => {
                      if (confirm('确定要清除所有的浏览器缓存、Cookie、历史记录和下载记录吗？此操作不可逆。')) {
                        const success = await window.browserAPI.clearAllData();
                        if (success) {
                          setHistory([]);
                          setDownloads([]);
                          alert('数据已成功清除，普通网站的会话已退出。');
                        } else {
                          alert('数据清除失败，请重试。');
                        }
                      }
                    }}
                  >
                    清除所有浏览器数据
                  </button>
                </div>
              </div>
            )}
          </aside>
        )}

        <section className={`webview-stage ${activeTab?.splitMode ? 'split-mode' : 'single-mode'}`}>
          {/* 左侧分屏 / 单屏主区域 */}
          <div className="split-pane left-pane">
            {isAppHome(activeTab?.url) ? (
              <NewTabPage
                quickLinks={quickLinks}
                onNavigate={(value) => navigate(activeTab.id, value, 'left')}
                onAddQuickLink={async (item) => {
                  const next = await window.browserAPI.saveQuickLink(item);
                  setQuickLinks(next);
                }}
                onRemoveQuickLink={async (id) => {
                  const next = await window.browserAPI.removeQuickLink(id);
                  setQuickLinks(next);
                }}
              />
            ) : activeTab?.error ? (
              <div className="page-error">
                <strong>无法打开网页</strong>
                <span>{activeTab.error.description}</span>
                <button className="primary-button" onClick={() => navigate(activeTab.id, activeTab.error.url, 'left')}>
                  重试
                </button>
              </div>
            ) : (
              <div className="webview-stage-placeholder visible" ref={stageLeftRef} />
            )}
          </div>

          {/* 右侧分屏区域 */}
          {activeTab?.splitMode && (
            <div className="split-pane right-pane">
              <div className="split-toolbar">
                <button className="icon-button small" disabled={!activeTab.rightCanGoBack} onClick={() => window.browserAPI.goBackView(activeTab.id, 'right')}>
                  <ArrowLeft size={14} />
                </button>
                <button className="icon-button small" disabled={!activeTab.rightCanGoForward} onClick={() => window.browserAPI.goForwardView(activeTab.id, 'right')}>
                  <ArrowRight size={14} />
                </button>
                <button className="icon-button small" onClick={() => window.browserAPI.reloadView(activeTab.id, 'right')}>
                  <RefreshCw size={14} />
                </button>
                <form className="address-bar compact" onSubmit={(e) => {
                  e.preventDefault();
                  navigate(activeTab.id, activeTab.rightInput, 'right');
                }}>
                  <input
                    value={activeTab.rightInput || ''}
                    onChange={(e) => updateTab(activeTab.id, { rightInput: e.target.value })}
                    placeholder="在右侧分屏中搜索或输入网址"
                    spellCheck="false"
                  />
                </form>
                <button className="icon-button small close-split-btn" title="关闭分屏" onClick={() => updateTab(activeTab.id, { splitMode: false })}>
                  <X size={14} />
                </button>
              </div>
              <div className="split-content-area">
                {isAppHome(activeTab.rightUrl) ? (
                  <NewTabPage
                    quickLinks={quickLinks}
                    onNavigate={(value) => navigate(activeTab.id, value, 'right')}
                    onAddQuickLink={async (item) => {
                      const next = await window.browserAPI.saveQuickLink(item);
                      setQuickLinks(next);
                    }}
                    onRemoveQuickLink={async (id) => {
                      const next = await window.browserAPI.removeQuickLink(id);
                      setQuickLinks(next);
                    }}
                  />
                ) : activeTab.rightError ? (
                  <div className="page-error">
                    <strong>无法打开网页</strong>
                    <span>{activeTab.rightError.description}</span>
                    <button className="primary-button" onClick={() => navigate(activeTab.id, activeTab.rightError.url, 'right')}>
                      重试
                    </button>
                  </div>
                ) : (
                  <div className="webview-stage-placeholder visible" ref={stageRightRef} />
                )}
              </div>
            </div>
          )}
        </section>
      </section>

      <PasswordPrompt
        credential={pendingCredential}
        onDismiss={() => setPendingCredential(null)}
        onSave={saveCredential}
      />
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
