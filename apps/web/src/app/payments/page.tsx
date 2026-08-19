'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { CreditCard, Plus, Search, RefreshCcw, CheckCircle, AlertTriangle, X, Loader2 } from 'lucide-react';

export default function PaymentsPage() {
  const { activeOrgId } = useAuth();

  const [payments, setPayments] = useState<any[]>([]);
  const [openInvoices, setOpenInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'OTHER'>('UPI');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeOrgId) {
      fetchPayments();
      fetchOpenInvoices();
    }
  }, [activeOrgId]);

  const fetchPayments = async () => {
    try {
      const data = await apiRequest<any[]>('/payments', {}, activeOrgId || undefined);
      if (data) setPayments(Array.isArray(data) ? data : (data as any)?.data || []);
    } catch {
      console.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchOpenInvoices = async () => {
    try {
      const data = await apiRequest<any[]>('/invoices', {}, activeOrgId || undefined);
      if (data) {
        const rawList = Array.isArray(data) ? data : (data as any)?.data || [];
        const nonPaid = rawList.filter((i: any) => i.status !== 'PAID' && i.status !== 'VOID');
        setOpenInvoices(nonPaid);
      }
    } catch {
      console.error('Failed to fetch open invoices');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId || !amount || parseFloat(amount) <= 0) return;
    setSubmitting(true);
    setError('');

    try {
      await apiRequest(
        '/payments',
        {
          method: 'POST',
          body: JSON.stringify({
            invoiceId: selectedInvoiceId,
            amount: parseFloat(amount),
            method,
            reference: reference || undefined,
            notes: notes || undefined,
          }),
        },
        activeOrgId || undefined,
      );

      setIsModalOpen(false);
      setSelectedInvoiceId('');
      setAmount('');
      setReference('');
      setNotes('');
      fetchPayments();
      fetchOpenInvoices();
    } catch (err: any) {
      setError(err.message || 'Payment recording failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefund = async (paymentId: string) => {
    if (!confirm('Are you sure you want to refund this payment?')) return;
    try {
      await apiRequest(`/payments/${paymentId}/refund`, { method: 'POST' }, activeOrgId || undefined);
      fetchPayments();
      fetchOpenInvoices();
    } catch {
      alert('Failed to process refund');
    }
  };

  const [methodFilter, setMethodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredPayments = payments.filter((p) => {
    const custName = p.customerId ? `${p.customerId.firstName} ${p.customerId.lastName || ''}`.toLowerCase() : '';
    const invNum = p.invoiceId?.invoiceNumber?.toLowerCase() || '';
    const ref = p.reference?.toLowerCase() || '';
    const q = search.toLowerCase();
    const matchesSearch = custName.includes(q) || invNum.includes(q) || ref.includes(q);

    const matchesMethod = methodFilter === 'ALL' || p.method === methodFilter;
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

    return matchesSearch && matchesMethod && matchesStatus;
  });

  return (
    <div className="flex min-h-screen bg-background text-foreground pb-16 md:pb-0">
      <Sidebar />

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gym Member Payments</h1>
            <p className="text-xs text-muted-foreground">Domain B — Record manual member payments (Cash, UPI, Card, Transfer)</p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/25 w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search payments by member name, invoice #, reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Methods</option>
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="OTHER">Other</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-sm">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No payment records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase">
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold">Member</th>
                    <th className="pb-3 font-semibold">Invoice #</th>
                    <th className="pb-3 font-semibold">Method</th>
                    <th className="pb-3 font-semibold">Amount</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPayments.map((p) => (
                    <tr key={p._id} className="hover:bg-secondary/20 transition-all">
                      <td className="py-4 font-medium text-xs">{new Date(p.paidAt).toLocaleDateString()}</td>
                      <td className="py-4">
                        <div className="font-semibold">
                          {p.customerId ? `${p.customerId.firstName} ${p.customerId.lastName || ''}` : 'Member'}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">{p.customerId?.customerCode}</div>
                      </td>
                      <td className="py-4 font-mono font-bold text-xs text-primary">{p.invoiceId?.invoiceNumber}</td>
                      <td className="py-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-foreground border border-border">
                          {p.method}
                        </span>
                        {p.reference && <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{p.reference}</div>}
                      </td>
                      <td className="py-4 font-extrabold text-emerald-600 dark:text-emerald-400">₹{p.amount}</td>
                      <td className="py-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            p.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : 'bg-destructive/10 text-destructive border border-destructive/20'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-4">
                        {p.status === 'SUCCESS' && (
                          <button
                            onClick={() => handleRefund(p._id)}
                            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 font-medium"
                          >
                            <RefreshCcw className="w-3.5 h-3.5" /> Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Record Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold">Record Manual Payment</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Select Open Invoice</label>
                <select
                  required
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Choose Invoice --</option>
                  {openInvoices.map((inv) => (
                    <option key={inv._id} value={inv._id}>
                      {inv.invoiceNumber} - {inv.customerId?.firstName} {inv.customerId?.lastName} (Total: ₹{inv.totalAmount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="e.g. 2000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Transaction Ref (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. UPI-123456789"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Additional notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-secondary text-foreground font-semibold rounded-xl text-sm hover:bg-secondary/80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
