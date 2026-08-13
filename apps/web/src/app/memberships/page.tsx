'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { IMembershipPlan, ICustomerMembership } from '@klyro/types';
import { Award, Plus, CheckCircle2, Calendar, Clock, X } from 'lucide-react';
import { PlanDurationType, PLAN_DURATION_TYPE } from '@klyro/config';

export default function MembershipsPage() {
  const { activeOrgId } = useAuth();
  const [plans, setPlans] = useState<IMembershipPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<ICustomerMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Plan Modal
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [duration, setDuration] = useState(1);
  const [durationType, setDurationType] = useState<PlanDurationType>(PLAN_DURATION_TYPE.MONTHS);
  const [price, setPrice] = useState(2000);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!activeOrgId) return;
    setIsLoading(true);
    try {
      const [plansData, subData] = await Promise.all([
        apiRequest<IMembershipPlan[]>('/membership-plans', {}, activeOrgId),
        apiRequest<ICustomerMembership[]>('/memberships', {}, activeOrgId),
      ]);
      setPlans(plansData);
      setSubscriptions(subData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOrgId]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !activeOrgId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await apiRequest<IMembershipPlan>(
        '/membership-plans',
        {
          method: 'POST',
          body: JSON.stringify({
            name,
            code,
            duration,
            durationType,
            price,
            description: description || undefined,
          }),
        },
        activeOrgId,
      );

      setShowAddPlanModal(false);
      setName('');
      setCode('');
      setDescription('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create membership plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
              <Award className="w-6 h-6 text-primary" />
              Membership Plans & Catalog
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Define membership plan templates and track active member subscriptions
            </p>
          </div>

          <button
            onClick={() => setShowAddPlanModal(true)}
            className="py-2.5 px-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 text-sm shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Plan Template</span>
          </button>
        </div>

        {/* Section 1: Catalog Grid */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            Available Plan Templates
          </h2>

          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading catalog...</div>
          ) : plans.length === 0 ? (
            <div className="p-8 bg-card border border-border rounded-xl text-center space-y-2">
              <p className="text-sm text-muted-foreground">No membership plan templates created yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((p) => (
                <div key={p._id} className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-indigo-400 uppercase">{p.code}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {p.status}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {p.duration} {p.durationType.toLowerCase()} duration
                    </p>
                  </div>
                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-xl font-black text-foreground">₹{p.price}</span>
                    <span className="text-xs text-muted-foreground">Gym Catalog</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Active Subscriptions Table */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Tenant Active Customer Subscriptions
          </h2>

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            {subscriptions.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No active customer memberships registered.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-secondary/40 text-muted-foreground text-xs uppercase font-semibold border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Plan Name</th>
                      <th className="py-3 px-4">Start Date</th>
                      <th className="py-3 px-4">End Date</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {subscriptions.map((s) => (
                      <tr key={s._id} className="hover:bg-secondary/20 transition-all">
                        <td className="py-3.5 px-4 font-medium text-foreground">
                          {typeof s.customerId === 'object'
                            ? `${s.customerId.firstName} ${s.customerId.lastName || ''}`
                            : 'Customer'}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-indigo-400">
                          {typeof s.membershipPlanId === 'object' ? s.membershipPlanId.name : 'Plan'}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted-foreground">
                          {new Date(s.startDate).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted-foreground">
                          {new Date(s.endDate).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-foreground">₹{s.price}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Add Plan Modal */}
        {showAddPlanModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  Create Membership Plan
                </h3>
                <button
                  onClick={() => setShowAddPlanModal(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="p-3 bg-destructive/15 border border-destructive/30 rounded-xl text-xs text-destructive">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreatePlan} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Plan Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Gold Monthly Unlimited"
                    required
                    className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Code</label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="e.g. M-GOLD"
                      required
                      className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Price (₹)</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      required
                      min={0}
                      className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Duration</label>
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      required
                      min={1}
                      className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Duration Unit</label>
                    <select
                      value={durationType}
                      onChange={(e) => setDurationType(e.target.value as PlanDurationType)}
                      className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="DAYS">Days</option>
                      <option value="WEEKS">Weeks</option>
                      <option value="MONTHS">Months</option>
                      <option value="YEARS">Years</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddPlanModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-muted-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Plan Template'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
