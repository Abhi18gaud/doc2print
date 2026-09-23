'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mail,
  Lock,
  Printer,
  ArrowRight,
  AlertCircle,
  Store,
} from 'lucide-react';
import { TicketCard } from '@/components/TicketCard';
import { supabase } from '@/lib/supabase/client';

export default function OwnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authErr) {
        throw authErr;
      }

      if (data.user) {
        // Fetch primary shop for this owner
        const { data: shop } = await supabase
          .from('shops')
          .select('id, qr_code_slug')
          .eq('owner_id', data.user.id)
          .limit(1)
          .maybeSingle();

        if (shop) {
          sessionStorage.setItem('qp_owner_shop_id', shop.id);
          sessionStorage.setItem('qp_owner_shop_slug', shop.qr_code_slug);
        }

        router.push('/dashboard');
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Invalid login credentials. Please check your email and password.';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf7] flex flex-col justify-between py-10 px-4">
      <div className="max-w-md mx-auto w-full flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#1c1b1f] text-white flex items-center justify-center shadow-xs">
              <Printer className="w-4 h-4 text-[#ff5a1f]" />
            </div>
            <span className="font-bold text-[18px] tracking-tight text-[#1c1b1f]">
              QuickPrint
            </span>
          </Link>
          <span className="text-[12px] font-mono text-[#6b6966]">
            OWNER LOGIN
          </span>
        </div>

        {error && (
          <div className="p-3 bg-[#ffdad6] border border-[#ba1a1a] rounded text-[#93000a] text-[13px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <TicketCard>
          <div className="p-6 bg-white">
            <h1 className="text-[22px] font-bold text-[#1c1b1f]">
              Shopkeeper Portal
            </h1>
            <p className="text-[13px] text-[#6b6966] mt-0.5 font-sans">
              Enter your shop credentials to access your counter OS and live print queue.
            </p>

            <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-4">
              <div>
                <label className="text-[12px] font-mono uppercase tracking-wider font-bold text-[#1c1b1f] block mb-1">
                  EMAIL ADDRESS
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#6b6966] absolute left-3 top-3" />
                  <input
                    required
                    type="email"
                    placeholder="owner@yourshop.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 pl-9 pr-3 rounded bg-[#f4f4f1] border border-[#dadad7] text-[13px] text-[#1c1b1f] outline-none focus:border-[#ff5a1f]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-mono uppercase tracking-wider font-bold text-[#1c1b1f] block mb-1">
                  PASSWORD
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#6b6966] absolute left-3 top-3" />
                  <input
                    required
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 pl-9 pr-3 rounded bg-[#f4f4f1] border border-[#dadad7] text-[13px] text-[#1c1b1f] outline-none focus:border-[#ff5a1f]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded bg-[#1c1b1f] hover:bg-[#333] active:scale-[0.99] text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-sm transition-all btn-tactile mt-2"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-[#f4f4f1] text-center text-[13px] text-[#6b6966]">
              <span>New shop owner? </span>
              <Link
                href="/signup"
                className="font-bold text-[#ff5a1f] hover:underline"
              >
                Register Your Shop
              </Link>
            </div>
          </div>
        </TicketCard>
      </div>
    </div>
  );
}
