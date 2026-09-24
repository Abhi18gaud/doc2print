'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CreditCard,
  Banknote,
  QrCode,
  ShieldCheck,
  Printer,
  ChevronRight,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { HeaderBar } from '@/components/HeaderBar';
import { TicketCard, TicketPerforation } from '@/components/TicketCard';
import { StampBadge } from '@/components/StampBadge';
import { Shop } from '@/types/database';

export default function KioskCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const shopSlug = (params?.shopSlug as string) || 'shree-ganesh-xerox';

  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Job parameters retrieved from session
  const [fileName, setFileName] = useState('Document.pdf');
  const [fileType, setFileType] = useState('application/pdf');
  const [paperSize, setPaperSize] = useState('a4');
  const [colorMode, setColorMode] = useState<'bw' | 'color'>('bw');
  const [copies, setCopies] = useState(1);
  const [duplex, setDuplex] = useState(false);
  const [binding, setBinding] = useState(false);
  const [stapling, setStapling] = useState(false);
  const [orientation, setOrientation] = useState('portrait');
  const [pages, setPages] = useState(1);
  const [price, setPrice] = useState(2.0);

  // Payment method: 'online' | 'cash'
  const [paymentMode, setPaymentMode] = useState<'online' | 'cash'>('online');

  useEffect(() => {
    // Load config from sessionStorage
    const storedName = sessionStorage.getItem('qp_file_name');
    const storedType = sessionStorage.getItem('qp_file_type');
    const storedPaper = sessionStorage.getItem('qp_paper_size');
    const storedColor = sessionStorage.getItem('qp_color_mode');
    const storedCopies = sessionStorage.getItem('qp_copies');
    const storedDuplex = sessionStorage.getItem('qp_duplex');
    const storedBinding = sessionStorage.getItem('qp_binding') === 'true';
    const storedStapling = sessionStorage.getItem('qp_stapling') === 'true';
    const storedOrientation = sessionStorage.getItem('qp_orientation');
    const storedPages = sessionStorage.getItem('qp_pages');
    const storedPrice = sessionStorage.getItem('qp_price');

    if (storedName) setFileName(storedName);
    if (storedType) setFileType(storedType);
    if (storedPaper) setPaperSize(storedPaper);
    if (storedColor) setColorMode(storedColor as any);
    if (storedCopies) setCopies(parseInt(storedCopies, 10) || 1);
    if (storedDuplex) setDuplex(storedDuplex === 'true');
    setBinding(storedBinding);
    setStapling(storedStapling);
    if (storedOrientation) setOrientation(storedOrientation);
    if (storedPages) setPages(parseInt(storedPages, 10) || 1);
    if (storedPrice) setPrice(parseFloat(storedPrice) || 2.0);

    // 1. Immediately restore cached shop if available
    const cachedShop = sessionStorage.getItem('qp_shop_context');
    if (cachedShop) {
      try {
        const parsed = JSON.parse(cachedShop);
        if (parsed?.id) setShop(parsed);
      } catch (e) {}
    }

    async function loadShop() {
      try {
        const res = await fetch(`/api/shops/${shopSlug}`);
        if (res.ok) {
          const data = await res.json();
          setShop(data.shop);
          sessionStorage.setItem('qp_shop_context', JSON.stringify(data.shop));
        }
      } catch (err) {
        console.error('Error fetching shop:', err);
      }
    }
    loadShop();
  }, [shopSlug]);

  const payConfig = shop?.price_config?.payment_methods || { enable_upi: true, enable_cash: true };
  const isUpiEnabled = payConfig.enable_upi !== false;
  const isCashEnabled = payConfig.enable_cash !== false;
  const hasPaymentMethod = isUpiEnabled || isCashEnabled;
  const isOrdersPaused = shop?.price_config?.is_accepting_orders === false || shop?.price_config?.orders_paused === true;

  // Auto-switch payment mode if the currently selected one is disabled by shop keeper
  useEffect(() => {
    if (!isUpiEnabled && isCashEnabled && paymentMode !== 'cash') {
      setPaymentMode('cash');
    } else if (isUpiEnabled && !isCashEnabled && paymentMode !== 'online') {
      setPaymentMode('online');
    }
  }, [isUpiEnabled, isCashEnabled, paymentMode]);

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isOrdersPaused) {
        throw new Error('This shop is currently busy and has paused taking new orders. Please check with the counter operator.');
      }
      if (!hasPaymentMethod) {
        throw new Error('No payment method is currently enabled for this shop. Please ask the shopkeeper to enable payment methods.');
      }
      if (paymentMode === 'online' && !isUpiEnabled) {
        throw new Error('Online payment is disabled by the shopkeeper. Please choose an enabled payment method.');
      }
      if (paymentMode === 'cash' && !isCashEnabled) {
        throw new Error('Cash payment is disabled by the shopkeeper. Please choose an enabled payment method.');
      }

      let activeShop = shop;
      if (!activeShop?.id) {
        const cached = sessionStorage.getItem('qp_shop_context');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed?.id) activeShop = parsed;
          } catch (e) {}
        }
      }
      if (!activeShop?.id) {
        try {
          const res = await fetch(`/api/shops/${shopSlug}`);
          if (res.ok) {
            const data = await res.json();
            if (data.shop?.id) {
              activeShop = data.shop;
              setShop(data.shop);
              sessionStorage.setItem('qp_shop_context', JSON.stringify(data.shop));
            }
          }
        } catch (fetchErr) {
          console.error('Emergency shop fetch failed:', fetchErr);
        }
      }

      const effectiveShopId = activeShop?.id || shopSlug;
      if (!effectiveShopId) {
        throw new Error('This shop is currently offline or unreachable. Please scan the QR code again.');
      }

      // Reconstruct file from sessionStorage or create placeholder
      const base64Data = sessionStorage.getItem('qp_file_data');
      let fileToSend: File;

      if (base64Data) {
        const fetchRes = await fetch(base64Data);
        const blob = await fetchRes.blob();
        fileToSend = new File([blob], fileName, { type: fileType });
      } else {
        // Fallback demo file if storage cleared
        const dummyPdf = new Blob(['%PDF-1.4 Mock QuickPrint Document'], {
          type: 'application/pdf',
        });
        fileToSend = new File([dummyPdf], fileName, { type: 'application/pdf' });
      }

      // 1. Prepare FormData
      const formData = new FormData();
      formData.append('file', fileToSend);
      formData.append('shop_id', effectiveShopId);
      formData.append('pages', String(pages));
      formData.append('copies', String(copies));
      formData.append('paper_size', paperSize);
      formData.append('color_mode', colorMode);
      formData.append('duplex', String(duplex));
      formData.append('binding', String(binding));
      formData.append('stapling', String(stapling));
      formData.append('orientation', orientation);
      formData.append('price', String(price));
      formData.append('payment_mode', paymentMode);

      // If online: in test environment we simulate immediate payment success
      if (paymentMode === 'online') {
        formData.append('simulate_paid', 'true');
      }

      // 2. Submit to /api/jobs/create
      const res = await fetch('/api/jobs/create', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create print job');
      }

      const createdJob = data.job;

      // 3. If online payment was chosen, also record payment entry
      if (paymentMode === 'online') {
        await fetch('/api/cashfree/simulate-pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: createdJob.id }),
        });
      }

      // Navigate to live token queue page
      router.push(`/kiosk/${shopSlug}/token/${createdJob.id}`);
    } catch (err: unknown) {
      console.error('Checkout error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to submit order';
      setError(msg);
      setLoading(false);
    }
  };

  const impressions = pages * copies;

  return (
    <div className="min-h-screen bg-[#fafaf7] flex flex-col justify-between pb-28">
      <HeaderBar
        shopName={shop?.name || 'QuickPrint Counter'}
        counterInfo="Order Review"
        backHref={`/kiosk/${shopSlug}/options`}
      />

      <main className="max-w-xl mx-auto w-full px-4 pt-20 flex-1 flex flex-col gap-4">
        {/* 3-Step Progress Indicator */}
        <div className="w-full bg-[#f4f4f1] rounded-lg px-4 py-2.5 flex items-center justify-between border border-[#e6e5df]">
          <div className="flex items-center gap-1.5 opacity-60">
            <span className="w-5 h-5 rounded-full bg-[#e8e8e5] text-[#1c1b1f] font-mono text-center font-bold flex items-center justify-center text-[11px]">
              ✓
            </span>
            <span className="text-[13px] text-[#1c1b1f]">Upload</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#a8a6a1]" />
          <div className="flex items-center gap-1.5 opacity-60">
            <span className="w-5 h-5 rounded-full bg-[#e8e8e5] text-[#1c1b1f] font-mono text-center font-bold flex items-center justify-center text-[11px]">
              ✓
            </span>
            <span className="text-[13px] text-[#1c1b1f]">Options</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#a8a6a1]" />
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-[#1c1b1f] text-white font-mono text-center font-bold flex items-center justify-center text-[11px]">
              3
            </span>
            <span className="text-[13px] text-[#1c1b1f] font-bold">Pay & Collect</span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-[#ffdad6] border border-[#ba1a1a] rounded text-[#93000a] text-[13px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Thermal Chit Receipt Card */}
        <TicketCard>
          <div className="p-4 bg-white">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold tracking-widest text-[#6b6966] uppercase">
                  COUNTER CHIT SUMMARY
                </span>
                <h3 className="text-[16px] font-bold text-[#1c1b1f] mt-0.5">
                  {shop?.name || 'Shree Ganesh Xerox'}
                </h3>
                <span className="text-[11px] font-mono text-[#6b6966]">
                  Counter #04 • Instant Auto-Spool
                </span>
              </div>
              <StampBadge status={paymentMode === 'online' ? 'PAID' : 'CASH'} />
            </div>

            {/* Itemized Parameters */}
            <div className="mt-4 pt-3 border-t border-[#f4f4f1] space-y-2">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#6b6966] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[200px]">{fileName}</span>
                </span>
                <span className="font-mono font-semibold text-[#1c1b1f]">
                  {pages} {pages === 1 ? 'page' : 'pages'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#6b6966]">Format & Color</span>
                <span className="font-mono font-semibold text-[#1c1b1f]">
                  {paperSize.toUpperCase()} • {colorMode === 'color' ? 'Full Color' : 'B&W'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#6b6966]">Sets & Sides</span>
                <span className="font-mono font-semibold text-[#1c1b1f]">
                  {copies} {copies === 1 ? 'copy' : 'copies'} ({duplex ? 'Duplex 2-Sided' : 'Single-Sided'})
                </span>
              </div>

              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#6b6966]">Finishing</span>
                <span className="font-mono font-semibold text-[#1c1b1f]">
                  {binding ? '🌀 Spiral Binding' : stapling ? '📎 Corner Staple' : 'Loose Sheets'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#6b6966]">Total Impressions</span>
                <span className="font-mono font-semibold text-[#1c1b1f]">
                  {impressions} prints
                </span>
              </div>
            </div>
          </div>

          <TicketPerforation />

          <div className="p-4 bg-[#f4f4f1] flex items-center justify-between border-t border-[#e6e5df]">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#6b6966] font-bold">
                PAYABLE AMOUNT
              </span>
              <div className="text-[24px] font-mono font-bold text-[#1c1b1f] leading-none mt-0.5">
                ₹{price.toFixed(2)}
              </div>
            </div>
            <span className="text-[11px] font-mono text-[#1b7a4d] bg-[#e6f7ee] px-2 py-1 rounded font-semibold">
              TAX INCLUDED
            </span>
          </div>
        </TicketCard>

        {/* Pause Orders Alert */}
        {isOrdersPaused && (
          <div className="p-4 bg-[#fff8e1] border border-[#f59e0b] rounded-lg text-[#92400e] text-[13px] flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-[#f59e0b] mt-0.5" />
            <div className="flex flex-col">
              <span className="font-bold text-[14px]">Counter Busy — Orders Temporarily Paused</span>
              <span className="text-[12px] mt-0.5 leading-relaxed">
                The shop operator is currently clearing queued jobs and has temporarily paused new orders. Please wait or check with the counter operator.
              </span>
            </div>
          </div>
        )}

        {/* No Payment Method Warning (Requirement 6) */}
        {!hasPaymentMethod && (
          <div className="p-4 bg-[#ffdad6] border border-[#ba1a1a] rounded-lg text-[#93000a] text-[13px] flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-[#ba1a1a] mt-0.5" />
            <div className="flex flex-col">
              <span className="font-bold text-[14px]">Ordering Temporarily Unavailable</span>
              <span className="text-[12px] mt-0.5 leading-relaxed">
                No customer payment method is currently enabled for this shop. Please notify the shopkeeper at the counter to enable payment methods.
              </span>
            </div>
          </div>
        )}

        {/* Payment Method Selector (Only show enabled payment methods - Requirement 5) */}
        {hasPaymentMethod && (
          <div className="flex flex-col gap-2.5">
            <label className="text-[13px] font-mono uppercase tracking-wider font-bold text-[#1c1b1f] px-1">
              SELECT PAYMENT METHOD
            </label>

            {/* Option 1: Online Payment (Cashfree UPI / Cards) - only if enabled */}
            {isUpiEnabled && (
              <button
                type="button"
                onClick={() => setPaymentMode('online')}
                className={`p-4 rounded-lg border text-left flex items-start gap-3 transition-all ${
                  paymentMode === 'online'
                    ? 'bg-white border-[#ff5a1f] ring-2 ring-[#ff5a1f]/20 shadow-xs'
                    : 'bg-white border-[#e6e5df] hover:border-[#1c1b1f]'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    paymentMode === 'online'
                      ? 'bg-[#ff5a1f] text-white'
                      : 'bg-[#f4f4f1] text-[#1c1b1f]'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-bold text-[#1c1b1f]">
                      Online UPI / Cashfree
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#e6f7ee] text-[#0b4e2f]">
                      FASTEST
                    </span>
                  </div>
                  <p className="text-[12px] text-[#6b6966] mt-0.5">
                    GPay, PhonePe, Paytm, Cards. Prints instantly without waiting.
                  </p>
                </div>
              </button>
            )}

            {/* Option 2: Cash at Counter - only if enabled */}
            {isCashEnabled && (
              <button
                type="button"
                onClick={() => setPaymentMode('cash')}
                className={`p-4 rounded-lg border text-left flex items-start gap-3 transition-all ${
                  paymentMode === 'cash'
                    ? 'bg-white border-[#1c1b1f] ring-2 ring-[#1c1b1f]/20 shadow-xs'
                    : 'bg-white border-[#e6e5df] hover:border-[#1c1b1f]'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    paymentMode === 'cash'
                      ? 'bg-[#1c1b1f] text-white'
                      : 'bg-[#f4f4f1] text-[#1c1b1f]'
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-bold text-[#1c1b1f]">
                      Cash at Counter
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#e8e8e5] text-[#1c1b1f]">
                      COUNTER
                    </span>
                  </div>
                  <p className="text-[12px] text-[#6b6966] mt-0.5">
                    Hand ₹{price.toFixed(2)} cash to shopkeeper. Token generates now;
                    print starts upon confirmation.
                  </p>
                </div>
              </button>
            )}
          </div>
        )}
      </main>

      {/* Persistent Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#fafaf7]/95 backdrop-blur-md border-t border-[#e6e5df] p-4 pb-safe shadow-lg">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[11px] font-mono uppercase text-[#6b6966]">
              {isOrdersPaused ? 'Intake Paused' : !hasPaymentMethod ? 'Unavailable' : paymentMode === 'online' ? 'Direct Spool' : 'Counter Cash'}
            </span>
            <span className="text-[20px] font-mono font-bold text-[#1c1b1f]">
              ₹{price.toFixed(2)}
            </span>
          </div>

          <button
            type="button"
            disabled={loading || isOrdersPaused || !hasPaymentMethod}
            onClick={handlePlaceOrder}
            className={`h-12 px-6 rounded text-white font-bold text-[14px] flex items-center gap-2 shadow-sm transition-all btn-tactile ${
              isOrdersPaused || !hasPaymentMethod
                ? 'bg-[#94a3b8] cursor-not-allowed opacity-80'
                : paymentMode === 'online'
                ? 'bg-[#ff5a1f] hover:bg-[#e04b14]'
                : 'bg-[#1c1b1f] hover:bg-[#333]'
            } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <span>
              {loading
                ? 'Submitting...'
                : isOrdersPaused
                ? 'Orders Paused'
                : !hasPaymentMethod
                ? 'Payments Disabled'
                : paymentMode === 'online'
                ? `Pay ₹${price.toFixed(2)} & Print`
                : 'Get Token & Pay Cash'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
