'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DollarSign,
  Palette,
  Layers,
  ArrowRight,
  Printer,
  Check,
} from 'lucide-react';
import { TicketCard } from '@/components/TicketCard';
import { supabase } from '@/lib/supabase/client';

function PricingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopId = searchParams.get('shopId') || '';

  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState({
    bwRate: 2.0,
    colorRate: 10.0,
    a3Extra: 4.0,
    passportRate: 30.0,
    legalExtra: 2.0,
  });

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const priceConfig = {
        currency: 'INR',
        currencySymbol: '₹',
        rates: {
          bw: rates.bwRate,
          color: rates.colorRate,
        },
        paperSizes: {
          a4: { name: 'A4', extra: 0, description: 'Standard 75 GSM' },
          a3: { name: 'A3', extra: rates.a3Extra, description: 'Large Sheet' },
          passport: { name: 'Passport (8×)', extra: rates.passportRate, description: 'Glossy Sheet' },
          custom: { name: 'Custom / Legal', extra: rates.legalExtra, description: 'Legal/Bond' },
        },
        duplexDiscount: 0,
        taxPercentage: 0,
      };

      if (shopId) {
        await supabase
          .from('shops')
          .update({ price_config: priceConfig })
          .eq('id', shopId);
      }

      router.push(`/onboarding/step-2-agent?shopId=${shopId}`);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <TicketCard>
      <div className="p-6 bg-white">
        <h1 className="text-[22px] font-bold text-[#1c1b1f]">
          Set Your Shop Price List
        </h1>
        <p className="text-[13px] text-[#6b6966] mt-0.5">
          Customers will see these exact prices calculated dynamically when
          ordering prints. You can adjust them anytime later.
        </p>

        <form onSubmit={handleSavePricing} className="mt-6 flex flex-col gap-5">
          {/* B&W and Color Base Rates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-[#f4f4f1] rounded border border-[#e6e5df]">
              <span className="text-[11px] font-mono uppercase font-bold text-[#6b6966] block">
                B&W RATE / PAGE
              </span>
              <div className="flex items-center gap-1 mt-1.5">
                <span className="font-mono text-[16px] font-bold text-[#1c1b1f]">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={rates.bwRate}
                  onChange={(e) =>
                    setRates({ ...rates, bwRate: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full font-mono text-[20px] font-bold text-[#1c1b1f] bg-transparent outline-none"
                />
              </div>
            </div>

            <div className="p-3.5 bg-[#f4f4f1] rounded border border-[#e6e5df]">
              <span className="text-[11px] font-mono uppercase font-bold text-[#ff5a1f] block">
                COLOR RATE / PAGE
              </span>
              <div className="flex items-center gap-1 mt-1.5">
                <span className="font-mono text-[16px] font-bold text-[#ff5a1f]">
                  ₹
                </span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={rates.colorRate}
                  onChange={(e) =>
                    setRates({ ...rates, colorRate: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full font-mono text-[20px] font-bold text-[#ff5a1f] bg-transparent outline-none"
                />
              </div>
            </div>
          </div>

          {/* Paper Add-ons */}
          <div className="space-y-3 pt-2">
            <span className="text-[12px] font-mono uppercase font-bold text-[#1c1b1f] block">
              PAPER SIZE SURCHARGES
            </span>

            <div className="flex items-center justify-between p-3 bg-[#fafaf7] rounded border border-[#e6e5df]">
              <div>
                <span className="text-[13px] font-bold text-[#1c1b1f] block">
                  A3 Large Sheet Extra
                </span>
                <span className="text-[11px] font-mono text-[#6b6966]">
                  Additional cost over base page price
                </span>
              </div>
              <div className="flex items-center gap-1 w-24">
                <span className="font-mono text-[14px] text-[#6b6966]">+₹</span>
                <input
                  type="number"
                  step="1"
                  value={rates.a3Extra}
                  onChange={(e) =>
                    setRates({ ...rates, a3Extra: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full font-mono font-bold text-[16px] text-right bg-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#fafaf7] rounded border border-[#e6e5df]">
              <div>
                <span className="text-[13px] font-bold text-[#1c1b1f] block">
                  Passport Photos (8× Sheet)
                </span>
                <span className="text-[11px] font-mono text-[#6b6966]">
                  Glossy photo paper pack
                </span>
              </div>
              <div className="flex items-center gap-1 w-24">
                <span className="font-mono text-[14px] text-[#6b6966]">₹</span>
                <input
                  type="number"
                  step="5"
                  value={rates.passportRate}
                  onChange={(e) =>
                    setRates({
                      ...rates,
                      passportRate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full font-mono font-bold text-[16px] text-right bg-transparent outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded bg-[#ff5a1f] hover:bg-[#e04b14] active:scale-[0.99] text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-sm transition-all btn-tactile mt-4"
          >
            <span>{loading ? 'Saving...' : 'Save & Continue to Agent Setup'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </TicketCard>
  );
}

export default function OnboardingPricingPage() {
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
          <span className="text-[12px] font-mono text-[#6b6966]">
            STEP 1 OF 2
          </span>
        </div>

        <Suspense fallback={<div className="p-12 text-center font-mono text-[13px]">Loading pricing config...</div>}>
          <PricingForm />
        </Suspense>
      </div>
    </div>
  );
}
