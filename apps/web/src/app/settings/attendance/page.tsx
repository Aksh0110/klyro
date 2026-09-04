'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { IBranch } from '@klyro/types';
import {
  MapPin,
  Crosshair,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowLeft,
  Navigation,
  Info,
  Building2,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { GymLocationMap } from '@/components/GymLocationMap';

export default function AttendanceSettingsPage() {
  const { activeOrgId, activeBranchId } = useAuth();
  const [branches, setBranches] = useState<IBranch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [selfCheckInEnabled, setSelfCheckInEnabled] = useState(false);
  const [radiusMeters, setRadiusMeters] = useState<number>(100);
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');

  useEffect(() => {
    if (activeOrgId) {
      fetchBranches();
    }
  }, [activeOrgId, activeBranchId]);

  const fetchBranches = async () => {
    if (!activeOrgId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest<{ data: IBranch[] }>(
        'branches',
        { method: 'GET' },
        activeOrgId,
      );
      const branchList = (res as any).data || res;
      setBranches(branchList);
      if (branchList.length > 0) {
        const primary = branchList.find((b: IBranch) => b._id === activeBranchId) || branchList[0];
        setSelectedBranchId(primary._id);
        populateForm(primary);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load branch settings');
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (branch: IBranch) => {
    setSelfCheckInEnabled(branch.settings?.memberSelfCheckInEnabled ?? false);
    setRadiusMeters(branch.settings?.selfCheckInRadiusMeters ?? 100);
    setLatitude(branch.location?.latitude !== undefined ? String(branch.location.latitude) : '');
    setLongitude(branch.location?.longitude !== undefined ? String(branch.location.longitude) : '');
  };

  const handleBranchSelect = (branchId: string) => {
    setSelectedBranchId(branchId);
    const b = branches.find((item) => item._id === branchId);
    if (b) populateForm(b);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setGettingLocation(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGettingLocation(false);
        setSuccess('Gym location captured successfully.');
      },
      () => {
        setGettingLocation(false);
        setError('Location permission denied or unavailable. Please enable device location access.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId || !selectedBranchId) return;

    setError(null);
    setSuccess(null);

    const parsedLat = latitude !== '' ? parseFloat(latitude) : undefined;
    const parsedLng = longitude !== '' ? parseFloat(longitude) : undefined;

    if (selfCheckInEnabled && (parsedLat === undefined || isNaN(parsedLat) || parsedLng === undefined || isNaN(parsedLng))) {
      setError('Please set your gym location before enabling member self check-in.');
      return;
    }

    try {
      setSaving(true);
      const updated = await apiRequest<IBranch>(
        `branches/${selectedBranchId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            location: {
              latitude: parsedLat,
              longitude: parsedLng,
            },
            settings: {
              memberSelfCheckInEnabled: selfCheckInEnabled,
              selfCheckInRadiusMeters: Number(radiusMeters) || 100,
            },
          }),
        },
        activeOrgId,
      );

      setSuccess('GPS attendance settings saved successfully.');
      setBranches((prev) => prev.map((b) => (b._id === selectedBranchId ? updated : b)));
    } catch (err: any) {
      setError(err.message || 'Failed to update attendance settings.');
    } finally {
      setSaving(false);
    }
  };

  const selectedBranch = branches.find((b) => b._id === selectedBranchId);
  const hasLocation = Boolean(
    latitude &&
    longitude &&
    !isNaN(parseFloat(latitude)) &&
    !isNaN(parseFloat(longitude))
  );

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-4 pb-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Settings</span>
            </Link>
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground flex items-center gap-2">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              GPS Self Check-In
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Enable automated attendance verification when members arrive at your gym.
            </p>
          </div>

          {/* Branch Switcher for multi-branch gyms */}
          {branches.length > 1 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 border border-border rounded-xl self-start sm:self-auto">
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <select
                value={selectedBranchId}
                onChange={(e) => handleBranchSelect(e.target.value)}
                className="bg-transparent font-semibold text-xs text-foreground focus:outline-none cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b._id} value={b._id} className="bg-card text-foreground">
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-3.5 bg-destructive/15 border border-destructive/30 rounded-xl text-xs text-destructive flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">{success}</span>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2 bg-card border border-border rounded-2xl">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>Loading GPS settings...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Master Toggle */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    selfCheckInEnabled ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-sm sm:text-base">Member Self Check-In</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        selfCheckInEnabled
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {selfCheckInEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Allow members to check in automatically when they arrive at the gym.
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={selfCheckInEnabled}
                onClick={() => setSelfCheckInEnabled(!selfCheckInEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  selfCheckInEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                    selfCheckInEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 2. Dependent Options - Only shown when Self Check-In is Enabled */}
            {selfCheckInEnabled && (
              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span>Gym Physical Location</span>
                      </h3>
                      {hasLocation ? (
                        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Location Set
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                          Not Set Yet
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {hasLocation
                        ? 'Your gym coordinates are configured for member check-in.'
                        : 'Set your gym location so member devices can verify attendance.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={gettingLocation}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    {gettingLocation ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Detecting Location...</span>
                      </>
                    ) : (
                      <>
                        <Crosshair className="w-3.5 h-3.5" />
                        <span>{hasLocation ? 'Update Location with GPS' : 'Set Gym Location with GPS'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Map Preview or Simple Instruction */}
                {hasLocation ? (
                  <div className="pt-1">
                    <GymLocationMap
                      latitude={latitude}
                      longitude={longitude}
                      radiusMeters={Number(radiusMeters) || 100}
                      gymName={selectedBranch?.name || 'Gym Premises'}
                    />
                  </div>
                ) : (
                  <div className="p-3.5 bg-secondary/30 rounded-xl border border-border flex items-start gap-3">
                    <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Quick Setup:</strong> Open this page on your phone or laptop while at your gym and click <strong className="text-foreground">Set Gym Location with GPS</strong> above.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 3. Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href="/settings"
                className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="py-2.5 px-6 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 text-xs shadow-md disabled:opacity-50 active:scale-95"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{saving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
