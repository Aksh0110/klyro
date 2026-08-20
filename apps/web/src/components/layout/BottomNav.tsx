'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  CreditCard,
  MessageSquare,
  Menu,
  Award,
  Receipt,
  Settings,
  CalendarCheck,
  Bell,
  LogOut,
  X,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { user, activeOrgId, logout } = useAuth();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const userRole = user?.roles?.find((r) => r.organizationId === activeOrgId)?.role || 'MEMBER';
  const isMember = userRole === 'MEMBER';

  const adminNavItems = [
    { label: 'Home', href: '/dashboard', icon: Home },
    { label: 'Members', href: '/customers', icon: Users },
    { label: 'Money', href: '/payments', icon: CreditCard },
    { label: 'Engage', href: '/communications', icon: MessageSquare },
  ];

  const memberNavItems = [
    { label: 'Home', href: '/member', icon: Home },
    { label: 'Attendance', href: '/member/attendance', icon: CalendarCheck },
    { label: 'Alerts', href: '/member/notifications', icon: Bell },
  ];

  const navItems = isMember ? memberNavItems : adminNavItems;

  const moreItems = isMember
    ? [{ label: 'Settings', href: '/settings', icon: Settings, desc: 'App & profile preferences' }]
    : [
        { label: 'Memberships', href: '/memberships', icon: Award, desc: 'Manage gym plans & passes' },
        { label: 'Invoices', href: '/invoices', icon: Receipt, desc: 'View, generate & collect invoices' },
        { label: 'Settings', href: '/settings', icon: Settings, desc: 'Gym & tenant configuration' },
      ];

  const isMoreActive = moreItems.some((item) => pathname.startsWith(item.href));

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#051424]/95 backdrop-blur-xl border-t border-[#273647] px-2 py-2 shadow-2xl">
        <div className="flex items-center justify-around w-full max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && item.href !== '/member' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setShowMoreMenu(false)}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-all ${
                  isActive ? 'text-[#d0bcff] font-bold scale-105' : 'text-[#958ea0] hover:text-[#d4e4fa]'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 transition-colors ${isActive ? 'text-[#d0bcff]' : 'text-[#958ea0]'}`} />
                <span className="tracking-tight">{item.label}</span>
              </Link>
            );
          })}

          {/* More Menu Button */}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-all ${
              showMoreMenu || isMoreActive
                ? 'text-[#d0bcff] font-bold scale-105'
                : 'text-[#958ea0] hover:text-[#d4e4fa]'
            }`}
          >
            <Menu className={`w-5 h-5 mb-1 transition-colors ${showMoreMenu || isMoreActive ? 'text-[#d0bcff]' : 'text-[#958ea0]'}`} />
            <span className="tracking-tight">More</span>
          </button>
        </div>
      </nav>

      {/* Slide-up "More" Drawer / Modal */}
      {showMoreMenu && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Backdrop Click to Close */}
          <div className="flex-1" onClick={() => setShowMoreMenu(false)} />

          {/* Bottom Sheet Content */}
          <div className="bg-[#122131] border-t border-[#273647] rounded-t-3xl p-5 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            {/* Header & Handle */}
            <div className="flex items-center justify-between border-b border-[#273647] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1c2b3c] border border-[#273647] flex items-center justify-center text-[#d0bcff]">
                  <Menu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#d4e4fa]">All Navigation & Actions</h3>
                  <p className="text-[11px] text-[#958ea0]">Access full gym management tools</p>
                </div>
              </div>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1.5 rounded-full bg-[#1c2b3c] text-[#958ea0] hover:text-[#d4e4fa] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Additional Menu Options */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#958ea0] uppercase tracking-wider px-1">Management Views</p>
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-[#1c2b3c] border-[#d0bcff]/40 text-[#d4e4fa]'
                        : 'bg-[#0d1c2d]/70 border-[#273647] text-[#d4e4fa] hover:bg-[#1c2b3c]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${isActive ? 'bg-[#d0bcff]/20 text-[#d0bcff]' : 'bg-[#1c2b3c] text-[#958ea0]'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-[#d4e4fa]">{item.label}</div>
                        <div className="text-xs text-[#958ea0]">{item.desc}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#958ea0]" />
                  </Link>
                );
              })}
            </div>

            {/* Quick Tenant Info & Account Actions */}
            <div className="pt-2 border-t border-[#273647] space-y-3">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0d1c2d] border border-[#273647]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#d0bcff]/10 text-[#d0bcff] font-bold flex items-center justify-center text-xs border border-[#d0bcff]/20">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#d4e4fa] truncate max-w-[150px]">{user?.phone || 'Gym Admin'}</p>
                    <p className="text-[10px] text-[#958ea0]">Role: {userRole}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    logout();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-destructive/15 text-destructive text-xs font-bold hover:bg-destructive/25 transition-all flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};



