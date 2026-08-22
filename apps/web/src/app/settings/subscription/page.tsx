'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
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
} from 'lucide-react';

export default function SubscriptionSettingsPage() {
  const router = useRouter();
  const { activeOrgId } = useAuth();

  const [data, setData] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeOrgId) {
      fetchSubscriptionData();
    }
  }, [activeOrgId]);

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
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar />
        <main className="flex-1 p-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </main>
      </div>
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
    ? dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'N/A';

  return (
    <div className="flex min-h-screen bg-background text-foreground pb-16 md:pb-0">
      <Sidebar />

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/settings')}
              className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                Gym Owner Subscription & Billing
              </h1>
              <p className="text-xs text-muted-foreground">
                Track your active plan, free trial countdown, and renewal due dates
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push('/setup/subscription')}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Change / Upgrade Plan</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Dedicated 60-Day Free Trial Banner (if in Trial mode) */}
        {isTrial && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-purple-950/30 border border-purple-500/30 text-purple-200 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                  <Gift className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-purple-100 flex items-center gap-2">
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
                onClick={() => router.push('/setup/subscription')}
                className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-extrabold text-xs transition-all shadow-md shrink-0"
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
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
          {/* Top Plan Overview */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <div className="flex items-center gap-3">
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

            <div className="text-right sm:text-right">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Next Renewal Due</span>
              <span className="text-sm font-extrabold text-emerald-400 font-mono">{formattedDueDate}</span>
              <span className="text-xs text-muted-foreground block font-medium">({renewalDaysLeft} days remaining)</span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-lg">SaaS Billing History</h3>

          {payments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">No billing records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase">
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold">Amount</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Provider Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((p) => (
                    <tr key={p._id} className="hover:bg-secondary/20">
                      <td className="py-3.5 font-medium">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="py-3.5 font-bold">₹{p.amount}</td>
                      <td className="py-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-xs text-muted-foreground font-mono">
                        {p.providerPaymentId || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
