import React from 'react';
import Link from 'next/link';
import {
  Download,
  Tv,
  QrCode,
  Printer,
  Smartphone,
  CheckCircle2,
  ExternalLink,
  Laptop,
  Layers,
  HelpCircle,
  FileText,
  Zap,
} from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-extrabold text-sm">
              QP
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[18px] text-[#0F172A]">QuickPrint</span>
              <span className="text-[11px] font-semibold text-[#64748B] px-2 py-0.5 rounded bg-[#F1F5F9] border border-[#E2E8F0]">
                DOCUMENTATION
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4 text-[13px] font-semibold text-[#475569]">
            <Link href="/" className="hover:text-[#2563EB]">Home</Link>
            <Link href="/how-it-works" className="hover:text-[#2563EB]">How It Works</Link>
            <Link href="/download" className="h-9 px-4 rounded-md bg-[#2563EB] text-white text-[13px] font-bold flex items-center gap-1.5 shadow-xs">
              <Download className="w-4 h-4" /> Download OS
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-24 flex-1 flex flex-col gap-12">
        <div className="border-b border-[#E2E8F0] pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] text-[11px] font-bold uppercase mb-3">
            <span>OFFICIAL SHOP SETUP MANUAL</span>
          </div>
          <h1 className="text-[36px] sm:text-[44px] font-black tracking-tight text-[#0F172A]">
            QuickPrint Shop Setup & Hardware Guide
          </h1>
          <p className="text-[16px] text-[#64748B] mt-2 max-w-2xl leading-relaxed">
            Everything you need to set up your counter standee QR code, connect a waiting area TV screen,
            and configure your Windows print spooler.
          </p>
        </div>

        {/* SECTION 1: SYSTEM OVERVIEW */}
        <section className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-xs flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-4">
            <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[20px] font-extrabold text-[#0F172A]">1. The 3 Parts of QuickPrint</h2>
              <p className="text-[13px] text-[#64748B]">How the components work together in your shop</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-[#E2E8F0] rounded-xl p-5 bg-[#F8FAFC]">
              <span className="text-[22px] mb-2 block">📱</span>
              <h3 className="font-bold text-[15px] text-[#0F172A]">Customer Web Kiosk</h3>
              <p className="text-[12px] text-[#64748B] mt-1.5 leading-relaxed">
                Accessible via QR code scan (<code className="font-mono text-[#0F172A]">/kiosk/[your-slug]</code>). Customers upload documents, pick options (B&W/Color/Copies), pay with UPI, and get a token.
              </p>
            </div>

            <div className="border border-[#E2E8F0] rounded-xl p-5 bg-[#F8FAFC]">
              <span className="text-[22px] mb-2 block">🖥️</span>
              <h3 className="font-bold text-[15px] text-[#0F172A]">Desktop Counter OS</h3>
              <p className="text-[12px] text-[#64748B] mt-1.5 leading-relaxed">
                Installed software on your counter PC. Receives orders in real-time, spools prints to your local Windows printer, and tracks daily revenue without needing browser tabs open.
              </p>
            </div>

            <div className="border border-[#E2E8F0] rounded-xl p-5 bg-[#F8FAFC]">
              <span className="text-[22px] mb-2 block">📺</span>
              <h3 className="font-bold text-[15px] text-[#0F172A]">Waiting Area TV Board</h3>
              <p className="text-[12px] text-[#64748B] mt-1.5 leading-relaxed">
                Full-screen display (<code className="font-mono text-[#0F172A]">/tv/[your-slug]</code>) for a wall-mounted Smart TV or second monitor. Shows live token numbers: "Now Printing" and "Ready for Pickup".
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: CONNECTING THE TV SCREEN */}
        <section className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-xs flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-4">
            <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[20px] font-extrabold text-[#0F172A]">2. Connecting Your Waiting Area TV / Monitor</h2>
              <p className="text-[13px] text-[#64748B]">How to display live pickup tokens to waiting customers</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* HDMI Method */}
            <div className="border-2 border-[#2563EB] rounded-xl p-6 bg-[#FAFCFF] flex flex-col justify-between">
              <div>
                <div className="inline-block px-2.5 py-0.5 rounded bg-[#2563EB] text-white text-[10px] font-bold uppercase mb-3">
                  METHOD 1: HDMI CABLE (RECOMMENDED)
                </div>
                <h3 className="text-[16px] font-bold text-[#0F172A]">Direct Second Monitor / TV via HDMI</h3>
                <p className="text-[13px] text-[#64748B] mt-2 leading-relaxed">
                  Best for high reliability and zero latency. Ideal when your TV is near the counter PC.
                </p>
                <ol className="mt-4 space-y-2.5 text-[13px] text-[#334155] list-decimal pl-4 leading-relaxed">
                  <li>Plug an HDMI cable from your counter PC into the TV or monitor.</li>
                  <li>Press <kbd className="px-1.5 py-0.5 bg-white border border-[#CBD5E1] rounded text-[11px] font-mono">Win + P</kbd> on your keyboard and choose <strong>Extend</strong>.</li>
                  <li>In QuickPrint Counter OS, go to <strong>Waiting Area TV</strong> in the sidebar.</li>
                  <li>Click <strong>🖥️ Launch Fullscreen TV Board</strong>.</li>
                  <li>Drag the newly opened window over to the TV screen and press <kbd className="px-1.5 py-0.5 bg-white border border-[#CBD5E1] rounded text-[11px] font-mono">F11</kbd> for fullscreen.</li>
                </ol>
              </div>
            </div>

            {/* Smart TV Method */}
            <div className="border border-[#E2E8F0] rounded-xl p-6 bg-[#F8FAFC] flex flex-col justify-between">
              <div>
                <div className="inline-block px-2.5 py-0.5 rounded bg-[#64748B] text-white text-[10px] font-bold uppercase mb-3">
                  METHOD 2: WIRELESS SMART TV
                </div>
                <h3 className="text-[16px] font-bold text-[#0F172A]">Smart TV / Fire TV / Android TV Browser</h3>
                <p className="text-[13px] text-[#64748B] mt-2 leading-relaxed">
                  Best when your TV is mounted far across the room without running long cables.
                </p>
                <ol className="mt-4 space-y-2.5 text-[13px] text-[#334155] list-decimal pl-4 leading-relaxed">
                  <li>Turn on your Smart TV and open its built-in Web Browser (Chrome, Amazon Silk, or Android TV browser).</li>
                  <li>Type your shop's TV URL: <code className="text-[#2563EB] font-bold font-mono">quickprint.in/tv/[your-shop-slug]</code>.</li>
                  <li>Press <strong>Enter</strong> and select the fullscreen mode on the TV remote.</li>
                  <li>The TV will connect over Wi-Fi, update automatically when jobs print, and play an alert sound when tokens are ready for pickup.</li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: COUNTER QR STANDEE */}
        <section className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-xs flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-4">
            <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[20px] font-extrabold text-[#0F172A]">3. Setting Up Your Counter QR Code Standee</h2>
              <p className="text-[13px] text-[#64748B]">How customers scan and upload without WhatsApp or numbers</p>
            </div>
          </div>

          <div className="space-y-4 text-[14px] text-[#475569] leading-relaxed">
            <p>
              In the QuickPrint Desktop software, click the <strong>📱 Counter QR</strong> button in the top titlebar.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div className="border border-[#E2E8F0] p-4 rounded-lg bg-[#F8FAFC]">
                <strong className="text-[#0F172A] block mb-1">Print Standee Ticket</strong>
                <p className="text-[12px] text-[#64748B]">
                  Click <strong>🖨️ Print Counter Standee</strong> to instantly print a customer scan ticket on your receipt or A4 printer. Paste it at your counter entrance.
                </p>
              </div>
              <div className="border border-[#E2E8F0] p-4 rounded-lg bg-[#F8FAFC]">
                <strong className="text-[#0F172A] block mb-1">Custom Table Standee</strong>
                <p className="text-[12px] text-[#64748B]">
                  You can copy your link or save the QR image to design an acrylic tabletop standee with your shop logo and UPI badge.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: AUTOMATIC UPDATES & SPOOLER RELIABILITY */}
        <section className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-xs flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-4">
            <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[20px] font-extrabold text-[#0F172A]">4. Automatic Updates & Print Reliability</h2>
              <p className="text-[13px] text-[#64748B]">Zero-maintenance production releases and uninterrupted queue management</p>
            </div>
          </div>

          <div className="space-y-4 text-[13px] text-[#334155] leading-relaxed">
            <p>
              QuickPrint Counter OS is engineered for continuous shop operations. The system includes built-in update intelligence:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-[#E2E8F0] p-4 rounded-lg bg-[#F8FAFC]">
                <strong className="text-[#0F172A] block mb-1">Safe In-App Updates</strong>
                <p className="text-[12px] text-[#64748B]">
                  When a new stable release is published, the desktop software detects it automatically. You can download and install updates with a single click in <strong>Settings → Software Updates</strong>.
                </p>
              </div>
              <div className="border border-[#E2E8F0] p-4 rounded-lg bg-[#F8FAFC]">
                <strong className="text-[#0F172A] block mb-1">Print Protection Guard</strong>
                <p className="text-[12px] text-[#64748B]">
                  Updates never restart the Counter OS during an active print job. If documents are printing, the updater safely pauses restart until all active pages are completed.
                </p>
              </div>
              <div className="border border-[#E2E8F0] p-4 rounded-lg bg-[#F8FAFC]">
                <strong className="text-[#0F172A] block mb-1">Zero Data Loss Migration</strong>
                <p className="text-[12px] text-[#64748B]">
                  Upgrading to new versions preserves your shop login, UPI QR credentials, pricing catalog, and printer routing preferences automatically.
                </p>
              </div>
              <div className="border border-[#E2E8F0] p-4 rounded-lg bg-[#F8FAFC]">
                <strong className="text-[#0F172A] block mb-1">Offline Continuity</strong>
                <p className="text-[12px] text-[#64748B]">
                  If your internet connection fluctuates, local counter printing and queuing continue uninterrupted. Update checks fail gracefully without blocking print counters.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between text-[12px] text-[#64748B]">
          <p>© 2026 QuickPrint Technologies.</p>
          <div className="flex gap-4 font-semibold">
            <Link href="/" className="hover:text-[#0F172A]">Home</Link>
            <Link href="/terms" className="hover:text-[#0F172A]">Terms</Link>
            <Link href="/privacy" className="hover:text-[#0F172A]">Privacy</Link>
            <Link href="/download" className="hover:text-[#0F172A]">Download</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
