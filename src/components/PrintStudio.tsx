'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Crop,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Sliders,
  Check,
  RotateCcw,
  Sun,
  Eye,
  Edit3,
  Layers,
  Printer,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  Grid,
  Trash2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Maximize,
} from 'lucide-react';
import { FileItem } from '@/app/kiosk/[shopSlug]/page';
import { Shop, PriceConfig } from '@/types/database';
import { calculatePrintPrice, DEFAULT_PRICE_CONFIG, PriceCalculationResult } from '@/lib/price-calculator';
import { getPaperSizeDisplayName } from '@/lib/paper-size';

export interface ImageEditState {
  crop?: { x: number; y: number; width: number; height: number }; // normalized 0..1
  rotation: number; // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
  zoom: number; // 1.0 to 3.0
  panX: number; // in pixels
  panY: number; // in pixels
  fitMode: 'fit' | 'fill' | 'actual';
  brightness: number; // -50 to 50
  contrast: number; // -50 to 50
}

export const DEFAULT_EDIT_STATE: ImageEditState = {
  rotation: 0,
  flipH: false,
  flipV: false,
  zoom: 1.0,
  panX: 0,
  panY: 0,
  fitMode: 'fill',
  brightness: 0,
  contrast: 0,
};

interface PrintStudioProps {
  fileItem: FileItem;
  shop: Shop | null;
  onUpdate: (updates: Partial<FileItem> & { renderedDataUrl?: string }) => void;
  onClose: () => void;
  onRemove?: () => void;
  onProceedToCheckout?: () => void;
}

