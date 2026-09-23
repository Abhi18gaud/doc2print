const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
const PrintDriver = require('./printer');

// 1. Load config
const configPath = path.join(__dirname, 'config.json');
let config = {};
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

const shopId = process.env.QUICKPRINT_SHOP_ID || config.shopId || '11111111-1111-1111-1111-111111111111';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || config.supabaseUrl;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || config.supabaseAnonKey;
const tempDir = path.resolve(__dirname, config.tempDir || './spool_temp');

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

console.log('====================================================');
console.log('       QuickPrint Local Windows Print Agent         ');
console.log('====================================================');
console.log(`[INIT] Shop ID: ${shopId}`);
console.log(`[INIT] Spool Temp Dir: ${tempDir}`);

// 2. Initialize Supabase Client
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const driver = new PrintDriver(config);

// 3. FIFO Queue State
const jobQueue = [];
let isProcessing = false;

// Helper to download remote file
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const client = url.startsWith('https') ? https : http;

    client
      .get(url, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          // Handle redirects
          downloadFile(response.headers.location, destPath)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download file. HTTP Status: ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      })
      .on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
  });
}

// 4. Job Processor (Strict FIFO)
async function processQueue() {
  if (isProcessing || jobQueue.length === 0) return;
  isProcessing = true;

  const job = jobQueue.shift();
  console.log(`\n----------------------------------------------------`);
  console.log(`[QUEUE] Picked up Job #${job.token_number} (ID: ${job.id})`);

  const tempFilePath = path.join(
    tempDir,
    `job_${job.token_number}_${Date.now()}_${path.basename(job.file_name || 'print.pdf')}`
  );

  try {
    // A. Update status to 'printing'
    await supabase
      .from('jobs')
      .update({ print_status: 'printing' })
      .eq('id', job.id);

    console.log(`[STATUS] Job #${job.token_number} set to PRINTING`);

    // B. Download file
    if (!job.file_url) {
      throw new Error('Job has no file URL');
    }

    console.log(`[DOWNLOAD] Fetching document from cloud storage...`);
    await downloadFile(job.file_url, tempFilePath);
    console.log(`[DOWNLOAD] Document saved to ${tempFilePath}`);

    // C. Send to printer
    await driver.printFile(tempFilePath, job);

    // D. Mark completed
    await supabase
      .from('jobs')
      .update({
        print_status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    console.log(`[STATUS] Job #${job.token_number} COMPLETED & DISPENSED`);
  } catch (err) {
    console.error(`[ERROR] Job #${job.token_number} execution failed:`, err.message);

    // Mark failed without blocking the queue
    await supabase
      .from('jobs')
      .update({
        print_status: 'failed',
        failure_reason: err.message,
      })
      .eq('id', job.id);
  } finally {
    // E. Auto-purge temp file immediately after print
    if (fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`[CLEANUP] Purged local buffer file.`);
      } catch (e) {
        console.warn(`[CLEANUP] Could not remove temp file:`, e.message);
      }
    }

    isProcessing = false;
    // Immediately process next job in queue if available
    setImmediate(processQueue);
  }
}

function enqueueJob(job) {
  if (jobQueue.some((j) => j.id === job.id)) {
    return; // Already in queue
  }
  console.log(`[REALTIME] Enqueuing Job #${job.token_number} (Status: ${job.print_status})`);
  jobQueue.push(job);
  processQueue();
}

// 5. Initial Spool Query on Agent Boot
async function syncExistingQueuedJobs() {
  console.log('[INIT] Checking database for any existing queued jobs...');
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('shop_id', shopId)
    .eq('print_status', 'queued')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[INIT] Error querying queued jobs:', error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log(`[INIT] Found ${data.length} previously queued job(s). Adding to FIFO queue.`);
    data.forEach(enqueueJob);
  } else {
    console.log('[INIT] Queue clean. Standing by for realtime push events.');
  }
}

// 6. Supabase Realtime Listener
function startRealtimeListener() {
  console.log(`[REALTIME] Subscribing to Supabase Realtime for shop: ${shopId}...`);

  supabase
    .channel(`shop_print_agent_${shopId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'jobs',
        filter: `shop_id=eq.${shopId}`,
      },
      (payload) => {
        const newJob = payload.new;
        if (newJob && newJob.print_status === 'queued') {
          enqueueJob(newJob);
        }
      }
    )
    .subscribe((status) => {
      console.log(`[REALTIME] Subscription channel status: ${status}`);
    });
}

// 7. Hardware Heartbeat Ping
async function sendHeartbeat() {
  try {
    await supabase
      .from('printers')
      .update({
        status: 'online',
        last_seen_at: new Date().toISOString(),
      })
      .eq('shop_id', shopId);
  } catch (err) {
    console.warn('[HEARTBEAT] Ping failed:', err.message);
  }
}

// Startup sequence
(async () => {
  const printers = await driver.listAvailablePrinters();
  console.log(`[HARDWARE] Detected printers:`, printers);

  await syncExistingQueuedJobs();
  startRealtimeListener();

  // Send heartbeat immediately, then every 30s
  sendHeartbeat();
  setInterval(sendHeartbeat, 30000);

  console.log('\n[AGENT READY] Listening for print jobs via Supabase Realtime. Press Ctrl+C to exit.');
})();
