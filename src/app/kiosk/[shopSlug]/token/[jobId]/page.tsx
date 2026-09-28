'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Printer,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowRight,
  RefreshCw,
  Clock,
  ChevronLeft,
  Share2,
  Copy,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '@/lib/supabase/client';
import { Job } from '@/types/database';

export default function KioskLiveTokenPage() {
  const params = useParams();
  const router = useRouter();
  const shopSlug = (params?.shopSlug as string) || 'shree-ganesh-xerox';
  const jobId = params?.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [shop, setShop] = useState<{ id?: string; name?: string } | null>(null);
  const [positionAhead, setPositionAhead] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasCelebrated, setHasCelebrated] = useState(false);
  const [copied, setCopied] = useState(false);

  // Restore shop context
  useEffect(() => {
    const cached = sessionStorage.getItem('qp_shop_context');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed?.name) setShop(parsed);
      } catch (e) {}
    }
    fetch(`/api/shops/${shopSlug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.shop) setShop(d.shop);
      })
      .catch(() => {});
  }, [shopSlug]);

  // Initial fetch
  useEffect(() => {
    async function fetchJob() {
      if (!jobId) return;
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (res.ok) {
          const data = await res.json();
          setJob(data.job);
          setPositionAhead(data.positionAhead ?? 0);

          if (data.job?.print_status === 'completed' && !hasCelebrated) {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            setHasCelebrated(true);
          }
        }
      } catch (err) {
        console.error('Error fetching job:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchJob();

    // Fast active polling fallback every 2 seconds to ensure web app syncs instantly
    const pollInterval = setInterval(() => {
      fetchJob();
    }, 2000);

    // Set up Supabase Realtime channel subscription
    const channel = supabase
      .channel(`job_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const updated = payload.new as Job;
          setJob(updated);

          if (updated.print_status === 'completed' && !hasCelebrated) {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            setHasCelebrated(true);
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [jobId, hasCelebrated]);

  const handleCopyToken = () => {
    if (job?.token_number) {
      navigator.clipboard.writeText(String(job.token_number)).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        <span className="mt-3 text-[14px] text-slate-500" style={{ fontFamily: "'Inter', sans-serif" }}>
          Loading your print token...
        </span>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex flex-col items-center justify-center p-4">
        <div className="max-w-[380px] w-full bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <h2 className="text-[18px] font-bold text-[#1E293B]">Job Not Found</h2>
          <p className="text-[13px] text-slate-500 mt-1 mb-5">
            Could not find details for this print token.
          </p>
          <button
            onClick={() => router.push(`/kiosk/${shopSlug}`)}
            className="w-full h-11 rounded-xl bg-[#2563EB] text-white font-bold text-[14px]"
          >
            Start New Print
          </button>
        </div>
      </div>
    );
  }

  const isCashPending = job.payment_mode === 'cash' && job.payment_status === 'pending';
  const isQueued = job.print_status === 'queued';
  const isPrinting = job.print_status === 'printing';
  const isCompleted = job.print_status === 'completed';
  const isFailed = job.print_status === 'failed';

  const rawNum = job?.token_number != null ? Number(job.token_number) : NaN;
  const tokenDisplay = !isNaN(rawNum)
    ? (rawNum < 100 ? String(rawNum).padStart(2, '0') : String(rawNum))
    : (job?.token_number || '...');

  // Determine status UI
  type StatusVariant = 'cash' | 'queued' | 'printing' | 'done' | 'failed';
  let variant: StatusVariant = 'queued';
  let statusTitle = 'In Queue';
  let statusDesc = 'Your job is queued in the counter printer spooler.';

  if (isCashPending) {
    variant = 'cash';
    statusTitle = 'Waiting for Cash Payment';
    statusDesc = `Please hand ₹${job.price?.toFixed(2)} to the counter shopkeeper. Print releases immediately upon confirmation.`;
  } else if (isPrinting) {
    variant = 'printing';
    statusTitle = 'Printing Now...';
    statusDesc = 'The printer is actively printing your sheets right now. Please wait near the printer tray.';
  } else if (isCompleted) {
    variant = 'done';
    statusTitle = 'Ready for Collection! 🎉';
    statusDesc = 'Your document has finished printing. Please collect it from the printer tray.';
  } else if (isFailed) {
    variant = 'failed';
    statusTitle = 'Print Paused / Failed';
    statusDesc = job.failure_reason || 'Printer reported an issue (paper jam / low paper). The shopkeeper has been notified.';
  }

  // Progress percentage
  const progressPct = isCompleted ? 100 : isPrinting ? 75 : isCashPending ? 25 : isQueued ? 50 : 10;

  // Status color tokens
  const variantColors: Record<StatusVariant, { bg: string; text: string; border: string; iconBg: string }> = {
    cash:    { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A', iconBg: '#F59E0B' },
    queued:  { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE', iconBg: '#2563EB' },
    printing:{ bg: '#FFF7ED', text: '#9A3412', border: '#FDBA74', iconBg: '#F97316' },
    done:    { bg: '#F0FDF4', text: '#14532D', border: '#BBF7D0', iconBg: '#16A34A' },
    failed:  { bg: '#FEF2F2', text: '#7F1D1D', border: '#FECACA', iconBg: '#EF4444' },
  };
  const vc = variantColors[variant];

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex justify-center text-[#1E293B] antialiased">
      <div className="w-full max-w-[440px] min-h-screen bg-[#FFFFFF] relative px-4 pt-4 pb-28 flex flex-col">

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
                {shop?.name || 'Print Counter'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#DCFCE7] border border-[#22C55E]/20 rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="text-[13px] font-bold text-[#15803D] tracking-wide" style={{ fontFamily: "'Inter', sans-serif" }}>Live</span>
          </div>
        </header>

        {/* TOKEN NUMBER — Hero */}
        <div className="flex flex-col items-center text-center pt-4 pb-6">
          <span className="text-[11px] font-mono font-bold tracking-widest text-slate-500 uppercase mb-2">
            YOUR PRINT TOKEN
          </span>

          {/* Giant Token */}
          <div
            className="w-36 h-36 rounded-[28px] flex items-center justify-center shadow-lg mb-4"
            style={{ background: `linear-gradient(135deg, ${vc.iconBg}22 0%, ${vc.iconBg}44 100%)`, border: `2px solid ${vc.border}` }}
          >
            <span
              className="text-[56px] font-black font-mono leading-none"
              style={{ color: vc.text }}
            >
              #{tokenDisplay}
            </span>
          </div>

          {/* Status Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-[13px] mb-2"
            style={{ background: vc.bg, color: vc.text, border: `1px solid ${vc.border}` }}
          >
            {variant === 'printing' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {variant === 'done' && <CheckCircle2 className="w-3.5 h-3.5" />}
            {variant === 'cash' && <Clock className="w-3.5 h-3.5" />}
            {variant === 'queued' && <Printer className="w-3.5 h-3.5" />}
            {variant === 'failed' && <AlertTriangle className="w-3.5 h-3.5" />}
            <span>{statusTitle}</span>
          </div>

          <p className="text-[13px] text-slate-500 max-w-[300px] leading-relaxed">
            {statusDesc}
          </p>
        </div>

        {/* PROGRESS BAR */}
        <div className="mb-5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-mono">
            <span>{isCompleted ? 'COMPLETED' : isPrinting ? 'PRINTING...' : isCashPending ? 'AWAITING PAYMENT' : `${positionAhead} AHEAD IN QUEUE`}</span>
            <span>TRAY A-4</span>
          </div>
          <div className="w-full h-2.5 bg-[#F1F5F9] rounded-full overflow-hidden border border-[#E2E8F0]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progressPct}%`,
                background: isCompleted
                  ? '#16A34A'
                  : isPrinting
                  ? '#F97316'
                  : '#2563EB',
              }}
            />
          </div>
        </div>

        {/* JOB DETAILS CARD */}
        <section className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[16px] p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 text-[12px] font-mono">
            <div>
              <span className="text-slate-400 uppercase text-[10px] tracking-wider block">Document</span>
              <span className="font-bold text-[#1E293B] truncate block">{job.file_name || 'Document.pdf'}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase text-[10px] tracking-wider block">Amount</span>
              <span className="font-bold text-[#1E293B] block">₹{job.price?.toFixed(2)} ({job.payment_mode?.toUpperCase()})</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase text-[10px] tracking-wider block">Pages / Copies</span>
              <span className="font-bold text-[#1E293B] block">{job.pages}p · {job.copies}×</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase text-[10px] tracking-wider block">Paper / Sides</span>
              <span className="font-bold text-[#1E293B] block">
                {job.paper_size?.toUpperCase()} · {job.duplex ? '2-Sided' : '1-Sided'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 uppercase text-[10px] tracking-wider block">Color</span>
              <span className="font-bold text-[#1E293B] block">{job.color_mode === 'color' ? 'Full Color' : 'B&W'}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase text-[10px] tracking-wider block">Payment</span>
              <span className={`font-bold block ${job.payment_status === 'paid' ? 'text-[#16A34A]' : 'text-amber-600'}`}>
                {job.payment_status === 'paid' ? '✓ Paid' : '⏳ Pending'}
              </span>
            </div>
          </div>
        </section>

        {/* COPY TOKEN BUTTON */}
        <button
          type="button"
          onClick={handleCopyToken}
          className="w-full h-11 rounded-[12px] bg-white border border-[#E2E8F0] hover:border-slate-300 text-[#1E293B] font-semibold text-[14px] flex items-center justify-center gap-2 mb-3 transition-all"
          style={{ fontFamily: "'ABeeZee', sans-serif" }}
        >
          <Copy className="w-4 h-4" />
          {copied ? 'Token Number Copied!' : `Copy Token #${tokenDisplay}`}
        </button>

        {/* START NEW PRINT */}
        <button
          type="button"
          onClick={() => router.push(`/kiosk/${shopSlug}`)}
          className="w-full h-[52px] bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] transition-all rounded-[16px] text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-[0px_8px_15px_-3px_rgba(37,99,235,0.25)]"
          style={{ fontFamily: "'ABeeZee', sans-serif" }}
        >
          <span>Print Another Document</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* AUTO-REFRESH NOTE */}
        {!isCompleted && !isFailed && (
          <p className="text-center text-[11px] text-slate-400 mt-4 flex items-center justify-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Status updates automatically in real-time
          </p>
        )}
      </div>
    </div>
  );
}
