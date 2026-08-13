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

  // Assign Plan Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Create Invoice Modal
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [invoiceMembershipId, setInvoiceMembershipId] = useState('');
  const [invoiceSubtotal, setInvoiceSubtotal] = useState<number | ''>('');
  const [invoiceDiscount, setInvoiceDiscount] = useState<number | ''>(0);
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [createInvoiceError, setCreateInvoiceError] = useState<string | null>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

  // Record Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'OTHER'>('UPI');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  const loadCustomerDetails = async () => {
    if (!activeOrgId || !customerId) return;
    setIsLoading(true);
    try {
      const custData = await apiRequest<ICustomer>(`/customers/${customerId}`, {}, activeOrgId);
      setCustomer(custData);

      const [memData, planData, invData, payData] = await Promise.all([
        apiRequest<ICustomerMembership[]>(`/memberships/customer/${customerId}`, {}, activeOrgId).catch(() => []),
        apiRequest<IMembershipPlan[]>('/membership-plans', {}, activeOrgId).catch(() => []),
        apiRequest<IInvoice[]>(`/customers/${customerId}/invoices`, {}, activeOrgId).catch(() => []),
        apiRequest<IPayment[]>(`/customers/${customerId}/payments`, {}, activeOrgId).catch(() => []),
      ]);

      setMemberships(memData || []);
      setPlans(planData || []);
      setInvoices(invData || []);
      setPayments(payData || []);

      if (planData && planData.length > 0) setSelectedPlanId(planData[0]._id);
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

  // Calculate totals
  const totalPaid = payments
    .filter((p) => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + p.amount, 0);

  const openInvoices = invoices.filter((i) => i.status === 'OPEN' || i.status === 'PARTIALLY_PAID');
  
  // Calculate remaining total outstanding across non-paid invoices
  const totalOutstanding = openInvoices.reduce((sum, inv) => {
    const invPayments = payments.filter((p) => (typeof p.invoiceId === 'object' ? p.invoiceId._id : p.invoiceId) === inv._id && p.status === 'SUCCESS');
    const invPaid = invPayments.reduce((s, p) => s + p.amount, 0);
    return sum + Math.max(0, inv.totalAmount - invPaid);
  }, 0);

  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || !customer || !activeOrgId) return;

    setIsSubmitting(true);
    setAssignError(null);

    try {
      await apiRequest<ICustomerMembership>(
        '/memberships',
        {
          method: 'POST',
          body: JSON.stringify({
            customerId: customer._id,
            membershipPlanId: selectedPlanId,
            branchId: customer.branchId,
          }),
        },
        activeOrgId,
      );

      setShowAssignModal(false);
      loadCustomerDetails();
    } catch (err: any) {
      setAssignError(err.message || 'Failed to assign membership');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateInvoiceModal = () => {
    const activeMem = memberships.find((m) => m.status === 'ACTIVE') || memberships[0];
    const initialMembId = activeMem ? activeMem._id : '';
    setInvoiceMembershipId(initialMembId);
    
    const initialSubtotal = activeMem ? activeMem.price : 0;
    setInvoiceSubtotal(initialSubtotal);
    setInvoiceDiscount(0);

    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 7);
    setInvoiceDueDate(defaultDue.toISOString().split('T')[0]);
    setInvoiceNotes('');
    setCreateInvoiceError(null);
    setShowCreateInvoiceModal(true);
  };

  const handleInvoiceMembershipChange = (membId: string) => {
    setInvoiceMembershipId(membId);
    if (membId) {
      const selectedMem = memberships.find((m) => m._id === membId);
      if (selectedMem) {
        setInvoiceSubtotal(selectedMem.price);
      }
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !activeOrgId) return;

    const subtotal = Number(invoiceSubtotal) || 0;
    const discount = Number(invoiceDiscount) || 0;
    const totalAmount = Math.max(0, subtotal - discount);

    setIsCreatingInvoice(true);
    setCreateInvoiceError(null);

    try {
      await apiRequest(
        '/invoices',
        {
          method: 'POST',
          body: JSON.stringify({
            customerId: customer._id,
            membershipId: invoiceMembershipId || undefined,
            branchId: customer.branchId,
            subtotal,
            discountAmount: discount,
            totalAmount,
            dueAt: invoiceDueDate ? new Date(invoiceDueDate).toISOString() : undefined,
            notes: invoiceNotes || undefined,
          }),
        },
        activeOrgId,
      );

      setShowCreateInvoiceModal(false);
      loadCustomerDetails();
    } catch (err: any) {
      setCreateInvoiceError(err.message || 'Failed to create invoice');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const openRecordPaymentModal = (preselectedInv?: IInvoice) => {
    const targetInv = preselectedInv || openInvoices[0];
    if (!targetInv) return;

    setSelectedInvoiceId(targetInv._id);

    // Calculate outstanding for this invoice
    const invPayments = payments.filter(
      (p) => (typeof p.invoiceId === 'object' ? p.invoiceId._id : p.invoiceId) === targetInv._id && p.status === 'SUCCESS',
    );
    const paidForInv = invPayments.reduce((s, p) => s + p.amount, 0);
    const dueForInv = Math.max(0, targetInv.totalAmount - paidForInv);

    setPaymentAmount(dueForInv);
    setPaymentError(null);
    setShowPaymentModal(true);
  };

  const handleInvoiceChange = (invId: string) => {
    setSelectedInvoiceId(invId);
    const targetInv = invoices.find((i) => i._id === invId);
    if (targetInv) {
      const invPayments = payments.filter(
        (p) => (typeof p.invoiceId === 'object' ? p.invoiceId._id : p.invoiceId) === targetInv._id && p.status === 'SUCCESS',
      );
      const paidForInv = invPayments.reduce((s, p) => s + p.amount, 0);
      setPaymentAmount(Math.max(0, targetInv.totalAmount - paidForInv));
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId || !paymentAmount || paymentAmount <= 0 || !activeOrgId || !customer) return;

    setIsRecordingPayment(true);
    setPaymentError(null);

    try {
      const targetInv = invoices.find((i) => i._id === selectedInvoiceId);
      const membershipIdStr = targetInv?.membershipId
        ? typeof targetInv.membershipId === 'object'
          ? targetInv.membershipId._id
          : targetInv.membershipId
        : undefined;

      await apiRequest(
        '/payments',
        {
          method: 'POST',
          body: JSON.stringify({
            invoiceId: selectedInvoiceId,
            customerId: customer._id,
            membershipId: membershipIdStr,
            amount: Number(paymentAmount),
            method: paymentMethod,
            reference: paymentReference,
            notes: paymentNotes,
          }),
        },
        activeOrgId,
      );

      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentReference('');
      setPaymentNotes('');
      loadCustomerDetails();
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to record payment');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleRefund = async (paymentId: string) => {
    if (!confirm('Are you sure you want to refund this payment? Invoice outstanding balance will be restored.')) return;
    try {
      await apiRequest(
        `/payments/${paymentId}/refund`,
        { method: 'POST', body: JSON.stringify({ notes: 'Refund requested from customer profile' }) },
        activeOrgId || undefined,
      );
      loadCustomerDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to refund payment');
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <button
          onClick={() => router.push('/customers')}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </button>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading customer profile...</div>
        ) : !customer ? (
          <div className="p-8 text-center text-sm text-destructive">Customer profile not found</div>
        ) : (
          <>
            {/* Header Profile Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-500/20">
                  {customer.firstName[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-400">{customer.customerCode}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        customer.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-secondary text-muted-foreground border border-border'
                      }`}
                    >
                      {customer.status}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-foreground mt-0.5">
                    {customer.firstName} {customer.lastName || ''}
                  </h1>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {customer.phone}</span>
                    {customer.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {customer.email}</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => openCreateInvoiceModal()}
                  className="py-2.5 px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 text-sm shadow-md"
                >
                  <FileText className="w-4 h-4" />
                  <span>Create Invoice</span>
                </button>
                {openInvoices.length > 0 && (
                  <button
                    onClick={() => openRecordPaymentModal()}
                    className="py-2.5 px-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 text-sm shadow-md"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Record Payment</span>
                  </button>
                )}
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="py-2.5 px-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 text-sm shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Assign Membership</span>
                </button>
              </div>
            </div>

            {/* Financial Summary Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-400" /> Active Membership
                </p>
                {activeMembership ? (
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      {typeof activeMembership.membershipPlanId === 'object'
                        ? activeMembership.membershipPlanId.name
                        : 'Active Pass'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Expires {new Date(activeMembership.endDate).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-muted-foreground">No active subscription</p>
                )}
              </div>

              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400" /> Outstanding Due
                </p>
                <h3 className="text-2xl font-bold text-amber-400 font-mono">₹{totalOutstanding.toLocaleString()}</h3>
                <p className="text-xs text-muted-foreground">{openInvoices.length} open/partial invoices</p>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" /> Total Paid
                </p>
                <h3 className="text-2xl font-bold text-emerald-400 font-mono">₹{totalPaid.toLocaleString()}</h3>
                <p className="text-xs text-muted-foreground">{payments.filter((p) => p.status === 'SUCCESS').length} payments recorded</p>
              </div>
            </div>

            {/* Invoices Section */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  Invoices ({invoices.length})
                </h2>
              </div>

              {invoices.length === 0 ? (
                <p className="text-xs text-muted-foreground">No invoices generated for this customer.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground font-semibold">
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Total</th>
                        <th className="py-2.5 px-3">Paid</th>
                        <th className="py-2.5 px-3">Outstanding</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {invoices.map((inv) => {
                        const invPayments = payments.filter(
                          (p) => (typeof p.invoiceId === 'object' ? p.invoiceId._id : p.invoiceId) === inv._id && p.status === 'SUCCESS',
                        );
                        const paid = invPayments.reduce((sum, p) => sum + p.amount, 0);
                        const due = Math.max(0, inv.totalAmount - paid);

                        return (
                          <tr key={inv._id} className="hover:bg-secondary/20">
                            <td className="py-3 px-3 font-mono font-bold text-indigo-400">{inv.invoiceNumber}</td>
                            <td className="py-3 px-3 text-muted-foreground">{new Date(inv.issuedAt).toLocaleDateString()}</td>
                            <td className="py-3 px-3 font-mono font-bold text-foreground">₹{inv.totalAmount}</td>
                            <td className="py-3 px-3 font-mono text-emerald-400">₹{paid}</td>
                            <td className="py-3 px-3 font-mono text-amber-400">₹{due}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  inv.status === 'PAID'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : inv.status === 'PARTIALLY_PAID'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                }`}
                              >
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              {inv.status !== 'PAID' && inv.status !== 'VOID' && (
                                <button
                                  onClick={() => openRecordPaymentModal(inv)}
                                  className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold rounded-lg text-[11px] border border-emerald-500/20 transition-all"
                                >
                                  Pay
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Payments History Section */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  Payments History ({payments.length})
                </h2>
              </div>

              {payments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No payments recorded for this customer.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground font-semibold">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Method</th>
                        <th className="py-2.5 px-3">Reference</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {payments.map((pay) => {
                        const invNo = typeof pay.invoiceId === 'object' ? pay.invoiceId.invoiceNumber : 'INV';
                        return (
                          <tr key={pay._id} className="hover:bg-secondary/20">
                            <td className="py-3 px-3 text-muted-foreground">{new Date(pay.paidAt).toLocaleDateString()}</td>
                            <td className="py-3 px-3 font-mono font-bold text-indigo-400">{invNo}</td>
                            <td className="py-3 px-3 font-mono font-bold text-foreground">₹{pay.amount}</td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 bg-secondary text-foreground rounded font-mono text-[10px]">
                                {pay.method}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-muted-foreground">{pay.reference || '-'}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  pay.status === 'SUCCESS'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}
                              >
                                {pay.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              {pay.status === 'SUCCESS' && (
                                <button
                                  onClick={() => handleRefund(pay._id)}
                                  className="px-2 py-1 text-[10px] font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all flex items-center gap-1 ml-auto"
                                >
                                  <RotateCcw className="w-3 h-3" /> Refund
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Record Payment Modal */}
            {showPaymentModal && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
                    <CreditCard className="w-5 h-5 text-emerald-400" />
                    Record Member Payment
                  </h3>

                  {paymentError && (
                    <div className="p-3 bg-destructive/15 border border-destructive/30 rounded-xl text-xs text-destructive">
                      {paymentError}
                    </div>
                  )}

                  <form onSubmit={handleRecordPayment} className="space-y-4 text-sm">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Customer</label>
                      <input
                        type="text"
                        disabled
                        value={`${customer.firstName} ${customer.lastName || ''} (${customer.customerCode})`}
                        className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-lg text-foreground font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Target Invoice</label>
                      <select
                        value={selectedInvoiceId}
                        onChange={(e) => handleInvoiceChange(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {openInvoices.map((inv) => (
                          <option key={inv._id} value={inv._id}>
                            {inv.invoiceNumber} (Total: ₹{inv.totalAmount})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Payment Amount (₹)</label>
                      <input
                        type="number"
                        min="1"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value ? Number(e.target.value) : '')}
                        required
                        className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        required
                        className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="UPI">UPI / GPay / PhonePe</option>
                        <option value="CASH">Cash</option>
                        <option value="CARD">Debit / Credit Card</option>
                        <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Reference / UTR (Optional)</label>
                      <input
                        type="text"
                        value={paymentReference}
                        placeholder="e.g. UTR12345678"
                        onChange={(e) => setPaymentReference(e.target.value)}
                        className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground font-mono"
                      />
                    </div>

                    <div className="pt-3 border-t border-border flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowPaymentModal(false)}
                        className="px-4 py-2 text-xs font-semibold text-muted-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isRecordingPayment || !paymentAmount || paymentAmount <= 0}
                        className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {isRecordingPayment ? 'Recording...' : 'Confirm Payment'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Assign Plan Modal */}
            {showAssignModal && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
                    <Award className="w-5 h-5 text-primary" />
                    Assign Membership Plan
                  </h3>

                  {assignError && (
                    <div className="p-3 bg-destructive/15 border border-destructive/30 rounded-xl text-xs text-destructive">
                      {assignError}
                    </div>
                  )}

                  <form onSubmit={handleAssignPlan} className="space-y-4 text-sm">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Select Plan</label>
                      <select
                        value={selectedPlanId}
                        onChange={(e) => setSelectedPlanId(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {plans.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} ({p.duration} {p.durationType.toLowerCase()} - ₹{p.price})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-3 border-t border-border flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowAssignModal(false)}
                        className="px-4 py-2 text-xs font-semibold text-muted-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || plans.length === 0}
                        className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
                      >
                        {isSubmitting ? 'Assigning...' : 'Confirm Subscription'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Create Invoice Modal */}
            {showCreateInvoiceModal && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Create Invoice
                    </h3>
                    <button
                      onClick={() => setShowCreateInvoiceModal(false)}
                      className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {createInvoiceError && (
                    <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-2">
                      <p className="font-semibold">{createInvoiceError}</p>
                      {createInvoiceError.toLowerCase().includes('subscription') && (
                        <button
                          type="button"
                          onClick={() => router.push('/settings/subscription')}
                          className="px-3 py-1.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-500 transition-all text-xs flex items-center gap-1"
                        >
                          <span>Setup Klyro Subscription Now</span>
                          <ArrowLeft className="w-3 h-3 rotate-180" />
                        </button>
                      )}
                    </div>
                  )}

                  <form onSubmit={handleCreateInvoice} className="space-y-4 text-sm">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Customer</label>
                      <input
                        type="text"
                        value={`${customer.firstName} ${customer.lastName || ''} (${customer.customerCode})`}
                        disabled
                        className="w-full px-3 py-2 bg-secondary/80 border border-border rounded-lg text-foreground font-medium opacity-80 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Membership (Optional)</label>
                      <select
                        value={invoiceMembershipId}
                        onChange={(e) => handleInvoiceMembershipChange(e.target.value)}
                        className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">No Membership Link (Other)</option>
                        {memberships.map((m) => {
                          const planName = typeof m.membershipPlanId === 'object' ? m.membershipPlanId.name : 'Membership Pass';
                          return (
                            <option key={m._id} value={m._id}>
                              {planName} — ₹{m.price} ({m.status})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Subtotal (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={invoiceSubtotal}
                          onChange={(e) => setInvoiceSubtotal(e.target.value === '' ? '' : Number(e.target.value))}
                          required
                          className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Discount (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={invoiceDiscount}
                          onChange={(e) => setInvoiceDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-secondary/40 border border-border rounded-xl flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">Total Amount Due</span>
                      <span className="text-lg font-extrabold text-primary font-mono">
                        ₹{Math.max(0, (Number(invoiceSubtotal) || 0) - (Number(invoiceDiscount) || 0)).toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Due Date</label>
                      <input
                        type="date"
                        value={invoiceDueDate}
                        onChange={(e) => setInvoiceDueDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Notes (Optional)</label>
                      <input
                        type="text"
                        value={invoiceNotes}
                        onChange={(e) => setInvoiceNotes(e.target.value)}
                        placeholder="e.g. Initial membership registration fee"
                        className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="pt-3 border-t border-border flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowCreateInvoiceModal(false)}
                        className="px-4 py-2 text-xs font-semibold text-muted-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isCreatingInvoice}
                        className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
                      >
                        {isCreatingInvoice ? 'Creating...' : 'Create Invoice'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
