'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { IMembershipPlan, ICustomer, IBranch } from '@klyro/types';
import {
  X,
  UserPlus,
  CreditCard,
  RotateCcw,
  Megaphone,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'onboard' | 'payment' | 'renew' | 'announcement';
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'onboard',
}) => {
  const router = useRouter();
  const { activeOrgId } = useAuth();
  const [activeTab, setActiveTab] = useState<'onboard' | 'payment' | 'renew' | 'announcement'>(initialTab);

  // Common data
  const [plans, setPlans] = useState<IMembershipPlan[]>([]);
  const [branches, setBranches] = useState<IBranch[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Onboarding state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'PAY_NOW' | 'PAY_LATER'>('PAY_NOW');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentReference, setPaymentReference] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('UNSPECIFIED');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');

  // Customer search for Collect Payment & Renew
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ICustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  const [collectAmount, setCollectAmount] = useState<number | ''>('');
  const [collectMethod, setCollectMethod] = useState('UPI');
  const [collectNotes, setCollectNotes] = useState('');
  const [renewPlanId, setRenewPlanId] = useState('');
  const [renewPaymentMode, setRenewPaymentMode] = useState<'PAY_NOW' | 'PAY_LATER'>('PAY_NOW');
  const [renewMethod, setRenewMethod] = useState('UPI');
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [expiringMemberships, setExpiringMemberships] = useState<any[]>([]);
  const [isLoadingExpiring, setIsLoadingExpiring] = useState(false);

  // Announcement state
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annAudience, setAnnAudience] = useState<
    'ALL_MEMBERS' | 'INACTIVE_MEMBERS' | 'BRANCH_MEMBERS' | 'BRANCH_INACTIVE_MEMBERS'
  >('ALL_MEMBERS');
  const [annBranchId, setAnnBranchId] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!isOpen || !activeOrgId) return;
    const fetchMetadata = async () => {
      try {
        const [planList, branchList] = await Promise.all([
          apiRequest<IMembershipPlan[]>('/membership-plans', {}, activeOrgId).catch(() => []),
          apiRequest<IBranch[]>('/branches', {}, activeOrgId).catch(() => []),
        ]);
        setPlans(planList || []);
        setBranches(branchList || []);
        if (planList?.length > 0 && !selectedPlanId) setSelectedPlanId(planList[0]._id);
        if (planList?.length > 0 && !renewPlanId) setRenewPlanId(planList[0]._id);
        if (branchList?.length > 0 && !annBranchId) setAnnBranchId(branchList[0]._id);
      } catch (err) {
        console.error('Failed to load quick action metadata', err);
      }
    };
    fetchMetadata();
  }, [isOpen, activeOrgId]);

  // Fetch pending payment members for Collect Payment tab
  useEffect(() => {
    if (!isOpen || !activeOrgId) return;
    const fetchPendingInvoices = async () => {
      setIsLoadingPending(true);
      try {
        const invData = await apiRequest<any[]>('/invoices', {}, activeOrgId).catch(() => []);
        const list = Array.isArray(invData) ? invData : (invData as any)?.data || [];
        const pending = list.filter((i: any) => i.status !== 'PAID' && i.status !== 'VOID' && i.customerId);
        setPendingInvoices(pending);
      } catch {
        setPendingInvoices([]);
      } finally {
        setIsLoadingPending(false);
      }
    };

    const fetchExpiringMemberships = async () => {
      setIsLoadingExpiring(true);
      try {
        const res = await apiRequest<any>('/memberships?limit=100', {}, activeOrgId).catch(() => null);
        const list = Array.isArray(res) ? res : res?.data || [];
        // Memberships that are expired or expiring within 14 days
        const now = new Date();
        const fourteenDaysAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        const expiringOrExpired = list.filter((m: any) => {
          if (!m.customerId) return false;
          if (m.status === 'EXPIRED' || m.status === 'CANCELLED') return true;
          if (m.endDate) {
            const end = new Date(m.endDate);
            return end <= fourteenDaysAhead;
          }
          return false;
        });
        setExpiringMemberships(expiringOrExpired);
      } catch {
        setExpiringMemberships([]);
      } finally {
        setIsLoadingExpiring(false);
      }
    };

    fetchPendingInvoices();
    fetchExpiringMemberships();
  }, [isOpen, activeOrgId]);

  // Phone duplicate check debounce
  useEffect(() => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10 || !activeOrgId) {
      setDuplicateWarning(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest<{ exists: boolean; customer?: any; activeMembership?: any; outstandingBalance?: number }>(
          `/gym/members/check-duplicate?phone=${encodeURIComponent(cleanPhone)}`,
          {},
          activeOrgId,
        );
        if (res.exists) {
          setDuplicateWarning(res);
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        setDuplicateWarning(null);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [phone, activeOrgId]);

  // Customer search debounce
  useEffect(() => {
    if (!customerSearch || customerSearch.length < 2 || !activeOrgId) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest<ICustomer[]>(
          `/customers?search=${encodeURIComponent(customerSearch)}&limit=5`,
          {},
          activeOrgId,
        );
        setSearchResults(res || []);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, activeOrgId]);

  const selectedPlan = plans.find((p) => p._id === selectedPlanId);
  const planPrice = selectedPlan ? selectedPlan.price : 0;
  const finalPrice = Math.max(0, planPrice - (discountAmount || 0));

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setPhone('');
    setDiscountAmount(0);
    setPaymentReference('');
    setEmail('');
    setAddress('');
    setEmergencyContact('');
    setNotes('');
    setDuplicateWarning(null);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setSearchResults([]);
    setCollectAmount('');
    setAnnTitle('');
    setAnnBody('');
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !activeOrgId || !firstName || !phone || !selectedPlanId) return;

    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length !== 10) {
      setErrorMessage('Mobile number must be standard 10 digits (e.g. 9876543210)');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await apiRequest<any>(
        '/gym/members/onboard',
        {
          method: 'POST',
          body: JSON.stringify({
            firstName,
            lastName: lastName || undefined,
            phone: cleanedPhone,
            membershipPlanId: selectedPlanId,
            discountAmount: discountAmount || 0,
            paymentMode,
            paymentMethod: paymentMode === 'PAY_NOW' ? paymentMethod : undefined,
            paymentReference: paymentReference || undefined,
            email: email || undefined,
            gender,
            address: address || undefined,
            emergencyContact: emergencyContact || undefined,
            notes: notes || undefined,
          }),
        },
        activeOrgId,
      );

      setSuccessMessage(`Member created successfully (${res.customer?.firstName} ${res.customer?.lastName || ''})`);
      setTimeout(() => {
        onClose();
        resetForm();
        router.push(`/customers/${res.customer?._id}`);
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to onboard member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCollectPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !activeOrgId || !selectedCustomer || !collectAmount) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest(
        `/gym/members/${selectedCustomer._id}/collect-payment`,
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

      setSuccessMessage(`Payment of ₹${collectAmount} recorded successfully!`);
      setTimeout(() => {
        onClose();
        resetForm();
        router.push(`/customers/${selectedCustomer._id}`);
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to collect payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !activeOrgId || !selectedCustomer || !renewPlanId) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest(
        `/gym/members/${selectedCustomer._id}/renew`,
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

      setSuccessMessage(`Membership renewed successfully for ${selectedCustomer.firstName}!`);
      setTimeout(() => {
        onClose();
        resetForm();
        router.push(`/customers/${selectedCustomer._id}`);
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to renew membership');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !activeOrgId || !annTitle || !annBody) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const created = await apiRequest<any>(
        '/announcements',
        {
          method: 'POST',
          body: JSON.stringify({
            title: annTitle,
            body: annBody,
            audienceType: annAudience,
            branchId: annAudience === 'BRANCH_MEMBERS' ? annBranchId : undefined,
          }),
        },
        activeOrgId,
      );

      // Immediately publish
      await apiRequest(`/announcements/${created._id}/publish`, { method: 'POST' }, activeOrgId);

      setSuccessMessage('Announcement broadcasted to members successfully!');
      setTimeout(() => {
        onClose();
        resetForm();
        router.push('/communications');
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to broadcast announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <UserPlus className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground">Quick Action Center</h2>
              <p className="text-xs text-muted-foreground">One intent → one flow → automatic orchestration</p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Grid - 4 Columns so ALL tabs are visible */}
        <div className="grid grid-cols-4 border-b border-[#273647] bg-[#0d1c2d] p-1.5 gap-1">
          <button
            onClick={() => setActiveTab('onboard')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all text-center ${
              activeTab === 'onboard'
                ? 'bg-[#1c2b3c] text-[#d0bcff] border border-[#d0bcff]/40 shadow-sm'
                : 'text-[#958ea0] hover:text-[#d4e4fa]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="truncate">Add Member</span>
          </button>

          <button
            onClick={() => setActiveTab('payment')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all text-center ${
              activeTab === 'payment'
                ? 'bg-[#1c2b3c] text-[#d0bcff] border border-[#d0bcff]/40 shadow-sm'
                : 'text-[#958ea0] hover:text-[#d4e4fa]'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span className="truncate">Payment</span>
          </button>

          <button
            onClick={() => setActiveTab('renew')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all text-center ${
              activeTab === 'renew'
                ? 'bg-[#1c2b3c] text-[#d0bcff] border border-[#d0bcff]/40 shadow-sm'
                : 'text-[#958ea0] hover:text-[#d4e4fa]'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="truncate">Renew</span>
          </button>

          <button
            onClick={() => setActiveTab('announcement')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all text-center ${
              activeTab === 'announcement'
                ? 'bg-[#1c2b3c] text-[#d0bcff] border border-[#d0bcff]/40 shadow-sm'
                : 'text-[#958ea0] hover:text-[#d4e4fa]'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span className="truncate">Broadcast</span>
          </button>
        </div>

        {/* Alerts */}
        {(successMessage || errorMessage) && (
          <div className="px-4 pt-3">
            {successMessage && (
              <div className="p-2.5 rounded-xl bg-[#4edea3]/10 border border-[#4edea3]/30 text-[#4edea3] text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Form Body - High Density & Compact */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {/* TAB 1: ADD MEMBER */}
          {activeTab === 'onboard' && (
            <form onSubmit={handleOnboardSubmit} className="space-y-3">
              {/* Duplicate Detection Alert */}
              {duplicateWarning && (
                <div className="p-3 rounded-xl bg-[#ffb95f]/10 border border-[#ffb95f]/30 text-[#ffb95f] text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <span>Member Already Exists with this Phone!</span>
                    <span className="px-2 py-0.5 rounded bg-[#ffb95f]/20 text-[10px]">
                      {duplicateWarning.customer?.customerCode}
                    </span>
                  </div>
                  <p className="text-[11px]">
                    {duplicateWarning.customer?.firstName} {duplicateWarning.customer?.lastName || ''} ·{' '}
                    {duplicateWarning.activeMembership?.planName || 'No Active Membership'}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        router.push(`/customers/${duplicateWarning.customer?._id}`);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#ffb95f]/20 hover:bg-[#ffb95f]/30 text-[#ffb95f] text-xs font-semibold"
                    >
                      Open Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(duplicateWarning.customer);
                        setActiveTab('renew');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#1c2b3c] text-xs font-semibold"
                    >
                      Renew Instead
                    </button>
                  </div>
                </div>
              )}

              {/* Primary Compact Fields */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-[#958ea0] uppercase tracking-wider mb-1 block">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-[#1c2b3c] border border-[#273647] rounded-xl px-2.5 py-1.5 text-xs text-[#d4e4fa] focus:outline-none focus:border-[#d0bcff]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#958ea0] uppercase tracking-wider mb-1 block">Last Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sharma"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-[#1c2b3c] border border-[#273647] rounded-xl px-2.5 py-1.5 text-xs text-[#d4e4fa] focus:outline-none focus:border-[#d0bcff]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-[#958ea0] uppercase tracking-wider mb-1 block">Mobile Number (10 digits) *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    pattern="[0-9]{10}"
                    inputMode="numeric"
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full bg-[#1c2b3c] border border-[#273647] rounded-xl px-2.5 py-1.5 text-xs text-[#d4e4fa] focus:outline-none focus:border-[#d0bcff]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#958ea0] uppercase tracking-wider mb-1 block">Membership Plan *</label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="w-full bg-[#1c2b3c] border border-[#273647] rounded-xl px-2 py-1.5 text-xs text-[#d4e4fa] focus:outline-none focus:border-[#d0bcff]"
                  >
                    {plans.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} — ₹{p.price.toLocaleString()} ({p.duration} {p.durationType.toLowerCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Mode & Discount Row */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-[#958ea0] uppercase tracking-wider mb-1 block">Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                    className="w-full bg-[#1c2b3c] border border-[#273647] rounded-xl px-2.5 py-1.5 text-xs text-[#d4e4fa] focus:outline-none focus:border-[#d0bcff]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#958ea0] uppercase tracking-wider mb-1 block">Collection</label>
                  <div className="grid grid-cols-2 gap-1 bg-[#1c2b3c] p-1 rounded-xl border border-[#273647]">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('PAY_NOW')}
                      className={`py-1 rounded-lg text-[10px] font-bold transition-all text-center ${
                        paymentMode === 'PAY_NOW' ? 'bg-[#d0bcff] text-[#3c0091]' : 'text-[#958ea0]'
                      }`}
                    >
                      Pay Now
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('PAY_LATER')}
                      className={`py-1 rounded-lg text-[10px] font-bold transition-all text-center ${
                        paymentMode === 'PAY_LATER' ? 'bg-[#d0bcff] text-[#3c0091]' : 'text-[#958ea0]'
                      }`}
                    >
                      Pay Later
                    </button>
                  </div>
                </div>
              </div>

              {paymentMode === 'PAY_NOW' && (
                <div className="grid grid-cols-2 gap-2.5 p-2.5 rounded-xl bg-[#0d1c2d] border border-[#273647]">
                  <div>
                    <label className="text-[10px] font-bold text-[#958ea0] mb-0.5 block">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-[#1c2b3c] border border-[#273647] rounded-lg px-2 py-1 text-xs text-[#d4e4fa]"
                    >
                      <option value="UPI">UPI</option>
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#958ea0] mb-0.5 block">Reference / UTR</label>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full bg-[#1c2b3c] border border-[#273647] rounded-lg px-2 py-1 text-xs text-[#d4e4fa]"
                    />
                  </div>
                </div>
              )}

              {/* Price Calculation Summary */}
              <div className="p-2.5 rounded-xl bg-[#0d1c2d] border border-[#273647] flex items-center justify-between text-xs">
                <span className="text-[#958ea0] text-[11px]">Invoice Total:</span>
                <span className="text-sm font-extrabold text-[#4edea3]">₹{finalPrice.toLocaleString()}</span>
              </div>

              {/* Progressive Disclosure: More Details */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowMoreDetails(!showMoreDetails)}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#d0bcff] hover:underline"
                >
                  {showMoreDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{showMoreDetails ? 'Hide Extra Fields' : 'Add Optional Email / Address'}</span>
                </button>

                {showMoreDetails && (
                  <div className="mt-2 space-y-2 p-2.5 rounded-xl bg-[#0d1c2d] border border-[#273647]">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-[#958ea0] block mb-0.5">Email</label>
                        <input
                          type="email"
                          placeholder="member@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-[#1c2b3c] border border-[#273647] rounded-lg px-2 py-1 text-xs text-[#d4e4fa]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#958ea0] block mb-0.5">Gender</label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-full bg-[#1c2b3c] border border-[#273647] rounded-lg px-2 py-1 text-xs text-[#d4e4fa]"
                        >
                          <option value="UNSPECIFIED">Unspecified</option>
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2 border-t border-[#273647] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    resetForm();
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#958ea0] hover:bg-[#1c2b3c]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !firstName || !phone || !selectedPlanId || !!duplicateWarning}
                  className="px-4 py-2 rounded-xl bg-[#d0bcff] hover:bg-[#d0bcff]/90 text-[#3c0091] text-xs font-extrabold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Onboarding...' : 'Onboard Member'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: COLLECT PAYMENT */}
          {activeTab === 'payment' && (
            <form onSubmit={handleCollectPaymentSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-[#958ea0] uppercase tracking-wider mb-1 block">Find Member</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#958ea0]" />
                  <input
                    type="text"
                    placeholder="Search by name, phone or code..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full bg-[#1c2b3c] border border-[#273647] rounded-xl pl-9 pr-4 py-1.5 text-xs text-[#d4e4fa] focus:outline-none focus:border-[#d0bcff]"
                  />
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-1 border border-[#273647] rounded-xl bg-[#122131] overflow-hidden divide-y divide-[#273647] shadow-lg max-h-36 overflow-y-auto">
                    {searchResults.map((c) => (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerSearch(`${c.firstName} ${c.lastName || ''} (${c.phone})`);
                          setSearchResults([]);
                        }}
                        className="w-full p-2 text-left hover:bg-[#1c2b3c] flex items-center justify-between text-xs text-[#d4e4fa]"
                      >
                        <div>
                          <span className="font-bold">{c.firstName} {c.lastName}</span>
                          <span className="text-[#958ea0] ml-2 font-mono">({c.customerCode})</span>
                        </div>
                        <span className="text-[#958ea0]">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedCustomer && (
                <div className="p-3 rounded-xl bg-[#0d1c2d] border border-[#273647] space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#d4e4fa]">
                      {selectedCustomer.firstName} {selectedCustomer.lastName}
                    </span>
                    <span className="font-mono text-[#958ea0]">{selectedCustomer.customerCode}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-[#958ea0] mb-0.5 block">Amount (₹) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="e.g. 1500"
                        value={collectAmount}
                        onChange={(e) => setCollectAmount(Number(e.target.value) || '')}
                        className="w-full bg-[#1c2b3c] border border-[#273647] rounded-xl px-2.5 py-1.5 text-xs text-[#d4e4fa]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#958ea0] mb-0.5 block">Method</label>
                      <select
                        value={collectMethod}
                        onChange={(e) => setCollectMethod(e.target.value)}
                        className="w-full bg-[#1c2b3c] border border-[#273647] rounded-xl px-2 py-1.5 text-xs text-[#d4e4fa]"
                      >
                        <option value="UPI">UPI</option>
                        <option value="CASH">Cash</option>
                        <option value="CARD">Card</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* List of Pending Payment Members when no member is selected */}
              {!selectedCustomer && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#d4e4fa]">
                    <span>Members with Pending Payments ({pendingInvoices.length})</span>
                  </div>

                  {pendingInvoices.length === 0 ? (
                    <div className="p-3 rounded-xl bg-[#0d1c2d] border border-[#273647] text-center text-xs text-[#958ea0]">
                      No pending payment members found. All invoices are settled!
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {pendingInvoices.map((inv) => {
                        const cust = inv.customerId;
                        if (!cust) return null;
                        const dueAmount = Math.max(0, inv.totalAmount - (inv.paidAmount || 0));
                        return (
                          <div
                            key={inv._id}
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setCustomerSearch(`${cust.firstName} ${cust.lastName || ''} (${cust.phone})`);
                              setCollectAmount(dueAmount);
                            }}
                            className="p-2.5 rounded-xl bg-[#0d1c2d] hover:bg-[#1c2b3c] border border-[#273647] transition-all cursor-pointer flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#ffb95f]/15 text-[#ffb95f] font-bold text-xs flex items-center justify-center">
                                {cust.firstName?.charAt(0)?.toUpperCase() || 'M'}
                              </div>
                              <div>
                                <div className="font-bold text-[#d4e4fa]">
                                  {cust.firstName} {cust.lastName || ''}
                                </div>
                                <div className="text-[10px] text-[#958ea0] font-mono">{cust.phone}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-bold text-[#ffb95f]">₹{dueAmount.toLocaleString()} Due</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-[#273647] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    resetForm();
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#958ea0] hover:bg-[#1c2b3c]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedCustomer || !collectAmount}
                  className="px-4 py-2 rounded-xl bg-[#d0bcff] hover:bg-[#d0bcff]/90 text-[#3c0091] text-xs font-extrabold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Collect Payment'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: RENEW MEMBER */}
          {activeTab === 'renew' && (
            <form onSubmit={handleRenewSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-[#958ea0] uppercase tracking-wider mb-1 block">Select Member to Renew</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#958ea0]" />
                  <input
                    type="text"
                    placeholder="Search member by name or phone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full bg-[#1c2b3c] border border-[#273647] rounded-xl pl-9 pr-4 py-1.5 text-xs text-[#d4e4fa] focus:outline-none focus:border-[#d0bcff]"
                  />
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-1 border border-[#273647] rounded-xl bg-[#122131] overflow-hidden divide-y divide-[#273647] shadow-lg max-h-36 overflow-y-auto">
                    {searchResults.map((c) => (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerSearch(`${c.firstName} ${c.lastName || ''}`);
                          setSearchResults([]);
                        }}
                        className="w-full p-2 text-left hover:bg-[#1c2b3c] flex items-center justify-between text-xs text-[#d4e4fa]"
                      >
                        <div>
                          <span className="font-bold">{c.firstName} {c.lastName}</span>
                          <span className="text-[#958ea0] ml-2 font-mono">({c.customerCode})</span>
                        </div>
                        <span className="text-[#958ea0]">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}

                {!selectedCustomer && searchResults.length === 0 && (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-[10px] font-bold text-[#958ea0] uppercase tracking-wider">Expiring / Expired ({expiringMemberships.length})</p>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {expiringMemberships.map((m) => {
                        const cust = m.customerId;
                        if (!cust) return null;
                        return (
                          <div
                            key={m._id}
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setCustomerSearch(`${cust.firstName} ${cust.lastName || ''}`);
                            }}
                            className="p-2 rounded-xl bg-[#0d1c2d] hover:bg-[#1c2b3c] border border-[#273647] transition-all cursor-pointer flex items-center justify-between text-xs"
                          >
                            <div className="font-bold text-[#d4e4fa]">
                              {cust.firstName} {cust.lastName || ''}
                            </div>
                            <span className="text-[10px] font-bold text-[#ffb95f]">Select to Renew</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {selectedCustomer && (
                <div className="p-3 rounded-xl bg-[#0d1c2d] border border-[#273647] space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#d4e4fa]">
                      Renewing: {selectedCustomer.firstName} {selectedCustomer.lastName}
                    </span>
                    <span className="font-mono text-[#958ea0]">{selectedCustomer.customerCode}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-[#958ea0] mb-0.5 block">Renewal Plan *</label>
                      <select
                        value={renewPlanId}
                        onChange={(e) => setRenewPlanId(e.target.value)}
                        className="w-full bg-[#1c2b3c] border border-[#273647] rounded-xl px-2 py-1.5 text-xs text-[#d4e4fa]"
                      >
                        {plans.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} — ₹{p.price.toLocaleString()} ({p.duration} {p.durationType.toLowerCase()})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#958ea0] mb-0.5 block">Payment Mode</label>
                      <div className="grid grid-cols-2 gap-1 bg-[#1c2b3c] p-1 rounded-xl border border-[#273647]">
                        <button
                          type="button"
                          onClick={() => setRenewPaymentMode('PAY_NOW')}
                          className={`py-1 rounded-lg text-[10px] font-bold transition-all text-center ${
                            renewPaymentMode === 'PAY_NOW' ? 'bg-[#d0bcff] text-[#3c0091]' : 'text-[#958ea0]'
                          }`}
                        >
                          Pay Now
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenewPaymentMode('PAY_LATER')}
                          className={`py-1 rounded-lg text-[10px] font-bold transition-all text-center ${
                            renewPaymentMode === 'PAY_LATER' ? 'bg-[#d0bcff] text-[#3c0091]' : 'text-[#958ea0]'
                          }`}
                        >
                          Pay Later
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-[#273647] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    resetForm();
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#958ea0] hover:bg-[#1c2b3c]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedCustomer || !renewPlanId}
                  className="px-4 py-2 rounded-xl bg-[#d0bcff] hover:bg-[#d0bcff]/90 text-[#3c0091] text-xs font-extrabold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Renewing...' : 'Renew Membership'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: BROADCAST ANNOUNCEMENT */}
          {activeTab === 'announcement' && (
            <form onSubmit={handleAnnouncementSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-[#958ea0] uppercase tracking-wider mb-1 block">Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. New Yoga Batch / Holiday"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    className="w-full bg-[#1c2b3c] border border-[#273647] rounded-xl px-2.5 py-1.5 text-xs text-[#d4e4fa] focus:outline-none focus:border-[#d0bcff]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#958ea0] uppercase tracking-wider mb-1 block">Audience Target</label>
                  <select
                    value={annAudience}
                    onChange={(e: any) => setAnnAudience(e.target.value)}
                    className="w-full bg-[#1c2b3c] border border-[#273647] rounded-xl px-2 py-1.5 text-xs text-[#d4e4fa]"
                  >
                    <option value="ALL_MEMBERS">All Active Members</option>
                    <option value="INACTIVE_MEMBERS">Inactive Members</option>
                    <option value="BRANCH_MEMBERS">Branch Members</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#958ea0] uppercase tracking-wider mb-1 block">Message Body *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Type news message to broadcast..."
                  value={annBody}
                  onChange={(e) => setAnnBody(e.target.value)}
                  className="w-full bg-[#1c2b3c] border border-[#273647] rounded-xl px-2.5 py-1.5 text-xs text-[#d4e4fa] focus:outline-none focus:border-[#d0bcff] resize-none"
                />
              </div>

              <div className="pt-2 border-t border-[#273647] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    resetForm();
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#958ea0] hover:bg-[#1c2b3c]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !annTitle || !annBody}
                  className="px-4 py-2 rounded-xl bg-[#d0bcff] hover:bg-[#d0bcff]/90 text-[#3c0091] text-xs font-extrabold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Posting...' : 'Post News'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

