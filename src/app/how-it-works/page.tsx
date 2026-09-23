import React from 'react';
import Link from 'next/link';
import { Download, CheckCircle2, QrCode, Smartphone, Printer, Shield, ArrowRight } from 'lucide-react';

export default function HowItWorksPage() {
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-20 flex-1 flex flex-col gap-12">
        <div className="text-center">
          <h1 className="text-[34px] sm:text-[44px] font-black tracking-tight text-[#0F172A]">
            How QuickPrint Counter OS Works
          </h1>
          <p className="text-[16px] text-[#64748B] mt-2 max-w-xl mx-auto">
            A real-time hardware and software ecosystem designed specifically for the busy environment of Indian Xerox and print shops.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-xs flex flex-col md:flex-row gap-6 items-start">
            <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] text-[#2563EB] font-black text-xl flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-[#0F172A]">The Counter QR Standee</h3>
              <p className="text-[14px] text-[#64748B] mt-1 leading-relaxed">
                You place your QuickPrint QR standee on your front counter. Walk-in customers scan it with any smartphone camera (iPhone, Android, Paytm, Google Lens). They do not need to install an app or add your phone number to their WhatsApp.
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-xs flex flex-col md:flex-row gap-6 items-start">
            <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] text-[#2563EB] font-black text-xl flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-[#0F172A]">Customer Upload & Customization</h3>
              <p className="text-[14px] text-[#64748B] mt-1 leading-relaxed">
                The mobile kiosk allows customers to upload PDFs, DOCX, or images. The customer selects whether they want Black & White or Full Color, single or double-sided (duplex), and specifies copy count. The system calculates the exact price automatically.
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-xs flex flex-col md:flex-row gap-6 items-start">
            <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] text-[#2563EB] font-black text-xl flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-[#0F172A]">Direct UPI Payment Verification</h3>
              <p className="text-[14px] text-[#64748B] mt-1 leading-relaxed">
                Customers pay through dynamic UPI QR codes (via Cashfree/UPI). The payment is verified instantaneously. Customers also receive a Token Number (e.g. #A-104) to collect their document at your counter.
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-xs flex flex-col md:flex-row gap-6 items-start">
            <div className="w-12 h-12 rounded-xl bg-[#ECFDF5] text-[#059669] font-black text-xl flex items-center justify-center shrink-0">
              4
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-[#0F172A]">Desktop Counter OS Silent Spooling</h3>
              <p className="text-[14px] text-[#64748B] mt-1 leading-relaxed">
                Your counter PC runs QuickPrint Counter OS in the background. As soon as payment confirms, Counter OS plays an alert chime, displays the job card with token #A-104, and automatically sends the PDF to your physical printer tray without needing your manual intervention.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center pt-6">
          <Link href="/download" className="inline-flex items-center gap-2 h-12 px-8 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-[14px] shadow-md transition-all">
            <Download className="w-5 h-5" /> Download Counter OS for Windows
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
