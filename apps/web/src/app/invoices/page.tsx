'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { Search, Filter, CheckCircle2, Clock, AlertCircle, Loader2, CreditCard, User } from 'lucide-react';

export default function InvoicesPage() {
  const router = useRouter();
  const { activeOrgId, activeBranchId } = useAuth();

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected Invoice Detail Modal
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [invoiceDetails, setInvoiceDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (activeOrgId) fetchInvoices();
    const handleBranchChanged = () => {
      if (activeOrgId) fetchInvoices();
    };
    window.addEventListener('klyro_branch_changed', handleBranchChanged);
    return () => window.removeEventListener('klyro_branch_changed', handleBranchChanged);
  }, [activeOrgId, activeBranchId, statusFilter]);

  const fetchInvoices = async () => {
    try {
      const endpoint = statusFilter !== 'ALL' ? `/invoices?status=${statusFilter}` : '/invoices';
      const data = await apiRequest<any[]>(endpoint, {}, activeOrgId || undefined);
      if (data) setInvoices(Array.isArray(data) ? data : (data as any)?.data || []);
    } catch {
      console.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const openInvoiceModal = async (inv: any) => {
    setSelectedInvoice(inv);
    setLoadingDetails(true);
    try {
      const data = await apiRequest<any>(`/invoices/${inv._id}`, {}, activeOrgId || undefined);
      if (data) setInvoiceDetails(data);
    } catch {
      console.error('Failed to fetch invoice details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const custName = inv.customerId ? `${inv.customerId.firstName} ${inv.customerId.lastName || ''}`.toLowerCase() : '';
    const code = inv.customerId?.customerCode?.toLowerCase() || '';
    const invNum = inv.invoiceNumber.toLowerCase();
    const q = search.toLowerCase();
    return custName.includes(q) || code.includes(q) || invNum.includes(q);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5" /> Paid
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1 w-fit">
            <Clock className="w-3.5 h-3.5" /> Partially Paid
          </span>
        );
      case 'OPEN':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 flex items-center gap-1 w-fit">
            <AlertCircle className="w-3.5 h-3.5" /> Open
          </span>
        );
      default:
        return <span className="text-xs text-muted-foreground">{status}</span>;
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground pb-16 md:pb-0">
      <Sidebar />

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gym Member Invoices</h1>
          <p className="text-xs text-muted-foreground">Domain B — Track customer membership charges and billing status</p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by invoice number, customer name, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-sm">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No invoices found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase">
                    <th className="pb-3 font-semibold">Invoice #</th>
                    <th className="pb-3 font-semibold">Customer</th>
                    <th className="pb-3 font-semibold">Source</th>
                    <th className="pb-3 font-semibold">Amount</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Due Date</th>
                    <th className="pb-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredInvoices.map((inv) => (
                    <tr
                      key={inv._id}
                      onClick={() => openInvoiceModal(inv)}
                      className="hover:bg-secondary/20 transition-all cursor-pointer"
                    >
                      <td className="py-4 font-mono font-bold text-primary">{inv.invoiceNumber}</td>
                      <td className="py-4">
                        <div className="font-semibold">
                          {inv.customerId ? `${inv.customerId.firstName} ${inv.customerId.lastName || ''}` : 'Customer'}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">{inv.customerId?.customerCode}</div>
                      </td>
                      <td className="py-4 text-xs font-medium text-muted-foreground">{inv.source}</td>
                      <td className="py-4 font-extrabold">₹{inv.totalAmount}</td>
                      <td className="py-4">{getStatusBadge(inv.status)}</td>
                      <td className="py-4 text-xs text-muted-foreground">
                        {new Date(inv.dueAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 text-right">
                        <button className="px-3 py-1 bg-secondary text-foreground text-xs font-semibold rounded-lg hover:bg-secondary/80">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Invoice Detail Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-xl font-bold font-mono text-primary">{selectedInvoice.invoiceNumber}</h3>
                  <p className="text-xs text-muted-foreground">Issued: {new Date(selectedInvoice.issuedAt).toLocaleDateString()}</p>
                </div>
                {getStatusBadge(selectedInvoice.status)}
              </div>

              {loadingDetails ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4 text-sm">
                  {/* Customer Info */}
                  <div className="p-3 bg-secondary/30 rounded-xl border border-border flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold uppercase">Customer</p>
                      <p className="font-bold text-foreground">
                        {selectedInvoice.customerId?.firstName} {selectedInvoice.customerId?.lastName || ''}
                      </p>
                      <p className="text-xs font-mono text-indigo-400">{selectedInvoice.customerId?.customerCode}</p>
                    </div>
                    {selectedInvoice.customerId?._id && (
                      <button
                        onClick={() => router.push(`/customers/${selectedInvoice.customerId._id}`)}
                        className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg transition-all flex items-center gap-1"
                      >
                        <User className="w-3.5 h-3.5" /> Customer Profile
                      </button>
                    )}
                  </div>

                  {/* Amount Summary */}
                  <div className="grid grid-cols-3 gap-3 p-3 bg-secondary/30 rounded-xl border border-border text-center">
                    <div>
                      <p className="text-[11px] text-muted-foreground font-semibold uppercase">Total</p>
                      <p className="font-bold font-mono text-foreground text-base">₹{selectedInvoice.totalAmount}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-semibold uppercase">Paid</p>
                      <p className="font-bold font-mono text-emerald-400 text-base">₹{invoiceDetails?.totalPaid || 0}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-semibold uppercase">Outstanding</p>
                      <p className="font-bold font-mono text-amber-400 text-base">₹{invoiceDetails?.outstanding ?? selectedInvoice.totalAmount}</p>
                    </div>
                  </div>

                  {/* Attached Payments Table */}
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Attached Payments</h4>
                    {!invoiceDetails?.payments || invoiceDetails.payments.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No payments recorded for this invoice yet.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {invoiceDetails.payments.map((p: any) => (
                          <div key={p._id} className="p-2.5 bg-secondary/50 rounded-lg flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-foreground">₹{p.amount}</span>
                              <span className="ml-2 font-mono text-muted-foreground">({p.method})</span>
                            </div>
                            <span className="text-muted-foreground">{new Date(p.paidAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <button
                      onClick={() => setSelectedInvoice(null)}
                      className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      Close
                    </button>

                    {selectedInvoice.status !== 'PAID' && selectedInvoice.status !== 'VOID' ? (
                      <button
                        onClick={() => router.push(`/customers/${selectedInvoice.customerId?._id || ''}`)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Record Payment
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        Invoice Fully Paid
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
