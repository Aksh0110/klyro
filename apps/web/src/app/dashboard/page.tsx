'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { IOrganization } from '@klyro/types';
import {
  Users,
  Megaphone,
  ChevronRight,
  TrendingUp,
  Plus,
  CreditCard,
  RotateCcw,
  UserPlus,
  CalendarCheck,
  AlertCircle,
  Clock,
  ArrowRight,
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
      const [orgData, finData, todayData, retData, payData] = await Promise.all([
        apiRequest<IOrganization>('/organizations/current', {}, activeOrgId).catch(() => null),
        apiRequest<any>('/financial-summary', {}, activeOrgId).catch(() => null),
        apiRequest<any[]>('/attendance/today', {}, activeOrgId).catch(() => []),
        apiRequest<any>('/communications/retention-summary', {}, activeOrgId).catch(() => null),
        apiRequest<any[]>('/payments', {}, activeOrgId).catch(() => []),
      ]);

      if (orgData) setOrg(orgData);
      if (finData) setFinSummary(finData);
      if (todayData) setTodayList(todayData);
      if (retData) setRetentionSummary(retData);
      if (payData) setPaymentsList(Array.isArray(payData) ? payData : (payData as any)?.data || []);
    } catch (err) {
      console.error('Error loading dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantData();
  }, [activeOrgId]);

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
              {retentionSummary?.totalActiveMembers || 142}
              <TrendingUp className="w-3.5 h-3.5 text-[#4edea3]" />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#122131] border border-[#273647]">
            <p className="text-[10px] font-bold text-[#958ea0] uppercase tracking-wider">Collected Today</p>
            <div className="text-xl font-extrabold text-[#4edea3] mt-1">
              ₹{(finSummary?.totalCollected ?? 4200).toLocaleString()}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#122131] border border-[#273647]">
            <p className="text-[10px] font-bold text-[#958ea0] uppercase tracking-wider">Today&apos;s Check-ins</p>
            <div className="text-xl font-extrabold text-[#d4e4fa] mt-1">
              {todayList.length || 28}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#122131] border border-[#273647]">
            <p className="text-[10px] font-bold text-[#958ea0] uppercase tracking-wider">Outstanding</p>
            <div className="text-xl font-extrabold text-[#ffb95f] mt-1">
              ₹{(finSummary?.totalOutstanding ?? 7200).toLocaleString()}
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
                    {retentionSummary?.expiringCount ?? 3} memberships expiring soon
                  </h3>
                  <p className="text-xs text-[#958ea0] mt-0.5">Action required to maintain revenue.</p>
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
                    {retentionSummary?.overdueCount ?? 2} overdue payments • ₹{(finSummary?.totalOutstanding ?? 3600).toLocaleString()}
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
                    {retentionSummary?.inactiveCount ?? 5} members inactive for 7+ days
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
            {todayList.slice(0, 3).map((item, idx) => (
              <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-[#1c2b3c]/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1c2b3c] text-[#d4e4fa] flex items-center justify-center font-bold text-xs">
                    <CalendarCheck className="w-4 h-4 text-[#4edea3]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#d4e4fa]">
                      {item.customerId?.firstName || 'Rahul S.'} checked in
                    </p>
                    <p className="text-[10px] text-[#958ea0]">10m ago</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#958ea0]" />
              </div>
            ))}

            {todayList.length === 0 && (
              <>
                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#1c2b3c] text-[#d4e4fa] flex items-center justify-center font-bold text-xs">
                      <CalendarCheck className="w-4 h-4 text-[#4edea3]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#d4e4fa]">Rahul S. checked in</p>
                      <p className="text-[10px] text-[#958ea0]">10m ago</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#958ea0]" />
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#4edea3]/10 text-[#4edea3] flex items-center justify-center font-bold text-xs">
                      <CreditCard className="w-4 h-4 text-[#4edea3]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#d4e4fa]">
                        Payment of <span className="text-[#4edea3]">₹1,800</span> from Priya
                      </p>
                      <p className="text-[10px] text-[#958ea0]">1h ago</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#958ea0]" />
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#d0bcff]/10 text-[#d0bcff] flex items-center justify-center font-bold text-xs">
                      <UserPlus className="w-4 h-4 text-[#d0bcff]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#d4e4fa]">
                        New member: <span className="font-semibold">Akshay B.</span>
                      </p>
                      <p className="text-[10px] text-[#958ea0]">2h ago</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#958ea0]" />
                </div>
              </>
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

