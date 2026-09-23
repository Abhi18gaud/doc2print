'use client';

import React from 'react';
import Link from 'next/link';
import {
  Printer,
  QrCode,
  Zap,
  ShieldCheck,
  Smartphone,
  Tv,
  Store,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Download,
  Laptop,
  Layers,
  Cpu,
  Check,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col justify-between selection:bg-[#2563EB] selection:text-white font-sans">
      {/* Top Navigation */}
      <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-50 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-extrabold text-sm shadow-sm">
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
          </div>

          <div className="hidden md:flex items-center gap-6 text-[13px] font-semibold text-[#475569]">
            <Link href="/how-it-works" className="hover:text-[#2563EB] transition-colors">
              How It Works
            </Link>
            <Link href="/features" className="hover:text-[#2563EB] transition-colors">
              Features
            </Link>
            <Link href="/docs" className="hover:text-[#2563EB] transition-colors">
              Docs & TV Setup
            </Link>
            <Link href="/kiosk/counter" className="hover:text-[#2563EB] transition-colors">
              Try Customer Kiosk
            </Link>
            <Link href="/tv/counter" className="hover:text-[#2563EB] transition-colors">
              Live TV Board
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/download"
              className="h-10 px-4 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-95 text-white text-[13px] font-bold flex items-center gap-2 shadow-xs transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download Desktop OS</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 pb-16 flex-1 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#CBD5E1] shadow-xs mb-6">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F172A]">
            Windows Desktop Software For Print & Xerox Counters
          </span>
        </div>

        <h1 className="text-[38px] sm:text-[56px] font-black tracking-tight text-[#0F172A] max-w-3xl leading-[1.12]">
          The Smarter Way To Run Your Xerox & Print Counter
        </h1>

        <p className="mt-5 text-[17px] sm:text-[19px] text-[#475569] max-w-2xl leading-relaxed">
          No WhatsApp viruses. No pendrive chaos. Walk-in customers scan your counter QR,
          select B&W/Color and copies, pay via UPI, and documents print automatically on your
          Windows printer in seconds.
        </p>

        {/* CTA Group */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/download"
            className="h-13 px-8 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[15px] font-bold flex items-center gap-3 shadow-md transition-all active:scale-95"
          >
            <Download className="w-5 h-5" />
            <span>Download for Windows (64-bit .exe)</span>
          </Link>
          <Link
            href="/kiosk/counter"
            className="h-13 px-6 rounded-lg bg-white border border-[#CBD5E1] hover:border-[#94A3B8] text-[#0F172A] text-[14px] font-bold flex items-center gap-2 shadow-xs transition-all"
          >
            <Smartphone className="w-4 h-4 text-[#2563EB]" />
            <span>Test Customer Scan Kiosk</span>
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-6 text-[12px] text-[#64748B] font-medium">
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-[#10B981]" /> Windows 10 & 11 Certified
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-[#10B981]" /> Works with Any Existing Printer
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-[#10B981]" /> 100% Free Setup
          </span>
        </div>

        {/* SOFTWARE PREVIEW MOCKUP */}
        <div className="w-full mt-12 bg-white rounded-xl border border-[#CBD5E1] shadow-lg overflow-hidden text-left">
          <div className="bg-[#F1F5F9] border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#CBD5E1]" />
              <div className="w-3 h-3 rounded-full bg-[#CBD5E1]" />
              <div className="w-3 h-3 rounded-full bg-[#CBD5E1]" />
              <span className="text-[12px] font-bold text-[#475569] ml-2">QuickPrint Counter OS — Industrial White Terminal</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#059669] bg-[#ECFDF5] px-2.5 py-1 rounded-full border border-[#A7F3D0]">
              <span className="w-2 h-2 rounded-full bg-[#059669]" />
              <span>Live Spooler Ready</span>
            </div>
          </div>

          <div className="p-6 bg-[#F8FAFC] grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
              <span className="text-[11px] font-bold uppercase text-[#64748B]">Today's Revenue</span>
              <div className="text-[24px] font-extrabold text-[#0F172A] mt-1">₹1,840.00</div>
              <span className="text-[11px] text-[#059669] font-bold">+14% vs yesterday</span>
            </div>
            <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
              <span className="text-[11px] font-bold uppercase text-[#64748B]">Queue Waiting</span>
              <div className="text-[24px] font-extrabold text-[#0F172A] mt-1">3 Orders</div>
              <span className="text-[11px] text-[#D97706] font-semibold">24 pages pending</span>
            </div>
            <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
              <span className="text-[11px] font-bold uppercase text-[#64748B]">Pages Printed</span>
              <div className="text-[24px] font-extrabold text-[#0F172A] mt-1">412 Sheets</div>
              <span className="text-[11px] text-[#64748B]">HP LaserJet Pro M404</span>
            </div>
            <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
              <span className="text-[11px] font-bold uppercase text-[#64748B]">Spooler Mode</span>
              <div className="text-[24px] font-extrabold text-[#2563EB] mt-1">AUTO-PRINT</div>
              <span className="text-[11px] text-[#059669] font-bold">Instant Spool Active</span>
            </div>
          </div>
        </div>

        {/* 4-STEP PRODUCT ARCHITECTURE */}
        <div className="w-full mt-20 text-left">
          <div className="text-center mb-12">
            <h2 className="text-[28px] sm:text-[34px] font-extrabold text-[#0F172A]">
              How QuickPrint Works In Your Shop
            </h2>
            <p className="text-[15px] text-[#64748B] mt-2">
              A seamless automated bridge between walk-in customer phones and your counter printer.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#2563EB] font-black flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="font-bold text-[16px] text-[#0F172A]">Scan Counter QR</h3>
              <p className="text-[13px] text-[#64748B] mt-2">
                Customer scans your counter QR standee with their phone camera. No mobile app download required.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#2563EB] font-black flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="font-bold text-[16px] text-[#0F172A]">Upload & Customize</h3>
              <p className="text-[13px] text-[#64748B] mt-2">
                Customer picks their PDF or photos, selects Black & White or Color, number of copies, and single or double-sided.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#2563EB] font-black flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="font-bold text-[16px] text-[#0F172A]">Instant UPI Payment</h3>
              <p className="text-[13px] text-[#64748B] mt-2">
                Exact rupee amount is calculated according to your custom rate card and paid via Google Pay, PhonePe, or Paytm.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-[#ECFDF5] text-[#059669] font-black flex items-center justify-center mb-4">
                4
              </div>
              <h3 className="font-bold text-[16px] text-[#0F172A]">Silent Auto-Print</h3>
              <p className="text-[13px] text-[#64748B] mt-2">
                QuickPrint Desktop Counter OS receives the job in real-time and spools it directly to your physical printer tray.
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM DOWNLOAD BANNER */}
        <div className="w-full mt-20 bg-[#0F172A] text-white p-10 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-8 text-left">
          <div>
            <h2 className="text-[26px] font-black">Ready to Upgrade Your Print Counter?</h2>
            <p className="text-[#94A3B8] text-[14px] mt-2 max-w-xl">
              Download QuickPrint Counter OS today. Install once on your counter PC, log in, and
              start serving customers with zero waiting queues.
            </p>
          </div>
          <Link
            href="/download"
            className="h-12 px-6 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-[14px] flex items-center gap-2 shrink-0 shadow-md transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Download Software (.exe)</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-[#64748B]">
          <p>© 2026 QuickPrint Technologies. Built for print & Xerox shops.</p>
          <div className="flex items-center gap-6 font-semibold">
            <Link href="/terms" className="hover:text-[#0F172A]">Terms & EULA</Link>
            <Link href="/privacy" className="hover:text-[#0F172A]">Privacy Policy</Link>
            <Link href="/refund" className="hover:text-[#0F172A]">Refund Policy</Link>
            <Link href="/download" className="hover:text-[#0F172A]">Download OS</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
