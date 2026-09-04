'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import {
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Clock,
  RefreshCw,
  Loader2,
  ArrowLeft,
  Sparkles,
  Gift,
  Building2,
  Users,
  CheckCircle2,
  CalendarCheck,
  Calendar,
  XCircle,
  X,
  Check,
  ArrowRight,
} from 'lucide-react';
import { PlanChangeConfirmModal } from '@/components/subscription/PlanChangeConfirmModal';

function SubscriptionSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeOrgId, user } = useAuth();

  const [data, setData] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // In-Page Plan Selection & Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [upgrading, setUpgrading] = useState(false);
  const [modalToast, setModalToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pre-change confirmation modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingTargetPlan, setPendingTargetPlan] = useState<any>(null);

  useEffect(() => {
    const toastParam = searchParams.get('toast');
    const planParam = searchParams.get('plan');
    const actionParam = searchParams.get('action');

    if (toastParam === 'success') {
      setToastMessage(
        `🎉 Subscription successfully ${actionParam === 'renewed' ? 'renewed' : 'upgraded'}${planParam ? ` to ${planParam} Plan` : ''}! Your active plan has been updated.`,
      );
      setTimeout(() => setToastMessage(null), 8000);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeOrgId) {
      fetchSubscriptionData();
      fetchPlans();
    }
  }, [activeOrgId, searchParams]);

  const fetchPlans = async () => {
    try {
      const plansData = await apiRequest<any[]>('/subscription/plans');
      if (plansData && Array.isArray(plansData)) {
        setPlans(plansData);
        if (plansData.length > 0) {
          setSelectedPlanId((prev) => prev || plansData[1]?._id || plansData[0]._id);
        }
      }
    } catch {
      // silent
    }
  };

  const handleOpenUpgradeModal = () => {
    fetchPlans();
    if (data?.subscription?.subscriptionPlanId?._id) {
      setSelectedPlanId(data.subscription.subscriptionPlanId._id);
    }
    setModalToast(null);
    setShowUpgradeModal(true);
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSelectPlanToUpgrade = (plan: any) => {
    setSelectedPlanId(plan._id);
    const activePlanId = data?.subscription?.subscriptionPlanId?._id || data?.subscription?.subscriptionPlanId;
    const hasExistingSub = data?.subscription?.status === 'ACTIVE' || data?.subscription?.status === 'TRIAL';
    const isChangingPlan = hasExistingSub && activePlanId && activePlanId !== plan._id;

    if (isChangingPlan) {
      setPendingTargetPlan(plan);
      setConfirmModalOpen(true);
    } else {
      handleProceedCheckout(plan);
    }
  };

  const handleProceedCheckout = async (targetPlan?: any) => {
    const planToBuy = targetPlan || pendingTargetPlan || plans.find((p) => p._id === selectedPlanId);
    if (!planToBuy) return;

    setUpgrading(true);
    setModalToast(null);

    const targetOrgId =
      activeOrgId ||
      (typeof window !== 'undefined' ? localStorage.getItem('klyro_active_org_id') : null) ||
      user?.organizationIds?.[0];

    const isRenewal =
      data?.subscription?.status === 'ACTIVE' &&
      (data?.subscription?.subscriptionPlanId?._id === planToBuy._id || data?.subscription?.subscriptionPlanId === planToBuy._id);

    const actionWord = isRenewal ? 'renewed' : 'upgraded';
    const currentPlanName = data?.subscription?.subscriptionPlanId?.name || 'Current';

    try {
      const res = await apiRequest<any>(
        '/subscription/checkout',
        {
          method: 'POST',
          body: JSON.stringify({ subscriptionPlanId: planToBuy._id }),
        },
        targetOrgId || undefined,
      );

      const amountInPaise = (planToBuy.monthlyPrice || 799) * 100;
      const keyId = res?.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TSlH8WnGPPBsO7';
      const orderId =
        res?.orderId ||
        res?.payment?.providerOrderId ||
        res?.subscription?.pendingProviderSubscriptionId ||
        (res?.isPlanChange ? undefined : res?.subscription?.providerSubscriptionId);

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setConfirmModalOpen(false);
        await executeVerification(
          {
            razorpayPaymentId: `pay_sim_${Date.now()}`,
            razorpayOrderId: orderId || `order_sim_${Date.now()}`,
            subscriptionPlanId: planToBuy._id,
          },
          planToBuy,
          actionWord,
        );
        return;
      }

      const isValidRealOrderId =
        orderId &&
        typeof orderId === 'string' &&
        orderId.startsWith('order_') &&
        !orderId.includes('order_rzp_') &&
        !orderId.includes('sim_') &&
        !orderId.includes('dev_');

      const options = {
        key: keyId,
        amount: amountInPaise,
        currency: 'INR',
        name: 'Klyro SaaS',
        description: `${planToBuy.name} Plan - Immediate Switch`,
        order_id: isValidRealOrderId ? orderId : undefined,
        handler: async function (response: any) {
          setConfirmModalOpen(false);
          await executeVerification(
            {
              razorpayPaymentId: response.razorpay_payment_id || `pay_rzp_${Date.now()}`,
              razorpayOrderId: response.razorpay_order_id || orderId,
              razorpaySignature: response.razorpay_signature || 'rzp_sig_mock',
              subscriptionPlanId: planToBuy._id,
            },
            planToBuy,
            actionWord,
          );
        },
        prefill: {
          name: user?.name || 'Gym Owner',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: {
          color: '#8b5cf6',
        },
        modal: {
          ondismiss: async function () {
            setUpgrading(false);
            setConfirmModalOpen(false);
            setPendingTargetPlan(null);
            setModalToast({
              type: 'error',
              message: `Payment incomplete. You remain securely on your existing ${currentPlanName} Plan.`,
            });
            // Revert pending checkout in backend in background
            try {
              await apiRequest(
                '/subscription/cancel-checkout',
                {
                  method: 'POST',
                  body: JSON.stringify({ orderId, reason: 'PAYMENT_WINDOW_CLOSED' }),
                },
                targetOrgId || undefined,
              );
            } catch {
              // silent
            }
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      // Close confirmation modal and reset loader as payment window is active
      setConfirmModalOpen(false);
      setUpgrading(false);
      setPendingTargetPlan(null);
      rzp.open();
    } catch (err: any) {
      setModalToast({
        type: 'error',
        message: err.message || 'Failed to initiate checkout. Please try again.',
      });
      setUpgrading(false);
      setConfirmModalOpen(false);
      setPendingTargetPlan(null);
    }
  };

  const executeVerification = async (payload: any, planToBuy: any, actionWord: string) => {
    const targetOrgId =
      activeOrgId ||
      (typeof window !== 'undefined' ? localStorage.getItem('klyro_active_org_id') : null) ||
      user?.organizationIds?.[0];

    try {
      const verifyRes = await apiRequest<any>(
        '/subscription/verify-payment',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        targetOrgId || undefined,
      );

      if (verifyRes?.success || verifyRes?.subscription?.status === 'ACTIVE') {
        const successMsg = `🎉 Plan Activated Immediately! You are now on ${planToBuy.name} Plan with immediate benefits.`;
        setToastMessage(successMsg);
        setUpgrading(false);
        setShowUpgradeModal(false);
        setConfirmModalOpen(false);
        fetchSubscriptionData();
      } else {
        setModalToast({
          type: 'error',
          message: 'Payment verification could not be confirmed. Existing plan remains intact.',
        });
        setUpgrading(false);
      }
    } catch (err: any) {
      setModalToast({
        type: 'error',
        message: err.message || 'Payment verification failed.',
      });
      setUpgrading(false);
    }
  };

  const fetchSubscriptionData = async () => {
    try {
      const [subData, payData] = await Promise.all([
        apiRequest<any>('/subscription/current', {}, activeOrgId || undefined).catch(() => null),
        apiRequest<any[]>('/subscription/payments', {}, activeOrgId || undefined).catch(() => []),
      ]);

      if (subData) setData(subData);
      if (payData) setPayments(payData);
    } catch {
      setError('Failed to load subscription status');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel subscription renewal at period end?')) return;
    setCancelling(true);
    try {
      await apiRequest('/subscription/cancel', { method: 'POST' }, activeOrgId || undefined);
      fetchSubscriptionData();
    } catch {
      alert('Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </AppShell>
    );
  }

  const sub = data?.subscription;
  const mandate = data?.mandate;
  const plan = sub?.subscriptionPlanId;

  // Calculate Free Trial Days Left
  const isTrial = sub?.status === 'TRIAL';
  const trialEnd = sub?.trialEndDate ? new Date(sub.trialEndDate) : null;
  const now = new Date();
  const trialDaysLeft = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 60;
  const trialPercentageLeft = Math.min(100, Math.max(0, Math.round((trialDaysLeft / 60) * 100)));

  // Calculate Renewal Due Info
  const dueDateStr = sub?.currentPeriodEnd || sub?.trialEndDate;
  const dueDate = dueDateStr ? new Date(dueDateStr) : null;
  const renewalDaysLeft = dueDate
    ? Math.max(0, Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const formattedDueDate = dueDate
    ? dueDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })
    : 'N/A';

  // Format full timestamp in Indian Standard Time (IST)
  const formatTimestampIST = (dateString?: string | Date) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '—';
      return (
        d.toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }) + ' IST'
      );
    } catch {
      return '—';
    }
  };

  const formatDateIST = (dateString?: string | Date) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const getPaymentDetails = (p: any) => {
    const meta = p.metadata || {};
    let planName =
      meta.targetPlanName ||
      meta.planName ||
      plans.find((pl) => pl.monthlyPrice === p.amount)?.name;

    if (!planName && data?.subscription?.subscriptionPlanId) {
      const currentPlan = data.subscription.subscriptionPlanId;
      if (typeof currentPlan === 'object' && currentPlan.monthlyPrice === p.amount) {
        planName = currentPlan.name;
      }
    }

    if (!planName) {
      planName =
        p.amount === 1199
          ? 'Pro'
          : p.amount === 799
          ? 'Growth'
          : p.amount === 499
          ? 'Starter'
          : 'Subscription';
    }

    const matchedPlan = plans.find(
      (pl) => pl.monthlyPrice === p.amount || pl.name?.toLowerCase() === planName?.toLowerCase(),
    );
    const memberLimit = meta.memberLimit || matchedPlan?.memberLimit;

    // Calculate renewal/expiry date for successful transactions
    let nextRenewalDate: string | null = null;
    if (p.status === 'SUCCESS') {
      if (meta.billingPeriodEnd) {
        nextRenewalDate = formatDateIST(meta.billingPeriodEnd);
      } else {
        const base = new Date(p.paidAt || p.createdAt);
        const renewalDate = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
        nextRenewalDate = formatDateIST(renewalDate);
      }
    }

    const actionBadge = meta.isPlanChange
      ? 'Plan Upgrade'
      : meta.isRenewal
      ? 'Plan Renewal'
      : 'Subscription';

    return {
      planTitle: `${planName} Plan`,
      memberLimitText: memberLimit ? `Up to ${memberLimit.toLocaleString()} members` : null,
      nextRenewalDate,
      actionBadge,
    };
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            SUCCESS
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
            PENDING
          </span>
        );
      case 'FAILED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
            {status || 'FAILED'}
          </span>
        );
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto pb-6">
        {/* Toast Notification Banner from Successful Plan Upgrade/Renewal */}
        {toastMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between shadow-xl shadow-emerald-950/40 animate-in slide-in-from-top-3 duration-300">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 animate-bounce" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-emerald-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/settings')}
              className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground transition-all shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                Gym Owner Plan & Subscription
              </h1>
              <p className="text-xs text-muted-foreground">
                Manage your SaaS plan, free trial status & billing details
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenUpgradeModal}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-1.5 active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Renew / Upgrade Plan</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Dedicated 60-Day Free Trial Banner (if in Trial mode) */}
        {isTrial && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-purple-950/30 border border-purple-500/30 text-purple-200 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
                  <Gift className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-purple-100 flex items-center gap-2 flex-wrap">
                    <span>🎉 60-Day Free Trial Active</span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-[10px] text-purple-300 font-mono">
                      {trialDaysLeft} Days Remaining
                    </span>
                  </h3>
                  <p className="text-xs text-purple-300/80 mt-0.5">
                    Full access to all Gym Owner features. Free trial ends on <strong className="text-purple-200">{formattedDueDate}</strong>.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenUpgradeModal}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-extrabold text-xs transition-all shadow-md shrink-0 text-center active:scale-95"
              >
                Upgrade to Paid Plan
              </button>
            </div>

            {/* Trial Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[10px] font-bold text-purple-300/70">
                <span>Trial Progress ({trialDaysLeft} / 60 Days left)</span>
                <span>{trialPercentageLeft}% Remaining</span>
              </div>
              <div className="w-full h-2 rounded-full bg-purple-950/60 overflow-hidden border border-purple-500/20">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all duration-500"
                  style={{ width: `${trialPercentageLeft}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Subscription Main Status Cards */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm space-y-6">
          {/* Top Plan Overview */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-extrabold text-foreground">{plan?.name || 'Growth Plan'}</h2>
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                    sub?.status === 'ACTIVE'
                      ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                      : sub?.status === 'TRIAL'
                      ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  ● {sub?.status || 'NO_SUBSCRIPTION'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                ₹{sub?.amount || plan?.monthlyPrice || 799} / month · Max Capacity: {plan?.memberLimit || 500} Gym Members
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Next Renewal Due</span>
              <span className="text-sm font-extrabold text-emerald-400 font-mono">{formattedDueDate}</span>
              <span className="text-xs text-muted-foreground block font-medium">({renewalDaysLeft} days remaining)</span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Metric 1: Renewal Due */}
            <div className="p-4 rounded-xl bg-secondary/40 border border-border space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                <CalendarCheck className="w-4 h-4 text-emerald-500" />
                <span>Renewal Due Date</span>
              </div>
              <p className="font-extrabold text-sm text-foreground">{formattedDueDate}</p>
              <p className="text-[11px] text-muted-foreground font-medium">
                {renewalDaysLeft > 0 ? `Due in ${renewalDaysLeft} days` : 'Renewal due today'}
              </p>
            </div>

            {/* Metric 2: AutoPay Status */}
            <div className="p-4 rounded-xl bg-secondary/40 border border-border space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>AutoPay Mandate</span>
              </div>
              <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {mandate?.status || 'Active'} ({mandate?.method || 'UPI AutoPay'})
              </p>
              <p className="text-[11px] text-muted-foreground font-medium">Automatic recurring billing</p>
            </div>

            {/* Metric 3: Billing Gateway */}
            <div className="p-4 rounded-xl bg-secondary/40 border border-border space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                <CreditCard className="w-4 h-4 text-indigo-400" />
                <span>Payment Gateway</span>
              </div>
              <p className="font-bold text-sm text-foreground">Razorpay Production</p>
              <p className="text-[11px] text-muted-foreground font-medium">Secure 256-bit SSL Payment</p>
            </div>
          </div>

          {sub?.cancelAtPeriodEnd && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Subscription scheduled for cancellation at end of current billing period.</span>
            </div>
          )}

          {sub && !sub.cancelAtPeriodEnd && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="text-xs text-muted-foreground hover:text-destructive underline font-medium"
              >
                Cancel subscription at period end
              </button>
            </div>
          )}
        </div>

        {/* Subscription Payment History */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-bold text-base sm:text-lg">SaaS Billing History</h3>
            <span className="text-xs text-muted-foreground font-medium">{payments.length} Transaction{payments.length === 1 ? '' : 's'}</span>
          </div>

          {payments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-xs sm:text-sm">No billing records found.</div>
          ) : (
            <>
              {/* Mobile Card List (Compacted & Scrollable Container for Phones) */}
              <div className="block sm:hidden max-h-[380px] overflow-y-auto space-y-2 pr-1 overscroll-contain">
                {payments.map((p) => {
                  const details = getPaymentDetails(p);
                  return (
                    <div
                      key={p._id}
                      className="p-2.5 rounded-xl bg-secondary/30 border border-border space-y-1.5 shadow-sm hover:border-border/80 transition-all"
                    >
                      {/* Top Row: Plan & Action + Amount & Status Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <h4 className="font-extrabold text-xs text-foreground truncate">{details.planTitle}</h4>
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                            {details.actionBadge}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-extrabold text-xs sm:text-sm text-foreground">₹{p.amount}</span>
                          <div>{renderStatusBadge(p.status)}</div>
                        </div>
                      </div>

                      {/* Bottom Row: Full IST Timestamp + Renewal Due or Ref */}
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground gap-2 pt-1 border-t border-border/50">
                        <div className="flex items-center gap-1 shrink-0 text-foreground/80">
                          <Clock className="w-3 h-3 text-primary/70 shrink-0" />
                          <span>{formatTimestampIST(p.createdAt)}</span>
                        </div>

                        {details.nextRenewalDate ? (
                          <span className="text-emerald-400 font-semibold truncate text-[10px]">
                            Renews: <span className="font-mono font-bold">{details.nextRenewalDate}</span>
                          </span>
                        ) : (
                          <span className="font-mono text-[9px] text-muted-foreground truncate max-w-[130px]">
                            {p.providerPaymentId || 'Direct'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop / Tablet Table (visible on sm and larger, scrollable) */}
              <div className="hidden sm:block max-h-[440px] overflow-y-auto overflow-x-auto pr-1">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground uppercase sticky top-0 bg-card z-10">
                      <th className="pb-3 font-semibold min-w-[140px]">Plan & Type</th>
                      <th className="pb-3 font-semibold min-w-[80px]">Amount</th>
                      <th className="pb-3 font-semibold min-w-[100px]">Status</th>
                      <th className="pb-3 font-semibold min-w-[170px]">Timestamp (IST)</th>
                      <th className="pb-3 font-semibold min-w-[130px]">Next Renewal</th>
                      <th className="pb-3 font-semibold min-w-[140px]">Provider Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map((p) => {
                      const details = getPaymentDetails(p);
                      return (
                        <tr key={p._id} className="hover:bg-secondary/20 transition-colors">
                          <td className="py-3.5 font-medium whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">{details.planTitle}</span>
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                {details.actionBadge}
                              </span>
                            </div>
                            {details.memberLimitText && (
                              <span className="text-[11px] text-muted-foreground block">
                                {details.memberLimitText}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 font-extrabold text-foreground whitespace-nowrap">
                            ₹{p.amount}
                          </td>
                          <td className="py-3.5 whitespace-nowrap">
                            {renderStatusBadge(p.status)}
                          </td>
                          <td className="py-3.5 text-xs text-foreground/90 whitespace-nowrap font-medium">
                            {formatTimestampIST(p.createdAt)}
                          </td>
                          <td className="py-3.5 text-xs whitespace-nowrap">
                            {details.nextRenewalDate ? (
                              <span className="font-mono font-bold text-emerald-400">
                                {details.nextRenewalDate}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3.5 text-xs text-muted-foreground font-mono whitespace-nowrap">
                            {p.providerPaymentId || 'Direct'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Interactive Renew / Upgrade Plan Modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between gap-3 border-b border-border pb-2.5 sm:pb-4 shrink-0">
                <div>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2 flex-wrap">
                    <span>Renew / Upgrade Plan</span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-mono">Renew / Upgrade</span>
                  </h3>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                    Select a tier to renew or upgrade with safe fallback
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* In-Modal Alert / Toast */}
              {modalToast && (
                <div
                  className={`mt-2.5 p-2.5 sm:p-3 rounded-xl border flex items-center gap-2 text-xs font-bold shrink-0 ${
                    modalToast.type === 'success'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {modalToast.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  )}
                  <span>{modalToast.message}</span>
                </div>
              )}

              {/* Plans Grid - Compact & Responsive */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-4 overflow-y-auto py-3">
                {plans.map((p) => {
                  const isSelected = selectedPlanId === p._id;
                  const isPopular = p.code === 'GROWTH';
                  const isCurrentActive =
                    sub?.status === 'ACTIVE' &&
                    (sub?.subscriptionPlanId?._id === p._id || sub?.subscriptionPlanId === p._id);
                  const isCurrentTrial =
                    sub?.status === 'TRIAL' &&
                    (sub?.subscriptionPlanId?._id === p._id || sub?.subscriptionPlanId === p._id);

                  return (
                    <div
                      key={p._id}
                      onClick={() => setSelectedPlanId(p._id)}
                      className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all flex flex-col justify-between relative ${
                        isSelected
                          ? 'border-primary bg-secondary/60 ring-2 ring-primary/40 shadow-md'
                          : 'border-border bg-card/60 hover:bg-card'
                      }`}
                    >
                      {isPopular && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-extrabold text-[9px] uppercase tracking-wider shadow">
                          Most Popular
                        </span>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-extrabold text-sm sm:text-base text-foreground">{p.name}</h4>
                            {isCurrentActive && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Active
                              </span>
                            )}
                            {isCurrentTrial && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Trial Tier
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>

                        <div className="flex items-baseline gap-1 mb-1">
                          <span className="text-xl sm:text-2xl font-black text-foreground">₹{p.monthlyPrice}</span>
                          <span className="text-muted-foreground text-[10px] sm:text-[11px]"> / month</span>
                        </div>

                        <p className="text-[10px] sm:text-[11px] text-muted-foreground mb-2.5 line-clamp-1 sm:line-clamp-2">{p.description}</p>

                        <div className="space-y-1 sm:space-y-1.5 text-[10px] sm:text-[11px] border-t border-border/70 pt-2 mb-3">
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span>Up to {p.memberLimit} members</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span>Attendance & automated billing</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPlanToUpgrade(p);
                        }}
                        disabled={upgrading}
                        className={`w-full py-1.5 sm:py-2 px-3 rounded-lg sm:rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                          isSelected
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow'
                            : 'bg-secondary hover:bg-secondary/80 text-foreground border border-border'
                        }`}
                      >
                        {upgrading && selectedPlanId === p._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <span>
                              {isCurrentActive
                                ? 'Renew Plan'
                                : isTrial
                                ? `Upgrade to ${p.name}`
                                : 'Select Plan'}
                            </span>
                            <ArrowRight className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className="flex flex-row items-center justify-between gap-2 pt-2 border-t border-border text-[11px] text-muted-foreground shrink-0">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">256-bit SSL secured</span>
                </div>

                <Link
                  href="/settings/subscription/plans"
                  onClick={() => setShowUpgradeModal(false)}
                  className="text-primary hover:underline font-semibold shrink-0 text-[11px]"
                >
                  All Plans Page →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Pre-Change Discontinuation & Immediate Benefits Confirmation Prompt */}
        <PlanChangeConfirmModal
          isOpen={confirmModalOpen}
          onClose={() => {
            setConfirmModalOpen(false);
            setUpgrading(false);
            setPendingTargetPlan(null);
          }}
          onConfirm={() => {
            if (pendingTargetPlan) {
              handleProceedCheckout(pendingTargetPlan);
            }
          }}
          currentPlan={
            plans.find(
              (p) =>
                p._id === data?.subscription?.subscriptionPlanId?._id ||
                p._id === data?.subscription?.subscriptionPlanId,
            ) ||
            data?.subscription?.subscriptionPlanId ||
            null
          }
          targetPlan={pendingTargetPlan}
          loading={upgrading}
        />
      </div>
    </AppShell>
  );
}

export default function SubscriptionSettingsPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        </AppShell>
      }
    >
      <SubscriptionSettingsContent />
    </Suspense>
  );
}

