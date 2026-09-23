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
  const btnSavePricing = document.getElementById('btnSavePricing');

  // View: Settings
  const cfgAutoLaunch = document.getElementById('cfgAutoLaunch');
  const cfgSoundAlert = document.getElementById('cfgSoundAlert');
  const cfgAutoPrintDefault = document.getElementById('cfgAutoPrintDefault');
  const cfgShopName = document.getElementById('cfgShopName');
  const cfgShopSlug = document.getElementById('cfgShopSlug');
  const btnSaveSettings = document.getElementById('btnSaveSettings');

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

      // Normalize shop slug
      const shopSlug = currentShop.qr_code_slug || currentShop.slug || 'counter';
      currentShop.slug = shopSlug;
      currentShop.qr_code_slug = shopSlug;

      // Update UI with shop data
      shopNameDisplay.textContent = currentShop.name;
      shopSlugDisplay.textContent = `quickprint.in/kiosk/${shopSlug}`;
      shopAvatar.textContent = currentShop.name.substring(0, 2).toUpperCase();
      ownerEmailDisplay.textContent = currentOwner.email;
      ownerInitial.textContent = currentOwner.email.charAt(0).toUpperCase();

      cfgShopName.value = currentShop.name;
      cfgShopSlug.value = shopSlug;

      await renderShopQrAndUrls();

      // Pricing values
      if (currentShop.settings) {
        rateBwSingle.value = currentShop.settings.rateBwSingle || 2;
        rateBwDouble.value = currentShop.settings.rateBwDouble || 3;
        rateColorSingle.value = currentShop.settings.rateColorSingle || 10;
        rateColorDouble.value = currentShop.settings.rateColorDouble || 18;
        rateSpiralBinding.value = currentShop.settings.rateSpiralBinding || 30;
        rateStapling.value = currentShop.settings.rateStapling || 2;
      }

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

  // --- REAL-TIME JOBS & QUEUE ---
  async function fetchJobs() {
    try {
      const jobs = await window.quickprintApi.getJobs();
      activeJobs = jobs || [];
      renderQueue();
      updateFinancials();
    } catch (err) {
      console.error('Fetch jobs error:', err);
    }
  }

  // Auto-print mode toggle
  btnAutoPrintState.addEventListener('click', () => {
    autoPrintEnabled = !autoPrintEnabled;
    btnAutoPrintState.classList.toggle('active', autoPrintEnabled);
    btnAutoPrintState.textContent = autoPrintEnabled ? 'ON' : 'OFF';
    showToast(`Auto-Print Mode is now ${autoPrintEnabled ? 'ENABLED' : 'DISABLED'}`, 'info');
  });

  // Pause orders toggle
  btnPauseOrders.addEventListener('click', () => {
    ordersPaused = !ordersPaused;
    if (ordersPaused) {
      shopStatusIndicator.classList.add('paused');
      shopStatusText.textContent = 'Orders Paused (Counter Busy)';
      btnPauseOrdersText.textContent = '▶️ Resume Orders';
      showToast('Kiosk intake is PAUSED. Customers will see "Counter Busy".', 'warning');
    } else {
      shopStatusIndicator.classList.remove('paused');
      shopStatusText.textContent = 'Live — Accepting Orders';
      btnPauseOrdersText.textContent = '⏸️ Pause Orders';
      showToast('Kiosk intake is LIVE.', 'success');
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
    const pendingJobs = activeJobs.filter((j) => j.status === 'pending' || j.status === 'paid');
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
      const paperSize = job.paper_size || 'A4';
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
              <span class="spec-chip">${paperSize}</span>
              ${job.binding ? '<span class="spec-chip color">Spiral Binding</span>' : ''}
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
                ? '<button class="btn btn-secondary btn-sm" disabled>✓ Printed</button>'
                : `<button class="btn btn-primary btn-sm btn-print-job" data-id="${job.id}">
                     ${isPrinting ? '⏳ Spooling...' : '🖨️ Print Now'}
                   </button>`
            }
            <button class="btn btn-secondary btn-sm btn-preview-job" data-id="${job.id}">
              👁️ Preview
            </button>
            <button class="btn btn-secondary btn-sm btn-done-job" data-id="${job.id}" title="Mark as Completed">
              ✓ Done
            </button>
          </div>
        </div>
      `;

      queueCardsList.appendChild(card);
    });

    // Bind action buttons
    document.querySelectorAll('.btn-print-job').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const job = activeJobs.find((j) => j.id === id);
        if (job) executePrint(job);
      });
    });

    document.querySelectorAll('.btn-preview-job').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const job = activeJobs.find((j) => j.id === id);
        if (job) openPreview(job);
      });
    });

    document.querySelectorAll('.btn-done-job').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        await markJobCompleted(id);
      });
    });
  }

  // Execute Real Print
  async function executePrint(job) {
    const card = document.getElementById(`job-card-${job.id}`);
    if (card) card.classList.add('printing');

    showToast(`Sending Token ${job.token_number || ''} to ${defaultPrinterName}...`, 'info');

    try {
      const res = await window.quickprintApi.printJob(job.id, {
        printerName: defaultPrinterName,
        fileUrl: job.file_url,
        copies: job.copies || 1,
        duplex: job.duplex,
        paperSize: job.paper_size || 'A4',
      });

      if (res.success) {
        showToast(`Token ${job.token_number || ''} spooled successfully!`, 'success');
        job.status = 'completed';
        renderQueue();
        updateFinancials();
      } else {
        showToast(`Spool error: ${res.error || 'Failed to print'}`, 'danger');
      }
    } catch (e) {
      showToast(`Printer driver error: ${e.message}`, 'danger');
    } finally {
      if (card) card.classList.remove('printing');
    }
  }

  // Mark Completed
  async function markJobCompleted(jobId) {
    try {
      await window.quickprintApi.updateJobStatus(jobId, 'completed');
      const job = activeJobs.find((j) => j.id === jobId);
      if (job) job.status = 'completed';
      renderQueue();
      updateFinancials();
      showToast('Marked order as completed.', 'info');
    } catch (e) {
      showToast('Failed to update job status.', 'danger');
    }
  }

  // --- PDF PREVIEW ---
  function openPreview(job) {
    activePreviewJob = job;
    const tokenDisplay = job.token_number || `#${job.id.substring(0, 4).toUpperCase()}`;
    previewTitle.textContent = `Document Preview — Token ${tokenDisplay} (${job.customer_name || 'Customer'})`;
    previewSpecs.textContent = `${job.page_count || 1} Pages • ${job.copies || 1} Copies • ${job.color_mode || 'B&W'} • ${job.duplex ? 'Duplex' : 'Single'}`;

    if (job.file_url) {
      previewIframe.src = job.file_url;
    } else {
      previewIframe.srcdoc = `
        <body style="font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; background:#FAFAFA;">
          <div style="text-align:center;">
            <h2>Preview Document Ready</h2>
            <p style="color:#666;">Token: ${tokenDisplay} | File: ${job.file_name || 'document.pdf'}</p>
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
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const job = activeJobs.find((j) => j.id === id);
        if (job) executePrint(job);
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
    const settings = {
      autoLaunch: cfgAutoLaunch.checked,
      soundAlert: cfgSoundAlert.checked,
      autoPrintDefault: cfgAutoPrintDefault.checked,
      shopName: cfgShopName.value.trim(),
      shopSlug: cfgShopSlug.value.trim(),
    };

    try {
      await window.quickprintApi.saveSettings(settings);
      showToast('Settings saved successfully.', 'success');
      shopNameDisplay.textContent = settings.shopName || currentShop.name;
    } catch (e) {
      showToast('Failed to save preferences.', 'danger');
    }
  });

  // --- RENDER QR CODE & MONITOR TV URLS ---
  async function renderShopQrAndUrls() {
    const shopSlug = currentShop?.qr_code_slug || currentShop?.slug || 'mahadev-printer-shop';
    currentShop.slug = shopSlug;
    currentShop.qr_code_slug = shopSlug;

    const kioskUrl = `https://quickprint.in/kiosk/${shopSlug}`;
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

    const tvUrl = `https://quickprint.in/tv/${shopSlug}`;
    const tvDisplayUrlInput = document.getElementById('tvDisplayUrlInput');
    const tvSmartTvUrl = document.getElementById('tvSmartTvUrl');
    if (tvDisplayUrlInput) tvDisplayUrlInput.value = tvUrl;
    if (tvSmartTvUrl) tvSmartTvUrl.textContent = `quickprint.in/tv/${shopSlug}`;
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
      window.open(`https://quickprint.in/tv/${slug}`, '_blank');
    }
  }

  if (btnOpenTvBoardTitle) btnOpenTvBoardTitle.addEventListener('click', openTvBoard);
  if (btnLaunchTvWindow) btnLaunchTvWindow.addEventListener('click', openTvBoard);

  if (btnCopyTvUrl) {
    btnCopyTvUrl.addEventListener('click', () => {
      const slug = currentShop?.slug || currentShop?.qr_code_slug || 'counter';
      const tvUrl = `https://quickprint.in/tv/${slug}`;
      navigator.clipboard.writeText(tvUrl).then(() => {
        showToast('TV Waiting Board URL copied to clipboard!', 'success');
      });
    });
  }

  if (btnOpenTvBrowser) {
    btnOpenTvBrowser.addEventListener('click', () => {
      const slug = currentShop?.slug || currentShop?.qr_code_slug || 'counter';
      const tvUrl = `https://quickprint.in/tv/${slug}`;
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
      activeJobs.unshift(incomingJob);
      if (cfgSoundAlert.checked && orderChime) {
        orderChime.play().catch(() => {});
      }
      showToast(`New Order Token #${incomingJob.token_number || '001'} received!`, 'success');
      renderQueue();
      updateFinancials();

      if (autoPrintEnabled && incomingJob.payment_status === 'paid') {
        executePrint(incomingJob);
      }
    });
  }

  // --- STARTUP BOOTSTRAP ---
  loadSession();
})();
