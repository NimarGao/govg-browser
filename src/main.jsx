import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkPlus,
  Clock3,
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
  ShieldCheck,
  Square,
  Star,
  Trash2,
  X
} from 'lucide-react';
import './styles.css';

const HOME_URL = 'swift://newtab';
const SEARCH_URL = 'https://www.bing.com/search?q=';

function isAppHome(url) {
  return url === HOME_URL;
}

function createTab(url = HOME_URL) {
  return {
    id: crypto.randomUUID(),
    title: '新标签页',
    url,
    input: isAppHome(url) ? '' : url,
    loading: false,
    error: null,
    canGoBack: false,
    canGoForward: false
  };
}

function toNavigableUrl(value) {
  const input = value.trim();
  if (!input) return HOME_URL;
  if (input === HOME_URL) return HOME_URL;
  if (/^(https?:\/\/)/i.test(input)) return input;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(input) || /^localhost(:\d+)?/i.test(input)) {
    return `https://${input}`;
  }
  return `${SEARCH_URL}${encodeURIComponent(input)}`;
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

function refreshWebviewLayout(element) {
  if (!element) return;
  element.style.width = 'calc(100% - 1px)';
  element.style.height = 'calc(100% - 1px)';
  window.requestAnimationFrame(() => {
    element.style.width = '100%';
    element.style.height = '100%';
    window.dispatchEvent(new Event('resize'));
  });
}

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

