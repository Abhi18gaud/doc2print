'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Banknote,
  CreditCard,
  Printer,
  Calendar,
  Download,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { Job, Payment } from '@/types/database';

export default function DashboardEarningsPage() {
  const { shop, loading: authLoading } = useAuth();
  const shopId = shop?.id;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId) {
      if (!authLoading) setLoading(false);
      return;
    }

    async function loadData() {
      try {
        const { data } = await supabase
          .from('jobs')
          .select('*')
          .eq('shop_id', shopId)
          .eq('payment_status', 'paid')
          .order('created_at', { ascending: false });

        setJobs(data || []);
      } catch (e) {
        console.error('Error loading earnings:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [shopId, authLoading]);

  const totalCash = jobs
    .filter((j) => j.payment_mode === 'cash')
    .reduce((sum, j) => sum + (j.price || 0), 0);

  const totalOnline = jobs
    .filter((j) => j.payment_mode === 'online')
    .reduce((sum, j) => sum + (j.price || 0), 0);

  const grossTotal = totalCash + totalOnline;
  const totalImpressions = jobs.reduce((sum, j) => sum + j.pages * j.copies, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-bold text-[#1c1b1f]">
            Daily Earnings & Cash Register
          </h2>
          <span className="text-[12px] font-mono text-[#6b6966]">
            Realtime register reconciliation for {shop?.name || 'Your Shop'} • {new Date().toLocaleDateString()}
          </span>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-3 py-2 rounded bg-white border border-[#e6e5df] text-[12px] font-mono font-bold text-[#1c1b1f] hover:bg-[#f4f4f1] flex items-center gap-1.5 shadow-xs"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Register Slip</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg border border-[#e6e5df] shadow-xs flex flex-col">
          <div className="flex items-center justify-between text-[#6b6966] text-[12px] font-mono font-bold">
            <span>GROSS COLLECTION</span>
            <DollarSign className="w-4 h-4 text-[#ff5a1f]" />
          </div>
          <span className="text-[32px] font-mono font-bold text-[#1c1b1f] mt-1">
            ₹{grossTotal.toFixed(2)}
          </span>
          <span className="text-[11px] font-mono text-[#1b7a4d] mt-1 font-semibold">
            {jobs.length} paid jobs ({totalImpressions} prints)
          </span>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#e6e5df] shadow-xs flex flex-col">
          <div className="flex items-center justify-between text-[#6b6966] text-[12px] font-mono font-bold">
            <span>CASH IN DRAWER</span>
            <Banknote className="w-4 h-4 text-[#1c1b1f]" />
          </div>
          <span className="text-[32px] font-mono font-bold text-[#1c1b1f] mt-1">
            ₹{totalCash.toFixed(2)}
          </span>
          <span className="text-[11px] font-mono text-[#6b6966] mt-1">
            {jobs.filter((j) => j.payment_mode === 'cash').length} physical counter receipts
          </span>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#e6e5df] shadow-xs flex flex-col">
          <div className="flex items-center justify-between text-[#6b6966] text-[12px] font-mono font-bold">
            <span>ONLINE UPI / CASHFREE</span>
            <CreditCard className="w-4 h-4 text-[#ff5a1f]" />
          </div>
          <span className="text-[32px] font-mono font-bold text-[#ff5a1f] mt-1">
            ₹{totalOnline.toFixed(2)}
          </span>
          <span className="text-[11px] font-mono text-[#1b7a4d] mt-1 font-semibold">
            Direct to bank settlement
          </span>
        </div>
      </div>

      {/* Transactions Register */}
      <div className="bg-white rounded-lg border border-[#e6e5df] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#e6e5df] flex items-center justify-between bg-[#fafaf7]">
          <span className="text-[13px] font-mono font-bold text-[#1c1b1f]">
            SETTLED TRANSACTIONS LEDGER
          </span>
          <span className="text-[11px] font-mono text-[#6b6966]">
            Showing today&apos;s activity
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[13px] font-mono text-[#6b6966]">
            Loading ledger...
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center text-[13px] font-mono text-[#6b6966]">
            No settled transactions recorded yet today.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#f4f4f1] text-[#6b6966] font-mono text-[11px] uppercase border-b border-[#e6e5df]">
                <tr>
                  <th className="p-3 pl-4">Token #</th>
                  <th className="p-3">File / Details</th>
                  <th className="p-3">Payment Mode</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3 pr-4 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f4f4f1]">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-[#fafaf7]">
                    <td className="p-3 pl-4 font-mono font-bold text-[#1c1b1f]">
                      #{job.token_number}
                    </td>
                    <td className="p-3 font-mono">
                      <span className="font-bold text-[#1c1b1f] block truncate max-w-xs">
                        {job.file_name}
                      </span>
                      <span className="text-[11px] text-[#6b6966]">
                        {job.pages}p • {job.copies}c • {job.paper_size.toUpperCase()} •{' '}
                        {job.color_mode}
                      </span>
                    </td>
                    <td className="p-3 font-mono">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                          job.payment_mode === 'cash'
                            ? 'bg-[#e8e8e5] text-[#1c1b1f]'
                            : 'bg-[#ff5a1f]/10 text-[#ff5a1f]'
                        }`}
                      >
                        {job.payment_mode.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-[#1c1b1f]">
                      ₹{job.price?.toFixed(2)}
                    </td>
                    <td className="p-3 pr-4 font-mono text-[#6b6966] text-right text-[12px]">
                      {new Date(job.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
