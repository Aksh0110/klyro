'use client';

import React, { useState } from 'react';
import { Building2, ArrowRight, Dumbbell, Scissors, Music, GraduationCap } from 'lucide-react';
import { VerticalType, VERTICALS } from '@klyro/config';
import { useAuth } from '@/lib/auth-context';

export default function SetupPage() {
  const [name, setName] = useState('');
  const [vertical, setVertical] = useState<VerticalType>(VERTICALS.GYM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createOrganization } = useAuth();

  const verticalsList = [
    { id: VERTICALS.GYM, label: 'Klyro Gym', desc: 'Fitness clubs & training centers', icon: Dumbbell },
    { id: VERTICALS.SALON, label: 'Klyro Salon', desc: 'Beauty salons & spa services', icon: Scissors },
    { id: VERTICALS.STUDIO, label: 'Klyro Studio', desc: 'Dance, yoga & wellness studios', icon: Music },
    { id: VERTICALS.ACADEMY, label: 'Klyro Academy', desc: 'Martial arts & sports academies', icon: GraduationCap },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setIsSubmitting(true);

    try {
      await createOrganization(name, vertical);
    } catch (err: any) {
      setError(err.message || 'Failed to create organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-xl bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-indigo-950/20">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 mb-4">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Create Your Business Workspace</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Set up your organization tenant context to start managing operations
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-2">
              Business / Organization Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Metro Power Gym"
              required
              className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-3">
              Select Vertical
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {verticalsList.map((v) => {
                const Icon = v.icon;
                const isSelected = vertical === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVertical(v.id as VerticalType)}
                    className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                        : 'border-border bg-secondary/30 hover:bg-secondary/60'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mt-0.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{v.label}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{v.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-destructive/15 border border-destructive/30 rounded-xl text-xs text-destructive flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="w-full py-3.5 px-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Creating Organization...' : 'Complete Onboarding'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
