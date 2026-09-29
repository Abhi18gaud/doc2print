'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Crop,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Sliders,
  Check,
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
  Undo2,
  Redo2,
  Lock,
  Unlock,
  Move,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUp,
  ArrowDown,
  Sparkle,
  Image as ImageIcon,
  AlertTriangle,
} from 'lucide-react';
import { FileItem } from '@/app/kiosk/[shopSlug]/page';
import { Shop, PriceConfig } from '@/types/database';
import { calculatePrintPrice, DEFAULT_PRICE_CONFIG, PriceCalculationResult } from '@/lib/price-calculator';
import {
  PrintableArea,
  NormalizedCrop,
  FitMode,
  Alignment,
  CropRatioPreset,
  ImageAdjustments,
  DEFAULT_ADJUSTMENTS,
  DEFAULT_CROP,
  getPaperGeometry,
  calculateContentPlacement,
  calculateMultiPhotoLayout,
  getCropRatioFromPreset,
  PAPER_DIMENSIONS_MM,
  PHOTO_TARGET_SIZES_MM,
  mmToPt,
  ptToMm,
} from '@/lib/print-engine';

export interface ImageEditState {
  crop: NormalizedCrop;
  rotation: number; // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
  zoom: number; // 1.0 to 3.0
  panX: number; // in pixels
  panY: number; // in pixels
  fitMode: FitMode;
  alignment: Alignment;
  customWidthMm?: number;
  customHeightMm?: number;
  lockAspectRatio: boolean;
  adjustments: ImageAdjustments;
  cropPreset: CropRatioPreset;
}

