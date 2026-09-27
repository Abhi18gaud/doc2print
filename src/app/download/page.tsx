'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Download,
  Laptop,
  CheckCircle2,
  Printer,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Cpu,
  Layers,
  HelpCircle,
} from 'lucide-react';

export default function DownloadPage() {
  const [downloading, setDownloading] = useState(false);
  const [releaseInfo, setReleaseInfo] = useState<{
    version: string;
    tagName: string;
    downloadUrl: string;
    releaseDate?: string;
    notes?: string;
    assets?: {
      installer?: { name: string; url: string; size: number } | null;
      portable?: { name: string; url: string; size: number } | null;
      mac?: { name: string; url: string } | null;
      linux?: { name: string; url: string } | null;
    } | null;
  }>({
    version: '2.4.2',
    tagName: 'v2.4.2',
    downloadUrl: '/api/software/download?file=QuickPrint-Counter-OS-Setup.exe',
  });

  React.useEffect(() => {
    fetch('/api/releases/latest')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.version) {
          setReleaseInfo(data);
        }
      })
      .catch((err) => console.warn('Could not load latest release metadata:', err));
  }, []);

  const triggerDownload = (type: 'installer' | 'portable' | string = 'installer') => {
    setDownloading(true);
    let targetUrl = '';
    if (type === 'installer') {
      targetUrl = releaseInfo.assets?.installer?.url || releaseInfo.downloadUrl || '/api/software/download?file=setup';
    } else if (type === 'portable') {
      targetUrl = releaseInfo.assets?.portable?.url || '/api/software/download?file=portable';
    } else {
      targetUrl = `/api/software/download?file=${encodeURIComponent(type)}`;
    }
    window.location.href = targetUrl;
    setTimeout(() => setDownloading(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans flex flex-col justify-between">
      {/* Nav */}
      <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-extrabold text-sm">
              QP
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[19px] tracking-tight text-[#0F172A]">
                QuickPrint
              </span>
              <span className="text-[11px] font-semibold text-[#64748B] tracking-wide ml-1 px-2 py-0.5 rounded bg-[#F1F5F9] border border-[#E2E8F0]">
                COUNTER OS
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4 text-[13px] font-semibold text-[#475569]">
            <Link href="/how-it-works" className="hover:text-[#2563EB]">
              How It Works
            </Link>
            <Link href="/kiosk/counter" className="hover:text-[#2563EB]">
              Customer Kiosk
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-20 flex-1 flex flex-col gap-10">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] text-[12px] font-bold uppercase mb-4">
            <span>OFFICIAL DESKTOP RELEASE v{releaseInfo.version}</span>
          </div>
          <h1 className="text-[32px] sm:text-[44px] font-black text-[#0F172A] tracking-tight">
            Download QuickPrint Counter OS
          </h1>
          <p className="text-[16px] text-[#64748B] max-w-xl mx-auto mt-2">
            The complete operational software for print & Xerox shop counters. Direct Windows print
            spooler integration, persistent login, and live customer queue.
          </p>
        </div>

        {/* PRIMARY WINDOWS SETUP DOWNLOAD CARD */}
        <div className="bg-white border-2 border-[#2563EB] rounded-2xl p-8 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
              <Laptop className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[20px] font-extrabold text-[#0F172A]">
                  QuickPrint Setup Installer (.exe)
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#059669] text-white">
                  RECOMMENDED
                </span>
              </div>
              <p className="text-[13px] text-[#64748B] mt-1">
                Standard Windows Setup Wizard • 64-bit Windows 10 / 11 • Version {releaseInfo.version} (91 MB)
                {releaseInfo.releaseDate && (
                  <span> • Released {new Date(releaseInfo.releaseDate).toLocaleDateString()}</span>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#059669] font-semibold mt-3">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Creates Desktop & Start Menu Shortcuts
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Built-in Automatic Safe Updater
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Appears in Windows Installed Apps
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => triggerDownload('installer')}
            className="w-full md:w-auto h-13 px-8 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-95 text-white font-bold text-[14px] flex items-center justify-center gap-2.5 shadow-md transition-all shrink-0 cursor-pointer"
          >
            <Download className="w-5 h-5" />
            <span>{downloading ? 'Starting Download...' : `Download Setup Installer (.exe)`}</span>
          </button>
        </div>

        {/* OTHER EDITIONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex items-center justify-between shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[15px] text-[#0F172A]">Portable Edition (.exe)</h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                  STANDALONE
                </span>
              </div>
              <p className="text-[12px] text-[#64748B] mt-1">
                Zero-install single file (90 MB). Runs instantly from pen drive or folder.
              </p>
            </div>
            <button
              onClick={() => triggerDownload('portable')}
              className="h-9 px-4 rounded-md border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[13px] font-bold text-[#0F172A] flex items-center gap-1.5 shrink-0 ml-4 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download (.exe)</span>
            </button>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex items-center justify-between shadow-xs">
            <div>
              <h3 className="font-bold text-[15px] text-[#0F172A]">macOS & Linux</h3>
              <p className="text-[12px] text-[#64748B] mt-1">Apple Silicon DMG & Linux AppImage</p>
            </div>
            <button
              onClick={() => triggerDownload('QuickPrint-macOS-arm64.dmg')}
              className="h-9 px-4 rounded-md border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[13px] font-bold text-[#0F172A] flex items-center gap-1.5 shrink-0 ml-4 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* 4-STEP INSTALLATION GUIDE */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-xs">
          <h2 className="text-[18px] font-extrabold text-[#0F172A] mb-6">
            Quick Installation & Setup Guide (2 Minutes)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <div>
              <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white font-black text-[13px] flex items-center justify-center mb-3">
                1
              </div>
              <h4 className="font-bold text-[14px] text-[#0F172A]">Run Installer</h4>
              <p className="text-[12px] text-[#64748B] mt-1">
                Open <code className="font-mono text-[#0F172A]">QuickPrint-Counter-OS-Setup.exe</code> and complete the standard Windows setup wizard.
              </p>
            </div>

            <div>
              <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white font-black text-[13px] flex items-center justify-center mb-3">
                2
              </div>
              <h4 className="font-bold text-[14px] text-[#0F172A]">Launch & Sign In</h4>
              <p className="text-[12px] text-[#64748B] mt-1">
                Launch from your Desktop or Start Menu. Sign in or register your shop. Your session is permanently saved.
              </p>
            </div>

            <div>
              <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white font-black text-[13px] flex items-center justify-center mb-3">
                3
              </div>
              <h4 className="font-bold text-[14px] text-[#0F172A]">Select Printer</h4>
              <p className="text-[12px] text-[#64748B] mt-1">
                Counter OS auto-detects your installed Windows printers. Pick your default laser or inkjet printer.
              </p>
            </div>

            <div>
              <div className="w-8 h-8 rounded-full bg-[#059669] text-white font-black text-[13px] flex items-center justify-center mb-3">
                4
              </div>
              <h4 className="font-bold text-[14px] text-[#0F172A]">Display QR Standee</h4>
              <p className="text-[12px] text-[#64748B] mt-1">
                Click <strong>Show Counter QR</strong> in the software titlebar to display or print your customer scan card.
              </p>
            </div>
          </div>
        </div>

        {/* SYSTEM REQUIREMENTS */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
          <h3 className="font-bold text-[15px] text-[#0F172A] mb-4">Hardware & System Requirements</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[13px]">
            <div>
              <span className="text-[#64748B] block text-[11px] font-semibold uppercase">Operating System</span>
              <span className="font-bold text-[#0F172A]">Windows 10 / 11 (64-bit)</span>
            </div>
            <div>
              <span className="text-[#64748B] block text-[11px] font-semibold uppercase">Memory (RAM)</span>
              <span className="font-bold text-[#0F172A]">4 GB or higher</span>
            </div>
            <div>
              <span className="text-[#64748B] block text-[11px] font-semibold uppercase">Disk Space</span>
              <span className="font-bold text-[#0F172A]">250 MB free space</span>
            </div>
            <div>
              <span className="text-[#64748B] block text-[11px] font-semibold uppercase">Printers Supported</span>
              <span className="font-bold text-[#0F172A]">HP, Canon, Epson, Brother, Ricoh</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between text-[12px] text-[#64748B]">
          <p>© 2026 QuickPrint Technologies. All rights reserved.</p>
          <div className="flex gap-4 font-semibold">
            <Link href="/terms" className="hover:text-[#0F172A]">Terms</Link>
            <Link href="/privacy" className="hover:text-[#0F172A]">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
