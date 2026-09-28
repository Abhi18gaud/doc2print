/**
 * QuickPrint Counter OS — Industrial White Desktop Client Application Logic
 */

(function () {
  'use strict';

  // --- STATE ---
  let currentShop = null;
  let currentOwner = null;
  let activeJobs = [];
  let availablePrinters = [];
  let defaultPrinterName = '';
  let autoPrintEnabled = true;
  let ordersPaused = false;
  let currentFilter = 'all';
  const expandedJobs = new Set();
  const jobPagesStatus = {};

  // --- DOM REFS ---
  const appShell = document.getElementById('appShell');
  const authOverlay = document.getElementById('authOverlay');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');
  const loginError = document.getElementById('loginError');
  const regError = document.getElementById('regError');

  // Titlebar controls
  const winMinimize = document.getElementById('winMinimize');
  const winMaximize = document.getElementById('winMaximize');
  const winClose = document.getElementById('winClose');
  const shopStatusIndicator = document.getElementById('shopStatusIndicator');
  const shopStatusText = document.getElementById('shopStatusText');
  const topPrinterName = document.getElementById('topPrinterName');
  const btnAutoPrintState = document.getElementById('btnAutoPrintState');
  const btnShowCounterQR = document.getElementById('btnShowCounterQR');

  // Sidebar elements
  const shopNameDisplay = document.getElementById('shopNameDisplay');
  const shopSlugDisplay = document.getElementById('shopSlugDisplay');
  const shopAvatar = document.getElementById('shopAvatar');
  const ownerEmailDisplay = document.getElementById('ownerEmailDisplay');
  const ownerInitial = document.getElementById('ownerInitial');
  const queueBadge = document.getElementById('queueBadge');
  const btnLogout = document.getElementById('btnLogout');
  const navItems = document.querySelectorAll('.nav-item');
  const contentViews = document.querySelectorAll('.content-view');

  // View: Queue
  const kpiRevenue = document.getElementById('kpiRevenue');
  const kpiQueueCount = document.getElementById('kpiQueueCount');
  const kpiQueueSub = document.getElementById('kpiQueueSub');
  const kpiPagesPrinted = document.getElementById('kpiPagesPrinted');
  const kpiSpoolerState = document.getElementById('kpiSpoolerState');
  const kpiDefaultPrinterSub = document.getElementById('kpiDefaultPrinterSub');
  const queueCardsList = document.getElementById('queueCardsList');
  const emptyQueueState = document.getElementById('emptyQueueState');
  const filterPills = document.querySelectorAll('.filter-pill');
  const btnRefreshQueue = document.getElementById('btnRefreshQueue');
  const btnPauseOrders = document.getElementById('btnPauseOrders');
  const btnPauseOrdersText = document.getElementById('btnPauseOrdersText');
  const btnPrintAllPending = document.getElementById('btnPrintAllPending');
  const btnSimulateOrder = document.getElementById('btnSimulateOrder');

  // Filters counts
  const filterAllCount = document.getElementById('filterAllCount');
  const filterPendingCount = document.getElementById('filterPendingCount');
  const filterPaidCount = document.getElementById('filterPaidCount');
  const filterCashCount = document.getElementById('filterCashCount');

  // View: History
  const historyTableBody = document.getElementById('historyTableBody');
  const historySearchInput = document.getElementById('historySearchInput');
  const btnExportJobs = document.getElementById('btnExportJobs');

  // View: Printers
  const printersGrid = document.getElementById('printersGrid');
  const btnScanPrinters = document.getElementById('btnScanPrinters');
  const testPrinterSelect = document.getElementById('testPrinterSelect');
  const btnSendTestPrint = document.getElementById('btnSendTestPrint');

  // View: Financials
  const finTotalRevenue = document.getElementById('finTotalRevenue');
  const finUpiRevenue = document.getElementById('finUpiRevenue');
  const finCashRevenue = document.getElementById('finCashRevenue');
  const finPaperConsumed = document.getElementById('finPaperConsumed');
  const finBwPages = document.getElementById('finBwPages');
  const finColorPages = document.getElementById('finColorPages');
  const finDuplexSheets = document.getElementById('finDuplexSheets');
  const finSingleSheets = document.getElementById('finSingleSheets');
  const btnRefreshEarnings = document.getElementById('btnRefreshEarnings');

  // View: Pricing
  const rateBwSingle = document.getElementById('rateBwSingle');
  const rateBwDouble = document.getElementById('rateBwDouble');
  const rateColorSingle = document.getElementById('rateColorSingle');
  const rateColorDouble = document.getElementById('rateColorDouble');
  const rateSpiralBinding = document.getElementById('rateSpiralBinding');
  const rateStapling = document.getElementById('rateStapling');
  const ratePaperA3 = document.getElementById('ratePaperA3');
  const ratePaperLegal = document.getElementById('ratePaperLegal');
  const ratePaperPassport = document.getElementById('ratePaperPassport');
  const btnSavePricing = document.getElementById('btnSavePricing');

  // View: Settings
  const cfgAutoLaunch = document.getElementById('cfgAutoLaunch');
  const cfgSoundAlert = document.getElementById('cfgSoundAlert');
  const cfgAutoPrintDefault = document.getElementById('cfgAutoPrintDefault');
  const cfgShopName = document.getElementById('cfgShopName');
  const cfgShopSlug = document.getElementById('cfgShopSlug');
  const cfgDomainPrefix = document.getElementById('cfgDomainPrefix');
  const cfgEnableUpi = document.getElementById('cfgEnableUpi');
  const cfgEnableCash = document.getElementById('cfgEnableCash');
  const cfgPlanTitle = document.getElementById('cfgPlanTitle');
  const cfgPlanDesc = document.getElementById('cfgPlanDesc');
  const cfgPlanBadge = document.getElementById('cfgPlanBadge');
  const btnSaveSettings = document.getElementById('btnSaveSettings');

  // View: Settings -> Software Updates (Requirements 7, 8, 9, 22)
  const lblInstalledVersion = document.getElementById('lblInstalledVersion');
  const btnCheckForUpdates = document.getElementById('btnCheckForUpdates');
  const cfgAutoCheckUpdates = document.getElementById('cfgAutoCheckUpdates');
  const cfgUpdateChannel = document.getElementById('cfgUpdateChannel');
  const updateStatusBadge = document.getElementById('updateStatusBadge');
  const updateActionPanel = document.getElementById('updateActionPanel');
  const updatePanelTitle = document.getElementById('updatePanelTitle');
  const updatePanelSubtitle = document.getElementById('updatePanelSubtitle');
  const btnUpdateDownload = document.getElementById('btnUpdateDownload');
  const btnUpdateInstall = document.getElementById('btnUpdateInstall');
  const updateProgressBarContainer = document.getElementById('updateProgressBarContainer');
  const updateProgressBarFill = document.getElementById('updateProgressBarFill');
  const updateProgressLabel = document.getElementById('updateProgressLabel');
  const updateProgressSpeed = document.getElementById('updateProgressSpeed');
  const updatePrintNotice = document.getElementById('updatePrintNotice');
  const updateToastBanner = document.getElementById('updateToastBanner');
  const toastCurVer = document.getElementById('toastCurVer');
  const toastNewVer = document.getElementById('toastNewVer');
  const btnToastUpdateNow = document.getElementById('btnToastUpdateNow');
  const btnToastDismiss = document.getElementById('btnToastDismiss');

  let currentAppUrl = 'https://doc2print.vercel.app';

  function getCleanDomain(url) {
    try {
      return new URL(url || currentAppUrl).host;
    } catch (e) {
      return 'doc2print.vercel.app';
    }
  }

  // Modals & Standee QR
  const qrModal = document.getElementById('qrModal');
  const btnCloseQrModal = document.getElementById('btnCloseQrModal');
  const btnCopyKioskUrl = document.getElementById('btnCopyKioskUrl');
  const btnPrintStandee = document.getElementById('btnPrintStandee');
  const btnDownloadQrSvg = document.getElementById('btnDownloadQrSvg');
  const btnDownloadQrPng = document.getElementById('btnDownloadQrPng');
  const qrUrlBadge = document.getElementById('qrUrlBadge');
  const standeeShopNameDisplay = document.getElementById('standeeShopNameDisplay');

  // Advanced Preview Modal
  const previewModal = document.getElementById('previewModal');
  const btnClosePreviewModal = document.getElementById('btnClosePreviewModal');
  const previewTitle = document.getElementById('previewTitle');
  const previewModeTag = document.getElementById('previewModeTag');
  const previewOrientationPill = document.getElementById('previewOrientationPill');
  const previewIframe = document.getElementById('previewIframe');
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const paperSheet = document.getElementById('paperSheet');
  const previewImg = document.getElementById('previewImg');
  const paperWatermarkText = document.getElementById('paperWatermarkText');
  const previewDeletedNotice = document.getElementById('previewDeletedNotice');
  const previewFileName = document.getElementById('previewFileName');
  const previewSpecs = document.getElementById('previewSpecs');
  const btnPreviewDownload = document.getElementById('btnPreviewDownload');
  const btnPreviewPrintNow = document.getElementById('btnPreviewPrintNow');

  // Printer Config Modal
  const printerConfigModal = document.getElementById('printerConfigModal');
  const btnClosePrinterConfigModal = document.getElementById('btnClosePrinterConfigModal');
  const cfgModalPrinterTitle = document.getElementById('cfgModalPrinterTitle');
  const cfgModalPrinterSub = document.getElementById('cfgModalPrinterSub');
  const cfgPrinterCustomName = document.getElementById('cfgPrinterCustomName');
  const cfgPrinterType = document.getElementById('cfgPrinterType');
  const cfgPrinterPriority = document.getElementById('cfgPrinterPriority');
  const cfgPrinterRoutingEnabled = document.getElementById('cfgPrinterRoutingEnabled');
  const btnAutoDetectPrinterCaps = document.getElementById('btnAutoDetectPrinterCaps');
  const btnCancelPrinterConfig = document.getElementById('btnCancelPrinterConfig');
  const btnSavePrinterConfig = document.getElementById('btnSavePrinterConfig');

  // Settings: Multi-Printer Management
  const cfgMultiPrinterMode = document.getElementById('cfgMultiPrinterMode');
  const cfgPrinterAssignmentMode = document.getElementById('cfgPrinterAssignmentMode');
  const cfgLoadBalancing = document.getElementById('cfgLoadBalancing');
  const multiPrinterSubSettings = document.getElementById('multiPrinterSubSettings');
  const multiPrinterModeBadge = document.getElementById('multiPrinterModeBadge');
  const multiPrinterQueueSummary = document.getElementById('multiPrinterQueueSummary');
  const multiPrinterSummaryPills = document.getElementById('multiPrinterSummaryPills');
  const btnManagePrintersShortcut = document.getElementById('btnManagePrintersShortcut');

  let activePreviewJob = null;
  let activeEditingPrinterName = null;
  let multiPrinterConfig = {
    multiPrinterMode: false,
    printerAssignmentMode: 'auto',
    loadBalancing: true,
    printersConfig: {},
  };

  // --- HELPER: TOAST NOTIFICATIONS ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 200);
    }, 3200);
  }

  // --- WINDOW CONTROLS ---
  if (winMinimize) winMinimize.addEventListener('click', () => window.quickprintApi?.windowControl('minimize'));
  if (winMaximize) winMaximize.addEventListener('click', () => window.quickprintApi?.windowControl('maximize'));
  if (winClose) winClose.addEventListener('click', () => window.quickprintApi?.windowControl('close'));

  // --- NAVIGATION SWITCHER ---
  navItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      navItems.forEach((n) => n.classList.remove('active'));
      contentViews.forEach((v) => v.classList.remove('active'));

      btn.classList.add('active');
      const target = document.getElementById(`view-${view}`);
      if (target) target.classList.add('active');

      if (view === 'history') renderHistoryTable();
      if (view === 'printers') scanPrinters();
      if (view === 'financials') updateFinancials();
    });
  });

  // --- AUTH TABS ---
  tabLoginBtn.addEventListener('click', () => {
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
  });

  tabRegisterBtn.addEventListener('click', () => {
    tabRegisterBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
  });

  // --- AUTH SUBMIT: LOGIN ---
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    const btn = document.getElementById('btnLoginSubmit');
    btn.disabled = true;
    btn.textContent = 'Authenticating...';

    try {
      const res = await window.quickprintApi.login(email, password);
      if (res.success) {
        authOverlay.classList.add('hidden');
        showToast('Signed in successfully!', 'success');
        await loadSession();
      } else {
        loginError.textContent = res.error || 'Invalid credentials.';
        loginError.style.display = 'block';
      }
    } catch (err) {
      loginError.textContent = err.message || 'Connection error.';
      loginError.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In to Counter OS';
    }
  });

  // --- AUTH SUBMIT: REGISTER ---
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    regError.style.display = 'none';
    const shopName = document.getElementById('regShopName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;

    const btn = document.getElementById('btnRegisterSubmit');
    btn.disabled = true;
    btn.textContent = 'Creating Shop Account...';

    try {
      const res = await window.quickprintApi.signup(email, password, shopName, phone);
      if (res.success) {
        authOverlay.classList.add('hidden');
        showToast('Shop account created successfully!', 'success');
        await loadSession();
      } else {
        regError.textContent = res.error || 'Registration failed.';
        regError.style.display = 'block';
      }
    } catch (err) {
      regError.textContent = err.message || 'Registration error.';
      regError.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Account & Register Shop';
    }
  });

  // --- LOGOUT ---
  btnLogout.addEventListener('click', async () => {
    if (confirm('Are you sure you want to sign out from this counter terminal?')) {
      await window.quickprintApi.logout();
      authOverlay.classList.remove('hidden');
      showToast('Logged out.', 'info');
    }
  });

  // --- INITIALIZE SESSION ---
  async function loadSession() {
    try {
      const session = await window.quickprintApi.getSession();
      if (!session || !session.user) {
        authOverlay.classList.remove('hidden');
        return;
      }

      currentOwner = session.user;
      currentShop = session.shop || {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'QuickPrint Demo Counter',
        slug: 'counter',
        settings: {
          rateBwSingle: 2.0,
          rateBwDouble: 3.0,
          rateColorSingle: 10.0,
          rateColorDouble: 18.0,
          rateSpiralBinding: 30.0,
          rateStapling: 2.0,
        },
      };

      authOverlay.classList.add('hidden');

      // Fetch appConfig for cloud app URL
      try {
        if (window.quickprintApi?.getConfig) {
          const cfg = await window.quickprintApi.getConfig();
          if (cfg?.appUrl) {
            currentAppUrl = cfg.appUrl.replace(/\/+$/, '');
          }
        }
      } catch (cfgErr) {
        console.warn('Could not read app config:', cfgErr);
      }

      // Normalize shop slug
      const shopSlug = currentShop.qr_code_slug || currentShop.slug || 'counter';
      currentShop.slug = shopSlug;
      currentShop.qr_code_slug = shopSlug;

      const cleanDomain = getCleanDomain(currentAppUrl);

      // Update UI with shop data
      shopNameDisplay.textContent = currentShop.name;
      shopSlugDisplay.textContent = `${cleanDomain}/kiosk/${shopSlug}`;
      shopAvatar.textContent = currentShop.name.substring(0, 2).toUpperCase();
      ownerEmailDisplay.textContent = currentOwner.email;
      ownerInitial.textContent = currentOwner.email.charAt(0).toUpperCase();

      cfgShopName.value = currentShop.name;
      cfgShopSlug.value = shopSlug;
      if (cfgDomainPrefix) cfgDomainPrefix.textContent = `${cleanDomain}/kiosk/`;

      await renderShopQrAndUrls();

      // Populate subscription info (Separation of Shop Subscription vs Customer Orders)
      if (session.subscription) {
        const sub = session.subscription;
        const planName = (sub.plan || 'trial').toUpperCase();
        if (cfgPlanTitle) cfgPlanTitle.textContent = `${planName} LICENSE`;
        if (cfgPlanBadge) {
          cfgPlanBadge.textContent = (sub.status || 'ACTIVE').toUpperCase();
          cfgPlanBadge.className = `badge-chip ${sub.status === 'active' || sub.status === 'trial' ? 'green' : 'red'}`;
        }
        if (cfgPlanDesc) {
          if (sub.status === 'trial' && sub.trial_ends_at) {
            const daysLeft = Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
            cfgPlanDesc.textContent = `14-Day Free Trial • ${daysLeft} days remaining • Full Windows Spooler Access`;
          } else {
            cfgPlanDesc.textContent = `Active QuickPrint Counter OS License • Status: ${sub.status || 'active'}`;
          }
        }
      }

      // Pricing values (Full Authoritative Catalog Sync)
      const pricing = currentShop.price_config || currentShop.settings || {};
      const rates = pricing.rates || {};
      if (rateBwSingle) rateBwSingle.value = rates.bw_single ?? rates.bw ?? pricing.rateBwSingle ?? 2;
      if (rateBwDouble) rateBwDouble.value = rates.bw_double ?? pricing.rateBwDouble ?? (rates.bw ? rates.bw * 1.5 : 3);
      if (rateColorSingle) rateColorSingle.value = rates.color_single ?? rates.color ?? pricing.rateColorSingle ?? 10;
      if (rateColorDouble) rateColorDouble.value = rates.color_double ?? pricing.rateColorDouble ?? (rates.color ? rates.color * 1.8 : 18);
      if (rateSpiralBinding) rateSpiralBinding.value = pricing.rateSpiralBinding ?? 30;
      if (rateStapling) rateStapling.value = pricing.rateStapling ?? 2;

      // Document paper sizes
      const paperSizes = pricing.paperSizes || {};
      const elA3 = document.getElementById('ratePaperA3');
      const elLegal = document.getElementById('ratePaperLegal');
      const elA5 = document.getElementById('ratePaperA5');
      if (elA3) elA3.value = paperSizes.a3?.extra ?? 4.0;
      if (elLegal) elLegal.value = paperSizes.legal?.extra ?? paperSizes.custom?.extra ?? 2.0;
      if (elA5) elA5.value = paperSizes.a5?.extra ?? 0.0;

      // Document paper types
      const paperTypes = pricing.paperTypes || {};
      const elBond = document.getElementById('rateTypeBond');
      const elGlossy = document.getElementById('rateTypeGlossy');
      const elMatte = document.getElementById('rateTypeMatte');
      if (elBond) elBond.value = paperTypes.bond?.extra ?? 2.0;
      if (elGlossy) elGlossy.value = paperTypes.glossy?.extra ?? 10.0;
      if (elMatte) elMatte.value = paperTypes.matte?.extra ?? 8.0;

      // Document qualities
      const qualities = pricing.qualities || {};
      const elQHigh = document.getElementById('rateQualityHigh');
      const elQPhoto = document.getElementById('rateQualityPhotoGrade');
      if (elQHigh) elQHigh.value = qualities.high?.extra ?? 2.0;
      if (elQPhoto) elQPhoto.value = qualities.photo_grade?.extra ?? 8.0;

      // Photo printing rates
      const photoSizes = pricing.photoSizes || {};
      const elP4x6 = document.getElementById('ratePhoto4x6');
      const elP5x7 = document.getElementById('ratePhoto5x7');
      const elP6x8 = document.getElementById('ratePhoto6x8');
      const elPPassport = document.getElementById('ratePhotoPassport');
      const elPA4 = document.getElementById('ratePhotoA4');
      if (elP4x6) elP4x6.value = photoSizes['4x6']?.price ?? 15.0;
      if (elP5x7) elP5x7.value = photoSizes['5x7']?.price ?? 25.0;
      if (elP6x8) elP6x8.value = photoSizes['6x8']?.price ?? 35.0;
      if (elPPassport) elPPassport.value = photoSizes.passport?.price ?? 35.0;
      if (elPA4) elPA4.value = photoSizes.a4_photo?.price ?? 50.0;

      const photoPapers = pricing.photoPapers || {};
      const elPPMatte = document.getElementById('ratePhotoPaperMatte');
      const elPPPremium = document.getElementById('ratePhotoPaperPremium');
      if (elPPMatte) elPPMatte.value = photoPapers.matte?.extra ?? 5.0;
      if (elPPPremium) elPPPremium.value = photoPapers.premium?.extra ?? 10.0;

      const photoQualities = pricing.photoQualities || {};
      const elPQHigh = document.getElementById('ratePhotoQualityHigh');
      const elPQStudio = document.getElementById('ratePhotoQualityStudio');
      if (elPQHigh) elPQHigh.value = photoQualities.high?.extra ?? 5.0;
      if (elPQStudio) elPQStudio.value = photoQualities.photo_grade?.extra ?? 10.0;

      // Payment methods configuration
      const payMethods = pricing.payment_methods || { enable_upi: true, enable_cash: true };
      if (cfgEnableUpi) cfgEnableUpi.checked = payMethods.enable_upi !== false;
      if (cfgEnableCash) cfgEnableCash.checked = payMethods.enable_cash !== false;

      // Live Shop Availability: Accepting Orders vs Paused
      ordersPaused = pricing.is_accepting_orders === false || pricing.orders_paused === true;
      if (ordersPaused) {
        shopStatusIndicator.classList.add('paused');
        shopStatusText.textContent = 'Orders Paused (Counter Busy)';
        btnPauseOrdersText.textContent = '▶️ Resume Orders';
      } else {
        shopStatusIndicator.classList.remove('paused');
        shopStatusText.textContent = 'Live — Accepting Orders';
        btnPauseOrdersText.textContent = '⏸️ Pause Orders';
      }

      // Read local preferences (auto-print, sound, auto-launch)
      try {
        const localCfg = await window.quickprintApi.getConfig();
        if (localCfg) {
          if (localCfg.autoPrintDefault !== undefined) {
            autoPrintEnabled = Boolean(localCfg.autoPrintDefault);
            if (cfgAutoPrintDefault) cfgAutoPrintDefault.checked = autoPrintEnabled;
          }
          if (localCfg.soundAlert !== undefined && cfgSoundAlert) {
            cfgSoundAlert.checked = Boolean(localCfg.soundAlert);
          }
          if (localCfg.autoLaunch !== undefined && cfgAutoLaunch) {
            cfgAutoLaunch.checked = Boolean(localCfg.autoLaunch);
          }
          if (localCfg.autoCheckUpdates !== undefined && cfgAutoCheckUpdates) {
            cfgAutoCheckUpdates.checked = localCfg.autoCheckUpdates !== false;
          }
          if (localCfg.updateChannel && cfgUpdateChannel) {
            cfgUpdateChannel.value = localCfg.updateChannel;
          }
        }
      } catch (e) {}

      // Authoritative Single Source of Truth Version (Requirement 1, 12, 22)
      const installedVer = window.quickprintApi?.version || '2.4.0';
      if (lblInstalledVersion) lblInstalledVersion.textContent = installedVer;
      if (toastCurVer) toastCurVer.textContent = installedVer;

      // Query initial update state
      if (window.quickprintApi?.getUpdateStatus) {
        window.quickprintApi.getUpdateStatus().then((st) => applyUpdateStatusUI(st)).catch(() => {});
      }

      btnAutoPrintState.classList.toggle('active', autoPrintEnabled);
      btnAutoPrintState.textContent = autoPrintEnabled ? 'ON' : 'OFF';

      // Load multi-printer configuration and routing profiles
      await loadMultiPrinterSettings();

      // Scan printers and load initial jobs
      await scanPrinters();
      await fetchJobs();
    } catch (err) {
      console.error('Session load error:', err);
      authOverlay.classList.remove('hidden');
    }
  }

  // --- MULTI-PRINTER ENGINE HELPERS ---
  async function loadMultiPrinterSettings() {
    try {
      if (window.quickprintApi?.getMultiPrinterConfig) {
        const cfg = await window.quickprintApi.getMultiPrinterConfig();
        if (cfg) {
          multiPrinterConfig = {
            multiPrinterMode: Boolean(cfg.multiPrinterMode),
            printerAssignmentMode: cfg.printerAssignmentMode || 'auto',
            loadBalancing: cfg.loadBalancing !== false,
            printersConfig: cfg.printersConfig || {},
          };
          applyMultiPrinterUIState();
        }
      }
    } catch (e) {
      console.warn('Could not load multi-printer config:', e);
    }
  }

  function applyMultiPrinterUIState() {
    const isMulti = Boolean(multiPrinterConfig.multiPrinterMode);
    if (cfgMultiPrinterMode) cfgMultiPrinterMode.checked = isMulti;
    if (cfgPrinterAssignmentMode) cfgPrinterAssignmentMode.value = multiPrinterConfig.printerAssignmentMode || 'auto';
    if (cfgLoadBalancing) cfgLoadBalancing.checked = multiPrinterConfig.loadBalancing !== false;

    if (multiPrinterSubSettings) {
      multiPrinterSubSettings.style.display = isMulti ? 'flex' : 'none';
    }
    if (multiPrinterModeBadge) {
      multiPrinterModeBadge.textContent = isMulti ? 'ADVANCED MULTI-PRINTER MODE' : 'SINGLE PRINTER MODE';
      multiPrinterModeBadge.className = `badge-chip ${isMulti ? 'badge-primary-subtle' : 'grey'}`;
    }
    if (multiPrinterQueueSummary) {
      multiPrinterQueueSummary.style.display = isMulti ? 'flex' : 'none';
    }
  }

  function checkPrinterCompatibility(job, printerProfile) {
    if (!printerProfile) return { compatible: true };
    if (printerProfile.enabled === false) {
      return { compatible: false, reason: 'Routing disabled in shop config' };
    }
    const caps = printerProfile.capabilities || {};
    const jobColor = (job.color_mode || 'bw').toLowerCase();
    if (jobColor === 'color' && !caps.color) {
      return { compatible: false, reason: 'Requires Color (Printer is Monochrome)' };
    }
    if (job.duplex && !caps.duplex) {
      return { compatible: false, reason: 'Requires Duplex (Not supported)' };
    }
    const rawPaper = (job.paper_size || 'A4').toUpperCase();
    if (rawPaper.includes('A3') && !caps.a3) {
      return { compatible: false, reason: 'Requires A3 Paper' };
    }
    if (rawPaper.includes('4X6') && !caps.photo_4x6) {
      return { compatible: false, reason: 'Requires 4×6 Photo Paper' };
    }
    if (rawPaper.includes('5X7') && !caps.photo_5x7) {
      return { compatible: false, reason: 'Requires 5×7 Photo Paper' };
    }
    if (rawPaper.includes('LEGAL') && !caps.legal) {
      return { compatible: false, reason: 'Requires Legal Paper' };
    }
    if ((job.mode === 'photo' || rawPaper.includes('PHOTO')) && printerProfile.type === 'bw') {
      return { compatible: false, reason: 'B&W printer cannot print photo lab jobs' };
    }
    return { compatible: true };
  }

  // --- PRINTER ENUMERATION & MANAGEMENT ---
  async function scanPrinters() {
    try {
      const res = await window.quickprintApi.getPrinters();
      availablePrinters = res.printers || [];
      defaultPrinterName = res.defaultPrinter || availablePrinters[0] || 'Microsoft Print to PDF';

      topPrinterName.textContent = `Default: ${defaultPrinterName}`;
      kpiDefaultPrinterSub.textContent = `Target: ${defaultPrinterName}`;

      // Populate Printers View Grid
      printersGrid.innerHTML = '';
      testPrinterSelect.innerHTML = '';

      if (availablePrinters.length === 0) {
        printersGrid.innerHTML = `<div class="empty-queue-state"><p>No physical printers detected via Windows spooler.</p></div>`;
        return;
      }

      availablePrinters.forEach((name) => {
        const isDef = name === defaultPrinterName;
        const profile = multiPrinterConfig.printersConfig?.[name] || {
          name,
          customName: name,
          type: 'document',
          priority: isDef ? 1 : 2,
          enabled: true,
          capabilities: {
            a4: true,
            a3: false,
            a5: true,
            legal: true,
            color: true,
            bw: true,
            duplex: false,
            photo_4x6: false,
            photo_5x7: false,
            borderless: false,
          },
        };

        const caps = profile.capabilities || {};
        const displayName = profile.customName || name;
        const typeLabels = {
          document: 'General Document',
          bw: 'B&W Laser',
          color: 'Color Document',
          photo: 'Photo Lab Printer',
          large_format: 'Large Format Plotter',
          specialized: 'Specialized Printer',
        };
        const typeLabel = typeLabels[profile.type] || 'Standard';

        // Card
        const card = document.createElement('div');
        card.className = `printer-card ${isDef ? 'default' : ''}`;
        card.innerHTML = `
          <div class="printer-card-header">
            <div class="printer-title-box">
              <div class="printer-avatar ${isDef ? 'active-avatar' : ''}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
              </div>
              <div>
                <h3 class="printer-name-h3" title="${displayName}">${displayName}</h3>
                <span class="printer-status-sub ${isDef ? 'active' : ''}">
                  <span class="${isDef ? 'pulse-dot-sm' : 'idle-dot-sm'}"></span>
                  ${isDef ? 'Primary Default' : 'Ready'} • ${typeLabel}
                </span>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
              ${isDef ? '<span class="badge-chip badge-primary-subtle">DEFAULT</span>' : ''}
              ${multiPrinterConfig.multiPrinterMode ? `<span class="badge-chip grey" style="font-size:10px;">Priority ${profile.priority || 2}</span>` : ''}
            </div>
          </div>

          <!-- Driver & Shop Capabilities Row -->
          <div class="printer-caps-row">
            <span class="printer-cap-chip ${caps.a4 ? 'supported' : 'unsupported'}">A4 ${caps.a4 ? '✓' : '✗'}</span>
            <span class="printer-cap-chip ${caps.a3 ? 'supported' : 'unsupported'}">A3 ${caps.a3 ? '✓' : '✗'}</span>
            <span class="printer-cap-chip ${caps.bw ? 'supported' : 'unsupported'}">B&W ${caps.bw ? '✓' : '✗'}</span>
            <span class="printer-cap-chip ${caps.color ? 'supported' : 'unsupported'}">Color ${caps.color ? '✓' : '✗'}</span>
            <span class="printer-cap-chip ${caps.duplex ? 'supported' : 'unsupported'}">Duplex ${caps.duplex ? '✓' : '✗'}</span>
            <span class="printer-cap-chip ${caps.photo_4x6 ? 'supported' : 'unsupported'}">Photo 4×6 ${caps.photo_4x6 ? '✓' : '✗'}</span>
          </div>

          <div class="printer-card-actions">
            ${
              !isDef
                ? `<button class="btn btn-secondary btn-sm btn-set-default" data-name="${name}">Set Default</button>`
                : '<button class="btn btn-primary btn-sm btn-active-default" disabled><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Default</button>'
            }
            <button class="btn btn-secondary btn-sm btn-card-test" data-name="${name}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
              Test
            </button>
            <button class="btn btn-secondary btn-sm btn-card-manage" data-name="${name}" title="Configure capabilities, priority and routing rules">
              ⚙️ Manage
            </button>
          </div>
        `;
        printersGrid.appendChild(card);

        // Select option
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = displayName + (isDef ? ' (Default)' : '');
        if (isDef) opt.selected = true;
        testPrinterSelect.appendChild(opt);
      });

      // Bind Set Default buttons
      document.querySelectorAll('.btn-set-default').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const name = e.target.getAttribute('data-name');
          await window.quickprintApi.setDefaultPrinter(name);
          defaultPrinterName = name;
          showToast(`Default printer set to ${name}`, 'success');
          await scanPrinters();
        });
      });

      // Bind test ticket buttons on cards
      document.querySelectorAll('.btn-card-test').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const name = e.target.getAttribute('data-name');
          await triggerTestPrint(name);
        });
      });

      // Bind Manage Configuration buttons on cards
      document.querySelectorAll('.btn-card-manage').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const name = e.target.getAttribute('data-name');
          openPrinterConfigModal(name);
        });
      });
    } catch (err) {
      console.warn('Scan printers error:', err);
    }
  }

  // --- PRINTER CONFIGURATION MODAL ---
  function openPrinterConfigModal(printerName) {
    activeEditingPrinterName = printerName;
    const isDef = printerName === defaultPrinterName;
    const profile = multiPrinterConfig.printersConfig?.[printerName] || {
      name: printerName,
      customName: printerName,
      type: 'document',
      priority: isDef ? 1 : 2,
      enabled: true,
      capabilities: { a4: true, a3: false, a5: true, legal: true, color: true, bw: true, duplex: false, photo_4x6: false, photo_5x7: false, borderless: false },
    };
    const caps = profile.capabilities || {};

    cfgModalPrinterTitle.textContent = `Configure: ${profile.customName || printerName}`;
    cfgModalPrinterSub.textContent = `Windows Hardware Spooler: ${printerName}`;
    cfgPrinterCustomName.value = profile.customName || printerName;
    cfgPrinterType.value = profile.type || 'document';
    cfgPrinterPriority.value = String(profile.priority || (isDef ? 1 : 2));
    cfgPrinterRoutingEnabled.checked = profile.enabled !== false;

    const setCb = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.checked = Boolean(val);
    };

    setCb('cap_a4', caps.a4 !== false);
    setCb('cap_a3', caps.a3);
    setCb('cap_a5', caps.a5 !== false);
    setCb('cap_legal', caps.legal !== false);
    setCb('cap_color', caps.color !== false);
    setCb('cap_bw', caps.bw !== false);
    setCb('cap_duplex', caps.duplex);
    setCb('cap_photo_4x6', caps.photo_4x6);
    setCb('cap_photo_5x7', caps.photo_5x7);
    setCb('cap_borderless', caps.borderless);

    printerConfigModal.classList.add('active');
  }

  if (btnClosePrinterConfigModal) {
    btnClosePrinterConfigModal.addEventListener('click', () => {
      printerConfigModal.classList.remove('active');
      activeEditingPrinterName = null;
    });
  }

  if (btnCancelPrinterConfig) {
    btnCancelPrinterConfig.addEventListener('click', () => {
      printerConfigModal.classList.remove('active');
      activeEditingPrinterName = null;
    });
  }

  if (btnSavePrinterConfig) {
    btnSavePrinterConfig.addEventListener('click', async () => {
      if (!activeEditingPrinterName) return;
      const customName = cfgPrinterCustomName.value.trim() || activeEditingPrinterName;
      const type = cfgPrinterType.value;
      const priority = parseInt(cfgPrinterPriority.value, 10) || 2;
      const enabled = cfgPrinterRoutingEnabled.checked;

      const getCb = (id) => {
        const el = document.getElementById(id);
        return el ? el.checked : false;
      };

      const capabilities = {
        a4: getCb('cap_a4'),
        a3: getCb('cap_a3'),
        a5: getCb('cap_a5'),
        legal: getCb('cap_legal'),
        color: getCb('cap_color'),
        bw: getCb('cap_bw'),
        duplex: getCb('cap_duplex'),
        photo_4x6: getCb('cap_photo_4x6'),
        photo_5x7: getCb('cap_photo_5x7'),
        borderless: getCb('cap_borderless'),
      };

      if (!multiPrinterConfig.printersConfig) multiPrinterConfig.printersConfig = {};
      multiPrinterConfig.printersConfig[activeEditingPrinterName] = {
        name: activeEditingPrinterName,
        customName,
        type,
        priority,
        enabled,
        capabilities,
      };

      btnSavePrinterConfig.disabled = true;
      btnSavePrinterConfig.textContent = 'Saving...';
      try {
        await window.quickprintApi.saveMultiPrinterConfig(multiPrinterConfig);
        showToast(`Printer profile for "${customName}" saved!`, 'success');
        printerConfigModal.classList.remove('active');
        activeEditingPrinterName = null;
        await scanPrinters();
        renderQueue();
      } catch (e) {
        showToast('Failed to save printer profile: ' + e.message, 'danger');
      } finally {
        btnSavePrinterConfig.disabled = false;
        btnSavePrinterConfig.textContent = '💾 Save Printer Profile';
      }
    });
  }

  if (btnAutoDetectPrinterCaps) {
    btnAutoDetectPrinterCaps.addEventListener('click', async () => {
      if (!activeEditingPrinterName) return;
      btnAutoDetectPrinterCaps.disabled = true;
      btnAutoDetectPrinterCaps.textContent = 'Detecting Hardware Driver...';
      try {
        const caps = await window.quickprintApi.detectPrinterCapabilities(activeEditingPrinterName);
        if (caps) {
          const setCb = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.checked = Boolean(val);
          };
          setCb('cap_color', caps.color);
          setCb('cap_bw', caps.bw);
          setCb('cap_duplex', caps.duplex);
          setCb('cap_a4', caps.a4);
          setCb('cap_a3', caps.a3);
          setCb('cap_a5', caps.a5);
          setCb('cap_legal', caps.legal);
          setCb('cap_photo_4x6', caps.photo_4x6);
          setCb('cap_photo_5x7', caps.photo_5x7);
          setCb('cap_borderless', caps.borderless);
          if (caps.detectedType && cfgPrinterType) {
            cfgPrinterType.value = caps.detectedType;
          }
          showToast('Hardware capabilities auto-detected from Windows driver!', 'success');
        }
      } catch (e) {
        showToast('Detection error: ' + e.message, 'warning');
      } finally {
        btnAutoDetectPrinterCaps.disabled = false;
        btnAutoDetectPrinterCaps.textContent = '🔍 Auto-Detect from Windows Driver';
      }
    });
  }

  // --- TEST PRINT ---
  async function triggerTestPrint(printerName) {
    showToast(`Sending test ticket to ${printerName}...`, 'info');
    try {
      const res = await window.quickprintApi.printTestPage(printerName);
      if (res.success) {
        showToast(`Hardware test ticket spooled to ${printerName}!`, 'success');
      } else {
        showToast(`Print test warning: ${res.error || 'Unknown error'}`, 'warning');
      }
    } catch (e) {
      showToast(`Spooler error: ${e.message}`, 'danger');
    }
  }

  btnSendTestPrint.addEventListener('click', () => {
    const selected = testPrinterSelect.value;
    if (selected) triggerTestPrint(selected);
  });

  btnScanPrinters.addEventListener('click', async () => {
    showToast('Scanning Windows Spooler for printers...', 'info');
    await scanPrinters();
    showToast('Printers updated.', 'success');
  });

  // Normalize DB job record to Counter OS UI contract
  function normalizeJob(raw) {
    if (!raw) return raw;
    let tokenDisplay = '';
    if (raw.token_number != null) {
      const num = Number(raw.token_number);
      if (!isNaN(num)) {
        tokenDisplay = `#${num < 100 ? String(num).padStart(2, '0') : String(num)}`;
      } else {
        tokenDisplay = `#${String(raw.token_number)}`;
      }
    } else {
      tokenDisplay = `#${(raw.id || '').substring(0, 4).toUpperCase()}`;
    }

    const printStatus = raw.print_status || raw.status || 'queued';
    let uiStatus = 'pending';
    if (printStatus === 'printing') uiStatus = 'printing';
    else if (printStatus === 'completed') uiStatus = 'completed';
    else if (printStatus === 'failed') uiStatus = 'failed';
    else if (printStatus === 'queued' || printStatus === 'pending_payment') uiStatus = 'pending';

    const rawPayment = (raw.payment_status || (raw.payment_mode === 'cash' ? 'pending' : 'paid')).toLowerCase();
    const isPaid = rawPayment === 'paid';

    return {
      ...raw,
      token_number: tokenDisplay,
      raw_token: raw.token_number,
      page_count: raw.pages || raw.page_count || 1,
      total_amount: Number(raw.price != null ? raw.price : (raw.total_amount || 0)),
      status: uiStatus,
      payment_status: isPaid ? 'paid' : 'pending',
      customer_name: raw.customer_name || raw.file_name || 'Walk-in Customer',
    };
  }

  // --- REAL-TIME JOBS & QUEUE ---
  async function fetchJobs() {
    try {
      const jobs = await window.quickprintApi.getJobs();
      activeJobs = (jobs || []).map(normalizeJob);
      renderQueue();
      updateFinancials();
    } catch (err) {
      console.error('Fetch jobs error:', err);
    }
  }

  // Auto-print mode toggle (Persisted across restarts)
  btnAutoPrintState.addEventListener('click', async () => {
    autoPrintEnabled = !autoPrintEnabled;
    btnAutoPrintState.classList.toggle('active', autoPrintEnabled);
    btnAutoPrintState.textContent = autoPrintEnabled ? 'ON' : 'OFF';
    if (cfgAutoPrintDefault) cfgAutoPrintDefault.checked = autoPrintEnabled;
    try {
      await window.quickprintApi.saveSettings({ autoPrintDefault: autoPrintEnabled });
    } catch (e) {
      console.warn('Could not persist auto-print preference:', e);
    }
    showToast(`Auto-Print Mode is now ${autoPrintEnabled ? 'ENABLED' : 'DISABLED'}`, 'info');
  });

  // Pause orders toggle (Authoritative Cloud Sync to shops.price_config.is_accepting_orders)
  btnPauseOrders.addEventListener('click', async () => {
    ordersPaused = !ordersPaused;
    const isAccepting = !ordersPaused;

    if (ordersPaused) {
      shopStatusIndicator.classList.add('paused');
      shopStatusText.textContent = 'Orders Paused (Counter Busy)';
      btnPauseOrdersText.textContent = '▶️ Resume Orders';
      showToast('Kiosk intake is PAUSED. Customers will see "Counter Busy".', 'warning');
    } else {
      shopStatusIndicator.classList.remove('paused');
      shopStatusText.textContent = 'Live — Accepting Orders';
      btnPauseOrdersText.textContent = '⏸️ Pause Orders';
      showToast('Kiosk intake is LIVE. Accepting orders.', 'success');
    }

    try {
      const res = await window.quickprintApi.setOrderIntake(isAccepting);
      if (!res?.success) {
        showToast(`Could not sync intake status: ${res?.error || 'Unknown error'}`, 'warning');
      }
    } catch (err) {
      console.error('Failed to sync order intake to cloud:', err);
      showToast('Error syncing shop status to cloud backend.', 'danger');
    }
  });

  // Filter pills
  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      filterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.getAttribute('data-filter');
      renderQueue();
    });
  });

  // Print next pending
  btnPrintAllPending.addEventListener('click', () => {
    const nextJob = activeJobs.find((j) => j.status === 'pending' || j.status === 'paid');
    if (nextJob) {
      executePrint(nextJob);
    } else {
      showToast('No pending jobs in queue!', 'info');
    }
  });

  // Refresh
  btnRefreshQueue.addEventListener('click', async () => {
    showToast('Refreshing live queue...', 'info');
    await fetchJobs();
  });

  // Render Queue Cards
  function renderQueue() {
    const pendingJobs = activeJobs.filter((j) => j.status === 'pending' || j.status === 'printing' || j.status === 'paid');
    const paidJobs = activeJobs.filter((j) => j.payment_status === 'paid');
    const cashJobs = activeJobs.filter((j) => j.payment_status === 'pending' || j.payment_status === 'cash');

    // Counts in pills
    filterAllCount.textContent = activeJobs.length;
    filterPendingCount.textContent = pendingJobs.length;
    filterPaidCount.textContent = paidJobs.length;
    filterCashCount.textContent = cashJobs.length;

    queueBadge.textContent = pendingJobs.length;
    kpiQueueCount.textContent = `${pendingJobs.length} Orders`;

    let totalPendingPages = 0;
    pendingJobs.forEach((j) => {
      totalPendingPages += (j.page_count || 1) * (j.copies || 1);
    });
    kpiQueueSub.textContent = `${totalPendingPages} pages pending spool`;

    // Filter jobs
    let filtered = activeJobs;
    if (currentFilter === 'pending') filtered = pendingJobs;
    if (currentFilter === 'paid') filtered = paidJobs;
    if (currentFilter === 'cash') filtered = cashJobs;

    if (filtered.length === 0) {
      emptyQueueState.style.display = 'flex';
      queueCardsList.innerHTML = '';
      return;
    }

    emptyQueueState.style.display = 'none';
    queueCardsList.innerHTML = '';

    // Update Multi-Printer Summary Bar if enabled (Requirement 39 & 40)
    if (multiPrinterConfig.multiPrinterMode && multiPrinterSummaryPills) {
      let readyCount = 0;
      let offlineCount = 0;
      let printerPillsHtml = '';

      availablePrinters.forEach((pName) => {
        const pHealth = (window._lastPrinterHealthMap && window._lastPrinterHealthMap[pName]) || { isOnline: true, status: 'READY' };
        const isOnline = pHealth.isOnline && pHealth.status === 'READY';
        if (isOnline) readyCount++;
        else offlineCount++;

        const pProfile = multiPrinterConfig.printersConfig?.[pName];
        const pLabel = pProfile?.customName || pName;

        const qJobs = activeJobs.filter(
          (j) => (j.status === 'pending' || j.status === 'printing') &&
                 (j.assigned_printer === pName || (!j.assigned_printer && pName === defaultPrinterName))
        );

        printerPillsHtml += `
          <span class="printer-queue-pill ${isOnline ? 'ready' : 'offline'}" title="${isOnline ? 'Printer Ready' : 'Printer Offline'}">
            <span class="printer-dot-live"></span>
            <span>${pLabel}: <strong>${qJobs.length}</strong></span>
          </span>
        `;
      });

      multiPrinterSummaryPills.innerHTML = `
        <span class="badge-chip grey" style="font-weight:700;">${availablePrinters.length} Total</span>
        <span class="badge-chip green" style="font-weight:700;">● ${readyCount} Ready</span>
        ${offlineCount > 0 ? `<span class="badge-chip red" style="font-weight:700;">● ${offlineCount} Offline</span>` : ''}
        ${printerPillsHtml}
      `;
    }

    filtered.forEach((job) => {
      const isPaid = job.payment_status === 'paid';
      const isPrinting = job.status === 'printing';
      const isCompleted = job.status === 'completed';

      const card = document.createElement('div');
      card.className = `order-card ${isPrinting ? 'printing' : ''}`;
      card.id = `job-card-${job.id}`;

      const tokenDisplay = job.token_number || `#${job.id.substring(0, 4).toUpperCase()}`;
      const timeStr = job.created_at ? new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
      const copies = job.copies || 1;
      const pages = job.page_count || 1;
      const totalPages = pages * copies;
      const colorMode = job.color_mode === 'color' ? 'Full Color' : 'B&W';
      const duplexMode = job.duplex ? 'Duplex (Both Sides)' : 'Single Sided';
      const rawPaper = job.paper_size || 'A4';
      const isSpiral = job.binding || rawPaper.includes('Spiral');
      const isStapled = job.stapling || rawPaper.includes('Staple');
      function getPaperDisplay(p) {
        if (!p) return 'A4';
        const clean = p.split(' + ')[0].trim().toLowerCase();
        if (clean === 'a4') return 'A4';
        if (clean === 'a3') return 'A3';
        if (clean === 'legal') return 'Legal';
        if (clean === 'passport') return 'Passport (8×)';
        if (clean === 'custom') return 'Legal / Bond';
        return p.toUpperCase();
      }
      const basePaper = getPaperDisplay(rawPaper);
      const amount = (job.total_amount || 0).toFixed(2);
      const isExpanded = expandedJobs.has(job.id);

      if (!jobPagesStatus[job.id]) {
        jobPagesStatus[job.id] = {};
        for (let p = 1; p <= pages; p++) {
          jobPagesStatus[job.id][p] = isCompleted ? 'completed' : 'pending';
        }
      }

      // Multi-Printer assigned selector row (Requirement 15, 16, 19, 42)
      let multiPrinterRowHtml = '';
      if (multiPrinterConfig.multiPrinterMode) {
        const assignedPName = job.assigned_printer || defaultPrinterName || availablePrinters[0] || '';
        let optionsHtml = '';

        availablePrinters.forEach((pName) => {
          const prof = multiPrinterConfig.printersConfig?.[pName] || { name: pName, customName: pName };
          const pComp = checkPrinterCompatibility(job, prof);
          const compSuffix = pComp.compatible ? '' : ` ⚠️ (${pComp.reason})`;
          const isSelected = pName === assignedPName;
          optionsHtml += `<option value="${pName}" ${isSelected ? 'selected' : ''}>${prof.customName || pName}${compSuffix}</option>`;
        });

        const currentProfile = multiPrinterConfig.printersConfig?.[assignedPName] || { name: assignedPName };
        const compCheck = checkPrinterCompatibility(job, currentProfile);

        multiPrinterRowHtml = `
          <div class="order-assigned-printer-row">
            <span class="order-assigned-label">Assigned Printer:</span>
            <select class="order-assigned-select" data-id="${job.id}">
              ${optionsHtml}
            </select>
            <span class="order-assigned-badge ${job.assignment_type === 'manual' ? 'manual' : 'auto'}">
              ${job.assignment_type === 'manual' ? 'Manual Assignment' : 'Auto Assigned'}
            </span>
            ${
              !compCheck.compatible
                ? `<span class="badge-chip red" style="font-size:11px;" title="${compCheck.reason}">⚠️ ${compCheck.reason}</span>`
                : ''
            }
          </div>
        `;
      }

      // Generate page cells HTML
      let pageCellsHtml = '';
      for (let p = 1; p <= pages; p++) {
        const pStatus = jobPagesStatus[job.id][p] || (isCompleted ? 'completed' : 'pending');
        let badgeHtml = '<span class="page-badge grey">Pending</span>';
        if (pStatus === 'completed') badgeHtml = '<span class="page-badge green">✓ Printed</span>';
        else if (pStatus === 'printing') badgeHtml = '<span class="page-badge blue">⏳ Printing...</span>';
        else if (pStatus === 'failed') badgeHtml = '<span class="page-badge red">⚠️ Jammed / Error</span>';

        pageCellsHtml += `
          <div class="page-cell">
            <div class="page-cell-header">
              <span class="page-num">Page ${p}</span>
              ${badgeHtml}
            </div>
            <div class="page-cell-actions">
              <button class="btn-page-action btn-reprint-single-page" data-id="${job.id}" data-page="${p}">
                🔄 Reprint Page ${p}
              </button>
              ${
                p < pages
                  ? `<button class="btn-page-action resume btn-resume-from-page" data-id="${job.id}" data-page="${p}">
                       ▶️ Resume From Page ${p}
                     </button>`
                  : ''
              }
            </div>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="order-card-main">
          <div class="order-card-left">
            <div class="token-badge-box">
              <span class="token-tag">${tokenDisplay}</span>
              <span class="token-time">${timeStr}</span>
            </div>

            <div class="order-details-col">
              <div class="order-customer-row">
                <span class="customer-name">${job.customer_name || 'Walk-in Customer'}</span>
                <span class="customer-phone">${job.customer_phone || ''}</span>
              </div>
              <div class="order-specs-chips">
                <span class="spec-chip ${job.color_mode === 'color' ? 'color' : 'bw'}">${colorMode}</span>
                <span class="spec-chip">${pages} Pages × ${copies} Copy</span>
                <span class="spec-chip">${duplexMode}</span>
                <span class="spec-chip">${basePaper}</span>
                ${isSpiral ? '<span class="spec-chip color" style="font-weight:700;">🌀 Spiral Binding</span>' : ''}
                ${isStapled ? '<span class="spec-chip" style="background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe; font-weight:700;">📎 Corner Staple</span>' : ''}
              </div>
            </div>
          </div>

          <div class="order-card-right">
            <div class="payment-status-block">
              <div class="payment-amount">₹${amount}</div>
              <span class="payment-badge ${isPaid ? 'paid' : 'cash'}">
                ${isPaid ? 'PAID UPI ✓' : 'COLLECT CASH ⚠️'}
              </span>
            </div>

            <div class="order-actions">
              ${
                isCompleted
                  ? `<span class="badge-chip green" style="padding: 6px 12px; font-weight: 700; border-radius: 6px;">✓ PRINT COMPLETED</span>
                     <button class="btn btn-secondary btn-sm btn-print-job" data-id="${job.id}" title="Send duplicate to printer">🔄 Reprint All</button>
                     ${
                       job.local_media_status === 'deleted'
                         ? '<span class="badge-chip grey" style="font-size:11px; padding:6px 10px;">Media Deleted</span>'
                         : `<button class="btn btn-secondary btn-sm btn-delete-job-media" data-id="${job.id}" title="Delete local customer file to free disk space">🗑️ Delete Media</button>`
                     }`
                  : isPrinting
                  ? `<button class="btn btn-primary btn-sm" disabled style="opacity: 0.85;">⏳ Printing to Spooler...</button>`
                  : job.status === 'failed'
                  ? `<span class="badge-chip red" style="padding: 6px 12px; font-weight: 700; border-radius: 6px;" title="${job.failure_reason || 'Print failure'}">⚠️ PRINT FAILED</span>
                     <button class="btn btn-primary btn-sm btn-print-job" data-id="${job.id}">🔄 Retry All</button>`
                  : !isPaid
                  ? `<button class="btn btn-primary btn-sm btn-confirm-cash" data-id="${job.id}">💵 Cash Paid & Print</button>`
                  : `<button class="btn btn-primary btn-sm btn-print-job" data-id="${job.id}">🖨️ Print Now</button>`
              }
              <button class="btn btn-secondary btn-sm btn-preview-job" data-id="${job.id}">
                👁️ Preview
              </button>
            </div>
          </div>
        </div>

        ${multiPrinterRowHtml}

        <div class="order-card-footer">
          <button class="btn-toggle-pages" data-id="${job.id}">
            <span>${isExpanded ? '▴ Hide Breakdown' : '▾ 📑 Show Pages Breakdown (' + pages + ' Pages)'}</span>
          </button>
          <div style="font-size: 11px; color: var(--text-muted); font-family: monospace;">
            File: ${job.file_name || 'Document.pdf'}
          </div>
        </div>

        <div class="order-pages-drawer ${isExpanded ? '' : 'hidden'}" id="pages-drawer-${job.id}">
          <div class="drawer-header">
            <span>📑 Page-by-Page Status & Selective Reprint</span>
            <span class="badge-chip ${isCompleted ? 'green' : 'blue'}">
              ${isCompleted ? '✓ All Pages Printed' : `${pages} Total Pages`}
            </span>
          </div>

          <div class="pages-grid">
            ${pageCellsHtml}
          </div>

          <div class="custom-range-bar">
            <span>Reprint Range:</span>
            <span>From Page</span>
            <input type="number" class="page-num-input" id="range-from-${job.id}" min="1" max="${pages}" value="1" />
            <span>To Page</span>
            <input type="number" class="page-num-input" id="range-to-${job.id}" min="1" max="${pages}" value="${pages}" />
            <button class="btn btn-secondary btn-sm btn-reprint-range" data-id="${job.id}">
              🖨️ Reprint Specified Range
            </button>
          </div>
        </div>
      `;

      queueCardsList.appendChild(card);
    });

    // Bind assigned printer select dropdowns (Requirement 15 & 42)
    document.querySelectorAll('.order-assigned-select').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const selectedPrinter = e.currentTarget.value;
        const job = activeJobs.find((j) => j.id === id);
        if (job) {
          job.assigned_printer = selectedPrinter;
          job.assignment_type = 'manual';
          const prof = multiPrinterConfig.printersConfig?.[selectedPrinter];
          const comp = checkPrinterCompatibility(job, prof);
          if (!comp.compatible) {
            showToast(`Warning: "${prof?.customName || selectedPrinter}" may not support this order (${comp.reason})`, 'warning');
          } else {
            showToast(`Token ${job.token_number} reassigned to ${prof?.customName || selectedPrinter}`, 'info');
          }
          renderQueue();
        }
      });
    });

    // Toggle pages breakdown drawer
    document.querySelectorAll('.btn-toggle-pages').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (expandedJobs.has(id)) {
          expandedJobs.delete(id);
        } else {
          expandedJobs.add(id);
        }
        renderQueue();
      });
    });

    // Reprint single page
    document.querySelectorAll('.btn-reprint-single-page').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const page = e.currentTarget.getAttribute('data-page');
        const job = activeJobs.find((j) => j.id === id);
        if (job) {
          executePrint(job, { pageRange: String(page) });
        }
      });
    });

    // Resume from page to end
    document.querySelectorAll('.btn-resume-from-page').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const page = e.currentTarget.getAttribute('data-page');
        const job = activeJobs.find((j) => j.id === id);
        if (job) {
          const totalP = job.page_count || 1;
          executePrint(job, { pageRange: `${page}-${totalP}` });
        }
      });
    });

    // Custom range reprint
    document.querySelectorAll('.btn-reprint-range').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const job = activeJobs.find((j) => j.id === id);
        if (!job) return;
        const totalP = job.page_count || 1;
        const fromInput = document.getElementById(`range-from-${id}`);
        const toInput = document.getElementById(`range-to-${id}`);
        const from = Math.max(1, parseInt(fromInput?.value || '1', 10));
        const to = Math.min(totalP, Math.max(from, parseInt(toInput?.value || String(totalP), 10)));
        executePrint(job, { pageRange: `${from}-${to}` });
      });
    });

    // Bind action buttons: Print / Reprint / Retry All
    document.querySelectorAll('.btn-print-job').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const job = activeJobs.find((j) => j.id === id);
        if (job) executePrint(job);
      });
    });

    // Bind action buttons: Confirm Cash & Print
    document.querySelectorAll('.btn-confirm-cash').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const job = activeJobs.find((j) => j.id === id);
        if (!job) return;
        btn.disabled = true;
        btn.textContent = 'Recording...';
        try {
          showToast(`Recording cash payment for Token ${job.token_number}...`, 'info');
          const res = await window.quickprintApi.confirmCashPayment(id);
          if (res?.success) {
            job.payment_status = 'paid';
            showToast(`Cash payment verified for Token ${job.token_number}!`, 'success');
            await executePrint(job);
          } else {
            showToast(`Could not confirm cash: ${res?.error || 'Database error'}`, 'danger');
            btn.disabled = false;
            btn.textContent = '💵 Cash Paid & Print';
          }
        } catch (err) {
          showToast(`Cash payment error: ${err.message}`, 'danger');
          btn.disabled = false;
          btn.textContent = '💵 Cash Paid & Print';
        }
      });
    });

    // Bind action buttons: Preview
    document.querySelectorAll('.btn-preview-job').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const job = activeJobs.find((j) => j.id === id);
        if (job) openPreview(job);
      });
    });

    // Bind action buttons: Delete Media (Owner Privacy & Storage Management)
    document.querySelectorAll('.btn-delete-job-media').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const job = activeJobs.find((j) => j.id === id);
        if (!job) return;
        if (!confirm(`Delete local customer media for Token ${job.token_number}?\n\nThis permanently clears the local document/photo to free disk space. All order, token, and payment history will be preserved.`)) return;

        try {
          if (window.quickprintApi?.deleteLocalMedia) {
            await window.quickprintApi.deleteLocalMedia(id);
            job.local_media_status = 'deleted';
            showToast(`Local media file deleted for Token ${job.token_number}. Records preserved.`, 'info');
            renderQueue();
            if (typeof refreshMediaStorageStats === 'function') refreshMediaStorageStats();
          }
        } catch (err) {
          showToast('Failed to delete media: ' + err.message, 'danger');
        }
      });
    });
  }

  // Execute Real Print via physical spooler pipeline (with page-level & multi-printer support)
  async function executePrint(job, printOptions = {}) {
    const card = document.getElementById(`job-card-${job.id}`);
    if (card) card.classList.add('printing');
    job.status = 'printing';

    const pages = job.page_count || 1;
    if (!jobPagesStatus[job.id]) jobPagesStatus[job.id] = {};

    // Determine targeted pages
    let targetedPages = [];
    if (printOptions.pageRange) {
      const rangeStr = String(printOptions.pageRange).trim();
      if (rangeStr.includes('-')) {
        const [s, e] = rangeStr.split('-').map(Number);
        for (let i = s; i <= e; i++) targetedPages.push(i);
      } else {
        targetedPages = [Number(rangeStr)];
      }
    } else {
      targetedPages = Array.from({ length: pages }, (_, i) => i + 1);
    }

    // Mark targeted pages as printing
    targetedPages.forEach((p) => {
      jobPagesStatus[job.id][p] = 'printing';
    });

    renderQueue();
    renderHistoryTable();

    // Select target printer based on mode (Requirement 14, 15, 24)
    const targetPrinter = (multiPrinterConfig.multiPrinterMode && job.assigned_printer)
      ? job.assigned_printer
      : (defaultPrinterName || 'Default Printer');

    const rangeLabel = printOptions.pageRange ? ` (Pages ${printOptions.pageRange})` : '';
    showToast(`Sending Token ${job.token_number || ''}${rangeLabel} to ${targetPrinter}...`, 'info');

    try {
      const res = await window.quickprintApi.printJob(job.id, {
        printerName: targetPrinter,
        fileUrl: job.file_url,
        copies: job.copies || 1,
        duplex: job.duplex,
        paperSize: (job.paper_size || 'A4').split(' + ')[0],
        pageRange: printOptions.pageRange,
      });

      if (res && res.success) {
        showToast(`Token ${job.token_number || ''}${rangeLabel} spooled & verified completed!`, 'success');
        targetedPages.forEach((p) => {
          jobPagesStatus[job.id][p] = 'completed';
        });

        // Check if all pages completed
        const allDone = Array.from({ length: pages }, (_, i) => i + 1).every(
          (p) => jobPagesStatus[job.id][p] === 'completed'
        );
        if (allDone) {
          job.status = 'completed';
        } else {
          job.status = 'pending';
        }

        renderQueue();
        renderHistoryTable();
        updateFinancials();
      } else {
        targetedPages.forEach((p) => {
          jobPagesStatus[job.id][p] = 'failed';
        });
        job.status = 'failed';
        job.failure_reason = res?.error || 'Spooler error';
        renderQueue();
        renderHistoryTable();
        showToast(`Spool error: ${res?.error || 'Failed to print'}`, 'danger');
      }
    } catch (e) {
      targetedPages.forEach((p) => {
        jobPagesStatus[job.id][p] = 'failed';
      });
      job.status = 'failed';
      job.failure_reason = e.message;
      renderQueue();
      renderHistoryTable();
      showToast(`Printer driver error: ${e.message}`, 'danger');
    } finally {
      if (card) card.classList.remove('printing');
    }
  }

  // --- ADVANCED DOCUMENT & AUTO-FIT IMAGE PREVIEW (Requirements 1, 2, 3, 4, 5, 6, 7, 34, 35) ---
  async function openPreview(job) {
    activePreviewJob = job;
    const tokenDisplay = job.token_number || `#${job.id.substring(0, 4).toUpperCase()}`;
    const custName = job.customer_name || 'Customer';
    const isPhotoOrImage =
      job.mode === 'photo' ||
      /\.(jpe?g|png|webp|bmp|tiff|gif)$/i.test(job.file_name || '') ||
      (job.paper_size && job.paper_size.includes('Photo'));

    if (previewTitle) {
      previewTitle.textContent = `${isPhotoOrImage ? 'Image Preview' : 'Document Preview'} — Token ${tokenDisplay} (${custName})`;
    }
    if (previewFileName) {
      previewFileName.textContent = job.file_name || (isPhotoOrImage ? 'photo.jpg' : 'document.pdf');
    }

    // Actual configuration specs
    const copies = job.copies || 1;
    const copiesText = `${copies} ${copies > 1 ? 'Copies' : 'Copy'}`;
    const colorText = job.color_mode === 'color' ? 'Full Color' : 'B&W';
    const duplexText = job.duplex ? 'Two-Sided (Duplex)' : 'Single-Sided';
    const rawPaper = (job.paper_size || (isPhotoOrImage ? '4×6' : 'A4')).split(' + ')[0];

    // Determine final paper orientation (Requirement 7)
    let isLandscape = false;
    if (job.orientation) {
      isLandscape = job.orientation.toLowerCase() === 'landscape';
    } else if (job.paper_size && job.paper_size.toLowerCase().includes('landscape')) {
      isLandscape = true;
    }
    const orientationLabel = isLandscape ? 'Landscape' : 'Portrait';

    if (previewSpecs) {
      previewSpecs.textContent = `${rawPaper} • ${colorText} • ${duplexText} • ${copiesText} • ${orientationLabel}`;
    }

    if (previewModeTag) {
      previewModeTag.textContent = isPhotoOrImage ? (job.mode === 'photo' ? 'PHOTO LAB PRINT' : 'IMAGE PRINT') : 'PDF DOCUMENT';
    }

    if (previewOrientationPill) {
      previewOrientationPill.textContent = `${orientationLabel} Paper Preview`;
    }

    // Handle deleted/purged media gracefully (Requirements 5 & 35)
    if (job.local_media_status === 'deleted') {
      previewIframe.style.display = 'none';
      imagePreviewContainer.style.display = 'none';
      previewDeletedNotice.style.display = 'flex';
      previewModal.classList.add('active');
      return;
    }

    if (isPhotoOrImage) {
      // Auto-fit Image Preview: Fit complete image inside container with zero internal scrolling (Requirements 1, 2, 3)
      previewIframe.style.display = 'none';
      previewDeletedNotice.style.display = 'none';
      imagePreviewContainer.style.display = 'flex';
      previewImg.style.display = 'none';

      paperSheet.className = isLandscape
        ? 'preview-paper-sheet orientation-landscape'
        : 'preview-paper-sheet orientation-portrait';

      if (paperWatermarkText) {
        paperWatermarkText.textContent = `${rawPaper} • ${colorText} • Token ${tokenDisplay}`;
      }

      // Try local media file first for instant zero-latency preview
      let resolvedSrc = null;
      try {
        if (window.quickprintApi?.getLocalMediaUrl) {
          const localUrl = await window.quickprintApi.getLocalMediaUrl(job.id);
          if (localUrl) resolvedSrc = localUrl;
        }
      } catch (e) {}

      if (!resolvedSrc && job.file_url) {
        resolvedSrc = job.file_url;
      }

      if (resolvedSrc) {
        previewImg.onload = () => {
          previewImg.style.display = 'block';
          // If orientation was not hardcoded in order, adapt sheet to true aspect ratio
          if (!job.orientation && !job.paper_size?.toLowerCase().includes('landscape')) {
            if (previewImg.naturalWidth > previewImg.naturalHeight * 1.12) {
              paperSheet.className = 'preview-paper-sheet orientation-landscape';
              if (previewOrientationPill) previewOrientationPill.textContent = 'Landscape Fit';
            } else {
              paperSheet.className = 'preview-paper-sheet orientation-portrait';
              if (previewOrientationPill) previewOrientationPill.textContent = 'Portrait Fit';
            }
          }
        };
        previewImg.onerror = () => {
          previewImg.style.display = 'none';
          previewDeletedNotice.style.display = 'flex';
        };
        previewImg.src = resolvedSrc;
      } else {
        previewImg.style.display = 'none';
        previewDeletedNotice.style.display = 'flex';
      }
    } else {
      // Keep PDF / Document preview feature (Requirement 4)
      imagePreviewContainer.style.display = 'none';
      previewDeletedNotice.style.display = 'none';
      previewIframe.style.display = 'block';

      if (job.file_url) {
        previewIframe.srcdoc = `
          <body style="font-family:system-ui,-apple-system,sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; background:#f8fafc; color:#64748b;">
            <div style="text-align:center;">
              <p>⏳ Loading document preview...</p>
            </div>
          </body>
        `;
        fetch(job.file_url, { method: 'HEAD' })
          .then((resp) => {
            if (resp.ok) {
              previewIframe.removeAttribute('srcdoc');
              previewIframe.src = job.file_url;
            } else {
              previewIframe.srcdoc = `
                <body style="font-family:system-ui,-apple-system,sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; background:#f8fafc;">
                  <div style="text-align:center; padding: 24px; max-width: 400px; border-radius: 12px; background: white; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
                    <div style="font-size: 40px; margin-bottom: 12px;">🔒</div>
                    <h3 style="margin: 0 0 8px; color: #0f172a; font-weight: 700;">Media file is no longer available</h3>
                    <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0;">This customer document was purged in accordance with data retention policies.</p>
                  </div>
                </body>
              `;
            }
          })
          .catch(() => {
            previewIframe.removeAttribute('srcdoc');
            previewIframe.src = job.file_url;
          });
      } else {
        previewIframe.srcdoc = `
          <body style="font-family:system-ui,-apple-system,sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; background:#f8fafc;">
            <div style="text-align:center; padding: 24px; max-width: 400px; border-radius: 12px; background: white; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
              <div style="font-size: 40px; margin-bottom: 12px;">📄</div>
              <h3 style="margin: 0 0 8px; color: #0f172a; font-weight: 700;">Document Pending Upload</h3>
              <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0;">Token: ${tokenDisplay} | File: ${job.file_name || 'document.pdf'}</p>
            </div>
          </body>
        `;
      }
    }

    previewModal.classList.add('active');
  }

  // Close preview modal
  btnClosePreviewModal.addEventListener('click', () => {
    previewModal.classList.remove('active');
    previewIframe.src = 'about:blank';
    if (previewImg) previewImg.src = '';
  });

  // Print now from preview modal (Works for both Image & PDF - Requirement 5)
  btnPreviewPrintNow.addEventListener('click', () => {
    if (activePreviewJob) {
      previewModal.classList.remove('active');
      previewIframe.src = 'about:blank';
      if (previewImg) previewImg.src = '';
      executePrint(activePreviewJob);
    }
  });

  // Download original customer media from preview modal (Works for both Image & PDF - Requirements 5 & 35)
  if (btnPreviewDownload) {
    btnPreviewDownload.addEventListener('click', async () => {
      if (!activePreviewJob) return;
      showToast('Preparing download for customer media...', 'info');
      try {
        if (window.quickprintApi?.downloadMedia) {
          const res = await window.quickprintApi.downloadMedia(activePreviewJob.id, activePreviewJob.file_name);
          if (res && res.success) {
            showToast(`Saved to computer: ${res.savedPath || ''}`, 'success');
          } else {
            showToast(res?.error || 'Media file is no longer available.', 'warning');
          }
        } else {
          showToast('Download API not available in this build.', 'warning');
        }
      } catch (e) {
        showToast('Download error: ' + e.message, 'danger');
      }
    });
  }

  // --- HISTORY VIEW ---
  function renderHistoryTable() {
    const term = historySearchInput.value.toLowerCase();
    const rows = activeJobs.filter((j) => {
      if (!term) return true;
      const tNum = (j.token_number || '').toLowerCase();
      const cName = (j.customer_name || '').toLowerCase();
      const cPhone = (j.customer_phone || '').toLowerCase();
      return tNum.includes(term) || cName.includes(term) || cPhone.includes(term);
    });

    historyTableBody.innerHTML = '';
    if (rows.length === 0) {
      historyTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:24px; color:#64748B;">No matching print records found.</td></tr>`;
      return;
    }

    rows.forEach((job) => {
      const tr = document.createElement('tr');
      const timeStr = job.created_at ? new Date(job.created_at).toLocaleDateString() + ' ' + new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
      const isPaid = job.payment_status === 'paid';

      tr.innerHTML = `
        <td class="token-cell">${job.token_number || '#' + job.id.substring(0, 4)}</td>
        <td>${timeStr}</td>
        <td><strong>${job.customer_name || 'Walk-in'}</strong><br><small style="color:#64748B;">${job.customer_phone || ''}</small></td>
        <td>${job.page_count || 1}p × ${job.copies || 1}c</td>
        <td>${job.color_mode || 'B&W'} / ${job.duplex ? 'Duplex' : 'Single'}</td>
        <td><strong>₹${(job.total_amount || 0).toFixed(2)}</strong></td>
        <td><span class="badge-pill ${isPaid ? 'green' : 'amber'}">${isPaid ? 'PAID' : 'CASH'}</span></td>
        <td><span class="badge-pill ${job.status === 'completed' ? 'green' : 'blue'}">${job.status.toUpperCase()}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm btn-reprint" data-id="${job.id}">Reprint</button>
        </td>
      `;
      historyTableBody.appendChild(tr);
    });

    document.querySelectorAll('.btn-reprint').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const job = activeJobs.find((j) => j.id === id);
        if (job) {
          const originalText = e.currentTarget.textContent;
          e.currentTarget.disabled = true;
          e.currentTarget.textContent = '⏳ Printing...';
          try {
            await executePrint(job);
            e.currentTarget.textContent = '✓ Spooled';
            setTimeout(() => {
              e.currentTarget.disabled = false;
              e.currentTarget.textContent = originalText;
            }, 3000);
          } catch (err) {
            e.currentTarget.disabled = false;
            e.currentTarget.textContent = originalText;
          }
        }
      });
    });
  }

  historySearchInput.addEventListener('input', renderHistoryTable);

  btnExportJobs.addEventListener('click', () => {
    let csv = 'Token,Date,Customer,Phone,Pages,Copies,Mode,Amount,Payment,Status\n';
    activeJobs.forEach((j) => {
      csv += `"${j.token_number || ''}","${j.created_at || ''}","${j.customer_name || ''}","${j.customer_phone || ''}",${j.page_count || 1},${j.copies || 1},"${j.color_mode || 'B&W'}",${j.total_amount || 0},"${j.payment_status || ''}","${j.status || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quickprint_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast('Exported jobs log as CSV.', 'success');
  });

  // --- FINANCIALS & CONSUMPTION ---
  function updateFinancials() {
    let totalGross = 0;
    let upiGross = 0;
    let cashGross = 0;
    let bwPages = 0;
    let colorPages = 0;
    let duplexSheets = 0;
    let singleSheets = 0;
    let totalSheets = 0;

    activeJobs.forEach((j) => {
      const amt = j.total_amount || 0;
      totalGross += amt;
      if (j.payment_status === 'paid') upiGross += amt;
      else cashGross += amt;

      const copies = j.copies || 1;
      const pages = (j.page_count || 1) * copies;
      if (j.color_mode === 'color') colorPages += pages;
      else bwPages += pages;

      if (j.duplex) {
        const sheets = Math.ceil(pages / 2);
        duplexSheets += sheets;
        totalSheets += sheets;
      } else {
        singleSheets += pages;
        totalSheets += pages;
      }
    });

    kpiRevenue.textContent = `₹${totalGross.toFixed(2)}`;
    kpiPagesPrinted.textContent = `${totalSheets} Sheets`;

    finTotalRevenue.textContent = `₹${totalGross.toFixed(2)}`;
    finUpiRevenue.textContent = `₹${upiGross.toFixed(2)}`;
    finCashRevenue.textContent = `₹${cashGross.toFixed(2)}`;
    finPaperConsumed.textContent = `${totalSheets} A4`;

    finBwPages.textContent = bwPages;
    finColorPages.textContent = colorPages;
    finDuplexSheets.textContent = duplexSheets;
    finSingleSheets.textContent = singleSheets;
  }

  btnRefreshEarnings.addEventListener('click', () => {
    updateFinancials();
    showToast('Financial tallies refreshed.', 'info');
  });

  // --- PRICING CATALOG SAVE ---
  btnSavePricing.addEventListener('click', async () => {
    const elA3 = document.getElementById('ratePaperA3');
    const elLegal = document.getElementById('ratePaperLegal');
    const elA5 = document.getElementById('ratePaperA5');

    const elBond = document.getElementById('rateTypeBond');
    const elGlossy = document.getElementById('rateTypeGlossy');
    const elMatte = document.getElementById('rateTypeMatte');

    const elQHigh = document.getElementById('rateQualityHigh');
    const elQPhoto = document.getElementById('rateQualityPhotoGrade');

    const elP4x6 = document.getElementById('ratePhoto4x6');
    const elP5x7 = document.getElementById('ratePhoto5x7');
    const elP6x8 = document.getElementById('ratePhoto6x8');
    const elPPassport = document.getElementById('ratePhotoPassport');
    const elPA4 = document.getElementById('ratePhotoA4');

    const elPPMatte = document.getElementById('ratePhotoPaperMatte');
    const elPPPremium = document.getElementById('ratePhotoPaperPremium');

    const elPQHigh = document.getElementById('ratePhotoQualityHigh');
    const elPQStudio = document.getElementById('ratePhotoQualityStudio');

    const pricing = {
      rateBwSingle: parseFloat(rateBwSingle.value) || 2.0,
      rateBwDouble: parseFloat(rateBwDouble.value) || 3.0,
      rateColorSingle: parseFloat(rateColorSingle.value) || 10.0,
      rateColorDouble: parseFloat(rateColorDouble.value) || 18.0,
      rateSpiralBinding: parseFloat(rateSpiralBinding.value) || 30.0,
      rateStapling: parseFloat(rateStapling.value) || 2.0,
      paperSizes: {
        a4: { name: 'A4', extra: 0.0, enabled: true },
        a3: { name: 'A3', extra: parseFloat(elA3?.value || '4') || 0.0, enabled: true },
        a5: { name: 'A5', extra: parseFloat(elA5?.value || '0') || 0.0, enabled: true },
        legal: { name: 'Legal', extra: parseFloat(elLegal?.value || '2') || 0.0, enabled: true },
        letter: { name: 'Letter', extra: 0.0, enabled: true },
        custom: { name: 'Custom / Legal', extra: parseFloat(elLegal?.value || '2') || 0.0, enabled: true },
        passport: { name: 'Passport (8×)', extra: parseFloat(elPPassport?.value || '35') || 0.0, enabled: true },
      },
      paperTypes: {
        plain: { name: 'Plain Paper', extra: 0.0, enabled: true },
        bond: { name: 'Bond Paper', extra: parseFloat(elBond?.value || '2') || 0.0, enabled: true },
        glossy: { name: 'Glossy Paper', extra: parseFloat(elGlossy?.value || '10') || 0.0, enabled: true },
        photo_paper: { name: 'Photo Paper', extra: parseFloat(elGlossy?.value || '12') || 0.0, enabled: true },
        matte: { name: 'Matte Photo Paper', extra: parseFloat(elMatte?.value || '8') || 0.0, enabled: true },
      },
      qualities: {
        normal: { name: 'Normal', extra: 0.0, enabled: true },
        high: { name: 'High', extra: parseFloat(elQHigh?.value || '2') || 0.0, enabled: true },
        photo_grade: { name: 'Photo Grade', extra: parseFloat(elQPhoto?.value || '8') || 0.0, enabled: true },
      },
      photoSizes: {
        '4x6': { name: '4 × 6 inch', price: parseFloat(elP4x6?.value || '15') || 15.0, enabled: true },
        '5x7': { name: '5 × 7 inch', price: parseFloat(elP5x7?.value || '25') || 25.0, enabled: true },
        '6x8': { name: '6 × 8 inch', price: parseFloat(elP6x8?.value || '35') || 35.0, enabled: true },
        passport: { name: 'Passport Photo', price: parseFloat(elPPassport?.value || '35') || 35.0, enabled: true },
        a4_photo: { name: 'A4 Photo', price: parseFloat(elPA4?.value || '50') || 50.0, enabled: true },
      },
      photoPapers: {
        glossy: { name: 'Glossy', extra: 0.0, enabled: true },
        matte: { name: 'Matte', extra: parseFloat(elPPMatte?.value || '5') || 0.0, enabled: true },
        premium: { name: 'Premium Photo Paper', extra: parseFloat(elPPPremium?.value || '10') || 0.0, enabled: true },
      },
      photoQualities: {
        standard: { name: 'Standard', extra: 0.0, enabled: true },
        high: { name: 'High', extra: parseFloat(elPQHigh?.value || '5') || 0.0, enabled: true },
        photo_grade: { name: 'Photo Grade', extra: parseFloat(elPQStudio?.value || '10') || 0.0, enabled: true },
      },
    };

    btnSavePricing.disabled = true;
    btnSavePricing.textContent = 'Saving...';
    try {
      await window.quickprintApi.updatePricing(pricing);
      showToast('Pricing catalog updated & synced with customer kiosk!', 'success');
    } catch (e) {
      showToast('Failed to save rates.', 'danger');
    } finally {
      btnSavePricing.disabled = false;
      btnSavePricing.textContent = '💾 Save Rates to Cloud';
    }
  });

  // --- SETTINGS SAVE ---
  btnSaveSettings.addEventListener('click', async () => {
    const upiOn = cfgEnableUpi ? cfgEnableUpi.checked : true;
    const cashOn = cfgEnableCash ? cfgEnableCash.checked : true;

    if (!upiOn && !cashOn) {
      alert('⚠️ Configuration Warning:\n\nNo customer payment method is enabled! Enable at least one payment method (UPI or Cash) to accept orders.');
      showToast('Enable at least one payment method to accept orders!', 'danger');
      return;
    }

    const multiOn = cfgMultiPrinterMode ? cfgMultiPrinterMode.checked : false;
    const assignmentMode = cfgPrinterAssignmentMode ? cfgPrinterAssignmentMode.value : 'auto';
    const loadBalancingOn = cfgLoadBalancing ? cfgLoadBalancing.checked : true;

    multiPrinterConfig.multiPrinterMode = multiOn;
    multiPrinterConfig.printerAssignmentMode = assignmentMode;
    multiPrinterConfig.loadBalancing = loadBalancingOn;

    const settings = {
      autoLaunch: cfgAutoLaunch ? cfgAutoLaunch.checked : false,
      soundAlert: cfgSoundAlert ? cfgSoundAlert.checked : true,
      autoPrintDefault: cfgAutoPrintDefault ? cfgAutoPrintDefault.checked : false,
      shopName: cfgShopName ? cfgShopName.value.trim() : currentShop.name,
      shopSlug: cfgShopSlug ? cfgShopSlug.value.trim() : (currentShop.slug || 'counter'),
      paymentMethods: {
        enable_upi: upiOn,
        enable_cash: cashOn,
      },
      multiPrinterMode: multiOn,
      printerAssignmentMode: assignmentMode,
      loadBalancing: loadBalancingOn,
      printersConfig: multiPrinterConfig.printersConfig || {},
      autoCheckUpdates: cfgAutoCheckUpdates ? cfgAutoCheckUpdates.checked : true,
      updateChannel: cfgUpdateChannel ? cfgUpdateChannel.value : 'stable',
    };

    autoPrintEnabled = settings.autoPrintDefault;
    btnAutoPrintState.classList.toggle('active', autoPrintEnabled);
    btnAutoPrintState.textContent = autoPrintEnabled ? 'ON' : 'OFF';

    try {
      await window.quickprintApi.saveSettings(settings);
      showToast('Preferences & Multi-Printer configuration saved!', 'success');
      shopNameDisplay.textContent = settings.shopName || currentShop.name;
      applyMultiPrinterUIState();
      await renderShopQrAndUrls();
      await scanPrinters();
      renderQueue();
    } catch (e) {
      showToast('Failed to save preferences.', 'danger');
    }
  });

  // --- PRODUCTION AUTO-UPDATER & RELEASE PIPELINE (Requirements 6, 7, 8, 9, 16, 17, 18, 22) ---
  function formatUpdateSpeed(bytesPerSec) {
    if (!bytesPerSec || bytesPerSec < 1024) return `${bytesPerSec || 0} B/s`;
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  }

  function applyUpdateStatusUI(status) {
    if (!status) return;

    const installedVer = status.currentVersion || window.quickprintApi?.version || '2.4.0';
    if (lblInstalledVersion) lblInstalledVersion.textContent = installedVer;
    if (toastCurVer) toastCurVer.textContent = installedVer;

    switch (status.state) {
      case 'checking':
        if (updateStatusBadge) {
          updateStatusBadge.textContent = 'CHECKING...';
          updateStatusBadge.className = 'badge-chip grey';
        }
        break;

      case 'available':
        if (updateStatusBadge) {
          updateStatusBadge.textContent = 'UPDATE AVAILABLE';
          updateStatusBadge.className = 'badge-chip color';
        }
        if (updateActionPanel) updateActionPanel.style.display = 'block';
        if (updatePanelTitle) {
          updatePanelTitle.textContent = `QuickPrint Counter OS v${status.availableVersion} Available`;
        }
        if (updatePanelSubtitle) {
          updatePanelSubtitle.textContent = status.releaseNotes || 'Production update with stability enhancements and fixes.';
        }
        if (btnUpdateDownload) {
          btnUpdateDownload.style.display = 'inline-block';
          btnUpdateDownload.disabled = false;
          btnUpdateDownload.textContent = `Download v${status.availableVersion}`;
        }
        if (btnUpdateInstall) btnUpdateInstall.style.display = 'none';
        if (updateProgressBarContainer) updateProgressBarContainer.style.display = 'none';
        if (updatePrintNotice) updatePrintNotice.style.display = 'none';

        // Show unobtrusive notification banner (Requirement 7)
        if (updateToastBanner) {
          if (toastNewVer) toastNewVer.textContent = status.availableVersion || 'Latest';
          updateToastBanner.style.display = 'flex';
        }
        break;

      case 'downloading':
        if (updateStatusBadge) {
          updateStatusBadge.textContent = 'DOWNLOADING...';
          updateStatusBadge.className = 'badge-chip color';
        }
        if (updateActionPanel) updateActionPanel.style.display = 'block';
        if (btnUpdateDownload) {
          btnUpdateDownload.style.display = 'inline-block';
          btnUpdateDownload.disabled = true;
          btnUpdateDownload.textContent = 'Downloading...';
        }
        if (btnUpdateInstall) btnUpdateInstall.style.display = 'none';
        if (updateProgressBarContainer) updateProgressBarContainer.style.display = 'block';
        if (updateProgressBarFill) updateProgressBarFill.style.width = `${status.progress || 0}%`;
        if (updateProgressLabel) updateProgressLabel.textContent = `Downloading: ${status.progress || 0}%`;
        if (updateProgressSpeed) updateProgressSpeed.textContent = formatUpdateSpeed(status.bytesPerSecond);
        break;

      case 'downloaded':
        if (updateStatusBadge) {
          updateStatusBadge.textContent = 'READY TO INSTALL';
          updateStatusBadge.className = 'badge-chip color';
        }
        if (updateActionPanel) updateActionPanel.style.display = 'block';
        if (updatePanelTitle) updatePanelTitle.textContent = `Version ${status.availableVersion || ''} Downloaded & Verified`;
        if (updatePanelSubtitle) updatePanelSubtitle.textContent = 'Package verified. Click Restart & Install to apply update.';
        if (btnUpdateDownload) btnUpdateDownload.style.display = 'none';
        if (btnUpdateInstall) {
          btnUpdateInstall.style.display = 'inline-block';
          btnUpdateInstall.disabled = false;
          btnUpdateInstall.textContent = '🔄 Restart & Install Now';
        }
        if (updateProgressBarContainer) updateProgressBarContainer.style.display = 'none';
        if (updatePrintNotice) updatePrintNotice.style.display = 'none';
        break;

      case 'deferred':
        // Requirement 9: Print job actively in progress
        if (updateStatusBadge) {
          updateStatusBadge.textContent = 'PRINTING: UPDATE HELD';
          updateStatusBadge.className = 'badge-chip warning';
        }
        if (updateActionPanel) updateActionPanel.style.display = 'block';
        if (updatePrintNotice) updatePrintNotice.style.display = 'block';
        if (btnUpdateInstall) {
          btnUpdateInstall.disabled = true;
          btnUpdateInstall.textContent = 'Paused (Printing)';
        }
        break;

      case 'not-available':
        if (updateStatusBadge) {
          updateStatusBadge.textContent = 'UP TO DATE';
          updateStatusBadge.className = 'badge-chip color';
        }
        if (updateActionPanel) updateActionPanel.style.display = 'none';
        if (updateToastBanner) updateToastBanner.style.display = 'none';
        break;

      case 'error':
        if (updateStatusBadge) {
          updateStatusBadge.textContent = 'CHECK FAILED';
          updateStatusBadge.className = 'badge-chip grey';
        }
        if (btnUpdateDownload) {
          btnUpdateDownload.disabled = false;
          btnUpdateDownload.textContent = 'Retry Download';
        }
        break;

      default:
        break;
    }
  }

  // Check For Updates Button
  if (btnCheckForUpdates) {
    btnCheckForUpdates.addEventListener('click', async () => {
      btnCheckForUpdates.disabled = true;
      btnCheckForUpdates.textContent = 'Checking...';
      showToast('Checking GitHub Releases for QuickPrint updates...', 'info');

      try {
        if (window.quickprintApi?.checkForUpdates) {
          const res = await window.quickprintApi.checkForUpdates();
          if (res?.success) {
            showToast('Update check initiated.', 'info');
          } else {
            showToast(res?.error || 'Unable to reach update server. Local printing is unaffected.', 'warning');
          }
        } else {
          showToast('Updater unavailable in browser preview mode.', 'info');
        }
      } catch (err) {
        showToast('Update check notice: ' + err.message, 'warning');
      } finally {
        setTimeout(() => {
          btnCheckForUpdates.disabled = false;
          btnCheckForUpdates.textContent = 'Check for Updates';
        }, 3000);
      }
    });
  }

  // Download Update Button
  if (btnUpdateDownload) {
    btnUpdateDownload.addEventListener('click', async () => {
      btnUpdateDownload.disabled = true;
      btnUpdateDownload.textContent = 'Starting Download...';
      showToast('Starting background update download...', 'info');
      try {
        if (window.quickprintApi?.startUpdateDownload) {
          await window.quickprintApi.startUpdateDownload();
        }
      } catch (err) {
        showToast('Download failed: ' + err.message, 'danger');
        btnUpdateDownload.disabled = false;
      }
    });
  }

  // Restart & Install Update Button (Safe Print Guard: Requirement 9)
  if (btnUpdateInstall) {
    btnUpdateInstall.addEventListener('click', async () => {
      showToast('Verifying active spooler queue safety...', 'info');
      try {
        if (window.quickprintApi?.installUpdateNow) {
          const res = await window.quickprintApi.installUpdateNow();
          if (res?.deferred) {
            showToast(res.message || 'Print job actively printing. Update will install automatically after prints finish.', 'warning');
            if (updatePrintNotice) updatePrintNotice.style.display = 'block';
          }
        }
      } catch (err) {
        showToast('Install error: ' + err.message, 'danger');
      }
    });
  }

  // Toast Banner Actions
  if (btnToastUpdateNow) {
    btnToastUpdateNow.addEventListener('click', () => {
      if (updateToastBanner) updateToastBanner.style.display = 'none';
      const settingsNav = document.querySelector('.nav-item[data-view="settings"]');
      if (settingsNav) settingsNav.click();
      const updatesGroup = document.getElementById('settingsGroupUpdates');
      if (updatesGroup) updatesGroup.scrollIntoView({ behavior: 'smooth' });

      // Automatically initiate download if not started
      if (window.quickprintApi?.startUpdateDownload) {
        window.quickprintApi.startUpdateDownload().catch(() => {});
      }
    });
  }

  if (btnToastDismiss) {
    btnToastDismiss.addEventListener('click', () => {
      if (updateToastBanner) updateToastBanner.style.display = 'none';
    });
  }

  // Real-time update status listener
  if (window.quickprintApi?.onUpdateStatusChanged) {
    window.quickprintApi.onUpdateStatusChanged((statusData) => {
      applyUpdateStatusUI(statusData);
    });
  }

  // Settings multi-printer switch live listener
  if (cfgMultiPrinterMode) {
    cfgMultiPrinterMode.addEventListener('change', async () => {
      multiPrinterConfig.multiPrinterMode = cfgMultiPrinterMode.checked;
      applyMultiPrinterUIState();
      try {
        await window.quickprintApi.saveMultiPrinterConfig(multiPrinterConfig);
        showToast(`Multi-Printer Mode is now ${multiPrinterConfig.multiPrinterMode ? 'ENABLED' : 'DISABLED'}`, 'info');
      } catch (e) {}
      await scanPrinters();
      renderQueue();
    });
  }

  if (btnManagePrintersShortcut) {
    btnManagePrintersShortcut.addEventListener('click', () => {
      const printerNav = document.querySelector('.nav-item[data-view="printers"]');
      if (printerNav) printerNav.click();
    });
  }

  // --- RENDER QR CODE & MONITOR TV URLS ---
  async function renderShopQrAndUrls() {
    const shopSlug = currentShop?.qr_code_slug || currentShop?.slug || 'mahadev-printer-shop';
    currentShop.slug = shopSlug;
    currentShop.qr_code_slug = shopSlug;

    const baseUrl = (currentAppUrl || 'https://doc2print.vercel.app').replace(/\/+$/, '');
    const cleanDomain = getCleanDomain(baseUrl);

    if (shopSlugDisplay) shopSlugDisplay.textContent = `${cleanDomain}/kiosk/${shopSlug}`;
    if (cfgDomainPrefix) cfgDomainPrefix.textContent = `${cleanDomain}/kiosk/`;
    if (standeeShopNameDisplay) standeeShopNameDisplay.textContent = currentShop?.name || 'QuickPrint Counter';

    const kioskUrl = `${baseUrl}/kiosk/${shopSlug}`;
    if (qrUrlBadge) qrUrlBadge.textContent = kioskUrl;

    const qrImageDisplay = document.getElementById('qrImageDisplay');
    if (qrImageDisplay) {
      try {
        if (window.quickprintApi?.generateQrDataUrl) {
          const dataUrl = await window.quickprintApi.generateQrDataUrl(kioskUrl);
          if (dataUrl) {
            qrImageDisplay.src = dataUrl;
          } else {
            qrImageDisplay.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(kioskUrl)}`;
          }
        } else {
          qrImageDisplay.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(kioskUrl)}`;
        }
      } catch (err) {
        qrImageDisplay.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(kioskUrl)}`;
      }
    }

    const tvUrl = `${baseUrl}/tv/${shopSlug}`;
    const tvDisplayUrlInput = document.getElementById('tvDisplayUrlInput');
    const tvSmartTvUrl = document.getElementById('tvSmartTvUrl');
    if (tvDisplayUrlInput) tvDisplayUrlInput.value = tvUrl;
    if (tvSmartTvUrl) tvSmartTvUrl.textContent = `${cleanDomain}/tv/${shopSlug}`;
  }

  // --- MODAL: COUNTER QR & STANDEE (Requirements 29, 30, 31, 32, 33) ---
  btnShowCounterQR.addEventListener('click', async () => {
    await renderShopQrAndUrls();
    qrModal.classList.add('active');
  });

  btnCloseQrModal.addEventListener('click', () => {
    qrModal.classList.remove('active');
  });

  btnCopyKioskUrl.addEventListener('click', () => {
    const url = qrUrlBadge.textContent.trim();
    navigator.clipboard.writeText(url).then(() => {
      showToast('Customer Kiosk URL copied to clipboard!', 'success');
    });
  });

  btnPrintStandee.addEventListener('click', async () => {
    showToast('Printing Counter Standee ticket...', 'info');
    try {
      await window.quickprintApi.printTestPage(defaultPrinterName);
      showToast('Standee ticket spooled!', 'success');
    } catch (e) {
      showToast('Could not print standee.', 'danger');
    }
  });

  // Download high-resolution PNG QR (Requirement 30 & 32)
  if (btnDownloadQrPng) {
    btnDownloadQrPng.addEventListener('click', () => {
      const qrImg = document.getElementById('qrImageDisplay');
      if (!qrImg || !qrImg.src) {
        showToast('QR Code not ready yet.', 'warning');
        return;
      }
      const shopSlug = currentShop?.slug || currentShop?.qr_code_slug || 'quickprint-shop';
      const a = document.createElement('a');
      a.href = qrImg.src;
      a.download = `gaurprint-counter-qr-${shopSlug}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('Counter QR (PNG) downloaded for print materials!', 'success');
    });
  }

  // Download crisp vector SVG QR (Requirement 30 & 32)
  if (btnDownloadQrSvg) {
    btnDownloadQrSvg.addEventListener('click', async () => {
      const baseUrl = (currentAppUrl || 'https://doc2print.vercel.app').replace(/\/+$/, '');
      const shopSlug = currentShop?.slug || currentShop?.qr_code_slug || 'quickprint-shop';
      const kioskUrl = `${baseUrl}/kiosk/${shopSlug}`;
      showToast('Generating high-resolution vector SVG...', 'info');
      try {
        if (window.quickprintApi?.generateQrSvg) {
          const res = await window.quickprintApi.generateQrSvg(kioskUrl);
          if (res?.success && res.svg) {
            const blob = new Blob([res.svg], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gaurprint-standee-qr-${shopSlug}.svg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Vector SVG QR downloaded for signage/printing!', 'success');
            return;
          }
        }
        showToast('Could not generate SVG QR.', 'warning');
      } catch (err) {
        showToast('SVG download error: ' + err.message, 'danger');
      }
    });
  }

  // --- TV WAITING BOARD ACTIONS ---
  const btnOpenTvBoardTitle = document.getElementById('btnOpenTvBoardTitle');
  const btnLaunchTvWindow = document.getElementById('btnLaunchTvWindow');
  const btnCopyTvUrl = document.getElementById('btnCopyTvUrl');
  const btnOpenTvBrowser = document.getElementById('btnOpenTvBrowser');

  function openTvBoard() {
    const slug = currentShop?.slug || currentShop?.qr_code_slug || 'counter';
    if (window.quickprintApi?.openTvWindow) {
      window.quickprintApi.openTvWindow(slug);
    } else {
      window.open(`${currentAppUrl}/tv/${slug}`, '_blank');
    }
  }

  if (btnOpenTvBoardTitle) btnOpenTvBoardTitle.addEventListener('click', openTvBoard);
  if (btnLaunchTvWindow) btnLaunchTvWindow.addEventListener('click', openTvBoard);

  if (btnCopyTvUrl) {
    btnCopyTvUrl.addEventListener('click', () => {
      const slug = currentShop?.slug || currentShop?.qr_code_slug || 'counter';
      const tvUrl = `${currentAppUrl}/tv/${slug}`;
      navigator.clipboard.writeText(tvUrl).then(() => {
        showToast('TV Waiting Board URL copied to clipboard!', 'success');
      });
    });
  }

  if (btnOpenTvBrowser) {
    btnOpenTvBrowser.addEventListener('click', () => {
      const slug = currentShop?.slug || currentShop?.qr_code_slug || 'counter';
      const tvUrl = `${currentAppUrl}/tv/${slug}`;
      if (window.quickprintApi?.openExternal) {
        window.quickprintApi.openExternal(tvUrl);
      } else {
        window.open(tvUrl, '_blank');
      }
    });
  }

  // --- SIMULATE INCOMING TEST ORDER ---
  btnSimulateOrder.addEventListener('click', () => {
    const tokenNum = `A-${Math.floor(100 + Math.random() * 900)}`;
    const newJob = {
      id: 'demo-' + Date.now(),
      token_number: tokenNum,
      customer_name: ['Rohit Sharma', 'Anjali Gupta', 'Aman Verma', 'Kavita Joshi'][Math.floor(Math.random() * 4)],
      customer_phone: '98' + Math.floor(10000000 + Math.random() * 90000000),
      page_count: Math.floor(1 + Math.random() * 8),
      copies: 1,
      color_mode: Math.random() > 0.6 ? 'color' : 'bw',
      duplex: Math.random() > 0.5,
      paper_size: 'A4',
      total_amount: Math.floor(10 + Math.random() * 40),
      payment_status: Math.random() > 0.3 ? 'paid' : 'pending',
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    activeJobs.unshift(newJob);

    // Chime & toast
    if (cfgSoundAlert.checked && orderChime) {
      orderChime.play().catch(() => {});
    }
    showToast(`New Order: Token ${tokenNum} received!`, 'success');

    renderQueue();
    updateFinancials();

    // If auto-print enabled and paid, auto spool!
    if (autoPrintEnabled && newJob.payment_status === 'paid') {
      setTimeout(() => executePrint(newJob), 1200);
    }
  });

  // --- GLOBAL KEYBOARD SHORTCUTS ---
  document.addEventListener('keydown', (e) => {
    // Enter key: Print next pending job
    if (e.key === 'Enter' && !authOverlay.classList.contains('active') && !previewModal.classList.contains('active')) {
      if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT') {
        const nextJob = activeJobs.find((j) => j.status === 'pending' || j.status === 'paid');
        if (nextJob) {
          e.preventDefault();
          executePrint(nextJob);
        }
      }
    }

    // Escape key: Close modals
    if (e.key === 'Escape') {
      qrModal.classList.remove('active');
      previewModal.classList.remove('active');
    }
  });

  // --- LISTEN FOR REALTIME INCOMING JOBS FROM ELECTRON IPC ---
  if (window.quickprintApi?.onJobReceived) {
    window.quickprintApi.onJobReceived((incomingJob) => {
      const normalized = normalizeJob(incomingJob);
      activeJobs.unshift(normalized);
      if (cfgSoundAlert.checked && orderChime) {
        orderChime.play().catch(() => {});
      }
      showToast(`New Order Token ${normalized.token_number} received!`, 'success');
      renderQueue();
      updateFinancials();

      if (autoPrintEnabled && normalized.payment_status === 'paid') {
        executePrint(normalized);
      }
    });
  }

  // Real-time job status updates (Printing -> Spool Completed / Failed)
  if (window.quickprintApi?.onJobStatusUpdated) {
    window.quickprintApi.onJobStatusUpdated((data) => {
      const { jobId, status, error } = data;
      const job = activeJobs.find((j) => j.id === jobId);
      if (job) {
        if (status === 'completed') job.status = 'completed';
        else if (status === 'printing') job.status = 'printing';
        else if (status === 'failed') {
          job.status = 'failed';
          job.failure_reason = error;
        }
        renderQueue();
        updateFinancials();
      }
    });
  }

  // Real-time order update listener (e.g. payment confirmed, settings updated)
  if (window.quickprintApi?.onJobUpdated) {
    window.quickprintApi.onJobUpdated((updatedRaw) => {
      const updated = normalizeJob(updatedRaw);
      const idx = activeJobs.findIndex((j) => j.id === updated.id);
      if (idx >= 0) {
        activeJobs[idx] = { ...activeJobs[idx], ...updated };
      } else {
        activeJobs.unshift(updated);
      }
      renderQueue();
      updateFinancials();
    });
  }

  // --- LIVE PRINTER HEALTH & PERSISTENT STATUS HANDLING ---
  function updatePrinterHealthDisplay(health) {
    if (!health) return;
    const isOnline = health.isOnline && health.status === 'READY';
    const alertBanner = document.getElementById('printerOfflineAlertBanner');
    const bannerTitle = document.getElementById('offlineBannerTitle');
    const bannerDesc = document.getElementById('offlineBannerDesc');
    const diagName = document.getElementById('diagPrinterName');
    const diagConn = document.getElementById('diagPrinterConn');
    const diagQueue = document.getElementById('diagQueueCount');
    const diagCheck = document.getElementById('diagLastCheck');
    const diagBadge = document.getElementById('diagnosticHealthBadge');

    const printerLabel = health.printer || defaultPrinterName || 'Windows Spooler';
    if (diagName) diagName.textContent = printerLabel;
    if (diagQueue) diagQueue.textContent = `${health.jobCount || 0} in queue`;
    if (diagCheck) diagCheck.textContent = new Date().toLocaleTimeString();

    if (!isOnline) {
      if (alertBanner) {
        alertBanner.style.display = 'flex';
        if (bannerTitle) bannerTitle.textContent = `Printer Offline / Disconnected: "${printerLabel}"`;
        if (bannerDesc) bannerDesc.textContent = `${health.details || 'Printer power is off or USB/Wi-Fi is disconnected.'} Reconnect printer to process jobs.`;
      }
      if (diagConn) {
        diagConn.textContent = health.status || 'Offline';
        diagConn.style.color = '#DC2626';
      }
      if (diagBadge) {
        diagBadge.className = 'badge-chip red';
        diagBadge.textContent = `● ${health.status || 'OFFLINE'}`;
      }
      if (kpiSpoolerState) {
        kpiSpoolerState.textContent = health.status || 'OFFLINE';
        kpiSpoolerState.style.color = '#DC2626';
      }
    } else {
      if (alertBanner) alertBanner.style.display = 'none';
      if (diagConn) {
        diagConn.textContent = 'Online & Ready';
        diagConn.style.color = '#059669';
      }
      if (diagBadge) {
        diagBadge.className = 'badge-chip green';
        diagBadge.textContent = '● ONLINE & READY';
      }
      if (kpiSpoolerState) {
        kpiSpoolerState.textContent = 'READY';
        kpiSpoolerState.style.color = '#059669';
      }
    }
  }

  if (window.quickprintApi?.onPrinterStatusUpdated) {
    window.quickprintApi.onPrinterStatusUpdated((health) => {
      updatePrinterHealthDisplay(health);
    });
  }

  const btnRetryPrinter = document.getElementById('btnRetryPrinterConnection');
  if (btnRetryPrinter) {
    btnRetryPrinter.addEventListener('click', async () => {
      showToast('Checking hardware printer connection...', 'info');
      if (window.quickprintApi?.getPrinterHealth) {
        try {
          const health = await window.quickprintApi.getPrinterHealth(defaultPrinterName);
          updatePrinterHealthDisplay(health);
          if (health.isOnline && health.status === 'READY') {
            showToast(`Printer "${defaultPrinterName}" is now ONLINE and READY!`, 'success');
          } else {
            showToast(`Printer still offline: ${health.details || 'Check cables and power'}`, 'warning');
          }
        } catch (e) {
          showToast(`Health check error: ${e.message}`, 'danger');
        }
      }
    });
  }

  // --- LOCAL CUSTOMER MEDIA STORAGE MANAGEMENT ---
  async function refreshMediaStorageStats() {
    try {
      if (window.quickprintApi?.getMediaStorageStats) {
        const stats = await window.quickprintApi.getMediaStorageStats();
        const usedEl = document.getElementById('mediaStorageUsed');
        const countEl = document.getElementById('mediaStorageCount');
        if (usedEl) usedEl.textContent = stats.formattedSize || '0.00 MB';
        if (countEl) countEl.textContent = `${stats.fileCount || 0} files cached locally`;
      }
    } catch (e) {}
  }

  const btnRefreshMediaStats = document.getElementById('btnRefreshMediaStats');
  if (btnRefreshMediaStats) {
    btnRefreshMediaStats.addEventListener('click', async () => {
      await refreshMediaStorageStats();
      showToast('Local media storage stats refreshed.', 'info');
    });
  }

  const btnClearPrintedMedia = document.getElementById('btnClearPrintedMedia');
  if (btnClearPrintedMedia) {
    btnClearPrintedMedia.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to permanently clear local customer files for completed jobs?\n\nThis frees up computer disk space. All order history, tokens, revenue, and customer records will be safely preserved.')) return;
      try {
        const res = await window.quickprintApi.clearAllPrintedMedia();
        showToast(`Cleared local customer media for ${res.deletedCount || 0} completed orders!`, 'success');
        await refreshMediaStorageStats();
        await fetchJobs();
      } catch (err) {
        showToast('Error clearing printed media: ' + err.message, 'danger');
      }
    });
  }

  // --- STARTUP BOOTSTRAP ---
  loadSession().then(() => {
    refreshMediaStorageStats();
    if (window.quickprintApi?.getPrinterHealth) {
      window.quickprintApi.getPrinterHealth(defaultPrinterName).then((h) => updatePrinterHealthDisplay(h));
    }
  });
})();
