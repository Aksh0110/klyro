'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

function VerifyOtpForm() {
  const searchParams = useSearchParams();
  const phoneParam = searchParams.get('phone') || '+919876543210';

  const [otp, setOtp] = useState('123456');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyOtp } = useAuth();
  const router = useRouter();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await verifyOtp(phoneParam, otp);
    } catch (err: any) {
      setError(err.message || 'OTP Verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-indigo-950/20">
      <button
        onClick={() => router.push('/login')}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-all"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Change phone number</span>
      </button>

      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 mb-4">
          <KeyRound className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Enter Verification Code</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sent to <span className="font-mono text-foreground font-medium">{phoneParam}</span>
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase text-muted-foreground mb-2 text-center">
            6-Digit OTP
          </label>
          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="123456"
            required
            className="w-full tracking-[0.5em] text-center text-2xl py-3.5 bg-secondary/50 border border-border rounded-xl text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          />
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
          <span>{isSubmitting ? 'Verifying...' : 'Verify Code'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <Suspense fallback={<div className="text-muted-foreground text-sm">Loading verification...</div>}>
        <VerifyOtpForm />
      </Suspense>
    </div>
  );
}
