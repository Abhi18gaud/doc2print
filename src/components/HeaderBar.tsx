import React from 'react';
import Link from 'next/link';
import { Printer } from 'lucide-react';

interface HeaderBarProps {
  shopName?: string;
  counterInfo?: string;
  isOnline?: boolean;
  backHref?: string;
  onBack?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  shopName = 'Shree Ganesh Xerox',
  counterInfo = 'Counter #04',
  isOnline = true,
  backHref,
  onBack,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#fafaf7]/90 backdrop-blur-md border-b border-[#e6e5df]">
      <div className="max-w-2xl mx-auto h-16 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          {backHref ? (
            <Link
              href={backHref}
              className="w-9 h-9 rounded bg-[#f4f4f1] border border-[#e6e5df] flex items-center justify-center text-[#1c1b1f] hover:bg-[#e8e8e5] active:scale-95 transition-all mr-1"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
          ) : onBack ? (
            <button
              onClick={onBack}
              className="w-9 h-9 rounded bg-[#f4f4f1] border border-[#e6e5df] flex items-center justify-center text-[#1c1b1f] hover:bg-[#e8e8e5] active:scale-95 transition-all mr-1"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          ) : null}

          <div className="w-8 h-8 rounded bg-[#1c1b1f] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Printer className="w-4 h-4 text-[#ff5a1f]" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-bold text-[15px] tracking-tight text-[#1c1b1f]">
                QuickPrint
              </span>
              <span className="text-[10px] font-mono font-bold px-1 py-0.5 rounded bg-[#e8e8e5] text-[#6b6966]">
                KIOSK
              </span>
            </div>
            <span className="text-[12px] text-[#6b6966] font-mono truncate mt-0.5">
              {shopName} {counterInfo ? `• ${counterInfo}` : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#e6e5df] shadow-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-[#1b7a4d] animate-pulse' : 'bg-[#ba1a1a]'
            }`}
          />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1c1b1f]">
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
      </div>
    </header>
  );
};
