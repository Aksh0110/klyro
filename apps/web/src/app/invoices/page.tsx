'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  CreditCard,
  User,
  ChevronRight,
  FileText,
  X,
  Calendar,
  ArrowUpRight,
  CheckCheck,
  Share2,
  Copy,
  Check,
} from 'lucide-react';

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

  const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);

  const generateInvoiceShareText = (inv: any, details?: any) => {
    const custName = inv.customerId ? `${inv.customerId.firstName} ${inv.customerId.lastName || ''}`.trim() : 'Customer';
    const code = inv.customerId?.customerCode ? ` (${inv.customerId.customerCode})` : '';
    const total = inv.totalAmount || 0;
    const paid = details?.totalPaid ?? inv.paidAmount ?? (inv.status === 'PAID' ? total : 0);
    const due = Math.max(0, total - paid);
    const date = new Date(inv.issuedAt || inv.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return (
      `🧾 *GYM INVOICE RECEIPT*\n` +
      `*Invoice #:* ${inv.invoiceNumber}\n` +
      `*Member:* ${custName}${code}\n` +
      `*Date:* ${date}\n` +
      `*Status:* ${inv.status}\n` +
      `--------------------------\n` +
      `*Total Amount:* ₹${total.toLocaleString()}\n` +
      `*Amount Paid:* ₹${paid.toLocaleString()}\n` +
      (due > 0 ? `*Balance Due:* ₹${due.toLocaleString()}\n` : `*Balance Due:* ₹0 (Fully Settled)\n`) +
      `--------------------------\n` +
      `Thank you for your membership with us!`
    );
  };

  const handleShareWhatsApp = async (inv: any, details?: any) => {
    const text = generateInvoiceShareText(inv, details);
    const phoneRaw = inv.customerId?.phone || '';
    const phoneClean = phoneRaw.replace(/[^\d]/g, '');
    const phoneTarget = phoneClean.length === 10 ? `91${phoneClean}` : phoneClean;

    // Try navigator.share first if supported on mobile device and no specific phone target
    if (typeof navigator !== 'undefined' && (navigator as any).share && !phoneTarget) {
      try {
        await (navigator as any).share({
          title: `Invoice ${inv.invoiceNumber}`,
          text,
        });
        return;
      } catch {
        // Fallback to WhatsApp link
      }
    }

    const encodedText = encodeURIComponent(text);
    const waUrl = phoneTarget ? `https://wa.me/${phoneTarget}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyInvoice = (inv: any, details?: any) => {
    const text = generateInvoiceShareText(inv, details);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedInvoiceId(inv._id);
      setTimeout(() => setCopiedInvoiceId(null), 2000);
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
          <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1 w-fit whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Paid
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-fit whitespace-nowrap">
            <Clock className="w-3 h-3 text-amber-400" /> Partially Paid
          </span>
        );
      case 'OPEN':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1 w-fit whitespace-nowrap">
            <AlertCircle className="w-3 h-3 text-indigo-400" /> Open
          </span>
        );
      default:
        return <span className="text-[10px] sm:text-xs text-muted-foreground">{status}</span>;
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground pb-24 md:pb-8">
      <Sidebar />

      <main className="flex-1 p-3 sm:p-5 md:p-8 max-w-7xl mx-auto space-y-4 md:space-y-6 w-full">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">Gym Member Invoices</h1>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">Domain B — Track customer membership charges and billing status</p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by invoice number, customer name, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3.5 bg-card border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto h-10 bg-card border border-border rounded-xl pl-8 pr-3 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
          </div>
        </div>

        {/* Invoices List / Table */}
        <div className="bg-card border border-border rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-6 shadow-sm">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No invoices found.</div>
          ) : (
            <>
              {/* MOBILE COMPACT CARDS VIEW (Rendered on mobile < md) */}
              <div className="block md:hidden space-y-2.5">
                {filteredInvoices.map((inv) => (
                  <div
                    key={inv._id}
                    onClick={() => openInvoiceModal(inv)}
                    className="p-3.5 bg-secondary/20 hover:bg-secondary/40 active:scale-[0.99] border border-border/70 hover:border-primary/40 rounded-xl transition-all cursor-pointer space-y-2.5 shadow-sm"
                  >
                    {/* Top Row: Invoice #, Due Date, Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-extrabold text-primary text-xs tracking-tight">
                          {inv.invoiceNumber}
                        </span>
                        <span className="text-muted-foreground text-[10px]">•</span>
                        <span className="text-[10px] text-muted-foreground truncate">
                          Due {new Date(inv.dueAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(inv.status)}
                      </div>
                    </div>

                    {/* Bottom Row: Customer Name & Amount with View Button */}
                    <div className="flex items-end justify-between pt-0.5 border-t border-border/40">
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-sm text-foreground truncate">
                          {inv.customerId ? `${inv.customerId.firstName} ${inv.customerId.lastName || ''}` : 'Customer'}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {inv.customerId?.customerCode || 'N/A'}
                          </span>
                          {inv.source && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground uppercase">
                              {inv.source}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-base font-black font-mono text-foreground">
                          ₹{inv.totalAmount?.toLocaleString?.() ?? inv.totalAmount}
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareWhatsApp(inv);
                            }}
                            title="Share on WhatsApp"
                            className="p-1 text-[10px] font-bold text-muted-foreground hover:text-emerald-400 hover:bg-secondary/80 rounded-md transition-colors flex items-center gap-1"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>Share</span>
                          </button>
                          <div className="text-[10px] font-bold text-primary flex items-center gap-0.5">
                            <span>View</span>
                            <ChevronRight className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP TABLE VIEW (Rendered on screens >= md) */}
              <div className="hidden md:block overflow-x-auto">
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
                        <td className="py-4 font-extrabold font-mono">₹{inv.totalAmount?.toLocaleString?.() ?? inv.totalAmount}</td>
                        <td className="py-4">{getStatusBadge(inv.status)}</td>
                        <td className="py-4 text-xs text-muted-foreground">
                          {new Date(inv.dueAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareWhatsApp(inv);
                              }}
                              title="Share on WhatsApp"
                              className="p-1.5 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-emerald-400 rounded-lg transition-colors"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <button className="px-3 py-1 bg-secondary text-foreground text-xs font-semibold rounded-lg hover:bg-secondary/80 transition-colors">
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Modern Structured Invoice Detail Modal */}
        {selectedInvoice && (() => {
          const totalAmount = selectedInvoice.totalAmount || 0;
          const totalPaid = invoiceDetails?.totalPaid ?? selectedInvoice.paidAmount ?? 0;
          const outstanding = Math.max(0, totalAmount - totalPaid);
          const progressPercent = totalAmount > 0 ? Math.min(100, Math.round((totalPaid / totalAmount) * 100)) : 100;

          return (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
              <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
                {/* Header: Receipt style */}
                <div className="flex items-start justify-between border-b border-border pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg sm:text-xl font-black font-mono tracking-tight text-foreground">
                          {selectedInvoice.invoiceNumber}
                        </h3>
                        {getStatusBadge(selectedInvoice.status)}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          Issued: {new Date(selectedInvoice.issuedAt).toLocaleDateString()}
                        </span>
                        {selectedInvoice.dueAt && (
                          <>
                            <span>•</span>
                            <span>Due: {new Date(selectedInvoice.dueAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(selectedInvoice, invoiceDetails)}
                      title="Share Invoice on WhatsApp"
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline sm:inline">Share</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyInvoice(selectedInvoice, invoiceDetails)}
                      title="Copy Receipt Summary Text"
                      className="p-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border text-xs transition-colors"
                    >
                      {copiedInvoiceId === selectedInvoice._id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedInvoice(null);
                        setInvoiceDetails(null);
                      }}
                      className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {loadingDetails ? (
                  <div className="py-12 flex justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-3.5 text-xs sm:text-sm">
                    {/* Section 1: Customer Card */}
                    <div className="p-3 bg-secondary/25 border border-border/70 rounded-xl flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#d0bcff]/15 text-[#d0bcff] font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                          {selectedInvoice.customerId?.firstName?.[0]?.toUpperCase() || 'M'}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                            Billed To
                          </span>
                          <span className="font-bold text-sm text-foreground truncate block">
                            {selectedInvoice.customerId
                              ? `${selectedInvoice.customerId.firstName} ${selectedInvoice.customerId.lastName || ''}`
                              : 'Customer'}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground block truncate">
                            {selectedInvoice.customerId?.customerCode || 'N/A'}
                            {selectedInvoice.customerId?.phone ? ` • ${selectedInvoice.customerId.phone}` : ''}
                          </span>
                        </div>
                      </div>

                      {selectedInvoice.customerId?._id && (
                        <button
                          type="button"
                          onClick={() => router.push(`/customers/${selectedInvoice.customerId._id}`)}
                          className="flex-shrink-0 px-2.5 sm:px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] sm:text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>Profile</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Section 2: Invoice Itemization Table */}
                    <div className="p-3 bg-secondary/15 border border-border/60 rounded-xl space-y-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Line Items
                      </span>
                      <div className="divide-y divide-border/40 text-xs">
                        <div className="pb-2 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-foreground">
                              {selectedInvoice.source === 'MEMBERSHIP' ? 'Gym Membership Plan' : selectedInvoice.source || 'Gym Subscription'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">Standard membership billing cycle</p>
                          </div>
                          <span className="font-mono font-bold text-foreground">
                            ₹{(selectedInvoice.subtotal ?? selectedInvoice.totalAmount)?.toLocaleString?.()}
                          </span>
                        </div>

                        {selectedInvoice.discountAmount > 0 && (
                          <div className="py-1.5 flex items-center justify-between text-emerald-400 font-semibold">
                            <span>Discount Applied</span>
                            <span className="font-mono">-₹{selectedInvoice.discountAmount?.toLocaleString?.()}</span>
                          </div>
                        )}

                        <div className="pt-2 flex items-center justify-between text-xs font-black">
                          <span className="text-foreground">Total Invoiced Amount</span>
                          <span className="font-mono text-sm text-foreground">
                            ₹{selectedInvoice.totalAmount?.toLocaleString?.()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Settlement Progress & 3 Metric Cards */}
                    <div className="p-3.5 bg-secondary/30 border border-border rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Settlement Progress
                        </span>
                        <span className={`font-mono text-xs font-bold ${outstanding === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {progressPercent}% Settled
                        </span>
                      </div>

                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            outstanding === 0 ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-emerald-500'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="p-2 rounded-lg bg-background/60 border border-border/50 text-center">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Billed</p>
                          <p className="font-bold font-mono text-foreground text-xs sm:text-sm mt-0.5">
                            ₹{totalAmount.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-background/60 border border-border/50 text-center">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Paid</p>
                          <p className="font-bold font-mono text-emerald-400 text-xs sm:text-sm mt-0.5">
                            ₹{totalPaid.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-background/60 border border-border/50 text-center">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Outstanding</p>
                          <p
                            className={`font-bold font-mono text-xs sm:text-sm mt-0.5 ${
                              outstanding === 0 ? 'text-muted-foreground' : 'text-amber-400'
                            }`}
                          >
                            ₹{outstanding.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Attached Payments Ledger */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Attached Payments ({invoiceDetails?.payments?.length || 0})
                        </span>
                        {invoiceDetails?.payments?.length > 0 && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            ₹{totalPaid.toLocaleString()} collected
                          </span>
                        )}
                      </div>

                      {!invoiceDetails?.payments || invoiceDetails.payments.length === 0 ? (
                        <div className="p-3 bg-secondary/20 border border-dashed border-border rounded-xl text-center text-xs text-muted-foreground">
                          No payments recorded for this invoice yet.
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {invoiceDetails.payments.map((p: any) => (
                            <div
                              key={p._id}
                              className="p-2.5 bg-secondary/35 hover:bg-secondary/50 border border-border/60 rounded-xl flex items-center justify-between text-xs transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase">
                                  {p.method}
                                </span>
                                <div>
                                  <div className="text-[11px] text-muted-foreground font-mono">
                                    {new Date(p.paidAt || p.createdAt).toLocaleDateString()}
                                  </div>
                                  {p.reference && (
                                    <div className="text-[9px] text-muted-foreground font-mono">Ref: {p.reference}</div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-extrabold font-mono text-emerald-400 text-xs">
                                  +₹{p.amount?.toLocaleString?.() ?? p.amount}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-border flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInvoice(null);
                            setInvoiceDetails(null);
                          }}
                          className="px-3.5 sm:px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-xl transition-colors"
                        >
                          Close
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(selectedInvoice, invoiceDetails)}
                          className="px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold flex items-center gap-1.5 border border-border transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Share</span>
                        </button>
                      </div>

                      {outstanding > 0 ? (
                        <button
                          type="button"
                          onClick={() => router.push(`/customers/${selectedInvoice.customerId?._id || ''}`)}
                          className="px-3.5 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow transition-all active:scale-95"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Record Payment (₹{outstanding.toLocaleString()})</span>
                        </button>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                          <CheckCheck className="w-4 h-4 text-emerald-400" />
                          Invoice Fully Paid
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </main>

      <BottomNav />
    </div>
  );
}
