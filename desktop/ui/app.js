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
        else if (pStatus === 'failed') {
          const isRealJam = (job.failure_reason || '').toLowerCase().includes('jam');
          badgeHtml = `<span class="page-badge red">${isRealJam ? '⚠️ Paper Jam' : '⚠️ Print Failed'}</span>`;
        }

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

    // Initialize: First targeted page is 'printing', remaining targeted pages stay 'pending'
    targetedPages.forEach((p, idx) => {
      jobPagesStatus[job.id][p] = idx === 0 ? 'printing' : 'pending';
    });

    renderQueue();
    renderHistoryTable();

    // Select target printer based on mode (Requirement 14, 15, 24)
    const targetPrinter = (multiPrinterConfig.multiPrinterMode && job.assigned_printer)
      ? job.assigned_printer
      : (defaultPrinterName || 'Default Printer');

    const rangeLabel = printOptions.pageRange ? ` (Pages ${printOptions.pageRange})` : '';
    showToast(`Sending Token ${job.token_number || ''}${rangeLabel} to ${targetPrinter}...`, 'info');

    // Launch hardware print job
    let spoolFinished = false;
    let spoolError = null;

    const printPromise = window.quickprintApi.printJob(job.id, {
      printerName: targetPrinter,
      fileUrl: job.file_url,
      copies: job.copies || 1,
      duplex: job.duplex,
      paperSize: (job.paper_size || 'A4').split(' + ')[0],
      pageRange: printOptions.pageRange,
    }).then((res) => {
      spoolFinished = true;
      if (!res?.success) spoolError = res?.error || 'Spooler failed';
      return res;
    }).catch((err) => {
      spoolFinished = true;
      spoolError = err.message;
      return { success: false, error: err.message };
    });

    try {
      // Step-by-step sequential page progression
      const delayMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const pageDelay = Math.max(1800, Math.min(2800, Math.round(9000 / targetedPages.length)));

      for (let i = 0; i < targetedPages.length; i++) {
        const currPage = targetedPages[i];
        jobPagesStatus[job.id][currPage] = 'printing';
        renderQueue();

        await delayMs(pageDelay);

        if (spoolFinished && spoolError) {
          break;
        }

        jobPagesStatus[job.id][currPage] = 'completed';
        renderQueue();
      }

      // Ensure physical print spooler verification has finished
      const res = await printPromise;

      if (res && res.success) {
        showToast(`Token ${job.token_number || ''}${rangeLabel} printed & verified!`, 'success');
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
        const errText = res?.error || spoolError || 'Spooler error';
        targetedPages.forEach((p) => {
          if (jobPagesStatus[job.id][p] !== 'completed') {
            jobPagesStatus[job.id][p] = 'failed';
          }
        });
        job.status = 'failed';
        job.failure_reason = errText;
        renderQueue();
        renderHistoryTable();
        showToast(`Spool error: ${errText}`, 'danger');
      }
    } catch (e) {
      targetedPages.forEach((p) => {
        if (jobPagesStatus[job.id][p] !== 'completed') {
          jobPagesStatus[job.id][p] = 'failed';
        }
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

  // --- STATE EXTENSIONS FOR AUDIT & FINANCIALS ---
  let currentHistoryFilter = 'all';
  let currentHistoryTimeRange = 'all';
  let currentEarningsRange = 'today';
  let activeAuditJob = null;

  // Helper: Test if two dates represent the same local calendar day
  function isSameCalendarDay(d1, d2) {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  // Helper: Relative time string (e.g., 'Just now', '15m ago', '2h ago')
  function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    const days = Math.floor(diffSec / 86400);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  // Helper: Filter jobs by timeframe
  function filterJobsByTimeframe(jobs, range) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return jobs.filter((j) => {
      if (!j.created_at) return true;
      const jDate = new Date(j.created_at);
      if (isNaN(jDate.getTime())) return true;

      if (range === 'today') return isSameCalendarDay(jDate, today);
      if (range === 'yesterday') return isSameCalendarDay(jDate, yesterday);
      if (range === 'week') return jDate >= weekAgo;
      if (range === 'month') return jDate >= startOfMonth;
      return true; // 'all'
    });
  }

  // --- ENHANCED PRINT JOBS LOG & AUDIT TRAIL ---
  function renderHistoryTable() {
    const term = (historySearchInput?.value || '').toLowerCase().trim();
    const timeRangeSelect = document.getElementById('historyTimeRangeSelect');
    currentHistoryTimeRange = timeRangeSelect ? timeRangeSelect.value : 'all';

    // 1. Timeframe filter
    let baseTimeJobs = filterJobsByTimeframe(activeJobs, currentHistoryTimeRange);

    // 2. Calculate Audit Strip KPIs across the selected timeframe
    let totalGrossRev = 0;
    let totalPagesCount = 0;
    let totalSheetsCount = 0;
    let upiRevCount = 0;
    let cashRevCount = 0;
    let completedCount = 0;
    let failedCount = 0;

    let filterAllCount = 0;
    let filterCompCount = 0;
    let filterFailCount = 0;
    let filterUpiCount = 0;
    let filterCashCount = 0;

    baseTimeJobs.forEach((j) => {
      filterAllCount++;
      const isCompleted = j.status === 'completed';
      const isFailed = j.status === 'failed';
      const isPaid = j.payment_status === 'paid';
      const isCash = j.payment_mode === 'cash' || !isPaid;

      if (isCompleted) filterCompCount++;
      if (isFailed) filterFailCount++;
      if (isPaid) filterUpiCount++;
      if (isCash) filterCashCount++;

      const amt = j.total_amount || 0;
      totalGrossRev += amt;
      if (isPaid) upiRevCount += amt;
      else cashRevCount += amt;

      const copies = j.copies || 1;
      const pages = (j.page_count || 1) * copies;
      totalPagesCount += pages;

      if (j.duplex) {
        totalSheetsCount += Math.ceil(pages / 2);
      } else {
        totalSheetsCount += pages;
      }

      if (isCompleted) completedCount++;
      if (isFailed) failedCount++;
    });

    // Update Filter Pill counts
    const elAll = document.getElementById('histFilterAllCount');
    const elComp = document.getElementById('histFilterCompCount');
    const elFail = document.getElementById('histFilterFailCount');
    const elUpi = document.getElementById('histFilterUpiCount');
    const elCash = document.getElementById('histFilterCashCount');
    if (elAll) elAll.textContent = filterAllCount;
    if (elComp) elComp.textContent = filterCompCount;
    if (elFail) elFail.textContent = filterFailCount;
    if (elUpi) elUpi.textContent = filterUpiCount;
    if (elCash) elCash.textContent = filterCashCount;

    // Update Top Audit KPI Strip
    const elHistTotal = document.getElementById('histKpiTotalOrders');
    const elHistCompSub = document.getElementById('histKpiCompletedSub');
    const elHistRev = document.getElementById('histKpiTotalRevenue');
    const elHistPages = document.getElementById('histKpiTotalPages');
    const elHistSheets = document.getElementById('histKpiSheetsSub');
    const elHistSplit = document.getElementById('histKpiPaymentSplit');
    const elHistUpiRatio = document.getElementById('histKpiUpiRatio');
    const elHistSuccess = document.getElementById('histKpiSuccessRate');
    const elHistSuccessSub = document.getElementById('histKpiSuccessSub');

    if (elHistTotal) elHistTotal.textContent = `${baseTimeJobs.length} Orders`;
    if (elHistCompSub) elHistCompSub.textContent = `${completedCount} completed • ${failedCount} errors`;
    if (elHistRev) elHistRev.textContent = `₹${totalGrossRev.toFixed(2)}`;
    if (elHistPages) elHistPages.textContent = `${totalPagesCount} Pages`;
    if (elHistSheets) elHistSheets.textContent = `${totalSheetsCount} physical sheets`;
    if (elHistSplit) elHistSplit.textContent = `₹${upiRevCount.toFixed(0)} UPI / ₹${cashRevCount.toFixed(0)} Cash`;

    const upiRatio = totalGrossRev > 0 ? Math.round((upiRevCount / totalGrossRev) * 100) : 0;
    if (elHistUpiRatio) elHistUpiRatio.textContent = `${upiRatio}% digital adoption`;

    const totalFinished = completedCount + failedCount;
    const successRate = totalFinished > 0 ? Math.round((completedCount / totalFinished) * 100) : 100;
    if (elHistSuccess) elHistSuccess.textContent = `${successRate}%`;
    if (elHistSuccessSub) elHistSuccessSub.textContent = failedCount === 0 ? 'Zero spool failures' : `${failedCount} hardware errors`;

    // 3. Filter by Active Tab Pill
    let filteredRows = baseTimeJobs.filter((j) => {
      if (currentHistoryFilter === 'completed') return j.status === 'completed';
      if (currentHistoryFilter === 'failed') return j.status === 'failed';
      if (currentHistoryFilter === 'upi') return j.payment_status === 'paid';
      if (currentHistoryFilter === 'cash') return j.payment_mode === 'cash' || j.payment_status === 'pending';
      return true;
    });

    // 4. Filter by Search Query
    if (term) {
      filteredRows = filteredRows.filter((j) => {
        const tNum = (j.token_number || '').toLowerCase();
        const fName = (j.file_name || '').toLowerCase();
        const cName = (j.customer_name || '').toLowerCase();
        const cPhone = (j.customer_phone || '').toLowerCase();
        const jId = (j.id || '').toLowerCase();
        return (
          tNum.includes(term) ||
          fName.includes(term) ||
          cName.includes(term) ||
          cPhone.includes(term) ||
          jId.includes(term)
        );
      });
    }

    historyTableBody.innerHTML = '';
    if (filteredRows.length === 0) {
      historyTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:32px; color:#64748B;">No matching print records found for the selected audit filter.</td></tr>`;
      return;
    }

    filteredRows.forEach((job) => {
      const tr = document.createElement('tr');

      // Date & Time formatting
      const createdDate = job.created_at ? new Date(job.created_at) : null;
      const timeMain = createdDate
        ? createdDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
          ' ' +
          createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '—';
      const timeRelative = createdDate ? formatRelativeTime(job.created_at) : '';

      // Media info & storage badge
      const isLocalMedia = job.local_media_status === 'available';
      const rawExt = (job.file_name || 'doc').split('.').pop().toUpperCase();
      const fileSize = job.file_size_bytes
        ? (job.file_size_bytes / 1024).toFixed(0) + ' KB'
        : job.file_size
        ? (job.file_size / 1024).toFixed(0) + ' KB'
        : 'Document';

      // Page & Sheets calculations
      const copies = job.copies || 1;
      const pages = job.page_count || 1;
      const isDuplex = Boolean(job.duplex);
      const totalSheets = isDuplex ? Math.ceil(pages / 2) * copies : pages * copies;

      // Specs & Finishing
      const isColor = (job.color_mode || 'bw').toLowerCase() === 'color';
      const rawPaper = (job.paper_size || 'A4').split(' + ')[0];
      const assignedPrinter = job.assigned_printer || defaultPrinterName || 'Windows Spooler';

      // Payment details
      const isPaid = job.payment_status === 'paid';
      const paymentChannel = job.payment_mode === 'cash' ? 'Cash Counter 💵' : 'UPI (Online) ✓';

      // Status badge
      let statusBadge = '';
      if (job.status === 'completed') {
        statusBadge = `<span class="badge-chip green" style="font-weight:700;">✓ COMPLETED</span>`;
      } else if (job.status === 'failed') {
        statusBadge = `<span class="badge-chip red" style="font-weight:700;" title="${job.failure_reason || 'Print failure'}">⚠️ FAILED</span>`;
      } else if (job.status === 'printing') {
        statusBadge = `<span class="badge-chip blue" style="font-weight:700;">⏳ PRINTING</span>`;
      } else {
        statusBadge = `<span class="badge-chip amber" style="font-weight:700;">QUEUED</span>`;
      }

      tr.innerHTML = `
        <td>
          <div class="cell-token-pill">
            <span class="token-cell" style="font-size:14px;">${job.token_number || '#' + (job.id || '').substring(0, 4)}</span>
          </div>
          <span style="font-size:10.5px; color:#94A3B8; font-family:monospace; display:block;">#${(job.id || '').substring(0, 8)}</span>
        </td>
        <td>
          <div class="cell-time-group">
            <span class="cell-time-main">${timeMain}</span>
            <span class="cell-time-sub">${timeRelative}</span>
          </div>
        </td>
        <td>
          <div class="cell-doc-group">
            <span class="cell-doc-name" title="${job.file_name || job.customer_name || 'Document'}">${job.file_name || job.customer_name || 'Document'}</span>
            <div class="cell-doc-meta">
              <span>${rawExt} • ${fileSize}</span>
              <span class="badge-storage ${isLocalMedia ? 'local' : 'purged'}">
                ${isLocalMedia ? 'Local Disk 💾' : 'Cloud Purged ☁️'}
              </span>
            </div>
          </div>
        </td>
        <td>
          <strong style="color:var(--text-primary); font-size:13px;">${pages}p × ${copies}c</strong>
          <span style="font-size:11px; color:#64748B; display:block;">${totalSheets} Sheets (${isDuplex ? 'Duplex' : 'Single'})</span>
        </td>
        <td>
          <div style="display:flex; flex-direction:column; gap:3px;">
            <div style="display:flex; gap:4px; align-items:center;">
              <span class="badge-chip ${isColor ? 'amber' : 'grey'}" style="font-size:10.5px; padding:2px 6px;">
                ${isColor ? 'Color' : 'B&W'}
              </span>
              <span style="font-size:11.5px; font-weight:600; color:var(--text-secondary);">${rawPaper}</span>
            </div>
            <span style="font-size:11px; color:#64748B;">${isDuplex ? 'Double Sided' : 'Single Sided'}</span>
          </div>
        </td>
        <td>
          <span style="font-size:12px; font-weight:600; color:var(--text-secondary); max-width:140px; overflow:hidden; text-overflow:ellipsis; display:block;" title="${assignedPrinter}">
            🖨️ ${assignedPrinter}
          </span>
        </td>
        <td>
          <div style="display:flex; flex-direction:column; gap:2px;">
            <strong style="font-size:14px; color:var(--text-primary);">₹${(job.total_amount || 0).toFixed(2)}</strong>
            <span class="badge-chip ${isPaid ? 'green' : 'amber'}" style="font-size:10px; padding:1px 6px; width:fit-content;">
              ${paymentChannel}
            </span>
          </div>
        </td>
        <td>${statusBadge}</td>
        <td style="text-align: right;">
          <div style="display:flex; gap:6px; justify-content:flex-end; align-items:center;">
            <button class="btn btn-secondary btn-sm btn-audit-detail" data-id="${job.id}" title="Inspect complete technical breakdown and receipt">
              📄 Details
            </button>
            <button class="btn btn-secondary btn-sm btn-audit-preview" data-id="${job.id}" ${!isLocalMedia ? 'disabled style="opacity:0.5;" title="File was purged from cloud storage"' : 'title="View high-speed document preview"'}>
              👁️ Preview
            </button>
            ${
              isLocalMedia
                ? `<button class="btn btn-secondary btn-sm btn-delete-job-media" data-id="${job.id}" title="Delete local file from counter disk to free space">🗑️</button>`
                : ''
            }
          </div>
        </td>
      `;

      historyTableBody.appendChild(tr);
    });

    // Bind Details modal buttons
    document.querySelectorAll('.btn-audit-detail').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const job = activeJobs.find((j) => j.id === id);
        if (job) openJobAuditModal(job);
      });
    });

    // Bind Preview modal buttons
    document.querySelectorAll('.btn-audit-preview').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const job = activeJobs.find((j) => j.id === id);
        if (job && job.local_media_status !== 'deleted') {
          openPreviewModal(job);
        }
      });
    });

    // Bind Delete media buttons
    document.querySelectorAll('#historyTableBody .btn-delete-job-media').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('Delete local customer file from counter disk to save space? (Order ledger record will remain intact)')) {
          if (window.quickprintApi?.deleteLocalJobMedia) {
            await window.quickprintApi.deleteLocalJobMedia(id);
          }
          const job = activeJobs.find((j) => j.id === id);
          if (job) job.local_media_status = 'deleted';
          renderHistoryTable();
          renderQueue();
          showToast('Local media deleted. Disk space freed.', 'success');
        }
      });
    });
  }

  // --- JOB AUDIT MODAL LOGIC ---
  function openJobAuditModal(job) {
    activeAuditJob = job;
    const modal = document.getElementById('jobAuditModal');
    const title = document.getElementById('auditModalTitle');
    const sub = document.getElementById('auditModalSub');
    const body = document.getElementById('auditModalBody');
    const storageBadge = document.getElementById('auditStorageBadge');
    if (!modal || !body) return;

    title.textContent = `Order Audit — Token ${job.token_number || '#' + (job.id || '').substring(0, 4)}`;
    sub.textContent = `Permanent ID: ${job.id || 'N/A'}`;

    const createdStr = job.created_at ? new Date(job.created_at).toLocaleString() : 'N/A';
    const completedStr = job.completed_at
      ? new Date(job.completed_at).toLocaleString()
      : job.status === 'completed'
      ? 'Verified Spooled & Complete'
      : 'Pending Hardware Ejection';
    const isPaid = job.payment_status === 'paid';
    const isLocal = job.local_media_status === 'available';
    const rawPaper = (job.paper_size || 'A4').split(' + ')[0];
    const isDuplex = Boolean(job.duplex);
    const colorMode = (job.color_mode || 'bw').toLowerCase() === 'color' ? 'Full Color Vibrant' : 'Black & White Laser';
    const totalSheets = isDuplex ? Math.ceil((job.page_count || 1) / 2) * (job.copies || 1) : (job.page_count || 1) * (job.copies || 1);

    storageBadge.textContent = isLocal ? 'Stored on Counter Disk 💾' : 'Auto-Purged from Cloud ☁️';
    storageBadge.className = `badge-chip ${isLocal ? 'green' : 'grey'}`;

    body.innerHTML = `
      <div class="audit-grid-2col">
        <!-- Section 1: Customer & Document -->
        <div class="audit-section-box">
          <div class="audit-sec-title">📄 Document & Customer Info</div>
          <div class="audit-field-row">
            <span class="audit-field-label">Customer / File:</span>
            <span class="audit-field-val" style="max-width:180px; overflow:hidden; text-overflow:ellipsis;" title="${job.file_name || ''}">${job.customer_name || job.file_name || 'Walk-in Customer'}</span>
          </div>
          <div class="audit-field-row">
            <span class="audit-field-label">Contact / Phone:</span>
            <span class="audit-field-val">${job.customer_phone || 'Walk-in (Counter Kiosk)'}</span>
          </div>
          <div class="audit-field-row">
            <span class="audit-field-label">File Type:</span>
            <span class="audit-field-val">${(job.file_type || (job.file_name || '').split('.').pop() || 'PDF').toUpperCase()}</span>
          </div>
          <div class="audit-field-row">
            <span class="audit-field-label">File Size:</span>
            <span class="audit-field-val">${job.file_size_bytes ? (job.file_size_bytes / 1024).toFixed(1) + ' KB' : (job.file_size ? (job.file_size / 1024).toFixed(1) + ' KB' : 'Standard')}</span>
          </div>
          <div class="audit-field-row">
            <span class="audit-field-label">Order Intake Channel:</span>
            <span class="audit-field-val">Customer Self-Serve Kiosk</span>
          </div>
        </div>

        <!-- Section 2: Production & Hardware Specs -->
        <div class="audit-section-box">
          <div class="audit-sec-title">🖨️ Production & Spool Specs</div>
          <div class="audit-field-row">
            <span class="audit-field-label">Pages / Copies:</span>
            <span class="audit-field-val">${job.page_count || 1} Pages × ${job.copies || 1} Copy</span>
          </div>
          <div class="audit-field-row">
            <span class="audit-field-label">Paper Consumed:</span>
            <span class="audit-field-val"><strong>${totalSheets} Sheets</strong> (${isDuplex ? 'Duplex Double-Sided' : 'Single-Sided'})</span>
          </div>
          <div class="audit-field-row">
            <span class="audit-field-label">Paper Size & Type:</span>
            <span class="audit-field-val">${rawPaper} • Plain / Bond</span>
          </div>
          <div class="audit-field-row">
            <span class="audit-field-label">Color Mode:</span>
            <span class="audit-field-val">${colorMode}</span>
          </div>
          <div class="audit-field-row">
            <span class="audit-field-label">Routed Device:</span>
            <span class="audit-field-val">${job.assigned_printer || defaultPrinterName || 'Windows Spooler'}</span>
          </div>
        </div>
      </div>

      <div class="audit-grid-2col">
        <!-- Section 3: Financial Settlement -->
        <div class="audit-section-box">
          <div class="audit-sec-title">💳 Financial & Payment Audit</div>
          <div class="audit-field-row">
            <span class="audit-field-label">Payment Channel:</span>
            <span class="audit-field-val">${job.payment_mode === 'cash' ? 'Cash at Counter 💵' : 'UPI Online Settlement 📲'}</span>
          </div>
          <div class="audit-field-row">
            <span class="audit-field-label">Settlement Status:</span>
            <span class="audit-field-val"><span class="badge-chip ${isPaid ? 'green' : 'amber'}">${isPaid ? 'PAID & VERIFIED ✓' : 'PENDING CASH COLLECTION'}</span></span>
          </div>
          <div class="audit-field-row">
            <span class="audit-field-label">Per Page Rate Applied:</span>
            <span class="audit-field-val">₹${((job.total_amount || 0) / Math.max(1, (job.page_count || 1) * (job.copies || 1))).toFixed(2)} / page</span>
          </div>
          <div class="audit-cost-total-row">
            <span style="font-weight:700; color:var(--text-primary); font-size:13px;">Total Gross Revenue:</span>
            <span class="audit-cost-total-val">₹${(job.total_amount || 0).toFixed(2)}</span>
          </div>
        </div>

        <!-- Section 4: Lifecycle & Storage Audit -->
        <div class="audit-section-box">
          <div class="audit-sec-title">⏱️ Lifecycle & Security Audit</div>
          <div class="audit-field-row">
            <span class="audit-field-label">Order Created:</span>
            <span class="audit-field-val">${createdStr}</span>
          </div>
          <div class="audit-field-row">
            <span class="audit-field-label">Spool Clearance:</span>
            <span class="audit-field-val">${completedStr}</span>
          </div>
          <div class="audit-field-row">
            <span class="audit-field-label">Cloud Privacy:</span>
            <span class="audit-field-val"><span class="badge-chip green">Zero Cloud Retention ✓</span></span>
          </div>
          <div class="audit-field-row">
            <span class="audit-field-label">Hardware Status:</span>
            <span class="audit-field-val"><span class="badge-chip ${job.status === 'completed' ? 'green' : job.status === 'failed' ? 'red' : 'blue'}">${(job.status || 'QUEUED').toUpperCase()}</span></span>
          </div>
          ${job.failure_reason ? `
          <div class="audit-field-row" style="color:#DC2626;">
            <span class="audit-field-label" style="color:#DC2626;">Failure Reason:</span>
            <span class="audit-field-val" style="color:#DC2626; max-width:180px;">${job.failure_reason}</span>
          </div>` : ''}
        </div>
      </div>
    `;

    modal.classList.add('active');
  }

  // Bind History filter pills & controls
  const historyFilterButtons = document.querySelectorAll('#historyFilterPills .filter-pill');
  historyFilterButtons.forEach((pill) => {
    pill.addEventListener('click', () => {
      historyFilterButtons.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      currentHistoryFilter = pill.getAttribute('data-hist-filter') || 'all';
      renderHistoryTable();
    });
  });

  const histTimeSelect = document.getElementById('historyTimeRangeSelect');
  if (histTimeSelect) {
    histTimeSelect.addEventListener('change', renderHistoryTable);
  }

  if (historySearchInput) {
    historySearchInput.addEventListener('input', renderHistoryTable);
  }

  // Audit modal close buttons
  const btnCloseAuditModal = document.getElementById('btnCloseAuditModal');
  const btnAuditClose = document.getElementById('btnAuditClose');
  const btnAuditPreview = document.getElementById('btnAuditPreview');

  if (btnCloseAuditModal) {
    btnCloseAuditModal.addEventListener('click', () => {
      document.getElementById('jobAuditModal')?.classList.remove('active');
    });
  }
  if (btnAuditClose) {
    btnAuditClose.addEventListener('click', () => {
      document.getElementById('jobAuditModal')?.classList.remove('active');
    });
  }
  if (btnAuditPreview) {
    btnAuditPreview.addEventListener('click', () => {
      if (activeAuditJob && activeAuditJob.local_media_status !== 'deleted') {
        document.getElementById('jobAuditModal')?.classList.remove('active');
        openPreviewModal(activeAuditJob);
      } else {
        showToast('Media file has been purged from disk.', 'info');
      }
    });
  }

  // Export CSV
  if (btnExportJobs) {
    btnExportJobs.addEventListener('click', () => {
      let csv = 'Token,Order_ID,Date_Time,Customer,Phone,File_Name,Pages,Copies,Total_Sheets,Color_Mode,Duplex,Paper_Size,Amount_INR,Payment_Mode,Payment_Status,Print_Status\n';
      activeJobs.forEach((j) => {
        const isDuplex = Boolean(j.duplex);
        const sheets = isDuplex ? Math.ceil((j.page_count || 1) / 2) * (j.copies || 1) : (j.page_count || 1) * (j.copies || 1);
        csv += `"${j.token_number || ''}","${j.id || ''}","${j.created_at || ''}","${(j.customer_name || '').replace(/"/g, '""')}","${j.customer_phone || ''}","${(j.file_name || '').replace(/"/g, '""')}",${j.page_count || 1},${j.copies || 1},${sheets},"${j.color_mode || 'bw'}",${isDuplex},"${j.paper_size || 'A4'}",${(j.total_amount || 0).toFixed(2)},"${j.payment_mode || 'upi'}","${j.payment_status || 'paid'}","${j.status || 'completed'}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QuickPrint_Audit_Log_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      showToast('Exported complete print jobs audit trail as CSV.', 'success');
    });
  }

  // --- EXECUTIVE DAILY FINANCIALS & EARNINGS DASHBOARD ---
  function updateFinancials() {
    // 1. Filter jobs by current timeframe
    const periodJobs = filterJobsByTimeframe(activeJobs, currentEarningsRange);

    let totalGross = 0;
    let upiGross = 0;
    let cashGross = 0;
    let bwPages = 0;
    let colorPages = 0;
    let duplexSheets = 0;
    let singleSheets = 0;
    let totalSheets = 0;
    let completedCount = 0;

    periodJobs.forEach((j) => {
      const amt = j.total_amount || 0;
      totalGross += amt;
      if (j.payment_status === 'paid') upiGross += amt;
      else cashGross += amt;

      const copies = j.copies || 1;
      const pages = (j.page_count || 1) * copies;
      if ((j.color_mode || '').toLowerCase() === 'color') colorPages += pages;
      else bwPages += pages;

      if (j.duplex) {
        const sheets = Math.ceil(pages / 2);
        duplexSheets += sheets;
        totalSheets += sheets;
      } else {
        singleSheets += pages;
        totalSheets += pages;
      }

      if (j.status === 'completed') completedCount++;
    });

    const upiPercent = totalGross > 0 ? Math.round((upiGross / totalGross) * 100) : 0;
    const cashPercent = totalGross > 0 ? Math.round((cashGross / totalGross) * 100) : 0;
    const aov = periodJobs.length > 0 ? totalGross / periodJobs.length : 0;
    const avgPagesPerOrder = periodJobs.length > 0 ? (totalSheets / periodJobs.length).toFixed(1) : '0';
    const reamFraction = (totalSheets / 500).toFixed(2);

    // Period Banner & Labels
    const rangeLabels = {
      today: 'Today',
      yesterday: 'Yesterday',
      week: 'Last 7 Days',
      month: 'This Month',
      all: 'All Recorded History',
    };
    const periodLabelEl = document.getElementById('earningsPeriodLabel');
    const ordersCountBadge = document.getElementById('earningsOrdersCountBadge');
    if (periodLabelEl) {
      periodLabelEl.innerHTML = `Showing financial metrics for: <strong>${rangeLabels[currentEarningsRange] || 'Today'}</strong>`;
    }
    if (ordersCountBadge) {
      ordersCountBadge.textContent = `${periodJobs.length} Orders Processed`;
    }

    // Update Top Queue KPIs (for live header/sidebar)
    if (kpiRevenue) kpiRevenue.textContent = `₹${totalGross.toFixed(2)}`;
    if (kpiPagesPrinted) kpiPagesPrinted.textContent = `${totalSheets} Sheets`;

    // 5 Executive Financial KPI Cards
    const elFinTotal = document.getElementById('finTotalRevenue');
    const elFinRevSub = document.getElementById('finRevenueSub');
    const elFinUpi = document.getElementById('finUpiRevenue');
    const elFinUpiPercent = document.getElementById('finUpiPercent');
    const elFinCash = document.getElementById('finCashRevenue');
    const elFinCashPercent = document.getElementById('finCashPercent');
    const elFinPaper = document.getElementById('finPaperConsumed');
    const elFinReam = document.getElementById('finReamPercent');
    const elFinAov = document.getElementById('finAvgOrderValue');
    const elFinAvgPages = document.getElementById('finAvgPagesSub');

    if (elFinTotal) elFinTotal.textContent = `₹${totalGross.toFixed(2)}`;
    if (elFinRevSub) elFinRevSub.textContent = `${completedCount} completed of ${periodJobs.length} orders`;
    if (elFinUpi) elFinUpi.textContent = `₹${upiGross.toFixed(2)}`;
    if (elFinUpiPercent) elFinUpiPercent.textContent = `${upiPercent}%`;
    if (elFinCash) elFinCash.textContent = `₹${cashGross.toFixed(2)}`;
    if (elFinCashPercent) elFinCashPercent.textContent = `${cashPercent}%`;
    if (elFinPaper) elFinPaper.textContent = `${totalSheets} Sheets`;
    if (elFinReam) elFinReam.textContent = `${reamFraction} Ream`;
    if (elFinAov) elFinAov.textContent = `₹${aov.toFixed(2)}`;
    if (elFinAvgPages) elFinAvgPages.textContent = `${avgPagesPerOrder} sheets / order avg`;

    // Paper Breakdown numbers
    if (finBwPages) finBwPages.textContent = bwPages;
    if (finColorPages) finColorPages.textContent = colorPages;
    if (finDuplexSheets) finDuplexSheets.textContent = duplexSheets;
    if (finSingleSheets) finSingleSheets.textContent = singleSheets;

    const elBwRevExtra = document.getElementById('finBwRevenueExtra');
    const elColorRevExtra = document.getElementById('finColorRevenueExtra');
    const elDuplexSaved = document.getElementById('finDuplexSavedExtra');
    if (elBwRevExtra) elBwRevExtra.textContent = `~₹${(bwPages * 2).toFixed(0)} document volume`;
    if (elColorRevExtra) elColorRevExtra.textContent = `~₹${(colorPages * 10).toFixed(0)} premium volume`;
    if (elDuplexSaved) elDuplexSaved.textContent = duplexSheets > 0 ? `${duplexSheets} paper leaves saved` : 'Standard leaves';

    // Segmented Volume Ratio Bar
    const totalPagesVol = bwPages + colorPages;
    const colorRatioPct = totalPagesVol > 0 ? Math.round((colorPages / totalPagesVol) * 100) : 0;
    const bwRatioPct = totalPagesVol > 0 ? 100 - colorRatioPct : 100;

    const ratioBwSeg = document.getElementById('ratioSegmentBw');
    const ratioColorSeg = document.getElementById('ratioSegmentColor');
    const ratioBwTxt = document.getElementById('ratioBwText');
    const ratioColorTxt = document.getElementById('ratioColorText');
    const colorBwPill = document.getElementById('colorBwRatioPill');

    if (ratioBwSeg) ratioBwSeg.style.width = `${bwRatioPct}%`;
    if (ratioColorSeg) ratioColorSeg.style.width = `${colorRatioPct}%`;
    if (ratioBwTxt) ratioBwTxt.textContent = `${bwPages} Pages (${bwRatioPct}%)`;
    if (ratioColorTxt) ratioColorTxt.textContent = `${colorPages} Pages (${colorRatioPct}%)`;
    if (colorBwPill) colorBwPill.textContent = `Ratio: ${colorRatioPct}% Color • ${bwRatioPct}% B&W`;

    // Render Charts
    renderRevenueTimelineChart(periodJobs, currentEarningsRange);
    renderPaymentDonutChart(upiGross, cashGross, totalGross, upiPercent, cashPercent);

    // Render Period Ledger Table
    renderPeriodLedgerTable(periodJobs);
  }

  // --- SVG CHART 1: REVENUE TIMELINE TREND ---
  function renderRevenueTimelineChart(jobs, range) {
    const container = document.getElementById('revenueTimelineChartContainer');
    const subLabel = document.getElementById('chartTimelineSub');
    if (!container) return;

    let buckets = [];
    if (range === 'today' || range === 'yesterday') {
      if (subLabel) subLabel.textContent = 'Hourly revenue generation throughout the day';
      // 8 time buckets: 8am, 10am, 12pm, 2pm, 4pm, 6pm, 8pm, 10pm
      const hours = [8, 10, 12, 14, 16, 18, 20, 22];
      const labels = ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM', '10 PM'];
      buckets = hours.map((h, idx) => ({
        label: labels[idx],
        hour: h,
        revenue: 0,
        orders: 0,
      }));

      jobs.forEach((j) => {
        if (!j.created_at) return;
        const h = new Date(j.created_at).getHours();
        let bIdx = buckets.findIndex((b) => h < b.hour + 2);
        if (bIdx === -1) bIdx = buckets.length - 1;
        buckets[bIdx].revenue += j.total_amount || 0;
        buckets[bIdx].orders += 1;
      });
    } else if (range === 'week') {
      if (subLabel) subLabel.textContent = 'Daily revenue generation over the last 7 days';
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        buckets.push({
          label: `${days[d.getDay()]} ${d.getDate()}`,
          dateStr: d.toISOString().split('T')[0],
          revenue: 0,
          orders: 0,
        });
      }

      jobs.forEach((j) => {
        if (!j.created_at) return;
        const dStr = j.created_at.split('T')[0];
        const b = buckets.find((b) => b.dateStr === dStr);
        if (b) {
          b.revenue += j.total_amount || 0;
          b.orders += 1;
        }
      });
    } else {
      if (subLabel) subLabel.textContent = 'Periodic revenue generation trend';
      const intervals = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      buckets = intervals.map((lbl) => ({ label: lbl, revenue: 0, orders: 0 }));
      jobs.forEach((j, idx) => {
        const bIdx = idx % 4;
        buckets[bIdx].revenue += j.total_amount || 0;
        buckets[bIdx].orders += 1;
      });
    }

    const maxRev = Math.max(10, ...buckets.map((b) => b.revenue));
    const width = 640;
    const height = 180;
    const paddingX = 45;
    const paddingY = 25;
    const graphW = width - paddingX * 2;
    const graphH = height - paddingY * 2;

    const stepX = graphW / (buckets.length - 1 || 1);
    const points = buckets.map((b, idx) => {
      const x = paddingX + idx * stepX;
      const y = height - paddingY - (b.revenue / maxRev) * graphH;
      return { x, y, ...b };
    });

    // Area path
    const areaPoints = [`${paddingX},${height - paddingY}`];
    points.forEach((p) => areaPoints.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`));
    areaPoints.push(`${paddingX + graphW},${height - paddingY}`);
    const areaD = `M ${areaPoints.join(' L ')} Z`;

    // Line path
    const lineD = `M ${points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`;

    // Build SVG Elements
    let svg = `<svg viewBox="0 0 ${width} ${height}" style="width:100%; height:100%; overflow:visible;">
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2563EB" stop-opacity="0.32"/>
          <stop offset="100%" stop-color="#2563EB" stop-opacity="0.01"/>
        </linearGradient>
      </defs>

      <!-- Grid lines -->
      <line x1="${paddingX}" y1="${paddingY}" x2="${width - paddingX}" y2="${paddingY}" stroke="#E2E8F0" stroke-dasharray="3 3"/>
      <line x1="${paddingX}" y1="${paddingY + graphH * 0.5}" x2="${width - paddingX}" y2="${paddingY + graphH * 0.5}" stroke="#E2E8F0" stroke-dasharray="3 3"/>
      <line x1="${paddingX}" y1="${height - paddingY}" x2="${width - paddingX}" y2="${height - paddingY}" stroke="#CBD5E1"/>

      <!-- Y-Axis labels -->
      <text x="${paddingX - 8}" y="${paddingY + 4}" font-size="10" font-weight="600" fill="#94A3B8" text-anchor="end">₹${maxRev.toFixed(0)}</text>
      <text x="${paddingX - 8}" y="${paddingY + graphH * 0.5 + 4}" font-size="10" font-weight="600" fill="#94A3B8" text-anchor="end">₹${(maxRev * 0.5).toFixed(0)}</text>
      <text x="${paddingX - 8}" y="${height - paddingY + 3}" font-size="10" font-weight="600" fill="#94A3B8" text-anchor="end">₹0</text>

      <!-- Area polygon -->
      <path d="${areaD}" fill="url(#chartGradient)"/>

      <!-- Main line -->
      <path d="${lineD}" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    `;

    // Add Interactive Data Points & X-Labels
    points.forEach((p) => {
      svg += `
        <g class="chart-point-group">
          <!-- Background bar hover trigger -->
          <rect x="${p.x - stepX * 0.4}" y="${paddingY}" width="${stepX * 0.8}" height="${graphH}" fill="transparent">
            <title>${p.label}: ₹${p.revenue.toFixed(2)} (${p.orders} orders)</title>
          </rect>
          <!-- Outer circle -->
          <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="#FFFFFF" stroke="#2563EB" stroke-width="2">
            <title>${p.label}: ₹${p.revenue.toFixed(2)} (${p.orders} orders)</title>
          </circle>
          <!-- X-Axis label -->
          <text x="${p.x.toFixed(1)}" y="${height - 6}" font-size="10" font-weight="600" fill="#64748B" text-anchor="middle">${p.label}</text>
        </g>
      `;
    });

    svg += `</svg>`;
    container.innerHTML = svg;
  }

  // --- SVG CHART 2: DONUT CHART FOR PAYMENT METHODS ---
  function renderPaymentDonutChart(upiAmt, cashAmt, totalAmt, upiPct, cashPct) {
    const wrapper = document.getElementById('paymentDonutWrapper');
    const legend = document.getElementById('paymentDonutLegend');
    if (!wrapper) return;

    const r = 50;
    const c = 2 * Math.PI * r; // 314.159

    const upiLength = totalAmt > 0 ? (upiAmt / totalAmt) * c : 0;
    const cashLength = totalAmt > 0 ? (cashAmt / totalAmt) * c : 0;
    const upiOffset = 0;
    const cashOffset = -upiLength;

    let svg = '';
    if (totalAmt <= 0) {
      svg = `
        <svg viewBox="0 0 140 140" style="width:140px; height:140px;">
          <circle cx="70" cy="70" r="${r}" fill="none" stroke="#F1F5F9" stroke-width="16"/>
          <text x="70" y="68" font-size="18" font-weight="900" fill="#94A3B8" text-anchor="middle">₹0</text>
          <text x="70" y="84" font-size="10" font-weight="600" fill="#94A3B8" text-anchor="middle">No Sales</text>
        </svg>
      `;
    } else {
      svg = `
        <svg viewBox="0 0 140 140" style="width:140px; height:140px; transform: rotate(-90deg);">
          <!-- Background track -->
          <circle cx="70" cy="70" r="${r}" fill="none" stroke="#F1F5F9" stroke-width="16"/>
          
          <!-- UPI Green arc -->
          <circle cx="70" cy="70" r="${r}" fill="none" stroke="#10B981" stroke-width="16"
            stroke-dasharray="${upiLength.toFixed(1)} ${c.toFixed(1)}"
            stroke-dashoffset="${upiOffset}" stroke-linecap="round"/>

          <!-- Cash Amber arc -->
          <circle cx="70" cy="70" r="${r}" fill="none" stroke="#F59E0B" stroke-width="16"
            stroke-dasharray="${cashLength.toFixed(1)} ${c.toFixed(1)}"
            stroke-dashoffset="${cashOffset.toFixed(1)}" stroke-linecap="round"/>
        </svg>
        <div style="position:absolute; text-align:center; pointer-events:none;">
          <div style="font-size:22px; font-weight:900; color:var(--text-primary); font-family:'Inter', sans-serif;">${upiPct}%</div>
          <div style="font-size:10px; font-weight:700; color:#10B981; text-transform:uppercase;">UPI Digital</div>
        </div>
      `;
    }

    wrapper.innerHTML = svg;

    if (legend) {
      legend.innerHTML = `
        <div class="donut-legend-row">
          <div class="donut-legend-label">
            <span style="width:10px; height:10px; border-radius:50%; background:#10B981;"></span>
            <span>UPI Online Payments</span>
          </div>
          <span class="donut-legend-val">₹${upiAmt.toFixed(2)} (${upiPct}%)</span>
        </div>
        <div class="donut-legend-row">
          <div class="donut-legend-label">
            <span style="width:10px; height:10px; border-radius:50%; background:#F59E0B;"></span>
            <span>Cash at Counter</span>
          </div>
          <span class="donut-legend-val">₹${cashAmt.toFixed(2)} (${cashPct}%)</span>
        </div>
      `;
    }
  }

  // --- SETTLED PERIOD LEDGER TABLE ---
  function renderPeriodLedgerTable(jobs) {
    const tbody = document.getElementById('earningsLedgerBody');
    const countBadge = document.getElementById('finPeriodLedgerCount');
    if (!tbody) return;

    if (countBadge) countBadge.textContent = `${jobs.length} Transactions`;

    tbody.innerHTML = '';
    if (jobs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:#64748B;">No financial transactions in this period.</td></tr>`;
      return;
    }

    jobs.forEach((j) => {
      const tr = document.createElement('tr');
      const timeStr = j.created_at
        ? new Date(j.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '—';
      const isPaid = j.payment_status === 'paid';
      const isDuplex = Boolean(j.duplex);
      const sheets = isDuplex
        ? Math.ceil((j.page_count || 1) / 2) * (j.copies || 1)
        : (j.page_count || 1) * (j.copies || 1);

      tr.innerHTML = `
        <td style="font-size:12px; font-weight:600; color:var(--text-secondary);">${timeStr}</td>
        <td class="token-cell">${j.token_number || '#' + (j.id || '').substring(0, 4)}</td>
        <td>
          <strong style="color:var(--text-primary); font-size:13px;">${j.customer_name || j.file_name || 'Walk-in'}</strong>
        </td>
        <td>
          <span style="font-size:11.5px; color:var(--text-secondary);">
            ${(j.color_mode || 'bw').toUpperCase()} • ${j.paper_size || 'A4'} • ${isDuplex ? 'Duplex' : 'Single'}
          </span>
        </td>
        <td><strong>${sheets} Sheets</strong></td>
        <td>
          <span class="badge-chip ${isPaid ? 'green' : 'amber'}" style="font-size:10.5px;">
            ${j.payment_mode === 'cash' ? 'Cash Counter 💵' : 'UPI Instant 📲'}
          </span>
        </td>
        <td>
          <span class="badge-chip ${j.status === 'completed' ? 'green' : j.status === 'failed' ? 'red' : 'blue'}" style="font-size:10px;">
            ${(j.status || 'QUEUED').toUpperCase()}
          </span>
        </td>
        <td style="text-align:right;">
          <strong style="font-size:14px; color:#059669;">₹${(j.total_amount || 0).toFixed(2)}</strong>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Bind Earnings timeframe switcher buttons
  const earningsTimeButtons = document.querySelectorAll('#earningsTimeSwitcher .time-pill');
  earningsTimeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      earningsTimeButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentEarningsRange = btn.getAttribute('data-range') || 'today';
      updateFinancials();
    });
  });

  if (btnRefreshEarnings) {
    btnRefreshEarnings.addEventListener('click', () => {
      updateFinancials();
      showToast('Daily earnings dashboard refreshed.', 'info');
    });
  }

  const btnExportEarningsCsv = document.getElementById('btnExportEarningsCsv');
  if (btnExportEarningsCsv) {
    btnExportEarningsCsv.addEventListener('click', () => {
      const periodJobs = filterJobsByTimeframe(activeJobs, currentEarningsRange);
      let csv = 'Timestamp,Token,Customer,File,Pages,Copies,Sheets,Color_Mode,Duplex,Paper,Amount_INR,Payment_Mode,Payment_Status,Status\n';
      periodJobs.forEach((j) => {
        const isDuplex = Boolean(j.duplex);
        const sheets = isDuplex
          ? Math.ceil((j.page_count || 1) / 2) * (j.copies || 1)
          : (j.page_count || 1) * (j.copies || 1);
        csv += `"${j.created_at || ''}","${j.token_number || ''}","${(j.customer_name || '').replace(/"/g, '""')}","${(j.file_name || '').replace(/"/g, '""')}",${j.page_count || 1},${j.copies || 1},${sheets},"${j.color_mode || 'bw'}",${isDuplex},"${j.paper_size || 'A4'}",${(j.total_amount || 0).toFixed(2)},"${j.payment_mode || 'upi'}","${j.payment_status || 'paid'}","${j.status || 'completed'}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QuickPrint_Financial_Report_${currentEarningsRange}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      showToast(`Exported ${currentEarningsRange.toUpperCase()} financial report as CSV.`, 'success');
    });
  }

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

  let cachedLogoBase64 = '';
  async function getLogoBase64() {
    if (cachedLogoBase64) return cachedLogoBase64;
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth || 64;
          c.height = img.naturalHeight || 64;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          cachedLogoBase64 = c.toDataURL('image/png');
          resolve(cachedLogoBase64);
        } catch (e) {
          resolve('logo.png');
        }
      };
      img.onerror = () => resolve('logo.png');
      img.src = 'logo.png';
    });
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // Draw full marketing standee poster on high-resolution canvas (1200x1800 px)
  async function renderMarketingStandeeCanvas(qrImgSrc, shopName, kioskUrl) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1800;
    const ctx = canvas.getContext('2d');

    // 1. Clean White Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 1200, 1800);

    // 2. Corner Waves / Gradients
    const gradTL = ctx.createRadialGradient(0, 0, 10, 0, 0, 360);
    gradTL.addColorStop(0, '#00A3FF');
    gradTL.addColorStop(0.5, 'rgba(0, 163, 255, 0.45)');
    gradTL.addColorStop(1, 'transparent');
    ctx.fillStyle = gradTL;
    ctx.beginPath();
    ctx.arc(0, 0, 360, 0, Math.PI / 2);
    ctx.lineTo(0, 0);
    ctx.fill();

    const gradTR = ctx.createRadialGradient(1200, 0, 10, 1200, 0, 300);
    gradTR.addColorStop(0, '#38BDF8');
    gradTR.addColorStop(0.5, 'rgba(56, 189, 248, 0.35)');
    gradTR.addColorStop(1, 'transparent');
    ctx.fillStyle = gradTR;
    ctx.beginPath();
    ctx.arc(1200, 0, 300, Math.PI / 2, Math.PI);
    ctx.lineTo(1200, 0);
    ctx.fill();

    const gradBot = ctx.createLinearGradient(0, 1740, 1200, 1740);
    gradBot.addColorStop(0, '#00B4D8');
    gradBot.addColorStop(0.5, '#0090FF');
    gradBot.addColorStop(1, '#0284C7');
    ctx.fillStyle = gradBot;
    ctx.fillRect(0, 1750, 1200, 50);

    // 3. Header: Logo + "Gaurprint" (Gaur black, print blue) + Subtitle
    const logoBase64 = await getLogoBase64();
    const logoImg = await loadImage(logoBase64);
    
    const logoW = 96;
    const logoH = 96;
    if (logoImg) {
      ctx.drawImage(logoImg, 340, 75, logoW, logoH);
    }
    
    ctx.font = '900 82px "Carbon", "Urbanist", "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0F172A';
    ctx.fillText('Gaur', 455, 142);
    const gaurWidth = ctx.measureText('Gaur').width;
    ctx.fillStyle = '#0284C7';
    ctx.fillText('print', 455 + gaurWidth, 142);

    ctx.font = '600 24px "Carbon", "Urbanist", "Outfit", sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('Print  •  Scan  •  Copy  •  More', 458, 175);

    // 4. Hero Headline: "Scan to Print" with decorative burst rays
    ctx.strokeStyle = '#00A3FF';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    // ray 1
    ctx.beginPath();
    ctx.moveTo(270, 275);
    ctx.lineTo(220, 275);
    ctx.stroke();
    // ray 2
    ctx.beginPath();
    ctx.moveTo(280, 255);
    ctx.lineTo(240, 230);
    ctx.stroke();
    // ray 3
    ctx.beginPath();
    ctx.moveTo(290, 295);
    ctx.lineTo(250, 320);
    ctx.stroke();

    // Right Burst Rays
    ctx.beginPath();
    ctx.moveTo(930, 275);
    ctx.lineTo(980, 275);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(920, 255);
    ctx.lineTo(960, 230);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(910, 295);
    ctx.lineTo(950, 320);
    ctx.stroke();

    // Text: "Scan to Print"
    ctx.font = '900 86px "Carbon", "Urbanist", "Outfit", sans-serif';
    const scanToWidth = ctx.measureText('Scan to ').width;
    const printWidth = ctx.measureText('Print').width;
    const totalHeroWidth = scanToWidth + printWidth;
    const heroStartX = 600 - totalHeroWidth / 2;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#0F172A';
    ctx.fillText('Scan to ', heroStartX, 295);
    ctx.fillStyle = '#00A3FF';
    ctx.fillText('Print', heroStartX + scanToWidth, 295);

    // Subtitle: "Upload • Customize • Pay • Print"
    ctx.textAlign = 'center';
    ctx.font = '700 28px "Inter", "Outfit", sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('Upload  •  Customize  •  Pay  •  Print', 600, 345);

    // 5. Rounded Border Box for QR Code
    const qrBoxW = 590;
    const qrBoxH = 590;
    const qrBoxX = 305;
    const qrBoxY = 390;
    const radius = 54;

    ctx.beginPath();
    ctx.roundRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, radius);
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#38BDF8';
    ctx.stroke();

    const qrImg = await loadImage(qrImgSrc);
    if (qrImg) {
      const qrInnerMargin = 26;
      ctx.drawImage(
        qrImg,
        qrBoxX + qrInnerMargin,
        qrBoxY + qrInnerMargin,
        qrBoxW - qrInnerMargin * 2,
        qrBoxH - qrInnerMargin * 2
      );
    }

    // Logo Badge in center of QR Code
    const centerBadgeSize = 130;
    const centerBadgeX = 600 - centerBadgeSize / 2;
    const centerBadgeY = 685 - centerBadgeSize / 2;
    ctx.beginPath();
    ctx.roundRect(centerBadgeX, centerBadgeY, centerBadgeSize, centerBadgeSize, 24);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#E2E8F0';
    ctx.stroke();

    if (logoImg) {
      const innerLogoPad = 12;
      ctx.drawImage(
        logoImg,
        centerBadgeX + innerLogoPad,
        centerBadgeY + innerLogoPad,
        centerBadgeSize - innerLogoPad * 2,
        centerBadgeSize - innerLogoPad * 2
      );
    }

    // 6. Smartphone Instruction Strip
    const instrBoxW = 760;
    const instrBoxH = 74;
    const instrBoxX = 220;
    const instrBoxY = 1030;
    ctx.beginPath();
    ctx.roundRect(instrBoxX, instrBoxY, instrBoxW, instrBoxH, 20);
    ctx.fillStyle = '#F0F9FF';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#BAE6FD';
    ctx.stroke();

    // Phone icon
    ctx.strokeStyle = '#00A3FF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(260, 1045, 30, 44, 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(275, 1078, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#00A3FF';
    ctx.fill();

    // Vertical blue divider
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(315, 1045);
    ctx.lineTo(315, 1089);
    ctx.stroke();

    // Instruction Text
    ctx.textAlign = 'left';
    ctx.font = '700 27px "Inter", "Outfit", sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText('Scan this QR code with your phone to start printing', 335, 1076);

    // 7. 4 Feature Columns
    const features = [
      { title: 'Photos', sub: '(4×6, 5×7, etc.)', icon: 'photo' },
      { title: 'Documents', sub: '(PDF, DOC, etc.)', icon: 'doc' },
      { title: 'Multiple Sizes', sub: '(A4, A3, etc.)', icon: 'printer' },
      { title: 'Safe & Secure', sub: '(Your files are private)', icon: 'shield' },
    ];

    const featY = 1160;
    features.forEach((feat, idx) => {
      const colCenterX = 240 + idx * 240;
      
      // Feature icon circle
      ctx.beginPath();
      ctx.arc(colCenterX, featY + 36, 40, 0, Math.PI * 2);
      ctx.fillStyle = '#F0F9FF';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#BAE6FD';
      ctx.stroke();

      // Draw feature symbol
      ctx.fillStyle = '#0284C7';
      ctx.strokeStyle = '#0284C7';
      ctx.lineWidth = 4;
      if (feat.icon === 'photo') {
        ctx.strokeRect(colCenterX - 18, featY + 20, 36, 32);
        ctx.beginPath();
        ctx.arc(colCenterX - 6, featY + 30, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (feat.icon === 'doc') {
        ctx.strokeRect(colCenterX - 16, featY + 18, 32, 36);
        ctx.beginPath();
        ctx.moveTo(colCenterX - 8, featY + 30);
        ctx.lineTo(colCenterX + 8, featY + 30);
        ctx.moveTo(colCenterX - 8, featY + 40);
        ctx.lineTo(colCenterX + 8, featY + 40);
        ctx.stroke();
      } else if (feat.icon === 'printer') {
        ctx.strokeRect(colCenterX - 20, featY + 26, 40, 24);
        ctx.strokeRect(colCenterX - 14, featY + 16, 28, 10);
      } else {
        ctx.beginPath();
        ctx.arc(colCenterX, featY + 36, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(colCenterX - 6, featY + 36);
        ctx.lineTo(colCenterX - 1, featY + 42);
        ctx.lineTo(colCenterX + 8, featY + 30);
        ctx.stroke();
      }

      ctx.textAlign = 'center';
      ctx.font = '800 28px "Inter", "Outfit", sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.fillText(feat.title, colCenterX, featY + 115);

      ctx.font = '500 20px "Inter", "Outfit", sans-serif';
      ctx.fillStyle = '#64748B';
      ctx.fillText(feat.sub, colCenterX, featY + 145);
    });

    // 8. Footer: Divider lines + Shop Name + Partner Tagline
    const footerY = 1530;
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(220, footerY);
    ctx.lineTo(380, footerY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(820, footerY);
    ctx.lineTo(980, footerY);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '900 52px "Carbon", "Urbanist", "Outfit", sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText(shopName || 'Mahadev Printer Shop', 600, footerY + 15);

    ctx.font = '600 28px "Inter", "Outfit", sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('Your Printing Partner', 600, footerY + 70);

    ctx.font = '600 21px monospace';
    ctx.fillStyle = '#0284C7';
    ctx.fillText(kioskUrl, 600, footerY + 115);

    return canvas;
  }

  // Generate full vector SVG standee poster (800x1200 viewBox)
  async function generateMarketingStandeeSvg(qrSvgOrDataUrl, shopName, kioskUrl) {
    const logoBase64 = await getLogoBase64();
    const qrDataUrl = qrSvgOrDataUrl;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="1200" viewBox="0 0 800 1200" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;800;900&amp;family=Urbanist:wght@800;900&amp;display=swap');
      .font-brand { font-family: 'Carbon', 'Urbanist', 'Outfit', sans-serif; font-weight: 900; }
      .font-sans { font-family: 'Outfit', 'Inter', sans-serif; }
    </style>
    <radialGradient id="topWaveLeft" cx="0" cy="0" r="1" fx="0" fy="0">
      <stop offset="0%" stop-color="#00A3FF" stop-opacity="0.9"/>
      <stop offset="40%" stop-color="#00A3FF" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#00A3FF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="topWaveRight" cx="1" cy="0" r="1" fx="1" fy="0">
      <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#38BDF8" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#38BDF8" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bottomWave" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#00B4D8"/>
      <stop offset="50%" stop-color="#0090FF"/>
      <stop offset="100%" stop-color="#0284C7"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="800" height="1200" fill="#FFFFFF"/>

  <!-- Corner Gradients -->
  <circle cx="0" cy="0" r="240" fill="url(#topWaveLeft)"/>
  <circle cx="800" cy="0" r="200" fill="url(#topWaveRight)"/>
  <rect x="0" y="1165" width="800" height="35" fill="url(#bottomWave)"/>

  <!-- 1. Header: Logo + Gaurprint + Subtitle -->
  <image href="${logoBase64}" x="220" y="50" width="65" height="65" />
  <text x="300" y="98" class="font-brand" font-size="52">
    <tspan fill="#0F172A">Gaur</tspan><tspan fill="#0284C7">print</tspan>
  </text>
  <text x="302" y="122" class="font-sans" font-size="15" font-weight="600" fill="#64748B" letter-spacing="2">
    Print • Scan • Copy • More
  </text>

  <!-- 2. Hero Headline: Scan to Print with Bursts -->
  <line x1="170" y1="180" x2="140" y2="180" stroke="#00A3FF" stroke-width="4" stroke-linecap="round"/>
  <line x1="180" y1="168" x2="155" y2="152" stroke="#00A3FF" stroke-width="4" stroke-linecap="round"/>
  <line x1="185" y1="192" x2="160" y2="208" stroke="#00A3FF" stroke-width="4" stroke-linecap="round"/>

  <line x1="630" y1="180" x2="660" y2="180" stroke="#00A3FF" stroke-width="4" stroke-linecap="round"/>
  <line x1="620" y1="168" x2="645" y2="152" stroke="#00A3FF" stroke-width="4" stroke-linecap="round"/>
  <line x1="615" y1="192" x2="640" y2="208" stroke="#00A3FF" stroke-width="4" stroke-linecap="round"/>

  <text x="400" y="196" text-anchor="middle" class="font-brand" font-size="56">
    <tspan fill="#0F172A">Scan to </tspan><tspan fill="#00A3FF">Print</tspan>
  </text>
  <text x="400" y="230" text-anchor="middle" class="font-sans" font-size="19" font-weight="700" fill="#64748B">
    Upload • Customize • Pay • Print
  </text>

  <!-- 3. Rounded QR Box -->
  <rect x="200" y="260" width="400" height="400" rx="36" fill="#FFFFFF" stroke="#38BDF8" stroke-width="10" />
  <image href="${qrDataUrl}" x="225" y="285" width="350" height="350" />
  
  <!-- QR Center Logo Badge -->
  <rect x="355" y="415" width="90" height="90" rx="18" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="4"/>
  <image href="${logoBase64}" x="365" y="425" width="70" height="70"/>

  <!-- 4. Phone Instruction Banner -->
  <rect x="150" y="690" width="500" height="50" rx="14" fill="#F0F9FF" stroke="#BAE6FD" stroke-width="1.8"/>
  <rect x="175" y="700" width="20" height="30" rx="4" fill="none" stroke="#00A3FF" stroke-width="2.5"/>
  <circle cx="185" cy="723" r="1.5" fill="#00A3FF"/>
  <line x1="210" y1="700" x2="210" y2="730" stroke="#0284C7" stroke-width="2"/>
  <text x="225" y="722" class="font-sans" font-size="17" font-weight="700" fill="#0F172A">
    Scan this QR code with your phone to start printing
  </text>

  <!-- 5. 4 Features Columns -->
  <!-- Photos -->
  <g transform="translate(160, 770)">
    <circle cx="0" cy="25" r="26" fill="#F0F9FF" stroke="#BAE6FD" stroke-width="1.5"/>
    <rect x="-12" y="15" width="24" height="20" rx="3" fill="none" stroke="#0284C7" stroke-width="2.5"/>
    <circle cx="-4" cy="21" r="2.5" fill="#0284C7"/>
    <text x="0" y="75" text-anchor="middle" class="font-sans" font-size="18" font-weight="800" fill="#0F172A">Photos</text>
    <text x="0" y="95" text-anchor="middle" class="font-sans" font-size="13" font-weight="500" fill="#64748B">(4×6, 5×7, etc.)</text>
  </g>

  <!-- Documents -->
  <g transform="translate(320, 770)">
    <circle cx="0" cy="25" r="26" fill="#F0F9FF" stroke="#BAE6FD" stroke-width="1.5"/>
    <path d="M-10 12 H6 L12 18 V36 H-10 Z" fill="none" stroke="#0284C7" stroke-width="2.5"/>
    <line x1="-5" y1="23" x2="5" y2="23" stroke="#0284C7" stroke-width="2"/>
    <line x1="-5" y1="29" x2="5" y2="29" stroke="#0284C7" stroke-width="2"/>
    <text x="0" y="75" text-anchor="middle" class="font-sans" font-size="18" font-weight="800" fill="#0F172A">Documents</text>
    <text x="0" y="95" text-anchor="middle" class="font-sans" font-size="13" font-weight="500" fill="#64748B">(PDF, DOC, etc.)</text>
  </g>

  <!-- Multiple Sizes -->
  <g transform="translate(480, 770)">
    <circle cx="0" cy="25" r="26" fill="#F0F9FF" stroke="#BAE6FD" stroke-width="1.5"/>
    <rect x="-14" y="20" width="28" height="16" rx="2" fill="none" stroke="#0284C7" stroke-width="2.5"/>
    <rect x="-10" y="14" width="20" height="6" fill="none" stroke="#0284C7" stroke-width="2"/>
    <text x="0" y="75" text-anchor="middle" class="font-sans" font-size="18" font-weight="800" fill="#0F172A">Multiple Sizes</text>
    <text x="0" y="95" text-anchor="middle" class="font-sans" font-size="13" font-weight="500" fill="#64748B">(A4, A3, etc.)</text>
  </g>

  <!-- Safe & Secure -->
  <g transform="translate(640, 770)">
    <circle cx="0" cy="25" r="26" fill="#F0F9FF" stroke="#BAE6FD" stroke-width="1.5"/>
    <circle cx="0" cy="25" r="14" fill="none" stroke="#0284C7" stroke-width="2.5"/>
    <polyline points="-5,25 -1,29 6,21" fill="none" stroke="#0284C7" stroke-width="2.5" stroke-linecap="round"/>
    <text x="0" y="75" text-anchor="middle" class="font-sans" font-size="18" font-weight="800" fill="#0F172A">Safe &amp; Secure</text>
    <text x="0" y="95" text-anchor="middle" class="font-sans" font-size="13" font-weight="500" fill="#64748B">(Your files are private)</text>
  </g>

  <!-- 6. Footer Section -->
  <line x1="140" y1="1020" x2="250" y2="1020" stroke="#38BDF8" stroke-width="3" stroke-linecap="round"/>
  <text x="400" y="1030" text-anchor="middle" class="font-brand" font-size="36" fill="#0F172A">
    ${shopName || 'Mahadev Printer Shop'}
  </text>
  <line x1="550" y1="1020" x2="660" y2="1020" stroke="#38BDF8" stroke-width="3" stroke-linecap="round"/>

  <text x="400" y="1065" text-anchor="middle" class="font-sans" font-size="19" font-weight="600" fill="#64748B">
    Your Printing Partner
  </text>
  <text x="400" y="1095" text-anchor="middle" font-family="monospace" font-size="14" font-weight="600" fill="#0284C7">
    ${kioskUrl}
  </text>
</svg>`;
  }

  // Print Standee
  btnPrintStandee.addEventListener('click', () => {
    const standeeEl = document.getElementById('counterStandeeCard');
    if (!standeeEl) {
      showToast('Standee preview not found.', 'danger');
      return;
    }
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Gaurprint Counter Standee</title>
            <link rel="stylesheet" href="styles.css">
            <style>
              body {
                margin: 0;
                padding: 24px;
                display: flex;
                justify-content: center;
                background: #FFFFFF;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .counter-standee-preview {
                box-shadow: none !important;
                border: 1px solid #E2E8F0 !important;
                max-width: 520px !important;
                page-break-inside: avoid;
              }
              @page {
                size: auto;
                margin: 10mm;
              }
            </style>
          </head>
          <body>
            ${standeeEl.outerHTML}
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 300);
              };
            <\/script>
          </body>
        </html>
      `);
      printWindow.document.close();
      showToast('Standee print dialog opened!', 'success');
    } else {
      showToast('Please allow popup to print standee.', 'warning');
    }
  });

  // Download High-Resolution Branded Standee Poster (PNG)
  if (btnDownloadQrPng) {
    btnDownloadQrPng.addEventListener('click', async () => {
      const qrImg = document.getElementById('qrImageDisplay');
      if (!qrImg || !qrImg.src) {
        showToast('QR Code not ready yet.', 'warning');
        return;
      }
      const shopSlug = currentShop?.slug || currentShop?.qr_code_slug || 'quickprint-shop';
      const shopName = currentShop?.name || 'Mahadev Printer Shop';
      const baseUrl = (currentAppUrl || 'https://doc2print.vercel.app').replace(/\/+$/, '');
      const kioskUrl = `${baseUrl}/kiosk/${shopSlug}`;

      showToast('Rendering high-resolution marketing standee poster...', 'info');
      try {
        const canvas = await renderMarketingStandeeCanvas(qrImg.src, shopName, kioskUrl);
        canvas.toBlob((blob) => {
          if (!blob) {
            showToast('Could not export poster image.', 'danger');
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Gaurprint_Marketing_Standee_${shopSlug}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast('Branded Gaurprint Marketing Standee (PNG) downloaded!', 'success');
        }, 'image/png');
      } catch (err) {
        showToast('Export error: ' + err.message, 'danger');
      }
    });
  }

  // Download Crisp Scalable Vector Standee (SVG)
  if (btnDownloadQrSvg) {
    btnDownloadQrSvg.addEventListener('click', async () => {
      const baseUrl = (currentAppUrl || 'https://doc2print.vercel.app').replace(/\/+$/, '');
      const shopSlug = currentShop?.slug || currentShop?.qr_code_slug || 'quickprint-shop';
      const shopName = currentShop?.name || 'Mahadev Printer Shop';
      const kioskUrl = `${baseUrl}/kiosk/${shopSlug}`;
      const qrImg = document.getElementById('qrImageDisplay');

      showToast('Generating scalable vector SVG standee...', 'info');
      try {
        let qrSource = qrImg?.src || '';
        if (window.quickprintApi?.generateQrDataUrl) {
          const dUrl = await window.quickprintApi.generateQrDataUrl(kioskUrl);
          if (dUrl) qrSource = dUrl;
        }

        const svgContent = await generateMarketingStandeeSvg(qrSource, shopName, kioskUrl);
        if (svgContent) {
          const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Gaurprint_Marketing_Standee_${shopSlug}.svg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast('Vector SVG Standee downloaded successfully!', 'success');
        } else {
          showToast('Could not build SVG Standee.', 'danger');
        }
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
