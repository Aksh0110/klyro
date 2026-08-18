'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Award, CreditCard, Settings, CalendarCheck, Bell, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { user, activeOrgId } = useAuth();

  const userRole = user?.roles?.find((r) => r.organizationId === activeOrgId)?.role || 'MEMBER';
  const isMember = userRole === 'MEMBER';

  const memberNavItems = [
    { label: 'Portal', href: '/member', icon: User },
    { label: 'Attendance', href: '/member/attendance', icon: CalendarCheck },
    { label: 'Alerts', href: '/member/notifications', icon: Bell },
  ];

  const adminNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Customers', href: '/customers', icon: Users },
    { label: 'Plans', href: '/memberships', icon: Award },
    { label: 'Payments', href: '/payments', icon: CreditCard },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const navItems = isMember ? memberNavItems : adminNavItems;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-lg border-t border-border px-2 py-2 flex items-center justify-around">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== '/dashboard' && item.href !== '/member' && item.href !== '#' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-all ${
              isActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-primary scale-110' : ''}`} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

