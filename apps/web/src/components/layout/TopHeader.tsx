'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Dumbbell, ShieldCheck, Bell, Search, Plus, User, Download } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { ICustomer } from '@klyro/types';
import { QuickActionModal } from '../QuickActionModal';

export const TopHeader: React.FC = () => {
  const router = useRouter();
  const { user, activeOrgId, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [canInstallPwa, setCanInstallPwa] = useState(false);

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
        if (choice.outcome === 'accepted') {
          setCanInstallPwa(false);
          (window as any).deferredPwaPrompt = null;
        }
      } catch (err) {
        console.error('PWA install prompt error:', err);
      }
    } else {
      alert('Install Klyro Mobile App:\n\n1. Tap your mobile browser menu (⋮ or Share icon).\n2. Tap "Add to Home Screen" or "Install App".\n\nKlyro will be added to your home screen with a full-screen app experience.');
    }
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
      <header className="sticky top-0 z-30 w-full bg-card/80 backdrop-blur-md border-b border-border px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Mobile Brand / Tenant Badge */}
        <div className="flex items-center gap-3">
          <div className="md:hidden w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white">
            <Dumbbell className="w-4 h-4" />
          </div>
          <div className="hidden sm:block">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tenant Context</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">
                {activeOrgId ? `Org ID: ${activeOrgId.slice(-6).toUpperCase()}` : 'Default Tenant'}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                <ShieldCheck className="w-3 h-3" />
                {userRole}
              </span>
            </div>
          </div>
        </div>

        {/* Global Instant Search (Center) */}
        {isManagerOrOwner && (
          <div ref={searchRef} className="relative flex-1 max-w-md mx-auto">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search member by Name, Phone, Code... (Press Enter)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => {
                  if (searchResults.length > 0) setShowSearchDropdown(true);
                }}
                className="w-full bg-secondary/60 border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Mobile PWA Install Shortcut Button */}
          {canInstallPwa && (
            <button
              onClick={handleHeaderInstallClick}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 font-bold text-xs transition-all active:scale-95 shrink-0"
              title="Install Klyro App Shortcut to Home Screen"
            >
              <Download className="w-3.5 h-3.5 text-purple-300" />
              <span className="text-[11px] font-extrabold">Install App</span>
            </button>
          )}

          {/* + Quick Action Button */}
          {isManagerOrOwner && (
            <button
              onClick={() => {
                setQuickActionTab('onboard');
                setShowQuickAction(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-md shadow-primary/20 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quick Action</span>
            </button>
          )}


          {/* Notifications (Member Portal only) */}
          {!isManagerOrOwner && (
            <Link
              href="/member/notifications"
              className="relative p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition-all flex items-center justify-center border border-border"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-all"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Global Quick Action Modal */}
      <QuickActionModal
        isOpen={showQuickAction}
        onClose={() => setShowQuickAction(false)}
        initialTab={quickActionTab}
      />
    </>
  );
};
