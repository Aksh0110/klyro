'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { CreditCard, Plus, Search, RefreshCcw, X, Loader2, Calendar } from 'lucide-react';
import { QuickActionModal } from '@/components/QuickActionModal';

export default function PaymentsPage() {
  const router = useRouter();
  const { activeOrgId } = useAuth();

  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UPI' | 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'REFUNDED'>('ALL');

  // Modal States
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [refundPaymentObj, setRefundPaymentObj] = useState<any | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundNotes, setRefundNotes] = useState<string>('');
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState('');

  useEffect(() => {
    if (activeOrgId) {
      fetchPayments();
    }
  }, [activeOrgId]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<any[]>('/payments', {}, activeOrgId || undefined);
      if (data) setPayments(Array.isArray(data) ? data : (data as any)?.data || []);
    } catch {
      console.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const openRefundModal = (payment: any) => {
    setRefundPaymentObj(payment);
    const max = payment.amount - (payment.refundedAmount || 0);
    setRefundAmount(max.toString());
    setRefundNotes('');
    setRefundError('');
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundPaymentObj || !refundAmount || parseFloat(refundAmount) <= 0) return;
    setRefunding(true);
    setRefundError('');

    try {
      await apiRequest(
        `/payments/${refundPaymentObj._id}/refund`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: parseFloat(refundAmount),
            notes: refundNotes || undefined,
          }),
        },
        activeOrgId || undefined,
      );

      setRefundPaymentObj(null);
      fetchPayments();
    } catch (err: any) {
      setRefundError(err.message || 'Refund processing failed');
    } finally {
      setRefunding(false);
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const custName = p.customerId
        ? typeof p.customerId === 'object'
          ? `${p.customerId.firstName} ${p.customerId.lastName || ''}`.toLowerCase()
          : ''
        : '';
      const invNum = p.invoiceId?.invoiceNumber?.toLowerCase() || '';
      const ref = p.reference?.toLowerCase() || '';
      const q = search.toLowerCase();
      const matchesSearch = !q || custName.includes(q) || invNum.includes(q) || ref.includes(q);

      let matchesFilter = true;
      if (activeFilter === 'REFUNDED') {
        matchesFilter = p.refundedAmount > 0 || p.status === 'REFUNDED';
      } else if (activeFilter !== 'ALL') {
        matchesFilter = p.method === activeFilter;
      }

      return matchesSearch && matchesFilter;
    });
  }, [payments, search, activeFilter]);

  const totalCollected = useMemo(() => {
    return filteredPayments.reduce((acc, p) => acc + (p.amount || 0) - (p.refundedAmount || 0), 0);
  }, [filteredPayments]);

  return (
    <AppShell>
      <div className="space-y-4 max-w-4xl mx-auto pb-6">
        {/* Header & Quick Action Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-[#d4e4fa]">Money Logs</h1>
            <p className="text-xs text-[#958ea0]">
              Total: <span className="font-bold text-[#4edea3]">₹{totalCollected.toLocaleString()}</span> ({filteredPayments.length} transactions)
            </p>
          </div>
          <button
            onClick={() => setShowQuickModal(true)}
            className="w-10 h-10 rounded-full bg-[#d0bcff] text-[#3c0091] flex items-center justify-center font-bold shadow-lg hover:bg-[#d0bcff]/90 active:scale-95 transition-all"
            title="Record Payment"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#958ea0]" />
          <input
            type="text"
            placeholder="Search by member name, invoice #, or ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#122131] border border-[#273647] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#d4e4fa] placeholder:text-[#958ea0] focus:outline-none focus:border-[#d0bcff] transition-all"
          />
        </div>

        {/* Filter Pills (Matching Members Section Format) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'UPI', label: 'UPI' },
            { id: 'CASH', label: 'Cash' },
            { id: 'CARD', label: 'Card' },
            { id: 'BANK_TRANSFER', label: 'Bank' },
            { id: 'REFUNDED', label: 'Refunded' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${
                activeFilter === tab.id
                  ? 'bg-[#1c2b3c] border-[#d0bcff] text-[#d4e4fa]'
                  : 'bg-[#122131] border-[#273647] text-[#958ea0] hover:text-[#d4e4fa]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Payment Logs List */}
        {loading ? (
          <div className="py-12 text-center text-xs text-[#958ea0]">Loading payment logs...</div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[#273647] rounded-2xl bg-[#122131]/50 space-y-3">
            <CreditCard className="w-10 h-10 mx-auto text-[#958ea0]" />
            <h3 className="text-sm font-bold text-[#d4e4fa]">No payment logs found</h3>
            <p className="text-xs text-[#958ea0] max-w-xs mx-auto">
              {search || activeFilter !== 'ALL'
                ? 'No payment logs match your current search or filter.'
                : 'Collect payments from members to see logs here.'}
            </p>
            <button
              onClick={() => setShowQuickModal(true)}
              className="px-4 py-2 rounded-xl bg-[#d0bcff] text-[#3c0091] font-bold text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredPayments.map((p) => {
              const custName = p.customerId
                ? typeof p.customerId === 'object'
                  ? `${p.customerId.firstName} ${p.customerId.lastName || ''}`.trim()
                  : 'Member'
                : 'Member';
              const custCode = p.customerId?.customerCode;
              const dateStr = p.paidAt
                ? new Date(p.paidAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Recent';
              const timeStr = p.paidAt
                ? new Date(p.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
              const custId = typeof p.customerId === 'object' ? p.customerId?._id : p.customerId;
              const maxRefundable = p.amount - (p.refundedAmount || 0);

              return (
                <div
                  key={p._id}
                  onClick={() => custId && router.push(`/customers/${custId}`)}
                  className="p-3.5 rounded-2xl bg-[#122131] border border-[#273647] space-y-2 shadow-sm hover:border-[#d0bcff]/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#4edea3]/10 text-[#4edea3] flex items-center justify-center font-bold text-xs flex-shrink-0 group-hover:border group-hover:border-[#d0bcff]/40 transition-all">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xs text-[#d4e4fa] leading-snug group-hover:text-[#d0bcff] transition-colors">
                          {custName} {custCode && <span className="text-[10px] text-[#958ea0] font-mono">({custCode})</span>}
                        </h3>
                        <p className="text-[10px] text-[#958ea0] flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-[#958ea0]" />
                          <span>{dateStr} {timeStr && `• ${timeStr}`}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-extrabold text-[#4edea3]">
                        +₹{p.amount?.toLocaleString()}
                      </div>
                      {p.refundedAmount > 0 && (
                        <div className="text-[10px] font-bold text-[#ffb4ab]">
                          -₹{p.refundedAmount?.toLocaleString()} refunded
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#273647] flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-[#1c2b3c] border border-[#273647] text-[#d4e4fa] font-bold text-[10px]">
                        {p.method}
                      </span>
                      {p.invoiceId?.invoiceNumber && (
                        <span className="font-mono text-[#958ea0] text-[10px]">
                          {p.invoiceId.invoiceNumber}
                        </span>
                      )}
                      {p.reference && (
                        <span className="font-mono text-[#958ea0] text-[10px] truncate max-w-[100px]">
                          Ref: {p.reference}
                        </span>
                      )}
                    </div>

                    <div>
                      {maxRefundable > 0 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openRefundModal(p);
                          }}
                          className="text-[10px] font-bold text-[#958ea0] hover:text-[#ffb4ab] flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-[#1c2b3c]"
                        >
                          <RefreshCcw className="w-3 h-3" />
                          <span>Refund</span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-[#ffb4ab] px-2 py-0.5 rounded-full bg-[#ffb4ab]/10 border border-[#ffb4ab]/20">
                          Refunded
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Record Payment Quick Modal */}
      <QuickActionModal
        isOpen={showQuickModal}
        onClose={() => {
          setShowQuickModal(false);
          fetchPayments();
        }}
        initialTab="payment"
      />

      {/* Process Refund Modal */}
      {refundPaymentObj && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#122131] border border-[#273647] rounded-2xl p-4 w-full max-w-sm shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#273647] pb-2.5">
              <h3 className="text-sm font-bold text-[#d4e4fa] flex items-center gap-1.5">
                <RefreshCcw className="w-4 h-4 text-[#ffb4ab]" />
                Process Payment Refund
              </h3>
              <button onClick={() => setRefundPaymentObj(null)} className="text-[#958ea0] hover:text-[#d4e4fa]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {refundError && (
              <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                {refundError}
              </div>
            )}

            <div className="p-2.5 rounded-xl bg-[#0d1c2d] border border-[#273647] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#958ea0]">Original Payment:</span>
                <span className="font-bold text-[#d4e4fa]">₹{refundPaymentObj.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#958ea0]">Max Refundable:</span>
                <span className="font-bold text-[#4edea3]">
                  ₹{refundPaymentObj.amount - (refundPaymentObj.refundedAmount || 0)}
                </span>
              </div>
            </div>

            <form onSubmit={handleProcessRefund} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-[#958ea0] uppercase mb-1">
                  Refund Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={refundPaymentObj.amount - (refundPaymentObj.refundedAmount || 0)}
                  step="any"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#1c2b3c] border border-[#273647] rounded-xl text-xs text-[#d4e4fa] focus:outline-none focus:border-[#d0bcff] font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#958ea0] uppercase mb-1">
                  Reason / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Member cancellation"
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#1c2b3c] border border-[#273647] rounded-xl text-xs text-[#d4e4fa] focus:outline-none focus:border-[#d0bcff]"
                />
              </div>

              <div className="pt-2 border-t border-[#273647] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRefundPaymentObj(null)}
                  className="px-3 py-1.5 bg-[#1c2b3c] text-[#958ea0] hover:text-[#d4e4fa] font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refunding}
                  className="px-4 py-1.5 bg-[#ffb4ab] text-[#690005] font-extrabold rounded-xl text-xs hover:bg-[#ffb4ab]/90 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {refunding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Refund</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
