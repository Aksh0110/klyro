'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { IOrganization, IBranch } from '@klyro/types';
import Link from 'next/link';
import { Settings as SettingsIcon, Building2, Plus, CheckCircle2, MapPin } from 'lucide-react';

export default function SettingsPage() {
  const { activeOrgId } = useAuth();
  const [org, setOrg] = useState<IOrganization | null>(null);
  const [branches, setBranches] = useState<IBranch[]>([]);
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!activeOrgId) return;

    const loadData = async () => {
      try {
        const [orgData, branchesData] = await Promise.all([
          apiRequest<IOrganization>('/organizations/current', {}, activeOrgId),
          apiRequest<IBranch[]>('/branches', {}, activeOrgId),
        ]);
        setOrg(orgData);
        setBranches(branchesData);
      } catch (err: any) {
        console.error(err);
      }
    };

    loadData();
  }, [activeOrgId]);

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim() || !branchCode.trim() || !activeOrgId) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const newBranch = await apiRequest<IBranch>(
        '/branches',
        {
          method: 'POST',
          body: JSON.stringify({ name: branchName, code: branchCode }),
        },
        activeOrgId,
      );

      setBranches((prev) => [...prev, newBranch]);
      setBranchName('');
      setBranchCode('');
      setMessage('New branch added successfully!');
    } catch (err: any) {
      setMessage(err.message || 'Failed to add branch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-primary" />
            Organization & Branch Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your organization profile, branches, and regional settings
          </p>
        </div>

        {/* Organization Configuration Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <Building2 className="w-5 h-5 text-indigo-400" />
            Organization Profile
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Name</span>
              <p className="text-foreground font-semibold text-base mt-0.5">{org?.name || 'Loading...'}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Vertical</span>
              <p className="text-foreground font-semibold text-base mt-0.5">{org?.vertical}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Default Timezone</span>
              <p className="text-foreground font-semibold text-base mt-0.5">{org?.settings?.timezone || 'Asia/Kolkata'}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Currency</span>
              <p className="text-foreground font-semibold text-base mt-0.5">{org?.settings?.currency || 'INR'}</p>
            </div>
          </div>
        </div>

        {/* Attendance & GPS Self Check-In Configuration Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-500" />
              Member GPS Self Check-In Settings
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Enable/disable phone GPS self check-in, set branch latitude/longitude coordinates, and configure radius.
            </p>
          </div>
          <Link
            href="/settings/attendance"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Manage Check-In Settings</span>
          </Link>
        </div>

        {/* Branch Management */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-foreground border-b border-border pb-3">
            Branch Management
          </h2>

          {/* List Existing Branches */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-muted-foreground">Active Branches</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {branches.map((b) => (
                <div key={b._id} className="p-4 bg-secondary/30 rounded-xl border border-border flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-foreground">{b.name}</h4>
                    <p className="text-xs font-mono text-muted-foreground">Code: {b.code}</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Branch Form */}
          <div className="pt-4 border-t border-border space-y-4">
            <h3 className="text-xs font-bold uppercase text-muted-foreground">Add New Branch</h3>
            {message && (
              <div className="p-3 bg-secondary border border-border rounded-xl text-xs text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{message}</span>
              </div>
            )}
            <form onSubmit={handleAddBranch} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Branch Name (e.g. North Campus)"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                required
                className="px-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="text"
                placeholder="Branch Code (e.g. NORTH)"
                value={branchCode}
                onChange={(e) => setBranchCode(e.target.value)}
                required
                className="px-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-foreground text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2.5 px-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 text-sm shadow-md disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Add Branch</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
