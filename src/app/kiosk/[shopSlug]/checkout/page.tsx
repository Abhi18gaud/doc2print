'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CreditCard,
  Banknote,
  ShieldCheck,
  Printer,
  ArrowRight,
  AlertCircle,
  FileText,
  ChevronLeft,
  CheckCircle2,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { Shop } from '@/types/database';
import { calculatePrintPrice, DEFAULT_PRICE_CONFIG } from '@/lib/price-calculator';
import { clearPersistedKioskFiles } from '@/lib/kiosk-storage';

interface FileConfig {
  name: string;
  pages: number;
  copies: number;
  mode: 'document' | 'photo';
  colorMode: 'bw' | 'color';
  paperSize: string;
  paperType: string;
  quality: string;
  sides: string;
  photoSize?: string;
  photoPaper?: string;
  photoQuality?: string;
  orientation: string;
  price: number;
}

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
  const [paperType, setPaperType] = useState('plain');
  const [quality, setQuality] = useState('normal');
  const [photoSize, setPhotoSize] = useState('');
  const [photoPaper, setPhotoPaper] = useState('');
  const [photoQuality, setPhotoQuality] = useState('');
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [mode, setMode] = useState<'document' | 'photo'>('document');
  const [colorMode, setColorMode] = useState<'bw' | 'color'>('bw');
  const [copies, setCopies] = useState(1);
  const [duplex, setDuplex] = useState(false);
  const [binding, setBinding] = useState(false);
  const [stapling, setStapling] = useState(false);
  const [orientation, setOrientation] = useState('portrait');
  const [pages, setPages] = useState(1);
  const [price, setPrice] = useState(2.0);
  const [fileConfigs, setFileConfigs] = useState<FileConfig[]>([]);
  const [filesCount, setFilesCount] = useState(1);

  // Payment method: 'online' | 'cash'
  const [paymentMode, setPaymentMode] = useState<'online' | 'cash'>('online');

  useEffect(() => {
    // Load config from sessionStorage
    const storedName = sessionStorage.getItem('qp_file_name');
    const storedType = sessionStorage.getItem('qp_file_type');
    const storedPaper = sessionStorage.getItem('qp_paper_size');
    const storedPaperType = sessionStorage.getItem('qp_paper_type');
    const storedQuality = sessionStorage.getItem('qp_quality');
    const storedPhotoSize = sessionStorage.getItem('qp_photo_size');
    const storedPhotoPaper = sessionStorage.getItem('qp_photo_paper');
    const storedPhotoQuality = sessionStorage.getItem('qp_photo_quality');
    const storedSelectedPages = sessionStorage.getItem('qp_selected_pages');
    const storedMode = sessionStorage.getItem('qp_mode');
    const storedColor = sessionStorage.getItem('qp_color_mode');
    const storedCopies = sessionStorage.getItem('qp_copies');
    const storedDuplex = sessionStorage.getItem('qp_duplex');
    const storedBinding = sessionStorage.getItem('qp_binding') === 'true';
    const storedStapling = sessionStorage.getItem('qp_stapling') === 'true';
    const storedOrientation = sessionStorage.getItem('qp_orientation');
    // Support both qp_pages and qp_file_pages
    const storedPages = sessionStorage.getItem('qp_pages') || sessionStorage.getItem('qp_file_pages');
    const storedPrice = sessionStorage.getItem('qp_price');
    const storedFilesCount = sessionStorage.getItem('qp_files_count');
    const storedFileConfigs = sessionStorage.getItem('qp_file_configs');

    if (storedName) setFileName(storedName);
    if (storedType) setFileType(storedType);
    if (storedPaper) setPaperSize(storedPaper);
    if (storedPaperType) setPaperType(storedPaperType);
    if (storedQuality) setQuality(storedQuality);
    if (storedPhotoSize) setPhotoSize(storedPhotoSize);
    if (storedPhotoPaper) setPhotoPaper(storedPhotoPaper);
    if (storedPhotoQuality) setPhotoQuality(storedPhotoQuality);
    if (storedMode === 'photo' || storedMode === 'document') setMode(storedMode);
    if (storedSelectedPages) {
      try { setSelectedPages(JSON.parse(storedSelectedPages)); } catch (e) {}
    }
    if (storedColor) setColorMode(storedColor as any);
    if (storedCopies) setCopies(parseInt(storedCopies, 10) || 1);
    if (storedDuplex) setDuplex(storedDuplex === 'true');
    setBinding(storedBinding);
    setStapling(storedStapling);
    if (storedOrientation) setOrientation(storedOrientation);
    if (storedPages) setPages(parseInt(storedPages, 10) || 1);
    if (storedPrice) setPrice(parseFloat(storedPrice) || 2.0);
    if (storedFilesCount) setFilesCount(parseInt(storedFilesCount, 10) || 1);
    if (storedFileConfigs) {
      try { setFileConfigs(JSON.parse(storedFileConfigs)); } catch (e) {}
    }

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
      formData.append('paper_type', paperType);
      formData.append('quality', quality);
      formData.append('mode', mode);
      formData.append('photo_size', photoSize);
      formData.append('photo_paper', photoPaper);
      formData.append('photo_quality', photoQuality);
      formData.append('selected_pages', JSON.stringify(selectedPages));
      formData.append('color_mode', colorMode);
      formData.append('duplex', String(duplex));
      formData.append('binding', String(binding));
      formData.append('stapling', String(stapling));
      formData.append('orientation', orientation);
      formData.append('price', String(price));
      formData.append('payment_mode', paymentMode);

      const storedPrintConfig = sessionStorage.getItem('qp_print_config');
      if (storedPrintConfig) {
        formData.append('print_config', storedPrintConfig);
      }
      const storedNeedsShopPrep = sessionStorage.getItem('qp_needs_shop_prep');
      if (storedNeedsShopPrep === 'true') {
        formData.append('needs_shop_preparation', 'true');
      }

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

      // Clear temporary files from IndexedDB upon successful order placement
      try {
        await clearPersistedKioskFiles(shopSlug);
        sessionStorage.removeItem('qp_file_data');
        sessionStorage.removeItem('qp_file_configs');
      } catch (storageErr) {
        console.warn('Failed clearing kiosk storage:', storageErr);
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

  const priceCfg = shop?.price_config || DEFAULT_PRICE_CONFIG;

  // Helper to get human-readable mode label
  const getModeLabel = (cfg: FileConfig) => {
    if (cfg.mode === 'photo') return 'Photo Print';
    return cfg.colorMode === 'color' ? 'Color' : 'B&W';
  };

  // Determine if it's a single-file order or multi-file
  const hasMultipleFiles = fileConfigs.length > 1;

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex justify-center text-[#1E293B] antialiased">
      <div className="w-full max-w-[440px] min-h-screen bg-[#FFFFFF] relative px-4 pt-4 pb-32 flex flex-col">
        {/* HEADER */}
        <header className="flex items-center justify-between pt-2 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(`/kiosk/${shopSlug}`)}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-[22px] font-normal leading-[1.1] text-black tracking-tight font-serif" style={{ fontFamily: "'Corben', serif" }}>
                Gaur<span className="text-[#38BDF8]">print</span>
              </h1>
              <p className="text-[14px] text-slate-500 font-serif leading-none mt-1" style={{ fontFamily: "'Corben', serif" }}>
                {shop?.name || 'Loading...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#DCFCE7] border border-[#22C55E]/20 rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="text-[13px] font-bold text-[#15803D] tracking-wide" style={{ fontFamily: "'Inter', sans-serif" }}>Online</span>
          </div>
        </header>

        {/* STEP INDICATOR */}
        <div className="flex items-center gap-2 mb-5 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-[#E2E8F0] text-slate-500 font-bold flex items-center justify-center text-[10px]">✓</span>
            <span className="text-[13px] text-slate-500" style={{ fontFamily: "'Inter', sans-serif" }}>Upload</span>
          </div>
          <div className="h-px flex-1 bg-slate-200" />
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-[#E2E8F0] text-slate-500 font-bold flex items-center justify-center text-[10px]">✓</span>
            <span className="text-[13px] text-slate-500" style={{ fontFamily: "'Inter', sans-serif" }}>Configure</span>
          </div>
          <div className="h-px flex-1 bg-[#2563EB]" />
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white font-bold flex items-center justify-center text-[10px]">3</span>
            <span className="text-[13px] font-bold text-[#2563EB]" style={{ fontFamily: "'Inter', sans-serif" }}>Pay & Print</span>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-[13px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* ORDER SUMMARY CARD */}
        <section className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[16px] p-4 mb-4">
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[8px] bg-[#EFF6FF] flex items-center justify-center">
                <Printer className="w-4 h-4 text-[#2563EB]" />
              </div>
              <span className="text-[14px] font-semibold text-[#1E293B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                Order Summary
              </span>
            </div>
            <span className="text-[12px] text-slate-500 font-mono">
              {filesCount} {filesCount === 1 ? 'File' : 'Files'} · {pages} {pages === 1 ? 'Page' : 'Pages'}
            </span>
          </div>

          {/* Multi-file breakdown */}
          {hasMultipleFiles && fileConfigs.length > 0 ? (
            <div className="flex flex-col gap-2">
              {fileConfigs.map((cfg, idx) => (
                <div key={idx} className="flex items-center justify-between text-[13px] py-1">
                  <div className="flex items-center gap-2 max-w-[240px]">
                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${cfg.mode === 'photo' ? 'bg-purple-100 text-purple-600' : cfg.colorMode === 'color' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                      {cfg.mode === 'photo' ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[#1E293B] truncate font-medium leading-tight" title={cfg.name}>{cfg.name}</span>
                      <span className="text-[10px] text-slate-400 leading-none mt-0.5">
                        {cfg.pages}pg · {cfg.copies}× · {getModeLabel(cfg)} · {(cfg.paperSize || cfg.photoSize || 'A4').toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-[#1E293B] shrink-0">₹{cfg.price.toFixed(0)}</span>
                </div>
              ))}
            </div>
          ) : (
            /* Single file summary */
            <div className="flex flex-col gap-2 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">File</span>
                <span className="font-medium text-[#1E293B] truncate max-w-[200px]">{fileName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Paper Size</span>
                <span className="font-medium text-[#1E293B]">{paperSize?.toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Orientation</span>
                <span className="font-medium text-[#1E293B] capitalize">{orientation}</span>
              </div>
              {mode === 'photo' && photoSize && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Photo Size</span>
                  <span className="font-medium text-blue-600">
                    {photoSize === 'passport'
                      ? 'Passport (35 × 45 mm)'
                      : photoSize === '4x6'
                      ? '4 × 6 in (102 × 152 mm)'
                      : photoSize === '5x7'
                      ? '5 × 7 in (127 × 178 mm)'
                      : photoSize === '6x8'
                      ? '6 × 8 in (152 × 203 mm)'
                      : photoSize.toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Color Spectrum</span>
                <span className="font-medium text-[#1E293B]">
                  {colorMode === 'color' ? 'Full Color' : 'Black & White (B&W)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Print Sides</span>
                <span className="font-medium text-[#1E293B]">
                  {duplex ? 'Double-Sided (Duplex)' : 'Single-Sided'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Print Copies</span>
                <span className="font-medium text-[#1E293B] font-mono font-bold">
                  {copies} {copies === 1 ? 'copy' : 'copies'}
                </span>
              </div>
              {(binding || stapling) && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Finishing</span>
                  <span className="font-medium text-[#1E293B]">
                    {binding ? '🌀 Spiral Binding' : '📎 Corner Staple'}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200/80 flex justify-end">
                <button
                  type="button"
                  onClick={() => router.push(`/kiosk/${shopSlug}`)}
                  className="text-[12px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                >
                  ✏️ Edit Print Options
                </button>
              </div>
            </div>
          )}

          {/* Total */}
          <div className="mt-3 pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">PAYABLE AMOUNT</span>
              <span className="text-[26px] font-bold font-mono text-[#1E293B] leading-none mt-0.5">₹{price.toFixed(2)}</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] font-semibold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded-full">Tax Included</span>
              {shop?.price_config?.taxPercentage ? (
                <span className="text-[10px] text-slate-400">Incl. {shop.price_config.taxPercentage}% GST</span>
              ) : null}
            </div>
          </div>
        </section>

        {/* ORDERS PAUSED ALERT */}
        {isOrdersPaused && (
          <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="text-[14px] font-bold text-amber-900 block">Counter Busy — Orders Paused</span>
              <span className="text-[12px] text-amber-700 mt-0.5 leading-relaxed block">
                The shop operator has temporarily paused new orders. Please wait or check with the counter operator.
              </span>
            </div>
          </div>
        )}

        {/* NO PAYMENT METHOD WARNING */}
        {!hasPaymentMethod && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <span className="text-[14px] font-bold text-red-900 block">Payments Unavailable</span>
              <span className="text-[12px] text-red-700 mt-0.5 leading-relaxed block">
                No payment method is currently enabled for this shop. Please ask the shopkeeper to enable payment methods.
              </span>
            </div>
          </div>
        )}

        {/* PAYMENT METHOD SELECTOR */}
        {hasPaymentMethod && (
          <section className="flex flex-col gap-3">
            <h3 className="text-[13px] font-semibold text-slate-700 px-1" style={{ fontFamily: "'Inter', sans-serif" }}>
              Select Payment Method
            </h3>

            {/* Online Payment */}
            {isUpiEnabled && (
              <button
                type="button"
                onClick={() => setPaymentMode('online')}
                className={`w-full p-4 rounded-[16px] border-2 text-left flex items-center gap-4 transition-all ${
                  paymentMode === 'online'
                    ? 'bg-[#EFF6FF] border-[#2563EB] shadow-sm'
                    : 'bg-white border-[#E2E8F0] hover:border-slate-300'
                }`}
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                  paymentMode === 'online' ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-bold text-[#1E293B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Online UPI / Card
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D]">
                      FASTEST
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    GPay, PhonePe, Paytm, Cards — Prints instantly
                  </p>
                </div>
                {paymentMode === 'online' && (
                  <CheckCircle2 className="w-5 h-5 text-[#2563EB] shrink-0" />
                )}
              </button>
            )}

            {/* Cash at Counter */}
            {isCashEnabled && (
              <button
                type="button"
                onClick={() => setPaymentMode('cash')}
                className={`w-full p-4 rounded-[16px] border-2 text-left flex items-center gap-4 transition-all ${
                  paymentMode === 'cash'
                    ? 'bg-[#F8FAFC] border-[#334155] shadow-sm'
                    : 'bg-white border-[#E2E8F0] hover:border-slate-300'
                }`}
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                  paymentMode === 'cash' ? 'bg-[#334155] text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Banknote className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-bold text-[#1E293B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Cash at Counter
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      COUNTER
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    Hand ₹{price.toFixed(2)} cash to shopkeeper · Token issued now
                  </p>
                </div>
                {paymentMode === 'cash' && (
                  <CheckCircle2 className="w-5 h-5 text-[#334155] shrink-0" />
                )}
              </button>
            )}
          </section>
        )}

        {/* PRIVACY NOTE */}
        <div className="mt-4 flex items-start gap-2.5 px-1">
          <ShieldCheck className="w-4 h-5 text-[#006C4A] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#434655] leading-normal" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Files are encrypted during transfer and automatically deleted after printing. Your payment is handled securely.
          </p>
        </div>
      </div>

      {/* FIXED BOTTOM BAR */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] px-4 pb-5 pt-3 z-40 bg-white/95 backdrop-blur-md border-t border-[#E2E8F0]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">
              {isOrdersPaused ? 'Paused' : !hasPaymentMethod ? 'Unavailable' : paymentMode === 'online' ? 'UPI / Online' : 'Cash Counter'}
            </span>
            <span className="text-[22px] font-bold font-mono text-[#1E293B] leading-none">
              ₹{price.toFixed(2)}
            </span>
          </div>

          <button
            type="button"
            disabled={loading || isOrdersPaused || !hasPaymentMethod}
            onClick={handlePlaceOrder}
            className={`flex-1 h-[52px] rounded-[16px] text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${
              isOrdersPaused || !hasPaymentMethod
                ? 'bg-slate-400'
                : paymentMode === 'online'
                ? 'bg-[#2563EB] hover:bg-blue-700 shadow-[0px_8px_15px_-3px_rgba(37,99,235,0.3)]'
                : 'bg-[#334155] hover:bg-slate-700 shadow-[0px_8px_15px_-3px_rgba(51,65,85,0.3)]'
            }`}
            style={{ fontFamily: "'ABeeZee', sans-serif" }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Submitting...</span>
              </>
            ) : isOrdersPaused ? (
              'Orders Paused'
            ) : !hasPaymentMethod ? (
              'Payments Disabled'
            ) : paymentMode === 'online' ? (
              <>
                <span>Pay ₹{price.toFixed(2)} & Print</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Get Token & Pay Cash</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
