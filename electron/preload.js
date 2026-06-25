const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  getPrintLog: () => ipcRenderer.invoke('get-print-log'),
  openPrintLogFolder: () => ipcRenderer.invoke('open-print-log-folder'),
  getBridgeAssetsPath: () => ipcRenderer.invoke('get-bridge-assets-path'),
  printJob: (jobData) => ipcRenderer.invoke('print-job', jobData),
  printImage: (data) => ipcRenderer.invoke('print-image', data),
  getQueue: () => ipcRenderer.invoke('get-queue'),
  deleteJob: (id) => ipcRenderer.invoke('delete-job', id),
  retryJob: (id) => ipcRenderer.invoke('retry-job', id),
  // 🚀 [Phase 3] Local SQLite query handler
  queryDb: (table, astChain) => ipcRenderer.invoke('query-db', { table, astChain }),
  getLocalSyncStatus: () => ipcRenderer.invoke('get-local-sync-status'),
  onLocalSyncStatus: (callback) => {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on('local-sync-status', handler);
    return () => ipcRenderer.removeListener('local-sync-status', handler);
  },
  // 🚀 [Phase 4] Offline Sync & Security
  startSync: (session) => ipcRenderer.invoke('start-sync', session),
  clearOfflineData: () => ipcRenderer.invoke('clear-offline-data'),
  triggerBackup: () => ipcRenderer.invoke('trigger-backup'),
  triggerRestore: (data) => ipcRenderer.invoke('trigger-restore', data),
  setSyncScope: (scope) => ipcRenderer.invoke('set-sync-scope', scope),
  getStartupSetting: () => ipcRenderer.invoke('get-startup-setting'),
  setStartupSetting: (enabled) => ipcRenderer.invoke('set-startup-setting', enabled),
  deleteLocalRecord: (table, id) => ipcRenderer.invoke('delete-local-record', { table, id }),
  syncDeletedOrders: () => ipcRenderer.invoke('sync-deleted-orders'),
  requestImmediateSync: () => ipcRenderer.invoke('request-immediate-sync'),
  getYearlyStats: (tenantId) => ipcRenderer.invoke('get-yearly-stats', tenantId),
  downloadImage: (payload) => ipcRenderer.invoke('download-image', payload),
  clearSpooler: () => ipcRenderer.invoke('clear-spooler'),
  wakeUpWindow: () => ipcRenderer.invoke('wake-up-window'),
  triggerKakaotalkPaste: (message, contact) =>
    ipcRenderer.invoke('trigger-kakaotalk-paste', { message, contact }),
});
