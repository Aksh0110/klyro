'use client';

import React from 'react';
import { LogOut, Dumbbell, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export const TopHeader: React.FC = () => {
  const { user, activeOrgId, logout } = useAuth();

  const userRole = user?.roles.find((r) => r.organizationId === activeOrgId)?.role || 'MEMBER';

  return (
    <header className="sticky top-0 z-30 w-full bg-card/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
      {/* Mobile Brand / Desktop Header */}
      <div className="flex items-center gap-3">
        <div className="md:hidden w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white">
          <Dumbbell className="w-4 h-4" />
        </div>
        <div>
          <span className="text-xs font-medium text-muted-foreground">Tenant Context</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">
              {activeOrgId ? `Org ID: ${activeOrgId.slice(-6).toUpperCase()}` : 'Default Tenant'}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="w-3 h-3" />
              {userRole}
            </span>
          </div>
        </div>
      </div>

      {/* Logout button */}
      <button
        onClick={logout}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-all"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Logout</span>
      </button>
    </header>
  );
};