export default function PrintStudio({
  fileItem,
  shop,
  onUpdate,
  onClose,
  onRemove,
  onProceedToCheckout,
}: PrintStudioProps) {
  const priceCfg = shop?.price_config || DEFAULT_PRICE_CONFIG;

  const isDocument = fileItem.mode === 'document' || fileItem.type === 'pdf' || fileItem.type === 'doc';
  const isPhotoMode = fileItem.mode === 'photo';
  const isImageMode = fileItem.mode === 'image';

  // Tabs: 'preview' (Virtual Sheet Hero) or 'editor' (Active Crop & Tools / Document Preparation)
  const [activeTab, setActiveTab] = useState<'preview' | 'editor'>('preview');
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const [showFaceGuide, setShowFaceGuide] = useState(fileItem.photoSize === 'passport');

  // Multi-page Document preview page index
  const [activeDocPage, setActiveDocPage] = useState<number>(0);

  // Edit Parameters
  const [editState, setEditState] = useState<ImageEditState>(fileItem.editState || DEFAULT_EDIT_STATE);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 800, height: 600 });
  const [renderedPreviewUrl, setRenderedPreviewUrl] = useState<string>(fileItem.renderedDataUrl || fileItem.previewUrl);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const lastExportedUrlRef = useRef<string>('');
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  });

  // Drag / Pan interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Load original image to get dimensions
  useEffect(() => {
    if (!fileItem.previewUrl || isDocument) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth || 800, height: img.naturalHeight || 600 });
      setImageLoaded(true);
    };
    img.src = fileItem.previewUrl;
    imgRef.current = img;
  }, [fileItem.previewUrl, isDocument]);

  // Available photo size presets from shop's authoritative catalog
  const availablePhotoSizes = useMemo(() => {
    const map = priceCfg.photoSizes || DEFAULT_PRICE_CONFIG.photoSizes || {};
    return Object.keys(map)
      .filter((k) => map[k]?.enabled !== false)
      .map((k) => ({
        key: k,
        name: map[k].name || k.toUpperCase(),
        price: map[k].price || 15,
        aspectRatio: map[k].aspectRatio || '4/6',
      }));
  }, [priceCfg]);

  // Available paper sizes from shop's authoritative catalog
  const availablePaperSizes = useMemo(() => {
    const map = priceCfg.paperSizes || DEFAULT_PRICE_CONFIG.paperSizes || {};
    return Object.keys(map)
      .filter((k) => map[k]?.enabled !== false)
      .map((k) => ({
        key: k,
        name: map[k].name || k.toUpperCase(),
        extra: map[k].extra || 0,
        desc: map[k].description || '',
      }));
  }, [priceCfg]);

  // Paper Physical Dimensions in mm & Aspect Ratios
  const paperPhysicalDimensions = useMemo(() => {
    const size = (fileItem.paperSize || 'a4').toLowerCase();
    const isLandscape = fileItem.orientation === 'landscape';

    let widthMm = 210;
    let heightMm = 297;
    let label = 'A4';

    if (size === 'a3') {
      widthMm = 297;
      heightMm = 420;
      label = 'A3';
    } else if (size === 'legal') {
      widthMm = 216;
      heightMm = 356;
      label = 'Legal';
    } else if (size === 'letter') {
      widthMm = 216;
      heightMm = 279;
      label = 'Letter';
    } else if (size === 'a5') {
      widthMm = 148;
      heightMm = 210;
      label = 'A5';
    }

    if (isLandscape) {
      return {
        widthMm: heightMm,
        heightMm: widthMm,
        aspectRatio: heightMm / widthMm,
        label: `${label} • Landscape`,
        dimensionsText: `${heightMm} × ${widthMm} mm`,
      };
    }

    return {
      widthMm,
      heightMm,
      aspectRatio: widthMm / heightMm,
      label: `${label} • Portrait`,
      dimensionsText: `${widthMm} × ${heightMm} mm`,
    };
  }, [fileItem.paperSize, fileItem.orientation]);

  // Photo Target Aspect Ratio
  const targetPhotoRatio = useMemo(() => {
    const photoKey = (fileItem.photoSize || '4x6').toLowerCase();
    const isLandscape = fileItem.orientation === 'landscape';

    if (photoKey === 'passport') {
      return 35 / 45; // 0.7778
    }
    if (photoKey === '5x7') {
      return isLandscape ? 7 / 5 : 5 / 7;
    }
    if (photoKey === '6x8') {
      return isLandscape ? 8 / 6 : 6 / 8;
    }
    if (photoKey === 'a4_photo') {
      return isLandscape ? 1.414 / 1 : 1 / 1.414;
    }
    // Default 4x6
    return isLandscape ? 6 / 4 : 4 / 6;
  }, [fileItem.photoSize, fileItem.orientation]);

  // Photo Physical Dimensions in mm & formatted label
  const photoPhysicalDimensions = useMemo(() => {
    const photoKey = (fileItem.photoSize || '4x6').toLowerCase();
    const isLandscape = fileItem.orientation === 'landscape';

    let wMm = 102;
    let hMm = 152;
    let label = '4 × 6 in (102 × 152 mm)';

    if (photoKey === 'passport') {
      wMm = 35;
      hMm = 45;
      label = 'Passport (35 × 45 mm)';
    } else if (photoKey === '5x7') {
      wMm = 127;
      hMm = 178;
      label = '5 × 7 in (127 × 178 mm)';
    } else if (photoKey === '6x8') {
      wMm = 152;
      hMm = 203;
      label = '6 × 8 in (152 × 203 mm)';
    } else if (photoKey === 'a4_photo') {
      wMm = 210;
      hMm = 297;
      label = 'Full A4 Photo (210 × 297 mm)';
    }

    if (isLandscape && photoKey !== 'passport') {
      return {
        widthMm: hMm,
        heightMm: wMm,
        label,
      };
    }

    return {
      widthMm: wMm,
      heightMm: hMm,
      label,
    };
  }, [fileItem.photoSize, fileItem.orientation]);

  // Calculate live authoritative price
  const calculationResult: PriceCalculationResult = useMemo(() => {
    const pagesToPrint = fileItem.selectedPages?.length || fileItem.pages || 1;
    const effectiveMode = fileItem.mode === 'image' ? 'document' : fileItem.mode;
    const isPhoto = effectiveMode === 'photo';

    return calculatePrintPrice({
      mode: effectiveMode,
      pages: pagesToPrint,
      copies: fileItem.copies || 1,
      colorMode: fileItem.colorMode,
      paperSize: fileItem.paperSize,
      paperType: fileItem.paperType,
      quality: fileItem.quality,
      photoSize: isPhoto ? fileItem.photoSize : undefined,
      photoPaper: isPhoto ? fileItem.photoPaper : undefined,
      photoQuality: isPhoto ? fileItem.photoQuality : undefined,
      orientation: fileItem.orientation,
      duplex: effectiveMode === 'document' && fileItem.sides === 'duplex' && pagesToPrint > 1,
      priceConfig: priceCfg,
    });
  }, [fileItem, priceCfg]);

  // Render edited image onto canvas
  const renderCanvas = useCallback(() => {
    if (isDocument) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const targetW = 1200;
    const targetH = Math.round(targetW / targetPhotoRatio);
    canvas.width = targetW;
    canvas.height = targetH;

    // Clear background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetW, targetH);

    ctx.save();

    // 1. Move to center of canvas
    ctx.translate(targetW / 2 + editState.panX * 2, targetH / 2 + editState.panY * 2);

    // 2. Rotation & Flips
    ctx.rotate((editState.rotation * Math.PI) / 180);
    ctx.scale(editState.flipH ? -1 : 1, editState.flipV ? -1 : 1);

    // 3. Zoom
    ctx.scale(editState.zoom, editState.zoom);

    // 4. Filters (Brightness & Contrast)
    ctx.filter = `brightness(${100 + editState.brightness}%) contrast(${100 + editState.contrast}%)`;

    // 5. Draw Image centered
    const imgW = img.naturalWidth || 800;
    const imgH = img.naturalHeight || 600;

    let drawW = targetW;
    let drawH = targetH;

    if (editState.fitMode === 'fit') {
      const scale = Math.min(targetW / imgW, targetH / imgH);
      drawW = imgW * scale;
      drawH = imgH * scale;
    } else if (editState.fitMode === 'actual') {
      drawW = imgW;
      drawH = imgH;
    } else {
      // Fill mode
      const scale = Math.max(targetW / imgW, targetH / imgH);
      drawW = imgW * scale;
      drawH = imgH * scale;
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Export rendered dataURL for preview and checkout persistence
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setRenderedPreviewUrl(dataUrl);
      if (lastExportedUrlRef.current !== dataUrl) {
        lastExportedUrlRef.current = dataUrl;
        onUpdateRef.current({ renderedDataUrl: dataUrl, editState });
      }
    } catch (e) {
      console.warn('Canvas export note:', e);
    }
  }, [imageLoaded, targetPhotoRatio, editState, isDocument]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Touch / Mouse Pan Handling
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - editState.panX, y: e.clientY - editState.panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setEditState((prev) => ({
      ...prev,
      panX: e.clientX - dragStart.x,
      panY: e.clientY - dragStart.y,
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - editState.panX, y: e.touches[0].clientY - editState.panY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setEditState((prev) => ({
      ...prev,
      panX: e.touches[0].clientX - dragStart.x,
      panY: e.touches[0].clientY - dragStart.y,
    }));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Editor Actions
  const rotateClockwise = () => {
    setEditState((prev) => ({ ...prev, rotation: (prev.rotation + 90) % 360 }));
  };

  const toggleFlipH = () => {
    setEditState((prev) => ({ ...prev, flipH: !prev.flipH }));
  };

  const toggleFlipV = () => {
    setEditState((prev) => ({ ...prev, flipV: !prev.flipV }));
  };

  const setFitMode = (mode: 'fit' | 'fill' | 'actual') => {
    setEditState((prev) => ({ ...prev, fitMode: mode, panX: 0, panY: 0, zoom: 1.0 }));
    onUpdate({ fitMode: mode });
  };

  const handleZoom = (delta: number) => {
    setEditState((prev) => ({
      ...prev,
      zoom: Math.min(3.0, Math.max(1.0, parseFloat((prev.zoom + delta).toFixed(1)))),
    }));
  };

  const handleReset = () => {
    setEditState(DEFAULT_EDIT_STATE);
  };

  // Document Page Rotation & Page Range Management
  const currentDocPageRotation = (fileItem.pdfPageRotations?.[activeDocPage + 1] || 0) % 360;

  const rotateCurrentDocPage = () => {
    const pageNum = activeDocPage + 1;
    const newRot = (currentDocPageRotation + 90) % 360;
    const updated = { ...(fileItem.pdfPageRotations || {}), [pageNum]: newRot };
    onUpdate({ pdfPageRotations: updated });
  };

  const togglePageSelection = (pageNum: number) => {
    const current = fileItem.selectedPages || [];
    let updated: number[];
    if (current.includes(pageNum)) {
      if (current.length === 1) return; // Must keep at least one page
      updated = current.filter((p) => p !== pageNum);
    } else {
      updated = [...current, pageNum].sort((a, b) => a - b);
    }
    onUpdate({ selectedPages: updated });
  };

  const selectAllPages = () => {
    const all = Array.from({ length: fileItem.pages || 1 }, (_, i) => i + 1);
    onUpdate({ selectedPages: all });
  };

  const isPassportMode = isPhotoMode && fileItem.photoSize === 'passport';

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Hidden offscreen Canvas for high-res compositing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Print Studio Modal Card */}
      <div className="w-full max-w-[460px] md:max-w-4xl mx-auto h-[100dvh] md:h-[90vh] bg-white rounded-t-[24px] md:rounded-[24px] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95 duration-300">
        
        {/* ========================================================= */}
        {/* TOP APP BAR: Professional, Balanced, Non-cramped */}
        {/* ========================================================= */}
        <header className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition-all"
              title="Close Print Studio"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-black tracking-tight text-slate-900 leading-none">
                  Print <span className="text-blue-600">Studio</span>
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  {isPhotoMode ? 'Photo Print' : isImageMode ? 'Image Print' : 'Document Prepare'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-[170px] sm:max-w-xs mt-0.5">
                {fileItem.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View / Edit Tab Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                  activeTab === 'preview'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                  activeTab === 'editor'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isDocument ? 'Prepare' : 'Edit'}</span>
              </button>
            </div>

            {/* Remove File Button */}
            {onRemove && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Remove "${fileItem.name}" from your print cart?`)) {
                    onRemove();
                  }
                }}
                className="w-9 h-9 rounded-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors"
                title="Remove this file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* ========================================================= */}
        {/* WORKSPACE AREA: 1-col on Mobile, 2-col on Desktop */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto md:grid md:grid-cols-12 flex flex-col min-h-0">
          
          {/* ========================================================= */}
          {/* LEFT: HERO PREVIEW & QUICK ACTIONS */}
          {/* ========================================================= */}
          <div className="md:col-span-7 bg-slate-50/80 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col items-center justify-between p-3 sm:p-4 select-none shrink-0 min-h-[360px] md:min-h-full">
            
            {/* Top HUD: Physical Dimensions & Specs Badges */}
            <div className="w-full flex items-center justify-between z-10 text-[11px] font-semibold text-slate-700 mb-2 gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-white/95 px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
                <span>📄 {paperPhysicalDimensions.label}</span>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-slate-500">{paperPhysicalDimensions.dimensionsText}</span>
              </div>

              <div className="flex items-center gap-1.5 bg-white/95 px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
                <span>{fileItem.colorMode === 'bw' ? '⚫ B&W' : '🎨 Color'}</span>
                {isDocument && fileItem.sides === 'duplex' && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-amber-600 font-bold">2-Sided</span>
                  </>
                )}
              </div>
            </div>

            {/* PREVIEW CONTAINER */}
            <div className="flex-1 w-full flex flex-col items-center justify-center p-2 relative">
              
              {/* TAB 1: REAL VIRTUAL SHEET PRINT PREVIEW */}
              {activeTab === 'preview' && (
                <div className="flex flex-col items-center justify-center w-full">
                  {/* Virtual Paper Sheet */}
                  <div
                    className="bg-white rounded-lg shadow-[0_16px_40px_rgba(15,23,42,0.12),0_2px_6px_rgba(15,23,42,0.06)] border border-slate-200 relative overflow-hidden transition-all duration-300 flex items-center justify-center"
                    style={{
                      width: fileItem.orientation === 'landscape' ? '300px' : '220px',
                      height: fileItem.orientation === 'landscape' ? '220px' : '300px',
                      padding: '10px',
                    }}
                  >
                    {/* Dotted Printable Area Safe Margin */}
                    <div className="w-full h-full border border-dashed border-blue-300/80 rounded relative flex items-center justify-center overflow-hidden bg-slate-50/50">
                      
                      {/* CASE A: DOCUMENT / PDF PREVIEW */}
                      {isDocument ? (
                        fileItem.type === 'pdf' ? (
                          <div
                            className="w-full h-full relative overflow-hidden transition-transform duration-200"
                            style={{
                              transform: `rotate(${currentDocPageRotation}deg)`,
                              filter: fileItem.colorMode === 'bw' ? 'grayscale(100%) contrast(105%)' : 'none',
                            }}
                          >
                            <iframe
                              src={`${fileItem.previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                              className="w-full h-full border-0 pointer-events-none"
                              title={fileItem.name}
                            />
                          </div>
                        ) : (
                          // DOC / TXT
                          <div className="flex flex-col items-center justify-center text-blue-500 p-4 text-center">
                            <FileText className="w-12 h-12 mb-2 text-blue-500" />
                            <span className="text-[12px] font-bold text-slate-800 line-clamp-2">{fileItem.name}</span>
                            <span className="text-[10px] text-slate-400 mt-1">{fileItem.pages} Pages Document</span>
                          </div>
                        )
                      ) : isPassportMode ? (
                        /* CASE B: PASSPORT MULTI-PHOTO GRID */
                        <div className="grid grid-cols-4 gap-1 p-1 w-full h-full items-center justify-center content-center">
                          {Array.from({ length: Math.min(16, Math.max(1, fileItem.copies || 8)) }).map((_, idx) => (
                            <div
                              key={idx}
                              className="aspect-[35/45] bg-slate-100 border border-slate-300 rounded-xs overflow-hidden relative shadow-2xs"
                            >
                              <img
                                src={renderedPreviewUrl}
                                alt="Passport"
                                className="w-full h-full object-cover"
                                style={{
                                  filter: fileItem.colorMode === 'bw' ? 'grayscale(100%) contrast(105%)' : 'none',
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* CASE C: PHOTO / IMAGE ON SHEET */
                        <div
                          className="rounded overflow-hidden shadow-xs relative flex items-center justify-center bg-slate-100 transition-all duration-300"
                          style={{
                            width:
                              fileItem.photoSize === 'a4_photo' || fileItem.mode === 'image'
                                ? '100%'
                                : `${Math.min(94, Math.max(35, Math.round((photoPhysicalDimensions.widthMm / paperPhysicalDimensions.widthMm) * 100)))}%`,
                            height:
                              fileItem.photoSize === 'a4_photo' || fileItem.mode === 'image'
                                ? '100%'
                                : `${Math.min(94, Math.max(35, Math.round((photoPhysicalDimensions.heightMm / paperPhysicalDimensions.heightMm) * 100)))}%`,
                            aspectRatio: targetPhotoRatio,
                          }}
                        >
                          <img
                            src={renderedPreviewUrl}
                            alt="Print Preview"
                            className={`w-full h-full ${
                              editState.fitMode === 'fit' ? 'object-contain' : 'object-cover'
                            } transition-all`}
                            style={{
                              filter: fileItem.colorMode === 'bw' ? 'grayscale(100%) contrast(105%)' : 'none',
                            }}
                          />
                          {isPhotoMode && fileItem.photoSize !== 'a4_photo' && (
                            <div className="absolute inset-0 border border-slate-400/50 pointer-events-none" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Document Multi-Page Pager */}
                  {isDocument && fileItem.pages > 1 && (
                    <div className="flex items-center gap-3 mt-3 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-xs">
                      <button
                        type="button"
                        onClick={() => setActiveDocPage((p) => Math.max(0, p - 1))}
                        disabled={activeDocPage === 0}
                        className="p-1 text-slate-700 disabled:opacity-30 hover:bg-slate-100 rounded-full"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-[12px] font-bold text-slate-800">
                        Page {activeDocPage + 1} of {fileItem.pages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveDocPage((p) => Math.min((fileItem.pages || 1) - 1, p + 1))}
                        disabled={activeDocPage >= (fileItem.pages || 1) - 1}
                        className="p-1 text-slate-700 disabled:opacity-30 hover:bg-slate-100 rounded-full"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Specs Subtext */}
                  <div className="mt-2 text-center">
                    <span className="text-[12px] font-bold text-slate-800">
                      {isPhotoMode
                        ? photoPhysicalDimensions.label
                        : `${paperPhysicalDimensions.label} • ${paperPhysicalDimensions.dimensionsText}`}
                    </span>
                    <p className="text-[10.5px] text-slate-500">
                      {isPassportMode
                        ? `Arranges ${Math.min(16, fileItem.copies || 8)} photos with cut margins on ${paperPhysicalDimensions.label}`
                        : `Printable safe zone included • Live scale representation`}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: ACTIVE EDITOR (IMAGE CROP / PAN OR DOCUMENT PREPARATION) */}
              {activeTab === 'editor' && (
                <div className="flex flex-col items-center justify-center w-full">
                  {!isDocument ? (
                    <>
                      {/* Interactive Crop / Pan Viewport */}
                      <div
                        className="bg-slate-900 rounded-xl overflow-hidden relative cursor-grab active:cursor-grabbing shadow-inner flex items-center justify-center"
                        style={{
                          width: '260px',
                          height: '260px',
                          aspectRatio: targetPhotoRatio,
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                      >
                        <div
                          className="relative transition-transform duration-75 flex items-center justify-center w-full h-full"
                          style={{
                            transform: `translate(${editState.panX}px, ${editState.panY}px) rotate(${editState.rotation}deg) scale(${
                              (editState.flipH ? -1 : 1) * editState.zoom
                            }, ${(editState.flipV ? -1 : 1) * editState.zoom})`,
                            filter: `brightness(${100 + editState.brightness}%) contrast(${100 + editState.contrast}%)`,
                          }}
                        >
                          <img
                            src={fileItem.previewUrl}
                            alt="Source"
                            className={`pointer-events-none select-none ${
                              editState.fitMode === 'fit' ? 'max-w-full max-h-full object-contain' : 'w-full h-full object-cover'
                            }`}
                          />
                        </div>

                        {/* Passport Guide Overlay */}
                        {isPassportMode && showFaceGuide && (
                          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center border-2 border-cyan-400/80">
                            <div className="w-24 h-32 border-2 border-dashed border-cyan-400 rounded-full flex items-center justify-center">
                              <div className="w-14 h-0.5 bg-cyan-400/60" />
                            </div>
                            <span className="text-[9.5px] font-bold text-cyan-300 mt-1.5 bg-black/70 px-2 py-0.5 rounded">
                              Align Face
                            </span>
                          </div>
                        )}

                        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-black/70 text-white backdrop-blur-xs">
                          Ratio {targetPhotoRatio.toFixed(2)}
                        </div>
                      </div>

                      {/* Photo Quick Actions Tool Strip */}
                      <div className="flex items-center gap-1 mt-3 bg-white p-1 rounded-xl border border-slate-200 shadow-xs flex-wrap justify-center">
                        <button
                          type="button"
                          onClick={rotateClockwise}
                          className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 active:scale-95"
                          title="Rotate 90° Clockwise"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={toggleFlipH}
                          className={`p-2 rounded-lg transition-all ${
                            editState.flipH ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                          title="Flip Horizontal"
                        >
                          <FlipHorizontal className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={toggleFlipV}
                          className={`p-2 rounded-lg transition-all ${
                            editState.flipV ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                          title="Flip Vertical"
                        >
                          <FlipVertical className="w-4 h-4" />
                        </button>
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <button
                          type="button"
                          onClick={() => setFitMode('fit')}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            editState.fitMode === 'fit' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          Fit
                        </button>
                        <button
                          type="button"
                          onClick={() => setFitMode('fill')}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            editState.fitMode === 'fill' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          Fill
                        </button>
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <button
                          type="button"
                          onClick={() => handleZoom(-0.2)}
                          disabled={editState.zoom <= 1.0}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 disabled:opacity-40"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-[11px] font-bold text-slate-700 font-mono w-7 text-center">
                          {editState.zoom.toFixed(1)}x
                        </span>
                        <button
                          type="button"
                          onClick={() => handleZoom(0.2)}
                          disabled={editState.zoom >= 3.0}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 disabled:opacity-40"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <button
                          type="button"
                          onClick={handleReset}
                          className="p-2 rounded-lg hover:bg-slate-100 text-red-600"
                          title="Reset Edits"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    /* DOCUMENT PREPARATION QUICK TOOLS */
                    <div className="w-full flex flex-col items-center justify-center p-2">
                      <div className="w-full max-w-sm bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-bold text-slate-800">
                            Page {activeDocPage + 1} Actions
                          </span>
                          <button
                            type="button"
                            onClick={rotateCurrentDocPage}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold flex items-center gap-1.5"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Rotate 90° ({currentDocPageRotation}°)</span>
                          </button>
                        </div>

                        {/* Page Selection Strip */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold text-slate-500 uppercase">
                              Pages to Print ({fileItem.selectedPages?.length || fileItem.pages} of {fileItem.pages})
                            </span>
                            <button
                              type="button"
                              onClick={selectAllPages}
                              className="text-[11px] font-bold text-blue-600 hover:underline"
                            >
                              Select All
                            </button>
                          </div>
                          <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
                            {Array.from({ length: fileItem.pages || 1 }).map((_, idx) => {
                              const pNum = idx + 1;
                              const isSelected = (fileItem.selectedPages || []).includes(pNum);
                              return (
                                <button
                                  key={pNum}
                                  type="button"
                                  onClick={() => {
                                    togglePageSelection(pNum);
                                    setActiveDocPage(idx);
                                  }}
                                  className={`w-9 h-11 rounded-lg border text-[12px] font-bold flex flex-col items-center justify-center transition-all shrink-0 ${
                                    isSelected
                                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-extrabold ring-1 ring-blue-500/30'
                                      : 'border-slate-200 bg-slate-50 text-slate-400 line-through'
                                  }`}
                                >
                                  <span>{pNum}</span>
                                  <span className="text-[8px] font-normal leading-none">
                                    {isSelected ? 'Print' : 'Skip'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Quick Switch Bar */}
            <div className="w-full flex items-center justify-between mt-1 pt-2 border-t border-slate-200/80">
              <span className="text-[11px] text-slate-500 font-medium">
                {activeTab === 'preview'
                  ? isDocument
                    ? 'Check page layout before printing'
                    : 'Tap Edit to crop, zoom or adjust'
                  : isDocument
                  ? 'Rotate or select specific pages'
                  : 'Drag to adjust framing inside print boundary'}
              </span>
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'preview' ? 'editor' : 'preview')}
                className="text-[12px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                {activeTab === 'preview'
                  ? isDocument
                    ? '📑 Prepare Document →'
                    : '✂️ Open Editor →'
                  : '✓ View Print Preview'}
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT: SETTINGS, CATALOG OPTIONS & LIVE PRICING */}
          {/* ========================================================= */}
          <div className="md:col-span-5 p-4 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              
              {/* SECTION 1: PRINT MODE CHANGER */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Print Production Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdate({
                        mode: 'photo',
                        colorMode: 'color',
                        photoSize: fileItem.photoSize || '4x6',
                      })
                    }
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isPhotoMode
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-[13px] font-bold text-slate-900 block">📸 Photo Print</span>
                    <span className="text-[10px] text-slate-500">Premium Glossy/Matte Paper</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdate({
                        mode: isDocument ? 'document' : 'image',
                        paperSize: fileItem.paperSize || 'a4',
                      })
                    }
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      !isPhotoMode
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-[13px] font-bold text-slate-900 block">
                      {isDocument ? '📄 Document Print' : '🖼️ Image Print'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {isDocument ? 'PDF/Doc on Plain Paper' : 'Plain A4/A3 Paper (Doc Rate)'}
                    </span>
                  </button>
                </div>
              </div>

              {/* SECTION 2A: PHOTO SIZE PRESETS (FOR PHOTO PRINT) */}
              {isPhotoMode && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Photo Size Preset
                    </label>
                    <span className="text-[11px] font-bold text-blue-600">
                      ₹{calculationResult.ratePerImpression.toFixed(0)}/photo
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {availablePhotoSizes.map((preset) => {
                      const isSelected = fileItem.photoSize === preset.key;
                      return (
                        <button
                          key={preset.key}
                          type="button"
                          onClick={() => {
                            onUpdate({ photoSize: preset.key });
                            if (preset.key === 'passport') setShowFaceGuide(true);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-bold text-slate-900">{preset.name}</span>
                            <span className="text-[11px] font-bold text-slate-700 font-mono">₹{preset.price}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            {preset.key === 'passport'
                              ? '35×45 mm • 8x Sheet'
                              : preset.key === '4x6'
                              ? '102×152 mm'
                              : preset.key === '5x7'
                              ? '127×178 mm'
                              : 'Studio Print'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 2B: PAPER SIZE (FOR DOCUMENT & IMAGE PRINT) */}
              {!isPhotoMode && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Paper Size
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {availablePaperSizes.map((p) => {
                      const isSelected = fileItem.paperSize === p.key;
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => onUpdate({ paperSize: p.key })}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                              : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-[13px] font-bold block">{p.name}</span>
                          <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                            {p.key === 'a4' ? '210×297 mm' : p.key === 'a3' ? '297×420 mm' : 'Configured'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 3: ORIENTATION */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Print Orientation
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdate({ orientation: 'portrait' })}
                    className={`p-2.5 rounded-xl border text-[13px] font-bold flex items-center justify-center gap-2 transition-all ${
                      fileItem.orientation === 'portrait'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>📄 Portrait</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdate({ orientation: 'landscape' })}
                    className={`p-2.5 rounded-xl border text-[13px] font-bold flex items-center justify-center gap-2 transition-all ${
                      fileItem.orientation === 'landscape'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>▭ Landscape</span>
                  </button>
                </div>
              </div>

              {/* SECTION 4: DUPLEX (FOR DOCUMENTS) */}
              {isDocument && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Print Sides
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdate({ sides: 'single' })}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        fileItem.sides === 'single'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[13px] font-bold block">Single-Sided</span>
                      <span className="text-[10px] text-slate-500">Print on one side</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdate({ sides: 'duplex' })}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        fileItem.sides === 'duplex'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[13px] font-bold block">Double-Sided</span>
                      <span className="text-[10px] text-slate-500">Print on both sides</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION 5: COLOR & COPIES */}
              <div className="grid grid-cols-2 gap-3">
                {/* Color Spectrum */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Color Spectrum
                  </label>
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => onUpdate({ colorMode: 'color' })}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                        fileItem.colorMode === 'color' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Color
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdate({ colorMode: 'bw' })}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                        fileItem.colorMode === 'bw' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      B&W
                    </button>
                  </div>
                </div>

                {/* Copies Counter */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Print Copies
                  </label>
                  <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => onUpdate({ copies: Math.max(1, (fileItem.copies || 1) - 1) })}
                      disabled={fileItem.copies <= 1}
                      className="w-7 h-7 rounded-lg bg-white text-slate-800 font-bold flex items-center justify-center disabled:opacity-40 shadow-xs"
                    >
                      -
                    </button>
                    <span className="text-[13px] font-bold text-slate-900 font-mono">
                      {fileItem.copies || 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdate({ copies: (fileItem.copies || 1) + 1 })}
                      className="w-7 h-7 rounded-lg bg-white text-slate-800 font-bold flex items-center justify-center shadow-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 6: BASIC ADJUSTMENTS (FOR PHOTO & IMAGE) */}
              {!isDocument && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>Brightness ({editState.brightness > 0 ? `+${editState.brightness}` : editState.brightness}%)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditState((prev) => ({ ...prev, brightness: 0 }))}
                      className="text-[10px] text-blue-600 hover:underline"
                    >
                      Reset
                    </button>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={editState.brightness}
                    onChange={(e) => setEditState((prev) => ({ ...prev, brightness: parseInt(e.target.value, 10) }))}
                    className="w-full accent-blue-600"
                  />

                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 pt-1">
                    <span className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-500" />
                      <span>Contrast ({editState.contrast > 0 ? `+${editState.contrast}` : editState.contrast}%)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditState((prev) => ({ ...prev, contrast: 0 }))}
                      className="text-[10px] text-blue-600 hover:underline"
                    >
                      Reset
                    </button>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={editState.contrast}
                    onChange={(e) => setEditState((prev) => ({ ...prev, contrast: parseInt(e.target.value, 10) }))}
                    className="w-full accent-blue-600"
                  />
                </div>
              )}

              {/* SECTION 7: AUTHORITATIVE PRICE BREAKDOWN */}
              <div className="bg-blue-50/50 border border-blue-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-left"
                >
                  <div>
                    <span className="text-[11px] font-bold text-blue-900 block">
                      Live Authoritative Price
                    </span>
                    <span className="text-[10px] text-blue-700/80">
                      {calculationResult.breakdownText}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-extrabold text-blue-700">
                      {calculationResult.formattedTotal}
                    </span>
                    {showPriceBreakdown ? (
                      <ChevronUp className="w-4 h-4 text-blue-700" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-blue-700" />
                    )}
                  </div>
                </button>

                {showPriceBreakdown && (
                  <div className="px-3.5 pb-3 pt-1 border-t border-blue-200/60 text-[11.5px] space-y-1">
                    {calculationResult.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-slate-700">
                        <span>{item.label}</span>
                        <span className="font-mono font-semibold">₹{item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-blue-200/80 pt-1 mt-1 flex justify-between font-bold text-blue-900">
                      <span>Total Payable:</span>
                      <span className="font-mono">{calculationResult.formattedTotal}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* STICKY BOTTOM ACTION BAR (NEVER GETS CLIPPED) */}
            <div className="pt-3 pb-safe border-t border-slate-100 flex items-center gap-2.5 bg-white mt-4 sticky bottom-0 z-20">
              <button
                type="button"
                onClick={onClose}
                className="h-12 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-[13px] hover:bg-slate-50 transition-colors"
              >
                Done
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onProceedToCheckout) onProceedToCheckout();
                }}
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all rounded-xl px-4 flex items-center justify-between text-white shadow-md font-bold text-[14px]"
              >
                <span>Continue to Pay</span>
                <span className="bg-blue-700/60 px-2.5 py-1 rounded-lg text-[13px] font-mono">
                  {calculationResult.formattedTotal} →
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
