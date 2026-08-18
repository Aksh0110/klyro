'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { IOrganization, IBranch } from '@klyro/types';
import {
  Clock,
  Users,
  Megaphone,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  MapPin,
  Plus,
  CreditCard,
  RotateCcw,
  Sparkles,
  DollarSign,
  UserCheck,
} from 'lucide-react';
import { QuickActionModal } from '@/components/QuickActionModal';

export default function DashboardPage() {
  const router = useRouter();
  const { activeOrgId, user } = useAuth();
  const [org, setOrg] = useState<IOrganization | null>(null);
  const [branches, setBranches] = useState<IBranch[]>([]);
  const [finSummary, setFinSummary] = useState<any>(null);
  const [attSummary, setAttSummary] = useState<any>(null);
  const [todayList, setTodayList] = useState<any[]>([]);
  const [retentionSummary, setRetentionSummary] = useState<any>(null);
  const [latestAnnouncement, setLatestAnnouncement] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Action Modal State
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [modalTab, setModalTab] = useState<'onboard' | 'payment' | 'renew' | 'announcement'>('onboard');

  const userRole = user?.roles?.find((r) => r.organizationId === activeOrgId)?.role || 'MEMBER';

  useEffect(() => {
    if (user && userRole === 'MEMBER') {
      router.replace('/member');
      return;
    }
  }, [user, userRole, router]);

  const fetchTenantData = async () => {
    if (!activeOrgId) return;
    setIsLoading(true);
    setError(null);

    try {
      const [orgData, branchesData, finData, summaryData, todayData, retData, annData] = await Promise.all([
        apiRequest<IOrganization>('/organizations/current', {}, activeOrgId || undefined),
        apiRequest<IBranch[]>('/branches', {}, activeOrgId || undefined),
        apiRequest<any>('/financial-summary', {}, activeOrgId || undefined).catch(() => null),
        apiRequest<any>('/attendance/summary', {}, activeOrgId || undefined).catch(() => null),
        apiRequest<any[]>('/attendance/today', {}, activeOrgId || undefined).catch(() => []),
        apiRequest<any>('/communications/retention-summary', {}, activeOrgId || undefined).catch(() => null),
        apiRequest<any[]>('/announcements', {}, activeOrgId || undefined).catch(() => []),
      ]);

      setOrg(orgData);
      setBranches(branchesData || []);
      if (finData) setFinSummary(finData);
      if (summaryData) setAttSummary(summaryData);
      if (todayData) setTodayList(todayData);
      if (retData) setRetentionSummary(retData);
      if (Array.isArray(annData) && annData.length > 0) {
        const published = annData.find((a: any) => a.status === 'PUBLISHED') || annData[0];
        setLatestAnnouncement(published);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load organization data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
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
              {org?.name || 'Gym Management Dashboard'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Vertical: <span className="font-semibold text-indigo-400">{org?.vertical || 'GYM'}</span> | Default Timezone: Asia/Kolkata
            </p>
          </div>

          {/* Actionable Shortcuts */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                setModalTab('onboard');
                setShowQuickModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-md shadow-primary/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Member</span>
            </button>

            <button
              onClick={() => {
                setModalTab('payment');
                setShowQuickModal(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border transition-all"
            >
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>Collect Payment</span>
            </button>

            <button
              onClick={() => {
                setModalTab('renew');
                setShowQuickModal(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border transition-all"
            >
              <RotateCcw className="w-4 h-4 text-primary" />
              <span>Renew</span>
            </button>

            <button
              onClick={() => {
                setModalTab('announcement');
                setShowQuickModal(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border transition-all"
            >
              <Megaphone className="w-4 h-4 text-indigo-400" />
              <span>Broadcast</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-destructive/15 border border-destructive/30 rounded-xl text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Business Health KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-card border border-border">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Collected Revenue
            </span>
            <div className="text-2xl font-extrabold text-foreground">
              ₹{(finSummary?.totalPaid || 0).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Gym billing receipts</div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Outstanding Dues
            </span>
            <div className="text-2xl font-extrabold text-amber-400">
              ₹{(finSummary?.totalOutstanding || 0).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Unpaid & overdue balances</div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Active Members
            </span>
            <div className="text-2xl font-extrabold text-foreground">
              {retentionSummary?.totalActiveMembers || todayList.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">With active memberships</div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Today&apos;s Check-ins
            </span>
            <div className="text-2xl font-extrabold text-emerald-400">{todayList.length}</div>
            <div className="text-xs text-muted-foreground mt-1">GPS verified visits today</div>
          </div>
        </div>

        {/* Attention & Action Center */}
        {retentionSummary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Expiring Memberships */}
            <div className="p-5 rounded-2xl bg-card border border-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Expiring Soon
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold text-xs">
                    {retentionSummary.expiringCount || 0}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Memberships expiring in the next 7 days requiring renewal outreach.
                </p>
              </div>
              <button
                onClick={() => {
                  setModalTab('renew');
                  setShowQuickModal(true);
                }}
                className="mt-4 text-xs text-primary font-bold hover:underline flex items-center justify-between"
              >
                <span>Renew Members</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Overdue Invoices */}
            <div className="p-5 rounded-2xl bg-card border border-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-destructive uppercase tracking-wider">
                    Overdue Invoices
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold text-xs">
                    {retentionSummary.overdueCount || 0}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Invoices past due date requiring fee settlement.
                </p>
              </div>
              <button
                onClick={() => {
                  setModalTab('payment');
                  setShowQuickModal(true);
                }}
                className="mt-4 text-xs text-primary font-bold hover:underline flex items-center justify-between"
              >
                <span>Collect Payments</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Inactive Members */}
            <div className="p-5 rounded-2xl bg-card border border-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    7-Day Inactive
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold text-xs">
                    {retentionSummary.inactiveCount || 0}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Active members with no check-in over the past 7 days.
                </p>
              </div>
              <button
                onClick={() => {
                  setModalTab('announcement');
                  setShowQuickModal(true);
                }}
                className="mt-4 text-xs text-primary font-bold hover:underline flex items-center justify-between"
              >
                <span>Broadcast Re-engagement</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Modal */}
      <QuickActionModal
        isOpen={showQuickModal}
        onClose={() => {
          setShowQuickModal(false);
          fetchTenantData();
        }}
        initialTab={modalTab}
      />
    </AppShell>
  );
}
