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
    if (!phone || phone.length < 8 || !activeOrgId) {
      setDuplicateWarning(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest<{ exists: boolean; customer?: any; activeMembership?: any; outstandingBalance?: number }>(
          `/gym/members/check-duplicate?phone=${encodeURIComponent(phone)}`,
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
    if (!activeOrgId || !firstName || !phone || !selectedPlanId) return;

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
            phone,
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
    if (!activeOrgId || !selectedCustomer || !collectAmount) return;

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
    if (!activeOrgId || !selectedCustomer || !renewPlanId) return;

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
    if (!activeOrgId || !annTitle || !annBody) return;

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

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-secondary/10 px-6 gap-2">
          <button
            onClick={() => setActiveTab('onboard')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-semibold transition-all ${
              activeTab === 'onboard'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </button>

          <button
            onClick={() => setActiveTab('payment')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-semibold transition-all ${
              activeTab === 'payment'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Collect Payment</span>
          </button>

          <button
            onClick={() => setActiveTab('renew')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-semibold transition-all ${
              activeTab === 'renew'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Renew Member</span>
          </button>

          <button
            onClick={() => setActiveTab('announcement')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-semibold transition-all ${
              activeTab === 'announcement'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Broadcast</span>
          </button>
        </div>

        {/* Alerts */}
        <div className="px-6 pt-4">
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: ADD MEMBER */}
          {activeTab === 'onboard' && (
            <form onSubmit={handleOnboardSubmit} className="space-y-4">
              {/* Duplicate Detection Alert */}
              {duplicateWarning && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold">
                    <span>Member Already Exists with this Phone!</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-[10px]">
                      {duplicateWarning.customer?.customerCode}
                    </span>
                  </div>
                  <p>
                    {duplicateWarning.customer?.firstName} {duplicateWarning.customer?.lastName || ''} ·{' '}
                    {duplicateWarning.activeMembership?.planName || 'No Active Membership'} · Outstanding: ₹
                    {duplicateWarning.outstandingBalance || 0}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        router.push(`/customers/${duplicateWarning.customer?._id}`);
                      }}
                      className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold"
                    >
                      Open Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(duplicateWarning.customer);
                        setActiveTab('renew');
                      }}
                      className="px-3 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-xs font-semibold"
                    >
                      Renew Instead
                    </button>
                  </div>
                </div>
              )}

              {/* Primary Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Last Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sharma"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              {/* Membership Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Membership Plan *</label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  >
                    {plans.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} — ₹{p.price.toLocaleString()} ({p.duration} {p.durationType.toLowerCase()})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Pricing calculation callout */}
              <div className="p-3 rounded-xl bg-secondary/40 border border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Automatic Invoice Total:</span>
                <span className="text-base font-bold text-foreground">₹{finalPrice.toLocaleString()}</span>
              </div>

              {/* Payment Mode */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-semibold text-muted-foreground block">Payment Collection</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('PAY_NOW')}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                      paymentMode === 'PAY_NOW'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-secondary/30 text-muted-foreground'
                    }`}
                  >
                    <div className="font-bold">● Pay Now</div>
                    <div className="text-[11px] opacity-75 mt-0.5">Record payment immediately (Invoice = PAID)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('PAY_LATER')}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                      paymentMode === 'PAY_LATER'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-secondary/30 text-muted-foreground'
                    }`}
                  >
                    <div className="font-bold">○ Pay Later</div>
                    <div className="text-[11px] opacity-75 mt-0.5">Generate invoice in OPEN status</div>
                  </button>
                </div>

                {paymentMode === 'PAY_NOW' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-xl bg-secondary/20 border border-border">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-xs"
                      >
                        <option value="UPI">UPI</option>
                        <option value="CASH">Cash</option>
                        <option value="CARD">Card</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Reference / UTR</label>
                      <input
                        type="text"
                        placeholder="Optional"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-xs"
                      >
                      </input>
                    </div>
                  </div>
                )}
              </div>

              {/* Progressive Disclosure: More Details */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowMoreDetails(!showMoreDetails)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  {showMoreDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{showMoreDetails ? 'Hide Additional Details' : 'Add More Details (Email, Address, Notes)'}</span>
                </button>

                {showMoreDetails && (
                  <div className="mt-3 space-y-3 p-4 rounded-xl bg-secondary/20 border border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Email</label>
                        <input
                          type="email"
                          placeholder="member@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Gender</label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-full bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-xs"
                        >
                          <option value="UNSPECIFIED">Unspecified</option>
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Address</label>
                      <input
                        type="text"
                        placeholder="Street / Area"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Emergency Contact</label>
                      <input
                        type="text"
                        placeholder="Name & Contact number"
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Notes</label>
                      <input
                        type="text"
                        placeholder="Special instructions or medical notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !!duplicateWarning}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Onboarding...' : 'Complete Onboarding'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: COLLECT PAYMENT */}
          {activeTab === 'payment' && (
            <form onSubmit={handleCollectPaymentSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Find Member</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name, phone or code (e.g. CUST-1001)..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-2 border border-border rounded-xl bg-card overflow-hidden divide-y divide-border shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map((c) => (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerSearch(`${c.firstName} ${c.lastName || ''} (${c.phone})`);
                          setSearchResults([]);
                        }}
                        className="w-full p-3 text-left hover:bg-secondary/40 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-foreground">
                            {c.firstName} {c.lastName}
                          </span>
                          <span className="text-muted-foreground ml-2 font-mono">({c.customerCode})</span>
                        </div>
                        <span className="text-muted-foreground">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedCustomer && (
                <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">
                      {selectedCustomer.firstName} {selectedCustomer.lastName}
                    </span>
                    <span className="font-mono text-muted-foreground">{selectedCustomer.customerCode}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Amount (₹) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="e.g. 1500"
                        value={collectAmount}
                        onChange={(e) => setCollectAmount(Number(e.target.value) || '')}
                        className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Payment Method</label>
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
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Notes / Reference</label>
                    <input
                      type="text"
                      placeholder="Optional notes"
                      value={collectNotes}
                      onChange={(e) => setCollectNotes(e.target.value)}
                      className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* List of Pending Payment Members when no member is selected */}
              {!selectedCustomer && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-amber-400" />
                      Members with Pending Payments ({pendingInvoices.length})
                    </span>
                    {isLoadingPending && <span className="text-[11px] text-muted-foreground animate-pulse">Updating...</span>}
                  </div>

                  {pendingInvoices.length === 0 ? (
                    <div className="p-4 rounded-xl bg-secondary/20 border border-border text-center text-xs text-muted-foreground">
                      No pending payment members found. All invoices are fully settled!
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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
                            className="p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 border border-border transition-all cursor-pointer flex items-center justify-between group shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 font-bold text-xs flex items-center justify-center border border-amber-500/20">
                                {cust.firstName?.charAt(0)?.toUpperCase() || 'M'}
                              </div>
                              <div>
                                <div className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                                  {cust.firstName} {cust.lastName || ''}
                                  <span className="ml-2 font-mono text-[11px] text-muted-foreground font-normal">
                                    ({cust.customerCode})
                                  </span>
                                </div>
                                <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                  <span>{cust.phone}</span>
                                  <span>•</span>
                                  <span className="font-mono text-indigo-400">{inv.invoiceNumber}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-xs font-extrabold text-amber-400">
                                ₹{dueAmount.toLocaleString()} Due
                              </div>
                              <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                                {inv.status}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedCustomer || !collectAmount}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Collect Payment'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: RENEW MEMBER */}
          {activeTab === 'renew' && (
            <form onSubmit={handleRenewSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Select Member to Renew</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search member by name or phone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-2 border border-border rounded-xl bg-card overflow-hidden divide-y divide-border shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map((c) => (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerSearch(`${c.firstName} ${c.lastName || ''}`);
                          setSearchResults([]);
                        }}
                        className="w-full p-3 text-left hover:bg-secondary/40 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-foreground">
                            {c.firstName} {c.lastName}
                          </span>
                          <span className="text-muted-foreground ml-2 font-mono">({c.customerCode})</span>
                        </div>
                        <span className="text-muted-foreground">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Immediate Expiring / Expired Members List */}
                {!selectedCustomer && searchResults.length === 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                      <span>Expiring & Expired Members ({expiringMemberships.length})</span>
                      {isLoadingExpiring && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                    </div>

                    {expiringMemberships.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">No expiring members found.</p>
                    ) : (
                      <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                        {expiringMemberships.map((m) => {
                          const cust = m.customerId;
                          if (!cust) return null;
                          const planName = m.membershipPlanId?.name || 'Membership';
                          const isExp = new Date(m.endDate) < new Date();
                          return (
                            <div
                              key={m._id}
                              onClick={() => {
                                setSelectedCustomer(cust);
                                setCustomerSearch(`${cust.firstName} ${cust.lastName || ''}`);
                              }}
                              className="p-2.5 rounded-xl bg-secondary/30 border border-border hover:border-primary/50 transition-all cursor-pointer flex items-center justify-between text-xs group"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs">
                                  {cust.firstName?.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                                    {cust.firstName} {cust.lastName || ''}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {planName} · <span className="font-mono">{cust.customerCode}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isExp
                                      ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  }`}
                                >
                                  {isExp ? 'Expired' : `Exp: ${new Date(m.endDate).toLocaleDateString()}`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedCustomer && (
                <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">
                      Renewing: {selectedCustomer.firstName} {selectedCustomer.lastName}
                    </span>
                    <span className="font-mono text-muted-foreground">{selectedCustomer.customerCode}</span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Renewal Plan *</label>
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

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setRenewPaymentMode('PAY_NOW')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        renewPaymentMode === 'PAY_NOW'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-secondary/30 text-muted-foreground'
                      }`}
                    >
                      ✓ Pay Now
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenewPaymentMode('PAY_LATER')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        renewPaymentMode === 'PAY_LATER'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-secondary/30 text-muted-foreground'
                      }`}
                    >
                      ○ Pay Later
                    </button>
                  </div>

                  {renewPaymentMode === 'PAY_NOW' && (
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Payment Method</label>
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
                </div>
              )}

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedCustomer || !renewPlanId}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Renewing...' : 'Renew Membership'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: BROADCAST ANNOUNCEMENT */}
          {activeTab === 'announcement' && (
            <form onSubmit={handleAnnouncementSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Announcement Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special Holiday Hours / New Yoga Batch"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Message Content *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Type message to broadcast to gym members..."
                  value={annBody}
                  onChange={(e) => setAnnBody(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Target Audience</label>
                  <select
                    value={annAudience}
                    onChange={(e: any) => setAnnAudience(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="ALL_MEMBERS">Active Members (All Branches)</option>
                    <option value="INACTIVE_MEMBERS">Inactive Members (All Branches)</option>
                    <option value="BRANCH_MEMBERS">Branch + Active Members</option>
                    <option value="BRANCH_INACTIVE_MEMBERS">Branch + Inactive Members</option>
                  </select>
                </div>
                {(annAudience === 'BRANCH_MEMBERS' || annAudience === 'BRANCH_INACTIVE_MEMBERS') && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Target Branch</label>
                    <select
                      value={annBranchId}
                      onChange={(e) => setAnnBranchId(e.target.value)}
                      className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm"
                    >
                      {branches.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !annTitle || !annBody}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Broadcasting...' : 'Broadcast Now'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
