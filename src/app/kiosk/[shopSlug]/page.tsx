'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Upload,
  FolderOpen,
  Camera,
  FileText,
  Trash2,
  RefreshCw,
  Plus,
  Lock,
  ArrowRight,
  ShieldCheck,
  Printer,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { HeaderBar } from '@/components/HeaderBar';
import { TicketCard, TicketPerforation } from '@/components/TicketCard';
import { StampBadge } from '@/components/StampBadge';
import { inspectUploadedFile, FileAnalysisResult } from '@/lib/pdf-inspector';
import { calculatePrintPrice, DEFAULT_PRICE_CONFIG } from '@/lib/price-calculator';
import { Shop } from '@/types/database';

export default function KioskUploadPage() {
  const params = useParams();
  const router = useRouter();
  const shopSlug = (params?.shopSlug as string) || 'shree-ganesh-xerox';

  const [shop, setShop] = useState<Shop | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [loadingShop, setLoadingShop] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<FileAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const addMoreInputRef = useRef<HTMLInputElement | null>(null);

  // Load shop data with sessionStorage caching & validation
  useEffect(() => {
    // 1. Immediately restore cached shop if matching to avoid any blank flicker
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
          // Only clear if no matching cached shop
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

  const mergeFilesToPdf = async (fileList: File[]): Promise<File> => {
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();

    for (const f of fileList) {
      const buffer = await f.arrayBuffer();
      const cleanName = f.name.toLowerCase();

      if (cleanName.endsWith('.pdf')) {
        const donorPdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const copiedPages = await pdfDoc.copyPages(donorPdf, donorPdf.getPageIndices());
        copiedPages.forEach((p) => pdfDoc.addPage(p));
      } else if (cleanName.endsWith('.png')) {
        const pngImage = await pdfDoc.embedPng(buffer);
        const a4Width = 595.28;
        const a4Height = 841.89;
        const page = pdfDoc.addPage([a4Width, a4Height]);
        const margin = 36;
        const dims = pngImage.scaleToFit(a4Width - margin * 2, a4Height - margin * 2);
        page.drawImage(pngImage, {
          x: margin + (a4Width - margin * 2 - dims.width) / 2,
          y: margin + (a4Height - margin * 2 - dims.height) / 2,
          width: dims.width,
          height: dims.height,
        });
      } else {
        // JPG, JPEG, WEBP, etc.
        const jpgImage = await pdfDoc.embedJpg(buffer);
        const a4Width = 595.28;
        const a4Height = 841.89;
        const page = pdfDoc.addPage([a4Width, a4Height]);
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

    const mergedBytes = await pdfDoc.save();
    return new File([mergedBytes as unknown as BlobPart], `Scanned_Document_${fileList.length}_Pages.pdf`, {
      type: 'application/pdf',
    });
  };

  const handleFilesChange = async (incoming: FileList | File[] | null, isAppend = false) => {
    if (!incoming || incoming.length === 0) return;
    const incomingArray = Array.from(incoming);

    setIsAnalyzing(true);
    try {
      let finalFile: File;
      if (isAppend && file) {
        finalFile = await mergeFilesToPdf([file, ...incomingArray]);
      } else if (incomingArray.length > 1) {
        finalFile = await mergeFilesToPdf(incomingArray);
      } else {
        finalFile = incomingArray[0];
      }

      setFile(finalFile);
      const result = await inspectUploadedFile(finalFile);
      setAnalysis(result);

      const reader = new FileReader();
      reader.onload = () => {
        try {
          sessionStorage.setItem('qp_file_name', finalFile.name);
          sessionStorage.setItem('qp_file_type', finalFile.type);
          sessionStorage.setItem('qp_file_pages', String(result.pages));
          sessionStorage.setItem('qp_file_size', String(finalFile.size));
          sessionStorage.setItem('qp_file_data', reader.result as string);
        } catch (e) {
          console.warn('Storage quota warning, keeping in-memory:', e);
        }
      };
      reader.readAsDataURL(finalFile);
    } catch (err) {
      console.error('Failed to process uploaded files:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesChange(e.dataTransfer.files, false);
    }
  };

  const handleContinue = () => {
    if (!file || !analysis) return;
    router.push(`/kiosk/${shopSlug}/options`);
  };

  const priceEstimate = calculatePrintPrice({
    pages: analysis?.pages || 1,
    copies: 1,
    colorMode: 'bw',
    paperSize: 'a4',
    duplex: false,
    priceConfig: shop?.price_config || DEFAULT_PRICE_CONFIG,
  });

  if (!loadingShop && !shop) {
    return (
      <div className="min-h-screen bg-[#fafaf7] flex flex-col items-center justify-center p-4">
        <TicketCard className="max-w-md w-full p-6 text-center">
          <AlertCircle className="w-10 h-10 text-[#ba1a1a] mx-auto mb-2" />
          <h2 className="text-[18px] font-bold text-[#1c1b1f]">Shop Unavailable</h2>
          <p className="text-[13px] text-[#6b6966] mt-1 mb-5">
            This QR code is invalid or this print counter is currently offline.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full h-11 rounded bg-[#ff5a1f] text-white font-bold text-[14px] btn-tactile"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/customer')}
              className="w-full h-11 rounded bg-[#f4f4f1] text-[#1c1b1f] font-bold text-[14px] border border-[#e6e5df]"
            >
              Scan QR Again
            </button>
          </div>
        </TicketCard>
      </div>
    );
  }

  const isOrdersPaused = shop?.price_config?.is_accepting_orders === false || shop?.price_config?.orders_paused === true;

  if (!loadingShop && shop && isOrdersPaused) {
    return (
      <div className="min-h-screen bg-[#fafaf7] flex flex-col items-center justify-center p-4">
        <TicketCard className="max-w-md w-full p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-[#fff8e1] border border-[#f59e0b]/30 flex items-center justify-center text-[#d97706] mx-auto mb-3">
            <AlertCircle className="w-7 h-7" />
          </div>
          <span className="text-[11px] font-mono font-bold tracking-widest text-[#6b6966] uppercase">
            LIVE COUNTER STATUS
          </span>
          <h2 className="text-[20px] font-bold text-[#1c1b1f] mt-1">{shop.name}</h2>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fef3c7] text-[#92400e] text-[12px] font-semibold my-3">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse" />
            Orders Temporarily Paused
          </div>
          <p className="text-[13px] text-[#6b6966] mb-6 leading-relaxed">
            The counter operator is currently clearing the print queue. Intake of new orders is temporarily paused. Please check back in a couple of minutes or ask at the counter.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full h-11 rounded bg-[#ff5a1f] hover:bg-[#e04b14] text-white font-bold text-[14px] btn-tactile flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Check Counter Status</span>
            </button>
          </div>
        </TicketCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] flex flex-col justify-between pb-28">
      {/* Kiosk Header */}
      <HeaderBar
        shopName={shop?.name || 'QuickPrint Counter'}
        counterInfo="Counter #04"
        isOnline={isOnline}
      />

      <main className="max-w-xl mx-auto w-full px-4 pt-20 flex-1 flex flex-col gap-4">
        {/* 3-Step Progress Indicator */}
        <div className="w-full bg-[#f4f4f1] rounded-lg px-4 py-2.5 flex items-center justify-between border border-[#e6e5df]">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-[#1c1b1f] text-white font-mono text-center font-bold flex items-center justify-center text-[11px]">
              1
            </span>
            <span className="text-[13px] text-[#1c1b1f] font-bold">Upload</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#a8a6a1]" />
          <div className="flex items-center gap-1.5 opacity-50">
            <span className="w-5 h-5 rounded-full bg-[#e8e8e5] text-[#1c1b1f] font-mono text-center font-medium flex items-center justify-center text-[11px]">
              2
            </span>
            <span className="text-[13px] text-[#1c1b1f]">Options</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#a8a6a1]" />
          <div className="flex items-center gap-1.5 opacity-50">
            <span className="w-5 h-5 rounded-full bg-[#e8e8e5] text-[#1c1b1f] font-mono text-center font-medium flex items-center justify-center text-[11px]">
              3
            </span>
            <span className="text-[13px] text-[#1c1b1f]">Pay & Collect</span>
          </div>
        </div>

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
          multiple
          className="hidden"
          onChange={(e) => handleFilesChange(e.target.files, false)}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => handleFilesChange(e.target.files, false)}
        />
        <input
          ref={addMoreInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFilesChange(e.target.files, true)}
        />

        {/* Primary High-Clarity Upload Box */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current?.click()}
          className={`relative w-full bg-white rounded-lg p-5 border-2 border-dashed transition-all flex flex-col items-center text-center cursor-pointer ${
            dragActive
              ? 'border-[#ff5a1f] bg-[#ff5a1f]/5 scale-[1.01]'
              : 'border-[#dadad7] hover:border-[#1c1b1f]'
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-[#f4f4f1] border border-[#e6e5df] flex items-center justify-center text-[#ff5a1f] mb-2.5">
            <Upload className="w-6 h-6" />
          </div>

          <h2 className="text-[17px] font-bold text-[#1c1b1f]">
            Select Document or Take Photo
          </h2>
          <p className="text-[12px] text-[#6b6966] mt-0.5 mb-3 font-mono">
            PDF, Word, JPG, PNG • max 25MB
          </p>

          <div className="grid grid-cols-2 gap-2.5 w-full mt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="min-h-[44px] px-3 rounded bg-[#f4f4f1] hover:bg-[#e8e8e5] text-[#1c1b1f] border border-[#e6e5df] text-[13px] font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
            >
              <FolderOpen className="w-4 h-4 text-[#1c1b1f]" />
              <span>Browse Files</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cameraInputRef.current?.click();
              }}
              className="min-h-[44px] px-3 rounded bg-[#f4f4f1] hover:bg-[#e8e8e5] text-[#1c1b1f] border border-[#e6e5df] text-[13px] font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
            >
              <Camera className="w-4 h-4 text-[#ff5a1f]" />
              <span>Scan Page</span>
            </button>
          </div>
        </div>

        {/* Staged Document Ticket Header */}
        {file && analysis && (
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] font-bold tracking-wider text-[#1c1b1f] uppercase">
                  ATTACHED DOCUMENT
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a1f]" />
              </div>
              <span className="font-mono text-[11px] font-bold text-[#6b6966]">
                SLOT: TRAY A-4
              </span>
            </div>

            {/* Thermal File Ticket Card */}
            <TicketCard>
              <div className="p-4 flex items-start gap-3">
                <div className="w-12 h-14 rounded bg-[#1c1b1f] text-white flex flex-col items-center justify-between py-1.5 shrink-0 shadow-xs">
                  <span className="font-mono text-[9px] font-bold tracking-widest text-[#a8a6a1]">
                    DOC
                  </span>
                  <FileText className="w-5 h-5 text-[#ff5a1f]" />
                  <span className="font-mono text-[9px] font-bold text-white">
                    {analysis.isPdf ? 'PDF' : 'IMG'}
                  </span>
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[14px] font-bold text-[#1c1b1f] truncate">
                      {analysis.fileName}
                    </span>
                    <StampBadge status="VERIFIED" size="sm" />
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-[13px] text-[#1c1b1f] font-bold">
                      {analysis.pages} {analysis.pages === 1 ? 'Page' : 'Pages'}
                    </span>
                    <span className="text-[#a8a6a1]">•</span>
                    <span className="font-mono text-[12px] text-[#6b6966]">
                      {analysis.formattedSize}
                    </span>
                    <span className="text-[#a8a6a1]">•</span>
                    <span className="font-mono text-[12px] text-[#1b7a4d] font-semibold">
                      Print Ready
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-[#f4f4f1] flex-wrap">
                    <button
                      type="button"
                      onClick={() => addMoreInputRef.current?.click()}
                      className="text-[12px] font-semibold text-[#1c1b1f] hover:text-[#ff5a1f] flex items-center gap-1 transition-colors px-2 py-1 rounded bg-[#f4f4f1] hover:bg-[#e8e8e5]"
                      title="Add more scanned pages or images to this document"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#ff5a1f]" />
                      <span>+ Add More Pages</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[12px] font-semibold text-[#ff5a1f] hover:text-[#e04b14] flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Replace</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setAnalysis(null);
                        sessionStorage.clear();
                      }}
                      className="text-[12px] font-semibold text-[#ba1a1a] hover:text-[#93000a] flex items-center gap-1 transition-colors ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Perforation line */}
              <TicketPerforation />

              {/* Setting Overview Pill */}
              <div className="bg-[#f4f4f1] px-4 py-2 flex items-center justify-between border-t border-[#e6e5df]">
                <div className="flex items-center gap-1.5 text-[12px] font-mono text-[#6b6966]">
                  <Printer className="w-3.5 h-3.5" />
                  <span>A4 Standard • Black & White</span>
                </div>
                <span className="font-mono text-[13px] font-bold text-[#1c1b1f]">
                  ~ {priceEstimate.formattedTotal}
                </span>
              </div>
            </TicketCard>
          </div>
        )}

        {/* Compact Trust & Auto-Purge Reassurance */}
        <div className="w-full rounded-lg bg-[#f4f4f1] p-3 flex items-start gap-2.5 border border-[#e6e5df]">
          <div className="w-6 h-6 rounded-full bg-white border border-[#e6e5df] flex items-center justify-center text-[#1b7a4d] shrink-0 mt-0.5">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <p className="text-[11px] text-[#6b6966] leading-relaxed m-0 font-sans">
            Your files are encrypted and automatically deleted from the printer
            buffer after physical dispensing. No personal files are permanently stored.
          </p>
        </div>
      </main>

      {/* Persistent Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-[#fafaf7]/95 backdrop-blur-md border-t border-[#e6e5df] shadow-lg">
        <div className="max-w-xl mx-auto flex flex-col gap-2">
          {file && analysis && (
            <div className="flex items-center justify-between px-1">
              <span className="text-[12px] font-mono text-[#6b6966]">
                Estimated Chit Total
              </span>
              <span className="text-[13px] font-mono font-bold text-[#1c1b1f]">
                {analysis.pages} Pages • ~ {priceEstimate.formattedTotal}
              </span>
            </div>
          )}

          <button
            type="button"
            disabled={!file || !analysis || isAnalyzing}
            onClick={handleContinue}
            className={`w-full h-12 rounded bg-[#ff5a1f] hover:bg-[#e04b14] active:scale-[0.99] text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-sm transition-all ${
              !file || !analysis ? 'opacity-40 cursor-not-allowed' : 'btn-tactile'
            }`}
          >
            <span>Continue to Print Settings</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
