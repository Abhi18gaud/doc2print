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
  Edit3,
  Eye,
} from 'lucide-react';
import { inspectUploadedFile, formatBytes } from '@/lib/pdf-inspector';
import { calculatePrintPrice, DEFAULT_PRICE_CONFIG, PriceCalculationResult } from '@/lib/price-calculator';
import { Shop } from '@/types/database';
import PrintStudio, { ImageEditState } from '@/components/PrintStudio';
import {
  persistKioskFiles,
  restoreKioskFiles,
  removePersistedKioskFile,
  clearPersistedKioskFiles,
} from '@/lib/kiosk-storage';
import {
  getPaperGeometry,
  calculateContentPlacement,
  calculateMultiPhotoLayout,
  mmToPt,
  NormalizedCrop,
  ImageAdjustments,
} from '@/lib/print-engine';

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
  fitMode?: 'fit' | 'fill' | 'actual' | 'custom';
  alignment?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  customWidthMm?: number;
  customHeightMm?: number;
  borderless?: boolean;
  marginMm?: number;
  crop?: NormalizedCrop;
  adjustments?: ImageAdjustments;
  pdfPageRotations?: Record<number, number>;
  // Print Studio attributes
  renderedDataUrl?: string;
  editState?: ImageEditState;
  needsShopPreparation?: boolean;
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

  // Restore persisted files from IndexedDB across page reloads
  useEffect(() => {
    let isMounted = true;
    async function initRestoredFiles() {
      try {
        const restored = await restoreKioskFiles(shopSlug);
        if (isMounted && restored && restored.length > 0) {
          setFiles(restored);
        }
      } catch (err) {
        console.warn('Failed restoring files from storage:', err);
      }
    }
    initRestoredFiles();
    return () => {
      isMounted = false;
    };
  }, [shopSlug]);

  // Sync files to IndexedDB whenever files state changes
  useEffect(() => {
    if (files.length > 0) {
      persistKioskFiles(shopSlug, files);
    }
  }, [files, shopSlug]);

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
      if (newItems.length > 0) {
        setActiveEditingFileId(newItems[0].id);
        setActivePreviewPageIndex(0);
      }
    } catch (err) {
      console.error('Failed to parse uploaded files:', err);
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const removeFile = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFiles((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (next.length === 0) {
        clearPersistedKioskFiles(shopSlug);
      }
      return next;
    });
    await removePersistedKioskFile(id);
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
      const { PDFDocument, degrees } = await import('pdf-lib');
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
            copiedPages.forEach((p, idx) => {
              const pageNum = (item.selectedPages || [])[idx] || (idx + 1);
              const rot = (item.pdfPageRotations?.[pageNum] || 0) % 360;
              if (rot !== 0) {
                p.setRotation(degrees((p.getRotation().angle + rot) % 360));
              }
              masterPdf.addPage(p);
            });
          } else {
            // PNG, JPG, JPEG, WEBP, or Photo Print
            let imageBytes: Uint8Array;
            let isPng = false;

            if (item.renderedDataUrl) {
              const res = await fetch(item.renderedDataUrl);
              const blob = await res.blob();
              const arrayBuf = await blob.arrayBuffer();
              imageBytes = new Uint8Array(arrayBuf);
              isPng = item.renderedDataUrl.startsWith('data:image/png');
            } else {
              const arrayBuf = await item.file.arrayBuffer();
              imageBytes = new Uint8Array(arrayBuf);
              isPng = cleanName.endsWith('.png');
            }

            const embeddedImage = isPng
              ? await masterPdf.embedPng(imageBytes)
              : await masterPdf.embedJpg(imageBytes);

            // Authoritative paper geometry & printable area from print engine
            const printableArea = getPaperGeometry(
              item.paperSize || 'a4',
              item.orientation || 'portrait',
              item.borderless || false,
              item.marginMm ?? 5
            );

            const pageWidthPt = mmToPt(printableArea.paperWidthMm);
            const pageHeightPt = mmToPt(printableArea.paperHeightMm);

            const page = masterPdf.addPage([pageWidthPt, pageHeightPt]);

            // Layout based on print mode:
            if (item.mode === 'photo' && item.photoSize === 'passport') {
              // Passport Multi-Photo Grid (35mm x 45mm laid out mathematically on sheet)
              const count = Math.min(16, Math.max(1, item.copies || 8));
              const layout = calculateMultiPhotoLayout(printableArea, 'passport', count, 2);
              for (const cell of layout.cells) {
                page.drawImage(embeddedImage, {
                  x: mmToPt(cell.xMm),
                  y: pageHeightPt - mmToPt(cell.yMm + cell.heightMm),
                  width: mmToPt(cell.widthMm),
                  height: mmToPt(cell.heightMm),
                });
              }
            } else if (item.mode === 'photo' && item.photoSize && item.photoSize !== 'a4_photo') {
              // Dedicated photo size on sheet (4x6, 5x7, 6x8)
              const placement = calculateContentPlacement({
                sourceWidthPx: embeddedImage.width,
                sourceHeightPx: embeddedImage.height,
                printableArea,
                fitMode: item.fitMode || 'fill',
                alignment: item.alignment || 'center',
                crop: item.crop,
                targetPhotoSizeKey: item.photoSize,
                mode: 'photo',
              });

              page.drawImage(embeddedImage, {
                x: mmToPt(placement.xMm),
                y: pageHeightPt - mmToPt(placement.yMm + placement.heightMm),
                width: mmToPt(placement.widthMm),
                height: mmToPt(placement.heightMm),
              });
            } else {
              // Image print or Full A4 Photo print
              const placement = calculateContentPlacement({
                sourceWidthPx: embeddedImage.width,
                sourceHeightPx: embeddedImage.height,
                printableArea,
                fitMode: item.fitMode || 'fit',
                alignment: item.alignment || 'center',
                crop: item.crop,
                customWidthMm: item.customWidthMm,
                customHeightMm: item.customHeightMm,
                mode: item.mode,
              });

              page.drawImage(embeddedImage, {
                x: mmToPt(placement.xMm),
                y: pageHeightPt - mmToPt(placement.yMm + placement.heightMm),
                width: mmToPt(placement.widthMm),
                height: mmToPt(placement.heightMm),
              });
            }
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

          // Store canonical print config with transforms for Counter OS
          const printConfig = {
            mode: primary.mode,
            paperSize: primary.paperSize,
            paperType: primary.paperType,
            quality: primary.quality,
            photoSize: primary.photoSize,
            photoPaper: primary.photoPaper,
            photoQuality: primary.photoQuality,
            colorMode: aggregateColorMode,
            duplex: aggregateDuplex,
            orientation: primary.orientation,
            copies: primary.copies || 1,
            borderless: primary.borderless || false,
            fitMode: primary.fitMode || 'fit',
            alignment: primary.alignment || 'center',
            transform: primary.editState
              ? {
                  cropX: primary.editState.crop.x,
                  cropY: primary.editState.crop.y,
                  cropWidth: primary.editState.crop.width,
                  cropHeight: primary.editState.crop.height,
                  scale: primary.editState.zoom,
                  rotation: primary.editState.rotation,
                  flipH: primary.editState.flipH,
                  flipV: primary.editState.flipV,
                  positionX: primary.editState.panX,
                  positionY: primary.editState.panY,
                }
              : undefined,
            adjustments: primary.adjustments,
            needsShopPreparation: files.some((f) => f.needsShopPreparation),
          };
          sessionStorage.setItem('qp_print_config', JSON.stringify(printConfig));

          if (files.some((f) => f.needsShopPreparation)) {
            sessionStorage.setItem('qp_needs_shop_prep', 'true');
          } else {
            sessionStorage.removeItem('qp_needs_shop_prep');
          }

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
            needsShopPreparation: f.needsShopPreparation,
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
                    {/* Always-Visible Accessible Delete Button */}
                    <button
                      type="button"
                      onClick={(e) => removeFile(item.id, e)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md z-10 active:scale-95 transition-all"
                      title="Remove File"
                      aria-label="Remove File"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
                      ) : (item.renderedDataUrl || item.previewUrl) ? (
                        <img
                          src={item.renderedDataUrl || item.previewUrl}
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

                      {/* Quick Action Chips: Edit & Preview */}
                      <div className="flex items-center gap-1 pt-1.5 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveEditingFileId(item.id);
                            setActivePreviewPageIndex(0);
                          }}
                          className="flex-1 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          <span>Preview</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveEditingFileId(item.id);
                            setActivePreviewPageIndex(0);
                          }}
                          className="flex-1 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                          <Edit3 className="w-3 h-3 text-blue-600" />
                          <span>{item.type === 'pdf' ? 'Prepare' : 'Edit'}</span>
                        </button>
                      </div>

                      {/* Direct Send to Shop Preparation Toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFiles((prev) =>
                            prev.map((f) =>
                              f.id === item.id
                                ? { ...f, needsShopPreparation: !f.needsShopPreparation }
                                : f
                            )
                          );
                        }}
                        className={`w-full py-1 px-1.5 rounded-md text-[9.5px] font-bold flex items-center justify-center gap-1 transition-all mt-1 ${
                          item.needsShopPreparation
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                        title="Shop operator will calibrate and adjust print options at counter"
                      >
                        <span>{item.needsShopPreparation ? '✓ Sent to Shop' : '🛠️ Send to Shop'}</span>
                      </button>
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
                  <div key={item.id} className="flex items-center justify-between text-[12px] py-1 border-b border-slate-100/80 last:border-b-0">
                    <div className="flex items-center gap-2 max-w-[240px]">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isColor ? 'bg-[#0EA5E9]' : 'bg-[#94A3B8]'
                        }`}
                      />
                      <div className="flex flex-col">
                        <span
                          className="truncate text-[#1E293B] font-medium"
                          style={{ fontFamily: "'ABeeZee', sans-serif" }}
                          title={item.name}
                        >
                          {item.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.mode === 'photo' ? 'Photo Print' : item.mode === 'image' ? 'Image Print' : 'Document'} · {item.copies} {item.copies === 1 ? 'copy' : 'copies'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="font-bold text-[#1E293B] font-mono shrink-0"
                        style={{ fontFamily: "'ABeeZee', sans-serif" }}
                      >
                        ₹{calc.total.toFixed(0)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(item.id);
                        }}
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                        title="Remove file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
        {/* GAURPRINT PRINT STUDIO (UNIFIED FOR PHOTO, IMAGE & DOCUMENT PREPARATION) */}
        {/* ========================================================================= */}
        {activeEditingFile && (
          <PrintStudio
            fileItem={activeEditingFile}
            shop={shop}
            onUpdate={updateActiveEditingFile}
            onClose={() => setActiveEditingFileId(null)}
            onRemove={() => removeFile(activeEditingFile.id)}
            onProceedToCheckout={handleProceedToPrint}
          />
        )}
      </div>
    </div>
  );
}
