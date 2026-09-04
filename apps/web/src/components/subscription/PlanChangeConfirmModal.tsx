'use client';

import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  X,
  Loader2,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export interface PlanDetail {
  _id?: string;
  name: string;
  monthlyPrice: number;
  memberLimit?: number;
  code?: string;
  description?: string;
  status?: string;
}

interface PlanChangeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentPlan: PlanDetail | null;
  targetPlan: PlanDetail | null;
  loading?: boolean;
}

export function PlanChangeConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  currentPlan,
  targetPlan,
  loading = false,
}: PlanChangeConfirmModalProps) {
  if (!isOpen || !targetPlan) return null;

  const currentPlanName = currentPlan?.name || 'Current Plan';
  const targetPlanName = targetPlan?.name || 'New Plan';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-card border border-border rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 border-b border-border bg-gradient-to-r from-purple-950/40 via-secondary/40 to-card shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/15 border border-primary/25 text-primary shrink-0">
              <RefreshCw className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-foreground leading-tight">
                Confirm Plan Renew / Upgrade
              </h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Immediate activation with safe fallback
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Compact Body */}
        <div className="p-3.5 sm:p-5 space-y-3 overflow-y-auto">
          {/* Important Discontinuation & Activation Notice */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-amber-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>Plan Discontinuation & Immediate Benefits</span>
            </div>
            <ul className="text-[11px] sm:text-xs space-y-1 pl-5 list-disc text-amber-200/90 leading-snug">
              <li>
                <strong>Current Plan:</strong> Your existing <strong>{currentPlanName}</strong> plan will be discontinued upon successful payment.
              </li>
              <li>
                <strong>Immediate Benefits:</strong> <strong>{targetPlanName}</strong> features, higher capacity ({targetPlan.memberLimit || 500} members), and 30-day billing start <strong>immediately today</strong>.
              </li>
            </ul>
          </div>

          {/* Safe Fallback Guarantee */}
          <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2.5 text-[11px] sm:text-xs text-emerald-200/90">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Safe Fallback:</strong> If payment is closed or fails, you remain on <strong>{currentPlanName}</strong> with zero downtime.
            </span>
          </div>

          {/* Side-by-Side Comparison */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            {/* Current Plan */}
            <div className="p-2.5 sm:p-3 rounded-xl border border-border bg-secondary/30 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Current Plan
                </span>
                <h4 className="font-extrabold text-xs sm:text-sm text-foreground truncate">{currentPlanName}</h4>
                <div className="text-[11px] font-mono text-muted-foreground">
                  ₹{currentPlan?.monthlyPrice || 0}/mo
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-border/50 text-[10px] text-rose-400 font-medium">
                ● Discontinued
              </div>
            </div>

            {/* Target Plan */}
            <div className="p-2.5 sm:p-3 rounded-xl border border-primary/40 bg-primary/10 flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-[9px] font-bold text-primary uppercase tracking-wider block">
                  New Plan
                </span>
                <h4 className="font-extrabold text-xs sm:text-sm text-foreground flex items-center gap-1 truncate">
                  <span>{targetPlanName}</span>
                  <Sparkles className="w-3 h-3 text-primary shrink-0" />
                </h4>
                <div className="text-[11px] font-mono font-bold text-primary">
                  ₹{targetPlan.monthlyPrice}/mo
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-primary/20 text-[10px] text-emerald-400 font-bold">
                ● Active Today
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions - Always Visible at Bottom */}
        <div className="px-3.5 py-2.5 sm:px-5 sm:py-3 border-t border-border bg-secondary/30 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all text-center cursor-pointer"
          >
            Cancel & Keep {currentPlanName}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Preparing...</span>
              </>
            ) : (
              <>
                <span>Pay ₹{targetPlan.monthlyPrice}</span>
                <ArrowRight className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
