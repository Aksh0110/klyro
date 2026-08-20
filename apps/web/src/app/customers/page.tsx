'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { ICustomer } from '@klyro/types';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  ChevronRight,
  CreditCard,
  RotateCcw,
  Clock,
  Plus,
} from 'lucide-react';
import { QuickActionModal } from '@/components/QuickActionModal';

export default function CustomersPage() {
  const router = useRouter();
  const { activeOrgId } = useAuth();
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'EXPIRING' | 'INACTIVE'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Quick Action Modal State
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [quickTab, setQuickTab] = useState<'onboard' | 'payment' | 'renew' | 'announcement'>('onboard');

  const fetchCustomers = async () => {
    if (!activeOrgId) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (activeTab !== 'ALL') params.append('status', activeTab);

      const endpoint = `/customers?${params.toString()}`;
      const data = await apiRequest<ICustomer[]>(endpoint, {}, activeOrgId);
      setCustomers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [activeOrgId, search, activeTab]);

  return (
    <AppShell>
      <div className="space-y-4 max-w-4xl mx-auto pb-6">
        {/* Top Header Row */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-extrabold text-[#d4e4fa]">Members</h1>
          <button
            onClick={() => {
              setQuickTab('onboard');
              setShowQuickModal(true);
            }}
            className="w-10 h-10 rounded-full bg-[#d0bcff] text-[#3c0091] flex items-center justify-center font-bold shadow-lg hover:bg-[#d0bcff]/90 active:scale-95 transition-all"
            title="Add Member"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#958ea0]" />
          <input
            type="text"
            placeholder="Search name, phone, or code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#122131] border border-[#273647] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#d4e4fa] placeholder:text-[#958ea0] focus:outline-none focus:border-[#d0bcff] transition-all"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {(['ALL', 'ACTIVE', 'EXPIRING', 'INACTIVE'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                activeTab === tab
                  ? 'bg-[#1c2b3c] border-[#d0bcff] text-[#d4e4fa]'
                  : 'bg-[#122131] border-[#273647] text-[#958ea0] hover:text-[#d4e4fa]'
              }`}
            >
              {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Customers List */}
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#958ea0]">Loading members directory...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[#273647] rounded-2xl bg-[#122131]/50 space-y-3">
            <Users className="w-10 h-10 mx-auto text-[#958ea0]" />
            <h3 className="text-sm font-bold text-[#d4e4fa]">No members found</h3>
            <p className="text-xs text-[#958ea0] max-w-xs mx-auto">
              {search ? 'Try adjusting your search query.' : 'Add your first member to get started.'}
            </p>
            <button
              onClick={() => {
                setQuickTab('onboard');
                setShowQuickModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#d0bcff] text-[#3c0091] font-bold text-xs inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {customers.map((c, idx) => {
              // Simulated status logic for demonstration matching screen designs
              const isDue = idx === 0;
              const isExpiringSoon = idx === 1;

              return (
                <div
                  key={c._id}
                  onClick={() => router.push(`/customers/${c._id}`)}
                  className="p-4 rounded-2xl bg-[#122131] border border-[#273647] space-y-3 shadow-sm hover:border-[#d0bcff]/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1c2b3c] border border-[#273647] text-[#d4e4fa] flex items-center justify-center font-bold text-xs group-hover:border-[#d0bcff]/50 transition-colors">
                        {c.firstName.charAt(0)}
                        {c.lastName ? c.lastName.charAt(0) : ''}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-[#d4e4fa] group-hover:text-[#d0bcff] transition-colors flex items-center gap-1.5">
                          <span>{c.firstName} {c.lastName || ''}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#958ea0] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </h3>
                        <p className="text-[11px] text-[#958ea0] font-mono">{c.customerCode || 'CUST-1001'}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        c.status === 'ACTIVE'
                          ? 'bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/20'
                          : isExpiringSoon
                          ? 'bg-[#ffb95f]/10 text-[#ffb95f] border border-[#ffb95f]/20'
                          : 'bg-[#1c2b3c] text-[#958ea0]'
                      }`}
                    >
                      {isExpiringSoon ? 'Expiring' : c.status}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#273647] flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[10px] font-bold text-[#958ea0] uppercase tracking-wider">Plan</p>
                      <p className="font-semibold text-[#d4e4fa]">Starter • Active</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-[#958ea0] uppercase tracking-wider">Phone</p>
                      <p className="font-bold text-[#d4e4fa] font-mono">{c.phone}</p>
                    </div>
                  </div>

                  {/* Next Best Action Button */}
                  <div className="pt-1">
                    {isDue ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickTab('payment');
                          setShowQuickModal(true);
                        }}
                        className="w-full py-2 rounded-xl bg-[#1c2b3c] border border-[#273647] text-[#d4e4fa] font-bold text-xs hover:bg-[#273647] flex items-center justify-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-[#4edea3]" />
                        <span>Collect</span>
                      </button>
                    ) : isExpiringSoon ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickTab('renew');
                          setShowQuickModal(true);
                        }}
                        className="w-full py-2 rounded-xl bg-[#d0bcff] text-[#3c0091] font-bold text-xs hover:bg-[#d0bcff]/90 flex items-center justify-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Renew</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickTab('announcement');
                          setShowQuickModal(true);
                        }}
                        className="w-full py-2 rounded-xl bg-[#1c2b3c] border border-[#273647] text-[#d4e4fa] font-bold text-xs hover:bg-[#273647] flex items-center justify-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5 text-[#d0bcff]" />
                        <span>Follow Up</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <QuickActionModal
        isOpen={showQuickModal}
        onClose={() => {
          setShowQuickModal(false);
          fetchCustomers();
        }}
        initialTab="onboard"
      />
    </AppShell>
  );
}
