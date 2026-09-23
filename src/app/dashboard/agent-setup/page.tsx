'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Download,
  Terminal,
  Cpu,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Laptop,
  Printer,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { TicketCard, TicketPerforation } from '@/components/TicketCard';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { Printer as PrinterType } from '@/types/database';

export default function AgentSetupGuidePage() {
  const { shop, loading: authLoading } = useAuth();
  const [printers, setPrinters] = useState<PrinterType[]>([]);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const shopId = shop?.id || '';

  const checkPrinterStatus = async () => {
    if (!shopId) return;
    setCheckingStatus(true);
    try {
      const { data } = await supabase
        .from('printers')
        .select('*')
        .eq('shop_id', shopId);

      setPrinters(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    if (shopId) {
      checkPrinterStatus();

      const channel = supabase
        .channel(`agent_setup_printers_${shopId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'printers',
            filter: `shop_id=eq.${shopId}`,
          },
          () => checkPrinterStatus()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [shopId]);

  const activePrinter = printers.find((p) => p.status === 'online') || printers[0];
  const isAgentActive = activePrinter?.status === 'online';

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e6e5df] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-bold text-[#1c1b1f]">
              Local Windows Print Agent Setup Guide
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#e8e8e5] text-[#1c1b1f]">
              OFFICIAL SERVICE
            </span>
          </div>
          <p className="text-[13px] text-[#6b6966] mt-1 font-sans">
            Connect your counter PC and physical printer to your shop&apos;s cloud queue
            for automatic, 1-second background printing.
          </p>
        </div>

        {shopId && (
          <a
            href={`/api/agent/download?shopId=${shopId}`}
            download
            className="h-11 px-5 rounded bg-[#ff5a1f] hover:bg-[#e04b14] active:scale-95 text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-sm transition-all btn-tactile shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Download Agent (.ZIP)</span>
          </a>
        )}
      </div>

      {/* Live Agent Status Telemetry Card */}
      <TicketCard>
        <div className="p-5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                isAgentActive
                  ? 'bg-[#e6f7ee] text-[#1b7a4d]'
                  : 'bg-[#f4f4f1] text-[#6b6966]'
              }`}
            >
              <Cpu className="w-6 h-6" />
            </div>

            <div>
              <span className="text-[11px] font-mono font-bold uppercase text-[#6b6966] block">
                HARDWARE AGENT CONNECTION STATUS
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isAgentActive ? 'bg-[#1b7a4d] animate-pulse' : 'bg-[#ba1a1a]'
                  }`}
                />
                <span className="text-[16px] font-bold text-[#1c1b1f]">
                  {isAgentActive
                    ? 'Agent Connected & Spooler Ready'
                    : 'Agent Offline (Waiting for Launch)'}
                </span>
              </div>
              <span className="text-[12px] font-mono text-[#6b6966] mt-0.5 block">
                Shop: {shop?.name || 'Your Shop'} • ID: {shopId ? shopId.slice(0, 8) + '...' : 'Loading'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={checkPrinterStatus}
            disabled={checkingStatus}
            className="px-3 py-1.5 rounded bg-[#f4f4f1] border border-[#e6e5df] text-[12px] font-mono font-bold text-[#1c1b1f] hover:bg-[#e8e8e5] flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingStatus ? 'animate-spin' : ''}`} />
            <span>Check Telemetry</span>
          </button>
        </div>
      </TicketCard>

      {/* 4 Critical Questions: When, Where, How, and Why */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Q1: When to download */}
        <div className="bg-white p-5 rounded-lg border border-[#e6e5df] shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded bg-[#ff5a1f]/15 text-[#ff5a1f] flex items-center justify-center font-bold text-[13px]">
              🕒
            </div>
            <h3 className="font-bold text-[15px] text-[#1c1b1f]">
              When Should You Download?
            </h3>
          </div>
          <p className="text-[13px] text-[#4a4845] leading-relaxed">
            Download this agent on your <strong>Shop Counter Windows PC</strong> that is physically connected to your printer via USB cable or local Wi-Fi/LAN. You only need to set it up <strong>once</strong>.
          </p>
          <div className="mt-3 p-2.5 bg-[#fafaf7] rounded border border-[#e8e8e5] text-[12px] text-[#6b6966]">
            💡 <em>Run this on the specific computer connected to your counter printer.</em>
          </div>
        </div>

        {/* Q2: Where to download */}
        <div className="bg-white p-5 rounded-lg border border-[#e6e5df] shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded bg-[#1b7a4d]/15 text-[#1b7a4d] flex items-center justify-center font-bold text-[13px]">
              📍
            </div>
            <h3 className="font-bold text-[15px] text-[#1c1b1f]">
              Where to Download From?
            </h3>
          </div>
          <p className="text-[13px] text-[#4a4845] leading-relaxed">
            Right here! Click the orange <strong>&quot;Download Agent (.ZIP)&quot;</strong> button above or below. Your shop ID (<code className="bg-[#f4f4f1] px-1 py-0.5 rounded font-mono text-[11px] text-[#1c1b1f]">{shopId ? shopId.slice(0, 8) + '...' : 'auto'}</code>) and cloud keys are <strong>pre-configured</strong> in the package.
          </p>
          <div className="mt-3 p-2.5 bg-[#fafaf7] rounded border border-[#e8e8e5] text-[12px] text-[#6b6966]">
            💡 <em>No code changes required. The configuration is pre-filled for your shop.</em>
          </div>
        </div>

        {/* Q3: Prerequisites */}
        <div className="bg-white p-5 rounded-lg border border-[#e6e5df] shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded bg-[#1c1b1f] text-white flex items-center justify-center font-bold text-[13px]">
              ⚙️
            </div>
            <h3 className="font-bold text-[15px] text-[#1c1b1f]">
              Prerequisite: Node.js
            </h3>
          </div>
          <p className="text-[13px] text-[#4a4845] leading-relaxed">
            Your counter PC must have <strong>Node.js (LTS version)</strong> installed so the background agent can run. If you don&apos;t have it yet, install it once in 2 minutes.
          </p>
          <div className="mt-3 flex items-center justify-between p-2.5 bg-[#fafaf7] rounded border border-[#e8e8e5]">
            <span className="text-[12px] font-mono text-[#1c1b1f] font-bold">Node.js Official Installer</span>
            <a
              href="https://nodejs.org"
              target="_blank"
              rel="noreferrer"
              className="text-[12px] font-bold text-[#ff5a1f] hover:underline"
            >
              Download nodejs.org →
            </a>
          </div>
        </div>

        {/* Q4: What happens after running */}
        <div className="bg-white p-5 rounded-lg border border-[#e6e5df] shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded bg-[#1b7a4d]/15 text-[#1b7a4d] flex items-center justify-center font-bold text-[13px]">
              🚀
            </div>
            <h3 className="font-bold text-[15px] text-[#1c1b1f]">
              What Happens After Launch?
            </h3>
          </div>
          <p className="text-[13px] text-[#4a4845] leading-relaxed">
            When a customer scans your counter QR code and uploads a PDF or photo, the file is transferred directly to your Windows print spooler in <strong>under 1.5 seconds</strong> without any manual clicks!
          </p>
          <div className="mt-3 p-2.5 bg-[#fafaf7] rounded border border-[#e8e8e5] text-[12px] text-[#6b6966]">
            💡 <em>No more manual file downloading or clicking print dialogs over and over.</em>
          </div>
        </div>
      </div>

      {/* 4-Step Quick Install Guide */}
      <div className="flex flex-col gap-4">
        <h2 className="text-[18px] font-bold text-[#1c1b1f]">
          Step-by-Step Setup in 3 Minutes
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1 */}
          <div className="bg-white p-5 rounded-lg border border-[#e6e5df] shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-full bg-[#1c1b1f] text-white flex items-center justify-center font-mono font-bold text-[13px] mb-3">
                1
              </div>
              <h3 className="text-[15px] font-bold text-[#1c1b1f]">
                Download Pre-Configured ZIP
              </h3>
              <p className="text-[12px] text-[#6b6966] mt-1.5 leading-relaxed font-sans">
                Click the download button. We automatically inject your shop&apos;s
                unique ID into the configuration file.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#f4f4f1]">
              {shopId && (
                <a
                  href={`/api/agent/download?shopId=${shopId}`}
                  download
                  className="w-full py-2 px-3 rounded bg-[#f4f4f1] hover:bg-[#e8e8e5] text-[12px] font-bold text-[#1c1b1f] border border-[#e6e5df] flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-[#ff5a1f]" />
                  <span>Download (.ZIP)</span>
                </a>
              )}
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-5 rounded-lg border border-[#e6e5df] shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-full bg-[#1c1b1f] text-white flex items-center justify-center font-mono font-bold text-[13px] mb-3">
                2
              </div>
              <h3 className="text-[15px] font-bold text-[#1c1b1f]">
                Extract on Counter PC
              </h3>
              <p className="text-[12px] text-[#6b6966] mt-1.5 leading-relaxed font-sans">
                Right-click the downloaded ZIP file and click <strong>Extract All</strong>{' '}
                to any folder (such as your Desktop or <code className="bg-[#f4f4f1] px-1 rounded font-mono">C:\quickprint-agent</code>).
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#f4f4f1] text-[11px] font-mono text-[#6b6966]">
              Right Click → Extract All
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-5 rounded-lg border border-[#e6e5df] shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-full bg-[#ff5a1f] text-white flex items-center justify-center font-mono font-bold text-[13px] mb-3">
                3
              </div>
              <h3 className="text-[15px] font-bold text-[#1c1b1f]">
                Double Click start-agent.bat
              </h3>
              <p className="text-[12px] text-[#6b6966] mt-1.5 leading-relaxed font-sans">
                Double click <strong>start-agent.bat</strong>. It automatically connects to your cloud queue and starts printing incoming jobs immediately!
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#f4f4f1] text-[11px] font-mono text-[#1b7a4d] font-bold">
              ✓ Ready in seconds!
            </div>
          </div>
        </div>
      </div>

      {/* Windows Startup Trick (Bonus Pro-Tip) */}
      <div className="bg-white rounded-lg border border-[#e6e5df] p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#ff5a1f]" />
          <h3 className="text-[16px] font-bold text-[#1c1b1f]">
            Pro Tip: Auto-Start on Windows Startup
          </h3>
        </div>
        <p className="text-[13px] text-[#6b6966] mt-1.5 leading-relaxed">
          To ensure the print agent automatically starts whenever you turn on your shop computer in the morning:
        </p>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px]">
          <div className="p-3 bg-[#f4f4f1] rounded border border-[#e6e5df]">
            <span className="font-bold text-[#1c1b1f] block mb-1">1. Open Startup Folder</span>
            <span className="text-[#6b6966]">Press <kbd className="bg-white px-1.5 py-0.5 border rounded font-mono text-[11px]">Win + R</kbd>, type <code className="font-mono text-[#ff5a1f] font-bold">shell:startup</code> and press Enter.</span>
          </div>
          <div className="p-3 bg-[#f4f4f1] rounded border border-[#e6e5df]">
            <span className="font-bold text-[#1c1b1f] block mb-1">2. Create Shortcut</span>
            <span className="text-[#6b6966]">Right-click <code className="font-mono text-[#1c1b1f] font-bold">start-agent.bat</code> and select <strong>Create Shortcut</strong>.</span>
          </div>
          <div className="p-3 bg-[#f4f4f1] rounded border border-[#e6e5df]">
            <span className="font-bold text-[#1c1b1f] block mb-1">3. Paste into Folder</span>
            <span className="text-[#6b6966]">Move that shortcut into the Startup folder. Every morning the agent will boot automatically.</span>
          </div>
        </div>
      </div>

      {/* Detailed Technical Explanation & FAQs */}
      <div className="bg-white rounded-lg border border-[#e6e5df] p-6 shadow-xs flex flex-col gap-6">
        <h2 className="text-[18px] font-bold text-[#1c1b1f]">
          Frequently Asked Questions & Hardware Details
        </h2>

        <div className="space-y-4 text-[13px] text-[#1c1b1f]">
          <div className="p-4 bg-[#f4f4f1] rounded-lg border border-[#e6e5df]">
            <h4 className="font-bold flex items-center gap-2 text-[#1c1b1f]">
              <HelpCircle className="w-4 h-4 text-[#ff5a1f]" />
              Why do I need a Local Print Agent?
            </h4>
            <p className="text-[#6b6966] mt-1 leading-relaxed">
              Standard web browsers (Chrome, Edge) are restricted by security
              sandboxes and cannot talk directly to your physical printer hardware
              without opening a print dialog and requiring you to manually click
              &quot;Print&quot; every single time. QuickPrint&apos;s Local Agent solves this: it
              runs as a light background service, downloads the customer&apos;s file from
              cloud storage, and feeds it directly to the Windows Spooler silently.
            </p>
          </div>

          <div className="p-4 bg-[#f4f4f1] rounded-lg border border-[#e6e5df]">
            <h4 className="font-bold flex items-center gap-2 text-[#1c1b1f]">
              <Printer className="w-4 h-4 text-[#ff5a1f]" />
              Which printer models are supported?
            </h4>
            <p className="text-[#6b6966] mt-1 leading-relaxed">
              Any printer installed on your Windows PC is supported! This includes:
              HP LaserJet, Canon imageCLASS / Pixma, Epson EcoTank / L-Series, Brother
              DCP, and commercial Ricoh / Konica Minolta multifunction Xerox machines.
              Make sure your preferred printer is set as the <strong>Default Printer</strong> in
              Windows Settings.
            </p>
          </div>

          <div className="p-4 bg-[#f4f4f1] rounded-lg border border-[#e6e5df]">
            <h4 className="font-bold flex items-center gap-2 text-[#1c1b1f]">
              <ShieldCheck className="w-4 h-4 text-[#1b7a4d]" />
              Are customer files kept permanently on my PC?
            </h4>
            <p className="text-[#6b6966] mt-1 leading-relaxed">
              No. For total privacy and customer trust, the local print agent
              automatically deletes the temporary buffer file immediately after the
              physical print completes. No customer Aadhaar cards, resumes, or
              documents remain stored on your PC hard drive.
            </p>
          </div>

          <div className="p-4 bg-[#f4f4f1] rounded-lg border border-[#e6e5df]">
            <h4 className="font-bold flex items-center gap-2 text-[#1c1b1f]">
              <Terminal className="w-4 h-4 text-[#1c1b1f]" />
              What if I need to run it from the Command Line?
            </h4>
            <div className="p-3 bg-[#1c1b1f] text-white rounded font-mono text-[12px] space-y-1 mt-2">
              <p className="text-[#a8a6a1]"># Open folder and start manually:</p>
              <p className="text-[#ff5a1f]">cd quickprint-agent</p>
              <p className="text-[#9cf5be]">npm install</p>
              <p className="text-[#9cf5be]">node index.js</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
