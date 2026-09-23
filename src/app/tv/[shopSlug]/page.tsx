'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';
import { Printer, Clock, CheckCircle2, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Job } from '@/types/database';

export default function ShopTvQueueDisplay() {
  const params = useParams();
  const shopSlug = (params?.shopSlug as string) || 'shree-ganesh-xerox';

  const [jobs, setJobs] = useState<Job[]>([]);
  const [timeStr, setTimeStr] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');

  const [shop, setShop] = useState<{ id: string; name: string; address?: string } | null>(null);

  // Clock ticker
  useEffect(() => {
    const updateTime = () => {
      setTimeStr(new Date().toLocaleTimeString('en-IN', { hour12: true }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Generate QR Code for mobile scanning
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://quickprint.in';
    const kioskUrl = `${origin}/kiosk/${shopSlug}`;
    QRCode.toDataURL(kioskUrl, {
      margin: 1,
      width: 160,
      color: { dark: '#1c1b1f', light: '#ffffff' },
    })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [shopSlug]);

  // Fetch & Subscribe to shop & jobs
  useEffect(() => {
    async function loadShopAndJobs() {
      try {
        const { data: shops } = await supabase
          .from('shops')
          .select('id, name, address, qr_code_slug')
          .or(`qr_code_slug.eq.${shopSlug},id.eq.${shopSlug}`)
          .limit(1);

        let targetShopId = '';
        if (shops && shops.length > 0) {
          setShop(shops[0]);
          targetShopId = shops[0].id;
        } else {
          setShop({
            id: '',
            name: shopSlug ? shopSlug.replace(/-/g, ' ').toUpperCase() : 'QUICKPRINT COUNTER',
            address: 'Live Spool & Pickup Board',
          });
        }

        let query = supabase
          .from('jobs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);

        if (targetShopId) {
          query = query.eq('shop_id', targetShopId);
        }

        const { data } = await query;
        setJobs(data || []);
      } catch (e) {
        console.error('Error fetching TV jobs:', e);
      }
    }

    loadShopAndJobs();

    const channel = supabase
      .channel(`tv_jobs_${shopSlug}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        () => loadShopAndJobs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopSlug]);

  const printingJobs = jobs.filter((j) => j.print_status === 'printing');
  const queuedJobs = jobs.filter((j) => j.print_status === 'queued' || j.print_status === 'pending_payment');
  const completedJobs = jobs
    .filter((j) => j.print_status === 'completed')
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-[#141311] text-white p-6 md:p-10 flex flex-col justify-between select-none">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between border-b border-[#2f312f] pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-[#ff5a1f] text-white flex items-center justify-center shadow-lg">
            <Printer className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight text-white leading-none">
                {shop?.name || 'QuickPrint Counter'}
              </h1>
              <span className="text-[12px] font-mono font-bold px-2.5 py-1 rounded bg-[#2f312f] text-[#ff5a1f]">
                AUTO KIOSK TERMINAL
              </span>
            </div>
            <p className="text-[14px] font-mono text-[#a8a6a1] mt-1">
              {shop?.address || 'Counter Spool & Pickup Board'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right font-mono">
            <span className="text-[11px] uppercase tracking-widest text-[#a8a6a1] block">
              LOCAL TIME
            </span>
            <span className="text-[24px] md:text-[30px] font-bold text-white">
              {timeStr}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1b7a4d]/20 border border-[#1b7a4d]/40">
            <span className="w-3 h-3 rounded-full bg-[#1b7a4d] animate-pulse" />
            <span className="text-[12px] font-mono font-bold text-[#9cf5be]">
              ONLINE
            </span>
          </div>
        </div>
      </header>

      {/* Main Big Display Columns */}
      <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-8 flex-1">
        {/* Left Column: ACTIVE PRINTING & QUEUED */}
        <div className="bg-[#1c1b1f] rounded-xl border border-[#2f312f] p-6 flex flex-col gap-6">
          {/* Currently Printing */}
          <div>
            <div className="flex items-center justify-between border-b border-[#2f312f] pb-3 mb-4">
              <span className="text-[14px] font-mono font-bold tracking-wider text-[#ff5a1f] uppercase flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5a1f] animate-ping" />
                NOW DISPENSING / PRINTING
              </span>
              <span className="text-[12px] font-mono text-[#a8a6a1]">SLOT A-4</span>
            </div>

            {printingJobs.length === 0 ? (
              <div className="p-6 bg-[#141311] rounded-lg text-center font-mono text-[#6b6966] text-[15px]">
                Printer ready • Spool idle
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {printingJobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-[#2f312f] p-4 rounded-lg border-2 border-[#ff5a1f] flex flex-col items-center justify-center animate-pulse"
                  >
                    <span className="text-[11px] font-mono text-[#ff5a1f] uppercase font-bold">
                      PRINTING NOW
                    </span>
                    <span className="text-[52px] font-mono font-bold text-white leading-none my-1">
                      #{job.token_number}
                    </span>
                    <span className="text-[12px] font-mono text-[#a8a6a1]">
                      {job.pages}p • {job.paper_size.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Up Next in Queue */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-[#2f312f] pb-3 mb-4">
              <span className="text-[14px] font-mono font-bold tracking-wider text-[#a8a6a1] uppercase">
                NEXT IN SPOOL QUEUE ({queuedJobs.length})
              </span>
              <span className="text-[12px] font-mono text-[#6b6966]">FIFO ORDER</span>
            </div>

            {queuedJobs.length === 0 ? (
              <div className="p-8 bg-[#141311] rounded-lg text-center font-mono text-[#6b6966] text-[15px]">
                No jobs waiting in queue
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {queuedJobs.map((job, idx) => (
                  <div
                    key={job.id}
                    className="bg-[#141311] p-3.5 rounded-lg border border-[#2f312f] text-center flex flex-col items-center justify-center"
                  >
                    <span className="text-[10px] font-mono text-[#a8a6a1]">
                      POS {idx + 1}
                    </span>
                    <span className="text-[28px] font-mono font-bold text-white leading-tight">
                      #{job.token_number}
                    </span>
                    <span className="text-[11px] font-mono text-[#ff5a1f]">
                      {job.pages}p
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: READY FOR PICKUP */}
        <div className="bg-[#1c1b1f] rounded-xl border border-[#2f312f] p-6 flex flex-col">
          <div className="flex items-center justify-between border-b border-[#2f312f] pb-3 mb-4">
            <span className="text-[14px] font-mono font-bold tracking-wider text-[#1b7a4d] uppercase flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#1b7a4d]" />
              READY FOR COLLECTION (TRAY A-4)
            </span>
            <span className="text-[12px] font-mono text-[#a8a6a1]">COUNTER PICKUP</span>
          </div>

          {completedJobs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8 bg-[#141311] rounded-lg font-mono text-[#6b6966]">
              Finished prints will appear here
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1 auto-rows-max">
              {completedJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-[#141311] p-4 rounded-lg border border-[#1b7a4d]/50 flex flex-col items-center justify-center text-center"
                >
                  <span className="text-[10px] font-mono text-[#1b7a4d] uppercase font-bold tracking-wider">
                    COLLECT NOW
                  </span>
                  <span className="text-[36px] font-mono font-bold text-white leading-tight my-1">
                    #{job.token_number}
                  </span>
                  <span className="text-[11px] font-mono text-[#a8a6a1] truncate max-w-[130px]">
                    {job.file_name || 'Document.pdf'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Kiosk Scan Call-To-Action Banner */}
      <footer className="bg-[#1c1b1f] border border-[#2f312f] rounded-xl p-4 md:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt="Scan to Print"
              className="w-20 h-20 rounded bg-white p-1 border border-white"
            />
          )}
          <div>
            <span className="text-[18px] md:text-[20px] font-bold text-white block">
              Skip The WhatsApp Queue • Print Instantly
            </span>
            <p className="text-[13px] font-mono text-[#a8a6a1] mt-0.5">
              Scan QR code with your phone camera, upload file, and pay via UPI.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded bg-[#ff5a1f] text-white font-bold font-mono text-[14px]">
            kiosk/{shopSlug}
          </div>
        </div>
      </footer>
    </div>
  );
}
