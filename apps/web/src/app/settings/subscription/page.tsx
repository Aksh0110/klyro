'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { CreditCard, ShieldCheck, AlertTriangle, Clock, RefreshCw, Loader2, ArrowLeft } from 'lucide-react';

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

  return (
    <div className="flex min-h-screen bg-background text-foreground pb-16 md:pb-0">
      <Sidebar />

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/settings')}
            className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Klyro Subscription</h1>
            <p className="text-xs text-muted-foreground">Manage your organization's SaaS subscription & AutoPay</p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Subscription Status Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">{plan?.name || 'Klyro Gym Plan'}</h2>
                <span
                  className={`text-xs px-3 py-1 rounded-full font-semibold ${
                    sub?.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : sub?.status === 'PAST_DUE'
                      ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      : 'bg-destructive/10 text-destructive border border-destructive/20'
                  }`}
                >
                  ● {sub?.status || 'NO_SUBSCRIPTION'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">₹{sub?.amount || plan?.monthlyPrice || 0} / month</p>
            </div>

            {sub?.status !== 'ACTIVE' && (
              <button
                onClick={() => router.push('/setup/subscription')}
                className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
              >
                Activate Subscription
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-secondary/40 border border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Clock className="w-4 h-4 text-primary" />
                <span>Current Period</span>
              </div>
              <p className="font-semibold text-sm">
                {sub?.currentPeriodStart ? new Date(sub.currentPeriodStart).toLocaleDateString() : 'N/A'} →{' '}
                {sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : 'N/A'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-secondary/40 border border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>AutoPay Mandate</span>
              </div>
              <p className="font-semibold text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {mandate?.status || 'Not Configured'} ({mandate?.method || 'N/A'})
              </p>
            </div>

            <div className="p-4 rounded-xl bg-secondary/40 border border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <CreditCard className="w-4 h-4 text-indigo-500" />
                <span>Billing Provider</span>
              </div>
              <p className="font-semibold text-sm">
                {data?.billingMode === 'DEV_PROVIDER' ? 'Development Simulator' : 'Razorpay Gateway'}
              </p>
            </div>
          </div>

          {sub?.cancelAtPeriodEnd && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Subscription scheduled for cancellation at end of current billing period.</span>
            </div>
          )}

          {sub && !sub.cancelAtPeriodEnd && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="text-xs text-muted-foreground hover:text-destructive underline"
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
