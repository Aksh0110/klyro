'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { IAttendance } from '@klyro/types';
import {
  CalendarCheck,
  MapPin,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';

export default function MemberAttendancePage() {
  const { activeOrgId } = useAuth();
  const [attendances, setAttendances] = useState<IAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Check-in state
  const [checkInState, setCheckInState] = useState<'IDLE' | 'LOCATING' | 'SUCCESS' | 'ALREADY' | 'ERROR'>('IDLE');
  const [checkInMessage, setCheckInMessage] = useState<string>('');
  const [checkInTime, setCheckInTime] = useState<string>('');

  useEffect(() => {
    if (activeOrgId) {
      fetchMyAttendance();
    }
  }, [activeOrgId]);

  const fetchMyAttendance = async () => {
    if (!activeOrgId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest<IAttendance[]>(
        'attendance/my',
        { method: 'GET' },
        activeOrgId || undefined,
      );
      const attList = Array.isArray(res) ? res : [];
      setAttendances(attList);

      const todayStr = new Date().toISOString().slice(0, 10);
      const todayCheckIn = attList.find((a: any) => {
        const aDate = new Date(a.checkInAt || a.createdAt).toISOString().slice(0, 10);
        return aDate === todayStr;
      });

      if (todayCheckIn) {
        setCheckInState('ALREADY');
        setCheckInMessage("✓ You're already checked in today");
        setCheckInTime(
          new Date(todayCheckIn.checkInAt || todayCheckIn.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        );
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  const handleSelfCheckIn = () => {
    if (!navigator.geolocation) {
      setCheckInState('ERROR');
      setCheckInMessage('Location permission is required for self check-in.');
      return;
    }

    setCheckInState('LOCATING');
    setCheckInMessage('Checking your location...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await apiRequest<any>(
            '/attendance/self-check-in',
            {
              method: 'POST',
              body: JSON.stringify({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracyMeters: Math.round(pos.coords.accuracy || 15),
              }),
            },
            activeOrgId || undefined,
          );

          const timeFormatted = new Date(res.attendance?.checkInAt || Date.now()).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          if (res.status === 'ALREADY_CHECKED_IN') {
            setCheckInState('ALREADY');
            setCheckInMessage("✓ You're already checked in today");
            setCheckInTime(timeFormatted);
          } else {
            setCheckInState('SUCCESS');
            setCheckInMessage('✓ Check-In Successful!');
            setCheckInTime(timeFormatted);
          }

          fetchMyAttendance();
        } catch (err: any) {
          setCheckInState('ERROR');
          setCheckInMessage(err.message || "You're outside the gym's check-in area. Move closer to the gym and try again.");
        }
      },
      () => {
        setCheckInState('ERROR');
        setCheckInMessage('Location permission is required for self check-in. Please allow location access.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const formatCheckInTime = (dateStr: string | Date) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatCheckInDate = (dateStr: string | Date) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const currentMonthStr = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/member"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Member Portal</span>
            </Link>
            <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
              <CalendarCheck className="w-6 h-6 text-primary" />
              My Attendance History
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{currentMonthStr}</p>
          </div>

          <div className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold">
            {attendances.length} total check-ins
          </div>
        </div>

        {/* GPS Quick Check-in CTA Card */}
        {checkInState !== 'ALREADY' && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">At the gym right now?</h3>
                <p className="text-xs text-muted-foreground">Tap below to check in with device GPS.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSelfCheckIn}
              disabled={checkInState === 'LOCATING'}
              className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
            >
              {checkInState === 'LOCATING' ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Locating...</span>
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4" />
                  <span>Check In Now</span>
                </>
              )}
            </button>
          </div>
        )}

        {checkInState === 'ALREADY' && checkInTime && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-xs text-emerald-400 font-semibold">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>You're already checked in today ({checkInTime}). Enjoy your workout!</span>
          </div>
        )}

        {checkInState === 'ERROR' && (
          <div className="p-4 bg-destructive/15 border border-destructive/30 text-destructive text-xs rounded-2xl flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{checkInMessage}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-destructive/15 border border-destructive/30 text-destructive text-xs rounded-2xl flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Attendance Records List */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Visit Log
            </h2>
            <span className="text-xs text-muted-foreground">Most recent visits</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading attendance records...</div>
          ) : attendances.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-secondary mx-auto flex items-center justify-center text-xl">
                📌
              </div>
              <h3 className="text-sm font-bold text-foreground">No Check-ins Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Your check-in history will automatically show up here as soon as you check in at the gym using device GPS.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {attendances.map((att) => (
                <div key={att._id} className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm shrink-0">
                      ✓
                    </div>
                    <div>
                      <span className="font-bold text-foreground text-sm block">
                        {formatCheckInDate(att.checkInAt || att.createdAt)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        GPS Self Check-in · {formatCheckInTime(att.checkInAt || att.createdAt)}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Checked in
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

