'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { IOrganization, IBranch } from '@klyro/types';
import Link from 'next/link';
import {
  Settings as SettingsIcon,
  Building2,
  Plus,
  CheckCircle2,
  MapPin,
  Sparkles,
  CreditCard,
  Gift,
  RefreshCw,
  ArrowRight,
  CalendarCheck,
  Layers,
  ChevronRight,
  User,
  Phone,
  Mail,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  Check,
} from 'lucide-react';

export default function SettingsPage() {
  const { activeOrgId, activeBranchId, setActiveBranchId, refreshBranches, user, refreshUser } = useAuth();
  const [org, setOrg] = useState<IOrganization | null>(null);
  const [branches, setBranches] = useState<IBranch[]>([]);
  const [subData, setSubData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'profile' | 'branches' | 'attendance'>('all');

  // Branch creation form state
  const [showAddBranchForm, setShowAddBranchForm] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Profile edit modal state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [editGymName, setEditGymName] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editStreet, setEditStreet] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPostalCode, setEditPostalCode] = useState('');

  // Branch edit state
  const [editingBranch, setEditingBranch] = useState<IBranch | null>(null);
  const [isSavingBranch, setIsSavingBranch] = useState(false);
  const [branchEditError, setBranchEditError] = useState<string | null>(null);
  const [branchFormName, setBranchFormName] = useState('');
  const [branchFormCode, setBranchFormCode] = useState('');
  const [branchFormStatus, setBranchFormStatus] = useState<string>('ACTIVE');

  // Branch delete state
  const [deletingBranch, setDeletingBranch] = useState<IBranch | null>(null);
  const [isDeletingBranch, setIsDeletingBranch] = useState(false);
  const [branchDeleteError, setBranchDeleteError] = useState<string | null>(null);

  // Toast banner state
  const [toastBanner, setToastBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const userRole = user?.roles?.find((r) => r.organizationId === activeOrgId)?.role || 'MEMBER';
  const isOwnerOrAdmin = userRole === 'OWNER' || userRole === 'SUPER_ADMIN' || userRole === 'MANAGER';

  useEffect(() => {
    if (!activeOrgId) return;

    const loadData = async () => {
      try {
        const [orgData, branchesData, subRes] = await Promise.all([
          apiRequest<IOrganization>('/organizations/current', {}, activeOrgId).catch(() => null),
          apiRequest<IBranch[]>('/branches', {}, activeOrgId).catch(() => []),
          apiRequest<any>('/subscription/current', {}, activeOrgId).catch(() => null),
        ]);
        if (orgData) setOrg(orgData);
        if (branchesData) setBranches(branchesData);
        if (subRes) setSubData(subRes);
      } catch (err: any) {
        console.error('Error loading settings data', err);
      }
    };

    loadData();
  }, [activeOrgId]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastBanner({ type, message: text });
    setTimeout(() => setToastBanner(null), 6000);
  };

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
          body: JSON.stringify({ name: branchName.trim(), code: branchCode.trim().toUpperCase() }),
        },
        activeOrgId,
      );

      setBranches((prev) => [...prev, newBranch]);
      setBranchName('');
      setBranchCode('');
      setShowAddBranchForm(false);
      showToast('success', `New branch '${newBranch.name}' created successfully!`);
      refreshBranches();
    } catch (err: any) {
      setMessage(err.message || 'Failed to add branch');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Profile Edit Handlers
  const handleOpenEditProfile = () => {
    setEditGymName(org?.name || '');
    setEditOwnerName(user?.name || '');
    setEditPhone(user?.phone || org?.contact?.phone || '');
    setEditEmail(user?.email || org?.contact?.email || '');
    setEditStreet(org?.address?.street || '');
    setEditCity(org?.address?.city || '');
    setEditState(org?.address?.state || '');
    setEditPostalCode(org?.address?.postalCode || '');
    setProfileError(null);
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId) return;
    setIsSavingProfile(true);
    setProfileError(null);

    try {
      // 1. Update organization details
      const updatedOrg = await apiRequest<IOrganization>(
        '/organizations/current',
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: editGymName.trim(),
            contact: {
              phone: editPhone.trim(),
              email: editEmail.trim(),
            },
            address: {
              street: editStreet.trim(),
              city: editCity.trim(),
              state: editState.trim(),
              postalCode: editPostalCode.trim(),
              country: 'India',
            },
          }),
        },
        activeOrgId,
      );
      if (updatedOrg) setOrg(updatedOrg);

      // 2. Update owner user name & email
      await apiRequest<any>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: editOwnerName.trim(),
          email: editEmail.trim(),
        }),
      });

      await refreshUser();

      setShowEditProfileModal(false);
      showToast('success', 'Profile and ownership information updated successfully!');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update organization profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Branch Edit Handlers
  const handleOpenEditBranch = (branch: IBranch) => {
    setEditingBranch(branch);
    setBranchFormName(branch.name);
    setBranchFormCode(branch.code);
    setBranchFormStatus(branch.status || 'ACTIVE');
    setBranchEditError(null);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch || !activeOrgId) return;
    setIsSavingBranch(true);
    setBranchEditError(null);

    try {
      const updated = await apiRequest<IBranch>(
        `/branches/${editingBranch._id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: branchFormName.trim(),
            code: branchFormCode.trim().toUpperCase(),
            status: branchFormStatus,
          }),
        },
        activeOrgId,
      );

      setBranches((prev) => prev.map((b) => (b._id === updated._id ? updated : b)));
      setEditingBranch(null);
      showToast('success', `Branch '${updated.name}' updated successfully!`);
    } catch (err: any) {
      setBranchEditError(err.message || 'Failed to update branch');
    } finally {
      setIsSavingBranch(false);
    }
  };

  // Branch Delete Handlers
  const handleOpenDeleteBranch = (branch: IBranch) => {
    setDeletingBranch(branch);
    setBranchDeleteError(null);
  };

  const handleConfirmDeleteBranch = async () => {
    if (!deletingBranch || !activeOrgId) return;
    setIsDeletingBranch(true);
    setBranchDeleteError(null);

    try {
      await apiRequest<{ success: boolean; message: string }>(
        `/branches/${deletingBranch._id}`,
        { method: 'DELETE' },
        activeOrgId,
      );

      const deletedName = deletingBranch.name;
      setBranches((prev) => prev.filter((b) => b._id !== deletingBranch._id));
      setDeletingBranch(null);
      showToast('success', `Branch '${deletedName}' deleted successfully.`);
      refreshBranches();
    } catch (err: any) {
      setBranchDeleteError(err.message || 'Failed to delete branch');
    } finally {
      setIsDeletingBranch(false);
    }
  };

  const sub = subData?.subscription;
  const plan = sub?.subscriptionPlanId;
  const isTrial = sub?.status === 'TRIAL';
  const isActive = sub?.status === 'ACTIVE';

  const dueDateStr = sub?.currentPeriodEnd || sub?.trialEndDate;
  const dueDate = dueDateStr ? new Date(dueDateStr) : null;
  const now = new Date();
  const daysLeft = dueDate
    ? Math.max(0, Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const formattedDueDate = dueDate
    ? dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'N/A';

  // Helper to format gym address
  const formatAddress = (addr?: any) => {
    if (!addr) return null;
    const parts = [addr.street, addr.city, addr.state, addr.postalCode, addr.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  const gymAddress =
    formatAddress(org?.address) ||
    formatAddress(branches[0]?.address) ||
    (branches[0]?.name ? `${branches[0].name}, Main Campus` : 'Main Branch Location, On-premise');

  const ownerName = user?.name || 'Gym Owner';
  const ownerPhone = user?.phone || org?.contact?.phone || 'Not specified';
  const ownerEmail = user?.email || org?.contact?.email || 'Not specified';

  return (
    <AppShell>
      <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto pb-12 px-1 sm:px-0">
        {/* Floating Toast Notification */}
        {toastBanner && (
          <div
            className={`p-3 sm:p-4 rounded-2xl border flex items-center justify-between shadow-xl transition-all animate-in slide-in-from-top-3 duration-300 ${
              toastBanner.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-emerald-950/30'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-rose-950/30'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toastBanner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 shrink-0" />
              )}
              <span className="text-xs sm:text-sm font-semibold">{toastBanner.message}</span>
            </div>
            <button
              onClick={() => setToastBanner(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground shrink-0 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-tight">
                Gym Settings & Workspace
              </h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Manage organization profile, subscription, branches, and GPS check-in
              </p>
            </div>
          </div>
        </div>

        {/* Quick Filter Navigation Tabs */}
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar border-b border-border/80">
          <div className="flex items-center gap-1.5 pb-2 min-w-max text-xs font-semibold">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap active:scale-95 ${
                activeTab === 'all'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Settings</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap active:scale-95 ${
                activeTab === 'profile'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Organization Profile</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isTrial ? 'bg-purple-400/20 text-purple-200' : 'bg-emerald-500/20 text-emerald-300'}`}>
                {isTrial ? 'Trial' : 'Active'}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('branches')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap active:scale-95 ${
                activeTab === 'branches'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Branches ({branches.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap active:scale-95 ${
                activeTab === 'attendance'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Attendance & GPS</span>
            </button>
          </div>
        </div>

        {/* UNIFIED SINGLE SECTION: ORGANIZATION PROFILE (Includes Ownership & Subscription Details) */}
        {(activeTab === 'all' || activeTab === 'profile') && (
          <div className="bg-card border border-border/80 rounded-2xl p-3.5 sm:p-5 shadow-sm space-y-4 sm:space-y-5">
            {/* Header with Heading & Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-sm shrink-0">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-extrabold text-foreground">
                      Organization Profile
                    </h2>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isTrial
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : isActive
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      ● {isTrial ? `Trial (${daysLeft}d left)` : sub?.status || 'Active Plan'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground hidden sm:block">
                    Gym ownership details & SaaS subscription management
                  </p>
                </div>
              </div>

              {/* Action Buttons for Subscription (Single Edit button remains in Ownership section below) */}
              {isOwnerOrAdmin && (
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0 w-full sm:w-auto">
                  <Link
                    href="/settings/subscription/plans"
                    className="px-3 py-1.5 sm:py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 text-center"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Change Plan</span>
                  </Link>

                  <Link
                    href="/settings/subscription"
                    className="px-3 py-1.5 sm:py-2 bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs rounded-xl border border-border transition-all flex items-center justify-center gap-1.5 text-center"
                  >
                    <span>Billing & History</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {/* Ownership Information - 2x2 grid on mobile for compact vertical space */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>Ownership & Contact Information</span>
                </h3>
                {isOwnerOrAdmin && (
                  <button
                    onClick={handleOpenEditProfile}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {/* Gym Name */}
                <div className="p-2.5 sm:p-3.5 rounded-xl bg-secondary/30 border border-border space-y-0.5 sm:space-y-1">
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                    Gym Name
                  </span>
                  <p className="text-foreground font-extrabold text-xs sm:text-sm truncate">{org?.name || 'Loading...'}</p>
                </div>

                {/* Account Owner Name */}
                <div className="p-2.5 sm:p-3.5 rounded-xl bg-secondary/30 border border-border space-y-0.5 sm:space-y-1">
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                    Account Owner
                  </span>
                  <p className="text-foreground font-bold text-xs sm:text-sm truncate">{ownerName}</p>
                </div>

                {/* Mobile Number */}
                <div className="p-2.5 sm:p-3.5 rounded-xl bg-secondary/30 border border-border space-y-0.5 sm:space-y-1">
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                    Mobile Number
                  </span>
                  <p className="text-foreground font-bold text-xs sm:text-sm font-mono truncate">{ownerPhone}</p>
                </div>

                {/* Email */}
                <div className="p-2.5 sm:p-3.5 rounded-xl bg-secondary/30 border border-border space-y-0.5 sm:space-y-1">
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                    Email Address
                  </span>
                  <p className="text-foreground font-bold text-xs sm:text-sm truncate">{ownerEmail}</p>
                </div>
              </div>

              {/* Gym Address */}
              <div className="p-2.5 sm:p-3.5 rounded-xl bg-secondary/30 border border-border flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                    Address of Gym
                  </span>
                  <p className="text-foreground text-xs font-medium leading-relaxed">{gymAddress}</p>
                </div>
              </div>
            </div>

            {/* Payment & Subscription Information */}
            <div className="space-y-2.5 pt-2 border-t border-border/80">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                <span>Subscription & Payment Information</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                {/* Plans */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-secondary/30 border border-border space-y-1">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Active Plan
                  </span>
                  <p className="font-extrabold text-xs sm:text-sm text-foreground">
                    {plan?.name || (isTrial ? 'Growth (Trial)' : 'Growth Plan')}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    ₹{sub?.amount || plan?.monthlyPrice || 799}/month · Up to {plan?.memberLimit || 500} members
                  </p>
                </div>

                {/* Active Validity */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-secondary/30 border border-border space-y-1">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Active Validity
                  </span>
                  <p className="font-extrabold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isTrial ? '60-Day Free Trial' : sub?.status || 'Active'}</span>
                  </p>
                  <p className="text-[11px] text-emerald-400 font-medium font-mono">
                    {daysLeft} days remaining
                  </p>
                </div>

                {/* Renewal Date */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-secondary/30 border border-border space-y-1">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Renewal Date
                  </span>
                  <p className="font-extrabold text-xs sm:text-sm text-foreground font-mono">
                    {formattedDueDate}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    {daysLeft > 0 ? `Next cycle in ${daysLeft} days` : 'Renewal due today'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. ATTENDANCE & GPS SELF CHECK-IN CARD */}
        {(activeTab === 'all' || activeTab === 'attendance') && (
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-0.5 sm:space-y-1">
              <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0" />
                <span>Member GPS Self Check-In Settings</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Enable or disable mobile GPS self check-in, configure branch coordinates, and set geofence radius.
              </p>
            </div>
            <Link
              href="/settings/attendance"
              className="w-full sm:w-auto px-4 py-2 sm:px-5 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0 text-center"
            >
              <SettingsIcon className="w-4 h-4" />
              <span>Manage Check-In Settings</span>
            </Link>
          </div>
        )}

        {/* 4. BRANCH MANAGEMENT (Compacted & Mobile Optimized) */}
        {(activeTab === 'all' || activeTab === 'branches') && (
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5">
            {/* Header with Title, Count, and Add Branch Action Button */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                <h2 className="text-sm sm:text-base font-bold text-foreground">Branch Management</h2>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-semibold">
                  {branches.length}
                </span>
              </div>

              {isOwnerOrAdmin && (
                <button
                  type="button"
                  onClick={() => setShowAddBranchForm(!showAddBranchForm)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
                    showAddBranchForm
                      ? 'bg-secondary text-foreground hover:bg-secondary/80'
                      : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20'
                  }`}
                >
                  <Plus className={`w-3.5 h-3.5 transition-transform duration-200 ${showAddBranchForm ? 'rotate-45' : ''}`} />
                  <span>{showAddBranchForm ? 'Close' : 'Add Branch'}</span>
                </button>
              )}
            </div>

            {/* Collapsible Compact Add Branch Panel */}
            {showAddBranchForm && (
              <div className="p-3.5 sm:p-4 rounded-xl bg-secondary/40 border border-primary/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground">Add New Gym Branch</h4>
                  <button
                    type="button"
                    onClick={() => setShowAddBranchForm(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleAddBranch} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    placeholder="Branch Name (e.g. North Campus)"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    required
                    className="px-3 py-2 bg-card border border-border rounded-xl text-foreground text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full"
                  />
                  <input
                    type="text"
                    placeholder="Branch Code (e.g. NORTH)"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value)}
                    required
                    className="px-3 py-2 bg-card border border-border rounded-xl text-foreground text-xs sm:text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="py-2 px-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 text-xs shadow-sm disabled:opacity-50 active:scale-95"
                  >
                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Create Branch</span>
                  </button>
                </form>
              </div>
            )}

            {/* Compact List of Existing Branches */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                Active Branches ({branches.length})
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                {branches.map((b) => (
                  <div
                    key={b._id}
                    className="p-3 sm:p-3.5 bg-secondary/30 rounded-xl border border-border flex items-center justify-between gap-2.5 hover:border-border/90 transition-all"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-foreground truncate text-xs sm:text-sm">{b.name}</h4>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ${
                            b.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-secondary text-muted-foreground border border-border'
                          }`}
                        >
                          {b.status}
                        </span>
                        {b._id === activeBranchId ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" />
                            Default Active
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveBranchId(b._id);
                              showToast('success', `Active branch set to '${b.name}'`);
                            }}
                            className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border active:scale-95 transition-all"
                          >
                            Set Active
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground">Code: {b.code}</p>
                    </div>

                    {/* Compact Edit & Delete Action Buttons */}
                    {isOwnerOrAdmin && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditBranch(b)}
                          className="px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold flex items-center gap-1 border border-border active:scale-95 transition-all"
                          title="Edit branch details"
                        >
                          <Pencil className="w-3.5 h-3.5 text-primary" />
                          <span className="hidden sm:inline text-[11px]">Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDeleteBranch(b)}
                          disabled={branches.length <= 1}
                          className="px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1 border border-rose-500/20 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
                          title={branches.length <= 1 ? 'Cannot delete the only branch' : 'Delete branch'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline text-[11px]">Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAL 1: EDIT PROFILE & OWNERSHIP DETAILS */}
        {showEditProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    <span>Edit Profile & Ownership Details</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Update gym details, account owner contact and physical address
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {profileError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Gym Name *
                    </label>
                    <input
                      type="text"
                      value={editGymName}
                      onChange={(e) => setEditGymName(e.target.value)}
                      required
                      placeholder="e.g. CUTY Gym"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Account Owner Name *
                    </label>
                    <input
                      type="text"
                      value={editOwnerName}
                      onChange={(e) => setEditOwnerName(e.target.value)}
                      required
                      placeholder="e.g. Akshay Sharma"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="owner@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Address Group */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Gym Physical Address
                  </span>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Street / Area</label>
                    <input
                      type="text"
                      value={editStreet}
                      onChange={(e) => setEditStreet(e.target.value)}
                      placeholder="e.g. 102 High Street, North Block"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">City</label>
                      <input
                        type="text"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        placeholder="City"
                        className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">State</label>
                      <input
                        type="text"
                        value={editState}
                        onChange={(e) => setEditState(e.target.value)}
                        placeholder="State"
                        className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">PIN / Postal Code</label>
                      <input
                        type="text"
                        value={editPostalCode}
                        onChange={(e) => setEditPostalCode(e.target.value)}
                        placeholder="Postal Code"
                        className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowEditProfileModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                  >
                    {isSavingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Save Profile Changes</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: EDIT BRANCH */}
        {editingBranch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-card border border-border rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <span>Edit Branch</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingBranch(null)}
                  className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {branchEditError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{branchEditError}</span>
                </div>
              )}

              <form onSubmit={handleSaveBranch} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Branch Name *
                  </label>
                  <input
                    type="text"
                    value={branchFormName}
                    onChange={(e) => setBranchFormName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Branch Code *
                  </label>
                  <input
                    type="text"
                    value={branchFormCode}
                    onChange={(e) => setBranchFormCode(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Status
                  </label>
                  <select
                    value={branchFormStatus}
                    onChange={(e) => setBranchFormStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setEditingBranch(null)}
                    className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingBranch}
                    className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                  >
                    {isSavingBranch && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: DELETE BRANCH CONFIRMATION DIALOG */}
        {deletingBranch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-card border border-border rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Delete Branch</h3>
                  <p className="text-xs text-muted-foreground">This action cannot be undone</p>
                </div>
              </div>

              {branchDeleteError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{branchDeleteError}</span>
                </div>
              )}

              <p className="text-sm text-foreground">
                Are you sure you want to delete branch{' '}
                <strong className="text-rose-400">{deletingBranch.name}</strong> ({deletingBranch.code})?
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingBranch(null)}
                  disabled={isDeletingBranch}
                  className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteBranch}
                  disabled={isDeletingBranch}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {isDeletingBranch && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Yes, Delete Branch</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

