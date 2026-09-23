'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Store,
  User,
  Phone,
  Mail,
  MapPin,
  QrCode,
  DollarSign,
  Palette,
  Layers,
  Save,
  CheckCircle2,
  AlertCircle,
  Download,
  Terminal,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { TicketCard } from '@/components/TicketCard';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { PriceConfig } from '@/types/database';

export default function ShopSettingsPage() {
  const { shop, owner, refreshShop, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'pricing' | 'agent' | 'subscription'>('profile');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Shop Profile Form State
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [slug, setSlug] = useState('');

  // Pricing Form State
  const [bwRate, setBwRate] = useState(2.0);
  const [colorRate, setColorRate] = useState(10.0);
  const [a3Extra, setA3Extra] = useState(4.0);
  const [passportRate, setPassportRate] = useState(30.0);
  const [legalExtra, setLegalExtra] = useState(2.0);
  const [taxPercentage, setTaxPercentage] = useState(0);

  // Populate from active shop
  useEffect(() => {
    if (shop) {
      setShopName(shop.name || '');
      setAddress(shop.address || '');
      setSlug(shop.qr_code_slug || '');

      const cfg = shop.price_config as PriceConfig;
      if (cfg?.rates) {
        setBwRate(cfg.rates.bw ?? 2.0);
        setColorRate(cfg.rates.color ?? 10.0);
      }
      if (cfg?.paperSizes) {
        setA3Extra(cfg.paperSizes.a3?.extra ?? 4.0);
        setPassportRate(cfg.paperSizes.passport?.extra ?? 30.0);
        setLegalExtra(cfg.paperSizes.custom?.extra ?? 2.0);
      }
      setTaxPercentage(cfg?.taxPercentage ?? 0);
    }
    if (owner) {
      setOwnerName(owner.name || '');
      setPhone(owner.phone || '');
    }
  }, [shop, owner]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop?.id) return;
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      // 1. Update Shop
      const { error: shopErr } = await supabase
        .from('shops')
        .update({
          name: shopName.trim(),
          address: address.trim(),
          qr_code_slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        })
        .eq('id', shop.id);

      if (shopErr) throw shopErr;

      // 2. Update Owner
      if (owner?.id) {
        await supabase
          .from('owners')
          .update({
            name: ownerName.trim(),
            phone: phone.trim(),
          })
          .eq('id', owner.id);
      }

      await refreshShop();
      setSuccessMsg('Shop profile details updated successfully!');
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop?.id) return;
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const updatedPriceConfig: PriceConfig = {
        currency: 'INR',
        currencySymbol: '₹',
        rates: {
          bw: bwRate,
          color: colorRate,
        },
        paperSizes: {
          a4: { name: 'A4', extra: 0, description: 'Standard 75 GSM' },
          a3: { name: 'A3', extra: a3Extra, description: 'Large Sheet' },
          passport: { name: 'Passport (8×)', extra: passportRate, description: 'Glossy Sheet' },
          custom: { name: 'Custom / Legal', extra: legalExtra, description: 'Legal/Bond' },
        },
        duplexDiscount: 0,
        taxPercentage,
      };

      const { error: priceErr } = await supabase
        .from('shops')
        .update({ price_config: updatedPriceConfig })
        .eq('id', shop.id);

      if (priceErr) throw priceErr;

      await refreshShop();
      setSuccessMsg('Price configuration updated! Customers will now see these rates.');
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update pricing');
    } finally {
      setSaving(false);
    }
  };

  const kioskUrl = shop?.qr_code_slug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/kiosk/${shop.qr_code_slug}`
    : '';

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-bold text-[#1c1b1f]">
          Shop Settings & Profile Hub
        </h1>
        <p className="text-[13px] text-[#6b6966] mt-0.5 font-sans">
          Manage your counter information, price list, local agent downloads, and subscription.
        </p>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-3.5 bg-[#e6f7ee] border border-[#1b7a4d] rounded-lg text-[#0b4e2f] text-[13px] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1b7a4d]" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-[#ffdad6] border border-[#ba1a1a] rounded-lg text-[#93000a] text-[13px] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#ba1a1a]" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e6e5df] pb-px overflow-x-auto">
        {[
          { id: 'profile', label: 'Shop Details & QR', icon: Store },
          { id: 'pricing', label: 'Price List Configuration', icon: DollarSign },
          { id: 'agent', label: 'Print Agent & Hardware', icon: Terminal },
          { id: 'subscription', label: 'Plan & Billing', icon: ShieldCheck },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSuccessMsg(null);
                setErrorMsg(null);
              }}
              className={`px-4 py-2.5 text-[13px] font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-[#ff5a1f] text-[#ff5a1f]'
                  : 'border-transparent text-[#6b6966] hover:text-[#1c1b1f]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Shop Profile */}
      {activeTab === 'profile' && (
        <TicketCard>
          <div className="p-6 bg-white">
            <h2 className="text-[17px] font-bold text-[#1c1b1f]">
              Shop Profile & Location
            </h2>
            <p className="text-[12px] text-[#6b6966] mt-0.5">
              These details appear on your customer receipts and kiosk chits.
            </p>

            <form onSubmit={handleSaveProfile} className="mt-5 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#1c1b1f] block mb-1">
                    SHOP NAME
                  </label>
                  <input
                    required
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full h-11 px-3 rounded bg-[#f4f4f1] border border-[#dadad7] text-[13px] text-[#1c1b1f] outline-none focus:border-[#ff5a1f]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#1c1b1f] block mb-1">
                    OWNER / OPERATOR NAME
                  </label>
                  <input
                    required
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full h-11 px-3 rounded bg-[#f4f4f1] border border-[#dadad7] text-[13px] text-[#1c1b1f] outline-none focus:border-[#ff5a1f]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#1c1b1f] block mb-1">
                    PHONE / WHATSAPP (FOR ALERTS)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-11 px-3 rounded bg-[#f4f4f1] border border-[#dadad7] text-[13px] text-[#1c1b1f] outline-none focus:border-[#ff5a1f]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#1c1b1f] block mb-1">
                    SHOP QR SLUG (URL)
                  </label>
                  <input
                    required
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full h-11 px-3 rounded bg-[#f4f4f1] border border-[#dadad7] text-[13px] font-mono text-[#1c1b1f] outline-none focus:border-[#ff5a1f]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#1c1b1f] block mb-1">
                  SHOP COUNTER ADDRESS
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-3 rounded bg-[#f4f4f1] border border-[#dadad7] text-[13px] text-[#1c1b1f] outline-none focus:border-[#ff5a1f]"
                />
              </div>

              {kioskUrl && (
                <div className="p-3 rounded bg-[#f4f4f1] border border-[#e6e5df] flex items-center justify-between text-[12px] font-mono">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-[#ff5a1f]" />
                    <span className="text-[#6b6966]">Live Customer URL:</span>
                    <span className="font-bold text-[#1c1b1f]">{kioskUrl}</span>
                  </div>
                  <a
                    href={kioskUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#ff5a1f] font-bold hover:underline flex items-center gap-1"
                  >
                    <span>Test Kiosk</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="h-11 px-6 rounded bg-[#1c1b1f] hover:bg-[#333] active:scale-95 text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-sm transition-all btn-tactile self-start mt-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </form>
          </div>
        </TicketCard>
      )}

      {/* TAB 2: Pricing Configuration */}
      {activeTab === 'pricing' && (
        <TicketCard>
          <div className="p-6 bg-white">
            <h2 className="text-[17px] font-bold text-[#1c1b1f]">
              Live Counter Price List
            </h2>
            <p className="text-[12px] text-[#6b6966] mt-0.5">
              Configure rates per page and paper formats. Changes reflect immediately on
              customer mobile screens.
            </p>

            <form onSubmit={handleSavePricing} className="mt-5 flex flex-col gap-4">
              {/* Base Rates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-[#f4f4f1] rounded-lg border border-[#e6e5df]">
                  <span className="text-[11px] font-mono uppercase font-bold text-[#6b6966] block">
                    BLACK & WHITE (RATE / PAGE)
                  </span>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="font-mono text-[20px] font-bold text-[#1c1b1f]">
                      ₹
                    </span>
                    <input
                      required
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={bwRate}
                      onChange={(e) => setBwRate(parseFloat(e.target.value) || 0)}
                      className="w-full font-mono text-[22px] font-bold text-[#1c1b1f] bg-transparent outline-none"
                    />
                  </div>
                </div>

                <div className="p-4 bg-[#f4f4f1] rounded-lg border border-[#e6e5df]">
                  <span className="text-[11px] font-mono uppercase font-bold text-[#ff5a1f] block">
                    FULL COLOR (RATE / PAGE)
                  </span>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="font-mono text-[20px] font-bold text-[#ff5a1f]">
                      ₹
                    </span>
                    <input
                      required
                      type="number"
                      step="1"
                      min="1"
                      value={colorRate}
                      onChange={(e) => setColorRate(parseFloat(e.target.value) || 0)}
                      className="w-full font-mono text-[22px] font-bold text-[#ff5a1f] bg-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Surcharges */}
              <div className="space-y-3 pt-2">
                <span className="text-[12px] font-mono uppercase font-bold text-[#1c1b1f] block">
                  PAPER FORMAT SURCHARGES
                </span>

                <div className="flex items-center justify-between p-3.5 bg-[#fafaf7] rounded border border-[#e6e5df]">
                  <div>
                    <span className="text-[13px] font-bold text-[#1c1b1f] block">
                      A3 Large Sheet Extra Surcharge
                    </span>
                    <span className="text-[11px] font-mono text-[#6b6966]">
                      Additional cost per impression over base rate
                    </span>
                  </div>
                  <div className="flex items-center gap-1 w-24">
                    <span className="font-mono text-[14px] text-[#6b6966]">+₹</span>
                    <input
                      type="number"
                      step="1"
                      value={a3Extra}
                      onChange={(e) => setA3Extra(parseFloat(e.target.value) || 0)}
                      className="w-full font-mono font-bold text-[16px] text-right bg-transparent outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-[#fafaf7] rounded border border-[#e6e5df]">
                  <div>
                    <span className="text-[13px] font-bold text-[#1c1b1f] block">
                      Passport Photos (8× Glossy Sheet)
                    </span>
                    <span className="text-[11px] font-mono text-[#6b6966]">
                      Total price per photo pack
                    </span>
                  </div>
                  <div className="flex items-center gap-1 w-24">
                    <span className="font-mono text-[14px] text-[#6b6966]">₹</span>
                    <input
                      type="number"
                      step="5"
                      value={passportRate}
                      onChange={(e) => setPassportRate(parseFloat(e.target.value) || 0)}
                      className="w-full font-mono font-bold text-[16px] text-right bg-transparent outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-[#fafaf7] rounded border border-[#e6e5df]">
                  <div>
                    <span className="text-[13px] font-bold text-[#1c1b1f] block">
                      Custom Legal / Bond Paper Extra
                    </span>
                    <span className="text-[11px] font-mono text-[#6b6966]">
                      Heavy stock surcharge
                    </span>
                  </div>
                  <div className="flex items-center gap-1 w-24">
                    <span className="font-mono text-[14px] text-[#6b6966]">+₹</span>
                    <input
                      type="number"
                      step="1"
                      value={legalExtra}
                      onChange={(e) => setLegalExtra(parseFloat(e.target.value) || 0)}
                      className="w-full font-mono font-bold text-[16px] text-right bg-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="h-11 px-6 rounded bg-[#ff5a1f] hover:bg-[#e04b14] active:scale-95 text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-sm transition-all btn-tactile self-start mt-3"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Update Price Config'}</span>
              </button>
            </form>
          </div>
        </TicketCard>
      )}

      {/* TAB 3: Agent & Hardware */}
      {activeTab === 'agent' && (
        <TicketCard>
          <div className="p-6 bg-white flex flex-col gap-5">
            <div>
              <h2 className="text-[18px] font-bold text-[#1c1b1f]">
                Local Windows Print Agent Service
              </h2>
              <p className="text-[13px] text-[#6b6966] mt-1 leading-relaxed">
                To automate printing on your physical counter printer, run our lightweight
                Node.js agent on the Windows PC connected to your printer.
              </p>
            </div>

            {/* Pre-Configured Download Box */}
            <div className="p-5 bg-[#fafaf7] rounded-lg border-2 border-[#1c1b1f] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold text-[#1c1b1f]">
                    Pre-Configured Agent Package for {shop?.name || 'Your Shop'}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#1b7a4d] text-white">
                    READY TO RUN
                  </span>
                </div>
                <span className="text-[12px] font-mono text-[#6b6966] block mt-1">
                  Shop ID: <code className="text-[#1c1b1f] font-bold">{shop?.id || 'Configured'}</code> • Includes <code className="text-[#ff5a1f]">start-agent.bat</code>
                </span>
              </div>

              {shop?.id && (
                <a
                  href={`/api/agent/download?shopId=${shop.id}`}
                  download
                  className="h-11 px-5 rounded bg-[#ff5a1f] hover:bg-[#e04b14] active:scale-95 text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-xs transition-all shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download ZIP Package</span>
                </a>
              )}
            </div>

            {/* Quick Summary: When, Where, How */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-4 bg-[#f4f4f1] rounded-lg border border-[#e6e5df]">
                <span className="font-bold text-[13px] text-[#1c1b1f] block mb-1">
                  1. When to Download?
                </span>
                <p className="text-[12px] text-[#6b6966]">
                  Download on the PC physically connected to your printer right after signing up.
                </p>
              </div>

              <div className="p-4 bg-[#f4f4f1] rounded-lg border border-[#e6e5df]">
                <span className="font-bold text-[13px] text-[#1c1b1f] block mb-1">
                  2. Where to Download?
                </span>
                <p className="text-[12px] text-[#6b6966]">
                  Click the <strong>Download ZIP</strong> button above. Your shop configuration is pre-filled.
                </p>
              </div>

              <div className="p-4 bg-[#f4f4f1] rounded-lg border border-[#e6e5df]">
                <span className="font-bold text-[13px] text-[#1c1b1f] block mb-1">
                  3. How to Launch?
                </span>
                <p className="text-[12px] text-[#6b6966]">
                  Extract the ZIP file and double-click <code className="font-mono text-[#ff5a1f]">start-agent.bat</code>.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-[#e6e5df]">
              <Link
                href="/dashboard/agent-setup"
                className="text-[13px] font-bold text-[#ff5a1f] hover:underline flex items-center gap-1.5"
              >
                <span>Read Full Step-by-Step Installation Guide & FAQs</span>
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </TicketCard>
      )}

      {/* TAB 4: Subscription */}
      {activeTab === 'subscription' && (
        <TicketCard>
          <div className="p-6 bg-white flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-bold text-[#1c1b1f]">
                  Subscription & Billing
                </h2>
                <span className="text-[12px] font-mono text-[#1b7a4d] font-bold">
                  PLAN: QUICKPRINT PRO KIOSK
                </span>
              </div>
              <span className="font-mono text-[22px] font-bold text-[#1c1b1f]">
                ₹499<span className="text-[13px] text-[#6b6966]">/month</span>
              </span>
            </div>

            <div className="p-4 bg-[#f4f4f1] rounded-lg border border-[#e6e5df] text-[13px] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#6b6966]">Subscription Status:</span>
                <span className="font-bold text-[#1b7a4d] font-mono uppercase">
                  ACTIVE 14-DAY TRIAL
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6b6966]">Per-Print Commission:</span>
                <span className="font-bold text-[#1c1b1f] font-mono">
                  0% (You keep 100% of print revenue)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6b6966]">Next Billing Date:</span>
                <span className="font-mono text-[#1c1b1f]">
                  {new Date(Date.now() + 14 * 86400000).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </TicketCard>
      )}
    </div>
  );
}
