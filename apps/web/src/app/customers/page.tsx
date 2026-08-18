'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { ICustomer, IBranch, IMembershipPlan } from '@klyro/types';
import {
  Users,
  Search,
  Plus,
  UserPlus,
  Phone,
  Building2,
  ChevronRight,
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';
import { QuickActionModal } from '@/components/QuickActionModal';

export default function CustomersPage() {
  const { activeOrgId } = useAuth();
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [branches, setBranches] = useState<IBranch[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Quick Action Modal State for streamlined onboarding
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchCustomers = async () => {
    if (!activeOrgId) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

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
    const fetchBranches = async () => {
      if (!activeOrgId) return;
      try {
        const branchList = await apiRequest<IBranch[]>('/branches', {}, activeOrgId);
        setBranches(branchList || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchBranches();
  }, [activeOrgId]);

  useEffect(() => {
    fetchCustomers();
  }, [activeOrgId, search, statusFilter]);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-card to-secondary/30 p-6 rounded-2xl border border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-wider font-semibold text-primary">Directory</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">Gym Operations</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">Members & Customers</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Complete directory of gym members, active plans, and financial status.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Member</span>
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by member name, phone or code (CUST-1001)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-all"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active Members</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>

        {/* Customers Grid */}
        {isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Loading members...</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/50">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="text-base font-bold text-foreground">No members found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {search || statusFilter
                ? 'No members match the selected filter criteria.'
                : 'Get started by adding your first gym member through the streamlined onboarding flow.'}
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add First Member</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map((c) => (
              <Link
                key={c._id}
                href={`/customers/${c._id}`}
                className="group p-5 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary/20 to-primary/5 text-primary flex items-center justify-center font-bold text-base border border-primary/20">
                        {c.firstName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors text-sm">
                          {c.firstName} {c.lastName || ''}
                        </h3>
                        <span className="font-mono text-[11px] text-muted-foreground">{c.customerCode}</span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                      <span className="font-mono">{c.phone}</span>
                    </div>
                    {c.email && (
                      <div className="truncate text-[11px] text-muted-foreground/80 pl-5.5">
                        {c.email}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-primary font-semibold">
                  <span>Open Action Center</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Streamlined Onboarding Quick Action Modal */}
      <QuickActionModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          fetchCustomers();
        }}
        initialTab="onboard"
      />
    </AppShell>
  );
}
