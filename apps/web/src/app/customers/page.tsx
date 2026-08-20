'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { ICustomer } from '@klyro/types';
import {
  Users,
  Search,
  UserPlus,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { QuickActionModal } from '@/components/QuickActionModal';

export default function CustomersPage() {
  const router = useRouter();
  const { activeOrgId } = useAuth();
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'EXPIRING' | 'INACTIVE'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Quick Action Modal State
  const [showQuickModal, setShowQuickModal] = useState(false);

  const fetchCustomers = async () => {
    if (!activeOrgId) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (activeTab !== 'ALL') params.append('status', activeTab);

      const endpoint = `/customers?${params.toString()}`;
      const [custData, memData] = await Promise.all([
        apiRequest<ICustomer[]>(endpoint, {}, activeOrgId),
        apiRequest<any[]>('/memberships', {}, activeOrgId).catch(() => []),
      ]);

      setCustomers(custData || []);
      setMemberships(Array.isArray(memData) ? memData : (memData as any)?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [activeOrgId, search, activeTab]);

  const filteredCustomers = React.useMemo(() => {
    return customers.filter((c) => {
      if (activeTab === 'EXPIRING') {
        const custMembership = memberships.find((m) => {
          const custId = typeof m.customerId === 'object' ? m.customerId?._id : m.customerId;
          return custId === c._id;
        });
        if (!custMembership || !custMembership.endDate) return false;
        const diffMs = new Date(custMembership.endDate).getTime() - Date.now();
        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return daysLeft <= 7;
      }
      return true;
    });
  }, [customers, memberships, activeTab]);

  return (
    <AppShell>
      <div className="space-y-4 max-w-4xl mx-auto pb-6">
        {/* Top Header Row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-[#d4e4fa]">Members Directory</h1>
            <p className="text-xs text-[#958ea0]">
              Total: <span className="font-bold text-[#d4e4fa]">{customers.length}</span> members
            </p>
          </div>
          <button
            onClick={() => setShowQuickModal(true)}
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
            className="w-full bg-[#122131] border border-[#273647] rounded-xl pl-10 pr-4 py-2 text-xs text-[#d4e4fa] placeholder:text-[#958ea0] focus:outline-none focus:border-[#d0bcff] transition-all"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {(['ALL', 'ACTIVE', 'EXPIRING', 'INACTIVE'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-[#1c2b3c] border-[#d0bcff] text-[#d4e4fa]'
                  : 'bg-[#122131] border-[#273647] text-[#958ea0] hover:text-[#d4e4fa]'
              }`}
            >
              {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Compact List-Type Customers Directory */}
        {isLoading ? (
          <div className="py-12 text-center text-xs text-[#958ea0]">Loading members directory...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[#273647] rounded-2xl bg-[#122131]/50 space-y-3">
            <Users className="w-10 h-10 mx-auto text-[#958ea0]" />
            <h3 className="text-sm font-bold text-[#d4e4fa]">No members found</h3>
            <p className="text-xs text-[#958ea0] max-w-xs mx-auto">
              {search || activeTab !== 'ALL' ? 'Try adjusting your search query or filter.' : 'Add your first member to get started.'}
            </p>
            <button
              onClick={() => setShowQuickModal(true)}
              className="px-4 py-2 rounded-xl bg-[#d0bcff] text-[#3c0091] font-bold text-xs inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCustomers.map((c) => {
              // Find active membership for this customer
              const custMembership = memberships.find((m) => {
                const custId = typeof m.customerId === 'object' ? m.customerId?._id : m.customerId;
                return custId === c._id && m.status === 'ACTIVE';
              });

              let daysLeft: number | undefined = undefined;
              if (custMembership && custMembership.endDate) {
                const diffMs = new Date(custMembership.endDate).getTime() - Date.now();
                daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              }

              return (
                <div
                  key={c._id}
                  onClick={() => router.push(`/customers/${c._id}`)}
                  className="p-3 rounded-xl bg-[#122131] border border-[#273647] hover:border-[#d0bcff]/40 transition-all cursor-pointer group flex items-center justify-between gap-3 shadow-sm"
                >
                  {/* Left Member Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#1c2b3c] border border-[#273647] text-[#d4e4fa] flex items-center justify-center font-bold text-xs flex-shrink-0 group-hover:border-[#d0bcff]/50 transition-colors">
                      {c.firstName.charAt(0)}
                      {c.lastName ? c.lastName.charAt(0) : ''}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-xs md:text-sm text-[#d4e4fa] truncate group-hover:text-[#d0bcff] transition-colors">
                          {c.firstName} {c.lastName || ''}
                        </h3>
                        <span className="text-[10px] text-[#958ea0] font-mono flex-shrink-0">
                          ({c.customerCode || 'CUST'})
                        </span>
                      </div>
                      <p className="text-[10px] text-[#958ea0] font-mono truncate mt-0.5">
                        {c.phone}
                      </p>
                    </div>
                  </div>

                  {/* Right Renewal Days Badge & Arrow */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {daysLeft !== undefined ? (
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          daysLeft > 7
                            ? 'bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/20'
                            : daysLeft >= 0
                            ? 'bg-[#ffb95f]/10 text-[#ffb95f] border-[#ffb95f]/20'
                            : 'bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/20'
                        }`}
                      >
                        {daysLeft > 0
                          ? `${daysLeft}d left`
                          : daysLeft === 0
                          ? 'Expires today'
                          : `Expired (${Math.abs(daysLeft)}d)`}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1c2b3c] text-[#958ea0] border border-[#273647]">
                        No Plan
                      </span>
                    )}

                    <ChevronRight className="w-4 h-4 text-[#958ea0] group-hover:text-[#d4e4fa] group-hover:translate-x-0.5 transition-all" />
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
