import React from 'react';
import Link from 'next/link';
import { Download, Laptop, Zap, Shield, Smartphone, Tv, Printer, Layers, Clock, TrendingUp } from 'lucide-react';

export default function FeaturesPage() {
  const features = [
    {
      icon: <Laptop className="w-6 h-6 text-[#2563EB]" />,
      title: 'Native Windows Counter OS',
      desc: 'No web browser required. Runs as a high-performance Windows desktop application installed into your OS with tray minimization.',
    },
    {
      icon: <Printer className="w-6 h-6 text-[#2563EB]" />,
      title: 'Silent Hardware Spooler',
      desc: 'Communicates directly with Windows Print Spooler. Automatically prints customer documents without manual file opening or formatting.',
    },
    {
      icon: <Smartphone className="w-6 h-6 text-[#2563EB]" />,
      title: 'Browser-based Customer Kiosk',
      desc: 'Customers scan your counter QR standee with their phone. No mobile app download or phone number registration needed.',
    },
    {
      icon: <Zap className="w-6 h-6 text-[#2563EB]" />,
      title: 'Auto-Print & Manual Modes',
      desc: 'Choose whether paid documents print instantly or wait for single-click shopkeeper approval with keyboard shortcuts (Enter key).',
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-[#2563EB]" />,
      title: 'Daily Financials & Paper Counters',
      desc: 'Real-time counters for daily UPI settlements, cash collections, and total physical A4 sheets consumed across black/white & color.',
    },
    {
      icon: <Tv className="w-6 h-6 text-[#2563EB]" />,
      title: 'Customer TV Token Display',
      desc: 'Connect an HDMI monitor or Smart TV to show token pickup numbers (#A-101, #A-102) so customers know when their job is printed.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans flex flex-col justify-between">
      <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-extrabold text-sm">
              QP
            </div>
            <span className="font-extrabold text-[18px] text-[#0F172A]">QuickPrint</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[13px] font-semibold text-[#64748B] hover:text-[#0F172A]">Home</Link>
            <Link href="/download" className="h-9 px-4 rounded-md bg-[#2563EB] text-white text-[13px] font-bold flex items-center gap-1.5 shadow-xs">
              <Download className="w-4 h-4" /> Download OS
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-20 flex-1 flex flex-col gap-12">
        <div className="text-center">
          <h1 className="text-[34px] sm:text-[44px] font-black tracking-tight text-[#0F172A]">
            Engineered For High-Volume Print Shops
          </h1>
          <p className="text-[16px] text-[#64748B] mt-2 max-w-xl mx-auto">
            Everything you need to automate counter operations, eliminate file transfer delays, and maximize daily revenue.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feat, idx) => (
            <div key={idx} className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                {feat.icon}
              </div>
              <h3 className="font-bold text-[17px] text-[#0F172A]">{feat.title}</h3>
              <p className="text-[13px] text-[#64748B] leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center pt-6">
          <Link href="/download" className="inline-flex items-center gap-2 h-12 px-8 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-[14px] shadow-md transition-all">
            <Download className="w-5 h-5" /> Download Counter OS (.exe)
          </Link>
        </div>
      </main>

      <footer className="border-t border-[#E2E8F0] bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between text-[12px] text-[#64748B]">
          <p>© 2026 QuickPrint Technologies.</p>
          <div className="flex gap-4 font-semibold">
            <Link href="/terms" className="hover:text-[#0F172A]">Terms</Link>
            <Link href="/privacy" className="hover:text-[#0F172A]">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
