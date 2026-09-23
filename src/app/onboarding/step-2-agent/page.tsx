'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  Printer,
  QrCode,
  Terminal,
  Download,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { TicketCard, TicketPerforation } from '@/components/TicketCard';
import { supabase } from '@/lib/supabase/client';

function AgentOnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopId = searchParams.get('shopId') || '';

  const [shopSlug, setShopSlug] = useState('shree-ganesh-xerox');
  const [shopName, setShopName] = useState('My Xerox Shop');
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    async function loadShop() {
      if (shopId) {
        const { data } = await supabase
          .from('shops')
          .select('name, qr_code_slug')
          .eq('id', shopId)
          .single();

        if (data) {
          setShopName(data.name);
          setShopSlug(data.qr_code_slug);
        }
      }
    }
    loadShop();
  }, [shopId]);

  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const kioskUrl = `${origin}/kiosk/${shopSlug}`;
    QRCode.toDataURL(kioskUrl, {
      margin: 1,
      width: 220,
      color: { dark: '#1c1b1f', light: '#ffffff' },
    })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [shopSlug]);

  return (
    <>
      {/* Printable Counter QR Standee Chit */}
      <TicketCard>
        <div className="p-6 bg-white flex flex-col items-center text-center">
          <span className="text-[11px] font-mono font-bold tracking-widest text-[#6b6966] uppercase">
            YOUR COUNTER STAND-EE QR CODE
          </span>
          <h2 className="text-[20px] font-bold text-[#1c1b1f] mt-0.5">
            {shopName}
          </h2>

          {/* Rendered QR Code */}
          <div className="p-3 bg-white border-2 border-[#1c1b1f] rounded-lg my-4 shadow-sm">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Shop QR Code"
                className="w-44 h-44 object-contain"
              />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center font-mono text-[12px]">
                Generating QR...
              </div>
            )}
          </div>

          <span className="text-[13px] font-mono font-bold text-[#1c1b1f]">
            quickprint.in/kiosk/{shopSlug}
          </span>
          <p className="text-[12px] text-[#6b6966] mt-1">
            Stick this QR code on your shop counter or front window.
          </p>

          <button
            type="button"
            onClick={() => window.print()}
            className="mt-4 px-4 py-2 rounded bg-[#f4f4f1] border border-[#e6e5df] text-[12px] font-mono font-bold text-[#1c1b1f] hover:bg-[#e8e8e5] flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Print Counter Standee Chit</span>
          </button>
        </div>

        <TicketPerforation />

        {/* Local Print Agent Install Instruction */}
        <div className="p-6 bg-[#f4f4f1] border-t border-[#e6e5df] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-[#ff5a1f]" />
              <h3 className="text-[16px] font-bold text-[#1c1b1f]">
                Download Local Print Agent
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#1b7a4d] text-white">
              PRE-CONFIGURED
            </span>
          </div>

          <p className="text-[13px] text-[#4a4845] leading-relaxed">
            Run our lightweight background agent on the shop computer connected to your printer. When customers upload via QR, jobs print silently in under 1.5 seconds!
          </p>

          {/* 1-Click Download Button */}
          {shopId && (
            <a
              href={`/api/agent/download?shopId=${shopId}`}
              download
              className="w-full h-11 px-4 rounded bg-[#ff5a1f] hover:bg-[#e04b14] active:scale-95 text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-xs transition-all btn-tactile"
            >
              <Download className="w-4 h-4" />
              <span>Download Agent ZIP for {shopName}</span>
            </a>
          )}

          <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-sans text-[#6b6966]">
            <div className="bg-white p-2.5 rounded border border-[#e6e5df]">
              <strong className="text-[#1c1b1f] block mb-0.5">1. Download</strong>
              Save pre-filled ZIP
            </div>
            <div className="bg-white p-2.5 rounded border border-[#e6e5df]">
              <strong className="text-[#1c1b1f] block mb-0.5">2. Extract</strong>
              Right-click & Extract All
            </div>
            <div className="bg-white p-2.5 rounded border border-[#e6e5df]">
              <strong className="text-[#1c1b1f] block mb-0.5">3. Launch</strong>
              Run start-agent.bat
            </div>
          </div>
        </div>
      </TicketCard>

      {/* Action button to launch dashboard */}
      <button
        type="button"
        onClick={() => router.push('/dashboard')}
        className="w-full h-12 rounded bg-[#1c1b1f] hover:bg-[#333] active:scale-[0.99] text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-sm transition-all btn-tactile"
      >
        <span>Enter Shopkeeper Counter Dashboard →</span>
      </button>
    </>
  );
}

export default function OnboardingAgentPage() {
  return (
    <div className="min-h-screen bg-[#fafaf7] py-10 px-4 flex flex-col justify-between">
      <div className="max-w-xl mx-auto w-full flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#1c1b1f] text-white flex items-center justify-center">
              <Printer className="w-4 h-4 text-[#ff5a1f]" />
            </div>
            <span className="font-bold text-[18px] text-[#1c1b1f]">
              QuickPrint Onboarding
            </span>
          </div>
          <span className="text-[12px] font-mono text-[#1b7a4d] font-bold">
            STEP 2 OF 2 (COMPLETED)
          </span>
        </div>

        <Suspense fallback={<div className="p-12 text-center font-mono text-[13px]">Loading onboarding details...</div>}>
          <AgentOnboardingContent />
        </Suspense>
      </div>
    </div>
  );
}
