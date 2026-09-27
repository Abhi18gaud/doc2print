'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FileText,
  Trash2,
  RefreshCw,
  Plus,
  ShieldCheck,
  Printer,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  X,
  Check,
  Minus,
  Folder,
  Layers,
  Sparkles,
  RotateCw,
  Image as ImageIcon,
  ScanLine,
} from 'lucide-react';
import { inspectUploadedFile, formatBytes } from '@/lib/pdf-inspector';
import { calculatePrintPrice, DEFAULT_PRICE_CONFIG, PriceCalculationResult } from '@/lib/price-calculator';
import { Shop } from '@/types/database';

export interface FileItem {
  id: string;
  file?: File;
  name: string;
  size: number;
  type: 'pdf' | 'png' | 'jpg' | 'doc';
  /** 'document' = PDF/Doc on plain paper, 'image' = JPG/PNG on plain paper, 'photo' = photo paper prints */
  mode: 'document' | 'photo' | 'image';
  previewUrl: string;
  pages: number;
  selectedPages: number[];
  // Document / Image attributes
  paperSize: string;
  paperType: string;
  quality: string;
  sides: 'single' | 'duplex';
  colorMode: 'bw' | 'color';
  // Photo attributes
  photoSize: string;
  photoPaper: string;
  photoQuality: string;
  // Common attributes
  orientation: 'portrait' | 'landscape';
  copies: number;
}

