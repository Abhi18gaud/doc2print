'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Printer,
  CheckCircle2,
  AlertCircle,
  Terminal,
  RefreshCw,
  Cpu,
  Power,
  Layers,
  Download,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { Printer as PrinterType } from '@/types/database';

export default function DashboardPrintersPage() {
  const { shop, loading: authLoading } = useAuth();
  const shopId = shop?.id;

  const [printers, setPrinters] = useState<PrinterType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrinters = async () => {
    if (!shopId) return;
    try {
      const { data } = await supabase
        .from('printers')
        .select('*')
        .eq('shop_id', shopId);

      setPrinters(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!shopId) {
      if (!authLoading) setLoading(false);
      return;
    }

    fetchPrinters();

    const channel = supabase
      .channel(`printers_${shopId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'printers',
          filter: `shop_id=eq.${shopId}`,
        },
        () => fetchPrinters()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, authLoading]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-bold text-[#1c1b1f]">
            Connected Printers & Local Print Agent
          </h2>
          <span className="text-[12px] font-mono text-[#6b6966]">
            Hardware telemetry for {shop?.name || 'Your Shop'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchPrinters}
            className="px-3 py-1.5 rounded bg-white border border-[#e6e5df] text-[12px] font-mono font-bold text-[#1c1b1f] hover:bg-[#f4f4f1] flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          {shopId && (
            <a
              href={`/api/agent/download?shopId=${shopId}`}
              download
              className="px-3.5 py-1.5 rounded bg-[#ff5a1f] hover:bg-[#e04b14] text-white text-[12px] font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Agent ZIP</span>
            </a>
          )}
        </div>
      </div>

      {/* Printer List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {printers.map((printer) => {
          const isOnline = printer.status === 'online';
          return (
            <div
              key={printer.id}
              className="bg-white rounded-lg border border-[#e6e5df] p-5 shadow-xs flex flex-col gap-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded bg-[#1c1b1f] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Printer className="w-6 h-6 text-[#ff5a1f]" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-[#1c1b1f]">
                      {printer.name}
                    </h3>
                    <span className="text-[12px] font-mono text-[#6b6966]">
                      {printer.display_name || 'Counter Main Tray'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f4f4f1] border border-[#e6e5df]">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOnline ? 'bg-[#1b7a4d] animate-pulse' : 'bg-[#ba1a1a]'
                    }`}
                  />
                  <span className="text-[10px] font-mono font-bold uppercase text-[#1c1b1f]">
                    {printer.status}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-[#fafaf7] rounded border border-[#e6e5df] grid grid-cols-2 gap-2 text-[12px] font-mono">
                <div>
                  <span className="text-[#a8a6a1] block">LAST HEARTBEAT</span>
                  <span className="font-bold text-[#1c1b1f]">
                    {printer.last_seen_at
                      ? new Date(printer.last_seen_at).toLocaleTimeString()
                      : 'Recently'}
                  </span>
                </div>
                <div>
                  <span className="text-[#a8a6a1] block">SPOOL DRIVER</span>
                  <span className="font-bold text-[#1c1b1f]">
                    Silent Windows Spooler
                  </span>
                </div>
                <div>
                  <span className="text-[#a8a6a1] block">DEFAULT TRAY</span>
                  <span className="font-bold text-[#1c1b1f]">Tray A-4 (75 GSM)</span>
                </div>
                <div>
                  <span className="text-[#a8a6a1] block">DISPATCH SPEED</span>
                  <span className="font-bold text-[#1b7a4d]">&lt; 1.5 seconds</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Local Print Agent Guide Box */}
      <div className="bg-white rounded-lg border border-[#e6e5df] p-6 shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[#ff5a1f]" />
            <h3 className="text-[16px] font-bold text-[#1c1b1f]">
              Local Print Agent Service
            </h3>
          </div>
          <Link
            href="/dashboard/agent-setup"
            className="text-[12px] font-bold text-[#ff5a1f] hover:underline flex items-center gap-1"
          >
            <span>Open Setup Guide</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <p className="text-[13px] text-[#6b6966] leading-relaxed">
          The Local Print Agent runs on this PC in the background. It listens to
          Supabase Realtime for newly queued jobs, downloads files directly to the
          Windows print spooler, and prints automatically without any browser print
          dialog prompts.
        </p>

        {shopId && (
          <div className="flex items-center gap-3 mt-2">
            <a
              href={`/api/agent/download?shopId=${shopId}`}
              download
              className="h-10 px-4 rounded bg-[#1c1b1f] hover:bg-[#333] text-white text-[12px] font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-4 h-4 text-[#ff5a1f]" />
              <span>Download Pre-Configured Agent (.ZIP)</span>
            </a>

            <Link
              href="/dashboard/agent-setup"
              className="h-10 px-4 rounded bg-[#f4f4f1] hover:bg-[#e8e8e5] text-[#1c1b1f] border border-[#e6e5df] text-[12px] font-mono font-bold flex items-center gap-1.5"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>View Instructions</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
