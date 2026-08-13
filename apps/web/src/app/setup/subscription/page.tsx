'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { Dumbbell, Check, CreditCard, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

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
  const { activeOrgId } = useAuth();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [autopayMethod, setAutopayMethod] = useState<'UPI_AUTOPAY' | 'CARD' | 'EMANDATE'>('UPI_AUTOPAY');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'PLAN' | 'AUTOPAY'>('PLAN');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const data = await apiRequest<any[]>('/subscription/plans');
      if (data) {
        setPlans(data);
        if (data.length > 0) setSelectedPlanId(data[1]?._id || data[0]._id);
      }
    } catch {
      setError('Failed to fetch subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedCheckout = async () => {
    if (!selectedPlanId) return;
    setSubmitting(true);
    setError('');

    try {
      await apiRequest(
        '/subscription/checkout',
        {
          method: 'POST',
          body: JSON.stringify({ subscriptionPlanId: selectedPlanId }),
        },
        activeOrgId || undefined,
      );

      setStep('AUTOPAY');
    } catch (err: any) {
      setError(err.message || 'Failed to initiate checkout');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivateAutopay = async () => {
    setSubmitting(true);
    setError('');

    try {
      await apiRequest(
        '/subscription/autopay/setup',
        {
          method: 'POST',
          body: JSON.stringify({ method: autopayMethod }),
        },
        activeOrgId || undefined,
      );

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to activate AutoPay');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-indigo-500/30">
          <Dumbbell className="w-6 h-6" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">
          {step === 'PLAN' ? 'Choose your Klyro Plan' : 'Setup AutoPay Mandate'}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {step === 'PLAN'
            ? 'Select a subscription plan tailored to your gym size'
            : 'Enable recurring monthly billing to activate your account'}
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        {step === 'PLAN' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const isSelected = selectedPlanId === plan._id;
                return (
                  <div
                    key={plan._id}
                    onClick={() => setSelectedPlanId(plan._id)}
                    className={`p-6 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10 ring-2 ring-primary'
                        : 'border-border bg-card hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg">{plan.name}</h3>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="mb-4">
                      <span className="text-3xl font-extrabold">₹{plan.monthlyPrice}</span>
                      <span className="text-muted-foreground text-sm"> / month</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-6 min-h-[32px]">{plan.description}</p>

                    <ul className="space-y-2.5 text-xs">
                      <li className="flex items-center gap-2 text-foreground font-medium">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        Up to {plan.memberLimit} active members
                      </li>
                      <li className="flex items-center gap-2 text-muted-foreground">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        Attendance & Member check-in
                      </li>
                      <li className="flex items-center gap-2 text-muted-foreground">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        Financial reports & Invoicing
                      </li>
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleProceedCheckout}
                disabled={submitting || !selectedPlanId}
                className="w-full md:w-auto px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Proceed to Payment</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-8 shadow-xl max-w-xl mx-auto space-y-6">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-6 h-6 flex-shrink-0" />
              <p className="text-xs font-medium">
                Initial subscription payment recorded successfully! Configure AutoPay to complete activation.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-3">Select AutoPay Method</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'UPI_AUTOPAY', label: 'UPI AutoPay' },
                  { id: 'CARD', label: 'Credit/Debit Card' },
                  { id: 'EMANDATE', label: 'eMandate NetBanking' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setAutopayMethod(m.id as any)}
                    className={`py-3 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                      autopayMethod === m.id
                        ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                        : 'border-border bg-secondary/50 text-muted-foreground hover:bg-secondary'
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
                className="flex-1 py-3 bg-secondary text-foreground font-semibold rounded-xl hover:bg-secondary/80 transition-all text-sm"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleActivateAutopay}
                disabled={submitting}
                className="flex-1 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Activate AutoPay & Start</span>
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
