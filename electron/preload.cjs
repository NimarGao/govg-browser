const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('browserAPI', {
  listBookmarks: () => ipcRenderer.invoke('bookmarks:list'),
  saveBookmark: (bookmark) => ipcRenderer.invoke('bookmarks:save', bookmark),
  removeBookmark: (id) => ipcRenderer.invoke('bookmarks:remove', id),
  listHistory: () => ipcRenderer.invoke('history:list'),
  addHistory: (entry) => ipcRenderer.invoke('history:add', entry),
  removeHistory: (id) => ipcRenderer.invoke('history:remove', id),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  listDownloads: () => ipcRenderer.invoke('downloads:list'),
  clearDownloads: () => ipcRenderer.invoke('downloads:clear'),
  cancelDownload: (id) => ipcRenderer.invoke('downloads:cancel', id),
  showDownloadInFolder: (filePath) => ipcRenderer.invoke('downloads:show-in-folder', filePath),
  openDownload: (filePath) => ipcRenderer.invoke('downloads:open', filePath),
  listCredentialsForOrigin: (url) => ipcRenderer.invoke('credentials:list-for-origin', url),
  saveCredential: (credential) => ipcRenderer.invoke('credentials:save', credential),
  removeCredential: (id) => ipcRenderer.invoke('credentials:remove', id),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window:maximize-toggle'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  toggleFullscreen: () => ipcRenderer.invoke('window:fullscreen-toggle'),
  listQuickLinks: () => ipcRenderer.invoke('quicklinks:list'),
  saveQuickLink: (item) => ipcRenderer.invoke('quicklinks:save', item),
  removeQuickLink: (id) => ipcRenderer.invoke('quicklinks:remove', id),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  clearAllData: () => ipcRenderer.invoke('session:clear-all-data'),
  
  // WebContentsView APIs
  createView: (id, url, isPrivate, side) => ipcRenderer.invoke('views:create', id, url, isPrivate, side),
  destroyView: (id, side) => ipcRenderer.invoke('views:destroy', id, side),
  selectView: (id) => ipcRenderer.invoke('views:select', id),
  setViewBounds: (id, side, bounds) => ipcRenderer.invoke('views:set-bounds', id, side, bounds),
  loadViewUrl: (id, side, url) => ipcRenderer.invoke('views:load-url', id, side, url),
  goBackView: (id, side) => ipcRenderer.invoke('views:go-back', id, side),
  goForwardView: (id, side) => ipcRenderer.invoke('views:go-forward', id, side),
  reloadView: (id, side) => ipcRenderer.invoke('views:reload', id, side),
  setViewZoom: (id, side, zoomLevel) => ipcRenderer.invoke('views:set-zoom', id, side, zoomLevel),

  // Cookie APIs
  getCookies: (domain, isPrivate) => ipcRenderer.invoke('session:get-cookies', domain, isPrivate),
  removeCookie: (url, name, isPrivate) => ipcRenderer.invoke('session:remove-cookie', url, name, isPrivate),
  executeViewJavaScript: (id, side, script) => ipcRenderer.invoke('views:execute-javascript', id, side, script),

  onNewTabRequest: (callback) => {
    const listener = (_event, url, isPrivate) => callback(url, isPrivate);
    ipcRenderer.on('browser:new-tab', listener);
    return () => ipcRenderer.removeListener('browser:new-tab', listener);
  },
  onDownloadsUpdated: (callback) => {
    const listener = (_event, downloads) => callback(downloads);
    ipcRenderer.on('downloads:updated', listener);
    return () => ipcRenderer.removeListener('downloads:updated', listener);
  },
  onViewsEvent: (callback) => {
    const listener = (_event, tabId, eventName, details) => callback(tabId, eventName, details);
    ipcRenderer.on('views:event', listener);
    return () => ipcRenderer.removeListener('views:event', listener);
  }
});
