'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { IBranch } from '@klyro/types';
import { MapPin, Crosshair, CheckCircle2, AlertCircle, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { GymLocationMap } from '@/components/GymLocationMap';

export default function AttendanceSettingsPage() {
  const { activeOrgId } = useAuth();
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
  }, [activeOrgId]);

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
        const primary = branchList[0];
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
        setSuccess('Fetched current GPS location coordinates.');
      },
      () => {
        setGettingLocation(false);
        setError('Location permission denied or unavailable. Please enter coordinates manually.');
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
      setError('Set your gym location before enabling member self check-in.');
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

      setSuccess('Attendance & GPS settings updated successfully.');
      setBranches((prev) => prev.map((b) => (b._id === selectedBranchId ? updated : b)));
    } catch (err: any) {
      setError(err.message || 'Failed to update attendance settings.');
    } finally {
      setSaving(false);
    }
  };

  const selectedBranch = branches.find((b) => b._id === selectedBranchId);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Settings</span>
            </Link>
            <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
              <MapPin className="w-6 h-6 text-primary" />
              Member GPS Self Check-In Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure branch physical coordinates, maximum check-in radius, and GPS self check-in toggle.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-destructive/15 border border-destructive/30 rounded-xl text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading attendance settings...</div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
            {branches.length > 1 && (
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Select Branch</label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => handleBranchSelect(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Toggle Section */}
            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border">
              <div>
                <span className="font-bold text-foreground text-base block">Member Self Check-In</span>
                <span className="text-xs text-muted-foreground">Allow gym members to self check-in using device GPS through the Klyro PWA shell.</span>
              </div>
              <button
                type="button"
                onClick={() => setSelfCheckInEnabled(!selfCheckInEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  selfCheckInEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-primary-foreground shadow ring-0 transition duration-200 ease-in-out ${
                    selfCheckInEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Radius Section */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-muted-foreground">Check-In Radius (Meters)</label>
              <p className="text-xs text-muted-foreground">Maximum allowed distance between member device location and gym coordinates.</p>
              <div className="flex items-center gap-3 max-w-xs">
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm font-semibold text-muted-foreground">meters</span>
              </div>
            </div>

            {/* Location Section - Simple & Non-Technical */}
            <div className="border-t border-border pt-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">Gym Location</h3>
                    {latitude && longitude ? (
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
                    Click the button below while at your gym to automatically set its location for member check-in.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={gettingLocation}
                  className="py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shrink-0 active:scale-[0.98]"
                >
                  <Crosshair className="w-4 h-4" />
                  <span>{gettingLocation ? 'Getting Location...' : latitude ? 'Update Location with GPS' : 'Set Gym Location with GPS'}</span>
                </button>
              </div>

              {/* Google Maps Preview with Gym Icon Pointer */}
              <div className="pt-2">
                <GymLocationMap
                  latitude={latitude}
                  longitude={longitude}
                  radiusMeters={Number(radiusMeters) || 100}
                  gymName={selectedBranch?.name || 'Gym Premises'}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="py-2.5 px-6 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 text-sm shadow-md disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving Settings...' : 'Save Check-In Settings'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
