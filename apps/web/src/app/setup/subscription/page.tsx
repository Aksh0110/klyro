'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import {
  Dumbbell,
  Check,
  CreditCard,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Gift,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

interface SubscriptionPlan {
  _id: string;
  name: string;
  code: string;
  description: string;
  monthlyPrice: number;
  memberLimit: number;
}

export default function SubscriptionSetupPage() {
  const router = useRouter();
  const { activeOrgId, user, logout } = useAuth();

  const handleBack = () => {
    if (step === 'AUTOPAY') {
      setStep('PLAN');
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else if (activeOrgId) {
      router.push('/settings/subscription');
    } else {
      logout();
      router.push('/login');
    }
  };

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [autopayMethod, setAutopayMethod] = useState<'UPI_AUTOPAY' | 'CARD' | 'EMANDATE'>('UPI_AUTOPAY');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [trialActivating, setTrialActivating] = useState(false);
  const [step, setStep] = useState<'PLAN' | 'AUTOPAY'>('PLAN');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [currentSub, setCurrentSub] = useState<any>(null);

  useEffect(() => {
    if (activeOrgId && user) {
      router.replace('/settings/subscription/plans');
      return;
    }
    fetchPlans();
  }, [activeOrgId, user]);

  const fetchPlans = async () => {
    try {
      const data = await apiRequest<any[]>('/subscription/plans');
      if (data && Array.isArray(data)) {
        setPlans(data);
        if (data.length > 0) setSelectedPlanId(data[1]?._id || data[0]._id);
      }
    } catch {
      setError('Failed to fetch subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handleStartFreeTrial = async () => {
    setTrialActivating(true);
    setError('');
    setSuccessMessage('');

    try {
      await apiRequest(
        '/subscription/free-trial',
        {
          method: 'POST',
          body: JSON.stringify({ planCode: 'GROWTH' }),
        },
        activeOrgId || undefined,
      );

      setSuccessMessage('🎉 60-Day Free Trial activated! Directing you to dashboard...');
      setTimeout(() => {
        window.location.replace('/dashboard');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to activate 60-day free trial');
      setTrialActivating(false);
    }
  };

  const [checkoutUrl, setCheckoutUrl] = useState<string>('');

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

  const handleProceedCheckout = async () => {
    if (!selectedPlanId) return;
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    const targetOrgId =
      activeOrgId ||
      (typeof window !== 'undefined' ? localStorage.getItem('klyro_active_org_id') : null) ||
      user?.organizationIds?.[0];

    try {
      const res = await apiRequest<any>(
        '/subscription/checkout',
        {
          method: 'POST',
          body: JSON.stringify({ subscriptionPlanId: selectedPlanId }),
        },
        targetOrgId || undefined,
      );

      const plan = plans.find((p) => p._id === selectedPlanId);
      const amountInPaise = (plan?.monthlyPrice || 799) * 100;
      const keyId = res?.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TSlH8WnGPPBsO7';
      const orderId = res?.subscription?.providerSubscriptionId;

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setError('Failed to load Razorpay SDK. Please check your network connection.');
        setSubmitting(false);
        return;
      }

      const isValidRealOrderId = orderId && orderId.startsWith('order_') && !orderId.includes('order_rzp_');

      const options = {
        key: keyId,
        amount: amountInPaise,
        currency: 'INR',
        name: 'Klyro SaaS',
        description: `${plan?.name || 'Gym'} Subscription`,
        order_id: isValidRealOrderId ? orderId : undefined,
        handler: async function (response: any) {
          try {
            setSubmitting(true);
            setError('');
            const verifyRes = await apiRequest<any>(
              '/subscription/verify-payment',
              {
                method: 'POST',
                body: JSON.stringify({
                  razorpayPaymentId: response.razorpay_payment_id || `pay_rzp_${Date.now()}`,
                  razorpayOrderId: response.razorpay_order_id || orderId,
                  razorpaySignature: response.razorpay_signature || 'rzp_sig_mock',
                  subscriptionPlanId: selectedPlanId,
                }),
              },
              targetOrgId || undefined,
            );

            if (verifyRes?.success || verifyRes?.subscription?.status === 'ACTIVE') {
              setSuccessMessage('🎉 Payment Successful! Subscription activated. Launching Dashboard...');
              setTimeout(() => {
                window.location.replace('/dashboard');
              }, 1200);
            } else {
              setError('Payment verification failed in database. Please try again or contact support.');
              setSubmitting(false);
            }
          } catch (err: any) {
            console.error('Payment verification error:', err);
            setError(err.message || 'Payment verification failed. Please try again.');
            setSubmitting(false);
          }
        },
        prefill: {
          name: user?.name || 'Gym Owner',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: {
          color: '#3395ff',
        },
        modal: {
          ondismiss: function () {
            setError('Payment cancelled or Razorpay checkout window closed. Successful payment is required to access Klyro.');
            setSubmitting(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Failed to initiate Razorpay checkout');
      setSubmitting(false);
    }
  };

  const handleActivateAutopay = async () => {
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    const targetOrgId =
      activeOrgId ||
      (typeof window !== 'undefined' ? localStorage.getItem('klyro_active_org_id') : null) ||
      user?.organizationIds?.[0];

    try {
      const verifyRes = await apiRequest<any>(
        '/subscription/verify-payment',
        {
          method: 'POST',
          body: JSON.stringify({
            razorpayPaymentId: `pay_sim_${Date.now()}`,
            razorpayOrderId: `order_sim_${Date.now()}`,
            subscriptionPlanId: selectedPlanId,
          }),
        },
        targetOrgId || undefined,
      );

      if (verifyRes?.success || verifyRes?.subscription?.status === 'ACTIVE') {
        setSuccessMessage('🎉 Payment Simulated & Verified! Subscription active. Launching Dashboard...');
        setTimeout(() => {
          window.location.replace('/dashboard');
        }, 1200);
      } else {
        setError('Payment verification failed. Please try again.');
        setSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify payment');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-[#d0bcff] animate-spin" />
        <p className="text-xs text-[#958ea0]">Loading Klyro subscription plans...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#051424] text-[#d4e4fa] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative">
      {/* Top Back Navigation Button */}
      <div className="absolute top-6 left-6 z-20">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c2b3c] hover:bg-[#273647] text-[#958ea0] hover:text-[#d4e4fa] text-xs font-semibold transition-all border border-[#273647]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{step === 'AUTOPAY' ? 'Back to Plans' : 'Back'}</span>
        </button>
      </div>

      {/* Floating Notifications Bar */}

      <div className="sm:mx-auto sm:w-full sm:max-w-4xl mb-4 space-y-3">
        {successMessage && (
          <div className="p-4 rounded-2xl bg-[#4edea3]/15 border border-[#4edea3]/40 text-[#4edea3] text-xs font-bold flex items-center justify-between shadow-xl shadow-emerald-950/40 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#4edea3] flex-shrink-0 animate-bounce" />
              <span>{successMessage}</span>
            </div>
            <Sparkles className="w-4 h-4 text-[#4edea3] animate-pulse" />
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-[#ffb4ab]/15 border border-[#ffb4ab]/40 text-[#ffb4ab] text-xs font-bold flex items-center justify-between shadow-xl shadow-rose-950/40 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[#ffb4ab] flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError('')}
              className="text-[#ffb4ab] hover:opacity-80 p-1"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">

        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#8b5cf6] to-[#d0bcff] flex items-center justify-center text-white mx-auto mb-3 shadow-xl shadow-purple-900/30">
          <Dumbbell className="w-7 h-7 text-[#051424]" />
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#d4e4fa]">
          {step === 'PLAN'
            ? currentSub?.status === 'TRIAL'
              ? 'Upgrade to Paid Subscription'
              : currentSub?.status === 'ACTIVE'
              ? 'Change / Upgrade Plan'
              : 'Choose Your Klyro Plan'
            : 'Simulated Payment Gateway'}
        </h2>
        <p className="mt-2 text-xs md:text-sm text-[#958ea0]">
          {step === 'PLAN'
            ? currentSub?.status === 'TRIAL'
              ? 'Select a subscription plan below to upgrade your gym from Free Trial to full paid access'
              : currentSub?.status === 'ACTIVE'
              ? 'Select a plan below to change or upgrade your subscription tier'
              : 'Select a subscription plan or try the 60-day free trial'
            : 'Complete initial payment & AutoPay setup to enter Klyro'}
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-4xl space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 text-[#ffb4ab] text-xs text-center font-medium">
            {error}
          </div>
        )}

        {step === 'PLAN' ? (
          <div className="space-y-8">
            {/* 1. FIRST: SUBSCRIPTION PLANS GRID */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#958ea0]">
                  Subscription Plans (Select a Plan)
                </h3>
                <span className="text-[11px] text-[#d0bcff] font-medium">
                  Monthly Recurring Billing
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan) => {
                  const isSelected = selectedPlanId === plan._id;
                  const isPopular = plan.code === 'GROWTH';
                  const isCurrentPlan =
                    currentSub?.subscriptionPlanId?._id === plan._id ||
                    currentSub?.subscriptionPlanId === plan._id;

                  return (
                    <div
                      key={plan._id}
                      onClick={() => setSelectedPlanId(plan._id)}
                      className={`p-6 rounded-2xl border cursor-pointer transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#d0bcff] bg-[#122131] shadow-xl ring-2 ring-[#d0bcff]/50'
                          : 'border-[#273647] bg-[#0d1c2d] hover:border-[#958ea0]/40'
                      }`}
                    >
                      {isPopular && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#d0bcff] text-[#3c0091] font-bold text-[10px] uppercase tracking-wider shadow">
                          Most Popular
                        </span>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-[#d4e4fa]">{plan.name}</h3>
                            {isCurrentPlan && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                {currentSub?.status === 'TRIAL' ? 'Trial Tier' : 'Active'}
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-[#d0bcff] text-[#3c0091] flex items-center justify-center">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>

                        <div className="mb-3">
                          <span className="text-2xl font-extrabold text-[#d4e4fa]">₹{plan.monthlyPrice}</span>
                          <span className="text-[#958ea0] text-xs"> / month</span>
                        </div>

                        <p className="text-xs text-[#958ea0] mb-5 min-h-[32px]">{plan.description}</p>

                        <ul className="space-y-2 text-xs mb-6">
                          <li className="flex items-center gap-2 text-[#d4e4fa] font-medium">
                            <Check className="w-3.5 h-3.5 text-[#4edea3]" />
                            Up to {plan.memberLimit} active members
                          </li>
                          <li className="flex items-center gap-2 text-[#958ea0]">
                            <Check className="w-3.5 h-3.5 text-[#4edea3]" />
                            Attendance & Member check-in
                          </li>
                          <li className="flex items-center gap-2 text-[#958ea0]">
                            <Check className="w-3.5 h-3.5 text-[#4edea3]" />
                            Financial reports & Invoicing
                          </li>
                        </ul>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlanId(plan._id);
                          handleProceedCheckout();
                        }}
                        disabled={submitting}
                        className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                          isSelected
                            ? 'bg-[#d0bcff] text-[#3c0091] hover:bg-[#d0bcff]/90'
                            : 'bg-[#1c2b3c] border border-[#273647] text-[#d4e4fa] hover:bg-[#273647]'
                        }`}
                      >
                        {submitting && selectedPlanId === plan._id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#3c0091]" />
                        ) : (
                          <>
                            <span>
                              {isCurrentPlan && currentSub?.status === 'ACTIVE'
                                ? 'Renew / Extend Plan'
                                : currentSub?.status === 'TRIAL'
                                ? 'Upgrade to this Plan'
                                : 'Proceed to Payment'}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SEPARATOR */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-[#273647]"></div>
              <span className="flex-shrink mx-4 text-xs font-bold text-[#958ea0] uppercase tracking-wider">
                Or Try First Without Payment
              </span>
              <div className="flex-grow border-t border-[#273647]"></div>
            </div>

            {/* 2. AT LAST: 60-DAY FREE TRIAL OPTION */}
            <div className="relative overflow-hidden p-6 md:p-8 rounded-3xl bg-gradient-to-br from-[#1c2b3c] via-[#122131] to-[#0d1c2d] border-2 border-[#8b5cf6]/50 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 flex items-center justify-center text-[#d0bcff]">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-extrabold text-[#d4e4fa]">
                      Start 60-Day Free Trial
                    </h3>
                    <p className="text-xs text-[#958ea0]">
                      Zero credit card required • Instant access to the app
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#d0bcff] font-extrabold text-[10px] uppercase tracking-wider">
                  Free Trial
                </span>
              </div>

              <p className="text-xs text-[#d4e4fa]/80 leading-relaxed">
                Want to test Klyro Gym before subscribing? Get 60 full days of unlimited member onboarding, attendance tracking, billing, and WhatsApp communications with no upfront payment or card required.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-[11px] text-[#958ea0]">
                  <span className="flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-[#4edea3]" /> Full App Access
                  </span>
                  <span className="flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-[#4edea3]" /> No Payment Required
                  </span>
                </div>

                {currentSub?.status === 'TRIAL' ? (
                  <div className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#d0bcff] font-extrabold text-xs flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#d0bcff]" />
                    <span>Free Trial Currently Active</span>
                  </div>
                ) : currentSub?.status === 'ACTIVE' ? (
                  <div className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#4edea3]/20 border border-[#4edea3]/40 text-[#4edea3] font-extrabold text-xs flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#4edea3]" />
                    <span>Paid Subscription Active</span>
                  </div>
                ) : (
                  <button
                    onClick={handleStartFreeTrial}
                    disabled={trialActivating}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#8b5cf6] hover:bg-[#8b5cf6]/90 text-white font-extrabold text-xs transition-all shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {trialActivating ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <>
                        <span>Start Free Trial & Open App</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* PAYMENT GATEWAY / AUTOPAY STEP FOR PAID PLANS */
          <div className="bg-[#122131] border border-[#273647] rounded-2xl p-8 shadow-xl max-w-xl mx-auto space-y-6">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-[#d0bcff]">
              <ShieldCheck className="w-6 h-6 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-xs">PhonePe Gateway Environment</h4>
                <p className="text-[11px] text-[#d0bcff]/80 mt-0.5">
                  Subscription order created. Redirect to PhonePe payment gateway or complete simulated setup.
                </p>
              </div>
            </div>

            {checkoutUrl && (
              <div className="p-4 rounded-xl bg-[#1c2b3c] border border-[#3395ff]/40 text-center space-y-3">
                <p className="text-xs font-semibold text-[#d4e4fa]">
                  Razorpay Payment Gateway Ready
                </p>
                <button
                  type="button"
                  onClick={() => { window.location.href = checkoutUrl; }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-[#0c2340] to-[#3395ff] text-white font-extrabold text-xs rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Open Razorpay Payment Page</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-[#958ea0] mb-3">Select Payment / AutoPay Method</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'UPI_AUTOPAY', label: 'Razorpay UPI AutoPay' },
                  { id: 'CARD', label: 'Credit/Debit Card' },
                  { id: 'EMANDATE', label: 'NetBanking eMandate' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setAutopayMethod(m.id as any)}
                    className={`py-3 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                      autopayMethod === m.id
                        ? 'border-[#d0bcff] bg-[#1c2b3c] text-[#d4e4fa] ring-1 ring-[#d0bcff]'
                        : 'border-[#273647] bg-[#0d1c2d] text-[#958ea0] hover:bg-[#1c2b3c]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setStep('PLAN')}
                className="flex-1 py-3 bg-[#1c2b3c] text-[#d4e4fa] font-bold rounded-xl hover:bg-[#273647] transition-all text-xs"
              >
                Back to Plans
              </button>
              <button
                type="button"
                onClick={handleActivateAutopay}
                disabled={submitting}
                className="flex-1 py-3 bg-[#d0bcff] text-[#3c0091] font-bold rounded-xl hover:bg-[#d0bcff]/90 transition-all text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#3c0091]" />
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Simulate Payment & Launch App</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
