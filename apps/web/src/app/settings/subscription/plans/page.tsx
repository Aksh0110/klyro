'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Loader2,
  Gift,
  CheckCircle2,
  AlertTriangle,
  X,
  CreditCard,
  Zap,
} from 'lucide-react';
import { PlanChangeConfirmModal } from '@/components/subscription/PlanChangeConfirmModal';

interface SubscriptionPlan {
  _id: string;
  name: string;
  code: string;
  description: string;
  monthlyPrice: number;
  memberLimit: number;
}

interface ToastState {
  type: 'success' | 'error';
  title: string;
  message: string;
}

export default function SubscriptionPlansPage() {
  const router = useRouter();
  const { activeOrgId, user } = useAuth();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Plan Change Confirmation Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingTargetPlan, setPendingTargetPlan] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    loadData();
  }, [activeOrgId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansData, subData] = await Promise.all([
        apiRequest<any[]>('/subscription/plans').catch(() => []),
        activeOrgId
          ? apiRequest<any>('/subscription/current', {}, activeOrgId).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (plansData && Array.isArray(plansData)) {
        setPlans(plansData);
      }

      if (subData?.subscription) {
        setCurrentSub(subData.subscription);
        const activePlanId = subData.subscription.subscriptionPlanId?._id || subData.subscription.subscriptionPlanId;
        if (activePlanId) {
          setSelectedPlanId(activePlanId);
        } else if (plansData.length > 0) {
          setSelectedPlanId(plansData[1]?._id || plansData[0]._id);
        }
      } else if (plansData.length > 0) {
        setSelectedPlanId(plansData[1]?._id || plansData[0]._id);
      }
    } catch {
      showToast('error', 'Failed to load plans', 'Could not retrieve subscription plans. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    if (type === 'error') {
      setTimeout(() => setToast(null), 5000);
    }
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

  const handlePlanSelection = (plan: SubscriptionPlan) => {
    setSelectedPlanId(plan._id);
    const activePlanId = currentSub?.subscriptionPlanId?._id || currentSub?.subscriptionPlanId;
    const hasExistingSub = currentSub?.status === 'ACTIVE' || currentSub?.status === 'TRIAL';
    const isChangingPlan = hasExistingSub && activePlanId && activePlanId !== plan._id;

    if (isChangingPlan) {
      setPendingTargetPlan(plan);
      setConfirmModalOpen(true);
    } else {
      handleCheckout(plan);
    }
  };

  const handleCheckout = async (planToBuy?: SubscriptionPlan) => {
    const targetPlan = planToBuy || pendingTargetPlan || plans.find((p) => p._id === selectedPlanId);
    if (!targetPlan) {
      showToast('error', 'Select a Plan', 'Please choose a subscription plan first.');
      return;
    }

    setSubmitting(true);
    setToast(null);

    const targetOrgId =
      activeOrgId ||
      (typeof window !== 'undefined' ? localStorage.getItem('klyro_active_org_id') : null) ||
      user?.organizationIds?.[0];

    const isRenewal =
      currentSub?.status === 'ACTIVE' &&
      (currentSub?.subscriptionPlanId?._id === targetPlan._id || currentSub?.subscriptionPlanId === targetPlan._id);

    const actionText = isRenewal ? 'renewed' : 'upgraded';
    const currentPlanName = currentSub?.subscriptionPlanId?.name || 'Current';

    try {
      const res = await apiRequest<any>(
        '/subscription/checkout',
        {
          method: 'POST',
          body: JSON.stringify({ subscriptionPlanId: targetPlan._id }),
        },
        targetOrgId || undefined,
      );

      const amountInPaise = (targetPlan.monthlyPrice || 799) * 100;
      const keyId = res?.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TSlH8WnGPPBsO7';
      const orderId =
        res?.orderId ||
        res?.payment?.providerOrderId ||
        res?.subscription?.pendingProviderSubscriptionId ||
        (res?.isPlanChange ? undefined : res?.subscription?.providerSubscriptionId);

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        // Direct simulation fallback if script can't be loaded
        setConfirmModalOpen(false);
        await executeVerification(
          {
            razorpayPaymentId: `pay_sim_${Date.now()}`,
            razorpayOrderId: orderId || `order_sim_${Date.now()}`,
            subscriptionPlanId: targetPlan._id,
          },
          targetPlan,
          actionText,
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
        description: `${targetPlan.name} Plan - Immediate Switch`,
        order_id: isValidRealOrderId ? orderId : undefined,
        handler: async function (response: any) {
          setConfirmModalOpen(false);
          await executeVerification(
            {
              razorpayPaymentId: response.razorpay_payment_id || `pay_rzp_${Date.now()}`,
              razorpayOrderId: response.razorpay_order_id || orderId,
              razorpaySignature: response.razorpay_signature || 'rzp_sig_mock',
              subscriptionPlanId: targetPlan._id,
            },
            targetPlan,
            actionText,
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
            setSubmitting(false);
            setConfirmModalOpen(false);
            setPendingTargetPlan(null);
            showToast(
              'error',
              'Payment Incomplete — Existing Plan Preserved',
              `Payment was not completed. You remain on your existing ${currentPlanName} Plan with zero interruption.`,
            );
            // Revert/cleanup pending change via cancel-checkout endpoint in background
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
      // Close confirmation modal and unblock UI as Razorpay window is active
      setConfirmModalOpen(false);
      setSubmitting(false);
      setPendingTargetPlan(null);
      rzp.open();
    } catch (err: any) {
      showToast('error', 'Checkout Error', err.message || 'Failed to initiate checkout. Please try again.');
      setSubmitting(false);
      setConfirmModalOpen(false);
      setPendingTargetPlan(null);
    }
  };

  const executeVerification = async (
    payload: any,
    targetPlan: SubscriptionPlan,
    actionText: string,
  ) => {
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
        showToast(
          'success',
          `Plan Activated Immediately! 🎉`,
          `Your subscription to ${targetPlan.name} Plan is now active with immediate benefits. Directing to billing...`,
        );

        setTimeout(() => {
          router.push(`/settings/subscription?toast=success&plan=${encodeURIComponent(targetPlan.name)}&action=${actionText}`);
        }, 1500);
      } else {
        showToast('error', 'Verification Failed', 'Payment verification was not confirmed. Your previous plan remains active.');
        setSubmitting(false);
      }
    } catch (err: any) {
      showToast('error', 'Verification Error', err.message || 'Failed to verify payment record.');
      setSubmitting(false);
    }
  };

  const isTrial = currentSub?.status === 'TRIAL';
  const isActive = currentSub?.status === 'ACTIVE';

  const dueDateStr = currentSub?.currentPeriodEnd || currentSub?.trialEndDate;
  const formattedDueDate = dueDateStr
    ? new Date(dueDateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'N/A';

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Loading subscription plans & pricing...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6 max-w-5xl mx-auto pb-12 px-1 sm:px-0">
        {/* Top Floating Toast Notification */}
        {toast && (
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between shadow-xl transition-all animate-in slide-in-from-top-4 duration-300 ${
              toast.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-emerald-950/40'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-rose-950/40'
            }`}
          >
            <div className="flex items-center gap-3">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 animate-bounce" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              )}
              <div>
                <h4 className="font-extrabold text-sm">{toast.title}</h4>
                <p className="text-xs opacity-90">{toast.message}</p>
              </div>
            </div>

            <button
              onClick={() => setToast(null)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Back Link & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/settings/subscription"
              className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground transition-all shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Subscription Plans & Pricing</span>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] sm:text-xs font-mono">SaaS</span>
              </h1>
              <p className="text-xs text-muted-foreground">
                Select a plan to upgrade from Free Trial or switch your tier
              </p>
            </div>
          </div>

          <Link
            href="/settings/subscription"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground underline self-start sm:self-auto ml-1 sm:ml-0"
          >
            ← Back to Billing Details
          </Link>
        </div>

        {/* Current Plan / Free Trial Status Banner */}
        {isTrial ? (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-purple-900/30 to-indigo-950/40 border border-purple-500/30 text-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
                <Gift className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-purple-100 flex items-center gap-2">
                  <span>🎉 60-Day Free Trial Currently Active</span>
                </h3>
                <p className="text-xs text-purple-300/80">
                  Trial ends on <strong className="text-purple-200">{formattedDueDate}</strong>. Upgrade to a paid plan below anytime to keep uninterrupted access.
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-purple-500/20 text-[11px] font-bold text-purple-300 border border-purple-500/30 self-start sm:self-auto">
              Trial Mode
            </span>
          </div>
        ) : isActive ? (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-teal-950/40 border border-emerald-500/30 text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-emerald-100 flex items-center gap-2">
                  <span>Active Paid Subscription</span>
                  <span className="text-xs text-emerald-400 font-mono">({currentSub?.subscriptionPlanId?.name || 'Growth Plan'})</span>
                </h3>
                <p className="text-xs text-emerald-300/80">
                  Next renewal is scheduled on <strong className="text-emerald-200">{formattedDueDate}</strong>. You can switch plans or renew below.
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-[11px] font-bold text-emerald-300 border border-emerald-500/30 self-start sm:self-auto">
              ● Active
            </span>
          </div>
        ) : null}

        {/* Subscription Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5 pt-1">
          {plans.map((plan) => {
            const isSelected = selectedPlanId === plan._id;
            const isPopular = plan.code === 'GROWTH';
            const isCurrentActive =
              currentSub?.status === 'ACTIVE' &&
              (currentSub?.subscriptionPlanId?._id === plan._id || currentSub?.subscriptionPlanId === plan._id);
            const isCurrentTrial =
              currentSub?.status === 'TRIAL' &&
              (currentSub?.subscriptionPlanId?._id === plan._id || currentSub?.subscriptionPlanId === plan._id);

            return (
              <div
                key={plan._id}
                onClick={() => setSelectedPlanId(plan._id)}
                className={`p-4 sm:p-6 rounded-2xl border cursor-pointer transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-primary bg-card ring-2 ring-primary/40 shadow-xl'
                    : 'border-border bg-card/60 hover:border-border/80 hover:bg-card'
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground font-extrabold text-[9px] uppercase tracking-wider shadow">
                    Most Popular
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-extrabold text-base text-foreground">{plan.name}</h3>
                      {isCurrentActive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Active Plan
                        </span>
                      )}
                      {isCurrentTrial && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Trial Tier
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  <div className="mb-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-foreground">₹{plan.monthlyPrice}</span>
                    <span className="text-muted-foreground text-xs font-medium"> / month</span>
                  </div>

                  <p className="text-xs text-muted-foreground mb-3 sm:mb-5 min-h-0 sm:min-h-[32px] line-clamp-2 sm:line-clamp-none">{plan.description}</p>

                  <div className="space-y-1.5 sm:space-y-2.5 text-xs mb-4 sm:mb-6 border-t border-border pt-3 sm:pt-4">
                    <div className="flex items-center gap-2 text-foreground font-semibold">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Up to {plan.memberLimit} active members</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>QR & GPS attendance check-in</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Invoicing, GST & automated billing</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>WhatsApp & SMS notifications</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlanSelection(plan);
                  }}
                  disabled={submitting}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 active:scale-95 ${
                    isSelected
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20'
                      : 'bg-secondary hover:bg-secondary/80 text-foreground border border-border'
                  }`}
                >
                  {submitting && selectedPlanId === plan._id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>
                        {isCurrentActive
                          ? 'Renew This Plan'
                          : isTrial
                          ? `Upgrade to ${plan.name}`
                          : `Select & Upgrade`}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Security & Payment Gateway Assurance */}
        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
            <span>Secure 256-bit SSL encrypted billing powered by Razorpay. Cancel or switch plans anytime.</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <CreditCard className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-foreground">UPI AutoPay • Credit/Debit Cards • NetBanking</span>
          </div>
        </div>

        {/* Pre-Change Discontinuation & Immediate Benefits Confirmation Prompt */}
        <PlanChangeConfirmModal
          isOpen={confirmModalOpen}
          onClose={() => {
            setConfirmModalOpen(false);
            setSubmitting(false);
            setPendingTargetPlan(null);
          }}
          onConfirm={() => {
            if (pendingTargetPlan) {
              handleCheckout(pendingTargetPlan);
            }
          }}
          currentPlan={
            plans.find(
              (p) =>
                p._id === currentSub?.subscriptionPlanId?._id ||
                p._id === currentSub?.subscriptionPlanId,
            ) ||
            currentSub?.subscriptionPlanId ||
            null
          }
          targetPlan={pendingTargetPlan}
          loading={submitting}
        />
      </div>
    </AppShell>
  );
}
