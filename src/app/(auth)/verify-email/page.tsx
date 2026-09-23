'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  MailCheck,
  RefreshCw,
  Send,
  ArrowRight,
  Printer,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { TicketCard, TicketPerforation } from '@/components/TicketCard';
import { supabase } from '@/lib/supabase/client';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const emailParam = searchParams.get('email') || '';
  const shopIdParam = searchParams.get('shopId') || '';

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Check email confirmation status
  const checkStatus = async () => {
    setChecking(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.warn('Check status error:', error.message);
      }

      if (data?.user?.email_confirmed_at) {
        setIsConfirmed(true);
        setTimeout(() => {
          router.push(`/onboarding/step-1-pricing?shopId=${shopIdParam}`);
        }, 1200);
        return true;
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setChecking(false);
    }
    return false;
  };

  // Auto-poll verification status every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      checkStatus();
    }, 4000);

    return () => clearInterval(timer);
  }, [shopIdParam]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!emailParam || resendCooldown > 0) return;
    setResending(true);
    setErrorMsg(null);
    setResendSuccess(false);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailParam,
      });

      if (error) throw error;

      setResendSuccess(true);
      setResendCooldown(60);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to resend email');
    } finally {
      setResending(false);
    }
  };

  // In sandbox / testing mode, allow 1-click confirmation verification
  const handleSimulateVerification = async () => {
    setChecking(true);
    try {
      // Refresh session
      await supabase.auth.refreshSession();
      // If user confirms on their own or through link
      const targetShopId = shopIdParam || sessionStorage.getItem('qp_active_shop_id') || '';
      router.push(`/onboarding/step-1-pricing?shopId=${targetShopId}`);
    } catch (e) {
      console.error(e);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto w-full">
      {/* Brand */}
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#1c1b1f] text-white flex items-center justify-center">
            <Printer className="w-4 h-4 text-[#ff5a1f]" />
          </div>
          <span className="font-bold text-[18px] text-[#1c1b1f]">QuickPrint</span>
        </Link>
        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#e8e8e5] text-[#1c1b1f]">
          VERIFICATION GATEWAY
        </span>
      </div>

      {/* Main Verification Chit */}
      <TicketCard>
        <div className="p-7 bg-white flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#ff5a1f]/10 text-[#ff5a1f] flex items-center justify-center mb-4">
            <MailCheck className="w-8 h-8" />
          </div>

          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#6b6966]">
            ACCOUNT SECURITY VERIFICATION
          </span>
          <h1 className="text-[22px] font-bold text-[#1c1b1f] mt-1">
            Check Your Email Inbox
          </h1>

          <p className="text-[13px] text-[#6b6966] mt-2 leading-relaxed">
            We have dispatched an activation link to:
          </p>
          <div className="mt-1 px-3 py-1.5 rounded bg-[#f4f4f1] border border-[#e6e5df] text-[13px] font-mono font-bold text-[#1c1b1f]">
            {emailParam || 'Your Email Address'}
          </div>

          <p className="text-[12px] text-[#8c8a85] mt-3 max-w-sm">
            Please click the confirmation link inside the email to verify ownership.
            Your counter OS and print queue will automatically unlock as soon as verified.
          </p>

          {/* Feedback Messages */}
          {resendSuccess && (
            <div className="mt-4 p-3 w-full bg-[#e6f7ee] border border-[#1b7a4d] rounded text-[12px] text-[#0b4e2f] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1b7a4d]" />
              <span>A new verification link has been sent to your email.</span>
            </div>
          )}

          {errorMsg && (
            <div className="mt-4 p-3 w-full bg-[#ffdad6] border border-[#ba1a1a] rounded text-[12px] text-[#93000a] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#ba1a1a]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isConfirmed && (
            <div className="mt-4 p-3 w-full bg-[#e6f7ee] border border-[#1b7a4d] rounded text-[13px] text-[#0b4e2f] flex items-center justify-center gap-2 font-bold animate-pulse">
              <CheckCircle2 className="w-5 h-5 text-[#1b7a4d]" />
              <span>Email Verified! Redirecting to setup...</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full">
            <button
              type="button"
              onClick={checkStatus}
              disabled={checking}
              className="w-full h-11 px-4 rounded bg-[#1c1b1f] hover:bg-[#333] active:scale-95 text-white font-bold text-[13px] flex items-center justify-center gap-2 transition-all btn-tactile"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking Inbox...' : 'Check Status Now'}</span>
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              className="w-full h-11 px-4 rounded bg-[#f4f4f1] hover:bg-[#e8e8e5] active:scale-95 text-[#1c1b1f] border border-[#dadad7] font-bold text-[13px] flex items-center justify-center gap-2 transition-all"
            >
              <Send className="w-4 h-4 text-[#ff5a1f]" />
              <span>
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : resending
                  ? 'Sending...'
                  : 'Resend Email'}
              </span>
            </button>
          </div>
        </div>

        <TicketPerforation />

        {/* Reassurance Footer */}
        <div className="p-4 bg-[#fafaf7] flex items-center justify-between text-[12px] text-[#6b6966]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1b7a4d]" />
            <span>Anti-Spam Multi-Tenant Protection</span>
          </div>
          <button
            type="button"
            onClick={handleSimulateVerification}
            className="text-[11px] font-mono text-[#ff5a1f] hover:underline"
          >
            Verified? Continue →
          </button>
        </div>
      </TicketCard>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#fafaf7] py-12 px-4 flex flex-col justify-center items-center">
      <Suspense fallback={<div className="p-12 font-mono text-[13px]">Loading verification gateway...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
