// Suppress @supabase/supabase-js Node.js version warning (uses console.warn, not process.emitWarning)
// Electron v33 bundles Node.js v20.x which triggers this warning — we can't upgrade Electron's Node.
const _origWarn = console.warn;
console.warn = (...args) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.includes('Node.js 20 and below are deprecated') || msg.includes('supabase/discussions/45715')) return;
  _origWarn.apply(console, args);
};

const { app, BrowserWindow, Tray, Menu, Notification, nativeImage, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const http = require('http');
const { exec } = require('child_process');
const WebSocket = require('ws');

// Polyfill global WebSocket for Supabase Realtime in Electron Node environment
if (!global.WebSocket) {
  global.WebSocket = WebSocket;
}

// Prevent Windows GPU disk cache lock collisions
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

// Single instance lock to prevent multiple conflicting processes
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[LIFECYCLE] Another instance of QuickPrint Counter OS is already running. Exiting secondary process.');
  app.exit(0);
} else {
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    console.log('[LIFECYCLE] User launched QuickPrint again. Restoring and focusing active Counter OS window.');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

const { createClient } = require('@supabase/supabase-js');
let QRCode = null;
try {
  QRCode = require('qrcode');
} catch (e) {
  console.warn('qrcode package load note:', e.message);
}

// --- AUTO-UPDATER & PRODUCTION RELEASE PIPELINE ---
let autoUpdater = null;
try {
  const updaterModule = require('electron-updater');
  autoUpdater = updaterModule.autoUpdater;
} catch (e) {
  console.warn('[AUTO-UPDATER] electron-updater module load note:', e.message);
}

let activePrintingJobsCount = 0;
let pendingDeferredUpdateInstall = false;
let currentUpdateStatus = {
  state: 'idle',
  currentVersion: app.getVersion(),
  availableVersion: null,
  progress: 0,
  bytesPerSecond: 0,
  totalBytes: 0,
  transferredBytes: 0,
  message: 'QuickPrint Counter OS is up to date',
  error: null,
  releaseNotes: '',
};

function formatUpdateSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec < 1024) return `${bytesPerSec || 0} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

function broadcastUpdateStatus() {
  currentUpdateStatus.currentVersion = app.getVersion();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater-status-changed', { ...currentUpdateStatus });
  }
}

function initAutoUpdater() {
  if (!autoUpdater) {
    console.warn('[AUTO-UPDATER] electron-updater not available in current runtime');
    return;
  }

  // Production Updater Configuration
  autoUpdater.autoDownload = false; // Give user choice
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.allowPrerelease = appConfig.updateChannel === 'beta';

  // Support local development inspection
  if (!app.isPackaged) {
    const devUpdatePath = path.join(__dirname, 'dev-app-update.yml');
    if (fs.existsSync(devUpdatePath)) {
      try {
        autoUpdater.updateConfigPath = devUpdatePath;
      } catch (err) {
        console.warn('[AUTO-UPDATER] dev-app-update config warning:', err.message);
      }
    }
  }

  autoUpdater.on('checking-for-update', () => {
    console.log('[AUTO-UPDATER] Checking for software updates...');
    currentUpdateStatus.state = 'checking';
    currentUpdateStatus.message = 'Checking for updates...';
    currentUpdateStatus.error = null;
    broadcastUpdateStatus();
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[AUTO-UPDATER] New release available:', info.version);
    currentUpdateStatus.state = 'available';
    currentUpdateStatus.availableVersion = info.version;
    currentUpdateStatus.releaseNotes = typeof info.releaseNotes === 'string' ? info.releaseNotes : '';
    currentUpdateStatus.message = `New version ${info.version} is available.`;
    currentUpdateStatus.error = null;
    broadcastUpdateStatus();

    if (Notification.isSupported()) {
      new Notification({
        title: 'QuickPrint Update Available',
        body: `Version ${info.version} is ready to download. Open Settings to update.`,
      }).show();
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[AUTO-UPDATER] Software is up to date:', info?.version || app.getVersion());
    currentUpdateStatus.state = 'not-available';
    currentUpdateStatus.message = 'QuickPrint Counter OS is up to date.';
    currentUpdateStatus.availableVersion = null;
    currentUpdateStatus.error = null;
    broadcastUpdateStatus();
  });

  autoUpdater.on('download-progress', (progressObj) => {
    currentUpdateStatus.state = 'downloading';
    currentUpdateStatus.progress = Math.round(progressObj.percent || 0);
    currentUpdateStatus.bytesPerSecond = progressObj.bytesPerSecond || 0;
    currentUpdateStatus.totalBytes = progressObj.total || 0;
    currentUpdateStatus.transferredBytes = progressObj.transferred || 0;
    currentUpdateStatus.message = `Downloading update: ${currentUpdateStatus.progress}% (${formatUpdateSpeed(progressObj.bytesPerSecond)})`;
    broadcastUpdateStatus();
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AUTO-UPDATER] Update downloaded successfully:', info.version);
    currentUpdateStatus.state = 'downloaded';
    currentUpdateStatus.progress = 100;
    currentUpdateStatus.message = `Version ${info.version} downloaded and verified. Ready to install.`;
    currentUpdateStatus.error = null;
    broadcastUpdateStatus();
  });

  autoUpdater.on('error', (err) => {
    console.warn('[AUTO-UPDATER] Update server check note (local printing unaffected):', err.message);
    currentUpdateStatus.state = 'error';
    currentUpdateStatus.error = err.message;
    currentUpdateStatus.message = 'Unable to check for updates. Local printing is unaffected.';
    broadcastUpdateStatus();
  });
}

function executeSafeUpdateInstall() {
  // Requirement 9: NEVER restart/update while a print job is actively printing!
  if (activePrintingJobsCount > 0) {
    pendingDeferredUpdateInstall = true;
    currentUpdateStatus.state = 'deferred';
    currentUpdateStatus.message = 'Update is available. It will be installed after current print jobs are completed.';
    broadcastUpdateStatus();
    return {
      success: false,
      deferred: true,
      message: currentUpdateStatus.message,
    };
  }

  if (currentUpdateStatus.state !== 'downloaded') {
    return {
      success: false,
      error: 'Update must be downloaded before installing.',
    };
  }

  try {
    pendingDeferredUpdateInstall = false;
    // Quit and install silently or with standard restart
    if (autoUpdater) {
      autoUpdater.quitAndInstall(false, true);
    }
    return { success: true };
  } catch (err) {
    console.error('[AUTO-UPDATER] Failed to execute update installation:', err);
    return { success: false, error: err.message };
  }
}

// Setup persistent storage in standard OS AppData directory
const userDataPath = app.getPath('userData');
const sessionFilePath = path.join(userDataPath, 'quickprint_session.json');
const configFilePath = path.join(userDataPath, 'quickprint_config.json');

// Helper to parse key=value lines from .env files without external dependencies
function loadEnvFile(envPath) {
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    } catch (e) {
      console.warn('Error reading env file:', envPath, e.message);
    }
  }
}

// Load env files in order of preference
loadEnvFile(path.join(__dirname, '.env'));
loadEnvFile(path.join(__dirname, '.env.local'));
loadEnvFile(path.join(__dirname, '..', '.env.local'));
loadEnvFile(path.join(userDataPath, '.env'));

// Default initial config with production credentials
const DEFAULT_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iixcylrdqfdxfsldcygm.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpeGN5bHJkcWZkeGZzbGRjeWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NDI3ODksImV4cCI6MjEwNTQxODc4OX0.lavqpkI94x1yyIfUQdOJGeAG5jESdmVZ7qxsAE6FhMQ';
const DEFAULT_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://doc2print.vercel.app';

let appConfig = {
  shopId: '',
  shopSlug: 'counter',
  appUrl: DEFAULT_APP_URL,
  supabaseUrl: DEFAULT_SUPABASE_URL,
  supabaseAnonKey: DEFAULT_SUPABASE_ANON_KEY,
  defaultPrinter: '',
  autoPrintEnabled: true,
  autoLaunch: true,
  soundAlert: true,
  autoCheckUpdates: true,
  updateChannel: 'stable',
};

// Also look for bundled config.json fallback
const bundledConfigPath = path.join(__dirname, 'config.json');
if (fs.existsSync(bundledConfigPath)) {
  try {
    const raw = fs.readFileSync(bundledConfigPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.supabaseAnonKey) delete parsed.supabaseAnonKey;
    if (!parsed.supabaseUrl) delete parsed.supabaseUrl;
    appConfig = { ...appConfig, ...parsed };
  } catch (err) {
    console.error('Error reading bundled config:', err);
  }
}

if (fs.existsSync(configFilePath)) {
  try {
    const raw = fs.readFileSync(configFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.supabaseAnonKey) delete parsed.supabaseAnonKey;
    if (!parsed.supabaseUrl) delete parsed.supabaseUrl;
    appConfig = { ...appConfig, ...parsed };
  } catch (err) {
    console.error('Error reading user config:', err);
  }
}

// Upgrade legacy domain to real deployed domain if needed
if (!appConfig.appUrl || appConfig.appUrl.includes('quickprint.in')) {
  appConfig.appUrl = DEFAULT_APP_URL;
}

// Ensure keys are NEVER blank
if (!appConfig.supabaseUrl) appConfig.supabaseUrl = DEFAULT_SUPABASE_URL;
if (!appConfig.supabaseAnonKey) appConfig.supabaseAnonKey = DEFAULT_SUPABASE_ANON_KEY;

function saveConfig() {
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(appConfig, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving config:', err);
  }
}

let mainWindow = null;
let tray = null;
let supabase = null;
let realtimeChannel = null;

// Initialize Supabase Client with WebSocket transport
function getSupabase() {
  const url = appConfig.supabaseUrl || DEFAULT_SUPABASE_URL;
  const key = appConfig.supabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY;
  if (!supabase && url && key) {
    supabase = createClient(url, key, {
      auth: {
        persistSession: false,
      },
      realtime: {
        transport: WebSocket,
      },
    });
  }
  return supabase;
}

// Session persistence functions
function readSavedSession() {
  if (fs.existsSync(sessionFilePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(sessionFilePath, 'utf8'));
      return data;
    } catch (e) {
      console.error('Failed to read saved session:', e);
    }
  }
  return null;
}

function writeSavedSession(sessionData) {
  try {
    fs.writeFileSync(sessionFilePath, JSON.stringify(sessionData, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write session file:', e);
  }
}

function clearSavedSession() {
  try {
    if (fs.existsSync(sessionFilePath)) {
      fs.unlinkSync(sessionFilePath);
    }
  } catch (e) {
    console.error('Failed to remove session file:', e);
  }
}

// Windows native printer discovery
async function getWindowsPrinters() {
  if (process.platform !== 'win32') {
    return ['Virtual Spooler'];
  }
  // Fast path: use Electron's native Windows spooler API (EnumPrintersW)
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents?.getPrintersAsync) {
    try {
      const printers = await mainWindow.webContents.getPrintersAsync();
      if (printers && printers.length > 0) {
        return printers.map((p) => p.name).filter(Boolean);
      }
    } catch (e) {
      console.warn('[PRINTERS] Fast getPrintersAsync note:', e.message);
    }
  }

  return new Promise((resolve) => {
    const cmd = 'powershell -NoProfile -Command "Get-Printer | Select-Object -ExpandProperty Name"';
    exec(cmd, { timeout: 3000 }, (err, stdout) => {
      if (err || !stdout) {
        return resolve(['Microsoft Print to PDF']);
      }
      const list = stdout
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      resolve(list.length ? list : ['Microsoft Print to PDF']);
    });
  });
}

// Windows default printer discovery
async function getWindowsDefaultPrinter() {
  if (process.platform !== 'win32') {
    return 'Virtual Spooler';
  }
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents?.getPrintersAsync) {
    try {
      const printers = await mainWindow.webContents.getPrintersAsync();
      const def = printers.find((p) => p.isDefault);
      if (def?.name) return def.name;
      if (printers[0]?.name) return printers[0].name;
    } catch (e) {}
  }

  return new Promise((resolve) => {
    const cmd = 'powershell -NoProfile -Command "(Get-CimInstance Win32_Printer | Where-Object Default | Select-Object -First 1).Name"';
    exec(cmd, { timeout: 2500 }, (err, stdout) => {
      const def = (stdout || '').trim();
      resolve(def || 'Microsoft Print to PDF');
    });
  });
}

const lastKnownPrinterHealth = {};
const inFlightPrinterChecks = {};

// Windows native printer health & availability check
function getRealPrinterStatus(printerName) {
  if (!printerName) {
    return Promise.resolve({
      exists: false,
      status: 'NOT_FOUND',
      details: 'No printer specified',
      isOnline: false,
      jobCount: 0,
    });
  }

  if (process.platform !== 'win32') {
    return Promise.resolve({
      exists: true,
      status: 'READY',
      details: 'Virtual Spooler Active',
      isOnline: true,
      jobCount: 0,
    });
  }

  if (inFlightPrinterChecks[printerName]) {
    return inFlightPrinterChecks[printerName];
  }

  const checkPromise = new Promise((resolve) => {
    const handleResult = (res) => {
      delete inFlightPrinterChecks[printerName];
      if (printerName) {
        lastKnownPrinterHealth[printerName] = res;
      }
      resolve(res);
    };

    const script = `
      try {
        $target = [System.Environment]::GetEnvironmentVariable('QP_TARGET_PRINTER')
        if (-not $target) { exit }

        # Literal match avoids bracket wildcard issues with HP printers like [F1673F]
        $gp = Get-Printer | Where-Object { $_.Name.Trim() -eq $target.Trim() } | Select-Object -First 1
        $p = Get-CimInstance Win32_Printer | Where-Object { $_.Name.Trim() -eq $target.Trim() } | Select-Object -First 1

        if (-not $p -and -not $gp) {
          @{ exists = $false; status = 'NOT_FOUND'; details = 'Printer not found in Windows'; isOnline = $false; jobCount = 0 } | ConvertTo-Json -Compress
          exit
        }

        $offline = if ($p) { [bool]$p.WorkOffline } else { $false }
        $ext = if ($p) { [int]$p.ExtendedPrinterStatus } else { 0 }
        $pState = if ($p) { [int]$p.PrinterState } else { 0 }
        $gpStatus = if ($gp) { [string]$gp.PrinterStatus } else { '' }

        # Safe spool job counting passing PrinterObject directly to avoid parameter binding errors
        $spoolJobs = if ($gp) { Get-PrintJob -PrinterObject $gp -ErrorAction SilentlyContinue } else { @() }
        $jCount = if ($spoolJobs) { @($spoolJobs).Count } else { 0 }

        $status = 'READY'
        $details = 'Printer Idle & Ready'
        $isOnline = $true

        if ($offline) {
          $status = 'OFFLINE'
          $details = 'Printer is set to Offline in Windows'
          $isOnline = $false
        } elseif ($gpStatus -match 'Offline|Error|DoorOpen|PaperOut|PaperJam|NotAvailable' -or $ext -in @(7, 9) -or $pState -in @(2, 4, 8, 16, 32)) {
          $isOfflineType = $gpStatus -match 'Offline' -or $ext -eq 7
          $status = if ($isOfflineType) { 'OFFLINE' } else { 'ERROR' }
          $details = if ($gpStatus) { "Printer status: $gpStatus (Hardware disconnected or power off)" } else { 'Printer disconnected or power off' }
          $isOnline = $false
        } elseif ($ext -eq 8 -or $gpStatus -match 'Paused') {
          $status = 'PAUSED'
          $details = 'Printer is paused'
          $isOnline = false
        } elseif ($jCount -gt 0) {
          $status = 'PRINTING'
          $details = "$jCount active print job(s) in spooler"
          $isOnline = $true
        }

        @{
          exists = $true;
          status = $status;
          details = $details;
          isOnline = $isOnline;
          jobCount = $jCount;
        } | ConvertTo-Json -Compress
      } catch {
        @{ exists = $false; status = 'OFFLINE'; details = 'Hardware disconnected or driver unreachable'; isOnline = $false; jobCount = 0 } | ConvertTo-Json -Compress
      }
    `;

    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    const env = { ...process.env, QP_TARGET_PRINTER: printerName };

    exec(`powershell -NoProfile -EncodedCommand ${encoded}`, { env, timeout: 8000 }, (err, stdout) => {
      if (err || !stdout) {
        const prev = lastKnownPrinterHealth[printerName];
        if (prev && prev.exists) {
          return handleResult(prev);
        }
        return handleResult({
          exists: true,
          status: 'OFFLINE',
          details: 'Printer hardware check failed or timed out',
          isOnline: false,
          jobCount: 0,
        });
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        handleResult(parsed);
      } catch (parseErr) {
        handleResult({
          exists: true,
          status: 'OFFLINE',
          details: 'Printer status unparseable / offline',
          isOnline: false,
          jobCount: 0,
        });
      }
    });
  });

  inFlightPrinterChecks[printerName] = checkPromise;
  return checkPromise;
}

// Hardware Printer Capability Auto-Detection (Windows PowerShell)
function detectHardwarePrinterCapabilities(printerName) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve({
        color: true,
        bw: true,
        duplex: true,
        a4: true,
        a3: false,
        a5: true,
        legal: true,
        photo_4x6: true,
        photo_5x7: true,
        borderless: true,
        detectedType: 'color',
      });
    }

    const safeName = (printerName || '').replace(/'/g, "''");
    const script = `
      try {
        $name = '${safeName}'
        $cim = Get-CimInstance Win32_Printer | Where-Object { $_.Name -eq $name } | Select-Object -First 1
        $conf = Get-PrintConfiguration -PrinterName $name -ErrorAction SilentlyContinue

        $isColor = $false
        if ($conf -and $conf.Color) { $isColor = [bool]$conf.Color }
        elseif ($cim -and $cim.CapabilityDescriptions -match 'Color') { $isColor = $true }

        $isDuplex = $false
        if ($conf -and [int]$conf.DuplexingMode -gt 0) { $isDuplex = $true }
        elseif ($cim -and $cim.CapabilityDescriptions -match 'Duplex') { $isDuplex = $true }

        $nameLower = $name.ToLower()
        $isPhoto = $nameLower -match 'photo' -or $nameLower -match 'deskjet' -or $nameLower -match 'inkjet' -or $nameLower -match 'l805' -or $nameLower -match 'xp-'
        $isLarge = $nameLower -match 'plotter' -or $nameLower -match 'designjet' -or $nameLower -match 'large'

        @{
          color = $isColor;
          bw = $true;
          duplex = $isDuplex;
          a4 = $true;
          a3 = [bool]($isLarge -or $nameLower -match 'a3');
          a5 = $true;
          legal = $true;
          photo_4x6 = $isPhoto;
          photo_5x7 = $isPhoto;
          borderless = $isPhoto;
          detectedType = if ($isPhoto) { 'photo' } elseif ($isLarge) { 'large_format' } elseif ($isColor) { 'color' } else { 'bw' };
        } | ConvertTo-Json -Compress
      } catch {
        @{
          color = $true;
          bw = $true;
          duplex = $false;
          a4 = $true;
          a3 = $false;
          a5 = $true;
          legal = $true;
          photo_4x6 = $false;
          photo_5x7 = $false;
          borderless = $false;
          detectedType = 'color';
        } | ConvertTo-Json -Compress
      }
    `;

    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    exec(`powershell -NoProfile -EncodedCommand ${encoded}`, (err, stdout) => {
      if (err || !stdout) {
        return resolve({
          color: true,
          bw: true,
          duplex: false,
          a4: true,
          a3: false,
          a5: true,
          legal: true,
          photo_4x6: false,
          photo_5x7: false,
          borderless: false,
          detectedType: 'color',
        });
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (e) {
        resolve({
          color: true,
          bw: true,
          duplex: false,
          a4: true,
          a3: false,
          a5: true,
          legal: true,
          photo_4x6: false,
          photo_5x7: false,
          borderless: false,
          detectedType: 'color',
        });
      }
    });
  });
}

// Check if a specific printer satisfies the required job parameters (Full Capability Model)
function isPrinterCompatibleWithJob(job, printerProfile) {
  if (!printerProfile) return { compatible: true };
  if (printerProfile.enabled === false) {
    return { compatible: false, reason: 'Printer disabled in Shop Routing Configuration' };
  }

  // Stock status check: cannot route to an out-of-paper printer
  if (printerProfile.stockStatus === 'out_of_paper') {
    return { compatible: false, reason: 'Printer is out of paper (Stock depleted)' };
  }

  const caps = printerProfile.capabilities || {};
  const cfg = job.print_config || {};

  // 1. Check Print Type (Photo / Image / Document)
  const jobMode = (job.mode || cfg.mode || (job.photo_size ? 'photo' : 'document')).toLowerCase();
  if (caps.printTypes) {
    if (jobMode === 'photo' && !caps.printTypes.photo) {
      return { compatible: false, reason: 'Printer does not support dedicated Photo Studio printing' };
    }
    if (jobMode === 'image' && !caps.printTypes.image) {
      return { compatible: false, reason: 'Printer does not support Image printing' };
    }
    if (jobMode === 'document' && !caps.printTypes.document) {
      return { compatible: false, reason: 'Printer does not support Document printing' };
    }
  }

  // 2. Check Color Requirement
  const jobColor = (job.color_mode || cfg.colorMode || 'bw').toLowerCase();
  const supportsColor = caps.color !== false && printerProfile.type !== 'bw';
  if (jobColor === 'color' && !supportsColor) {
    return { compatible: false, reason: 'Printer is Monochrome only (Job requires Full Color)' };
  }

  // 3. Check Duplex Requirement
  const isDuplex = Boolean(job.duplex || cfg.duplex);
  if (isDuplex && !caps.duplex) {
    return { compatible: false, reason: 'Printer does not support Two-Sided (Duplex) printing' };
  }

  // 4. Check Paper Size Requirement
  const rawPaper = (job.paper_size || cfg.paperSize || (jobMode === 'photo' ? 'photo_4x6' : 'A4')).toUpperCase();
  const pCaps = caps.paperSizes || caps;

  if (rawPaper.includes('A3') && !pCaps.a3) {
    return { compatible: false, reason: 'Printer does not support A3 paper size' };
  }
  if (rawPaper.includes('A5') && pCaps.a5 === false) {
    return { compatible: false, reason: 'Printer does not support A5 paper size' };
  }
  if (rawPaper.includes('4X6') && !pCaps.photo_4x6 && !caps.photo_4x6) {
    return { compatible: false, reason: 'Printer does not support 4×6 photo size' };
  }
  if (rawPaper.includes('5X7') && !pCaps.photo_5x7 && !caps.photo_5x7) {
    return { compatible: false, reason: 'Printer does not support 5×7 photo size' };
  }
  if (rawPaper.includes('LEGAL') && pCaps.legal === false && caps.legal === false) {
    return { compatible: false, reason: 'Printer does not support Legal paper size' };
  }

  // 5. Check Media / Paper Type
  const rawMedia = (job.paper_type || job.photo_paper || cfg.photoPaper || cfg.paperType || '').toLowerCase();
  const mCaps = caps.mediaTypes || {};
  if (rawMedia.includes('gloss') && mCaps.glossy_photo === false) {
    return { compatible: false, reason: 'Printer does not support Glossy Photo Paper' };
  }
  if (rawMedia.includes('matte') && mCaps.matte_photo === false) {
    return { compatible: false, reason: 'Printer does not support Matte Photo Paper' };
  }
  if (rawMedia.includes('card') && mCaps.card_thick === false) {
    return { compatible: false, reason: 'Printer does not support Heavy Card / Bond Paper' };
  }

  // 6. Check Borderless Requirement
  const isBorderless = Boolean(job.borderless || cfg.borderless);
  if (isBorderless && !caps.borderless) {
    return { compatible: false, reason: 'Printer does not support Borderless (edge-to-edge) printing' };
  }

  return { compatible: true };
}

// Intelligent Multi-Printer Routing Selector (Requirement 14, 17, 18)
function findBestPrinterForJob(job, printersList, liveHealthMap = {}) {
  // If multi-printer mode is not enabled, default to single printer
  if (!appConfig.multiPrinterMode) {
    const fallback = appConfig.defaultPrinter || printersList[0] || 'Microsoft Print to PDF';
    return { printer: fallback, reason: 'Single Printer Mode (Default)' };
  }

  const printersConfig = appConfig.printersConfig || {};
  const candidates = [];
  const rejectedReasons = [];

  for (const name of printersList) {
    const profile = printersConfig[name] || {
      name,
      enabled: true,
      priority: name === appConfig.defaultPrinter ? 1 : 2,
      capabilities: { a4: true, a3: false, a5: true, legal: true, color: true, bw: true, duplex: true, photo_4x6: false },
    };

    const comp = isPrinterCompatibleWithJob(job, profile);
    if (!comp.compatible) {
      rejectedReasons.push(`${profile.customName || name}: ${comp.reason}`);
      continue;
    }

    const health = liveHealthMap[name] || { isOnline: true, status: 'READY', jobCount: 0 };
    const isOnline = health.isOnline && health.status === 'READY';

    candidates.push({
      name,
      profile,
      health,
      isOnline,
      queueCount: Number(health.jobCount || 0),
      priority: Number(profile.priority || 2),
    });
  }

  if (candidates.length === 0) {
    return {
      printer: null,
      status: 'waiting_for_compatible_printer',
      reason: `No compatible printer found in shop for this job.\nDetails:\n${rejectedReasons.join('\n')}`,
    };
  }

  // Filter only online printers
  const onlineCandidates = candidates.filter((c) => c.isOnline);
  if (onlineCandidates.length === 0) {
    return {
      printer: null,
      isOffline: true,
      status: 'waiting_for_printer',
      reason: 'All compatible printers are currently OFFLINE or in error state.',
    };
  }

  // Rank online candidates:
  onlineCandidates.sort((a, b) => {
    if (appConfig.loadBalancing !== false) {
      if (a.queueCount !== b.queueCount) return a.queueCount - b.queueCount;
      return a.priority - b.priority;
    } else {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.queueCount - b.queueCount;
    }
  });

  return {
    printer: onlineCandidates[0].name,
    reason: `Selected via ${appConfig.loadBalancing !== false ? 'Load Balancing (Queue: ' + onlineCandidates[0].queueCount + ')' : 'Priority ' + onlineCandidates[0].priority}`,
  };
}

// Local application-managed media directory for privacy & reprint retention
function getJobsMediaDir() {
  const dir = path.join(app.getPath('userData'), 'jobs_media');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// Download and verify local file persistence, then purge cloud copy
async function ensureLocalMedia(job) {
  const jobsMediaDir = getJobsMediaDir();
  const jobDir = path.join(jobsMediaDir, String(job.id));
  if (!fs.existsSync(jobDir)) {
    fs.mkdirSync(jobDir, { recursive: true });
  }

  const rawExt = (job.file_name || 'doc').split('.').pop() || 'pdf';
  const cleanExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'pdf';
  const localOriginalPath = path.join(jobDir, `original.${cleanExt}`);

  // If local file already exists with valid content, reuse it
  if (fs.existsSync(localOriginalPath)) {
    try {
      const stats = fs.statSync(localOriginalPath);
      if (stats.size > 0) {
        return localOriginalPath;
      }
    } catch (e) {}
  }

  if (!job.file_url) {
    throw new Error('No printable file URL found for this order');
  }

  // Download from temporary cloud storage
  console.log(`[MEDIA] Downloading remote file for Job #${job.token_number || job.id} to local storage...`);
  await downloadRemoteFile(job.file_url, localOriginalPath);

  // Verify local existence & readability
  if (!fs.existsSync(localOriginalPath)) {
    throw new Error('Local media verification failed: File was not created');
  }
  const stat = fs.statSync(localOriginalPath);
  if (stat.size <= 0) {
    fs.unlinkSync(localOriginalPath);
    throw new Error('Local media verification failed: Downloaded file is 0 bytes');
  }

  console.log(`[MEDIA] Local media verified (${stat.size} bytes): ${localOriginalPath}`);

  // Safely purge cloud copy from Supabase storage now that local copy is verified
  try {
    const client = getSupabase();
    if (client && job.file_url) {
      let storagePath = null;
      if (job.file_url.includes('/print-files/')) {
        const parts = job.file_url.split('/print-files/');
        if (parts.length > 1) {
          storagePath = decodeURIComponent(parts[1].split('?')[0]);
        }
      }
      if (storagePath) {
        console.log(`[STORAGE] Purging cloud file from Supabase 'print-files' bucket: ${storagePath}`);
        const { error: purgeErr } = await client.storage.from('print-files').remove([storagePath]);
        if (purgeErr) {
          console.warn('[STORAGE] Cloud storage auto-purge error:', purgeErr.message);
        } else {
          console.log(`[STORAGE] ✅ Successfully purged cloud media from Supabase: ${storagePath}`);
        }
      }
    }
  } catch (purgeErr) {
    console.warn('[STORAGE] Purge trigger error:', purgeErr.message);
  }

  return localOriginalPath;
}

