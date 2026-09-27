const { contextBridge, ipcRenderer } = require('electron');

// Retrieve dynamic authoritative app version from main process synchronously
let dynamicVersion = '2.4.0';
try {
  dynamicVersion = ipcRenderer.sendSync('get-app-version') || '2.4.0';
} catch (e) {
  console.warn('Preload version fetch warning:', e.message);
}

contextBridge.exposeInMainWorld('quickprintApi', {
  isDesktop: true,
  version: dynamicVersion,
  getAppVersion: () => ipcRenderer.invoke('updater-get-version'),
  platform: process.platform,

  // Auto-Updater & Software Releases
  checkForUpdates: () => ipcRenderer.invoke('updater-check'),
  startUpdateDownload: () => ipcRenderer.invoke('updater-download'),
  installUpdateNow: () => ipcRenderer.invoke('updater-install'),
  getUpdateStatus: () => ipcRenderer.invoke('updater-get-status'),
  onUpdateStatusChanged: (callback) => {
    ipcRenderer.on('updater-status-changed', (_event, data) => callback(data));
  },

  // Window frame controls
  windowControl: (action) => ipcRenderer.send('window-control', action),

  // Session & Authentication
  getSession: () => ipcRenderer.invoke('auth-get-session'),
  login: (email, password) => ipcRenderer.invoke('auth-login', { email, password }),
  signup: (email, password, shopName, phone) => ipcRenderer.invoke('auth-signup', { email, password, shopName, phone }),
  logout: () => ipcRenderer.invoke('auth-logout'),

  // Hardware & Printers
  getPrinters: () => ipcRenderer.invoke('printers-list'),
  getPrinterHealth: (printerName) => ipcRenderer.invoke('printers-get-health', printerName),
  setDefaultPrinter: (name) => ipcRenderer.invoke('printers-set-default', name),
  printTestPage: (printerName) => ipcRenderer.invoke('printers-test-page', printerName),
  printJob: (jobId, options) => ipcRenderer.invoke('jobs-print', { jobId, options }),
  onPrinterStatusUpdated: (callback) => {
    ipcRenderer.on('printer-status-updated', (_event, data) => callback(data));
  },

  // Media Management & Storage Privacy
  downloadMedia: (jobId, fileName) => ipcRenderer.invoke('media-download', { jobId, fileName }),
  getLocalMediaUrl: (jobId) => ipcRenderer.invoke('media-get-url', jobId),
  deleteLocalMedia: (jobId) => ipcRenderer.invoke('media-delete-local', jobId),
  clearAllPrintedMedia: () => ipcRenderer.invoke('media-clear-printed'),
  getMediaStorageStats: () => ipcRenderer.invoke('media-storage-stats'),

  // Real-time Jobs & Status
  getJobs: () => ipcRenderer.invoke('jobs-list'),
  updateJobStatus: (jobId, status) => ipcRenderer.invoke('jobs-update-status', { jobId, status }),
  confirmCashPayment: (jobId) => ipcRenderer.invoke('jobs-confirm-cash', jobId),
  onJobReceived: (callback) => {
    ipcRenderer.on('job-received', (_event, job) => callback(job));
  },
  onJobStatusUpdated: (callback) => {
    ipcRenderer.on('job-status-updated', (_event, data) => callback(data));
  },
  onJobUpdated: (callback) => {
    ipcRenderer.on('job-updated', (_event, job) => callback(job));
  },
  setOrderIntake: (isAccepting) => ipcRenderer.invoke('shop-set-order-intake', isAccepting),

  // Multi-Printer & Spooler Management
  getMultiPrinterConfig: () => ipcRenderer.invoke('printers-get-config'),
  saveMultiPrinterConfig: (config) => ipcRenderer.invoke('printers-save-config', config),
  detectPrinterCapabilities: (printerName) => ipcRenderer.invoke('printers-detect-capabilities', printerName),
  reassignPrinterJobs: (fromPrinter, toPrinter) => ipcRenderer.invoke('printers-reassign-jobs', { fromPrinter, toPrinter }),

  // Configuration & Preferences
  getConfig: () => ipcRenderer.invoke('settings-get-config'),
  updatePricing: (pricing) => ipcRenderer.invoke('settings-update-pricing', pricing),
  saveSettings: (settings) => ipcRenderer.invoke('settings-save', settings),

  // External links & TV Display
  openExternal: (url) => ipcRenderer.send('open-external', url),
  openTvWindow: (slug) => ipcRenderer.send('open-tv-window', slug),
  generateQrDataUrl: (text) => ipcRenderer.invoke('generate-qr-data-url', text),
  generateQrSvg: (text) => ipcRenderer.invoke('generate-qr-svg', text),

  // Native Notifications
  sendNotification: (title, body) => ipcRenderer.send('notify', { title, body }),
});
