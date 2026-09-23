const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('quickprintApi', {
  isDesktop: true,
  version: '2.4.0',
  platform: process.platform,

  // Window frame controls
  windowControl: (action) => ipcRenderer.send('window-control', action),

  // Session & Authentication
  getSession: () => ipcRenderer.invoke('auth-get-session'),
  login: (email, password) => ipcRenderer.invoke('auth-login', { email, password }),
  signup: (email, password, shopName, phone) => ipcRenderer.invoke('auth-signup', { email, password, shopName, phone }),
  logout: () => ipcRenderer.invoke('auth-logout'),

  // Hardware & Printers
  getPrinters: () => ipcRenderer.invoke('printers-list'),
  setDefaultPrinter: (name) => ipcRenderer.invoke('printers-set-default', name),
  printTestPage: (printerName) => ipcRenderer.invoke('printers-test-page', printerName),
  printJob: (jobId, options) => ipcRenderer.invoke('jobs-print', { jobId, options }),

  // Real-time Jobs
  getJobs: () => ipcRenderer.invoke('jobs-list'),
  updateJobStatus: (jobId, status) => ipcRenderer.invoke('jobs-update-status', { jobId, status }),
  onJobReceived: (callback) => {
    ipcRenderer.on('job-received', (_event, job) => callback(job));
  },

  // Configuration & Preferences
  updatePricing: (pricing) => ipcRenderer.invoke('settings-update-pricing', pricing),
  saveSettings: (settings) => ipcRenderer.invoke('settings-save', settings),

  // External links & TV Display
  openExternal: (url) => ipcRenderer.send('open-external', url),
  openTvWindow: (slug) => ipcRenderer.send('open-tv-window', slug),
  generateQrDataUrl: (text) => ipcRenderer.invoke('generate-qr-data-url', text),

  // Native Notifications
  sendNotification: (title, body) => ipcRenderer.send('notify', { title, body }),
});
