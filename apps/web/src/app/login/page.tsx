'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, ArrowRight, PhoneCall, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

import { validatePhoneNumber, sanitizePhoneNumber } from '@/lib/phone-validation';

export default function LoginPage() {
  const [phone, setPhone] = useState('+919876543210');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sendOtp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validatePhoneNumber(phone);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid phone number format');
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedPhone = sanitizePhoneNumber(phone);
      await sendOtp(formattedPhone);
      router.push(`/verify-otp?phone=${encodeURIComponent(formattedPhone)}`);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-indigo-950/20">
        {/* Brand Badge */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 mb-4">
            <Dumbbell className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Welcome to Klyro</h1>
          <p className="text-sm text-muted-foreground mt-1">Multi-vertical SaaS management platform</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-2">
              Phone Number
            </label>
            <div className="relative">
              <PhoneCall className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                required
                className="w-full pl-10 pr-4 py-3 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-destructive/15 border border-destructive/30 rounded-xl text-xs text-destructive flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Sending Code...' : 'Continue with Phone'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Dev OTP info box */}
        <div className="mt-8 pt-6 border-t border-border flex items-start gap-3 bg-secondary/30 p-3.5 rounded-xl border border-border/50">
          <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-foreground">Development OTP Mode</p>
            <p className="text-muted-foreground mt-0.5">Use default dev OTP code <code className="bg-secondary px-1.5 py-0.5 rounded text-indigo-300 font-mono">123456</code> to log in.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
