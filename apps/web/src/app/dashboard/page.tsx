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
} from 'lucide-react';
import { QuickActionModal } from '@/components/QuickActionModal';

export default function DashboardPage() {
  const router = useRouter();
  const { activeOrgId, user } = useAuth();
  const [org, setOrg] = useState<IOrganization | null>(null);
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
      const [orgData, finData, todayData, retData, payData, custData] = await Promise.all([
        apiRequest<IOrganization>('/organizations/current', {}, activeOrgId).catch(() => null),
        apiRequest<any>('/financial-summary', {}, activeOrgId).catch(() => null),
        apiRequest<any[]>('/attendance/today', {}, activeOrgId).catch(() => []),
        apiRequest<any>('/communications/retention-summary', {}, activeOrgId).catch(() => null),
        apiRequest<any[]>('/payments', {}, activeOrgId).catch(() => []),
        apiRequest<any>('/customers', {}, activeOrgId).catch(() => []),
      ]);

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
  }, [activeOrgId]);

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#d4e4fa]">
              {getTimeGreeting()}, {user?.phone ? `+${user.phone.slice(-4)}` : 'Gym Owner'} 👋
            </h1>
            <p className="text-xs text-[#958ea0]">
              {org?.name || 'Klyro Gym'} • What needs your attention today?
            </p>
          </div>
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

        {/* Needs Attention Section */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-[#d4e4fa] tracking-tight">Needs Attention</h2>

          <div className="space-y-2.5">
            {/* Card 1: Expiring Memberships */}
            <div className="p-4 rounded-2xl bg-[#122131] border border-[#273647] space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#ffb95f]/15 text-[#ffb95f]">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-[#d4e4fa]">
                    {retentionSummary?.expiringCount || 0} memberships expiring soon
                  </h3>
                  <p className="text-xs text-[#958ea0] mt-0.5">
                    {retentionSummary?.expiringAmountAtRisk
                      ? `₹${retentionSummary.expiringAmountAtRisk.toLocaleString()} revenue at risk.`
                      : 'Action required to maintain recurring revenue.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalTab('renew');
                  setShowQuickModal(true);
                }}
                className="w-full py-2.5 rounded-xl bg-[#d0bcff] text-[#3c0091] font-bold text-xs hover:bg-[#d0bcff]/90 transition-all shadow-md active:scale-98"
              >
                View / Renew
              </button>
            </div>

            {/* Card 2: Overdue Payments */}
            <div className="p-4 rounded-2xl bg-[#122131] border border-[#273647] space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#ffb95f]/15 text-[#ffb95f]">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-[#d4e4fa]">
                    {retentionSummary?.overdueCount || 0} overdue payments • ₹{(retentionSummary?.overdueAmountTotal || finSummary?.totalOutstanding || 0).toLocaleString()}
                  </h3>
                  <p className="text-xs text-[#958ea0] mt-0.5">Outstanding balances need collection.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalTab('payment');
                  setShowQuickModal(true);
                }}
                className="w-full py-2.5 rounded-xl bg-[#1c2b3c] border border-[#273647] text-[#d4e4fa] font-bold text-xs hover:bg-[#273647] transition-all active:scale-98"
              >
                Collect
              </button>
            </div>

            {/* Card 3: Inactive Members */}
            <div className="p-4 rounded-2xl bg-[#122131] border border-[#273647] space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#d0bcff]/15 text-[#d0bcff]">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-[#d4e4fa]">
                    {retentionSummary?.inactiveCount || 0} members inactive for 7+ days
                  </h3>
                  <p className="text-xs text-[#958ea0] mt-0.5">Retention risk identified.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalTab('announcement');
                  setShowQuickModal(true);
                }}
                className="w-full py-2.5 rounded-xl bg-[#1c2b3c] border border-[#273647] text-[#d4e4fa] font-bold text-xs hover:bg-[#273647] transition-all active:scale-98"
              >
                Follow Up
              </button>
            </div>
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
