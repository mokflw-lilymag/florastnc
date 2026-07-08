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
  syncTenantBackupPath: (payload) => ipcRenderer.invoke('sync-tenant-backup-path', payload),
  clearSpooler: () => ipcRenderer.invoke('clear-spooler'),
  wakeUpWindow: () => ipcRenderer.invoke('wake-up-window'),
  notifyExternalOrder: (payload) => ipcRenderer.invoke('notify-external-order', payload),
  clearExternalOrderBadge: () => ipcRenderer.invoke('clear-external-order-badge'),
  triggerKakaotalkPaste: (message, contact) =>
    ipcRenderer.invoke('trigger-kakaotalk-paste', { message, contact }),
  triggerMessengerPaste: (payload) =>
    ipcRenderer.invoke('trigger-messenger-paste', payload),
  openReminderWindow: (data) => ipcRenderer.send('open-reminder-window', data),
  getReminderData: () => ipcRenderer.invoke('get-reminder-data'),
  closeReminderWindow: () => ipcRenderer.send('close-reminder-window'),
  sendReminderAction: (data) => ipcRenderer.send('reminder-action', data),
  onReminderAction: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('reminder-action', handler);
    return () => ipcRenderer.removeListener('reminder-action', handler);
  },
  runMonthlyPhotoBackup: (payload) => ipcRenderer.invoke('run-monthly-photo-backup', payload || {}),
  openMonthlyBackupFolder: (payload) => ipcRenderer.invoke('open-monthly-backup-folder', payload),
  onUpdaterStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('updater-status', handler);
    return () => ipcRenderer.removeListener('updater-status', handler);
  },
  installUpdate: () => ipcRenderer.invoke('install-update'),
});
