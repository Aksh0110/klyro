'use client';

import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  X,
  Loader2,
  Zap,
  Users,
  RefreshCw,
  Clock,
  Sparkles,
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
  const isPriceHigher = (targetPlan.monthlyPrice || 0) > (currentPlan?.monthlyPrice || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-purple-950/30 via-secondary/40 to-card">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <RefreshCw className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <span>Confirm Subscription Plan Change</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  Immediate Switch
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Review plan discontinuation and immediate activation details
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Important Discontinuation & Immediate Benefits Notice */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2">
            <div className="flex items-center gap-2.5 font-bold text-sm text-amber-300">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400" />
              <span>Important: Plan Discontinuation & Activation Notice</span>
            </div>
            <ul className="text-xs space-y-1.5 pl-7 list-disc text-amber-200/90 leading-relaxed">
              <li>
                <strong>Current Plan Discontinuation:</strong> Your existing <strong>{currentPlanName}</strong> will be discontinued immediately upon successful payment.
              </li>
              <li>
                <strong>Immediate Benefits:</strong> All features, higher capacity limits, and benefits of <strong>{targetPlanName}</strong> will become active <strong>immediately</strong> today.
              </li>
              <li>
                <strong>Billing Cycle Reset:</strong> A new 30-day billing cycle for <strong>₹{targetPlan.monthlyPrice}</strong> starts today.
              </li>
            </ul>
          </div>

          {/* Safe Fallback Guarantee */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-xs text-emerald-200/90">
              <span className="font-extrabold text-emerald-300 block">Automatic Safe Fallback Guarantee</span>
              If the transaction is cancelled, window closed, or payment fails for any reason, you will automatically remain on your <strong>{currentPlanName}</strong> with zero downtime.
            </div>
          </div>

          {/* Side-by-Side Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Current Plan Card */}
            <div className="p-4 rounded-2xl border border-border bg-secondary/30 relative">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Current Plan
              </span>
              <div className="flex items-baseline justify-between mb-2">
                <h4 className="font-extrabold text-sm text-foreground">{currentPlanName}</h4>
                <span className="text-xs font-mono font-semibold text-muted-foreground">
                  ₹{currentPlan?.monthlyPrice || 0}/mo
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border/60 pt-2.5">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>Up to {currentPlan?.memberLimit || 'standard'} members</span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-400/90 font-medium">
                  <span>● Discontinued upon payment</span>
                </div>
              </div>
            </div>

            {/* Target Plan Card */}
            <div className="p-4 rounded-2xl border border-primary/40 bg-primary/5 relative shadow-inner">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-1">
                {isPriceHigher ? 'New Upgraded Plan' : 'New Selected Plan'}
              </span>
              <div className="flex items-baseline justify-between mb-2">
                <h4 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                  <span>{targetPlanName}</span>
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </h4>
                <span className="text-xs font-mono font-extrabold text-primary">
                  ₹{targetPlan.monthlyPrice}/mo
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground border-t border-primary/20 pt-2.5">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Up to {targetPlan.memberLimit || 500} members</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <Zap className="w-3 h-3 shrink-0" />
                  <span>Starts immediately today</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 px-6 py-4 border-t border-border bg-secondary/20">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            Cancel & Keep {currentPlanName}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Preparing Payment...</span>
              </>
            ) : (
              <>
                <span>Agree & Proceed to Pay ₹{targetPlan.monthlyPrice}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
