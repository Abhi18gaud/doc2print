'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Store,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Printer,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { TicketCard, TicketPerforation } from '@/components/TicketCard';
import { supabase } from '@/lib/supabase/client';

export default function OwnerSignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [formData, setFormData] = useState({
    ownerName: '',
    email: '',
    password: '',
    phone: '',
    shopName: '',
    address: '',
    slug: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'shopName' && !prev.slug) {
        updated.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-');
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!agreedToTerms) {
      setError('You must accept the End User License Agreement (EULA) and Terms of Service to create an account.');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      // 1. Create real Supabase Auth user
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            name: formData.ownerName,
            phone: formData.phone,
          },
        },
      });

      if (authErr) {
        throw authErr;
      }

      const userId = authData.user?.id;
      // Get the access token for RLS-compliant server-side writes
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      // 2. Initialize owner, shop, subscription, and printer
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          accessToken,
          ownerName: formData.ownerName,
          email: formData.email,
          phone: formData.phone,
          shopName: formData.shopName,
          address: formData.address,
          slug: formData.slug,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete registration.');
      }

      // Store in session for onboarding
      sessionStorage.setItem('qp_owner_shop_id', data.shopId);
      sessionStorage.setItem('qp_owner_shop_slug', data.slug);
      sessionStorage.setItem('qp_active_shop_id', data.shopId);

      // Check if email confirmation is required or already verified
      const isConfirmed = !!authData.user?.email_confirmed_at;
      if (isConfirmed) {
        router.push(`/onboarding/step-1-pricing?shopId=${data.shopId}`);
      } else {
        router.push(`/verify-email?email=${encodeURIComponent(formData.email)}&shopId=${data.shopId}`);
      }
    } catch (err: unknown) {
      console.error('Signup error:', err);
      const msg = err instanceof Error ? err.message : 'Signup failed. Please try again.';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf7] flex flex-col justify-between py-10 px-4">
      <div className="max-w-xl mx-auto w-full flex flex-col gap-6">
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
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-[13px] font-mono text-[#6b6966] hover:text-[#1c1b1f] hover:underline"
            >
              Already registered? Login
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-[#ffdad6] border border-[#ba1a1a] rounded text-[#93000a] text-[13px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Signup Form Card */}
        <TicketCard>
          <div className="p-6 bg-white">
            <h1 className="text-[22px] font-bold text-[#1c1b1f]">
              Register Your Print Shop
            </h1>
            <p className="text-[13px] text-[#6b6966] mt-0.5 font-sans">
              Create your real shop owner account. Get instant access to your counter
              OS, QR standee chit, and background print agent.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              {/* Owner Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-mono uppercase tracking-wider font-bold text-[#1c1b1f] block mb-1">
                    YOUR FULL NAME
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#6b6966] absolute left-3 top-3" />
                    <input
                      required
                      type="text"
                      name="ownerName"
                      placeholder="e.g. Ramesh Sharma"
                      value={formData.ownerName}
                      onChange={handleChange}
                      className="w-full h-11 pl-9 pr-3 rounded bg-[#f4f4f1] border border-[#dadad7] text-[13px] text-[#1c1b1f] outline-none focus:border-[#ff5a1f]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-mono uppercase tracking-wider font-bold text-[#1c1b1f] block mb-1">
                    PHONE / WHATSAPP
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#6b6966] absolute left-3 top-3" />
                    <input
                      required
                      type="tel"
                      name="phone"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full h-11 pl-9 pr-3 rounded bg-[#f4f4f1] border border-[#dadad7] text-[13px] text-[#1c1b1f] outline-none focus:border-[#ff5a1f]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-mono uppercase tracking-wider font-bold text-[#1c1b1f] block mb-1">
                    EMAIL ADDRESS
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#6b6966] absolute left-3 top-3" />
                    <input
                      required
                      type="email"
                      name="email"
                      placeholder="owner@yourshop.in"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full h-11 pl-9 pr-3 rounded bg-[#f4f4f1] border border-[#dadad7] text-[13px] text-[#1c1b1f] outline-none focus:border-[#ff5a1f]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-mono uppercase tracking-wider font-bold text-[#1c1b1f] block mb-1">
                    CHOOSE PASSWORD
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#6b6966] absolute left-3 top-3" />
                    <input
                      required
                      type="password"
                      name="password"
                      minLength={6}
                      placeholder="Min 6 characters"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full h-11 pl-9 pr-3 rounded bg-[#f4f4f1] border border-[#dadad7] text-[13px] text-[#1c1b1f] outline-none focus:border-[#ff5a1f]"
                    />
                  </div>
                </div>
              </div>

              {/* Shop Details */}
              <div className="pt-3 border-t border-[#f4f4f1] flex flex-col gap-3">
                <div>
                  <label className="text-[12px] font-mono uppercase tracking-wider font-bold text-[#1c1b1f] block mb-1">
                    SHOP / CYBER CAFE NAME
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-[#6b6966] absolute left-3 top-3" />
                    <input
                      required
                      type="text"
                      name="shopName"
                      placeholder="e.g. Shiva Print Hub & Xerox"
                      value={formData.shopName}
                      onChange={handleChange}
                      className="w-full h-11 pl-9 pr-3 rounded bg-[#f4f4f1] border border-[#dadad7] text-[13px] text-[#1c1b1f] outline-none focus:border-[#ff5a1f]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-mono uppercase tracking-wider font-bold text-[#1c1b1f] block mb-1">
                    SHOP ADDRESS / LOCATION
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#6b6966] absolute left-3 top-3" />
                    <input
                      required
                      type="text"
                      name="address"
                      placeholder="Shop #12, Station Road, Near College Gate"
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full h-11 pl-9 pr-3 rounded bg-[#f4f4f1] border border-[#dadad7] text-[13px] text-[#1c1b1f] outline-none focus:border-[#ff5a1f]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-mono uppercase tracking-wider font-bold text-[#1c1b1f] block mb-1">
                    SHOP QR SLUG (URL)
                  </label>
                  <div className="flex items-center">
                    <span className="h-11 px-3 bg-[#e8e8e5] border border-r-0 border-[#dadad7] rounded-l text-[12px] font-mono text-[#6b6966] flex items-center">
                      quickprint.in/kiosk/
                    </span>
                    <input
                      required
                      type="text"
                      name="slug"
                      placeholder="shiva-print-hub"
                      value={formData.slug}
                      onChange={handleChange}
                      className="w-full h-11 px-3 rounded-r bg-[#f4f4f1] border border-[#dadad7] text-[13px] font-mono text-[#1c1b1f] outline-none focus:border-[#ff5a1f]"
                    />
                  </div>
                </div>
              </div>

              {/* Selected Plan Summary */}
              <div className="p-3 bg-[#f4f4f1] rounded border border-[#e6e5df] flex items-center justify-between text-[13px] mt-2">
                <div>
                  <span className="font-bold text-[#1c1b1f] block">
                    QuickPrint Pro Plan (Flat)
                  </span>
                  <span className="text-[11px] font-mono text-[#1b7a4d]">
                    14 Days Free • Then ₹499/month
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold bg-white px-2 py-1 rounded border border-[#e6e5df] text-[#1c1b1f]">
                  SELECTED
                </span>
              </div>

              {/* Mandatory Legal & EULA Checkbox (Unchecked by Default) */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-[12px] text-[#4a4845] leading-snug">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-[#dadad7] text-[#ff5a1f] focus:ring-[#ff5a1f]"
                  />
                  <span>
                    I agree to the{' '}
                    <Link
                      href="/terms"
                      target="_blank"
                      className="font-bold text-[#ff5a1f] underline hover:text-[#e04b14]"
                    >
                      End User License Agreement (EULA)
                    </Link>{' '}
                    and{' '}
                    <Link
                      href="/terms"
                      target="_blank"
                      className="font-bold text-[#ff5a1f] underline hover:text-[#e04b14]"
                    >
                      Terms of Service & Privacy Policy
                    </Link>
                    . Customer files are purged automatically after physical spooling.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !agreedToTerms}
                className={`w-full h-12 rounded font-bold text-[14px] flex items-center justify-center gap-2 shadow-sm transition-all btn-tactile mt-2 ${
                  !agreedToTerms
                    ? 'bg-[#dadad7] text-[#6b6966] cursor-not-allowed'
                    : 'bg-[#ff5a1f] hover:bg-[#e04b14] active:scale-[0.99] text-white'
                }`}
              >
                <span>{loading ? 'Creating Your Account...' : 'Continue to Price Setup'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </TicketCard>
      </div>
    </div>
  );
}
