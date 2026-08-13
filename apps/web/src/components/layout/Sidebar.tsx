'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, CreditCard, CalendarCheck, Settings, Dumbbell, Award, Receipt } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Customers', href: '/customers', icon: Users },
    { label: 'Memberships', href: '/memberships', icon: Award },
    { label: 'Invoices', href: '/invoices', icon: Receipt },
    { label: 'Payments', href: '/payments', icon: CreditCard },
    { label: 'Attendance', href: '#', icon: CalendarCheck, badge: 'Soon' },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border min-h-screen p-4 justify-between">
      <div>
        {/* Brand */}
        <div className="flex items-center gap-3 px-3 py-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-foreground tracking-tight">Klyro Gym</h1>
            <p className="text-xs text-muted-foreground">Multi-Tenant Platform</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '#' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Footer */}
      <div className="pt-4 border-t border-border">
        <div className="px-3 py-2 bg-secondary/50 rounded-xl">
          <p className="text-xs text-muted-foreground">Logged in as</p>
          <p className="text-sm font-semibold text-foreground truncate">{user?.phone || 'Authenticated User'}</p>
        </div>
      </div>
    </aside>
  );
};
