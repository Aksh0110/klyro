'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { IOrganization } from '@klyro/types';
import {
  Megaphone,
  ChevronRight,
  TrendingUp,
  CreditCard,
  RotateCcw,
  UserPlus,
  CalendarCheck,
  Clock,
  Sparkles,
  Building2,
} from 'lucide-react';
import { QuickActionModal } from '@/components/QuickActionModal';

export default function DashboardPage() {
  const router = useRouter();
  const { activeOrgId, activeBranchId, activeBranch, user } = useAuth();
  const [org, setOrg] = useState<IOrganization | null>(null);
  const [subSummary, setSubSummary] = useState<any>(null);
  const [finSummary, setFinSummary] = useState<any>(null);
  const [todayList, setTodayList] = useState<any[]>([]);
  const [retentionSummary, setRetentionSummary] = useState<any>(null);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const fetchTenantData = async () => {
    if (!activeOrgId) return;
    setIsLoading(true);

    try {
      const [subData, orgData, finData, todayData, retData, payData, custData] = await Promise.all([
        apiRequest<any>('/subscription/current', {}, activeOrgId).catch(() => null),
        apiRequest<IOrganization>('/organizations/current', {}, activeOrgId).catch(() => null),
        apiRequest<any>('/financial-summary', {}, activeOrgId).catch(() => null),
        apiRequest<any[]>('/attendance/today', {}, activeOrgId).catch(() => []),
        apiRequest<any>('/communications/retention-summary', {}, activeOrgId).catch(() => null),
        apiRequest<any[]>('/payments', {}, activeOrgId).catch(() => []),
        apiRequest<any>('/customers', {}, activeOrgId).catch(() => []),
      ]);

      if (subData) setSubSummary(subData);
      if (orgData) setOrg(orgData);
      if (finData) setFinSummary(finData);
      if (todayData) setTodayList(Array.isArray(todayData) ? todayData : (todayData as any)?.data || []);
      if (retData) setRetentionSummary(retData);
      if (payData) setPaymentsList(Array.isArray(payData) ? payData : (payData as any)?.data || []);
      if (custData) setCustomersList(Array.isArray(custData) ? custData : (custData as any)?.data || []);
    } catch (err) {
      console.error('Error loading dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantData();
    const handleBranchChanged = () => fetchTenantData();
    window.addEventListener('klyro_branch_changed', handleBranchChanged);
    return () => window.removeEventListener('klyro_branch_changed', handleBranchChanged);
  }, [activeOrgId, activeBranchId]);

  // Subscription Renewal Info
  const sub = subSummary?.subscription;
  const plan = sub?.subscriptionPlanId;
  const isTrial = sub?.status === 'TRIAL';
  const dueDateStr = sub?.currentPeriodEnd || sub?.trialEndDate;
  const dueDate = dueDateStr ? new Date(dueDateStr) : null;
  const now = new Date();
  const renewalDaysLeft = dueDate
    ? Math.max(0, Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const formattedDueDate = dueDate
    ? dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : 'N/A';

  // Compute active members from real customers list or retention summary
  const activeMembersCount = useMemo(() => {
    if (retentionSummary && typeof retentionSummary.totalActiveMembers === 'number') {
      return retentionSummary.totalActiveMembers;
    }
    return customersList.filter((c) => c.status === 'ACTIVE').length;
  }, [retentionSummary, customersList]);

  // Dynamically assemble real recent activities from MongoDB entities
  const recentActivities = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'CHECKIN' | 'PAYMENT' | 'MEMBER';
      title: string;
      subtitle: string;
      timestamp: number;
    }> = [];

    todayList.forEach((att: any, idx: number) => {
      const name = att.customerId
        ? typeof att.customerId === 'object'
          ? `${att.customerId.firstName} ${att.customerId.lastName || ''}`.trim()
          : 'Member'
        : 'Member';
      const date = new Date(att.checkInAt || att.createdAt || Date.now());
      items.push({
        id: att._id || `att-${idx}`,
        type: 'CHECKIN',
        title: `${name} checked in`,
        subtitle: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: date.getTime(),
      });
    });

    paymentsList.forEach((pay: any, idx: number) => {
      const name = pay.customerId
        ? typeof pay.customerId === 'object'
          ? `${pay.customerId.firstName} ${pay.customerId.lastName || ''}`.trim()
          : 'Member'
        : 'Member';
      const date = new Date(pay.paidAt || pay.createdAt || Date.now());
      items.push({
        id: pay._id || `pay-${idx}`,
        type: 'PAYMENT',
        title: `Payment of ₹${(pay.amount || 0).toLocaleString()} from ${name}`,
        subtitle: `${pay.method || 'Payment'} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        timestamp: date.getTime(),
      });
    });

    customersList.forEach((cust: any, idx: number) => {
      const name = `${cust.firstName} ${cust.lastName || ''}`.trim();
      const date = new Date(cust.createdAt || cust.joinedAt || Date.now());
      items.push({
        id: cust._id || `cust-${idx}`,
        type: 'MEMBER',
        title: `New member: ${name}`,
        subtitle: `Code: ${cust.customerCode || 'CUST'}`,
        timestamp: date.getTime(),
      });
    });

    items.sort((a, b) => b.timestamp - a.timestamp);
    return items.slice(0, 5);
  }, [todayList, paymentsList, customersList]);

  return (

    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto pb-6">
        {/* Header & Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#d4e4fa]">
              {getTimeGreeting()}, {user?.name ? user.name : user?.phone ? `Owner (+${user.phone.slice(-4)})` : 'Gym Owner'} 👋
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#958ea0] mt-1">
              <span className="font-semibold text-[#d4e4fa]">{org?.name || 'Klyro Gym'}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-semibold">
                <Building2 className="w-3 h-3" />
                <span>{activeBranch?.name || 'Main Branch'}</span>
                <span className="text-[9px] opacity-75 font-normal">(Default Active)</span>
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">What needs your attention today?</span>
            </div>
          </div>

          {/* Dedicated Gym Owner SaaS Subscription Badge */}
          <Link
            href="/settings/subscription"
            className="flex items-center gap-3 p-2.5 px-3.5 rounded-2xl bg-[#122131] border border-[#273647] hover:border-[#d0bcff]/40 transition-all shadow-md group"
          >
            <div className="p-2 rounded-xl bg-[#d0bcff]/15 text-[#d0bcff]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-left pr-1">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#d4e4fa]">
                <span>{plan?.name || (isTrial ? 'Free Trial' : 'Growth Plan')}</span>
                <span className="px-1.5 py-0.2 rounded bg-[#4edea3]/20 text-[#4edea3] text-[9px] uppercase font-mono">
                  {sub?.status || 'ACTIVE'}
                </span>
              </div>
              <p className="text-[10px] text-[#958ea0]">
                {isTrial ? `${renewalDaysLeft} Days Trial Left` : `Due ${formattedDueDate} (${renewalDaysLeft}d)`}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#958ea0] group-hover:text-[#d0bcff] transition-colors" />
          </Link>
        </div>


        {/* Business Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-[#122131] border border-[#273647]">
            <p className="text-[10px] font-bold text-[#958ea0] uppercase tracking-wider">Active Members</p>
            <div className="text-xl font-extrabold text-[#d4e4fa] mt-1 flex items-baseline gap-1">
              {activeMembersCount}
              <TrendingUp className="w-3.5 h-3.5 text-[#4edea3]" />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#122131] border border-[#273647]">
            <p className="text-[10px] font-bold text-[#958ea0] uppercase tracking-wider">Collected Today</p>
            <div className="text-xl font-extrabold text-[#4edea3] mt-1">
              ₹{(finSummary?.totalCollected || 0).toLocaleString()}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#122131] border border-[#273647]">
            <p className="text-[10px] font-bold text-[#958ea0] uppercase tracking-wider">Today&apos;s Check-ins</p>
            <div className="text-xl font-extrabold text-[#d4e4fa] mt-1">
              {todayList.length}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#122131] border border-[#273647]">
            <p className="text-[10px] font-bold text-[#958ea0] uppercase tracking-wider">Outstanding</p>
            <div className="text-xl font-extrabold text-[#ffb95f] mt-1">
              ₹{(finSummary?.totalOutstanding || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Needs Attention Section (Identical Grid Design to Quick Actions) */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-[#d4e4fa] tracking-tight">Needs Attention</h2>

          <div className="grid grid-cols-3 gap-2.5">
            {/* Card 1: Expiring Memberships */}
            <button
              onClick={() => {
                setModalTab('renew');
                setShowQuickModal(true);
              }}
              className="relative flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#122131] border border-[#273647] text-center hover:bg-[#1c2b3c] transition-all active:scale-95 group"
            >
              {(retentionSummary?.expiringCount || 0) > 0 && (
                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-[#ffb95f]/20 text-[#ffb95f] text-[9px] font-extrabold border border-[#ffb95f]/30">
                  {retentionSummary.expiringCount}
                </span>
              )}
              <div className="p-2 rounded-xl bg-[#ffb95f]/10 text-[#ffb95f] mb-2">
                <RotateCcw className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-[#d4e4fa] leading-tight">Expiring</span>
              <span className="text-[9px] text-[#958ea0] mt-0.5 font-semibold truncate max-w-full">
                {retentionSummary?.expiringCount || 0} Members
              </span>
            </button>

            {/* Card 2: Overdue Payments */}
            <button
              onClick={() => {
                setModalTab('payment');
                setShowQuickModal(true);
              }}
              className="relative flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#122131] border border-[#273647] text-center hover:bg-[#1c2b3c] transition-all active:scale-95 group"
            >
              {(retentionSummary?.overdueCount || 0) > 0 && (
                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-[#ffb95f]/20 text-[#ffb95f] text-[9px] font-extrabold border border-[#ffb95f]/30">
                  {retentionSummary.overdueCount}
                </span>
              )}
              <div className="p-2 rounded-xl bg-[#ffb95f]/10 text-[#ffb95f] mb-2">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-[#d4e4fa] leading-tight">Overdue Dues</span>
              <span className="text-[9px] text-[#958ea0] mt-0.5 font-semibold truncate max-w-full">
                ₹{(retentionSummary?.overdueAmountTotal || finSummary?.totalOutstanding || 0).toLocaleString()}
              </span>
            </button>

            {/* Card 3: Inactive Members */}
            <button
              onClick={() => {
                setModalTab('announcement');
                setShowQuickModal(true);
              }}
              className="relative flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#122131] border border-[#273647] text-center hover:bg-[#1c2b3c] transition-all active:scale-95 group"
            >
              {(retentionSummary?.inactiveCount || 0) > 0 && (
                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-[#d0bcff]/20 text-[#d0bcff] text-[9px] font-extrabold border border-[#d0bcff]/30">
                  {retentionSummary.inactiveCount}
                </span>
              )}
              <div className="p-2 rounded-xl bg-[#d0bcff]/10 text-[#d0bcff] mb-2">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-[#d4e4fa] leading-tight">Inactive</span>
              <span className="text-[9px] text-[#958ea0] mt-0.5 font-semibold truncate max-w-full">
                {retentionSummary?.inactiveCount || 0} Members
              </span>
            </button>
          </div>
        </div>


        {/* Quick Actions Grid */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-[#d4e4fa] tracking-tight">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-2.5">
            <button
              onClick={() => {
                setModalTab('onboard');
                setShowQuickModal(true);
              }}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#122131] border border-[#273647] text-center hover:bg-[#1c2b3c] transition-all active:scale-95"
            >
              <div className="p-2 rounded-xl bg-[#d0bcff]/10 text-[#d0bcff] mb-2">
                <UserPlus className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-[#d4e4fa] leading-tight">Add Member</span>
            </button>

            <button
              onClick={() => {
                setModalTab('payment');
                setShowQuickModal(true);
              }}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#122131] border border-[#273647] text-center hover:bg-[#1c2b3c] transition-all active:scale-95"
            >
              <div className="p-2 rounded-xl bg-[#4edea3]/10 text-[#4edea3] mb-2">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-[#d4e4fa] leading-tight">Record Payment</span>
            </button>

            <button
              onClick={() => {
                setModalTab('renew');
                setShowQuickModal(true);
              }}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#122131] border border-[#273647] text-center hover:bg-[#1c2b3c] transition-all active:scale-95"
            >
              <div className="p-2 rounded-xl bg-[#ffb95f]/10 text-[#ffb95f] mb-2">
                <RotateCcw className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-[#d4e4fa] leading-tight">Renew Plan</span>
            </button>

            <button
              onClick={() => {
                setModalTab('announcement');
                setShowQuickModal(true);
              }}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#122131] border border-[#273647] text-center hover:bg-[#1c2b3c] transition-all active:scale-95"
            >
              <div className="p-2 rounded-xl bg-[#d0bcff]/10 text-[#d0bcff] mb-2">
                <Megaphone className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-[#d4e4fa] leading-tight">Post News</span>
            </button>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#d4e4fa] tracking-tight">Recent Activity</h2>
            <Link href="/customers" className="text-xs text-[#d0bcff] font-bold hover:underline">
              View All
            </Link>
          </div>

          <div className="bg-[#122131] border border-[#273647] rounded-2xl divide-y divide-[#273647] overflow-hidden">
            {recentActivities.map((item) => (
              <div key={item.id} className="p-3.5 flex items-center justify-between hover:bg-[#1c2b3c]/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      item.type === 'CHECKIN'
                        ? 'bg-[#4edea3]/10 text-[#4edea3]'
                        : item.type === 'PAYMENT'
                        ? 'bg-[#ffb95f]/10 text-[#ffb95f]'
                        : 'bg-[#d0bcff]/10 text-[#d0bcff]'
                    }`}
                  >
                    {item.type === 'CHECKIN' ? (
                      <CalendarCheck className="w-4 h-4 text-[#4edea3]" />
                    ) : item.type === 'PAYMENT' ? (
                      <CreditCard className="w-4 h-4 text-[#ffb95f]" />
                    ) : (
                      <UserPlus className="w-4 h-4 text-[#d0bcff]" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#d4e4fa]">{item.title}</p>
                    <p className="text-[10px] text-[#958ea0]">{item.subtitle}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#958ea0]" />
              </div>
            ))}

            {recentActivities.length === 0 && (
              <div className="p-6 text-center space-y-2">
                <Sparkles className="w-8 h-8 text-[#d0bcff] mx-auto opacity-70" />
                <h3 className="text-xs font-bold text-[#d4e4fa]">No activity recorded yet</h3>
                <p className="text-[11px] text-[#958ea0]">
                  Activity will show up here in real time as members check in, make payments, or join your gym.
                </p>
              </div>
            )}
          </div>
        </div>
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
