'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Dumbbell, ShieldCheck, Bell, Search, Plus, User, Download, Smartphone, X, Sparkles, Share, Building2, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { ICustomer } from '@klyro/types';
import { QuickActionModal } from '../QuickActionModal';

export const TopHeader: React.FC = () => {
  const router = useRouter();
  const { user, activeOrgId, branches, activeBranchId, activeBranch, setActiveBranchId, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [canInstallPwa, setCanInstallPwa] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Branch Switcher State
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ICustomer[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Quick Action Modal State
  const [showQuickAction, setShowQuickAction] = useState(false);
  const [quickActionTab, setQuickActionTab] = useState<'onboard' | 'payment' | 'renew' | 'announcement'>('onboard');

  const userRole = user?.roles.find((r) => r.organizationId === activeOrgId)?.role || 'MEMBER';
  const isManagerOrOwner = userRole === 'OWNER' || userRole === 'SUPER_ADMIN' || userRole === 'MANAGER';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setCanInstallPwa(false);
      return;
    }

    setCanInstallPwa(true);

    const handlePromptReady = () => {
      setCanInstallPwa(true);
    };

    const handleAppInstalled = () => {
      setCanInstallPwa(false);
      setShowInstallModal(false);
      (window as any).deferredPwaPrompt = null;
    };

    (window as any).onPwaPromptReady = handlePromptReady;
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleHeaderInstallClick = async () => {
    if (typeof window === 'undefined') return;
    const promptEvent = (window as any).deferredPwaPrompt;

    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice?.outcome === 'accepted') {
          setCanInstallPwa(false);
          (window as any).deferredPwaPrompt = null;
        }
        return;
      } catch (err) {
        console.error('PWA install prompt error:', err);
      }
    }

    // Interactive in-app guide modal fallback
    setShowInstallModal(true);
  };





  useEffect(() => {
    if (!activeOrgId) return;
    const fetchUnread = async () => {
      try {
        const res = await apiRequest<{ unreadCount: number }>('/notifications/unread-count', {}, activeOrgId);
        setUnreadCount(res.unreadCount || 0);
      } catch {
        // Silent catch for topbar badge
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [activeOrgId]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2 || !activeOrgId) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest<ICustomer[]>(
          `/customers?search=${encodeURIComponent(searchQuery)}&limit=6`,
          {},
          activeOrgId,
        );
        setSearchResults(res || []);
        setShowSearchDropdown(true);
      } catch {
        setSearchResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, activeOrgId]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
        setShowBranchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      router.push(`/customers/${searchResults[0]._id}`);
      setShowSearchDropdown(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-card/80 backdrop-blur-md border-b border-border px-2.5 sm:px-4 py-2 sm:py-2.5 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] flex items-center justify-between gap-2 sm:gap-3">

        {/* Mobile Brand / Tenant Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="md:hidden w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shrink-0">
            <Dumbbell className="w-4 h-4" />
          </div>
          <div className="hidden sm:block">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tenant Context</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-foreground">
                {activeOrgId ? `Org ID: ${activeOrgId.slice(-6).toUpperCase()}` : 'Default Tenant'}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                <ShieldCheck className="w-3 h-3" />
                {userRole}
              </span>
              {activeBranch && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-foreground border border-border">
                  <Building2 className="w-2.5 h-2.5 text-primary" />
                  <span>{activeBranch.name}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Global Instant Search (Center) - Expanded & Roomy */}
        {isManagerOrOwner && (
          <div ref={searchRef} className="relative flex-1 min-w-[120px] max-w-lg mx-1 sm:mx-auto">
            <div className="relative">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search member by Name, Phone, Code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => {
                  if (searchResults.length > 0) setShowSearchDropdown(true);
                }}
                className="w-full bg-secondary/60 border border-border rounded-xl pl-8 sm:pl-9 pr-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
              />
            </div>

            {/* Dropdown Suggestions */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl overflow-hidden divide-y divide-border z-50 animate-in fade-in zoom-in-95 duration-100">
                {searchResults.map((c, idx) => (
                  <button
                    key={c._id}
                    onClick={() => {
                      router.push(`/customers/${c._id}`);
                      setShowSearchDropdown(false);
                      setSearchQuery('');
                    }}
                    className={`w-full p-2.5 text-left hover:bg-secondary/50 flex items-center justify-between text-xs transition-colors ${
                      idx === 0 ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                        {c.firstName.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-foreground">
                          {c.firstName} {c.lastName || ''}
                        </span>
                        <span className="text-muted-foreground font-mono text-[10px] ml-1.5">({c.customerCode})</span>
                      </div>
                    </div>
                    <span className="text-muted-foreground font-mono text-[11px]">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons (Right) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Active Branch Selector (Icon on mobile, name on desktop) */}
          {isManagerOrOwner && branches.length > 0 && (
            <div ref={branchDropdownRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowBranchDropdown((prev) => !prev)}
                className="flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-secondary/80 hover:bg-secondary border border-border text-foreground transition-all active:scale-95 group text-xs font-semibold shrink-0"
                title={`Active Branch: ${activeBranch?.name || 'Select Branch'}`}
              >
                <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="hidden md:inline max-w-[120px] truncate ml-1 text-xs">
                  {activeBranch ? activeBranch.name : 'Branch'}
                </span>
                {branches.length > 1 && (
                  <ChevronDown className="hidden md:inline w-3 h-3 text-muted-foreground group-hover:text-foreground transition-transform shrink-0 ml-1" />
                )}
              </button>

              {showBranchDropdown && (
                <div className="absolute top-full right-0 mt-1.5 w-60 bg-card border border-border rounded-xl shadow-2xl overflow-hidden divide-y divide-border z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2.5 bg-secondary/30 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                    <span>Active Gym Branch</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                      {branches.length} {branches.length === 1 ? 'branch' : 'branches'}
                    </span>
                  </div>
                  <div className="py-1 max-h-56 overflow-y-auto divide-y divide-border/30">
                    {branches.map((b) => {
                      const isSelected = b._id === activeBranchId;
                      return (
                        <button
                          key={b._id}
                          type="button"
                          onClick={() => {
                            setActiveBranchId(b._id);
                            setShowBranchDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs hover:bg-secondary/60 transition-colors ${
                            isSelected ? 'bg-primary/10 text-primary font-bold' : 'text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <Building2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="truncate">{b.name}</span>
                          </div>
                          {isSelected && (
                            <div className="flex items-center gap-1 shrink-0 ml-1.5">
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-primary/20 text-primary uppercase">
                                Active
                              </span>
                              <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="p-1.5 bg-secondary/20">
                    <Link
                      href="/settings?tab=branches"
                      onClick={() => setShowBranchDropdown(false)}
                      className="w-full px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                      Manage Branches
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile PWA Install Shortcut Button */}
          {canInstallPwa && (
            <button
              onClick={handleHeaderInstallClick}
              className="flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 font-bold text-xs transition-all active:scale-95 shrink-0"
              title="Install Klyro App"
            >
              <Download className="w-3.5 h-3.5 text-purple-300" />
              <span className="hidden md:inline text-[11px] font-extrabold ml-1">Install App</span>
            </button>
          )}

          {/* + Quick Action Button */}
          {isManagerOrOwner && (
            <button
              onClick={() => {
                setQuickActionTab('onboard');
                setShowQuickAction(true);
              }}
              className="flex items-center justify-center p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-md shadow-primary/20 active:scale-95 shrink-0"
              title="Quick Action"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline ml-1">Quick Action</span>
            </button>
          )}

          {/* Notifications (Member Portal only) */}
          {!isManagerOrOwner && (
            <Link
              href="/member/notifications"
              className="relative p-1.5 sm:p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition-all flex items-center justify-center border border-border shrink-0"
              title="Notifications"
            >
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* Logout button */}
          <button
            onClick={logout}
            className="flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-all shrink-0"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline ml-1">Logout</span>
          </button>
        </div>
      </header>

      {/* Global Quick Action Modal */}
      <QuickActionModal
        isOpen={showQuickAction}
        onClose={() => setShowQuickAction(false)}
        initialTab={quickActionTab}
      />

      {/* Sleek In-App PWA Installation Modal Guide */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-[#051424] border border-[#273647] rounded-3xl p-6 shadow-2xl space-y-4 text-[#d4e4fa]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8b5cf6] to-[#d0bcff] flex items-center justify-center text-[#051424] shadow-lg">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#d4e4fa]">Install Klyro App</h3>
                  <p className="text-[11px] text-[#958ea0]">1-Tap Mobile Home Screen</p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallModal(false)}
                className="p-1.5 rounded-xl text-[#958ea0] hover:text-[#d4e4fa] hover:bg-[#1c2b3c] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 pt-2 text-xs">
              <div className="p-3 rounded-2xl bg-[#0d1c2d] border border-[#273647] flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#d0bcff]/20 text-[#d0bcff] font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <p className="text-[11px] text-[#d4e4fa] pt-0.5">
                  Tap your mobile browser menu icon (<span className="font-bold text-[#d0bcff]">⋮</span> on Android Chrome, or <Share className="w-3.5 h-3.5 inline text-[#d0bcff]" /> on iOS Safari).
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#0d1c2d] border border-[#273647] flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#4edea3]/20 text-[#4edea3] font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <p className="text-[11px] text-[#d4e4fa] pt-0.5">
                  Select <span className="font-bold text-[#4edea3]">&quot;Add to Home Screen&quot;</span> or <span className="font-bold text-[#4edea3]">&quot;Install App&quot;</span>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowInstallModal(false)}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-[#8b5cf6] to-[#d0bcff] text-[#051424] font-extrabold text-xs shadow-lg shadow-purple-900/30 hover:brightness-110 active:scale-95 transition-all"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
};

