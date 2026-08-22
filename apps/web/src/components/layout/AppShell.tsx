'use client';

import React from 'react';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { BottomNav } from './BottomNav';
import { useAuth } from '@/lib/auth-context';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading, isSubscriptionValid, user } = useAuth();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 animate-pulse flex items-center justify-center text-white mb-4">
          <span className="font-bold text-xl">K</span>
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Initializing Klyro Session...</p>
      </div>
    );
  }

  // Hard subscription gate: If user is logged in but subscription is invalid, block rendering children!
  if (user && user.organizationIds.length > 0 && !isSubscriptionValid) {
    if (pathname !== '/setup/subscription' && pathname !== '/setup' && pathname !== '/login') {
      if (typeof window !== 'undefined') {
        window.location.replace('/setup/subscription');
      }
      return (
        <div className="min-h-screen bg-[#051424] flex flex-col items-center justify-center p-4 text-[#d4e4fa]">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8b5cf6] to-[#d0bcff] flex items-center justify-center text-white mb-4 animate-bounce">
            <span className="font-bold text-xl text-[#051424]">K</span>
          </div>
          <p className="text-sm font-bold text-[#d0bcff]">Subscription payment required</p>
          <p className="text-xs text-[#958ea0] mt-1">Redirecting to payment setup...</p>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-background flex text-foreground">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <TopHeader />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
};



