import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, ShieldCheck, FileText, Scale } from 'lucide-react';
import { TicketCard } from '@/components/TicketCard';

export const metadata = {
  title: 'End User License Agreement (EULA) & Terms of Service - QuickPrint',
  description: 'Legal terms, EULA, and software licensing agreement for QuickPrint automated print kiosk system.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#fafaf7] py-12 px-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-[13px] font-mono text-[#6b6966] hover:text-[#1c1b1f] flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[#1c1b1f] text-white flex items-center justify-center">
              <Printer className="w-3.5 h-3.5 text-[#ff5a1f]" />
            </div>
            <span className="font-bold text-[16px] text-[#1c1b1f]">QuickPrint</span>
          </div>
        </div>

        {/* Legal Header Card */}
        <TicketCard>
          <div className="p-8 bg-white flex flex-col gap-6">
            <div className="border-b border-[#e6e5df] pb-5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#1b7a4d] text-white">
                  LEGAL COMPLIANCE
                </span>
                <span className="text-[12px] font-mono text-[#6b6966]">
                  Version 2.4 • Effective September 2026
                </span>
              </div>
              <h1 className="text-[26px] font-bold text-[#1c1b1f] mt-2">
                End User License Agreement & Terms of Service
              </h1>
              <p className="text-[13px] text-[#6b6966] mt-1 font-sans leading-relaxed">
                Please read this End User License Agreement (&quot;EULA&quot;) and Terms of Service carefully before registering, downloading, or using the QuickPrint Counter OS and Local Print Agent software.
              </p>
            </div>

            {/* Terms Content */}
            <div className="space-y-6 text-[13px] text-[#333] leading-relaxed font-sans">
              <section className="space-y-2">
                <h2 className="text-[16px] font-bold text-[#1c1b1f] flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#ff5a1f]" />
                  1. Software License Grant & Scope
                </h2>
                <p>
                  QuickPrint grants you (the registered Shop Owner or Business Entity) a revocable, non-exclusive, non-transferable, limited license to download, install, and execute the QuickPrint Desktop Software and Local Windows Print Agent solely for commercial counter operations in your printing, cyber cafe, or Xerox shop.
                </p>
                <p>
                  You agree not to reverse engineer, decompile, modify, or resell the agent binaries, cloud communication protocols, or telemetry pipelines.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-[16px] font-bold text-[#1c1b1f] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#1b7a4d]" />
                  2. Customer Privacy & Automatic Data Purge
                </h2>
                <p>
                  Customer trust and confidentiality are paramount. By installing the QuickPrint agent or desktop software:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[#4a4845]">
                  <li>
                    <strong>Ephemeral Spooling:</strong> Customer documents (resumes, Aadhaar cards, legal deeds) are downloaded strictly into a temporary local operating system spool directory.
                  </li>
                  <li>
                    <strong>Instant Auto-Purge:</strong> The agent service is hardcoded to immediately delete and shred local temporary buffer files as soon as the print spooler reports job completion.
                  </li>
                  <li>
                    <strong>No Document Hoarding:</strong> You agree not to intercept, copy, or retain customer documents without explicit written customer consent.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-[16px] font-bold text-[#1c1b1f] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1c1b1f]" />
                  3. Subscription Billing & Zero-Commission Policy
                </h2>
                <p>
                  QuickPrint operates on a transparent, flat subscription model:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[#4a4845]">
                  <li>
                    <strong>Flat Monthly Plan:</strong> ₹499/month following your 14-day free trial period.
                  </li>
                  <li>
                    <strong>0% Print Commission:</strong> You retain 100% of all customer cash and online collections. QuickPrint charges zero per-print fees.
                  </li>
                  <li>
                    <strong>Cancellation:</strong> You may cancel your subscription at any time with no lock-in or cancellation penalties.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-[16px] font-bold text-[#1c1b1f]">
                  4. Hardware Disclaimer & Limitation of Liability
                </h2>
                <p>
                  QuickPrint integrates with standard operating system print spoolers (Windows Spooler, CUPS). QuickPrint is not responsible for physical printer paper jams, toner depletion, power outages, or hardware wear-and-tear. Shopkeepers remain responsible for maintaining physical paper and ink supplies.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-[16px] font-bold text-[#1c1b1f]">
                  5. Compliance with Applicable Law
                </h2>
                <p>
                  You agree to use QuickPrint in full compliance with the Information Technology Act (India) and local consumer protection regulations. Commercial counterfeit reproduction of government currency or unauthorized restricted identity documents is strictly prohibited and grounds for immediate account termination.
                </p>
              </section>
            </div>

            <div className="pt-4 border-t border-[#e6e5df] flex items-center justify-between">
              <span className="text-[12px] font-mono text-[#6b6966]">
                QuickPrint Enterprise Systems • Legal & Compliance Office
              </span>
              <Link
                href="/signup"
                className="h-10 px-5 rounded bg-[#1c1b1f] hover:bg-[#333] text-white text-[12px] font-bold flex items-center justify-center transition-all"
              >
                <span>Accept & Continue to Signup</span>
              </Link>
            </div>
          </div>
        </TicketCard>
      </div>
    </div>
  );
}