export const DEFAULT_EDIT_STATE: ImageEditState = {
  crop: DEFAULT_CROP,
  rotation: 0,
  flipH: false,
  flipV: false,
  zoom: 1.0,
  panX: 0,
  panY: 0,
  fitMode: 'fit',
  alignment: 'center',
  lockAspectRatio: true,
  adjustments: DEFAULT_ADJUSTMENTS,
  cropPreset: 'original',
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

  // Primary Workspace View: 'preview' (Virtual Sheet Hero) or 'editor' (Transform & Adjustments)
  const [activeTab, setActiveTab] = useState<'preview' | 'editor'>('preview');

  // Editor sub-tool: 'crop' | 'transform' | 'adjust'
  const [editorSubTool, setEditorSubTool] = useState<'crop' | 'transform' | 'adjust'>('crop');

  // Preview UI Scale (Screen zoom only, does NOT alter print scale)
  const [previewZoom, setPreviewZoom] = useState<number>(1.0);

  // Before / After comparison toggle
  const [isComparingBefore, setIsComparingBefore] = useState<boolean>(false);

  // Multi-page Document preview page index
  const [activeDocPage, setActiveDocPage] = useState<number>(0);

  // Price breakdown modal toggle
  const [showPriceBreakdown, setShowPriceBreakdown] = useState<boolean>(false);

  // Edit Parameters State
  const initialEditState: ImageEditState = useMemo(() => {
    return {
      crop: fileItem.crop || fileItem.editState?.crop || DEFAULT_CROP,
      rotation: fileItem.editState?.rotation ?? 0,
      flipH: fileItem.editState?.flipH ?? false,
      flipV: fileItem.editState?.flipV ?? false,
      zoom: fileItem.editState?.zoom ?? 1.0,
      panX: fileItem.editState?.panX ?? 0,
      panY: fileItem.editState?.panY ?? 0,
      fitMode: fileItem.fitMode || fileItem.editState?.fitMode || (isPhotoMode ? 'fill' : 'fit'),
      alignment: fileItem.alignment || 'center',
      customWidthMm: fileItem.customWidthMm,
      customHeightMm: fileItem.customHeightMm,
      lockAspectRatio: true,
      adjustments: fileItem.adjustments || fileItem.editState?.adjustments || DEFAULT_ADJUSTMENTS,
      cropPreset: isPhotoMode ? (fileItem.photoSize === 'passport' ? 'passport' : (fileItem.photoSize as CropRatioPreset) || '4:6') : 'original',
    };
  }, [fileItem, isPhotoMode]);

  const [editState, setEditState] = useState<ImageEditState>(initialEditState);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<ImageEditState[]>([initialEditState]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const pushHistory = useCallback((nextState: ImageEditState) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, nextState].slice(-20); // Keep last 20 states
    });
    setHistoryIndex((prev) => Math.min(19, prev + 1));
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const target = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setEditState(target);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setEditState(target);
    }
  }, [history, historyIndex]);

  // Keyboard Shortcuts for Undo / Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Image Element & Natural Dimensions
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 1200, height: 800 });
  const [renderedPreviewUrl, setRenderedPreviewUrl] = useState<string>(fileItem.renderedDataUrl || fileItem.previewUrl);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const lastExportedUrlRef = useRef<string>('');
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  });

  // Load Source Image
  useEffect(() => {
    if (!fileItem.previewUrl || isDocument) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth || 1200, height: img.naturalHeight || 800 });
      setImageLoaded(true);
    };
    img.src = fileItem.previewUrl;
    imgRef.current = img;
  }, [fileItem.previewUrl, isDocument]);

  // Physical Paper Geometry & Printable Area (Engine-backed)
  const printableArea: PrintableArea = useMemo(() => {
    return getPaperGeometry(
      fileItem.paperSize || 'a4',
      fileItem.orientation || 'portrait',
      fileItem.borderless || false,
      fileItem.marginMm ?? 5
    );
  }, [fileItem.paperSize, fileItem.orientation, fileItem.borderless, fileItem.marginMm]);

  // Physical Content Placement & DPI (Engine-backed)
  const placement = useMemo(() => {
    return calculateContentPlacement({
      sourceWidthPx: naturalSize.width,
      sourceHeightPx: naturalSize.height,
      printableArea,
      fitMode: editState.fitMode,
      alignment: editState.alignment,
      crop: editState.crop,
      rotation: editState.rotation,
      flipH: editState.flipH,
      flipV: editState.flipV,
      userScale: editState.zoom,
      userPanXMm: editState.panX * 0.2, // Convert drag px to mm
      userPanYMm: editState.panY * 0.2,
      customWidthMm: editState.customWidthMm,
      customHeightMm: editState.customHeightMm,
      targetPhotoSizeKey: fileItem.photoSize,
      mode: fileItem.mode,
    });
  }, [naturalSize, printableArea, editState, fileItem.photoSize, fileItem.mode]);

  // Multi-Photo Sheet Layout (for Passport or Multi-copy 4x6 on A4)
  const multiPhotoLayout = useMemo(() => {
    if (!isPhotoMode) return null;
    const isPassport = fileItem.photoSize === 'passport';
    const copies = fileItem.copies || (isPassport ? 8 : 1);
    if (!isPassport && fileItem.photoSize === 'a4_photo') return null;

    return calculateMultiPhotoLayout(
      printableArea,
      fileItem.photoSize || 'passport',
      copies,
      isPassport ? 2 : 4
    );
  }, [isPhotoMode, fileItem.photoSize, fileItem.copies, printableArea]);

  // Authoritative Price Calculation
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

  // Canvas Compositing Engine: Renders 300 DPI WYSIWYG Output
  const renderCompositeCanvas = useCallback(() => {
    if (isDocument) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use placement width & height converted to 300 DPI canvas pixels
    const outputDpi = 300;
    const canvasW = Math.max(200, Math.round((placement.widthMm / 25.4) * outputDpi));
    const canvasH = Math.max(200, Math.round((placement.heightMm / 25.4) * outputDpi));

    canvas.width = canvasW;
    canvas.height = canvasH;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.save();

    // 1. Move to center of canvas
    ctx.translate(canvasW / 2, canvasH / 2);

    // 2. Rotate & Flip
    ctx.rotate((editState.rotation * Math.PI) / 180);
    ctx.scale(editState.flipH ? -1 : 1, editState.flipV ? -1 : 1);

    // 3. Image Filters & Adjustments
    const { brightness, contrast, saturation } = editState.adjustments;
    let filterString = `brightness(${100 + brightness}%) contrast(${100 + contrast}%) saturate(${100 + saturation}%)`;
    if (fileItem.colorMode === 'bw') {
      filterString += ' grayscale(100%)';
    }
    ctx.filter = filterString;

    // 4. Source Crop Region
    const srcX = Math.round(naturalSize.width * editState.crop.x);
    const srcY = Math.round(naturalSize.height * editState.crop.y);
    const srcW = Math.round(naturalSize.width * editState.crop.width);
    const srcH = Math.round(naturalSize.height * editState.crop.height);

    // 5. Draw cropped source onto canvas
    const drawW = editState.rotation % 180 !== 0 ? canvasH : canvasW;
    const drawH = editState.rotation % 180 !== 0 ? canvasW : canvasH;

    ctx.drawImage(
      img,
      srcX,
      srcY,
      srcW,
      srcH,
      -drawW / 2,
      -drawH / 2,
      drawW,
      drawH
    );

    ctx.restore();

    // Export rendered dataURL for preview & checkout persistence
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
      setRenderedPreviewUrl(dataUrl);
      if (lastExportedUrlRef.current !== dataUrl) {
        lastExportedUrlRef.current = dataUrl;
        onUpdateRef.current({
          renderedDataUrl: dataUrl,
          fitMode: editState.fitMode,
          crop: editState.crop,
          adjustments: editState.adjustments,
          editState,
        });
      }
    } catch (e) {
      console.warn('Canvas export warning:', e);
    }
  }, [imageLoaded, placement, editState, isDocument, fileItem.colorMode, naturalSize]);

  useEffect(() => {
    renderCompositeCanvas();
  }, [renderCompositeCanvas]);

  // Drag / Pan & Pinch-to-Zoom Interaction State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialPinchDist, setInitialPinchDist] = useState<number | null>(null);

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
    if (isDragging) {
      setIsDragging(false);
      pushHistory(editState);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - editState.panX, y: e.touches[0].clientY - editState.panY });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setInitialPinchDist(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setEditState((prev) => ({
        ...prev,
        panX: e.touches[0].clientX - dragStart.x,
        panY: e.touches[0].clientY - dragStart.y,
      }));
    } else if (e.touches.length === 2 && initialPinchDist !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (dist - initialPinchDist) * 0.005;
      setEditState((prev) => ({
        ...prev,
        zoom: Math.min(3.0, Math.max(0.8, parseFloat((prev.zoom + delta).toFixed(2)))),
      }));
      setInitialPinchDist(dist);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setInitialPinchDist(null);
    pushHistory(editState);
  };

  // Wheel Zoom on Desktop
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setEditState((prev) => ({
      ...prev,
      zoom: Math.min(3.0, Math.max(0.8, parseFloat((prev.zoom + delta).toFixed(2)))),
    }));
  };

  // Preset Ratio Applier
  const applyCropRatioPreset = (preset: CropRatioPreset) => {
    const sourceAspect = naturalSize.width / naturalSize.height;
    const paperAspect = printableArea.paperWidthMm / printableArea.paperHeightMm;
    const targetRatio = getCropRatioFromPreset(preset, sourceAspect, paperAspect);

    if (targetRatio === null) {
      // Free Crop: Reset to full bounds
      const next = { ...editState, crop: DEFAULT_CROP, cropPreset: preset };
      setEditState(next);
      pushHistory(next);
      return;
    }

    let newWidth = 1.0;
    let newHeight = 1.0;

    if (sourceAspect > targetRatio) {
      // Source is wider than target ratio: crop horizontally
      newWidth = targetRatio / sourceAspect;
    } else {
      // Source is taller than target ratio: crop vertically
      newHeight = sourceAspect / targetRatio;
    }

    const newCrop: NormalizedCrop = {
      x: (1 - newWidth) / 2,
      y: (1 - newHeight) / 2,
      width: newWidth,
      height: newHeight,
    };

    const next = { ...editState, crop: newCrop, cropPreset: preset };
    setEditState(next);
    pushHistory(next);
  };

  // Rotate & Flip Operations
  const handleRotateQuarter = (direction: 'cw' | 'ccw') => {
    const delta = direction === 'cw' ? 90 : -90;
    const nextRot = (editState.rotation + delta + 360) % 360;
    const next = { ...editState, rotation: nextRot };
    setEditState(next);
    pushHistory(next);
  };

  const handleToggleFlip = (axis: 'h' | 'v') => {
    const next = axis === 'h'
      ? { ...editState, flipH: !editState.flipH }
      : { ...editState, flipV: !editState.flipV };
    setEditState(next);
    pushHistory(next);
  };

  // Fit Mode Selectors
  const handleSetFitMode = (mode: FitMode) => {
    const next = { ...editState, fitMode: mode, panX: 0, panY: 0, zoom: 1.0 };
    setEditState(next);
    pushHistory(next);
    onUpdate({ fitMode: mode });
  };

  // Alignment Selectors
  const handleSetAlignment = (alignment: Alignment) => {
    const next = { ...editState, alignment, panX: 0, panY: 0 };
    setEditState(next);
    pushHistory(next);
  };

  // Reset to Original State
  const handleResetAllEdits = () => {
    if (confirm('Reset all image edits and transforms back to original?')) {
      setEditState(DEFAULT_EDIT_STATE);
      pushHistory(DEFAULT_EDIT_STATE);
    }
  };

  // Auto Enhance Feature
  const handleAutoEnhance = () => {
    const next = {
      ...editState,
      adjustments: {
        ...editState.adjustments,
        brightness: 6,
        contrast: 12,
        saturation: 10,
        autoEnhance: true,
      },
    };
    setEditState(next);
    pushHistory(next);
  };

  // Document Page Actions
  const currentDocRotation = (fileItem.pdfPageRotations?.[activeDocPage + 1] || 0) % 360;

  const handleRotateCurrentDocPage = () => {
    const pageNum = activeDocPage + 1;
    const nextRot = (currentDocRotation + 90) % 360;
    const updated = { ...(fileItem.pdfPageRotations || {}), [pageNum]: nextRot };
    onUpdate({ pdfPageRotations: updated });
  };

  const handleTogglePageSelection = (pageNum: number) => {
    const current = fileItem.selectedPages || [];
    let updated: number[];
    if (current.includes(pageNum)) {
      if (current.length === 1) return; // Keep at least one page
      updated = current.filter((p) => p !== pageNum);
    } else {
      updated = [...current, pageNum].sort((a, b) => a - b);
    }
    onUpdate({ selectedPages: updated });
  };

  // Dynamic Physical Labels
  const paperLabel = useMemo(() => {
    const p = PAPER_DIMENSIONS_MM[fileItem.paperSize?.toLowerCase() || 'a4'] || PAPER_DIMENSIONS_MM.a4;
    return `${fileItem.paperSize?.toUpperCase() || 'A4'} • ${p.widthMm} × ${p.heightMm} mm`;
  }, [fileItem.paperSize]);

  const contentSizeLabel = useMemo(() => {
    return `${Math.round(placement.widthMm)} × ${Math.round(placement.heightMm)} mm (${(placement.widthMm / 25.4).toFixed(1)} × ${(placement.heightMm / 25.4).toFixed(1)} in)`;
  }, [placement]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Hidden high-res canvas for 300 DPI compositing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Print Studio Modal Card */}
      <div className="w-full max-w-[480px] md:max-w-5xl mx-auto h-[100dvh] md:h-[92vh] bg-white rounded-t-[28px] md:rounded-[24px] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95 duration-300">
        
        {/* ========================================================= */}
        {/* TOP BAR: Clean, Balanced, Professional Print Studio Header */}
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
                <h2 className="text-[17px] font-black tracking-tight text-slate-900 leading-none font-serif" style={{ fontFamily: "'Corben', serif" }}>
                  Gaur<span className="text-[#0284C7]">print</span> <span className="text-slate-600 font-sans text-[13px] font-bold">Studio</span>
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  {isPhotoMode ? 'Photo Print' : isImageMode ? 'Image Print' : 'Document Prepare'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-[170px] sm:max-w-xs mt-0.5">
                {fileItem.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View / Edit Mode Switcher */}
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
                className="w-9 h-9 rounded-full bg-red-50 hover:bg-red-100 active:scale-95 text-red-600 flex items-center justify-center transition-colors"
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
          {/* LEFT: HERO PREVIEW & INTERACTIVE CANVAS */}
          {/* ========================================================= */}
          <div className="md:col-span-7 bg-slate-100/70 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col items-center justify-between p-3 sm:p-4 select-none shrink-0 min-h-[400px] md:min-h-full">
            
            {/* Top HUD: Physical Sheet Info & Quality Indicator */}
            <div className="w-full flex items-center justify-between z-10 text-[11px] font-semibold text-slate-700 mb-2 gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-white/95 px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
                <span>📄 {paperLabel}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 font-mono">{contentSizeLabel}</span>
              </div>

              <div className="flex items-center gap-1.5 bg-white/95 px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
                {/* DPI Quality Pill */}
                {!isDocument && (
                  <span
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      placement.dpiRating === 'excellent'
                        ? 'bg-emerald-50 text-emerald-700'
                        : placement.dpiRating === 'good'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {placement.dpiRating === 'low' && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                    <span>{placement.effectiveDpi} DPI</span>
                  </span>
                )}
                <span>{fileItem.colorMode === 'bw' ? '⚫ B&W' : '🎨 Color'}</span>
              </div>
            </div>

            {/* HERO CANVAS CONTAINER */}
            <div
              className="flex-1 w-full flex flex-col items-center justify-center p-2 relative touch-none"
              onWheel={activeTab === 'editor' ? handleWheel : undefined}
            >
              {/* TAB 1: REAL VIRTUAL PHYSICAL PAPER PREVIEW */}
              {activeTab === 'preview' && (
                <div
                  className="flex flex-col items-center justify-center w-full transition-transform duration-200"
                  style={{ transform: `scale(${previewZoom})` }}
                >
                  {/* Virtual Paper Sheet with Physical Dimensions Ratio */}
                  <div
                    className="bg-white rounded-lg shadow-[0_20px_45px_rgba(15,23,42,0.14),0_2px_8px_rgba(15,23,42,0.06)] border border-slate-300/80 relative overflow-hidden transition-all duration-300 flex items-center justify-center"
                    style={{
                      width: fileItem.orientation === 'landscape' ? '320px' : '230px',
                      height: fileItem.orientation === 'landscape' ? '230px' : '320px',
                      padding: `${(printableArea.marginMm.top / printableArea.paperHeightMm) * 100}%`,
                    }}
                  >
                    {/* Dotted Printable Area Safe Margin */}
                    <div className="w-full h-full border border-dashed border-sky-300/80 rounded relative flex items-center justify-center overflow-hidden bg-slate-50/40">
                      
                      {/* CASE A: DOCUMENT / PDF PREVIEW */}
                      {isDocument ? (
                        fileItem.type === 'pdf' ? (
                          <div
                            className="w-full h-full relative overflow-hidden transition-transform duration-200"
                            style={{
                              transform: `rotate(${currentDocRotation}deg)`,
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
                          <div className="flex flex-col items-center justify-center text-blue-500 p-4 text-center">
                            <FileText className="w-12 h-12 mb-2 text-blue-500" />
                            <span className="text-[12px] font-bold text-slate-800 line-clamp-2">{fileItem.name}</span>
                            <span className="text-[10px] text-slate-400 mt-1">{fileItem.pages} Pages Document</span>
                          </div>
                        )
                      ) : multiPhotoLayout && multiPhotoLayout.photosPerSheet > 1 ? (
                        /* CASE B: MULTI-PHOTO SHEET (Passport / 8x Grid) */
                        <div
                          className="w-full h-full grid gap-1 p-1 items-center justify-center content-center"
                          style={{
                            gridTemplateColumns: `repeat(${multiPhotoLayout.cols}, minmax(0, 1fr))`,
                            gridTemplateRows: `repeat(${multiPhotoLayout.rows}, minmax(0, 1fr))`,
                          }}
                        >
                          {multiPhotoLayout.cells.map((cell) => (
                            <div
                              key={cell.index}
                              className="w-full h-full bg-slate-100 border border-slate-300 rounded-xs overflow-hidden relative shadow-2xs aspect-[35/45]"
                            >
                              <img
                                src={renderedPreviewUrl}
                                alt="Grid Cell"
                                className="w-full h-full object-cover"
                                style={{
                                  filter: fileItem.colorMode === 'bw' ? 'grayscale(100%)' : 'none',
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* CASE C: SINGLE PHOTO / IMAGE ON SHEET */
                        <div
                          className="rounded overflow-hidden shadow-xs relative flex items-center justify-center bg-slate-100 transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.max(20, (placement.widthMm / printableArea.printableWidthMm) * 100))}%`,
                            height: `${Math.min(100, Math.max(20, (placement.heightMm / printableArea.printableHeightMm) * 100))}%`,
                          }}
                        >
                          <img
                            src={isComparingBefore ? fileItem.previewUrl : renderedPreviewUrl}
                            alt="Print Preview"
                            className="w-full h-full object-cover transition-all"
                            style={{
                              filter: isComparingBefore
                                ? 'none'
                                : fileItem.colorMode === 'bw'
                                ? 'grayscale(100%)'
                                : 'none',
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Multi-page Pager for Documents */}
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

                  {/* Quality Guidance Note */}
                  {placement.dpiRating === 'low' && !isDocument && (
                    <div className="mt-2.5 flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Low resolution ({placement.effectiveDpi} DPI). Output may look soft or pixelated.</span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: INTERACTIVE TRANSFORM & CROP WORKSPACE */}
              {activeTab === 'editor' && (
                <div className="flex flex-col items-center justify-center w-full">
                  {!isDocument ? (
                    <div className="flex flex-col items-center w-full">
                      {/* Interactive Workspace Frame */}
                      <div
                        className="bg-slate-900 rounded-2xl overflow-hidden relative cursor-grab active:cursor-grabbing shadow-2xl flex items-center justify-center touch-none select-none"
                        style={{
                          width: '280px',
                          height: '280px',
                          aspectRatio: '1/1',
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                      >
                        {/* Target Crop Boundary Overlay */}
                        <div
                          className="absolute border-2 border-cyan-400 bg-cyan-500/10 pointer-events-none z-10 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]"
                          style={{
                            width: `${editState.crop.width * 100}%`,
                            height: `${editState.crop.height * 100}%`,
                            left: `${editState.crop.x * 100}%`,
                            top: `${editState.crop.y * 100}%`,
                          }}
                        >
                          {/* Corner Handles */}
                          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-xs" />
                          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-xs" />
                          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-xs" />
                          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-xs" />

                          {/* Rule of Thirds Grid */}
                          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                            <div className="border-r border-b border-cyan-300" />
                            <div className="border-r border-b border-cyan-300" />
                            <div className="border-b border-cyan-300" />
                            <div className="border-r border-b border-cyan-300" />
                            <div className="border-r border-b border-cyan-300" />
                            <div className="border-b border-cyan-300" />
                            <div className="border-r border-cyan-300" />
                            <div className="border-r border-cyan-300" />
                            <div />
                          </div>
                        </div>

                        {/* Transformed Image Underneath */}
                        <div
                          className="relative transition-transform duration-75 flex items-center justify-center w-full h-full"
                          style={{
                            transform: `translate(${editState.panX}px, ${editState.panY}px) rotate(${editState.rotation}deg) scale(${
                              (editState.flipH ? -1 : 1) * editState.zoom
                            }, ${(editState.flipV ? -1 : 1) * editState.zoom})`,
                            filter: `brightness(${100 + editState.adjustments.brightness}%) contrast(${100 + editState.adjustments.contrast}%) saturate(${100 + editState.adjustments.saturation}%)`,
                          }}
                        >
                          <img
                            src={fileItem.previewUrl}
                            alt="Source"
                            className="max-w-full max-h-full object-contain pointer-events-none"
                          />
                        </div>

                        {/* Aspect Ratio Badge */}
                        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-black/80 text-white backdrop-blur-xs z-20">
                          {editState.cropPreset.toUpperCase()} • {Math.round(editState.zoom * 100)}%
                        </div>
                      </div>

                      {/* Tool Sub-Navigation Pill Strip */}
                      <div className="flex items-center gap-1.5 mt-3 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
                        <button
                          type="button"
                          onClick={() => setEditorSubTool('crop')}
                          className={`px-3 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center gap-1.5 transition-all ${
                            editorSubTool === 'crop'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Crop className="w-3.5 h-3.5" />
                          <span>Crop & Ratio</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditorSubTool('transform')}
                          className={`px-3 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center gap-1.5 transition-all ${
                            editorSubTool === 'transform'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Move className="w-3.5 h-3.5" />
                          <span>Resize & Move</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditorSubTool('adjust')}
                          className={`px-3 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center gap-1.5 transition-all ${
                            editorSubTool === 'adjust'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Adjust</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Document Preparation Hub */
                    <div className="w-full max-w-sm bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-bold text-slate-800">
                          Page {activeDocPage + 1} Orientation
                        </span>
                        <button
                          type="button"
                          onClick={handleRotateCurrentDocPage}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-[12px] font-bold flex items-center gap-1.5 active:scale-95"
                        >
                          <RotateCw className="w-4 h-4" />
                          <span>Rotate 90° ({currentDocRotation}°)</span>
                        </button>
                      </div>

                      {/* Interactive Page Selection Cards */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Printable Pages ({fileItem.selectedPages?.length || fileItem.pages} of {fileItem.pages})
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdate({
                                selectedPages: Array.from({ length: fileItem.pages || 1 }, (_, i) => i + 1),
                              })
                            }
                            className="text-[11px] font-bold text-blue-600 hover:underline"
                          >
                            Select All
                          </button>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {Array.from({ length: fileItem.pages || 1 }).map((_, idx) => {
                            const pNum = idx + 1;
                            const isSelected = (fileItem.selectedPages || []).includes(pNum);
                            return (
                              <button
                                key={pNum}
                                type="button"
                                onClick={() => {
                                  handleTogglePageSelection(pNum);
                                  setActiveDocPage(idx);
                                }}
                                className={`w-10 h-13 rounded-xl border text-[12px] font-bold flex flex-col items-center justify-center transition-all shrink-0 ${
                                  isSelected
                                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-extrabold ring-1 ring-blue-500/30'
                                    : 'border-slate-200 bg-slate-50 text-slate-400 line-through'
                                }`}
                              >
                                <span>{pNum}</span>
                                <span className="text-[8px] font-normal leading-none mt-0.5">
                                  {isSelected ? 'Print' : 'Skip'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions & Undo/Redo Footer Strip */}
            <div className="w-full flex items-center justify-between pt-2 border-t border-slate-200/80 gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-white disabled:opacity-30 border border-transparent hover:border-slate-200 shadow-2xs"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-white disabled:opacity-30 border border-transparent hover:border-slate-200 shadow-2xs"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleResetAllEdits}
                  className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 shadow-2xs text-[11px] font-bold flex items-center gap-1"
                  title="Reset to Original"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              </div>

              {/* Before/After Comparison Button */}
              {!isDocument && (
                <button
                  type="button"
                  onMouseDown={() => setIsComparingBefore(true)}
                  onMouseUp={() => setIsComparingBefore(false)}
                  onTouchStart={() => setIsComparingBefore(true)}
                  onTouchEnd={() => setIsComparingBefore(false)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-bold hover:bg-slate-50 active:bg-blue-50 active:text-blue-600 shadow-2xs"
                >
                  {isComparingBefore ? 'Showing Original' : 'Hold for Original'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'preview' ? 'editor' : 'preview')}
                className="text-[12px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                {activeTab === 'preview'
                  ? isDocument
                    ? '📑 Prepare Document →'
                    : '✂️ Open Editor →'
                  : '✓ Done Editing'}
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT: CONTROLS, SETTINGS & AUTHORITATIVE PRICING */}
          {/* ========================================================= */}
          <div className="md:col-span-5 p-4 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              
              {/* SUB-TOOL SECTION 1: CROP & ASPECT RATIO (WHEN IN EDITOR TAB) */}
              {activeTab === 'editor' && editorSubTool === 'crop' && !isDocument && (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-black text-slate-800 uppercase tracking-wider">
                      Crop Aspect Ratio
                    </span>
                    <span className="text-[11px] font-bold text-blue-600">
                      {editState.cropPreset.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {(['original', '4:6', '5:7', '6:8', 'passport', '1:1', 'a4', 'free'] as CropRatioPreset[]).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => applyCropRatioPreset(preset)}
                        className={`py-1.5 rounded-xl border text-[11px] font-bold transition-all ${
                          editState.cropPreset === preset
                            ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {preset.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  {/* Zoom Slider */}
                  <div className="pt-2 border-t border-slate-200/80">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                      <span>Zoom Frame</span>
                      <span className="font-mono">{Math.round(editState.zoom * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditState((prev) => ({ ...prev, zoom: Math.max(0.8, prev.zoom - 0.1) }))}
                        className="p-1 rounded bg-white border border-slate-200 text-slate-700"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="range"
                        min="0.8"
                        max="3.0"
                        step="0.05"
                        value={editState.zoom}
                        onChange={(e) => setEditState((prev) => ({ ...prev, zoom: parseFloat(e.target.value) }))}
                        className="flex-1 accent-blue-600"
                      />
                      <button
                        type="button"
                        onClick={() => setEditState((prev) => ({ ...prev, zoom: Math.min(3.0, prev.zoom + 0.1) }))}
                        className="p-1 rounded bg-white border border-slate-200 text-slate-700"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TOOL SECTION 2: RESIZE, MOVE & ALIGNMENT */}
              {activeTab === 'editor' && editorSubTool === 'transform' && !isDocument && (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                  <span className="text-[12px] font-black text-slate-800 uppercase tracking-wider block">
                    Page Fit Mode
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['fit', 'fill', 'actual', 'custom'] as FitMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleSetFitMode(mode)}
                        className={`py-1.5 rounded-xl border text-[11px] font-bold transition-all ${
                          editState.fitMode === mode
                            ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {mode === 'fit' ? 'Fit Page' : mode === 'fill' ? 'Fill Page' : mode === 'actual' ? 'Actual' : 'Custom'}
                      </button>
                    ))}
                  </div>

                  {/* Alignment Hub */}
                  <div className="pt-2 border-t border-slate-200/80">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1.5">
                      Alignment on Paper
                    </span>
                    <div className="grid grid-cols-5 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSetAlignment('left')}
                        className={`p-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center ${
                          editState.alignment === 'left' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetAlignment('center')}
                        className={`p-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center ${
                          editState.alignment === 'center' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetAlignment('right')}
                        className={`p-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center ${
                          editState.alignment === 'right' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetAlignment('top')}
                        className={`p-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center ${
                          editState.alignment === 'top' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetAlignment('bottom')}
                        className={`p-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center ${
                          editState.alignment === 'bottom' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Rotate & Flip Hub */}
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      Rotate & Flip
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleRotateQuarter('ccw')}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700"
                        title="Rotate Left 90°"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRotateQuarter('cw')}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700"
                        title="Rotate Right 90°"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleFlip('h')}
                        className={`p-1.5 rounded-lg border ${
                          editState.flipH ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                        title="Flip Horizontal"
                      >
                        <FlipHorizontal className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleFlip('v')}
                        className={`p-1.5 rounded-lg border ${
                          editState.flipV ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                        title="Flip Vertical"
                      >
                        <FlipVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TOOL SECTION 3: IMAGE ADJUSTMENTS */}
              {activeTab === 'editor' && editorSubTool === 'adjust' && !isDocument && (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-black text-slate-800 uppercase tracking-wider">
                      Color & Clarity
                    </span>
                    <button
                      type="button"
                      onClick={handleAutoEnhance}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold flex items-center gap-1 active:scale-95"
                    >
                      <Sparkle className="w-3 h-3 text-blue-600 fill-blue-600" />
                      <span>Auto Enhance</span>
                    </button>
                  </div>

                  {/* Brightness */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-0.5">
                      <span>Brightness</span>
                      <span className="font-mono">{editState.adjustments.brightness > 0 ? `+${editState.adjustments.brightness}` : editState.adjustments.brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={editState.adjustments.brightness}
                      onChange={(e) =>
                        setEditState((prev) => ({
                          ...prev,
                          adjustments: { ...prev.adjustments, brightness: parseInt(e.target.value, 10) },
                        }))
                      }
                      className="w-full accent-blue-600"
                    />
                  </div>

                  {/* Contrast */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-0.5">
                      <span>Contrast</span>
                      <span className="font-mono">{editState.adjustments.contrast > 0 ? `+${editState.adjustments.contrast}` : editState.adjustments.contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={editState.adjustments.contrast}
                      onChange={(e) =>
                        setEditState((prev) => ({
                          ...prev,
                          adjustments: { ...prev.adjustments, contrast: parseInt(e.target.value, 10) },
                        }))
                      }
                      className="w-full accent-blue-600"
                    />
                  </div>

                  {/* Saturation */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-0.5">
                      <span>Saturation</span>
                      <span className="font-mono">{editState.adjustments.saturation > 0 ? `+${editState.adjustments.saturation}` : editState.adjustments.saturation}%</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={editState.adjustments.saturation}
                      onChange={(e) =>
                        setEditState((prev) => ({
                          ...prev,
                          adjustments: { ...prev.adjustments, saturation: parseInt(e.target.value, 10) },
                        }))
                      }
                      className="w-full accent-blue-600"
                    />
                  </div>
                </div>
              )}

              {/* SECTION: PRINT SETTINGS (PAPER, PHOTO SIZE, ORIENTATION, SIDES, COPIES) */}
              <div className="space-y-3.5">
                {/* 1. Production Mode */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Print Mode
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
                      className={`p-2 rounded-xl border text-left transition-all ${
                        isPhotoMode
                          ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-[13px] font-bold text-slate-900 block">📸 Photo Print</span>
                      <span className="text-[10px] text-slate-500">Premium Glossy/Matte</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onUpdate({
                          mode: isDocument ? 'document' : 'image',
                          paperSize: fileItem.paperSize || 'a4',
                        })
                      }
                      className={`p-2 rounded-xl border text-left transition-all ${
                        !isPhotoMode
                          ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-[13px] font-bold text-slate-900 block">
                        {isDocument ? '📄 Document' : '🖼️ Image Print'}
                      </span>
                      <span className="text-[10px] text-slate-500">Plain A4/A3 Paper</span>
                    </button>
                  </div>
                </div>

                {/* 2. Photo Size Presets (When in Photo Mode) */}
                {isPhotoMode && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Target Photo Size
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.keys(PHOTO_TARGET_SIZES_MM).map((key) => {
                        const target = PHOTO_TARGET_SIZES_MM[key];
                        const isSelected = fileItem.photoSize === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              onUpdate({ photoSize: key });
                              if (key === 'passport') {
                                applyCropRatioPreset('passport');
                              } else if (key === '4x6') {
                                applyCropRatioPreset('4:6');
                              } else if (key === '5x7') {
                                applyCropRatioPreset('5:7');
                              }
                            }}
                            className={`p-2 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold ring-1 ring-blue-500/30'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="text-[12px] block">{target.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Paper Size & Orientation */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Paper Size
                    </label>
                    <select
                      value={fileItem.paperSize || 'a4'}
                      onChange={(e) => onUpdate({ paperSize: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-[13px] font-bold outline-none"
                    >
                      <option value="a4">A4 (210 × 297 mm)</option>
                      <option value="a3">A3 (297 × 420 mm)</option>
                      <option value="legal">Legal (216 × 356 mm)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Orientation
                    </label>
                    <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 h-10 items-center">
                      <button
                        type="button"
                        onClick={() => onUpdate({ orientation: 'portrait' })}
                        className={`flex-1 h-9 rounded-lg text-[12px] font-bold transition-all ${
                          fileItem.orientation === 'portrait' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        Portrait
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdate({ orientation: 'landscape' })}
                        className={`flex-1 h-9 rounded-lg text-[12px] font-bold transition-all ${
                          fileItem.orientation === 'landscape' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        Landscape
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Duplex (for Documents) */}
                {isDocument && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Print Sides
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onUpdate({ sides: 'single' })}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          fileItem.sides === 'single'
                            ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-500/30'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-[12px] font-bold block">Single-Sided</span>
                        <span className="text-[10px] text-slate-500">Print on one side</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdate({ sides: 'duplex' })}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          fileItem.sides === 'duplex'
                            ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-500/30'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-[12px] font-bold block">Double-Sided</span>
                        <span className="text-[10px] text-slate-500">Print on both sides</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. Color & Copies */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Color Mode
                    </label>
                    <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 h-10 items-center">
                      <button
                        type="button"
                        onClick={() => onUpdate({ colorMode: 'color' })}
                        className={`flex-1 h-9 rounded-lg text-[12px] font-bold transition-all ${
                          fileItem.colorMode === 'color' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        Color
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdate({ colorMode: 'bw' })}
                        className={`flex-1 h-9 rounded-lg text-[12px] font-bold transition-all ${
                          fileItem.colorMode === 'bw' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        B&W
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Copies
                    </label>
                    <div className="flex items-center justify-between bg-slate-100 p-0.5 rounded-xl border border-slate-200 h-10 px-1">
                      <button
                        type="button"
                        onClick={() => onUpdate({ copies: Math.max(1, (fileItem.copies || 1) - 1) })}
                        disabled={(fileItem.copies || 1) <= 1}
                        className="w-8 h-8 rounded-lg bg-white text-slate-800 font-bold flex items-center justify-center disabled:opacity-30 shadow-xs"
                      >
                        -
                      </button>
                      <span className="text-[13px] font-bold text-slate-900 font-mono">
                        {fileItem.copies || 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdate({ copies: (fileItem.copies || 1) + 1 })}
                        className="w-8 h-8 rounded-lg bg-white text-slate-800 font-bold flex items-center justify-center shadow-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* 6. Borderless Toggle */}
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-slate-800">Borderless Printing</span>
                    <span className="text-[10px] text-slate-500">Expands image to edge of paper sheet</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdate({ borderless: !fileItem.borderless })}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                      fileItem.borderless ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                        fileItem.borderless ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* AUTHORITATIVE LIVE PRICING BREAKDOWN */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-2xl overflow-hidden mt-2">
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
                    <span className="text-[16px] font-extrabold text-blue-700 font-mono">
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

            {/* STICKY BOTTOM ACTION BAR (NEVER GETS CLIPPED BY MOBILE BROWSER) */}
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
