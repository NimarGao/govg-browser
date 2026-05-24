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
  getWebviewPreload: () => ipcRenderer.invoke('app:get-webview-preload'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window:maximize-toggle'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  onNewTabRequest: (callback) => {
    const listener = (_event, url) => callback(url);
    ipcRenderer.on('browser:new-tab', listener);
    return () => ipcRenderer.removeListener('browser:new-tab', listener);
  },
  onDownloadsUpdated: (callback) => {
    const listener = (_event, downloads) => callback(downloads);
    ipcRenderer.on('downloads:updated', listener);
    return () => ipcRenderer.removeListener('downloads:updated', listener);
  }
});
