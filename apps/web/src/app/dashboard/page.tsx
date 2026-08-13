'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { IOrganization, IBranch, ApiSuccessResponse } from '@klyro/types';
import { Dumbbell, Building2, MapPin, Users, Calendar, CreditCard, ShieldCheck } from 'lucide-react';

export default function DashboardPage() {
  const { activeOrgId, user } = useAuth();
  const [org, setOrg] = useState<IOrganization | null>(null);
  const [branches, setBranches] = useState<IBranch[]>([]);
  const [finSummary, setFinSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeOrgId) return;

    const fetchTenantData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [orgData, branchesData, finData] = await Promise.all([
          apiRequest<IOrganization>('/organizations/current', {}, activeOrgId),
          apiRequest<IBranch[]>('/branches', {}, activeOrgId),
          apiRequest<any>('/financial-summary', {}, activeOrgId).catch(() => null),
        ]);

        setOrg(orgData);
        setBranches(branchesData);
        if (finData) setFinSummary(finData);
      } catch (err: any) {
        setError(err.message || 'Failed to load organization data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenantData();
  }, [activeOrgId]);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-card to-secondary/30 p-6 rounded-2xl border border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-wider font-semibold text-primary">Overview</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs font-mono text-muted-foreground">Org ID: {activeOrgId}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              {org?.name || 'Dashboard'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Vertical: <span className="font-semibold text-indigo-400">{org?.vertical || 'GYM'}</span> | Default Settings: Asia/Kolkata (INR)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Tenant Active
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-destructive/15 border border-destructive/30 rounded-xl text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Financial Summary Metric Cards (Domain B Gym Revenue) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-2">
            <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Total Revenue Collected</span>
            <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              ₹{finSummary?.totalCollected?.toLocaleString() || 0}
            </h3>
            <p className="text-xs text-muted-foreground">Manual Gym Member Payments</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-2">
            <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Total Outstanding</span>
            <h3 className="text-3xl font-black text-amber-500">
              ₹{finSummary?.totalOutstanding?.toLocaleString() || 0}
            </h3>
            <p className="text-xs text-muted-foreground">Pending Member Invoices</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-2">
            <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Fully Paid Invoices</span>
            <h3 className="text-3xl font-black text-foreground">
              {finSummary?.paidInvoiceCount || 0}
            </h3>
            <p className="text-xs text-muted-foreground">Completed Charges</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-2">
            <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Partially Paid Invoices</span>
            <h3 className="text-3xl font-black text-indigo-500">
              {finSummary?.partiallyPaidInvoiceCount || 0}
            </h3>
            <p className="text-xs text-muted-foreground">Partial Member Installments</p>
          </div>
        </div>

        {/* Tenant Details Panel */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Tenant Context & Authorization Matrix
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-secondary/30 rounded-lg border border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Authenticated User Phone</p>
              <p className="font-mono text-foreground font-semibold mt-1">{user?.phone}</p>
            </div>
            <div className="p-4 bg-secondary/30 rounded-lg border border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Role in Organization</p>
              <p className="font-mono text-foreground font-semibold mt-1">OWNER</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