// Media storage statistics
function getMediaStorageStats() {
  const jobsMediaDir = getJobsMediaDir();
  let totalBytes = 0;
  let fileCount = 0;

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const full = path.join(dir, item);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          scanDir(full);
        } else if (stat.isFile()) {
          fileCount++;
          totalBytes += stat.size;
        }
      } catch (e) {}
    }
  }

  scanDir(jobsMediaDir);
  return { totalBytes, fileCount, formattedSize: (totalBytes / (1024 * 1024)).toFixed(2) + ' MB' };
}

// Delete local media for a single job
async function deleteLocalJobMedia(jobId) {
  const jobsMediaDir = getJobsMediaDir();
  const jobDir = path.join(jobsMediaDir, String(jobId));
  if (fs.existsSync(jobDir)) {
    try {
      fs.rmSync(jobDir, { recursive: true, force: true });
      console.log(`[MEDIA] Deleted local media directory for Job #${jobId}`);
    } catch (e) {
      console.warn(`[MEDIA] Could not remove directory ${jobDir}:`, e.message);
    }
  }
  return { success: true };
}

// Delete all local media for completed print jobs
async function clearAllPrintedLocalMedia() {
  const client = getSupabase();
  const jobsMediaDir = getJobsMediaDir();
  let deletedCount = 0;

  if (client) {
    try {
      const { data: completedJobs } = await client
        .from('jobs')
        .select('id')
        .in('print_status', ['completed', 'failed']);

      if (completedJobs && completedJobs.length > 0) {
        for (const j of completedJobs) {
          const dir = path.join(jobsMediaDir, String(j.id));
          if (fs.existsSync(dir)) {
            try {
              fs.rmSync(dir, { recursive: true, force: true });
              deletedCount++;
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.warn('[MEDIA] clearAllPrintedLocalMedia error:', e.message);
    }
  }

  return { success: true, deletedCount };
}

// Periodic background printer health monitoring
let printerMonitorTimer = null;
let lastKnownPrinterStatus = null;

function startPrinterMonitoring() {
  if (printerMonitorTimer) clearInterval(printerMonitorTimer);

  printerMonitorTimer = setInterval(async () => {
    const targetPrinter = appConfig.defaultPrinter || 'Microsoft Print to PDF';
    try {
      const health = await getRealPrinterStatus(targetPrinter);
      const statusKey = `${health.status}_${health.details}_${health.jobCount}`;

      if (statusKey !== lastKnownPrinterStatus) {
        lastKnownPrinterStatus = statusKey;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('printer-status-updated', {
            printer: targetPrinter,
            ...health,
          });
        }
      }
    } catch (e) {}
  }, 12000);
}

function createWindow() {
  let iconPath = path.join(__dirname, 'assets', 'icon.png');
  if (process.platform === 'win32') {
    const icoPath = path.join(__dirname, 'assets', 'icon.ico');
    if (fs.existsSync(icoPath)) iconPath = icoPath;
  }

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 1040,
    minHeight: 680,
    frame: false,
    title: 'QuickPrint Counter OS',
    backgroundColor: '#F8FAFC',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load self-contained local Industrial White UI
  const uiEntry = path.join(__dirname, 'ui', 'index.html');
  mainWindow.loadFile(uiEntry);

  mainWindow.webContents.on('did-finish-load', () => {
    setTimeout(async () => {
      try {
        const targetPrinter = appConfig.defaultPrinter || await getWindowsDefaultPrinter();
        const health = await getRealPrinterStatus(targetPrinter);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('printer-status-updated', {
            printer: targetPrinter,
            ...health,
          });
        }
      } catch (e) {}
    }, 300);
  });

  // Proper window close handling: cleanly quit so process does not remain dangling
  mainWindow.on('close', () => {
    app.isQuitting = true;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('QuickPrint Counter OS — Industrial Print Terminal');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open QuickPrint Counter',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Spooler Status: Active 🟢',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Open Customer Web Kiosk',
      click: () => {
        shell.openExternal(`${appConfig.appUrl || DEFAULT_APP_URL}/kiosk/${appConfig.shopSlug || 'counter'}`);
      },
    },
    { type: 'separator' },
    {
      label: 'Exit QuickPrint',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Download remote file helper for physical spooler
function downloadRemoteFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const client = url.startsWith('https') ? https : http;

    client.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadRemoteFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file from cloud: HTTP ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

// Background Realtime Agent
function setupRealtimeJobs(shopId) {
  const client = getSupabase();
  if (!client || !shopId) return;

  if (realtimeChannel) {
    try {
      client.removeChannel(realtimeChannel);
    } catch (e) { }
  }

  try {
    realtimeChannel = client
      .channel('counter_realtime_jobs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'jobs',
          filter: `shop_id=eq.${shopId}`,
        },
        (payload) => {
          const job = payload.new;
          console.log('[AGENT] Incoming job received:', job.token_number);

          // Immediately pre-download to local disk and auto-purge from Supabase storage
          if (job.file_url) {
            ensureLocalMedia(job).catch((err) =>
              console.warn('[STORAGE] Background auto-purge for incoming job failed:', err.message)
            );
          }

          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('job-received', job);
          }

          if (Notification.isSupported()) {
            const displayPrice = job.price != null ? job.price : (job.total_amount || 0);
            const displayName = job.customer_name || job.file_name || 'Customer';
            new Notification({
              title: `New Order Token #${job.token_number || '001'}`,
              body: `${displayName} • ₹${displayPrice} (${(job.payment_status || 'PENDING').toUpperCase()})`,
            }).show();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `shop_id=eq.${shopId}`,
        },
        (payload) => {
          const job = payload.new;
          console.log('[AGENT] Realtime job update:', job.token_number, job.payment_status, job.print_status);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('job-updated', job);
          }
        }
      )
      .subscribe();
  } catch (err) {
    console.warn('Realtime subscription error:', err.message);
  }
}

function updateAutoLaunch(enable) {
  if (process.platform !== 'win32') return;
  const appPath = process.execPath;
  const keyName = 'QuickPrintCounterOS';

  if (enable) {
    const regCmd = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${keyName}" /t REG_SZ /d "\\"${appPath}\\" --minimized" /f`;
    exec(regCmd, (err) => {
      if (err) console.warn('Auto-launch reg error:', err.message);
    });
  } else {
    const regCmd = `reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${keyName}" /f`;
    exec(regCmd, (err) => {
      if (err) console.warn('Auto-launch delete reg error:', err.message);
    });
  }
}

// --- IPC HANDLERS ---
function registerIpcHandlers() {
  // Synchronous version lookup for preload
  ipcMain.on('get-app-version', (event) => {
    event.returnValue = app.getVersion();
  });

  // Software Update IPC Handlers
  ipcMain.handle('updater-get-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('updater-get-status', () => {
    currentUpdateStatus.currentVersion = app.getVersion();
    return { ...currentUpdateStatus };
  });

  ipcMain.handle('updater-check', async () => {
    if (!autoUpdater) {
      return { success: false, error: 'Auto-updater not supported in this environment' };
    }
    try {
      currentUpdateStatus.state = 'checking';
      currentUpdateStatus.message = 'Checking for updates...';
      broadcastUpdateStatus();
      const result = await autoUpdater.checkForUpdates();
      return { success: true, result };
    } catch (err) {
      console.warn('[AUTO-UPDATER] Check error (local printing unaffected):', err.message);
      currentUpdateStatus.state = 'error';
      currentUpdateStatus.error = err.message;
      currentUpdateStatus.message = 'Unable to check for updates. Local printing is unaffected.';
      broadcastUpdateStatus();
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('updater-download', async () => {
    if (!autoUpdater) return { success: false, error: 'Auto-updater unavailable' };
    try {
      currentUpdateStatus.state = 'downloading';
      currentUpdateStatus.progress = 0;
      currentUpdateStatus.message = 'Starting download...';
      broadcastUpdateStatus();
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (err) {
      currentUpdateStatus.state = 'error';
      currentUpdateStatus.error = err.message;
      broadcastUpdateStatus();
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('updater-install', async () => {
    return executeSafeUpdateInstall();
  });

  ipcMain.on('window-control', (_e, action) => {
    if (!mainWindow) return;
    if (action === 'minimize') mainWindow.minimize();
    else if (action === 'maximize') {
      if (mainWindow.isMaximized()) mainWindow.unmaximize();
      else mainWindow.maximize();
    } else if (action === 'close') {
      mainWindow.close();
    }
  });

  ipcMain.on('notify', (_e, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });

  // External URL opener
  ipcMain.on('open-external', (_e, url) => {
    if (url) shell.openExternal(url);
  });

  // Open Waiting Area TV Board in separate window
  let tvWindow = null;
  ipcMain.on('open-tv-window', (_e, slug) => {
    const targetSlug = slug || appConfig.shopSlug || 'counter';
    const baseUrl = (appConfig.appUrl || DEFAULT_APP_URL).replace(/\/+$/, '');
    const tvUrl = `${baseUrl}/tv/${targetSlug}`;
    console.log('[TV] Opening TV Waiting Board window:', tvUrl);

    if (tvWindow && !tvWindow.isDestroyed()) {
      tvWindow.focus();
      return;
    }

    tvWindow = new BrowserWindow({
      width: 1280,
      height: 720,
      title: 'QuickPrint Waiting Area TV Board',
      backgroundColor: '#0F172A',
      autoHideMenuBar: true,
    });

    tvWindow.loadURL(tvUrl);
    tvWindow.on('closed', () => {
      tvWindow = null;
    });
  });

  // Offline Native QR Code Generation (Data URL)
  ipcMain.handle('generate-qr-data-url', async (_e, text) => {
    if (!text) return null;
    if (QRCode && QRCode.toDataURL) {
      try {
        const dataUrl = await QRCode.toDataURL(text, {
          width: 800,
          margin: 1,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#0F172A',
            light: '#FFFFFF',
          },
        });
        return dataUrl;
      } catch (err) {
        console.error('Local QR generation error:', err);
      }
    }
    // Fallback to online API if needed
    return `https://api.qrserver.com/v1/create-qr-code/?size=800x800&ecc=H&margin=4&data=${encodeURIComponent(text)}`;
  });

  // Offline Native QR Code Generation (SVG)
  ipcMain.handle('generate-qr-svg', async (_e, text) => {
    if (!text) return null;
    if (QRCode && QRCode.toString) {
      try {
        const svg = await QRCode.toString(text, {
          type: 'svg',
          margin: 1,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#0F172A',
            light: '#FFFFFF',
          },
        });
        return svg;
      } catch (err) {
        console.error('Local QR SVG generation error:', err);
      }
    }
    return null;
  });

  // Session: Check saved session
  ipcMain.handle('auth-get-session', async () => {
    const saved = readSavedSession();
    if (!saved || !saved.tokens) {
      return null;
    }

    const client = getSupabase();
    if (!client) return null;

    try {
      const { data, error } = await client.auth.setSession({
        access_token: saved.tokens.access_token,
        refresh_token: saved.tokens.refresh_token,
      });

      if (error || !data.user) {
        console.warn('Session refresh failed:', error?.message);
        clearSavedSession();
        return null;
      }

      if (data.session) {
        saved.tokens = {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        };
        writeSavedSession(saved);
      }

      let freshShop = saved.shop;
      let subscription = null;
      if (saved.shop?.id) {
        try {
          const { data: s } = await client.from('shops').select('*').eq('id', saved.shop.id).single();
          if (s) freshShop = s;
          const { data: sub } = await client.from('subscriptions').select('*').eq('shop_id', saved.shop.id).maybeSingle();
          subscription = sub;
        } catch (e) {}
      }

      if (freshShop) {
        freshShop.slug = freshShop.qr_code_slug || freshShop.slug || 'counter';
        freshShop.qr_code_slug = freshShop.slug;
        saved.shop = freshShop;
        writeSavedSession(saved);
      }

      if (saved.shop?.id) {
        setupRealtimeJobs(saved.shop.id);
      }

      return { user: data.user, shop: freshShop || saved.shop, subscription };
    } catch (e) {
      console.error('Session verify error:', e);
      return null;
    }
  });

  // Auth: Login
  ipcMain.handle('auth-login', async (_e, { email, password }) => {
    console.log('[AUTH] Processing login for:', email);
    const client = getSupabase();
    if (!client) {
      console.error('[AUTH] Supabase client could not be created');
      return { success: false, error: 'Database service unavailable' };
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('[AUTH] signInWithPassword error:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[AUTH] User authenticated successfully:', data.user.id);

      // Query shop for this owner
      let shop = null;
      try {
        const { data: shops } = await client
          .from('shops')
          .select('*')
          .eq('owner_id', data.user.id)
          .limit(1);

        if (shops && shops.length > 0) {
          shop = shops[0];
        }
      } catch (shopErr) {
        console.warn('[AUTH] Error fetching shop record:', shopErr.message);
      }

      if (!shop) {
        shop = {
          id: appConfig.shopId || data.user.id,
          name: 'QuickPrint Counter',
          slug: 'counter',
          qr_code_slug: 'counter',
        };
      } else {
        shop.slug = shop.qr_code_slug || shop.slug || 'counter';
        shop.qr_code_slug = shop.slug;
      }

      let subscription = null;
      try {
        const { data: sub } = await client.from('subscriptions').select('*').eq('shop_id', shop.id).maybeSingle();
        subscription = sub;
      } catch (subErr) { }

      // Persist session tokens
      const sessionRecord = {
        tokens: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        },
        user: { id: data.user.id, email: data.user.email },
        shop,
      };
      writeSavedSession(sessionRecord);

      appConfig.shopId = shop.id;
      appConfig.shopSlug = shop.slug;
      saveConfig();

      setupRealtimeJobs(shop.id);

      return { success: true, user: data.user, shop, subscription };
    } catch (err) {
      console.error('[AUTH] Uncaught login exception:', err);
      return { success: false, error: err.message };
    }
  });

  // Auth: Signup
  ipcMain.handle('auth-signup', async (_e, { email, password, shopName, phone }) => {
    const client = getSupabase();
    if (!client) return { success: false, error: 'Database service unavailable' };

    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { shop_name: shopName, phone },
        },
      });

      if (error) return { success: false, error: error.message };
      if (!data.user) return { success: false, error: 'Registration failed' };

      const shopSlug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'shop';
      const newShop = {
        id: data.user.id,
        owner_id: data.user.id,
        name: shopName,
        slug: shopSlug,
        phone,
      };

      try {
        await client.from('shops').insert([newShop]);
      } catch (insertErr) {
        console.warn('Could not insert shop record:', insertErr.message);
      }

      if (data.session) {
        const sessionRecord = {
          tokens: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          },
          user: { id: data.user.id, email: data.user.email },
          shop: newShop,
        };
        writeSavedSession(sessionRecord);
      }

      return { success: true, user: data.user, shop: newShop };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Auth: Logout
  ipcMain.handle('auth-logout', async () => {
    clearSavedSession();
    const client = getSupabase();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (e) { }
    }
    if (realtimeChannel && client) {
      try {
        client.removeChannel(realtimeChannel);
      } catch (e) { }
      realtimeChannel = null;
    }
    return { success: true };
  });

  // Printers: List
  ipcMain.handle('printers-list', async () => {
    const printers = await getWindowsPrinters();
    if (!appConfig.defaultPrinter) {
      appConfig.defaultPrinter = await getWindowsDefaultPrinter();
      saveConfig();
    }
    const defaultPrinter = appConfig.defaultPrinter || printers[0] || 'Microsoft Print to PDF';
    return { printers, defaultPrinter };
  });

  // Printers: Set Default
  ipcMain.handle('printers-set-default', async (_e, name) => {
    appConfig.defaultPrinter = name;
    saveConfig();
    return { success: true };
  });

  // Printers: Test Page
  ipcMain.handle('printers-test-page', async (_e, printerName) => {
    const target = printerName || appConfig.defaultPrinter || 'Microsoft Print to PDF';
    console.log('[SPOOLER] Sending test page to:', target);

    if (process.platform === 'win32') {
      const testCmd = `rundll32.exe printui.dll,PrintUIEntry /k /n "${target}"`;
      return new Promise((resolve) => {
        exec(testCmd, (err) => {
          if (err) {
            console.warn('Native test print error:', err.message);
            resolve({ success: true, note: 'Spooler invoked' });
          } else {
            resolve({ success: true });
          }
        });
      });
    }
    return { success: true, simulated: true };
  });

  // Printers: Multi-Printer Management Config & Status
  ipcMain.handle('printers-get-config', async () => {
    const printers = await getWindowsPrinters();
    if (!appConfig.defaultPrinter) {
      appConfig.defaultPrinter = await getWindowsDefaultPrinter();
      saveConfig();
    }
    return {
      multiPrinterMode: !!appConfig.multiPrinterMode,
      printerAssignmentMode: appConfig.printerAssignmentMode || 'auto',
      loadBalancing: appConfig.loadBalancing !== false,
      printersConfig: appConfig.printersConfig || {},
      printers,
      defaultPrinter: appConfig.defaultPrinter,
    };
  });

  // Printers: Save Multi-Printer Routing Preferences
  ipcMain.handle('printers-save-config', async (_e, config) => {
    if (typeof config.multiPrinterMode === 'boolean') appConfig.multiPrinterMode = config.multiPrinterMode;
    if (config.printerAssignmentMode) appConfig.printerAssignmentMode = config.printerAssignmentMode;
    if (typeof config.loadBalancing === 'boolean') appConfig.loadBalancing = config.loadBalancing;
    if (config.printersConfig) appConfig.printersConfig = config.printersConfig;
    saveConfig();
    return { success: true };
  });

  // Printers: Auto-Detect Hardware Capabilities
  ipcMain.handle('printers-detect-capabilities', async (_e, printerName) => {
    return await detectHardwarePrinterCapabilities(printerName);
  });

  // Printers: Reassign Pending Jobs From Offline Printer (Requirement 20)
  ipcMain.handle('printers-reassign-jobs', async (_e, { fromPrinter, toPrinter }) => {
    const client = getSupabase();
    if (!client) return { success: false, error: 'Database service unavailable' };

    const shopId = appConfig.shopId;
    if (!shopId) return { success: false, error: 'Shop ID not configured' };

    try {
      const { data: jobs, error } = await client
        .from('jobs')
        .select('*')
        .eq('shop_id', shopId)
        .in('print_status', ['queued', 'pending_payment', 'waiting_for_printer']);

      if (error) return { success: false, error: error.message };

      const allPrinters = await getWindowsPrinters();
      let reassignedCount = 0;

      for (const job of (jobs || [])) {
        if (job.assigned_printer === fromPrinter || !job.assigned_printer) {
          let chosen = toPrinter;
          if (!chosen) {
            const best = findBestPrinterForJob(job, allPrinters, lastKnownPrinterHealth);
            if (best.printer && !best.isOffline) chosen = best.printer;
          }

          if (chosen) {
            const profile = appConfig.printersConfig?.[chosen];
            if (!profile || isPrinterCompatibleWithJob(job, profile).compatible) {
              await client.from('jobs').update({
                assigned_printer: chosen,
                print_status: 'queued',
                failure_reason: null,
              }).eq('id', job.id);
              reassignedCount++;

              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('job-updated', {
                  ...job,
                  assigned_printer: chosen,
                  print_status: 'queued',
                });
              }
            }
          }
        }
      }

      return { success: true, reassignedCount };
    } catch (reassignErr) {
      return { success: false, error: reassignErr.message };
    }
  });

  // Jobs: Print Job (Direct Physical Spooler Pipeline with real health check & capability routing)
  ipcMain.handle('jobs-print', async (_e, { jobId, options = {} }) => {
    console.log('[SPOOLER] Processing print job request:', jobId, options);
    const client = getSupabase();
    if (!client || !jobId) return { success: false, error: 'Database client or Job ID missing' };

    // Fetch full job record
    const { data: job, error: fetchErr } = await client.from('jobs').select('*').eq('id', jobId).single();
    if (fetchErr || !job) {
      return { success: false, error: fetchErr?.message || 'Job not found in database' };
    }

    // Step 0: Determine Target Printer with Intelligent Capability Routing
    let printerName = options.printerName || job.assigned_printer;
    if (!printerName) {
      const allPrinters = await getWindowsPrinters();
      const best = findBestPrinterForJob(job, allPrinters, lastKnownPrinterHealth);
      if (!best.printer || best.isOffline) {
        const failureReason = best.reason || 'No ready compatible printer available in shop';
        console.warn(`[SPOOLER] Job ${jobId} hold: ${failureReason}`);
        await client.from('jobs').update({
          print_status: 'waiting_for_printer',
          failure_reason: failureReason,
        }).eq('id', jobId);

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('job-status-updated', {
            jobId,
            status: 'waiting_for_printer',
            error: failureReason,
          });
        }
        return { success: false, waitingForPrinter: true, error: failureReason };
      }
      printerName = best.printer;
    }

    // Step 0.5: Enforce Capability Compatibility Verification
    const profile = appConfig.printersConfig?.[printerName] || null;
    const compatibility = isPrinterCompatibleWithJob(job, profile);
    if (!compatibility.compatible) {
      const errMsg = `Printer "${printerName}" is incompatible with this job: ${compatibility.reason}`;
      console.warn(`[SPOOLER] Capability mismatch for job ${jobId}: ${errMsg}`);
      await client.from('jobs').update({
        print_status: 'waiting_for_printer',
        failure_reason: errMsg,
      }).eq('id', jobId);

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('job-status-updated', {
          jobId,
          status: 'waiting_for_printer',
          error: errMsg,
        });
      }
      return { success: false, incompatible: true, error: errMsg };
    }

    // Step 1: Real Windows Printer Status Check — NEVER print to an offline printer!
    const health = await getRealPrinterStatus(printerName);
    if (!health.isOnline || health.status === 'OFFLINE' || health.status === 'ERROR') {
      console.warn(`[SPOOLER] Cannot print job ${jobId}: Printer "${printerName}" is ${health.status} (${health.details})`);
      await client.from('jobs').update({
        print_status: 'waiting_for_printer',
        failure_reason: `Printer "${printerName}" is ${health.status}: ${health.details}`,
      }).eq('id', jobId);

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('job-status-updated', {
          jobId,
          status: 'waiting_for_printer',
          error: `Printer "${printerName}" is ${health.status} (${health.details})`,
        });
        mainWindow.webContents.send('printer-status-updated', {
          printer: printerName,
          ...health,
        });
      }
      return {
        success: false,
        printerOffline: true,
        error: `Printer "${printerName}" is OFFLINE (${health.details}). Please connect printer.`,
      };
    }

    // Step 1: Update status to 'printing'
    await client.from('jobs').update({ print_status: 'printing' }).eq('id', jobId);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('job-status-updated', { jobId, status: 'printing' });
    }

    activePrintingJobsCount++;
    try {
      const copies = Math.max(1, Number(options.copies || job.copies || 1));
      const rawPaper = options.paperSize || job.paper_size || 'A4';
      const paperSize = rawPaper.split(' + ')[0].toUpperCase();
      const duplex = options.duplex ?? job.duplex ?? false;

      // Step 2: Download and verify local media persistence (Application-Managed Directory)
      const localOriginalFile = await ensureLocalMedia(job);
      let printableFilePath = localOriginalFile;
      const jobDir = path.dirname(localOriginalFile);
      const cleanExt = (job.file_name || 'doc').split('.').pop()?.toLowerCase() || 'pdf';

      // Convert images (jpg, png, etc.) to standard A4 PDF for native physical spooling
      if (['jpg', 'jpeg', 'png', 'webp'].includes(cleanExt)) {
        try {
          const { PDFDocument } = require('pdf-lib');
          const imageBytes = fs.readFileSync(localOriginalFile);
          const pdfDoc = await PDFDocument.create();
          let embeddedImage;
          if (cleanExt === 'png') {
            embeddedImage = await pdfDoc.embedPng(imageBytes);
          } else {
            embeddedImage = await pdfDoc.embedJpg(imageBytes);
          }
          const a4Width = 595.28;
          const a4Height = 841.89;
          const page = pdfDoc.addPage([a4Width, a4Height]);
          const margin = 36;
          const maxWidth = a4Width - (margin * 2);
          const maxHeight = a4Height - (margin * 2);
          const imgDims = embeddedImage.scaleToFit(maxWidth, maxHeight);
          const x = margin + (maxWidth - imgDims.width) / 2;
          const y = margin + (maxHeight - imgDims.height) / 2;

          page.drawImage(embeddedImage, {
            x,
            y,
            width: imgDims.width,
            height: imgDims.height,
          });

          const convertedPdfPath = path.join(jobDir, `converted_${Date.now()}.pdf`);
          const pdfBytes = await pdfDoc.save();
          fs.writeFileSync(convertedPdfPath, pdfBytes);
          printableFilePath = convertedPdfPath;
          console.log(`[SPOOLER] Converted ${cleanExt} image to printable PDF: ${printableFilePath}`);
        } catch (imgErr) {
          console.warn('[SPOOLER] Image to PDF conversion fallback:', imgErr.message);
        }
      }

      // Page-by-page / Selective page reprint support
      if ((options.pageRange || options.pages || job.selected_pages) && printableFilePath.toLowerCase().endsWith('.pdf')) {
        try {
          const { PDFDocument } = require('pdf-lib');
          const sourceBytes = fs.readFileSync(printableFilePath);
          const srcDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
          const totalSrcPages = srcDoc.getPageCount();

          let targetIndices = [];
          if (Array.isArray(options.pages)) {
            targetIndices = options.pages.map((p) => Number(p) - 1);
          } else if (Array.isArray(job.selected_pages) && !options.pageRange) {
            targetIndices = job.selected_pages.map((p) => Number(p) - 1);
          } else if (typeof options.pageRange === 'string') {
            const rawRange = options.pageRange.trim();
            if (rawRange.endsWith('-')) {
              const start = parseInt(rawRange.slice(0, -1), 10);
              for (let i = start; i <= totalSrcPages; i++) {
                targetIndices.push(i - 1);
              }
            } else if (rawRange.includes('-')) {
              const [start, end] = rawRange.split('-').map(Number);
              for (let i = start; i <= end; i++) {
                targetIndices.push(i - 1);
              }
            } else {
              const single = parseInt(rawRange, 10);
              if (!isNaN(single)) targetIndices.push(single - 1);
            }
          }

          targetIndices = targetIndices.filter((idx) => idx >= 0 && idx < totalSrcPages);

          if (targetIndices.length > 0) {
            const slicedDoc = await PDFDocument.create();
            const copied = await slicedDoc.copyPages(srcDoc, targetIndices);
            copied.forEach((p) => slicedDoc.addPage(p));
            const slicedBytes = await slicedDoc.save();

            const slicedFilePath = path.join(jobDir, `sliced_${Date.now()}.pdf`);
            fs.writeFileSync(slicedFilePath, slicedBytes);
            printableFilePath = slicedFilePath;
            console.log(`[SPOOLER] Sliced PDF to target pages (${targetIndices.map((i) => i + 1).join(', ')}): ${printableFilePath}`);
          }
        } catch (sliceErr) {
          console.warn('[SPOOLER] Page range slicing note:', sliceErr.message);
        }
      }

      // Step 3: Spool to physical Windows printer
      let ptp = null;
      try {
        ptp = require('pdf-to-printer');
      } catch (e) {
        console.warn('pdf-to-printer load error:', e.message);
      }

      if (ptp && process.platform === 'win32' && printableFilePath.toLowerCase().endsWith('.pdf')) {
        const ptpOpts = {
          printer: printerName,
          copies,
        };
        if (paperSize) ptpOpts.paperSize = paperSize;
        if (duplex) ptpOpts.side = 'duplex';

        console.log('[SPOOLER] Sending to physical printer via pdf-to-printer:', ptpOpts);
        await ptp.print(printableFilePath, ptpOpts);
        console.log('[SPOOLER] Spooler accepted job submission.');
      } else if (process.platform === 'win32') {
        const psCmd = `powershell -NoProfile -Command "Start-Process -FilePath '${printableFilePath.replace(/'/g, "''")}' -Verb PrintTo -ArgumentList '\"${printerName}\"' -PassThru | Wait-Process -Timeout 15"`;
        await new Promise((resolve) => {
          exec(psCmd, (err) => {
            if (err) console.warn('Native PrintTo note:', err.message);
            resolve();
          });
        });
      }

      // Step 4: REAL Spooler Queue Monitoring (DO NOT fake completion with timeout!)
      let jobDone = false;
      let checkAttempts = 0;
      const maxChecks = 35; // poll up to 35 seconds for hardware spool clearance

      while (!jobDone && checkAttempts < maxChecks) {
        await new Promise((r) => setTimeout(r, 1000));
        checkAttempts++;

        const currentHealth = await getRealPrinterStatus(printerName);

        // If printer disconnected or went into error during print:
        if (currentHealth.status === 'OFFLINE' || currentHealth.status === 'ERROR' || !currentHealth.isOnline) {
          console.warn(`[SPOOLER] Printer went ${currentHealth.status} during print of job ${jobId}`);
          await client.from('jobs').update({
            print_status: 'waiting_for_printer',
            failure_reason: `Printer disconnected during print: ${currentHealth.details}`,
          }).eq('id', jobId);

          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('job-status-updated', {
              jobId,
              status: 'waiting_for_printer',
              error: currentHealth.details,
            });
            mainWindow.webContents.send('printer-status-updated', {
              printer: printerName,
              ...currentHealth,
            });
          }
          return { success: false, error: `Printer went offline during printing: ${currentHealth.details}` };
        }

        // Job has cleared the Windows spooler queue and printer is ready
        if (currentHealth.jobCount === 0 && (currentHealth.status === 'READY' || currentHealth.status === 'PRINTING')) {
          jobDone = true;
        }
      }

      if (!jobDone) {
        console.warn(`[SPOOLER] Spool clearance timeout for Job ${jobId}. Printer has not confirmed completion.`);
        await client.from('jobs').update({
          print_status: 'waiting_for_printer',
          failure_reason: 'Print spool confirmation timed out. Printer may be busy or disconnected.',
        }).eq('id', jobId);

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('job-status-updated', {
            jobId,
            status: 'waiting_for_printer',
            error: 'Hardware confirmation timed out',
          });
        }
        return { success: false, error: 'Print spool confirmation timed out. Check printer paper and connection.' };
      }

      // Step 5: Mark print completed in database ONLY after verified physical spool clearance
      const completedAt = new Date().toISOString();
      const { error: updateErr } = await client
        .from('jobs')
        .update({
          print_status: 'completed',
          completed_at: completedAt,
        })
        .eq('id', jobId);

      if (updateErr) {
        console.error('[DB UPDATE] Failed to mark job completed in Supabase:', updateErr.message);
      } else {
        console.log(`[DB UPDATE] ✅ Job #${jobId} status updated to 'completed' in Supabase.`);
      }

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('job-status-updated', { jobId, status: 'completed', completedAt });
      }

      return { success: true };
    } catch (err) {
      console.error('[SPOOLER] Physical print spool error:', err.message);
      await client
        .from('jobs')
        .update({
          print_status: 'failed',
          failure_reason: err.message,
        })
        .eq('id', jobId);

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('job-status-updated', { jobId, status: 'failed', error: err.message });
      }

      return { success: false, error: err.message };
    } finally {
      activePrintingJobsCount = Math.max(0, activePrintingJobsCount - 1);
      if (pendingDeferredUpdateInstall && activePrintingJobsCount === 0) {
        console.log('[AUTO-UPDATER] All active prints completed. Triggering deferred update installation...');
        setTimeout(() => {
          executeSafeUpdateInstall();
        }, 1500);
      }
    }
  });

  // Jobs: Confirm Cash Payment & Release
  ipcMain.handle('jobs-confirm-cash', async (_e, jobId) => {
    const client = getSupabase();
    if (!client || !jobId) return { success: false, error: 'Missing client or jobId' };

    const now = new Date().toISOString();
    const { data: job, error: fetchErr } = await client.from('jobs').select('*').eq('id', jobId).single();
    if (fetchErr || !job) return { success: false, error: 'Job not found' };

    const { error: updateErr } = await client
      .from('jobs')
      .update({
        payment_status: 'paid',
        print_status: 'queued',
        queued_at: now,
      })
      .eq('id', jobId);

    if (updateErr) return { success: false, error: updateErr.message };

    try {
      await client.from('payments').insert({
        job_id: jobId,
        gateway_payment_id: `CASH_${Date.now()}`,
        gateway_order_id: `ORDER_${job.token_number}`,
        amount: job.price || 0,
        status: 'PAID_CASH',
        raw_response: { mode: 'cash_at_counter', confirmed_at: now },
      });
    } catch (e) {}

    return { success: true };
  });

  // Jobs: List
  ipcMain.handle('jobs-list', async () => {
    const client = getSupabase();
    const saved = readSavedSession();
    const shopId = saved?.shop?.id || appConfig.shopId;

    if (!client || !shopId) return [];

    try {
      const { data, error } = await client
        .from('jobs')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('Fetch jobs DB error:', error.message);
        return [];
      }

      const jobsMediaDir = getJobsMediaDir();
      const enrichedJobs = (data || []).map((job) => {
        const jobDir = path.join(jobsMediaDir, String(job.id));
        const hasLocalMedia =
          fs.existsSync(jobDir) &&
          fs.readdirSync(jobDir).some((f) => f.startsWith('original.'));
        const isCloudPurged = job.cloud_media_status === 'deleted';
        return {
          ...job,
          local_media_status: hasLocalMedia ? 'available' : (isCloudPurged && !job.file_url ? 'deleted' : 'pending_download'),
        };
      });

      // Background download and cloud storage purge for pending/queued jobs
      for (const job of data || []) {
        if (job.file_url && (job.print_status === 'queued' || job.print_status === 'pending')) {
          ensureLocalMedia(job).catch((err) =>
            console.warn('[STORAGE] Background pre-download/purge error:', err.message)
          );
        }
      }

      return enrichedJobs;
    } catch (e) {
      return [];
    }
  });

  // Jobs: Update Status
  ipcMain.handle('jobs-update-status', async (_e, { jobId, status }) => {
    const client = getSupabase();
    if (client && jobId && !jobId.startsWith('demo-')) {
      const print_status = status === 'pending' ? 'queued' : status;
      await client
        .from('jobs')
        .update({ print_status })
        .eq('id', jobId);
    }
    return { success: true };
  });

  // Shop: Toggle Pause / Resume Orders (Live intake)
  ipcMain.handle('shop-set-order-intake', async (_e, isAccepting) => {
    const client = getSupabase();
    const saved = readSavedSession();
    const shopId = saved?.shop?.id || appConfig.shopId;

    if (client && shopId) {
      try {
        const { data: existingShop } = await client.from('shops').select('price_config').eq('id', shopId).single();
        const prevConfig = existingShop?.price_config || {};
        const updatedConfig = {
          ...prevConfig,
          is_accepting_orders: isAccepting,
          orders_paused: !isAccepting,
        };

        await client.from('shops').update({ price_config: updatedConfig }).eq('id', shopId);

        if (saved?.shop) {
          saved.shop.price_config = updatedConfig;
          writeSavedSession(saved);
        }
        return { success: true, isAccepting };
      } catch (err) {
        console.warn('Failed to update shop order intake:', err.message);
        return { success: false, error: err.message };
      }
    }
    return { success: false, error: 'Shop not configured' };
  });

  // Printers: Live Health & Spooler Diagnostics
  ipcMain.handle('printers-get-health', async (_e, printerName) => {
    const target = printerName || appConfig.defaultPrinter || 'Microsoft Print to PDF';
    return await getRealPrinterStatus(target);
  });

  // Media: Get Local Media URL for High-Speed Direct Preview
  ipcMain.handle('media-get-url', async (_e, jobId) => {
    const jobsMediaDir = getJobsMediaDir();
    const jobDir = path.join(jobsMediaDir, String(jobId));
    if (fs.existsSync(jobDir)) {
      const files = fs.readdirSync(jobDir);
      const orig = files.find((f) => f.startsWith('original.'));
      if (orig) {
        const localPath = path.join(jobDir, orig);
        if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
          const fileData = fs.readFileSync(localPath);
          const ext = path.extname(orig).toLowerCase();
          let mime = 'application/pdf';
          if (ext === '.png') mime = 'image/png';
          else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
          else if (ext === '.webp') mime = 'image/webp';
          const base64 = fileData.toString('base64');
          return { available: true, dataUrl: `data:${mime};base64,${base64}`, ext };
        }
      }
    }
    return { available: false };
  });

  // Media: Download Original Media File (Desktop Save Dialog)
  ipcMain.handle('media-download', async (_e, { jobId, fileName }) => {
    const client = getSupabase();
    const jobsMediaDir = getJobsMediaDir();
    const jobDir = path.join(jobsMediaDir, String(jobId));

    let localFilePath = null;
    if (fs.existsSync(jobDir)) {
      const files = fs.readdirSync(jobDir);
      const orig = files.find((f) => f.startsWith('original.'));
      if (orig) {
        const p = path.join(jobDir, orig);
        if (fs.existsSync(p) && fs.statSync(p).size > 0) {
          localFilePath = p;
        }
      }
    }

    // Fallback: If not in local cache yet, attempt to download from remote if still available
    if (!localFilePath && client && jobId) {
      try {
        const { data: job } = await client.from('jobs').select('*').eq('id', jobId).single();
        if (job && job.local_media_status !== 'deleted' && job.file_url) {
          localFilePath = await ensureLocalMedia(job);
        }
      } catch (err) {
        console.warn('[MEDIA] Ensure media fallback error:', err.message);
      }
    }

    if (!localFilePath || !fs.existsSync(localFilePath)) {
      return { success: false, error: 'Media file is no longer available.' };
    }

    const ext = path.extname(localFilePath) || '.pdf';
    const cleanBase = (fileName || `Order_${jobId}`).replace(/[/\\?%*:|"<>]/g, '_');
    const defaultName = cleanBase.endsWith(ext) ? cleanBase : `${cleanBase}${ext}`;

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Customer Media File',
      defaultPath: path.join(app.getPath('downloads'), defaultName),
      filters: [
        { name: 'Original File', extensions: [ext.replace(/^\./, '')] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    try {
      fs.copyFileSync(localFilePath, filePath);
      return { success: true, savedPath: filePath };
    } catch (saveErr) {
      return { success: false, error: saveErr.message };
    }
  });

  // Media: Delete Local File for Completed Job
  ipcMain.handle('media-delete-local', async (_e, jobId) => {
    return await deleteLocalJobMedia(jobId);
  });

  // Media: Clear All Printed Local Media
  ipcMain.handle('media-clear-printed', async () => {
    return await clearAllPrintedLocalMedia();
  });

  // Media: Storage Disk Statistics
  ipcMain.handle('media-storage-stats', async () => {
    return getMediaStorageStats();
  });

  // Settings: Update Pricing (Full Authoritative Catalog Sync)
  ipcMain.handle('settings-update-pricing', async (_e, pricing) => {
    const client = getSupabase();
    const saved = readSavedSession();
    const shopId = saved?.shop?.id || appConfig.shopId;

    if (client && shopId) {
      try {
        const { data: existingShop } = await client.from('shops').select('price_config').eq('id', shopId).single();
        const prevConfig = existingShop?.price_config || {};

        const singleBw = Number(pricing.rateBwSingle ?? prevConfig.rateBwSingle ?? 2.0);
        const doubleBw = Number(pricing.rateBwDouble ?? prevConfig.rateBwDouble ?? 3.0);
        const singleColor = Number(pricing.rateColorSingle ?? prevConfig.rateColorSingle ?? 10.0);
        const doubleColor = Number(pricing.rateColorDouble ?? prevConfig.rateColorDouble ?? 18.0);

        const priceConfig = {
          ...prevConfig,
          currency: 'INR',
          currencySymbol: '₹',
          rates: {
            bw: singleBw,
            bw_single: singleBw,
            bw_double: doubleBw,
            color: singleColor,
            color_single: singleColor,
            color_double: doubleColor,
          },
          rateBwSingle: singleBw,
          rateBwDouble: doubleBw,
          rateColorSingle: singleColor,
          rateColorDouble: doubleColor,
          rateSpiralBinding: Number(pricing.rateSpiralBinding ?? prevConfig.rateSpiralBinding ?? 30.0),
          rateStapling: Number(pricing.rateStapling ?? prevConfig.rateStapling ?? 2.0),
          paperSizes: pricing.paperSizes || prevConfig.paperSizes || {
            a4: { name: 'A4', extra: 0.0, enabled: true },
            a3: { name: 'A3', extra: 4.0, enabled: true },
            a5: { name: 'A5', extra: 0.0, enabled: true },
            legal: { name: 'Legal', extra: 2.0, enabled: true },
            letter: { name: 'Letter', extra: 0.0, enabled: true },
            custom: { name: 'Custom / Legal', extra: 2.0, enabled: true },
            passport: { name: 'Passport (8×)', extra: 35.0, enabled: true },
          },
          paperTypes: pricing.paperTypes || prevConfig.paperTypes || {
            plain: { name: 'Plain Paper', extra: 0.0, enabled: true },
            bond: { name: 'Bond Paper', extra: 2.0, enabled: true },
            glossy: { name: 'Glossy Paper', extra: 10.0, enabled: true },
            photo_paper: { name: 'Photo Paper', extra: 12.0, enabled: true },
            matte: { name: 'Matte Photo Paper', extra: 8.0, enabled: true },
          },
          qualities: pricing.qualities || prevConfig.qualities || {
            normal: { name: 'Normal', extra: 0.0, enabled: true },
            high: { name: 'High', extra: 2.0, enabled: true },
            photo_grade: { name: 'Photo Grade', extra: 8.0, enabled: true },
          },
          photoSizes: pricing.photoSizes || prevConfig.photoSizes || {
            '4x6': { name: '4 × 6 inch', price: 15.0, enabled: true },
            '5x7': { name: '5 × 7 inch', price: 25.0, enabled: true },
            '6x8': { name: '6 × 8 inch', price: 35.0, enabled: true },
            passport: { name: 'Passport Photo', price: 35.0, enabled: true },
            a4_photo: { name: 'A4 Photo', price: 50.0, enabled: true },
          },
          photoPapers: pricing.photoPapers || prevConfig.photoPapers || {
            glossy: { name: 'Glossy', extra: 0.0, enabled: true },
            matte: { name: 'Matte', extra: 5.0, enabled: true },
            premium: { name: 'Premium Photo Paper', extra: 10.0, enabled: true },
          },
          photoQualities: pricing.photoQualities || prevConfig.photoQualities || {
            standard: { name: 'Standard', extra: 0.0, enabled: true },
            high: { name: 'High', extra: 5.0, enabled: true },
            photo_grade: { name: 'Photo Grade', extra: 10.0, enabled: true },
          },
        };

        await client
          .from('shops')
          .update({ price_config: priceConfig })
          .eq('id', shopId);

        if (saved?.shop) {
          saved.shop.price_config = priceConfig;
          writeSavedSession(saved);
        }
      } catch (e) {
        console.warn('Failed to update price_config in DB:', e.message);
      }
    }
    return { success: true };
  });

  // Settings: Get Config
  ipcMain.handle('settings-get-config', async () => {
    return { ...appConfig };
  });

  // Settings: Save Preferences
  ipcMain.handle('settings-save', async (_e, settings) => {
    if (typeof settings.autoLaunch === 'boolean') appConfig.autoLaunch = settings.autoLaunch;
    if (typeof settings.soundAlert === 'boolean') appConfig.soundAlert = settings.soundAlert;
    if (typeof settings.autoPrintDefault === 'boolean') appConfig.autoPrintEnabled = settings.autoPrintDefault;
    if (typeof settings.multiPrinterMode === 'boolean') appConfig.multiPrinterMode = settings.multiPrinterMode;
    if (settings.printerAssignmentMode) appConfig.printerAssignmentMode = settings.printerAssignmentMode;
    if (typeof settings.loadBalancing === 'boolean') appConfig.loadBalancing = settings.loadBalancing;
    if (settings.printersConfig) appConfig.printersConfig = settings.printersConfig;
    if (settings.shopName) appConfig.shopName = settings.shopName;
    if (settings.shopSlug) appConfig.shopSlug = settings.shopSlug;
    if (typeof settings.autoCheckUpdates === 'boolean') appConfig.autoCheckUpdates = settings.autoCheckUpdates;
    if (settings.updateChannel) {
      appConfig.updateChannel = settings.updateChannel;
      if (autoUpdater) {
        autoUpdater.allowPrerelease = settings.updateChannel === 'beta';
      }
    }

    saveConfig();

    if (typeof settings.autoLaunch === 'boolean') {
      updateAutoLaunch(settings.autoLaunch);
    }

    // Sync payment methods & shop attributes to Supabase
    const client = getSupabase();
    const saved = readSavedSession();
    const shopId = saved?.shop?.id || appConfig.shopId;

    if (client && shopId) {
      try {
        const { data: existingShop } = await client.from('shops').select('price_config').eq('id', shopId).single();
        const prevConfig = existingShop?.price_config || {};
        const updatedConfig = { ...prevConfig };

        if (settings.paymentMethods) {
          updatedConfig.payment_methods = settings.paymentMethods;
        }

        const shopUpdate = { price_config: updatedConfig };
        if (settings.shopName) shopUpdate.name = settings.shopName;
        if (settings.shopSlug) shopUpdate.qr_code_slug = settings.shopSlug;

        await client.from('shops').update(shopUpdate).eq('id', shopId);

        if (saved?.shop) {
          saved.shop.name = settings.shopName || saved.shop.name;
          saved.shop.qr_code_slug = settings.shopSlug || saved.shop.qr_code_slug;
          saved.shop.price_config = updatedConfig;
          writeSavedSession(saved);
        }
      } catch (err) {
        console.warn('Could not sync settings to Supabase:', err.message);
      }
    }

    return { success: true, config: { ...appConfig } };
  });
}

// App lifecycle
app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
  createTray();
  startPrinterMonitoring();
  initAutoUpdater();

  // Background update check after startup (Requirement 7)
  if (appConfig.autoCheckUpdates !== false && autoUpdater) {
    setTimeout(() => {
      try {
        autoUpdater.checkForUpdates().catch((err) => {
          console.warn('[AUTO-UPDATER] Background check warning (local printing unaffected):', err.message);
        });
      } catch (e) {}
    }, 15000);
  }

  const saved = readSavedSession();
  if (saved?.shop?.id) {
    setupRealtimeJobs(saved.shop.id);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (printerMonitorTimer) {
    clearInterval(printerMonitorTimer);
    printerMonitorTimer = null;
  }
  const client = getSupabase();
  if (realtimeChannel && client) {
    try {
      client.removeChannel(realtimeChannel);
    } catch (e) {}
    realtimeChannel = null;
  }
  if (tray && !tray.isDestroyed()) {
    try {
      tray.destroy();
    } catch (e) {}
    tray = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
