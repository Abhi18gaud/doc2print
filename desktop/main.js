const { app, BrowserWindow, Tray, Menu, Notification, nativeImage, ipcMain, shell } = require('electron');
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
  app.quit();
}

const { createClient } = require('@supabase/supabase-js');
let QRCode = null;
try {
  QRCode = require('qrcode');
} catch (e) {
  console.warn('qrcode package load note:', e.message);
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
function getWindowsPrinters() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve(['Virtual Spooler']);
    }
    const cmd = 'powershell -NoProfile -Command "Get-Printer | Select-Object -ExpandProperty Name"';
    exec(cmd, (err, stdout) => {
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

  // Minimize to tray on close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (Notification.isSupported()) {
        new Notification({
          title: 'QuickPrint Counter OS Running in Tray',
          body: 'Your live counter spooler is active and receiving orders in the background.',
        }).show();
      }
    }
    return false;
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
          width: 260,
          margin: 2,
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
    return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=4&data=${encodeURIComponent(text)}`;
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

  // Jobs: Print Job (Direct Physical Spooler Pipeline)
  ipcMain.handle('jobs-print', async (_e, { jobId, options = {} }) => {
    console.log('[SPOOLER] Processing print job request:', jobId, options);
    const client = getSupabase();
    if (!client || !jobId) return { success: false, error: 'Database client or Job ID missing' };

    // Fetch full job record
    const { data: job, error: fetchErr } = await client.from('jobs').select('*').eq('id', jobId).single();
    if (fetchErr || !job) {
      return { success: false, error: fetchErr?.message || 'Job not found in database' };
    }

    // Step 1: Update status to 'printing'
    await client.from('jobs').update({ print_status: 'printing' }).eq('id', jobId);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('job-status-updated', { jobId, status: 'printing' });
    }

    try {
      const printerName = options.printerName || appConfig.defaultPrinter || 'Microsoft Print to PDF';
      const fileUrl = options.fileUrl || job.file_url;
      const copies = Math.max(1, Number(options.copies || job.copies || 1));
      const rawPaper = options.paperSize || job.paper_size || 'A4';
      const paperSize = rawPaper.split(' + ')[0].toUpperCase();
      const duplex = options.duplex ?? job.duplex ?? false;

      if (!fileUrl) {
        throw new Error('No printable document file URL associated with this order');
      }

      // Download file to temp spool directory
      const tempDir = path.join(os.tmpdir(), 'quickprint_spool');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const ext = (job.file_name || 'doc').split('.').pop() || 'pdf';
      const tempFilePath = path.join(tempDir, `job_${job.token_number || Date.now()}_${Date.now()}.${ext}`);

      await downloadRemoteFile(fileUrl, tempFilePath);
      console.log(`[SPOOLER] Spool file downloaded: ${tempFilePath}`);

      let printableFilePath = tempFilePath;
      const cleanExt = ext.toLowerCase();

      // Convert images (jpg, png, etc.) to standard A4 PDF for native physical spooling
      if (['jpg', 'jpeg', 'png'].includes(cleanExt)) {
        try {
          const { PDFDocument } = require('pdf-lib');
          const imageBytes = fs.readFileSync(tempFilePath);
          const pdfDoc = await PDFDocument.create();
          let embeddedImage;
          if (cleanExt === 'png') {
            embeddedImage = await pdfDoc.embedPng(imageBytes);
          } else {
            embeddedImage = await pdfDoc.embedJpg(imageBytes);
          }
          // A4 dimensions in points: 595.28 x 841.89
          const a4Width = 595.28;
          const a4Height = 841.89;
          const page = pdfDoc.addPage([a4Width, a4Height]);
          const margin = 36; // 0.5 inch margins
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

          const convertedPdfPath = path.join(tempDir, `print_${Date.now()}.pdf`);
          const pdfBytes = await pdfDoc.save();
          fs.writeFileSync(convertedPdfPath, pdfBytes);
          printableFilePath = convertedPdfPath;
          console.log(`[SPOOLER] Converted ${cleanExt} image to printable PDF: ${printableFilePath}`);
        } catch (imgErr) {
          console.warn('[SPOOLER] Image to PDF conversion fallback:', imgErr.message);
        }
      }

      // Page-by-page / Selective page reprint support
      if ((options.pageRange || options.pages) && printableFilePath.toLowerCase().endsWith('.pdf')) {
        try {
          const { PDFDocument } = require('pdf-lib');
          const sourceBytes = fs.readFileSync(printableFilePath);
          const srcDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
          const totalSrcPages = srcDoc.getPageCount();

          let targetIndices = [];
          if (Array.isArray(options.pages)) {
            targetIndices = options.pages.map((p) => Number(p) - 1);
          } else if (typeof options.pageRange === 'string') {
            const rawRange = options.pageRange.trim();
            if (rawRange.endsWith('-')) {
              // e.g. "3-" means page 3 to end
              const start = parseInt(rawRange.slice(0, -1), 10);
              for (let i = start; i <= totalSrcPages; i++) {
                targetIndices.push(i - 1);
              }
            } else if (rawRange.includes('-')) {
              // e.g. "3-5"
              const [start, end] = rawRange.split('-').map(Number);
              for (let i = start; i <= end; i++) {
                targetIndices.push(i - 1);
              }
            } else {
              // e.g. "3"
              const single = parseInt(rawRange, 10);
              if (!isNaN(single)) targetIndices.push(single - 1);
            }
          }

          // Filter valid indices
          targetIndices = targetIndices.filter((idx) => idx >= 0 && idx < totalSrcPages);

          if (targetIndices.length > 0) {
            const slicedDoc = await PDFDocument.create();
            const copied = await slicedDoc.copyPages(srcDoc, targetIndices);
            copied.forEach((p) => slicedDoc.addPage(p));
            const slicedBytes = await slicedDoc.save();

            const slicedFilePath = path.join(tempDir, `sliced_${Date.now()}.pdf`);
            fs.writeFileSync(slicedFilePath, slicedBytes);
            printableFilePath = slicedFilePath;
            console.log(`[SPOOLER] Sliced PDF to target pages (${targetIndices.map((i) => i + 1).join(', ')}): ${printableFilePath}`);
          }
        } catch (sliceErr) {
          console.warn('[SPOOLER] Page range slicing note:', sliceErr.message);
        }
      }

      // Spool to Windows printer via pdf-to-printer
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
        console.log('[SPOOLER] Spooler accepted job successfully.');
      } else if (process.platform === 'win32') {
        const psCmd = `powershell -NoProfile -Command "Start-Process -FilePath '${printableFilePath.replace(/'/g, "''")}' -Verb PrintTo -ArgumentList '\"${printerName}\"' -PassThru | Wait-Process -Timeout 15"`;
        await new Promise((resolve) => {
          exec(psCmd, (err) => {
            if (err) console.warn('Native PrintTo note:', err.message);
            resolve();
          });
        });
      }

      // Clean up temp files safely
      setTimeout(() => {
        try { fs.unlinkSync(tempFilePath); } catch (e) {}
        if (printableFilePath !== tempFilePath) {
          try { fs.unlinkSync(printableFilePath); } catch (e) {}
        }
      }, 8000);

      // Step 2: Mark print completed in database
      const completedAt = new Date().toISOString();
      await client
        .from('jobs')
        .update({
          print_status: 'completed',
          completed_at: completedAt,
        })
        .eq('id', jobId);

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
      return data || [];
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

  // Settings: Update Pricing
  ipcMain.handle('settings-update-pricing', async (_e, pricing) => {
    const client = getSupabase();
    const saved = readSavedSession();
    const shopId = saved?.shop?.id || appConfig.shopId;

    if (client && shopId) {
      try {
        const { data: existingShop } = await client.from('shops').select('price_config').eq('id', shopId).single();
        const prevConfig = existingShop?.price_config || {};

        const singleBw = Number(pricing.rateBwSingle || 2.0);
        const doubleBw = Number(pricing.rateBwDouble || 3.0);
        const singleColor = Number(pricing.rateColorSingle || 10.0);
        const doubleColor = Number(pricing.rateColorDouble || 18.0);

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
          rateSpiralBinding: Number(pricing.rateSpiralBinding || 30.0),
          rateStapling: Number(pricing.rateStapling || 2.0),
          paperSizes: pricing.paperSizes || prevConfig.paperSizes || {
            a4: { name: 'A4', extra: 0.0, description: 'Standard 75 GSM' },
            a3: { name: 'A3', extra: 4.0, description: 'Large Sheet' },
            passport: { name: 'Passport (8×)', extra: 35.0, description: 'Glossy Sheet' },
            custom: { name: 'Custom / Legal', extra: 2.0, description: 'Legal/Bond' },
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
    if (settings.shopName) appConfig.shopName = settings.shopName;
    if (settings.shopSlug) appConfig.shopSlug = settings.shopSlug;

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

  const saved = readSavedSession();
  if (saved?.shop?.id) {
    setupRealtimeJobs(saved.shop.id);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform === 'darwin') {
    app.quit();
  }
});
