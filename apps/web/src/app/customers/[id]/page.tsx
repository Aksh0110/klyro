'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { ICustomer, ICustomerMembership, IMembershipPlan, IInvoice, IPayment } from '@klyro/types';
import {
  User,
  Phone,
  Mail,
  Award,
  ArrowLeft,
  Plus,
  CheckCircle2,
  CreditCard,
  FileText,
  DollarSign,
  AlertCircle,
  RotateCcw,
  X,
  Calendar,
  Clock,
  Sparkles,
  RefreshCcw,
  MapPin,
  Eye,
  Loader2,
} from 'lucide-react';


export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params?.id as string;
  const { activeOrgId } = useAuth();

  const [customer, setCustomer] = useState<ICustomer | null>(null);
  const [memberships, setMemberships] = useState<ICustomerMembership[]>([]);
  const [plans, setPlans] = useState<IMembershipPlan[]>([]);
  const [invoices, setInvoices] = useState<IInvoice[]>([]);
  const [payments, setPayments] = useState<IPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Contextual Modal States
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectAmount, setCollectAmount] = useState<number | ''>('');
  const [collectMethod, setCollectMethod] = useState('UPI');
  const [collectNotes, setCollectNotes] = useState('');
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectError, setCollectError] = useState<string | null>(null);

  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewPlanId, setRenewPlanId] = useState('');
  const [renewPaymentMode, setRenewPaymentMode] = useState<'PAY_NOW' | 'PAY_LATER'>('PAY_NOW');
  const [renewMethod, setRenewMethod] = useState('UPI');
  const [isRenewing, setIsRenewing] = useState(false);
  const [renewError, setRenewError] = useState<string | null>(null);

  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Invoice Detail Viewer State
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);
  const [viewingInvoiceDetails, setViewingInvoiceDetails] = useState<any | null>(null);
  const [loadingInvoiceDetails, setLoadingInvoiceDetails] = useState(false);

  const openInvoiceView = async (inv: any) => {
    setViewingInvoice(inv);
    setLoadingInvoiceDetails(true);
    try {
      const data = await apiRequest<any>(`/invoices/${inv._id}`, {}, activeOrgId || undefined);
      if (data) setViewingInvoiceDetails(data);
    } catch {
      console.error('Failed to load invoice details');
    } finally {
      setLoadingInvoiceDetails(false);
    }
  };


  const loadCustomerDetails = async () => {
    if (!activeOrgId || !customerId) return;
    setIsLoading(true);
    try {
      const custData = await apiRequest<ICustomer>(`/customers/${customerId}`, {}, activeOrgId);
      setCustomer(custData);

      const [memData, planData, invData, payData] = await Promise.all([
        apiRequest<ICustomerMembership[]>(`/memberships/customer/${customerId}`, {}, activeOrgId).catch(() => []),
        apiRequest<IMembershipPlan[]>('/membership-plans', {}, activeOrgId).catch(() => []),
        apiRequest<IInvoice[]>(`/customers/${customerId}/invoices`, {}, activeOrgId)
          .catch(async () => {
            return apiRequest<IInvoice[]>(`/invoices?customerId=${customerId}`, {}, activeOrgId).catch(() => []);
          }),
        apiRequest<IPayment[]>(`/customers/${customerId}/payments`, {}, activeOrgId)
          .catch(async () => {
            return apiRequest<IPayment[]>(`/payments?customerId=${customerId}`, {}, activeOrgId).catch(() => []);
          }),
      ]);

      setMemberships(Array.isArray(memData) ? memData : (memData as any)?.data || []);
      setPlans(Array.isArray(planData) ? planData : (planData as any)?.data || []);
      setInvoices(Array.isArray(invData) ? invData : (invData as any)?.data || []);
      setPayments(Array.isArray(payData) ? payData : (payData as any)?.data || []);

      if (planData && Array.isArray(planData) && planData.length > 0) setRenewPlanId(planData[0]._id);
    } catch (err) {
      console.error('Failed to load customer profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerDetails();
  }, [activeOrgId, customerId]);

  const activeMembership = memberships.find((m) => m.status === 'ACTIVE');

  // Calculate financial totals
  const totalBilled = invoices
    .filter((inv) => inv.status !== 'VOID')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const totalPaid = payments
    .filter((p) => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + p.amount, 0);

  const outstandingDues = Math.max(0, totalBilled - totalPaid);

  // Calculate days remaining on active membership
  let daysRemaining = 0;
  let isExpiringSoon = false;
  let isExpired = false;

  if (activeMembership) {
    const end = new Date(activeMembership.endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    daysRemaining = diff;
    if (diff < 0) {
      isExpired = true;
    } else if (diff <= 7) {
      isExpiringSoon = true;
    }
  }

  // Pre-fill contextual payment collection amount
  useEffect(() => {
    if (outstandingDues > 0 && collectAmount === '') {
      setCollectAmount(outstandingDues);
    }
  }, [outstandingDues]);

  // Contextual Collect Payment Handler
  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId || !collectAmount) return;

    setIsCollecting(true);
    setCollectError(null);

    try {
      await apiRequest(
        `/gym/members/${customerId}/collect-payment`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: Number(collectAmount),
            method: collectMethod,
            notes: collectNotes || undefined,
          }),
        },
        activeOrgId,
      );

      setSuccessToast(`Payment of ₹${collectAmount} recorded successfully!`);
      setShowCollectModal(false);
      loadCustomerDetails();
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      setCollectError(err.message || 'Failed to collect payment');
    } finally {
      setIsCollecting(false);
    }
  };

  // Contextual Renew Handler
  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId || !renewPlanId) return;

    setIsRenewing(true);
    setRenewError(null);

    try {
      await apiRequest(
        `/gym/members/${customerId}/renew`,
        {
          method: 'POST',
          body: JSON.stringify({
            membershipPlanId: renewPlanId,
            paymentMode: renewPaymentMode,
            paymentMethod: renewPaymentMode === 'PAY_NOW' ? renewMethod : undefined,
          }),
        },
        activeOrgId,
      );

      setSuccessToast('Membership renewed successfully!');
      setShowRenewModal(false);
      loadCustomerDetails();
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      setRenewError(err.message || 'Failed to renew membership');
    } finally {
      setIsRenewing(false);
    }
  };

  // Contextual Refund Handler

  const [refundPaymentObj, setRefundPaymentObj] = useState<any | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundNotes, setRefundNotes] = useState<string>('');
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  const openRefundModal = (p: any) => {
    setRefundPaymentObj(p);
    const max = p.amount - (p.refundedAmount || 0);
    setRefundAmount(max.toString());
    setRefundNotes('');
    setRefundError(null);
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId || !refundPaymentObj || !refundAmount) return;
    setIsRefunding(true);
    setRefundError(null);
    try {
      await apiRequest(
        `/payments/${refundPaymentObj._id}/refund`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: Number(refundAmount),
            notes: refundNotes || undefined,
          }),
        },
        activeOrgId,
      );
      setSuccessToast(`Refund of ₹${refundAmount} processed successfully!`);
      setRefundPaymentObj(null);
      loadCustomerDetails();
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      setRefundError(err.message || 'Failed to process refund');
    } finally {
      setIsRefunding(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-12 text-center text-muted-foreground text-sm">Loading member action center...</div>
      </AppShell>
    );
  }

  if (!customer) {
    return (
      <AppShell>
        <div className="p-12 text-center text-destructive text-sm">Member not found</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Back Link */}
        <div>
          <button
            onClick={() => router.push('/customers')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Members</span>
          </button>
        </div>

        {/* Success Toast Notification */}
        {successToast && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* HERO: Operational Action Center Header */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-lg shadow-primary/20 flex-shrink-0">
              {customer.firstName.charAt(0)}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black text-foreground">
                  {customer.firstName} {customer.lastName || ''}
                </h1>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                  {customer.customerCode}
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    customer.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  {customer.status}
                </span>
              </div>

              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  <span>{customer.phone}</span>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-primary" />
                    <span>{customer.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CONTEXTUAL ACTION BUTTONS */}
          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            {/* Priority 1: Unpaid Dues */}
            {outstandingDues > 0 ? (
              <button
                onClick={() => setShowCollectModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 active:scale-95 animate-bounce-subtle"
              >
                <DollarSign className="w-4 h-4" />
                <span>Collect ₹{outstandingDues.toLocaleString()}</span>
              </button>
            ) : null}

            {/* Priority 2: Renew Membership (Enabled only 7 days prior to expiry or if expired/no plan) */}
            {!activeMembership || daysRemaining <= 7 ? (
              <button
                onClick={() => setShowRenewModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{activeMembership ? 'Renew Membership' : '+ Add Membership'}</span>
              </button>
            ) : (
              <button
                disabled
                title={`Renewal option available 7 days prior to expiry (Expires in ${daysRemaining} days)`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/50 text-muted-foreground font-semibold text-xs border border-border cursor-not-allowed opacity-60"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Renew (Opens in {daysRemaining - 7}d)</span>
              </button>
            )}
          </div>
        </div>


        {/* OPERATIONAL KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Active Membership Status */}
          <div className="p-4 rounded-2xl bg-card border border-border">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Membership Plan
            </span>
            {activeMembership ? (
              <div>
                <div className="text-base font-bold text-foreground">
                  {(activeMembership.membershipPlanId as any)?.name || 'Active Plan'}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span
                    className={
                      daysRemaining <= 3
                        ? 'text-destructive font-bold'
                        : daysRemaining <= 7
                        ? 'text-amber-400 font-semibold'
                        : 'text-emerald-400'
                    }
                  >
                    {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expired'}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-bold text-muted-foreground">No Active Plan</div>
                <button
                  onClick={() => setShowRenewModal(true)}
                  className="text-xs text-primary font-semibold hover:underline mt-1 block"
                >
                  + Assign Plan
                </button>
              </div>
            )}
          </div>

          {/* Outstanding Balance */}
          <div className="p-4 rounded-2xl bg-card border border-border">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Outstanding Dues
            </span>
            <div
              className={`text-xl font-extrabold ${
                outstandingDues > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              ₹{outstandingDues.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Total Billed: ₹{totalBilled.toLocaleString()}
            </div>
          </div>

          {/* Total Payments Collected */}
          <div className="p-4 rounded-2xl bg-card border border-border">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Total Paid
            </span>
            <div className="text-xl font-extrabold text-foreground">₹{totalPaid.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">{payments.length} successful payment records</div>
          </div>
        </div>

        {/* DETAIL TABS: Invoices, Payments, Membership History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SINGLE UNIFIED INVOICES SECTION */}
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span>Invoices</span>
              </h3>
              <span className="text-xs text-muted-foreground">{invoices.length} records</span>
            </div>

            {invoices.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No invoices issued for this member.</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {invoices.map((inv) => {
                  const remaining = Math.max(0, inv.totalAmount - (inv.paidAmount || 0));
                  return (
                    <div
                      key={inv._id}
                      onClick={() => openInvoiceView(inv)}
                      className="p-3.5 rounded-xl bg-secondary/30 border border-border hover:border-primary/40 hover:bg-secondary/60 transition-all cursor-pointer flex items-center justify-between text-xs group"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-foreground flex items-center gap-2">
                          <span className="font-mono text-primary group-hover:underline">{inv.invoiceNumber}</span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : inv.status === 'PARTIALLY_PAID'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-destructive/15 text-destructive border border-destructive/30'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                        <div className="text-muted-foreground text-[11px]">
                          Total: ₹{inv.totalAmount.toLocaleString()} · Paid: ₹{(inv.paidAmount || 0).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {remaining > 0 ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCollectAmount(remaining);
                              setShowCollectModal(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-[11px] hover:bg-primary/90 transition-all shadow-sm"
                          >
                            Collect ₹{remaining}
                          </button>
                        ) : (
                          <span className="text-emerald-400 font-semibold text-[11px]">Paid ✓</span>
                        )}

                        <div className="p-1.5 rounded-lg bg-secondary text-muted-foreground group-hover:text-foreground group-hover:bg-primary/20 transition-all">
                          <Eye className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>


          {/* PAYMENTS HISTORY */}
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <span>Payment History</span>
              </h3>
              <span className="text-xs text-muted-foreground">{payments.length} records</span>
            </div>

            {payments.length === 0 ? (
              <div className="p-6 rounded-xl bg-secondary/10 border border-dashed border-border text-center space-y-1">
                <p className="text-xs text-muted-foreground">No payment transactions recorded yet.</p>
                {outstandingDues > 0 && (
                  <button
                    onClick={() => setShowCollectModal(true)}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    + Record First Payment
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {payments.map((p) => {
                  const maxRefundable = p.amount - (p.refundedAmount || 0);
                  return (
                    <div
                      key={p._id}
                      className="p-3.5 rounded-xl bg-secondary/30 border border-border flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-foreground text-sm">₹{p.amount.toLocaleString()}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                            {p.method}
                          </span>
                        </div>
                        {(p.refundedAmount || 0) > 0 && (
                          <div className="text-[11px] text-destructive font-semibold">
                            -₹{(p.refundedAmount || 0).toLocaleString()} refunded
                          </div>
                        )}
                        <div className="text-muted-foreground text-[11px]">
                          {new Date(p.paidAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} at{' '}
                          {new Date(p.paidAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          {p.reference ? ` · Ref: ${p.reference}` : ''}
                        </div>
                        {p.notes && <div className="text-[10px] text-muted-foreground/75 italic">{p.notes}</div>}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            p.status === 'SUCCESS' && (p.refundedAmount || 0) > 0
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : p.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-destructive/10 text-destructive'
                          }`}
                        >
                          {p.status === 'SUCCESS' && (p.refundedAmount || 0) > 0 ? 'PARTIAL REFUND' : p.status || 'SUCCESS'}
                        </span>
                        {maxRefundable > 0 && (
                          <button
                            onClick={() => openRefundModal(p)}
                            className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1 font-medium"
                          >
                            <RefreshCcw className="w-3 h-3" /> Refund
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: CONTEXTUAL COLLECT PAYMENT */}
      {showCollectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-foreground text-sm">
                  Collect Payment — {customer.firstName}
                </h3>
              </div>
              <button
                onClick={() => setShowCollectModal(false)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {collectError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                {collectError}
              </div>
            )}

            <form onSubmit={handleCollectPayment} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(Number(e.target.value) || '')}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Method *</label>
                <select
                  value={collectMethod}
                  onChange={(e) => setCollectMethod(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm"
                >
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Optional reference / notes"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCollectModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCollecting || !collectAmount}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 disabled:opacity-50"
                >
                  {isCollecting ? 'Recording...' : 'Collect Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONTEXTUAL RENEW MEMBERSHIP */}
      {showRenewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground text-sm">
                  Renew Membership — {customer.firstName}
                </h3>
              </div>
              <button
                onClick={() => setShowRenewModal(false)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {renewError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                {renewError}
              </div>
            )}

            <form onSubmit={handleRenew} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Renewal Plan *</label>
                <select
                  value={renewPlanId}
                  onChange={(e) => setRenewPlanId(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm"
                >
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} — ₹{p.price.toLocaleString()} ({p.duration} {p.durationType.toLowerCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground block">Payment Collection</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRenewPaymentMode('PAY_NOW')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left ${
                      renewPaymentMode === 'PAY_NOW'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-secondary/30 text-muted-foreground'
                    }`}
                  >
                    ● Pay Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenewPaymentMode('PAY_LATER')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left ${
                      renewPaymentMode === 'PAY_LATER'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-secondary/30 text-muted-foreground'
                    }`}
                  >
                    ○ Pay Later
                  </button>
                </div>
              </div>

              {renewPaymentMode === 'PAY_NOW' && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Payment Method</label>
                  <select
                    value={renewMethod}
                    onChange={(e) => setRenewMethod(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowRenewModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRenewing || !renewPlanId}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 disabled:opacity-50"
                >
                  {isRenewing ? 'Renewing...' : 'Renew Membership'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PROCESS REFUND */}

      {refundPaymentObj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <RefreshCcw className="w-5 h-5 text-destructive" />
                <h3 className="font-bold text-foreground text-sm">
                  Process Payment Refund
                </h3>
              </div>
              <button
                onClick={() => setRefundPaymentObj(null)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {refundError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                {refundError}
              </div>
            )}

            <div className="p-3 rounded-xl bg-secondary/30 border border-border text-xs space-y-1">
              <div>
                <span className="text-muted-foreground">Original Payment:</span>{' '}
                <span className="font-bold">₹{refundPaymentObj.amount}</span> ({refundPaymentObj.method})
              </div>
              {refundPaymentObj.refundedAmount > 0 && (
                <div>
                  <span className="text-muted-foreground">Already Refunded:</span>{' '}
                  <span className="font-bold text-destructive">₹{refundPaymentObj.refundedAmount}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Max Refundable Balance:</span>{' '}
                <span className="font-bold text-emerald-400">
                  ₹{refundPaymentObj.amount - (refundPaymentObj.refundedAmount || 0)}
                </span>
              </div>
            </div>

            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Refund Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={refundPaymentObj.amount - (refundPaymentObj.refundedAmount || 0)}
                  step="any"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Reason / Notes</label>
                <input
                  type="text"
                  placeholder="Optional refund reason"
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setRefundPaymentObj(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRefunding}
                  className="px-5 py-2 rounded-xl bg-destructive text-destructive-foreground font-bold text-xs hover:bg-destructive/90 disabled:opacity-50"
                >
                  {isRefunding ? 'Refunding...' : 'Confirm Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVOICE DETAIL VIEW MODAL */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-xl font-bold font-mono text-primary flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span>{viewingInvoice.invoiceNumber}</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Issued: {new Date(viewingInvoice.issuedAt || viewingInvoice.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => {
                  setViewingInvoice(null);
                  setViewingInvoiceDetails(null);
                }}
                className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingInvoiceDetails ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Status & Member Info */}
                <div className="p-3 bg-secondary/40 rounded-xl border border-border flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Member</span>
                    <span className="font-bold text-sm text-foreground">
                      {customer.firstName} {customer.lastName || ''}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground block">{customer.customerCode}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Status</span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        viewingInvoice.status === 'PAID'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : viewingInvoice.status === 'PARTIALLY_PAID'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-destructive/15 text-destructive border border-destructive/30'
                      }`}
                    >
                      {viewingInvoice.status}
                    </span>
                  </div>
                </div>

                {/* Amount Breakdown */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-secondary/30 rounded-xl border border-border text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Total Billed</p>
                    <p className="font-bold font-mono text-foreground text-sm mt-0.5">₹{viewingInvoice.totalAmount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Amount Paid</p>
                    <p className="font-bold font-mono text-emerald-400 text-sm mt-0.5">₹{viewingInvoiceDetails?.totalPaid ?? viewingInvoice.paidAmount ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Balance Due</p>
                    <p className="font-bold font-mono text-amber-400 text-sm mt-0.5">
                      ₹{viewingInvoiceDetails?.outstanding ?? Math.max(0, viewingInvoice.totalAmount - (viewingInvoice.paidAmount || 0))}
                    </p>
                  </div>
                </div>

                {/* Payments Log */}
                {viewingInvoiceDetails?.payments && viewingInvoiceDetails.payments.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Payment Records</span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {viewingInvoiceDetails.payments.map((p: any) => (
                        <div key={p._id} className="p-2.5 bg-secondary/50 rounded-lg flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-foreground">₹{p.amount}</span>
                            <span className="ml-2 font-mono text-muted-foreground">({p.method || 'Payment'})</span>
                          </div>
                          <span className="text-muted-foreground">{new Date(p.paidAt || p.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modal Footer Actions */}
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <button
                    onClick={() => {
                      setViewingInvoice(null);
                      setViewingInvoiceDetails(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs"
                  >
                    Close
                  </button>

                  {Math.max(0, viewingInvoice.totalAmount - (viewingInvoice.paidAmount || 0)) > 0 && (
                    <button
                      onClick={() => {
                        const rem = Math.max(0, viewingInvoice.totalAmount - (viewingInvoice.paidAmount || 0));
                        setViewingInvoice(null);
                        setViewingInvoiceDetails(null);
                        setCollectAmount(rem);
                        setShowCollectModal(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 shadow-md flex items-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Collect ₹{Math.max(0, viewingInvoice.totalAmount - (viewingInvoice.paidAmount || 0))}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

