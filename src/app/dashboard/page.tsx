'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Printer,
  CheckCircle,
  Clock,
  Banknote,
  RotateCw,
  XCircle,
  FileText,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  QrCode,
  Terminal,
} from 'lucide-react';
import { StampBadge } from '@/components/StampBadge';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { Job } from '@/types/database';

export default function DashboardQueuePage() {
  const { shop, loading: authLoading } = useAuth();
  const shopId = shop?.id;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending_cash' | 'queued' | 'printing' | 'completed'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch jobs strictly for this shop
  const fetchJobs = async () => {
    if (!shopId) return;
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!shopId) {
      if (!authLoading) setLoading(false);
      return;
    }

    fetchJobs();

    // Subscribe strictly to changes for this shop
    const channel = supabase
      .channel(`dashboard_jobs_${shopId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `shop_id=eq.${shopId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setJobs((prev) => [payload.new as Job, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setJobs((prev) =>
              prev.map((j) => (j.id === payload.new.id ? (payload.new as Job) : j))
            );
          } else if (payload.eventType === 'DELETE') {
            setJobs((prev) => prev.filter((j) => j.id === payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, authLoading]);

  // Confirm cash handler
  const handleConfirmCash = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      const res = await fetch('/api/jobs/confirm-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert('Failed: ' + err.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  // Manual status update
  const handleUpdateStatus = async (jobId: string, status: string) => {
    setActionLoading(jobId);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          print_status: status,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', jobId);

      if (error) alert('Error updating status: ' + error.message);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter jobs
  const filteredJobs = jobs.filter((j) => {
    if (activeTab === 'pending_cash') {
      return j.payment_mode === 'cash' && j.payment_status === 'pending';
    }
    if (activeTab === 'queued') return j.print_status === 'queued';
    if (activeTab === 'printing') return j.print_status === 'printing';
    if (activeTab === 'completed') return j.print_status === 'completed';
    return true;
  });

  // Analytics tallies strictly for this shop
  const pendingCashJobs = jobs.filter(
    (j) => j.payment_mode === 'cash' && j.payment_status === 'pending'
  );
  const queuedCount = jobs.filter((j) => j.print_status === 'queued').length;
  const printingCount = jobs.filter((j) => j.print_status === 'printing').length;
  const completedCount = jobs.filter((j) => j.print_status === 'completed').length;
  const totalRevenue = jobs
    .filter((j) => j.payment_status === 'paid')
    .reduce((sum, j) => sum + (j.price || 0), 0);

  const [isPrinterOnline, setIsPrinterOnline] = useState(true);

  useEffect(() => {
    if (!shopId) return;
    supabase
      .from('printers')
      .select('status, last_seen_at')
      .eq('shop_id', shopId)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setIsPrinterOnline(data?.status === 'online');
      });
  }, [shopId]);

  if (authLoading) {
    return (
      <div className="p-12 text-center">
        <div className="w-8 h-8 border-4 border-[#ff5a1f] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <span className="text-[13px] font-mono text-[#6b6966]">
          Loading counter profile...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Agent Setup Reminder Banner if printer offline */}
      {!isPrinterOnline && shopId && (
        <div className="bg-[#1c1b1f] text-white p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-[#ff5a1f]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#ff5a1f]/20 text-[#ff5a1f] flex items-center justify-center shrink-0">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[14px] font-bold text-white block">
                Local Windows Print Agent Not Detected
              </span>
              <span className="text-[12px] font-mono text-[#a8a6a1]">
                Download and start your agent on the counter PC to enable automatic background prints.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <a
              href={`/api/agent/download?shopId=${shopId}`}
              download
              className="h-9 px-3.5 rounded bg-[#ff5a1f] hover:bg-[#e04b14] text-white text-[12px] font-bold flex items-center gap-1.5 shadow-xs"
            >
              <span>Download Agent ZIP</span>
            </a>
            <Link
              href="/dashboard/agent-setup"
              className="h-9 px-3 rounded bg-[#2f312f] hover:bg-[#3f413f] text-white text-[12px] font-mono font-bold flex items-center gap-1"
            >
              <span>Setup Guide</span>
            </Link>
          </div>
        </div>
      )}

      {/* Telemetry Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-lg border border-[#e6e5df] shadow-xs flex flex-col">
          <span className="text-[11px] font-mono uppercase text-[#6b6966] font-bold">
            QUEUED FOR PRINT
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-[28px] font-mono font-bold text-[#1c1b1f]">
              {queuedCount + printingCount}
            </span>
            <span className="text-[12px] font-mono text-[#ff5a1f] font-bold">
              {printingCount > 0 ? `${printingCount} ACTIVE` : 'IDLE'}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#e6e5df] shadow-xs flex flex-col">
          <span className="text-[11px] font-mono uppercase text-[#6b6966] font-bold">
            PENDING CASH
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-[28px] font-mono font-bold text-[#ff5a1f]">
              {pendingCashJobs.length}
            </span>
            <span className="text-[11px] font-mono text-[#6b6966]">
              Awaiting Counter
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#e6e5df] shadow-xs flex flex-col">
          <span className="text-[11px] font-mono uppercase text-[#6b6966] font-bold">
            COMPLETED TODAY
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-[28px] font-mono font-bold text-[#1b7a4d]">
              {completedCount}
            </span>
            <span className="text-[11px] font-mono text-[#1b7a4d] font-bold">
              Dispensed
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#e6e5df] shadow-xs flex flex-col">
          <span className="text-[11px] font-mono uppercase text-[#6b6966] font-bold">
            TOTAL EARNINGS
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-[28px] font-mono font-bold text-[#1c1b1f]">
              ₹{totalRevenue.toFixed(2)}
            </span>
            <span className="text-[11px] font-mono text-[#1b7a4d] flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> Live
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Realtime Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-[#e6e5df]">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'all', label: `All Jobs (${jobs.length})` },
            {
              id: 'pending_cash',
              label: `Cash Due (${pendingCashJobs.length})`,
              badge: pendingCashJobs.length > 0,
            },
            { id: 'queued', label: `Queued (${queuedCount})` },
            { id: 'printing', label: `Printing (${printingCount})` },
            { id: 'completed', label: `Done (${completedCount})` },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded text-[12px] font-mono font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#1c1b1f] text-white'
                    : 'text-[#6b6966] hover:bg-[#f4f4f1]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="w-2 h-2 rounded-full bg-[#ff5a1f] animate-ping" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 px-2 text-[11px] font-mono text-[#6b6966]">
          <span className="w-2 h-2 rounded-full bg-[#1b7a4d]" />
          <span>Shop Queue Isolated</span>
        </div>
      </div>

      {/* Job Queue Table */}
      {loading ? (
        <div className="bg-white p-12 rounded-lg border border-[#e6e5df] text-center">
          <div className="w-8 h-8 border-4 border-[#ff5a1f] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span className="text-[13px] font-mono text-[#6b6966]">
            Loading shop spooler...
          </span>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white p-12 rounded-lg border border-[#e6e5df] text-center flex flex-col items-center justify-center">
          <Printer className="w-12 h-12 text-[#dadad7] mb-3" />
          <h3 className="text-[17px] font-bold text-[#1c1b1f]">
            No Print Jobs in Queue
          </h3>
          <p className="text-[13px] text-[#6b6966] mt-1 max-w-sm font-sans">
            Your queue is currently empty. Ask customers to scan your counter QR
            code or run a test upload!
          </p>

          <div className="flex items-center gap-3 mt-5">
            <Link
              href={`/kiosk/${shop?.qr_code_slug || 'shree-ganesh-xerox'}`}
              target="_blank"
              className="h-10 px-4 rounded bg-[#1c1b1f] hover:bg-[#333] text-white text-[12px] font-bold flex items-center gap-1.5 shadow-xs"
            >
              <QrCode className="w-3.5 h-3.5 text-[#ff5a1f]" />
              <span>Test Customer Upload</span>
            </Link>

            <Link
              href="/dashboard/agent-setup"
              className="h-10 px-4 rounded bg-[#f4f4f1] hover:bg-[#e8e8e5] text-[#1c1b1f] border border-[#e6e5df] text-[12px] font-mono font-bold flex items-center gap-1.5"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Download Agent</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredJobs.map((job) => {
            const isCashPending =
              job.payment_mode === 'cash' && job.payment_status === 'pending';
            const isQueued = job.print_status === 'queued';
            const isPrinting = job.print_status === 'printing';
            const isCompleted = job.print_status === 'completed';

            let stampStatus: any = 'QUEUED';
            if (isCashPending) stampStatus = 'CASH';
            else if (isPrinting) stampStatus = 'PRINTING';
            else if (isCompleted) stampStatus = 'READY';

            return (
              <div
                key={job.id}
                className={`bg-white rounded-lg border p-4 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isCashPending
                    ? 'border-[#ff5a1f] bg-[#ff5a1f]/3'
                    : isPrinting
                    ? 'border-[#1c1b1f] ring-1 ring-[#1c1b1f]'
                    : 'border-[#e6e5df]'
                }`}
              >
                {/* Left: Token & File Telemetry */}
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-14 h-14 rounded bg-[#f4f4f1] border border-[#e6e5df] flex flex-col items-center justify-center shrink-0">
                    <span className="font-mono text-[9px] font-bold text-[#6b6966]">
                      TOKEN
                    </span>
                    <span className="font-mono text-[20px] font-bold text-[#1c1b1f] leading-none">
                      #{job.token_number}
                    </span>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[15px] text-[#1c1b1f] truncate">
                        {job.file_name || 'Document.pdf'}
                      </span>
                      <StampBadge status={stampStatus} size="sm" />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[12px] font-mono text-[#6b6966]">
                      <span className="font-bold text-[#1c1b1f]">
                        {job.pages}p × {job.copies}c = {job.pages * job.copies} prints
                      </span>
                      <span>•</span>
                      <span>{job.paper_size.toUpperCase()}</span>
                      <span>•</span>
                      <span>{job.color_mode === 'color' ? 'Color' : 'B&W'}</span>
                      <span>•</span>
                      <span>{job.duplex ? 'Duplex' : '1-Sided'}</span>
                      <span>•</span>
                      <span className="font-bold text-[#1c1b1f]">
                        ₹{job.price?.toFixed(2)} ({job.payment_mode.toUpperCase()})
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-[#a8a6a1] mt-1">
                      Created: {new Date(job.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {/* One-Tap Cash Confirmation Button */}
                  {isCashPending && (
                    <button
                      type="button"
                      disabled={actionLoading === job.id}
                      onClick={() => handleConfirmCash(job.id)}
                      className="h-11 px-4 rounded bg-[#ff5a1f] hover:bg-[#e04b14] active:scale-95 text-white text-[13px] font-bold flex items-center gap-1.5 shadow-sm btn-tactile"
                    >
                      <Banknote className="w-4 h-4" />
                      <span>Confirm Cash Received (₹{job.price?.toFixed(2)})</span>
                    </button>
                  )}

                  {/* Manual Dispatch / Complete Controls */}
                  {isQueued && (
                    <button
                      type="button"
                      disabled={actionLoading === job.id}
                      onClick={() => handleUpdateStatus(job.id, 'printing')}
                      className="h-10 px-3 rounded bg-[#1c1b1f] hover:bg-[#333] text-white text-[12px] font-mono font-bold flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#ff5a1f]" />
                      <span>Send to Spool</span>
                    </button>
                  )}

                  {isPrinting && (
                    <button
                      type="button"
                      disabled={actionLoading === job.id}
                      onClick={() => handleUpdateStatus(job.id, 'completed')}
                      className="h-10 px-3 rounded bg-[#1b7a4d] hover:bg-[#14603b] text-white text-[12px] font-mono font-bold flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Mark Done</span>
                    </button>
                  )}

                  {/* Open Downloaded PDF in new tab */}
                  {job.file_url && (
                    <a
                      href={job.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-10 h-10 rounded bg-[#f4f4f1] border border-[#e6e5df] flex items-center justify-center text-[#1c1b1f] hover:bg-[#e8e8e5]"
                      title="Inspect PDF file"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}

                  {/* Cancel / Remove */}
                  {!isCompleted && (
                    <button
                      type="button"
                      disabled={actionLoading === job.id}
                      onClick={() => handleUpdateStatus(job.id, 'failed')}
                      className="w-10 h-10 rounded bg-[#f4f4f1] border border-[#e6e5df] flex items-center justify-center text-[#ba1a1a] hover:bg-[#ffdad6]/40"
                      title="Cancel job"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
