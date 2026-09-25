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

  let currentAppUrl = 'https://doc2print.vercel.app';

  function getCleanDomain(url) {
    try {
      return new URL(url || currentAppUrl).host;
    } catch (e) {
      return 'doc2print.vercel.app';
    }
  }

  // Modals
  const qrModal = document.getElementById('qrModal');
  const btnCloseQrModal = document.getElementById('btnCloseQrModal');
  const btnCopyKioskUrl = document.getElementById('btnCopyKioskUrl');
  const btnPrintStandee = document.getElementById('btnPrintStandee');
  const qrUrlBadge = document.getElementById('qrUrlBadge');

  const previewModal = document.getElementById('previewModal');
  const btnClosePreviewModal = document.getElementById('btnClosePreviewModal');
  const previewTitle = document.getElementById('previewTitle');
  const previewIframe = document.getElementById('previewIframe');
  const previewSpecs = document.getElementById('previewSpecs');
  const btnPreviewPrintNow = document.getElementById('btnPreviewPrintNow');

  const toastContainer = document.getElementById('toastContainer');
  const orderChime = document.getElementById('orderChime');

  let activePreviewJob = null;

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

      // Pricing values (support both price_config schema and flat rates)
      const pricing = currentShop.price_config || currentShop.settings || {};
      const rates = pricing.rates || {};
      rateBwSingle.value = rates.bw_single || rates.bw || pricing.rateBwSingle || 2;
      rateBwDouble.value = rates.bw_double || pricing.rateBwDouble || (rates.bw ? rates.bw * 1.5 : 3);
      rateColorSingle.value = rates.color_single || rates.color || pricing.rateColorSingle || 10;
      rateColorDouble.value = rates.color_double || pricing.rateColorDouble || (rates.color ? rates.color * 1.8 : 18);
      rateSpiralBinding.value = pricing.rateSpiralBinding || 30;
      rateStapling.value = pricing.rateStapling || 2;

      // Paper sizes extra fees
      const paperSizes = pricing.paperSizes || {};
      if (ratePaperA3) ratePaperA3.value = paperSizes.a3?.extra != null ? paperSizes.a3.extra : 4.0;
      if (ratePaperLegal) ratePaperLegal.value = paperSizes.custom?.extra != null ? paperSizes.custom.extra : 2.0;
      if (ratePaperPassport) ratePaperPassport.value = paperSizes.passport?.extra != null ? paperSizes.passport.extra : 35.0;

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
        }
      } catch (e) {}

      btnAutoPrintState.classList.toggle('active', autoPrintEnabled);
      btnAutoPrintState.textContent = autoPrintEnabled ? 'ON' : 'OFF';

      // Scan printers and load initial jobs
      await scanPrinters();
      await fetchJobs();
    } catch (err) {
      console.error('Session load error:', err);
      authOverlay.classList.remove('hidden');
    }
  }

  // --- PRINTER ENUMERATION ---
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

        // Card
        const card = document.createElement('div');
        card.className = `printer-card ${isDef ? 'default' : ''}`;
        card.innerHTML = `
          <div class="printer-card-header">
            <div class="printer-title-box">
              <div class="printer-avatar">🖨️</div>
              <div>
                <h3 class="printer-name-h3" title="${name}">${name}</h3>
                <span class="printer-status-sub">${isDef ? '★ Default Windows Spooler' : 'Ready'}</span>
              </div>
            </div>
            ${isDef ? '<span class="badge-chip color">DEFAULT</span>' : ''}
          </div>
          <div class="printer-card-actions">
            ${
              !isDef
                ? `<button class="btn btn-secondary btn-sm btn-set-default" data-name="${name}">Set As Default</button>`
                : '<button class="btn btn-primary btn-sm" disabled>Active Default</button>'
            }
            <button class="btn btn-secondary btn-sm btn-card-test" data-name="${name}">Test Ticket</button>
          </div>
        `;
        printersGrid.appendChild(card);

        // Select option
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name + (isDef ? ' (Default)' : '');
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
    } catch (err) {
      console.warn('Scan printers error:', err);
    }
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
    const tokenDisplay = raw.token_number
      ? `#${String(raw.token_number).padStart(3, '0')}`
      : `#${(raw.id || '').substring(0, 4).toUpperCase()}`;

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
      const basePaper = rawPaper.split(' + ')[0];
      const amount = (job.total_amount || 0).toFixed(2);

      card.innerHTML = `
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
                   <button class="btn btn-secondary btn-sm btn-print-job" data-id="${job.id}" title="Send duplicate to printer">🔄 Reprint</button>`
                : isPrinting
                ? `<button class="btn btn-primary btn-sm" disabled style="opacity: 0.85;">⏳ Printing to Spooler...</button>`
                : job.status === 'failed'
                ? `<span class="badge-chip red" style="padding: 6px 12px; font-weight: 700; border-radius: 6px;" title="${job.failure_reason || 'Print failure'}">⚠️ PRINT FAILED</span>
                   <button class="btn btn-primary btn-sm btn-print-job" data-id="${job.id}">🔄 Retry Print</button>`
                : !isPaid
                ? `<button class="btn btn-primary btn-sm btn-confirm-cash" data-id="${job.id}">💵 Cash Paid & Print</button>`
                : `<button class="btn btn-primary btn-sm btn-print-job" data-id="${job.id}">🖨️ Print Now</button>`
            }
            <button class="btn btn-secondary btn-sm btn-preview-job" data-id="${job.id}">
              👁️ Preview
            </button>
          </div>
        </div>
      `;

      queueCardsList.appendChild(card);
    });

    // Bind action buttons: Print / Reprint / Retry
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
  }

  // Execute Real Print via physical spooler pipeline
  async function executePrint(job) {
    const card = document.getElementById(`job-card-${job.id}`);
    if (card) card.classList.add('printing');
    job.status = 'printing';
    renderQueue();
    renderHistoryTable();

    const targetPrinter = defaultPrinterName || 'Default Printer';
    showToast(`Sending Token ${job.token_number || ''} to ${targetPrinter}...`, 'info');

    try {
      const res = await window.quickprintApi.printJob(job.id, {
        printerName: defaultPrinterName,
        fileUrl: job.file_url,
        copies: job.copies || 1,
        duplex: job.duplex,
        paperSize: (job.paper_size || 'A4').split(' + ')[0],
      });

      if (res && res.success) {
        showToast(`Token ${job.token_number || ''} spooled & verified completed!`, 'success');
        job.status = 'completed';
        renderQueue();
        renderHistoryTable();
        updateFinancials();
      } else {
        job.status = 'failed';
        job.failure_reason = res?.error || 'Spooler error';
        renderQueue();
        renderHistoryTable();
        showToast(`Spool error: ${res?.error || 'Failed to print'}`, 'danger');
      }
    } catch (e) {
      job.status = 'failed';
      job.failure_reason = e.message;
      renderQueue();
      renderHistoryTable();
      showToast(`Printer driver error: ${e.message}`, 'danger');
    } finally {
      if (card) card.classList.remove('printing');
    }
  }

  // --- PDF PREVIEW ---
  function openPreview(job) {
    activePreviewJob = job;
    const tokenDisplay = job.token_number || `#${job.id.substring(0, 4).toUpperCase()}`;
    previewTitle.textContent = `Document Preview — Token ${tokenDisplay} (${job.customer_name || 'Customer'})`;
    previewSpecs.textContent = `${job.page_count || 1} Pages • ${job.copies || 1} Copies • ${job.color_mode || 'B&W'} • ${job.duplex ? 'Duplex' : 'Single'}`;

    if (job.file_url) {
      previewIframe.srcdoc = `
        <body style="font-family:system-ui,-apple-system,sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; background:#f8fafc; color:#64748b;">
          <div style="text-align:center;">
            <p>⏳ Loading document preview...</p>
          </div>
        </body>
      `;
      // Verify document availability (retention policy / purge handling)
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
                  <h3 style="margin: 0 0 8px; color: #0f172a; font-weight: 700;">Document no longer available</h3>
                  <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0;">This customer document was securely purged in accordance with data privacy and retention policies.</p>
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

    previewModal.classList.add('active');
  }

  btnClosePreviewModal.addEventListener('click', () => {
    previewModal.classList.remove('active');
    previewIframe.src = 'about:blank';
  });

  btnPreviewPrintNow.addEventListener('click', () => {
    if (activePreviewJob) {
      previewModal.classList.remove('active');
      previewIframe.src = 'about:blank';
      executePrint(activePreviewJob);
    }
  });

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
    const pricing = {
      rateBwSingle: parseFloat(rateBwSingle.value) || 2.0,
      rateBwDouble: parseFloat(rateBwDouble.value) || 3.0,
      rateColorSingle: parseFloat(rateColorSingle.value) || 10.0,
      rateColorDouble: parseFloat(rateColorDouble.value) || 18.0,
      rateSpiralBinding: parseFloat(rateSpiralBinding.value) || 30.0,
      rateStapling: parseFloat(rateStapling.value) || 2.0,
      paperSizes: {
        a4: { name: 'A4', extra: 0.0, description: 'Standard 75 GSM' },
        a3: { name: 'A3', extra: parseFloat(ratePaperA3 ? ratePaperA3.value : '4') || 0.0, description: 'Large Sheet' },
        custom: { name: 'Legal/Bond', extra: parseFloat(ratePaperLegal ? ratePaperLegal.value : '2') || 0.0, description: 'Legal / Bond' },
        passport: { name: 'Passport (8×)', extra: parseFloat(ratePaperPassport ? ratePaperPassport.value : '35') || 0.0, description: 'Glossy Sheet' },
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
    };

    autoPrintEnabled = settings.autoPrintDefault;
    btnAutoPrintState.classList.toggle('active', autoPrintEnabled);
    btnAutoPrintState.textContent = autoPrintEnabled ? 'ON' : 'OFF';

    try {
      await window.quickprintApi.saveSettings(settings);
      showToast('Preferences & Payment Methods saved to cloud!', 'success');
      shopNameDisplay.textContent = settings.shopName || currentShop.name;
      await renderShopQrAndUrls();
    } catch (e) {
      showToast('Failed to save preferences.', 'danger');
    }
  });

  // --- RENDER QR CODE & MONITOR TV URLS ---
  async function renderShopQrAndUrls() {
    const shopSlug = currentShop?.qr_code_slug || currentShop?.slug || 'mahadev-printer-shop';
    currentShop.slug = shopSlug;
    currentShop.qr_code_slug = shopSlug;

    const baseUrl = (currentAppUrl || 'https://doc2print.vercel.app').replace(/\/+$/, '');
    const cleanDomain = getCleanDomain(baseUrl);

    if (shopSlugDisplay) shopSlugDisplay.textContent = `${cleanDomain}/kiosk/${shopSlug}`;
    if (cfgDomainPrefix) cfgDomainPrefix.textContent = `${cleanDomain}/kiosk/`;

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

  // --- MODAL: COUNTER QR ---
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
      showToast('Kiosk URL copied to clipboard!', 'success');
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

  // --- STARTUP BOOTSTRAP ---
  loadSession();
})();
