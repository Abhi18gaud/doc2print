'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FileText,
  Palette,
  Copy,
  BookOpen,
  RotateCw,
  Sliders,
  Check,
  Zap,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Printer,
  Sparkles,
  Layers,
} from 'lucide-react';
import { HeaderBar } from '@/components/HeaderBar';
import { calculatePrintPrice, DEFAULT_PRICE_CONFIG } from '@/lib/price-calculator';
import { Shop } from '@/types/database';

export default function KioskOptionsPage() {
  const params = useParams();
  const router = useRouter();
  const shopSlug = (params?.shopSlug as string) || 'shree-ganesh-xerox';

  const [shop, setShop] = useState<Shop | null>(null);
  const [fileName, setFileName] = useState('Document.pdf');
  const [filePages, setFilePages] = useState(1);
  const [fileSizeStr, setFileSizeStr] = useState('1.5 MB');

  // Print settings
  const [paperSize, setPaperSize] = useState<'a4' | 'a3' | 'passport' | 'custom'>('a4');
  const [colorMode, setColorMode] = useState<'bw' | 'color'>('bw');
  const [copies, setCopies] = useState(1);
  const [duplex, setDuplex] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [pageSelection, setPageSelection] = useState<'all' | 'custom'>('all');
  const [customPagesInput, setCustomPagesInput] = useState('');

  // Load session storage data & shop details
  useEffect(() => {
    const storedName = sessionStorage.getItem('qp_file_name');
    const storedPages = sessionStorage.getItem('qp_file_pages');
    const storedSize = sessionStorage.getItem('qp_file_size');

    if (storedName) setFileName(storedName);
    if (storedPages) setFilePages(parseInt(storedPages, 10) || 1);
    if (storedSize) {
      const bytes = parseInt(storedSize, 10) || 0;
      setFileSizeStr(`${(bytes / (1024 * 1024)).toFixed(1)} MB`);
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
      } catch (e) {
        console.error('Error fetching shop:', e);
      }
    }
    loadShop();
  }, [shopSlug]);

  // Determine active pages to print
  let effectivePages = filePages;
  if (pageSelection === 'custom' && customPagesInput.trim()) {
    // Parse range e.g. "1-2, 4"
    try {
      const parts = customPagesInput.split(',');
      let count = 0;
      parts.forEach((p) => {
        const trimmed = p.trim();
        if (trimmed.includes('-')) {
          const [start, end] = trimmed.split('-').map(Number);
          if (!isNaN(start) && !isNaN(end) && end >= start) {
            count += end - start + 1;
          }
        } else if (!isNaN(Number(trimmed)) && Number(trimmed) > 0) {
          count += 1;
        }
      });
      if (count > 0) effectivePages = Math.min(count, filePages);
    } catch {
      effectivePages = filePages;
    }
  }

  const calculation = calculatePrintPrice({
    pages: effectivePages,
    copies,
    colorMode,
    paperSize,
    duplex,
    priceConfig: shop?.price_config || DEFAULT_PRICE_CONFIG,
  });

  const handleContinue = () => {
    // Save configuration into sessionStorage for checkout step
    sessionStorage.setItem('qp_paper_size', paperSize);
    sessionStorage.setItem('qp_color_mode', colorMode);
    sessionStorage.setItem('qp_copies', String(copies));
    sessionStorage.setItem('qp_duplex', String(duplex));
    sessionStorage.setItem('qp_orientation', orientation);
    sessionStorage.setItem('qp_pages', String(effectivePages));
    sessionStorage.setItem('qp_price', String(calculation.total));

    router.push(`/kiosk/${shopSlug}/checkout`);
  };

  return (
    <div className="min-h-screen bg-[#fafaf7] flex flex-col justify-between pb-32">
      {/* Header */}
      <HeaderBar
        shopName={shop?.name || 'QuickPrint Counter'}
        counterInfo="Print Options"
        backHref={`/kiosk/${shopSlug}`}
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
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-[#1c1b1f] text-white font-mono text-center font-bold flex items-center justify-center text-[11px]">
              2
            </span>
            <span className="text-[13px] text-[#1c1b1f] font-bold">Options</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#a8a6a1]" />
          <div className="flex items-center gap-1.5 opacity-50">
            <span className="w-5 h-5 rounded-full bg-[#e8e8e5] text-[#1c1b1f] font-mono text-center font-medium flex items-center justify-center text-[11px]">
              3
            </span>
            <span className="text-[13px] text-[#1c1b1f]">Pay & Collect</span>
          </div>
        </div>

        {/* Selected File Summary Banner */}
        <div className="bg-white rounded-lg p-3.5 border border-[#e6e5df] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-12 bg-[#1c1b1f] text-white rounded flex flex-col items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-4 h-4 text-[#ff5a1f]" />
              <span className="font-mono text-[8px] font-bold mt-0.5">PDF</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[14px] font-bold text-[#1c1b1f] truncate">
                {fileName}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5 text-[12px] font-mono text-[#6b6966]">
                <span className="px-1.5 py-0.2 rounded bg-[#f4f4f1] font-semibold text-[#1c1b1f]">
                  {filePages} {filePages === 1 ? 'Page' : 'Pages'}
                </span>
                <span>•</span>
                <span>{fileSizeStr}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/kiosk/${shopSlug}`)}
            className="text-[12px] font-mono font-bold text-[#ff5a1f] hover:underline px-2 py-1"
          >
            CHANGE
          </button>
        </div>

        {/* 1. Paper Size Picker */}
        <div className="bg-white rounded-lg p-4 border border-[#e6e5df] shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[14px] font-bold text-[#1c1b1f] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#ff5a1f]" />
              <span>Paper Size</span>
            </label>
            <span className="text-[11px] font-mono text-[#6b6966]">
              Standard 75 GSM
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'a4', name: 'A4', note: 'Standard' },
              { id: 'a3', name: 'A3', note: '+₹4.00' },
              { id: 'passport', name: 'Passport (8×)', note: 'Glossy' },
              { id: 'custom', name: 'Legal/Bond', note: '+₹2.00' },
            ].map((size) => {
              const isSelected = paperSize === size.id;
              return (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => setPaperSize(size.id as any)}
                  className={`p-2.5 rounded text-left border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#1c1b1f] text-white border-[#1c1b1f] shadow-xs'
                      : 'bg-[#fafaf7] text-[#1c1b1f] border-[#e6e5df] hover:border-[#1c1b1f]'
                  }`}
                >
                  <span className="text-[13px] font-bold">{size.name}</span>
                  <span
                    className={`text-[11px] font-mono mt-0.5 ${
                      isSelected ? 'text-[#a8a6a1]' : 'text-[#6b6966]'
                    }`}
                  >
                    {size.note}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Color Selection Toggles */}
        <div className="bg-white rounded-lg p-4 border border-[#e6e5df] shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[14px] font-bold text-[#1c1b1f] flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-[#ff5a1f]" />
              <span>Color Selection</span>
            </label>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#e6f7ee] text-[#0b4e2f]">
              FAST DISPATCH
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* B&W Option */}
            <button
              type="button"
              onClick={() => setColorMode('bw')}
              className={`p-3.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                colorMode === 'bw'
                  ? 'bg-[#f4f4f1] border-[#1c1b1f] ring-1 ring-[#1c1b1f]'
                  : 'bg-white border-[#e6e5df] hover:border-[#1c1b1f]'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    colorMode === 'bw'
                      ? 'bg-[#1c1b1f] text-white'
                      : 'bg-[#f4f4f1] text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6b6966] bg-[#e8e8e5] px-1.5 py-0.5 rounded">
                  Standard
                </span>
              </div>
              <div className="mt-3">
                <span className="text-[14px] font-bold block text-[#1c1b1f]">
                  Black & White
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-mono text-[16px] font-bold text-[#1c1b1f]">
                    ₹2.00
                  </span>
                  <span className="text-[11px] text-[#6b6966]">/ page</span>
                </div>
              </div>
            </button>

            {/* Color Option */}
            <button
              type="button"
              onClick={() => setColorMode('color')}
              className={`p-3.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                colorMode === 'color'
                  ? 'bg-[#f4f4f1] border-[#ff5a1f] ring-1 ring-[#ff5a1f]'
                  : 'bg-white border-[#e6e5df] hover:border-[#1c1b1f]'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    colorMode === 'color'
                      ? 'bg-[#ff5a1f] text-white'
                      : 'bg-[#f4f4f1] text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#ff5a1f] bg-[#ff5a1f]/10 px-1.5 py-0.5 rounded">
                  Laser HQ
                </span>
              </div>
              <div className="mt-3">
                <span className="text-[14px] font-bold block text-[#1c1b1f]">
                  Full Color
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-mono text-[16px] font-bold text-[#ff5a1f]">
                    ₹10.00
                  </span>
                  <span className="text-[11px] text-[#6b6966]">/ page</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 3. Number of Sets (Copies Stepper) */}
        <div className="bg-white rounded-lg p-4 border border-[#e6e5df] shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <label className="text-[14px] font-bold text-[#1c1b1f] flex items-center gap-1.5">
              <Copy className="w-4 h-4 text-[#ff5a1f]" />
              <span>Number of Sets</span>
            </label>
            <span className="text-[12px] font-mono text-[#6b6966] mt-0.5">
              {copies} {copies === 1 ? 'copy' : 'copies'} ({calculation.impressions}{' '}
              total prints)
            </span>
          </div>

          <div className="flex items-center gap-2 bg-[#f4f4f1] p-1 rounded-lg border border-[#e6e5df]">
            <button
              type="button"
              onClick={() => setCopies(Math.max(1, copies - 1))}
              className="w-10 h-10 rounded bg-white text-[#1c1b1f] border border-[#e6e5df] flex items-center justify-center font-bold text-[16px] hover:bg-[#e8e8e5] active:scale-90 transition-transform"
            >
              -
            </button>
            <span className="w-8 text-center font-mono text-[16px] font-bold text-[#1c1b1f]">
              {copies}
            </span>
            <button
              type="button"
              onClick={() => setCopies(copies + 1)}
              className="w-10 h-10 rounded bg-white text-[#1c1b1f] border border-[#e6e5df] flex items-center justify-center font-bold text-[16px] hover:bg-[#e8e8e5] active:scale-90 transition-transform"
            >
              +
            </button>
          </div>
        </div>

        {/* 4. Duplex (Back-to-Back vs Single) */}
        <div className="bg-white rounded-lg p-4 border border-[#e6e5df] shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[14px] font-bold text-[#1c1b1f] flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#ff5a1f]" />
              <span>Print Sides</span>
            </label>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#e8e8e5] text-[#1c1b1f]">
              {duplex ? 'BACK-TO-BACK' : 'SINGLE-SIDED'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 bg-[#f4f4f1] rounded-lg border border-[#e6e5df]">
            <button
              type="button"
              onClick={() => setDuplex(true)}
              className={`py-2 px-3 rounded text-[13px] font-bold transition-all ${
                duplex
                  ? 'bg-white text-[#1c1b1f] shadow-xs border border-[#e6e5df]'
                  : 'text-[#6b6966] hover:text-[#1c1b1f]'
              }`}
            >
              Back-to-Back (2-Sided)
            </button>
            <button
              type="button"
              onClick={() => setDuplex(false)}
              className={`py-2 px-3 rounded text-[13px] font-bold transition-all ${
                !duplex
                  ? 'bg-white text-[#1c1b1f] shadow-xs border border-[#e6e5df]'
                  : 'text-[#6b6966] hover:text-[#1c1b1f]'
              }`}
            >
              Single-Sided (1-Sided)
            </button>
          </div>
        </div>

        {/* 5. Orientation & Page Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Orientation */}
          <div className="bg-white rounded-lg p-4 border border-[#e6e5df] shadow-xs flex flex-col gap-2">
            <label className="text-[13px] font-bold text-[#1c1b1f] flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5 text-[#ff5a1f]" />
              <span>Orientation</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#f4f4f1] rounded-lg border border-[#e6e5df]">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`py-1.5 text-[12px] font-semibold rounded ${
                  orientation === 'portrait'
                    ? 'bg-white text-[#1c1b1f] shadow-xs'
                    : 'text-[#6b6966]'
                }`}
              >
                Portrait
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`py-1.5 text-[12px] font-semibold rounded ${
                  orientation === 'landscape'
                    ? 'bg-white text-[#1c1b1f] shadow-xs'
                    : 'text-[#6b6966]'
                }`}
              >
                Landscape
              </button>
            </div>
          </div>

          {/* Page Range */}
          <div className="bg-white rounded-lg p-4 border border-[#e6e5df] shadow-xs flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-bold text-[#1c1b1f] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#ff5a1f]" />
                <span>Pages to Print</span>
              </label>
              <button
                type="button"
                onClick={() =>
                  setPageSelection(pageSelection === 'all' ? 'custom' : 'all')
                }
                className="text-[11px] font-mono font-bold text-[#ff5a1f] hover:underline"
              >
                {pageSelection === 'all' ? 'Customize' : 'Print All'}
              </button>
            </div>

            {pageSelection === 'all' ? (
              <div className="py-2 px-3 rounded bg-[#f4f4f1] text-[12px] font-mono text-[#1c1b1f] flex items-center justify-between">
                <span>All {filePages} pages (1-{filePages})</span>
                <Check className="w-3.5 h-3.5 text-[#1b7a4d]" />
              </div>
            ) : (
              <input
                type="text"
                placeholder={`e.g. 1-${filePages} or 1, 3`}
                value={customPagesInput}
                onChange={(e) => setCustomPagesInput(e.target.value)}
                className="py-1.5 px-3 rounded bg-[#f4f4f1] border border-[#dadad7] text-[12px] font-mono text-[#1c1b1f] outline-none focus:border-[#ff5a1f]"
              />
            )}
          </div>
        </div>

        {/* Counter Chit Notice */}
        <div className="p-3.5 rounded-lg bg-[#f4f4f1] border border-[#e6e5df] flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#ff5a1f]/10 text-[#ff5a1f] flex items-center justify-center shrink-0 mt-0.5">
            <Zap className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-[#1c1b1f]">
              Queue Ready Instant Spool
            </span>
            <p className="text-[11px] text-[#6b6966] leading-relaxed mt-0.5 font-sans">
              The counter printer automatically prints in FIFO order once payment is
              cleared. Your live token chit will show your pickup queue slot.
            </p>
          </div>
        </div>
      </main>

      {/* Persistent Sticky Bottom Receipt Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#fafaf7]/95 backdrop-blur-md border-t border-[#e6e5df] px-4 py-3 pb-safe shadow-lg">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#6b6966] font-bold">
                TOTAL (INCL. TAX)
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#1b7a4d]" />
            </div>
            <span className="font-mono text-[22px] font-bold text-[#1c1b1f]">
              {calculation.formattedTotal}
            </span>
            <span className="font-mono text-[11px] text-[#6b6966]">
              {calculation.breakdownText}
            </span>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            className="h-12 px-6 rounded bg-[#ff5a1f] hover:bg-[#e04b14] active:scale-95 text-white font-bold text-[14px] flex items-center gap-2 shadow-sm transition-all btn-tactile"
          >
            <span>Proceed to Pay</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