function NewTabPage({ onNavigate }) {
  const [query, setQuery] = useState('');
  const quickLinks = [
    { title: 'Bing', url: 'https://www.bing.com' },
    { title: '百度', url: 'https://www.baidu.com' },
    { title: 'GitHub', url: 'https://github.com' },
    { title: '知乎', url: 'https://www.zhihu.com' }
  ];

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
          <button key={link.url} onClick={() => onNavigate(link.url)}>
            <span>{link.title.slice(0, 1)}</span>
            <strong>{link.title}</strong>
          </button>
        ))}
      </div>
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
  const [webviewPreload, setWebviewPreload] = useState('');
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [pendingCredential, setPendingCredential] = useState(null);
  const webviews = useRef(new Map());

  const resolvedActiveId = activeId || tabs[0]?.id;
  const activeTab = tabs.find((tab) => tab.id === resolvedActiveId) || tabs[0];

  const activeBookmarked = useMemo(
    () => bookmarks.some((bookmark) => bookmark.url === activeTab?.url),
    [bookmarks, activeTab?.url]
  );
  const hasSidePanel = showBookmarks || showHistory || showDownloads || showPasswords;

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
    window.browserAPI.getWebviewPreload().then((filePath) => {
      setWebviewPreload(`file://${filePath.replaceAll('\\', '/')}`);
    });
  }, []);

  useEffect(() => {
    if (!activeTab?.url || isAppHome(activeTab.url)) return;
    window.browserAPI.listCredentialsForOrigin(activeTab.url).then(setCredentials);
  }, [activeTab?.url]);

  const navigate = useCallback((id, value) => {
    const url = toNavigableUrl(value);
    updateTab(id, { url, input: url, loading: true, error: null });
  }, [updateTab]);

  const addTab = useCallback((url = HOME_URL) => {
    const tab = createTab(url);
    setTabs((current) => [...current, tab]);
    setActiveId(tab.id);
  }, []);

  useEffect(() => {
    return window.browserAPI.onNewTabRequest((url) => addTab(url));
  }, [addTab]);

  useEffect(() => {
    return window.browserAPI.onDownloadsUpdated(setDownloads);
  }, []);

  useEffect(() => {
    refreshWebviewLayout(webviews.current.get(resolvedActiveId));
  }, [resolvedActiveId, activeTab?.url, showBookmarks, showHistory, showDownloads, showPasswords]);

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
    const webview = webviews.current.get(activeTab.id);
    if (!webview) return;
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
    webview.executeJavaScript(script).catch(() => {});
  }, [activeTab?.id]);

  const attachWebview = useCallback((tab, element) => {
    if (!element || webviews.current.get(tab.id) === element) return;
    webviews.current.set(tab.id, element);
    [0, 120, 500, 1000].forEach((delay) => {
      window.setTimeout(() => refreshWebviewLayout(element), delay);
    });

    element.addEventListener('did-start-loading', () => updateTab(tab.id, { loading: true }));
    element.addEventListener('dom-ready', () => {
      refreshWebviewLayout(element);
    });
    element.addEventListener('did-stop-loading', async () => {
      refreshWebviewLayout(element);
      updateTab(tab.id, {
        loading: false,
        canGoBack: element.canGoBack(),
        canGoForward: element.canGoForward()
      });
      const currentUrl = element.getURL();
      if (currentUrl) {
        updateTab(tab.id, { url: currentUrl, input: currentUrl });
        const title = element.getTitle?.() || currentUrl;
        setHistory(await window.browserAPI.addHistory({ title, url: currentUrl }));
        if (tab.id === resolvedActiveId) {
          setCredentials(await window.browserAPI.listCredentialsForOrigin(currentUrl));
        }
      }
    });
    element.addEventListener('page-title-updated', (event) => updateTab(tab.id, { title: event.title || '未命名页面' }));
    element.addEventListener('did-navigate', (event) => updateTab(tab.id, { url: event.url, input: event.url }));
    element.addEventListener('did-navigate-in-page', (event) => updateTab(tab.id, { url: event.url, input: event.url }));
    element.addEventListener('did-fail-load', (event) => {
      if (!event.isMainFrame || event.errorCode === -3) return;
      updateTab(tab.id, {
        loading: false,
        error: {
          code: event.errorCode,
          description: event.errorDescription || '页面加载失败',
          url: event.validatedURL || tab.url
        }
      });
    });
    element.addEventListener('ipc-message', (event) => {
      if (event.channel !== 'credential-captured') return;
      const credential = event.args?.[0];
      if (credential?.username && credential?.password) setPendingCredential(credential);
    });
    element.addEventListener('new-window', (event) => {
      event.preventDefault();
      if (event.url) addTab(event.url);
    });
  }, [addTab, resolvedActiveId, updateTab]);

  return (
    <main className="app-shell">
      <section className="tab-strip">
        <div className="tabs-area">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab ${tab.id === resolvedActiveId ? 'active' : ''}`}
              onClick={() => setActiveId(tab.id)}
              title={tab.title}
            >
              <span className="tab-title">{tab.loading ? <Loader2 className="spin" size={14} /> : null}{tab.title}</span>
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
        </div>
        <div className="window-controls">
          <button className="window-button" title="最小化" onClick={() => window.browserAPI.minimizeWindow()}>
            <Minus size={16} />
          </button>
          <button className="window-button" title="最大化" onClick={() => window.browserAPI.toggleMaximizeWindow()}>
            <Maximize2 size={15} />
          </button>
          <button className="window-button close" title="关闭" onClick={() => window.browserAPI.closeWindow()}>
            <X size={16} />
          </button>
        </div>
      </section>

      <section className="toolbar">
        <button className="icon-button" title="后退" disabled={!activeTab?.canGoBack} onClick={() => webviews.current.get(activeTab.id)?.goBack()}>
          <ArrowLeft size={18} />
        </button>
        <button className="icon-button" title="前进" disabled={!activeTab?.canGoForward} onClick={() => webviews.current.get(activeTab.id)?.goForward()}>
          <ArrowRight size={18} />
        </button>
        <button className="icon-button" title="刷新" onClick={() => webviews.current.get(activeTab.id)?.reload()}>
          <RefreshCw size={18} />
        </button>
        <button className="icon-button" title="主页" onClick={() => navigate(activeTab.id, HOME_URL)}>
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
          <ShieldCheck size={17} className="secure-icon" />
        </form>

        <button className={`icon-button ${activeBookmarked ? 'marked' : ''}`} title="收藏当前页面" onClick={toggleBookmark}>
          {activeBookmarked ? <Star size={18} /> : <BookmarkPlus size={18} />}
        </button>
        <button className={`icon-button ${showBookmarks ? 'active' : ''}`} title="收藏夹" onClick={() => setShowBookmarks((value) => !value)}>
          <Bookmark size={18} />
        </button>
        <button className={`icon-button ${showHistory ? 'active' : ''}`} title="历史记录" onClick={() => setShowHistory((value) => !value)}>
          <Clock3 size={18} />
        </button>
        <button className={`icon-button ${showDownloads ? 'active' : ''}`} title="下载管理" onClick={() => setShowDownloads((value) => !value)}>
          <Download size={18} />
        </button>
        <button className={`icon-button ${showPasswords ? 'active' : ''}`} title="账号密码" onClick={() => setShowPasswords((value) => !value)}>
          <KeyRound size={18} />
        </button>
      </section>

      <section className={`content-area ${hasSidePanel ? 'with-side-panel' : ''}`}>
        {hasSidePanel && (
          <aside className="side-panel">
            {showBookmarks && (
              <div className="panel-section">
                <h2>收藏夹</h2>
                {bookmarks.length === 0 ? <p className="empty">暂无收藏</p> : bookmarks.map((bookmark) => (
                  <div className="list-row" key={bookmark.id}>
                    <button className="row-main" onClick={() => navigate(activeTab.id, bookmark.url)}>
                      <strong>{bookmark.title}</strong>
                      <span>{getOriginLabel(bookmark.url)}</span>
                    </button>
                    <button className="icon-button small" title="删除" onClick={() => window.browserAPI.removeBookmark(bookmark.id).then(setBookmarks)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
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
                {history.length === 0 ? <p className="empty">暂无历史记录</p> : history.map((item) => (
                  <div className="list-row" key={item.id}>
                    <button className="row-main" onClick={() => navigate(activeTab.id, item.url)}>
                      <strong>{item.title}</strong>
                      <span>{formatVisitedAt(item.visitedAt)} · {getOriginLabel(item.url)}</span>
                    </button>
                    <button className="icon-button small" title="删除" onClick={() => window.browserAPI.removeHistory(item.id).then(setHistory)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
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
          </aside>
        )}

        <section className="webview-stage">
          {webviewPreload && activeTab && !isAppHome(activeTab.url) && (
            <webview
              key={activeTab.id}
              ref={(element) => attachWebview(activeTab, element)}
              className="browser-webview visible"
              src={activeTab.url}
              preload={webviewPreload}
              allowpopups="true"
              partition="persist:govg-browser"
            />
          )}
          {isAppHome(activeTab?.url) && <NewTabPage onNavigate={(value) => navigate(activeTab.id, value)} />}
          {activeTab?.error && (
            <div className="page-error">
              <strong>无法打开网页</strong>
              <span>{activeTab.error.description}</span>
              <button className="primary-button" onClick={() => navigate(activeTab.id, activeTab.error.url)}>
                重试
              </button>
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