export default function KioskUploadPage() {
  const params = useParams();
  const router = useRouter();
  const shopSlug = (params?.shopSlug as string) || 'shree-ganesh-xerox';

  const [shop, setShop] = useState<Shop | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [loadingShop, setLoadingShop] = useState(true);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  // Real files in user's cart (NO MOCK/FAKE DATA)
  const [files, setFiles] = useState<FileItem[]>([]);

  // Modal Sheet State for Editing a file
  const [activeEditingFileId, setActiveEditingFileId] = useState<string | null>(null);
  const [activePreviewPageIndex, setActivePreviewPageIndex] = useState<number>(0);
  const [showPageRangeModal, setShowPageRangeModal] = useState<boolean>(false);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Load shop data & cached context
  useEffect(() => {
    const cached = sessionStorage.getItem('qp_shop_context');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed?.id && (parsed.qr_code_slug === shopSlug || parsed.id === shopSlug)) {
          setShop(parsed);
          setLoadingShop(false);
        }
      } catch (e) {}
    }

    async function loadShop() {
      try {
        const res = await fetch(`/api/shops/${shopSlug}`);
        if (res.ok) {
          const data = await res.json();
          setShop(data.shop);
          setIsOnline(data.isOnline ?? true);
          sessionStorage.setItem('qp_shop_context', JSON.stringify(data.shop));
        } else if (res.status === 404) {
          const stillCached = sessionStorage.getItem('qp_shop_context');
          if (!stillCached) {
            setShop(null);
          }
        }
      } catch (err) {
        console.error('Failed to load shop details:', err);
      } finally {
        setLoadingShop(false);
      }
    }
    loadShop();
  }, [shopSlug]);

  const priceCfg = shop?.price_config || DEFAULT_PRICE_CONFIG;

  // Calculate dynamic price & itemized breakdown for any file item
  const getFileCalculation = (item: FileItem): PriceCalculationResult => {
    const pagesToPrint = item.selectedPages.length || item.pages || 1;
    // 'image' mode prints on plain paper — use document mode pricing
    const effectiveMode = item.mode === 'image' ? 'document' : item.mode;
    const isPhotoMode = effectiveMode === 'photo';
    return calculatePrintPrice({
      mode: effectiveMode,
      pages: pagesToPrint,
      copies: item.copies || 1,
      colorMode: item.colorMode,
      paperSize: item.paperSize,
      paperType: item.paperType,
      quality: item.quality,
      // CRITICAL: only pass photo params when actually in photo mode.
      // Otherwise photoSize being truthy triggers photo pricing in price-calculator.
      photoSize: isPhotoMode ? item.photoSize : undefined,
      photoPaper: isPhotoMode ? item.photoPaper : undefined,
      photoQuality: isPhotoMode ? item.photoQuality : undefined,
      orientation: item.orientation,
      duplex: effectiveMode === 'document' && item.sides === 'duplex' && pagesToPrint > 1,
      priceConfig: priceCfg,
    });
  };

  // Total amount for all items in cart
  const totalPrice = useMemo(() => {
    return files.reduce((acc, item) => acc + getFileCalculation(item).total, 0);
  }, [files, priceCfg]);

  // Handle incoming file selection (Photos or Documents)
  const handleIncomingFiles = async (
    incoming: FileList | File[] | null,
    defaultMode: 'photo' | 'document' | 'image'
  ) => {
    if (!incoming || incoming.length === 0) return;
    setIsProcessingUpload(true);

    try {
      const newItems: FileItem[] = [];

      // Determine available shop options to use as defaults
      const availablePaperSizes = Object.keys(priceCfg.paperSizes || {}).filter(
        (k) => priceCfg.paperSizes?.[k]?.enabled !== false
      );
      const defaultPaperSize = availablePaperSizes.includes('a4') ? 'a4' : availablePaperSizes[0] || 'a4';

      const availablePaperTypes = Object.keys(priceCfg.paperTypes || {}).filter(
        (k) => priceCfg.paperTypes?.[k]?.enabled !== false
      );
      const defaultPaperType = availablePaperTypes.includes('plain') ? 'plain' : availablePaperTypes[0] || 'plain';

      const availablePhotoSizes = Object.keys(priceCfg.photoSizes || {}).filter(
        (k) => priceCfg.photoSizes?.[k]?.enabled !== false
      );
      const defaultPhotoSize = availablePhotoSizes.includes('4x6') ? '4x6' : availablePhotoSizes[0] || '4x6';

      const availablePhotoPapers = Object.keys(priceCfg.photoPapers || {}).filter(
        (k) => priceCfg.photoPapers?.[k]?.enabled !== false
      );
      const defaultPhotoPaper = availablePhotoPapers.includes('glossy') ? 'glossy' : availablePhotoPapers[0] || 'glossy';

      for (let i = 0; i < incoming.length; i++) {
        const f = incoming[i];
        const analysis = await inspectUploadedFile(f);
        const objectUrl = URL.createObjectURL(f);

        const cleanExt = f.name.split('.').pop()?.toLowerCase() || '';
        let normType: 'pdf' | 'png' | 'jpg' | 'doc' = 'pdf';
        if (cleanExt === 'png') normType = 'png';
        else if (['jpg', 'jpeg', 'webp', 'bmp'].includes(cleanExt)) normType = 'jpg';
        else if (['doc', 'docx', 'txt', 'rtf'].includes(cleanExt)) normType = 'doc';

        const totalPages = Math.max(1, analysis.pages || 1);
        const selectedPages = Array.from({ length: totalPages }, (_, idx) => idx + 1);

        newItems.push({
          id: `file_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          file: f,
          name: f.name,
          size: f.size,
          type: normType,
          mode: defaultMode,
          previewUrl: objectUrl,
          pages: totalPages,
          selectedPages,
          paperSize: defaultPaperSize,
          paperType: defaultPaperType,
          quality: 'normal',
          sides: 'single',
          colorMode: defaultMode === 'photo' ? 'color' : 'bw',
          photoSize: defaultPhotoSize,
          photoPaper: defaultPhotoPaper,
          photoQuality: 'standard',
          orientation: 'portrait',
          copies: 1,
        });
        // For 'image' mode, auto-assign to document mode internally for price calculation
        // but keep mode='image' so the UI knows it was an image upload
      }

      setFiles((prev) => [...prev, ...newItems]);
    } catch (err) {
      console.error('Failed to parse uploaded files:', err);
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const removeFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFiles((prev) => prev.filter((item) => item.id !== id));
    if (activeEditingFileId === id) {
      setActiveEditingFileId(null);
    }
  };

  const activeEditingFile = useMemo(() => {
    return files.find((f) => f.id === activeEditingFileId) || null;
  }, [files, activeEditingFileId]);

  const activeCalculation = useMemo(() => {
    if (!activeEditingFile) return null;
    return getFileCalculation(activeEditingFile);
  }, [activeEditingFile, priceCfg]);

  const updateActiveEditingFile = (updates: Partial<FileItem>) => {
    if (!activeEditingFileId) return;
    setFiles((prev) =>
      prev.map((item) => (item.id === activeEditingFileId ? { ...item, ...updates } : item))
    );
  };

  // Merge and bundle files for checkout
  const handleProceedToPrint = async () => {
    if (files.length === 0) return;

    setIsProcessingUpload(true);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const masterPdf = await PDFDocument.create();

      for (const item of files) {
        if (item.file) {
          const buffer = await item.file.arrayBuffer();
          const cleanName = item.file.name.toLowerCase();

          if (cleanName.endsWith('.pdf')) {
            const donorPdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
            const validPageIndices = (item.selectedPages || [])
              .map((p) => p - 1)
              .filter((idx) => idx >= 0 && idx < donorPdf.getPageCount());

            const pagesToCopy =
              validPageIndices.length > 0 ? validPageIndices : donorPdf.getPageIndices();
            const copiedPages = await masterPdf.copyPages(donorPdf, pagesToCopy);
            copiedPages.forEach((p) => masterPdf.addPage(p));
          } else if (cleanName.endsWith('.png')) {
            const pngImage = await masterPdf.embedPng(buffer);
            const a4Width = 595.28;
            const a4Height = 841.89;
            const page = masterPdf.addPage([a4Width, a4Height]);
            const margin = 36;
            const dims = pngImage.scaleToFit(a4Width - margin * 2, a4Height - margin * 2);
            page.drawImage(pngImage, {
              x: margin + (a4Width - margin * 2 - dims.width) / 2,
              y: margin + (a4Height - margin * 2 - dims.height) / 2,
              width: dims.width,
              height: dims.height,
            });
          } else {
            // JPG, JPEG, WEBP
            const jpgImage = await masterPdf.embedJpg(buffer);
            const a4Width = 595.28;
            const a4Height = 841.89;
            const page = masterPdf.addPage([a4Width, a4Height]);
            const margin = 36;
            const dims = jpgImage.scaleToFit(a4Width - margin * 2, a4Height - margin * 2);
            page.drawImage(jpgImage, {
              x: margin + (a4Width - margin * 2 - dims.width) / 2,
              y: margin + (a4Height - margin * 2 - dims.height) / 2,
              width: dims.width,
              height: dims.height,
            });
          }
        }
      }

      const mergedBytes = await masterPdf.save();
      const finalBlob = new Blob([mergedBytes as unknown as BlobPart], { type: 'application/pdf' });
      const totalMergedPages = masterPdf.getPageCount();
      const finalFileName =
        files.length === 1 ? files[0].name : `QuickPrint_Order_${files.length}_Files.pdf`;

      const primary = files[0];
      // Determine aggregate color mode: if ANY file is color, the job is color
      const aggregateColorMode = files.some((f) => f.colorMode === 'color') ? 'color' : 'bw';
      const aggregateDuplex = files.some((f) => f.sides === 'duplex');
      const reader = new FileReader();
      reader.onload = () => {
        try {
          sessionStorage.setItem('qp_file_name', finalFileName);
          sessionStorage.setItem('qp_file_type', 'application/pdf');
          sessionStorage.setItem('qp_file_pages', String(totalMergedPages));
          sessionStorage.setItem('qp_pages', String(totalMergedPages)); // alias for checkout
          sessionStorage.setItem('qp_file_size', String(finalBlob.size));
          sessionStorage.setItem('qp_file_data', reader.result as string);
          sessionStorage.setItem('qp_price', String(totalPrice));
          // Use 'document' mode for image files (they print on normal paper)
          sessionStorage.setItem('qp_mode', primary.mode === 'image' ? 'document' : primary.mode);
          sessionStorage.setItem('qp_paper_size', primary.paperSize);
          sessionStorage.setItem('qp_paper_type', primary.paperType);
          sessionStorage.setItem('qp_quality', primary.quality);
          sessionStorage.setItem('qp_photo_size', primary.photoSize || '');
          sessionStorage.setItem('qp_photo_paper', primary.photoPaper || '');
          sessionStorage.setItem('qp_photo_quality', primary.photoQuality || '');
          sessionStorage.setItem('qp_orientation', primary.orientation);
          sessionStorage.setItem('qp_selected_pages', JSON.stringify(primary.selectedPages));
          sessionStorage.setItem('qp_copies', String(primary.copies || 1));
          sessionStorage.setItem('qp_color_mode', aggregateColorMode);
          sessionStorage.setItem('qp_duplex', String(aggregateDuplex));
          sessionStorage.setItem('qp_files_count', String(files.length));
          // Store full per-file configs for accurate checkout display
          const fileConfigs = files.map((f) => ({
            name: f.name,
            pages: f.selectedPages.length || f.pages,
            copies: f.copies,
            mode: f.mode === 'image' ? 'document' : f.mode,
            colorMode: f.colorMode,
            paperSize: f.paperSize,
            paperType: f.paperType,
            quality: f.quality,
            sides: f.sides,
            photoSize: f.photoSize,
            photoPaper: f.photoPaper,
            photoQuality: f.photoQuality,
            orientation: f.orientation,
            price: getFileCalculation(f).total,
          }));
          sessionStorage.setItem('qp_file_configs', JSON.stringify(fileConfigs));
        } catch (e) {
          console.warn('Storage warning:', e);
        }
        router.push(`/kiosk/${shopSlug}/checkout`);
      };
      reader.readAsDataURL(finalBlob);
    } catch (err) {
      console.error('Failed to bundle files:', err);
      sessionStorage.setItem('qp_file_name', files[0]?.name || 'Document.pdf');
      sessionStorage.setItem('qp_price', String(totalPrice));
      router.push(`/kiosk/${shopSlug}/checkout`);
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const isOrdersPaused =
    shop?.price_config?.is_accepting_orders === false || shop?.price_config?.orders_paused === true;

  if (!loadingShop && !shop) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-6 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <h2 className="text-[18px] font-bold text-[#1c1b1f]">Shop Unavailable</h2>
          <p className="text-[13px] text-slate-500 mt-1 mb-5">
            This QR code is invalid or this print counter is currently offline.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full h-11 rounded-xl bg-blue-600 text-white font-bold text-[14px]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!loadingShop && shop && isOrdersPaused) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-6 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto mb-3">
            <AlertCircle className="w-7 h-7" />
          </div>
          <span className="text-[11px] font-mono font-bold tracking-widest text-slate-500 uppercase">
            LIVE COUNTER STATUS
          </span>
          <h2 className="text-[20px] font-bold text-slate-900 mt-1">{shop.name}</h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[12px] font-semibold my-3">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Orders Temporarily Paused
          </div>
          <p className="text-[13px] text-slate-600 mb-6 leading-relaxed">
            The counter operator is currently clearing the print queue. Intake of new orders is temporarily paused. Please check back in a couple of minutes.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[14px] flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Check Counter Status</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex justify-center text-[#1E293B] antialiased">
      {/* Hidden File Pickers */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleIncomingFiles(e.target.files, 'photo')}
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.rtf,.ppt,.pptx"
        multiple
        className="hidden"
        onChange={(e) => handleIncomingFiles(e.target.files, 'document')}
      />
      {/* Image input — prints images on plain A4/paper (not photo paper) */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/bmp"
        multiple
        className="hidden"
        onChange={(e) => handleIncomingFiles(e.target.files, 'image')}
      />

      {/* Main Container - 440px Mobile First */}
      <div className="w-full max-w-[440px] min-h-[956px] bg-[#FFFFFF] relative px-4 pt-4 pb-28 flex flex-col">
        {/* TOP STATUS BAR & HEADER */}
        <header className="flex items-center justify-between pt-2 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 grid grid-cols-2 gap-1 p-1 bg-white rounded-lg border border-slate-100 shadow-xs">
              <div className="bg-[#0F172A] rounded-xs" />
              <div className="bg-[#38BDF8] rounded-xs" />
              <div className="bg-[#0F172A] rounded-xs" />
              <div className="bg-[#0284C7] rounded-xs" />
            </div>

            <div>
              <h1 className="text-[22px] font-normal leading-[1.1] text-black tracking-tight font-serif" style={{ fontFamily: "'Corben', serif" }}>
                Gaur<span className="text-[#38BDF8]">print</span>
              </h1>
              <p className="text-[14px] text-slate-500 font-serif leading-none mt-1" style={{ fontFamily: "'Corben', serif" }}>
                {shop?.name || 'Mahadev printer shop'}
              </p>
            </div>
          </div>

          {/* Online Indicator Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#DCFCE7] border border-[#22C55E]/20 rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="text-[13px] font-bold text-[#15803D] tracking-wide" style={{ fontFamily: "'Inter', sans-serif" }}>
              Online
            </span>
          </div>
        </header>

        {/* HERO ACTION BUTTONS (Print Photos, Print Image & Print Document) */}
        <section className="flex flex-col gap-3 mt-2">
          {/* Card 1: Print Photos — on photo paper (4x6, 5x7, passport, etc.) */}
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="w-full h-[88px] bg-[#388EC3] hover:brightness-105 active:scale-[0.99] transition-all rounded-[11px] px-6 flex items-center justify-between text-white shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[22px] font-normal tracking-wide leading-tight" style={{ fontFamily: "'ABeeZee', sans-serif" }}>Print Photos</span>
                <span className="text-[11px] text-white/70 leading-none mt-0.5">Photo paper · 4×6, 5×7, Passport</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
              <Plus className="w-5 h-5" />
            </div>
          </button>

          {/* Card 2: Print Image — JPG/PNG on plain paper (A4, B&W/Color) */}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="w-full h-[88px] bg-[#2563EB] hover:brightness-105 active:scale-[0.99] transition-all rounded-[11px] px-6 flex items-center justify-between text-white shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                  <path d="m21 15-5-5-4 4-2-2-5 5" />
                  <path d="M3 17h18" strokeDasharray="2 2" />
                </svg>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[22px] font-normal tracking-wide leading-tight" style={{ fontFamily: "'ABeeZee', sans-serif" }}>Print Image</span>
                <span className="text-[11px] text-white/70 leading-none mt-0.5">JPG/PNG on plain paper · A4 · B&W or Color</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
              <Plus className="w-5 h-5" />
            </div>
          </button>

          {/* Card 3: Print Document — PDF/DOCX on plain paper */}
          <button
            type="button"
            onClick={() => docInputRef.current?.click()}
            className="w-full h-[88px] bg-[#334155] hover:brightness-105 active:scale-[0.99] transition-all rounded-[11px] px-6 flex items-center justify-between text-white shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[22px] font-normal tracking-wide leading-tight" style={{ fontFamily: "'ABeeZee', sans-serif" }}>Print Document</span>
                <span className="text-[11px] text-white/70 leading-none mt-0.5">PDF, Word, Text · A4/A3/Legal</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
              <Plus className="w-5 h-5" />
            </div>
          </button>
        </section>

        {/* 100% PRIVATE SECURITY BANNER */}
        <section className="mt-4 flex items-start gap-2.5 px-1 py-1">
          <div className="w-4 h-5 shrink-0 text-[#006C4A] mt-0.5">
            <ShieldCheck className="w-4 h-5 text-[#006C4A]" />
          </div>
          <div>
            <h4 className="text-[12px] font-semibold text-[#0B1C30] leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              100% Private
            </h4>
            <p className="text-[11px] text-[#434655] leading-normal mt-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Files are encrypted during transfer and automatically deleted after printing. We never permanently store or share your personal photos.
            </p>
          </div>
        </section>

        {/* RECENT UPLOADS & FILES CAROUSEL */}
        <section className="mt-5">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-[#2563EB] fill-[#2563EB]" />
              <h3 className="text-[14px] font-normal text-[#0F172A] tracking-tight" style={{ fontFamily: "'ABeeZee', sans-serif" }}>
                Recent Uploads & Files ({files.length})
              </h3>
            </div>
            {files.length > 0 && (
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="text-[12px] text-[#2563EB] font-normal hover:underline"
                style={{ fontFamily: "'ABeeZee', sans-serif" }}
              >
                + Add More
              </button>
            )}
          </div>

          {/* If No Files: Clean Inviting Empty State (NO MOCK DATA) */}
          {files.length === 0 ? (
            <div className="w-full border-2 border-dashed border-slate-200 rounded-[16px] p-6 text-center flex flex-col items-center justify-center bg-slate-50/50">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                <Printer className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="text-[13px] font-bold text-slate-800">No files uploaded yet</h4>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[260px]">
                Tap <strong>Print Photos</strong> or <strong>Print Document</strong> above to select and customize your prints.
              </p>
            </div>
          ) : (
            /* Horizontal Scroll Carousel */
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x -mx-4 px-4">
              {files.map((item) => {
                const isPdf = item.type === 'pdf';
                const isBw = item.colorMode === 'bw';
                const calc = getFileCalculation(item);

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setActiveEditingFileId(item.id);
                      setActivePreviewPageIndex(0);
                    }}
                    className="w-[145px] shrink-0 bg-white border border-[#E2E8F0] rounded-[16px] overflow-hidden flex flex-col justify-between cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all group relative snap-start"
                  >
                    {/* Delete Button on Hover */}
                    <button
                      type="button"
                      onClick={(e) => removeFile(item.id, e)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
                      title="Remove File"
                    >
                      ×
                    </button>

                     {/* Thumbnail Preview Area */}
                    <div className="w-full h-[96px] bg-slate-100 relative overflow-hidden flex items-center justify-center border-b border-[#E2E8F0]/70">
                      {item.type === 'pdf' ? (
                        // PDF thumbnail: render via iframe scaled down
                        <div className="w-full h-full relative overflow-hidden">
                          <iframe
                            src={`${item.previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                            className="border-0 pointer-events-none absolute top-0 left-0 origin-top-left"
                            style={{ width: '400%', height: '400%', transform: 'scale(0.25)', filter: isBw ? 'grayscale(100%)' : 'none' }}
                            title={item.name}
                          />
                        </div>
                      ) : item.type === 'doc' ? (
                        // Word/Doc: can't render in browser — show icon
                        <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50 text-blue-400 gap-1">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                          </svg>
                          <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">WORD</span>
                        </div>
                      ) : item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          className="w-full h-full object-cover object-top opacity-95"
                          style={{ filter: isBw ? 'grayscale(100%)' : 'none' }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                          <FileText className="w-8 h-8" />
                        </div>
                      )}

                      {/* Filetype Badge */}
                      <div className="absolute left-1.5 bottom-1.5">
                        <span
                          className={`text-[8px] font-normal uppercase px-1.5 py-0.5 rounded text-white flex items-center gap-1 tracking-wider ${
                            isPdf ? 'bg-[#F43F5E]' : 'bg-[#2563EB]'
                          }`}
                          style={{ fontFamily: "'ABeeZee', sans-serif" }}
                        >
                          {item.type.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Details Area */}
                    <div className="p-2.5 flex flex-col gap-1.5 bg-white">
                      <h5
                        className="text-[11px] font-normal text-[#1E293B] truncate leading-tight"
                        style={{ fontFamily: "'ABeeZee', sans-serif" }}
                        title={item.name}
                      >
                        {item.name}
                      </h5>

                      <p
                        className="text-[10px] text-[#64748B] leading-none"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        {item.pages > 1 ? `${item.selectedPages.length || item.pages} pgs • ` : ''}
                        {formatBytes(item.size)}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded leading-none ${
                            item.mode === 'photo'
                              ? 'bg-gradient-to-r from-[#89D2FF] via-[#A8CFFF] to-[#FF9D9F] text-black font-medium'
                              : item.mode === 'image'
                              ? 'bg-purple-100 text-purple-700 font-medium'
                              : isBw
                              ? 'bg-[#F1F5F9] text-[#475569]'
                              : 'bg-blue-100 text-blue-700 font-medium'
                          }`}
                          style={{ fontFamily: "'ABeeZee', sans-serif" }}
                        >
                          {item.mode === 'photo' ? 'Photo' : item.mode === 'image' ? 'Image' : isBw ? 'B&W' : 'Color'}
                        </span>

                        <span className="text-[10px] font-bold text-slate-900 font-mono">
                          ₹{calc.total.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* PRINT ORDER SUMMARY CARD */}
        <section className="mt-5 p-3.5 bg-[#F8FAFC] border border-[#E2E8F0]/80 rounded-[16px] shadow-xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E8F0]/70">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-[8px] bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
                <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
              </div>
              <h4 className="text-[12px] font-normal text-[#1E293B] tracking-tight" style={{ fontFamily: "'ABeeZee', sans-serif" }}>
                Print Order Summary
              </h4>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {files.length} {files.length === 1 ? 'Item' : 'Items'}
            </span>
          </div>

          <div className="flex flex-col gap-2 pt-2.5">
            {files.length === 0 ? (
              <p className="text-[11px] text-slate-400 py-1 italic">No files in order queue</p>
            ) : (
              files.map((item) => {
                const calc = getFileCalculation(item);
                const isColor = item.colorMode === 'color';

                return (
                  <div key={item.id} className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2 max-w-[280px]">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isColor ? 'bg-[#0EA5E9]' : 'bg-[#94A3B8]'
                        }`}
                      />
                      <span
                        className="truncate text-[#1E293B]"
                        style={{ fontFamily: "'ABeeZee', sans-serif" }}
                        title={item.name}
                      >
                        {item.name}
                      </span>
                    </div>
                    <span
                      className="font-normal text-[#1E293B] font-mono shrink-0"
                      style={{ fontFamily: "'ABeeZee', sans-serif" }}
                    >
                      ₹{calc.total.toFixed(0)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* BOTTOM STICKY ACTION BUTTON: Pay & Print */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-[440px] px-4 z-40">
          <button
            type="button"
            onClick={handleProceedToPrint}
            disabled={files.length === 0 || isProcessingUpload}
            className="w-full h-[52px] bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] transition-all rounded-[16px] px-5 flex items-center justify-between text-white shadow-[0px_10px_15px_-3px_rgba(59,130,246,0.25),0px_4px_6px_-4px_rgba(59,130,246,0.25)] disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-white" />
              <span className="text-[14px] font-normal tracking-tight" style={{ fontFamily: "'ABeeZee', sans-serif" }}>
                {isProcessingUpload
                  ? 'Processing Bundle...'
                  : files.length === 0
                  ? 'Upload Files to Print'
                  : `Pay & Print (${files.length} ${files.length === 1 ? 'File' : 'Files'})`}
              </span>
            </div>

            <div className="bg-[#1D4ED8]/50 px-2.5 py-1 rounded-[8px] text-[14px] font-normal tracking-wide" style={{ fontFamily: "'ABeeZee', sans-serif" }}>
              ₹{totalPrice.toFixed(2)} →
            </div>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* PREVIEW & CONFIGURATION MODAL / BOTTOM SHEET (Document & Photo Modes) */}
        {/* ========================================================================= */}
        {activeEditingFile && activeCalculation && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-[440px] mx-auto h-[95vh] bg-[#FFFFFF] rounded-t-[28px] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
              {/* Header Bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setActiveEditingFileId(null);
                    setShowPageRangeModal(false);
                  }}
                  className="p-1 rounded-full text-slate-700 hover:bg-slate-100 flex items-center gap-1 text-[15px]"
                >
                  <ChevronLeft className="w-6 h-6 text-slate-800" />
                </button>
                <div className="text-center">
                  <h3 className="text-[16px] font-semibold text-slate-900">Print Preview</h3>
                  <span className="text-[10px] text-slate-500 font-mono">{activeEditingFile.name}</span>
                </div>

                {/* Mode Switch */}
                <select
                  value={activeEditingFile.mode}
                  onChange={(e) => {
                    const newMode = e.target.value as 'document' | 'photo' | 'image';
                    updateActiveEditingFile({
                      mode: newMode,
                      colorMode: newMode === 'photo' ? 'color' : activeEditingFile.colorMode,
                    });
                  }}
                  className="text-[11px] font-semibold px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-blue-600 border border-slate-200 outline-none cursor-pointer"
                >
                  <option value="document">📄 Document</option>
                  <option value="image">🖼️ Image</option>
                  <option value="photo">📸 Photo Print</option>
                </select>
              </div>

              {/* Document Preview Viewport with Real-Time Dynamic Aspect Ratio & Visual Filters */}
              <div className="flex-1 bg-slate-100 relative flex flex-col items-center justify-center p-4 overflow-hidden">
                {/* Responsive Aspect-Ratio Container */}
                <div
                  className={`max-w-[300px] max-h-[300px] w-full bg-white rounded-lg shadow-md border-2 border-slate-300 overflow-hidden relative flex flex-col items-center justify-center transition-all duration-300 ${
                    activeEditingFile.mode === 'photo'
                      ? activeEditingFile.photoSize === 'passport'
                        ? 'aspect-square'
                        : activeEditingFile.photoSize === '5x7'
                        ? activeEditingFile.orientation === 'landscape' ? 'aspect-[7/5]' : 'aspect-[5/7]'
                        : activeEditingFile.photoSize === '6x8'
                        ? activeEditingFile.orientation === 'landscape' ? 'aspect-[8/6]' : 'aspect-[6/8]'
                        : activeEditingFile.orientation === 'landscape' ? 'aspect-[6/4]' : 'aspect-[4/6]'
                      : activeEditingFile.orientation === 'landscape' ? 'aspect-[1.414/1]' : 'aspect-[1/1.414]'
                  }`}
                >
                  {activeEditingFile.previewUrl ? (
                    // PDF files: use iframe to render actual content
                    // Image/Photo files: use img tag
                    activeEditingFile.type === 'pdf' ? (
                      <iframe
                        src={`${activeEditingFile.previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                        className="w-full h-full border-0 pointer-events-none"
                        title={activeEditingFile.name}
                        style={{
                          filter: activeEditingFile.colorMode === 'bw' ? 'grayscale(100%)' : 'none',
                        }}
                      />
                    ) : activeEditingFile.type === 'doc' ? (
                      // Word/Doc files can't render in browser
                      <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50/60 text-blue-400 gap-3">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                        <span className="text-[11px] font-semibold text-blue-500 text-center px-3">{activeEditingFile.name}</span>
                        <span className="text-[10px] text-blue-400">{activeEditingFile.pages} {activeEditingFile.pages === 1 ? 'page' : 'pages'}</span>
                      </div>
                    ) : (
                      <img
                        src={activeEditingFile.previewUrl}
                        alt="Preview"
                        className="w-full h-full object-contain transition-all"
                        style={{
                          filter: activeEditingFile.colorMode === 'bw' ? 'grayscale(100%)' : 'none',
                        }}
                      />
                    )
                  ) : (
                    <div className="text-center p-6 text-slate-400">
                      <FileText className="w-16 h-16 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-mono">{activeEditingFile.name}</p>
                    </div>
                  )}

                  {/* Top HUD Badges */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-black/75 text-white backdrop-blur-xs shadow-xs">
                    {activeEditingFile.colorMode === 'bw' ? 'B&W Grayscale' : 'Full Color'}
                  </div>
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-600 text-white shadow-xs">
                    {activeEditingFile.mode === 'photo'
                      ? activeEditingFile.photoSize.toUpperCase()
                      : activeEditingFile.paperSize.toUpperCase()}
                  </div>

                  {/* Bottom HUD Badges */}
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[9px] font-medium bg-white/90 text-slate-800 border border-slate-300 shadow-xs">
                    {activeEditingFile.orientation === 'landscape' ? 'Landscape' : 'Portrait'} •{' '}
                    {activeEditingFile.mode === 'photo'
                      ? activeEditingFile.photoPaper
                      : activeEditingFile.paperType}
                  </div>

                  {activeEditingFile.mode === 'document' && activeEditingFile.sides === 'duplex' && (
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-white shadow-xs">
                      Duplex (2-Sided)
                    </div>
                  )}
                </div>

                {/* Page Navigation for Multi-page Documents */}
                {activeEditingFile.pages > 1 && (
                  <div className="flex items-center gap-4 mt-3">
                    <button
                      type="button"
                      onClick={() => setActivePreviewPageIndex((p) => Math.max(0, p - 1))}
                      disabled={activePreviewPageIndex === 0}
                      className="p-1 text-slate-600 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-[13px] font-medium text-slate-700">
                      Page {activePreviewPageIndex + 1} of {activeEditingFile.pages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setActivePreviewPageIndex((p) =>
                          Math.min((activeEditingFile.pages || 1) - 1, p + 1)
                        )
                      }
                      disabled={activePreviewPageIndex >= (activeEditingFile.pages || 1) - 1}
                      className="p-1 text-slate-600 disabled:opacity-30"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* iOS BOTTOM SHEET DRAWER (Dynamic Print Configuration & Real-Time Price) */}
              <div className="bg-white px-5 pt-3 pb-6 rounded-t-[24px] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] border-t border-slate-100 flex flex-col gap-3 overflow-y-auto max-h-[52vh]">
                <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-1" />

                {/* Real-Time Price Strip with Itemized Breakdown */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-slate-800">
                      Calculated Price ({activeEditingFile.copies} {activeEditingFile.copies === 1 ? 'Copy' : 'Copies'})
                    </span>
                    <span className="text-[17px] font-black text-blue-600 font-mono">
                      ₹{activeCalculation.total.toFixed(2)}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 flex flex-col gap-0.5 border-t border-slate-200 pt-1.5">
                    {activeCalculation.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{it.label}</span>
                        <span className="font-mono">₹{it.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ============================================================== */}
                {/* IMAGE MODE OPTIONS (plain paper, no photo paper) */}
                {/* ============================================================== */}
                {activeEditingFile.mode === 'image' ? (
                  <>
                    {/* Paper Size */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-[14px] font-medium text-slate-900">Paper Size</span>
                      <select
                        value={activeEditingFile.paperSize}
                        onChange={(e) => updateActiveEditingFile({ paperSize: e.target.value })}
                        className="text-[14px] text-slate-700 bg-transparent text-right outline-none cursor-pointer font-medium"
                      >
                        {Object.entries(priceCfg.paperSizes || DEFAULT_PRICE_CONFIG.paperSizes || {})
                          .filter(([_, opt]) => opt.enabled !== false)
                          .map(([key, opt]) => (
                            <option key={key} value={key}>
                              {opt.name} {opt.extra > 0 ? `(+₹${opt.extra})` : ''}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Color Options */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-[14px] font-medium text-slate-900">Color Options</span>
                      <select
                        value={activeEditingFile.colorMode}
                        onChange={(e) => updateActiveEditingFile({ colorMode: e.target.value as 'bw' | 'color' })}
                        className="text-[14px] text-slate-700 bg-transparent text-right outline-none cursor-pointer font-medium"
                      >
                        <option value="bw">Black & White (B&W)</option>
                        <option value="color">Full Color</option>
                      </select>
                    </div>

                    {/* Paper Type */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-[14px] font-medium text-slate-900">Paper Type</span>
                      <select
                        value={activeEditingFile.paperType}
                        onChange={(e) => updateActiveEditingFile({ paperType: e.target.value })}
                        className="text-[14px] text-slate-700 bg-transparent text-right outline-none cursor-pointer font-medium"
                      >
                        {Object.entries(priceCfg.paperTypes || DEFAULT_PRICE_CONFIG.paperTypes || {})
                          .filter(([_, opt]) => opt.enabled !== false)
                          .map(([key, opt]) => (
                            <option key={key} value={key}>
                              {opt.name} {opt.extra > 0 ? `(+₹${opt.extra})` : ''}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Orientation */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-[14px] font-medium text-slate-900">Orientation</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateActiveEditingFile({ orientation: 'portrait' })}
                          className={`text-xs px-2.5 py-1 rounded font-semibold transition-all ${
                            activeEditingFile.orientation === 'portrait' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Portrait
                        </button>
                        <button
                          type="button"
                          onClick={() => updateActiveEditingFile({ orientation: 'landscape' })}
                          className={`text-xs px-2.5 py-1 rounded font-semibold transition-all ${
                            activeEditingFile.orientation === 'landscape' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Landscape
                        </button>
                      </div>
                    </div>
                    {/* Info note */}
                    <p className="text-[11px] text-slate-400 px-1">ℹ️ Image will be centered and scaled to fit the selected paper size.</p>
                  </>
                ) : activeEditingFile.mode === 'photo' ? (
                  <>
                {/* ============================================================== */}
                {/* PHOTO MODE OPTIONS */}
                {/* ============================================================== */}
                    {/* Photo Size */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-[14px] font-medium text-slate-900">Photo Size</span>
                      <select
                        value={activeEditingFile.photoSize}
                        onChange={(e) => updateActiveEditingFile({ photoSize: e.target.value })}
                        className="text-[14px] text-slate-700 bg-transparent text-right outline-none cursor-pointer font-medium"
                      >
                        {Object.entries(priceCfg.photoSizes || DEFAULT_PRICE_CONFIG.photoSizes || {}).map(
                          ([key, opt]) => (
                            <option key={key} value={key}>
                              {opt.name} (₹{opt.price})
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    {/* Photo Paper */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-[14px] font-medium text-slate-900">Photo Paper</span>
                      <select
                        value={activeEditingFile.photoPaper}
                        onChange={(e) => updateActiveEditingFile({ photoPaper: e.target.value })}
                        className="text-[14px] text-slate-700 bg-transparent text-right outline-none cursor-pointer font-medium"
                      >
                        {Object.entries(priceCfg.photoPapers || DEFAULT_PRICE_CONFIG.photoPapers || {}).map(
                          ([key, opt]) => (
                            <option key={key} value={key}>
                              {opt.name} {opt.extra > 0 ? `(+₹${opt.extra})` : ''}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    {/* Photo Quality */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-[14px] font-medium text-slate-900">Quality</span>
                      <select
                        value={activeEditingFile.photoQuality}
                        onChange={(e) => updateActiveEditingFile({ photoQuality: e.target.value })}
                        className="text-[14px] text-slate-700 bg-transparent text-right outline-none cursor-pointer font-medium"
                      >
                        {Object.entries(priceCfg.photoQualities || DEFAULT_PRICE_CONFIG.photoQualities || {}).map(
                          ([key, opt]) => (
                            <option key={key} value={key}>
                              {opt.name} {opt.extra > 0 ? `(+₹${opt.extra})` : ''}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    {/* Orientation */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-[14px] font-medium text-slate-900">Orientation</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateActiveEditingFile({ orientation: 'portrait' })}
                          className={`text-xs px-2.5 py-1 rounded font-semibold transition-all ${
                            activeEditingFile.orientation === 'portrait'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Portrait
                        </button>
                        <button
                          type="button"
                          onClick={() => updateActiveEditingFile({ orientation: 'landscape' })}
                          className={`text-xs px-2.5 py-1 rounded font-semibold transition-all ${
                            activeEditingFile.orientation === 'landscape'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Landscape
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}
                {activeEditingFile.mode === 'photo' ? null : activeEditingFile.mode === 'image' ? null : (
                  /* ============================================================== */
                  /* DOCUMENT MODE OPTIONS */
                  /* ============================================================== */
                  <>
                    {/* Paper Size */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-[14px] font-medium text-slate-900">Paper Size</span>
                      <select
                        value={activeEditingFile.paperSize}
                        onChange={(e) => updateActiveEditingFile({ paperSize: e.target.value })}
                        className="text-[14px] text-slate-700 bg-transparent text-right outline-none cursor-pointer font-medium"
                      >
                        {Object.entries(priceCfg.paperSizes || DEFAULT_PRICE_CONFIG.paperSizes || {})
                          .filter(([_, opt]) => opt.enabled !== false)
                          .map(([key, opt]) => (
                            <option key={key} value={key}>
                              {opt.name} {opt.extra > 0 ? `(+₹${opt.extra})` : ''}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Paper Type */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-[14px] font-medium text-slate-900">Paper Type</span>
                      <select
                        value={activeEditingFile.paperType}
                        onChange={(e) => updateActiveEditingFile({ paperType: e.target.value })}
                        className="text-[14px] text-slate-700 bg-transparent text-right outline-none cursor-pointer font-medium"
                      >
                        {Object.entries(priceCfg.paperTypes || DEFAULT_PRICE_CONFIG.paperTypes || {})
                          .filter(([_, opt]) => opt.enabled !== false)
                          .map(([key, opt]) => (
                            <option key={key} value={key}>
                              {opt.name} {opt.extra > 0 ? `(+₹${opt.extra})` : ''}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Color Options */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-[14px] font-medium text-slate-900">Color Options</span>
                      <select
                        value={activeEditingFile.colorMode}
                        onChange={(e) =>
                          updateActiveEditingFile({ colorMode: e.target.value as 'bw' | 'color' })
                        }
                        className="text-[14px] text-slate-700 bg-transparent text-right outline-none cursor-pointer font-medium"
                      >
                        <option value="bw">Black & White (B&W)</option>
                        <option value="color">Full Color</option>
                      </select>
                    </div>

                    {/* Print Sides (Single / Duplex) - Immediate price recalculation */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-[14px] font-medium text-slate-900">Print Sides</span>
                      <select
                        value={activeEditingFile.sides}
                        onChange={(e) =>
                          updateActiveEditingFile({ sides: e.target.value as 'single' | 'duplex' })
                        }
                        className="text-[14px] text-slate-700 bg-transparent text-right outline-none cursor-pointer font-medium"
                      >
                        <option value="single">Single-Sided (1-Sided)</option>
                        <option value="duplex">Double-Sided (2-Sided / Duplex)</option>
                      </select>
                    </div>

                    {/* Quality */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-[14px] font-medium text-slate-900">Quality</span>
                      <select
                        value={activeEditingFile.quality}
                        onChange={(e) => updateActiveEditingFile({ quality: e.target.value })}
                        className="text-[14px] text-slate-700 bg-transparent text-right outline-none cursor-pointer font-medium"
                      >
                        {Object.entries(priceCfg.qualities || DEFAULT_PRICE_CONFIG.qualities || {})
                          .filter(([_, opt]) => opt.enabled !== false)
                          .map(([key, opt]) => (
                            <option key={key} value={key}>
                              {opt.name} {opt.extra > 0 ? `(+₹${opt.extra})` : ''}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Orientation */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-[14px] font-medium text-slate-900">Orientation</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateActiveEditingFile({ orientation: 'portrait' })}
                          className={`text-xs px-2.5 py-1 rounded font-semibold transition-all ${
                            activeEditingFile.orientation === 'portrait'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Portrait
                        </button>
                        <button
                          type="button"
                          onClick={() => updateActiveEditingFile({ orientation: 'landscape' })}
                          className={`text-xs px-2.5 py-1 rounded font-semibold transition-all ${
                            activeEditingFile.orientation === 'landscape'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Landscape
                        </button>
                      </div>
                    </div>

                    {/* Page Range */}
                    <div
                      onClick={() => setShowPageRangeModal(true)}
                      className="flex items-center justify-between py-1 border-b border-slate-100 cursor-pointer hover:bg-slate-50 px-1 -mx-1 rounded"
                    >
                      <span className="text-[14px] font-medium text-slate-900">Page Range</span>
                      <div className="flex items-center gap-1 text-[14px] text-slate-700 font-medium">
                        <span>
                          {activeEditingFile.selectedPages.length === activeEditingFile.pages
                            ? 'All Pages'
                            : `${activeEditingFile.selectedPages.length} Selected`}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </>
                )}

                {/* Copies Counter */}
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-[14px] font-medium text-slate-900">
                    Print ({activeEditingFile.copies}) Copy
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveEditingFile({
                          copies: Math.max(1, activeEditingFile.copies - 1),
                        })
                      }
                      className="w-7 h-7 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-4 text-center font-bold text-[14px] font-mono">
                      {activeEditingFile.copies}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveEditingFile({
                          copies: Math.min(50, activeEditingFile.copies + 1),
                        })
                      }
                      className="w-7 h-7 rounded-full border border-blue-600 text-blue-600 flex items-center justify-center hover:bg-blue-50 active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Done Button */}
                <button
                  type="button"
                  onClick={() => setActiveEditingFileId(null)}
                  className="w-full h-11 rounded-[12px] bg-[#0284C7] hover:bg-sky-700 active:scale-[0.99] transition-all text-white font-semibold text-[15px] mt-2 shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>

            {/* Visual Page Range Selector Modal */}
            {showPageRangeModal && (
              <div className="absolute inset-0 z-60 bg-white flex flex-col animate-in slide-in-from-right duration-200">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowPageRangeModal(false)}
                    className="p-1 rounded-full text-slate-700 hover:bg-slate-100"
                  >
                    <ChevronLeft className="w-6 h-6 text-slate-800" />
                  </button>
                  <h3 className="text-[18px] font-semibold text-slate-900">Select Page Range</h3>
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-6">
                    {Array.from({ length: activeEditingFile.pages || 1 }, (_, i) => i + 1).map(
                      (pageNum) => {
                        const isChecked = activeEditingFile.selectedPages.includes(pageNum);

                        return (
                          <div
                            key={pageNum}
                            onClick={() => {
                              let next: number[];
                              if (isChecked) {
                                next = activeEditingFile.selectedPages.filter((p) => p !== pageNum);
                                if (next.length === 0) next = [pageNum];
                              } else {
                                next = [...activeEditingFile.selectedPages, pageNum].sort(
                                  (a, b) => a - b
                                );
                              }
                              updateActiveEditingFile({ selectedPages: next });
                            }}
                            className="flex flex-col items-center gap-2 cursor-pointer group"
                          >
                            <div className="w-[120px] h-[160px] bg-white rounded-lg border-2 border-slate-200 relative shadow-sm overflow-hidden flex flex-col p-2 group-hover:border-blue-500">
                              <div className="w-full h-2 bg-slate-300 rounded mb-1" />
                              <div className="w-3/4 h-1.5 bg-slate-200 rounded mb-1" />
                              <div className="w-full h-1.5 bg-slate-100 rounded mb-1" />
                              <div className="w-5/6 h-1.5 bg-slate-100 rounded mb-1" />
                              <div className="w-full h-1.5 bg-slate-100 rounded mb-1" />

                              <div
                                className={`absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                  isChecked ? 'bg-[#0070F3] text-white shadow' : 'border-2 border-slate-300 bg-white'
                                }`}
                              >
                                {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                              </div>
                            </div>
                            <span className="text-[14px] font-semibold text-slate-800">
                              Page {pageNum}
                            </span>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowPageRangeModal(false)}
                    className="w-full h-11 rounded-xl bg-blue-600 text-white font-semibold"
                  >
                    Confirm ({activeEditingFile.selectedPages.length} Pages Selected)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
