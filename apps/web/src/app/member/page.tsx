'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { IAttendance, IBranch, IOrganization } from '@klyro/types';
import {
  MapPin,
  CheckCircle,
  AlertCircle,
  Award,
  CalendarCheck,
  Bell,
  User,
  ShieldCheck,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { GymLocationMap } from '@/components/GymLocationMap';

export default function MemberPortalPage() {
  const { activeOrgId, user } = useAuth();
  const [org, setOrg] = useState<IOrganization | null>(null);
  const [branches, setBranches] = useState<IBranch[]>([]);
  const [attendances, setAttendances] = useState<IAttendance[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Self Check-In UI States
  const [checkInState, setCheckInState] = useState<'IDLE' | 'LOCATING' | 'SUCCESS' | 'ALREADY' | 'ERROR'>('IDLE');
  const [checkInMessage, setCheckInMessage] = useState<string>('');
  const [checkInTime, setCheckInTime] = useState<string>('');

  useEffect(() => {
    if (!activeOrgId) return;

    const loadMemberData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [orgData, branchData, attData, annData] = await Promise.all([
          apiRequest<IOrganization>('/organizations/current', {}, activeOrgId || undefined).catch(() => null),
          apiRequest<IBranch[]>('/branches', {}, activeOrgId || undefined).catch(() => []),
          apiRequest<IAttendance[]>('/attendance/my', {}, activeOrgId || undefined).catch(() => []),
          apiRequest<any[]>('/announcements', {}, activeOrgId || undefined).catch(() => []),
        ]);

        if (orgData) setOrg(orgData);
        if (Array.isArray(branchData)) setBranches(branchData);
        if (Array.isArray(attData)) {
          setAttendances(attData);
          const todayStr = new Date().toISOString().slice(0, 10);
          const todayCheckIn = attData.find((a: any) => {
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
        }
        if (Array.isArray(annData)) setAnnouncements(annData);

        if (user?.phone) {
          try {
            const custRes = await apiRequest<{ data: any[] }>(`/customers?search=${encodeURIComponent(user.phone)}`, {}, activeOrgId || undefined);
            const foundCust = (custRes as any)?.data?.[0] || (Array.isArray(custRes) ? custRes[0] : null);
            if (foundCust) {
              setCustomer(foundCust);
              try {
                const memRes = await apiRequest<any[]>(`/memberships/customer/${foundCust._id}`, {}, activeOrgId || undefined);
                if (Array.isArray(memRes) && memRes.length > 0) {
                  const activeMem = memRes.find((m) => m.status === 'ACTIVE') || memRes[0];
                  setMembership(activeMem);
                }
              } catch {
                // Ignore membership fetch failure
              }
            }
          } catch {
            // Ignore customer fetch failure
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load member profile data');
      } finally {
        setIsLoading(false);
      }
    };

    loadMemberData();
  }, [activeOrgId, user?.phone]);

  const handleSelfCheckIn = () => {
    if (!navigator.geolocation) {
      setCheckInState('ERROR');
      setCheckInMessage('Location permission is required for self check-in.');
      return;
    }

    setCheckInState('LOCATING');
    setCheckInMessage('Checking your GPS location...');

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

          const updatedAtt = await apiRequest<IAttendance[]>('/attendance/my', {}, activeOrgId || undefined);
          if (Array.isArray(updatedAtt)) setAttendances(updatedAtt);
        } catch (err: any) {
          setCheckInState('ERROR');
          setCheckInMessage(err.message || "You're outside the gym's check-in area. Move closer to the gym and try again.");
        }
      },
      (err) => {
        setCheckInState('ERROR');
        setCheckInMessage('Location permission is required for self check-in. Please enable GPS and allow location access.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const primaryBranch = branches.length > 0 ? branches[0] : null;
  const isCheckInDisabled = primaryBranch?.settings && primaryBranch.settings.memberSelfCheckInEnabled === false;

  const thisMonthVisits = attendances.filter((att) => {
    const d = new Date(att.checkInAt || (att as any).createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const latestAnnouncement = announcements.find((a) => a.status === 'PUBLISHED') || announcements[0];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Welcome Member Banner */}
        <div className="bg-gradient-to-r from-primary/10 via-card to-card border border-primary/20 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  Member Portal
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs font-semibold text-muted-foreground">{org?.name || 'Klyro Gym'}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Welcome back, {customer?.firstName || user?.name || 'Member'}! 👋
              </h1>
              <p className="text-sm text-muted-foreground">
                Check into the gym, view your active membership, and track your attendance.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="px-4 py-2 bg-secondary/80 rounded-2xl border border-border text-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Visits this month</span>
                <span className="text-xl font-black text-primary">{thisMonthVisits}</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-destructive/15 border border-destructive/30 rounded-xl text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* MEMBER GPS SELF CHECK-IN CARD */}
        <div className="bg-card rounded-3xl border border-border shadow-md p-6 sm:p-8 relative overflow-hidden space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold shadow-inner">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-foreground">GPS Self Check-In</h2>
                <p className="text-xs text-muted-foreground">
                  Tap below when you are inside or near the gym premises
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
              Live Location
            </span>
          </div>

          {isCheckInDisabled ? (
            <div className="p-5 bg-secondary/40 border border-border rounded-2xl text-center space-y-1">
              <p className="text-foreground text-sm font-semibold">Self check-in is currently disabled by gym administration.</p>
              <p className="text-xs text-muted-foreground">Please check in at the reception desk upon arrival.</p>
            </div>
          ) : checkInState === 'SUCCESS' || checkInState === 'ALREADY' ? (
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-2">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
              <h3 className="text-xl font-black text-emerald-400">{checkInMessage}</h3>
              {checkInTime && (
                <p className="text-sm font-semibold text-muted-foreground">
                  Recorded at <span className="text-foreground font-mono">{checkInTime}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {checkInState === 'ERROR' && (
                <div className="p-4 bg-destructive/15 border border-destructive/30 rounded-2xl text-xs text-destructive font-medium flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{checkInMessage}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSelfCheckIn}
                disabled={checkInState === 'LOCATING'}
                className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white font-black text-xl rounded-2xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {checkInState === 'LOCATING' ? (
                  <>
                    <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Locating & Verifying GPS...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-6 h-6 animate-pulse" />
                    <span>TAP TO CHECK IN</span>
                  </>
                )}
              </button>

              {checkInState === 'ERROR' && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleSelfCheckIn}
                    className="text-xs text-emerald-400 hover:underline font-semibold"
                  >
                    Try Locating Again
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Gym Map Location Preview with Gym Icon Pointer */}
          {primaryBranch?.location?.latitude !== undefined && primaryBranch?.location?.longitude !== undefined && (
            <div className="pt-2">
              <GymLocationMap
                latitude={primaryBranch.location.latitude}
                longitude={primaryBranch.location.longitude}
                radiusMeters={primaryBranch.settings?.selfCheckInRadiusMeters || 100}
                gymName={primaryBranch.name || 'Gym Premises'}
              />
            </div>
          )}
        </div>

        {/* 2-COLUMN GRID: MEMBERSHIP INFO & QUICK STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Membership Card */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-extrabold text-foreground text-base flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-400" />
                <span>My Membership</span>
              </h3>
              <span
                className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                  membership?.status === 'ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {membership?.status || 'Active Member'}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold">Plan Name</span>
                <p className="text-foreground font-bold text-lg">{membership?.planId?.name || 'Standard Gym Access'}</p>
              </div>

              {membership?.endDate && (
                <div className="flex items-center justify-between p-3 bg-secondary/40 rounded-xl">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Valid Until</span>
                    <span className="font-semibold text-foreground text-xs">
                      {new Date(membership.endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </div>
              )}

              <div className="pt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>Access to gym floor, locker room, & standard facilities</span>
                </div>
              </div>
            </div>
          </div>

          {/* Member Profile Details */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-extrabold text-foreground text-base flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <span>Member Profile</span>
              </h3>
              {customer?.customerCode && (
                <span className="text-xs font-mono font-bold text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-lg border border-border">
                  {customer.customerCode}
                </span>
              )}
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-xs text-muted-foreground">Full Name</span>
                <span className="font-semibold text-foreground">
                  {customer ? `${customer.firstName} ${customer.lastName || ''}` : user?.name || 'Registered Member'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-xs text-muted-foreground">Registered Phone</span>
                <span className="font-semibold text-foreground font-mono">{user?.phone || customer?.phone || 'N/A'}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-muted-foreground">Home Branch</span>
                <span className="font-semibold text-foreground">{primaryBranch?.name || 'Main Branch'}</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/member/attendance"
                className="w-full py-2.5 px-4 bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs rounded-xl border border-border transition-all flex items-center justify-center gap-2"
              >
                <CalendarCheck className="w-4 h-4 text-primary" />
                <span>View Full Attendance History</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* LATEST GYM ANNOUNCEMENT */}
        {latestAnnouncement && (
          <div className="bg-card border border-primary/20 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                <Bell className="w-4 h-4" />
                <span>Gym Announcement</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                {new Date(latestAnnouncement.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h3 className="font-extrabold text-foreground text-base">{latestAnnouncement.title}</h3>
            <p className="text-sm text-muted-foreground">{latestAnnouncement.body}</p>
            <Link
              href="/member/notifications"
              className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1 pt-1"
            >
              <span>View all notifications</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
