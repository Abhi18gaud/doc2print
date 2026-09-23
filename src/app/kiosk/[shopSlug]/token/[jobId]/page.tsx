'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Printer,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Copy,
  Layers,
  ArrowRight,
  Share2,
  Volume2,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { HeaderBar } from '@/components/HeaderBar';
import { TicketCard, TicketPerforation } from '@/components/TicketCard';
import { StampBadge } from '@/components/StampBadge';
import { supabase } from '@/lib/supabase/client';
import { Job } from '@/types/database';

export default function KioskLiveTokenPage() {
  const params = useParams();
  const router = useRouter();
  const shopSlug = (params?.shopSlug as string) || 'shree-ganesh-xerox';
  const jobId = params?.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [positionAhead, setPositionAhead] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasCelebrated, setHasCelebrated] = useState(false);

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
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
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
      supabase.removeChannel(channel);
    };
  }, [jobId, hasCelebrated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf7] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-[#ff5a1f] border-t-transparent rounded-full animate-spin" />
        <span className="mt-3 text-[14px] font-mono text-[#6b6966]">
          Loading print chit...
        </span>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#fafaf7] flex flex-col items-center justify-center p-4">
        <TicketCard className="max-w-md w-full p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-[#ba1a1a] mx-auto mb-2" />
          <h2 className="text-[18px] font-bold text-[#1c1b1f]">Job Not Found</h2>
          <p className="text-[13px] text-[#6b6966] mt-1 mb-4">
            Could not find details for this print token.
          </p>
          <button
            onClick={() => router.push(`/kiosk/${shopSlug}`)}
            className="w-full h-11 rounded bg-[#1c1b1f] text-white font-bold text-[14px] btn-tactile"
          >
            Start New Print
          </button>
        </TicketCard>
      </div>
    );
  }

  const isCashPending =
    job.payment_mode === 'cash' && job.payment_status === 'pending';
  const isQueued = job.print_status === 'queued';
  const isPrinting = job.print_status === 'printing';
  const isCompleted = job.print_status === 'completed';
  const isFailed = job.print_status === 'failed';

  let statusTitle = 'Print Queued';
  let statusDesc = 'Job is queued in the counter printer spooler.';
  let badgeText: any = 'QUEUED';

  if (isCashPending) {
    statusTitle = 'Waiting for Cash Confirmation';
    statusDesc = `Please hand ₹${job.price?.toFixed(2)} to the counter shopkeeper. Print releases immediately upon confirmation.`;
    badgeText = 'CASH';
  } else if (isPrinting) {
    statusTitle = 'Printing in Progress...';
    statusDesc = 'The printer is actively printing your sheets right now.';
    badgeText = 'PRINTING';
  } else if (isCompleted) {
    statusTitle = 'Ready for Collection!';
    statusDesc = 'Your document has finished printing. Pick it up from Tray A-4.';
    badgeText = 'READY';
  } else if (isFailed) {
    statusTitle = 'Printing Paused / Failed';
    statusDesc =
      job.failure_reason ||
      'Printer reported a paper jam or check tray. Shopkeeper has been notified.';
    badgeText = 'FAILED';
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] flex flex-col justify-between pb-16">
      <HeaderBar
        shopName="Shree Ganesh Xerox"
        counterInfo="Live Token Chit"
      />

      <main className="max-w-xl mx-auto w-full px-4 pt-20 flex-1 flex flex-col gap-4">
        {/* Main Queue Ticket Card */}
        <TicketCard className="overflow-visible">
          {/* Upper Stub: Token Telemetry */}
          <div className="p-6 bg-white flex flex-col items-center text-center">
            <span className="text-[11px] font-mono font-bold tracking-widest text-[#6b6966] uppercase">
              YOUR QUEUE TOKEN NUMBER
            </span>

            {/* Massive Space Mono Token */}
            <div className="text-[54px] sm:text-[64px] font-mono font-bold tracking-tight text-[#1c1b1f] my-1 leading-none">
              #{job.token_number}
            </div>

            <div className="mt-2">
              <StampBadge status={badgeText} size="lg" />
            </div>

            {/* Live Telemetry Progress */}
            <div className="w-full mt-6 pt-5 border-t border-[#f4f4f1] flex flex-col gap-2">
              <div className="flex items-center justify-between text-[12px] font-mono">
                <span className="font-bold text-[#1c1b1f]">
                  {isCompleted
                    ? 'DISPENSED'
                    : isPrinting
                    ? 'ACTIVE SPOOL'
                    : isCashPending
                    ? 'WAITING COUNTER'
                    : `${positionAhead} JOBS AHEAD`}
                </span>
                <span className="text-[#6b6966]">TRAY A-4</span>
              </div>

              {/* Segmented Progress Bar */}
              <div className="w-full h-3 rounded bg-[#f4f4f1] overflow-hidden flex border border-[#e6e5df]">
                <div
                  className={`h-full transition-all duration-500 ${
                    isCompleted
                      ? 'w-full bg-[#1b7a4d]'
                      : isPrinting
                      ? 'w-4/5 bg-[#ff5a1f] animate-pulse'
                      : isQueued
                      ? 'w-1/2 bg-[#1c1b1f]'
                      : 'w-1/4 bg-[#ff5a1f]'
                  }`}
                />
              </div>
            </div>
          </div>

          <TicketPerforation />

          {/* Lower Stub: Status Details */}
          <div className="p-5 bg-[#f4f4f1] border-t border-[#e6e5df] flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  isCompleted
                    ? 'bg-[#1b7a4d] text-white'
                    : isPrinting
                    ? 'bg-[#ff5a1f] text-white animate-spin'
                    : isCashPending
                    ? 'bg-[#1c1b1f] text-white'
                    : 'bg-[#ff5a1f] text-white'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : isPrinting ? (
                  <RefreshCw className="w-4 h-4" />
                ) : isCashPending ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
              </div>

              <div className="flex-1">
                <h4 className="text-[15px] font-bold text-[#1c1b1f]">
                  {statusTitle}
                </h4>
                <p className="text-[12px] text-[#6b6966] mt-0.5 leading-relaxed font-sans">
                  {statusDesc}
                </p>
              </div>
            </div>

            {/* Print Specification Summary */}
            <div className="p-3 rounded bg-white border border-[#e6e5df] text-[12px] font-mono grid grid-cols-2 gap-2 mt-1">
              <div>
                <span className="text-[#a8a6a1] block">DOCUMENT</span>
                <span className="font-bold text-[#1c1b1f] truncate block">
                  {job.file_name || 'Document.pdf'}
                </span>
              </div>
              <div>
                <span className="text-[#a8a6a1] block">PARAMS</span>
                <span className="font-bold text-[#1c1b1f] block">
                  {job.pages}p • {job.copies}c •{' '}
                  {job.color_mode === 'color' ? 'Color' : 'B&W'}
                </span>
              </div>
              <div>
                <span className="text-[#a8a6a1] block">PAPER / SIDES</span>
                <span className="font-bold text-[#1c1b1f] block">
                  {job.paper_size.toUpperCase()} •{' '}
                  {job.duplex ? '2-Sided' : '1-Sided'}
                </span>
              </div>
              <div>
                <span className="text-[#a8a6a1] block">AMOUNT</span>
                <span className="font-bold text-[#1c1b1f] block">
                  ₹{job.price?.toFixed(2)} ({job.payment_mode.toUpperCase()})
                </span>
              </div>
            </div>
          </div>
        </TicketCard>

        {/* Self-Service Help & New Order Action */}
        <div className="flex flex-col gap-2.5 mt-2">
          <button
            type="button"
            onClick={() => router.push(`/kiosk/${shopSlug}`)}
            className="w-full h-12 rounded bg-white hover:bg-[#f4f4f1] active:scale-[0.99] text-[#1c1b1f] border border-[#1c1b1f] font-bold text-[14px] flex items-center justify-center gap-2 shadow-xs transition-all"
          >
            <span>Print Another Document</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
}
