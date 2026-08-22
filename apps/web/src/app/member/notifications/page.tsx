'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { INotification, INotificationPreference } from '@klyro/types';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  CreditCard,
  Clock,
  ShieldCheck,
  Check,
} from 'lucide-react';

export default function MemberNotificationsPage() {
  const { activeOrgId } = useAuth();
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [preference, setPreference] = useState<INotificationPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!activeOrgId) return;
    loadNotifications();
  }, [activeOrgId]);

  const loadNotifications = async () => {
    if (!activeOrgId) return;
    try {
      setLoading(true);
      const [notifData, prefData] = await Promise.all([
        apiRequest<INotification[]>('/notifications', {}, activeOrgId),
        apiRequest<INotificationPreference>('/notifications/preferences', {}, activeOrgId),
      ]);
      setNotifications(Array.isArray(notifData) ? notifData : []);
      setPreference(prefData);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    if (!activeOrgId) return;
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }, activeOrgId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, readAt: new Date().toISOString(), status: 'READ' } : n)),
      );
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleTogglePreference = async (key: 'membershipReminders' | 'paymentNotifications' | 'announcements') => {
    if (!activeOrgId || !preference) return;
    const updatedVal = !preference[key];
    setPreference((prev) => prev ? { ...prev, [key]: updatedVal } : null);

    try {
      await apiRequest(
        '/notifications/preferences',
        {
          method: 'POST',
          body: JSON.stringify({ [key]: updatedVal }),
        },
        activeOrgId,
      );
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleEnableBrowserPush = async () => {
    if (!('Notification' in window)) {
      setPushStatus('Browser push notifications are not supported on this device.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPushStatus('Browser Push Notifications Enabled!');
        if (activeOrgId) {
          await apiRequest(
            '/notifications/push-subscription',
            {
              method: 'POST',
              body: JSON.stringify({
                subscription: {
                  endpoint: `https://fcm.googleapis.com/fcm/send/demo-${Date.now()}`,
                  keys: {
                    p256dh: 'demo_p256dh_key',
                    auth: 'demo_auth_key',
                  },
                },
              }),
            },
            activeOrgId,
          );
        }
      } else {
        setPushStatus('Push notification permission was denied.');
      }
    } catch (err: any) {
      setPushStatus('Failed to enable push notifications.');
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'ANNOUNCEMENT':
        return <Megaphone className="w-4 h-4 text-primary" />;
      case 'MEMBERSHIP_EXPIRING':
      case 'MEMBERSHIP_EXPIRED':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'INVOICE_DUE':
      case 'INVOICE_OVERDUE':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'PAYMENT_RECEIVED':
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              Notifications Center
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Stay updated with gym announcements, membership alerts, and payment receipts.
            </p>
          </div>
        </div>

        {/* BROWSER PUSH PERMISSION CTA CARD */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Enable Browser Push Notifications
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Allow notifications to receive instant gym announcements and important membership updates on your device.
            </p>
            {pushStatus && <p className="text-xs font-semibold text-primary mt-2">{pushStatus}</p>}
          </div>
          <button
            onClick={handleEnableBrowserPush}
            className="py-2.5 px-4 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:bg-primary/90 transition-all shadow-md shrink-0"
          >
            Enable Push
          </button>
        </div>

        {/* NOTIFICATION PREFERENCES CARD */}
        {preference && (
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase text-muted-foreground border-b border-border pb-2">
              Notification Preferences
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <label className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border cursor-pointer">
                <span className="font-semibold text-foreground">Membership Alerts</span>
                <input
                  type="checkbox"
                  checked={preference.membershipReminders}
                  onChange={() => handleTogglePreference('membershipReminders')}
                  className="rounded border-border text-primary focus:ring-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border cursor-pointer">
                <span className="font-semibold text-foreground">Payment Receipts</span>
                <input
                  type="checkbox"
                  checked={preference.paymentNotifications}
                  onChange={() => handleTogglePreference('paymentNotifications')}
                  className="rounded border-border text-primary focus:ring-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border cursor-pointer">
                <span className="font-semibold text-foreground">Gym Announcements</span>
                <input
                  type="checkbox"
                  checked={preference.announcements}
                  onChange={() => handleTogglePreference('announcements')}
                  className="rounded border-border text-primary focus:ring-primary"
                />
              </label>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS FEED */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-foreground border-b border-border pb-3">
            Recent Notifications
          </h2>

          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No notifications yet. You will see announcements and reminders here.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div
                  key={n._id}
                  className={`py-4 flex items-start justify-between gap-4 transition-colors px-2 rounded-lg ${
                    !n.readAt ? 'bg-primary/5 font-semibold' : 'hover:bg-secondary/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
                      {getIconForType(n.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground">{n.title}</h4>
                        {!n.readAt && (
                          <span className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{n.body}</p>
                      <span className="text-[10px] text-muted-foreground mt-2 block font-mono">
                        {new Date(n.createdAt).toLocaleDateString()} · {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {!n.readAt && (
                    <button
                      onClick={() => handleMarkAsRead(n._id)}
                      className="p-1.5 text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 shrink-0"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                      <span className="hidden sm:inline text-[10px]">Read</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
