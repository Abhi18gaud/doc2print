'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Printer,
  ListOrdered,
  DollarSign,
  Tv,
  QrCode,
  Settings,
  Terminal,
  LogOut,
  ExternalLink,
  Store,
  Monitor,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { shop, owner, logout, loading, user } = useAuth();

  const shopSlug = shop?.qr_code_slug || 'shree-ganesh-xerox';
  const shopName = shop?.name || 'QuickPrint Counter';

  // Enforce email verification — redirect to verify-email if unconfirmed
  useEffect(() => {
    if (!loading && user && !user.email_confirmed_at) {
      router.replace(
        `/verify-email?email=${encodeURIComponent(user.email || '')}&shopId=${shop?.id || ''}`
      );
    }
  }, [loading, user, shop, router]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  const navItems = [
    { label: 'Live Queue', href: '/dashboard', icon: ListOrdered },
    { label: 'Earnings', href: '/dashboard/earnings', icon: DollarSign },
    { label: 'Printers', href: '/dashboard/printers', icon: Printer },
    { label: 'Agent Setup', href: '/dashboard/agent-setup', icon: Terminal },
    { label: 'Desktop App', href: '/download', icon: Monitor },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  // Show nothing while loading or redirecting
  if (loading || !user || !user.email_confirmed_at) {
    return (
      <div className="min-h-screen bg-[#fafaf7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#1c1b1f] flex items-center justify-center">
            <Printer className="w-4 h-4 text-[#ff5a1f] animate-pulse" />
          </div>
          <p className="text-[12px] font-mono text-[#6b6966]">Loading Counter OS…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-[#e6e5df] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded bg-[#1c1b1f] text-white flex items-center justify-center shadow-xs">
                <Printer className="w-5 h-5 text-[#ff5a1f]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-bold text-[16px] text-[#1c1b1f]">
                    {shopName}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#e8e8e5] text-[#1c1b1f]">
                    COUNTER OS
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#6b6966] mt-0.5">
                  quickprint.in/kiosk/{shopSlug}
                </span>
              </div>
            </Link>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`px-3 py-1.5 rounded text-[13px] font-bold flex items-center gap-1.5 transition-colors ${
                    isActive
                      ? 'bg-[#1c1b1f] text-white'
                      : 'text-[#6b6966] hover:text-[#1c1b1f] hover:bg-[#f4f4f1]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Quick Open Links */}
            <Link
              href={`/kiosk/${shopSlug}`}
              target="_blank"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#f4f4f1] hover:bg-[#e8e8e5] text-[12px] font-mono font-bold text-[#1c1b1f] border border-[#e6e5df]"
              title="Open customer QR upload page"
            >
              <QrCode className="w-3.5 h-3.5 text-[#ff5a1f]" />
              <span>Customer Kiosk</span>
            </Link>

            <Link
              href={`/tv/${shopSlug}`}
              target="_blank"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#f4f4f1] hover:bg-[#e8e8e5] text-[12px] font-mono font-bold text-[#1c1b1f] border border-[#e6e5df]"
              title="Open waiting area TV queue display"
            >
              <Tv className="w-3.5 h-3.5 text-[#ff5a1f]" />
              <span>TV Board</span>
            </Link>

            {/* Logout button */}
            <button
              type="button"
              onClick={logout}
              className="w-9 h-9 rounded bg-[#f4f4f1] hover:bg-[#ffdad6]/40 text-[#6b6966] hover:text-[#ba1a1a] flex items-center justify-center transition-colors border border-[#e6e5df]"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile secondary tab bar */}
        <div className="lg:hidden flex items-center gap-1 px-4 py-2 border-t border-[#f4f4f1] overflow-x-auto bg-[#fafaf7]">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`px-3 py-1 rounded text-[12px] font-bold flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#1c1b1f] text-white'
                    : 'text-[#6b6966] hover:bg-[#f4f4f1]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Desktop Software Recommendation Banner */}
      <div className="bg-[#EFF6FF] border-b border-[#BFDBFE] px-4 py-2.5 text-center text-[13px] text-[#1E40AF] font-medium flex flex-wrap items-center justify-center gap-3">
        <span>⚡ <strong>QuickPrint Counter OS is a native Windows Application:</strong> Spool real print jobs to your local printer, stay permanently logged in, and receive background alerts without browser tabs.</span>
        <Link href="/download" className="px-3 py-1 rounded bg-[#2563EB] text-white text-[12px] font-bold hover:bg-[#1D4ED8] transition-colors shadow-xs">
          Download Desktop OS (.exe)
        </Link>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6">{children}</div>
    </div>
  );
}
