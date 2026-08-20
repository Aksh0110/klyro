'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Award,
  Receipt,
  CreditCard,
  Megaphone,
  Settings,
  CalendarCheck,
  Bell,
  User,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { user, activeOrgId } = useAuth();

  const userRole = user?.roles?.find((r) => r.organizationId === activeOrgId)?.role || 'MEMBER';
  const isMember = userRole === 'MEMBER';

  const memberNavItems = [
    { label: 'Portal', href: '/member', icon: User },
    { label: 'Attendance', href: '/member/attendance', icon: CalendarCheck },
    { label: 'Notifications', href: '/member/notifications', icon: Bell },
  ];

  const adminNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Customers', href: '/customers', icon: Users },
    { label: 'Memberships', href: '/memberships', icon: Award },
    { label: 'Invoices', href: '/invoices', icon: Receipt },
    { label: 'Payments', href: '/payments', icon: CreditCard },
    { label: 'Comms', href: '/communications', icon: Megaphone },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const navItems = isMember ? memberNavItems : adminNavItems;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-lg border-t border-border px-1 py-1.5 shadow-lg">
      <div className="flex items-center justify-between overflow-x-auto no-scrollbar gap-0.5 w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && item.href !== '/member' && item.href !== '#' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 min-w-[44px] py-1 px-0.5 rounded-lg text-[9px] font-medium transition-all text-center ${
                isActive
                  ? 'text-primary font-bold bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground active:bg-secondary/50'
              }`}
            >
              <Icon className={`w-4 h-4 mb-0.5 transition-transform ${isActive ? 'text-primary scale-110' : ''}`} />
              <span className="truncate w-full block text-center leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};


