'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import {
  IAnnouncement,
  RetentionAttentionSummary,
  IBranch,
} from '@klyro/types';
import {
  Megaphone,
  Plus,
  Send,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Building2,
  RefreshCw,
  Zap,
} from 'lucide-react';

export default function CommunicationsPage() {
  const { activeOrgId } = useAuth();
  const [announcements, setAnnouncements] = useState<IAnnouncement[]>([]);
  const [retentionSummary, setRetentionSummary] = useState<RetentionAttentionSummary | null>(null);
  const [branches, setBranches] = useState<IBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Announcement Form State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audienceType, setAudienceType] = useState<'ALL_MEMBERS' | 'BRANCH_MEMBERS'>('ALL_MEMBERS');
  const [branchId, setBranchId] = useState('');
  const [publishOption, setPublishOption] = useState<'NOW' | 'SCHEDULED'>('NOW');
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeOrgId) return;
    loadData();
  }, [activeOrgId]);

  const loadData = async () => {
    if (!activeOrgId) return;
    try {
      setLoading(true);
      const [annData, summaryData, branchData] = await Promise.all([
        apiRequest<IAnnouncement[]>('/announcements', {}, activeOrgId),
        apiRequest<RetentionAttentionSummary>('/communications/retention-summary', {}, activeOrgId),
        apiRequest<IBranch[]>('/branches', {}, activeOrgId),
      ]);
      setAnnouncements(Array.isArray(annData) ? annData : []);
      setRetentionSummary(summaryData);
      setBranches(Array.isArray(branchData) ? branchData : []);
      if (branchData.length > 0) setBranchId(branchData[0]._id);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId || !title.trim() || !body.trim()) return;

    setFormError(null);
    setSubmitting(true);

    try {
      const created = await apiRequest<IAnnouncement>(
        '/announcements',
        {
          method: 'POST',
          body: JSON.stringify({
            title,
            body,
            audienceType,
            branchId: audienceType === 'BRANCH_MEMBERS' ? branchId : undefined,
            scheduledAt: publishOption === 'SCHEDULED' && scheduledAt ? scheduledAt : undefined,
          }),
        },
        activeOrgId,
      );

      // If publish now was chosen, call publish endpoint immediately
      if (publishOption === 'NOW' && created._id) {
        await apiRequest(`/announcements/${created._id}/publish`, { method: 'POST' }, activeOrgId);
      }

      setActionMessage(
        publishOption === 'NOW'
          ? 'Announcement published successfully to members!'
          : 'Announcement scheduled successfully.',
      );
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishNow = async (id: string) => {
    if (!activeOrgId) return;
    try {
      await apiRequest(`/announcements/${id}/publish`, { method: 'POST' }, activeOrgId);
      setActionMessage('Announcement published successfully!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to publish announcement');
    }
  };

  const handleCancelAnnouncement = async (id: string) => {
    if (!activeOrgId) return;
    try {
      await apiRequest(`/announcements/${id}/cancel`, { method: 'POST' }, activeOrgId);
      setActionMessage('Announcement cancelled.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel announcement');
    }
  };

  const handleRunTriggers = async () => {
    if (!activeOrgId) return;
    try {
      setLoading(true);
      await apiRequest('/communications/run-triggers', { method: 'POST' }, activeOrgId);
      setActionMessage('Automated retention reminders and triggers processed!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to run automated triggers');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setBody('');
    setAudienceType('ALL_MEMBERS');
    setPublishOption('NOW');
    setScheduledAt('');
    setFormError(null);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-primary" />
              Communication Center & Retention Engine
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Broadcast announcements, surface members requiring attention, and track automated reminders.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRunTriggers}
              className="py-2.5 px-4 bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold rounded-xl border border-border text-xs flex items-center gap-2 transition-all shadow-sm"
              title="Run Automated Triggers Now"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Run Automated Triggers</span>
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="py-2.5 px-5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 text-xs shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Create Announcement</span>
            </button>
          </div>
        </div>

        {actionMessage && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* RETENTION ATTENTION SUMMARY CARDS */}
        {retentionSummary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-muted-foreground">Expiring Memberships</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-extrabold text-foreground">{retentionSummary.expiringCount}</p>
              <p className="text-xs text-amber-500 font-medium">₹{retentionSummary.expiringAmountAtRisk.toLocaleString()} revenue at risk</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-muted-foreground">Overdue Invoices</span>
                <AlertTriangle className="w-4 h-4 text-destructive" />
              </div>
              <p className="text-2xl font-extrabold text-foreground">{retentionSummary.overdueCount}</p>
              <p className="text-xs text-destructive font-medium">₹{retentionSummary.overdueAmountTotal.toLocaleString()} outstanding</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-muted-foreground">Inactive Members (7d+)</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-2xl font-extrabold text-foreground">{retentionSummary.inactiveCount}</p>
              <p className="text-xs text-muted-foreground">Without gym check-in</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-muted-foreground">Scheduled Broadcasts</span>
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-extrabold text-foreground">{retentionSummary.scheduledAnnouncementsCount}</p>
              <p className="text-xs text-muted-foreground">Queued announcements</p>
            </div>
          </div>
        )}

        {/* HIGH ATTENTION MEMBERS LIST */}
        {retentionSummary && retentionSummary.attentionItems.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Retention Priority — Members Requiring Attention
            </h2>
            <div className="divide-y divide-border overflow-x-auto">
              {retentionSummary.attentionItems.map((item) => (
                <div key={item.customerId} className="py-3.5 flex items-center justify-between gap-4 hover:bg-secondary/20 transition-colors px-2 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-500 font-bold flex items-center justify-center text-sm">
                      {item.customerName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-sm">{item.customerName}</h4>
                      <p className="text-xs text-muted-foreground">{item.phone || 'No Phone'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    {item.daysInactive !== undefined && (
                      <span className="px-2.5 py-1 rounded-full bg-secondary text-muted-foreground border border-border font-medium">
                        Last visit: {item.daysInactive} days ago
                      </span>
                    )}

                    {item.expiringDaysLeft !== undefined && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                        Expires in {item.expiringDaysLeft}d
                      </span>
                    )}

                    {item.overdueAmount !== undefined && (
                      <span className="px-2.5 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20 font-medium">
                        Overdue ₹{item.overdueAmount}
                      </span>
                    )}

                    {item.attentionType === 'HIGH_ATTENTION' && (
                      <span className="px-2.5 py-1 rounded-full bg-destructive text-destructive-foreground font-bold uppercase text-[10px]">
                        High Priority
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ANNOUNCEMENTS HISTORY */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              Announcements History
            </h2>
            <button onClick={loadData} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading announcements...</div>
          ) : announcements.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No announcements created yet. Click <strong>Create Announcement</strong> to broadcast a notice to your members.
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((ann) => (
                <div key={ann._id} className="p-5 bg-secondary/30 rounded-xl border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold border ${
                          ann.status === 'PUBLISHED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : ann.status === 'SCHEDULED'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : ann.status === 'CANCELLED'
                            ? 'bg-destructive/10 text-destructive border-destructive/20'
                            : 'bg-secondary text-muted-foreground border-border'
                        }`}
                      >
                        {ann.status}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {ann.audienceType === 'ALL_MEMBERS' ? 'All Members' : 'Branch Members'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {ann.status === 'DRAFT' && (
                        <button
                          onClick={() => handlePublishNow(ann._id)}
                          className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-all flex items-center gap-1"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Publish Now</span>
                        </button>
                      )}
                      {ann.status === 'SCHEDULED' && (
                        <button
                          onClick={() => handleCancelAnnouncement(ann._id)}
                          className="px-3 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-semibold rounded-lg transition-all flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel Schedule</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-foreground text-base">{ann.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{ann.body}</p>
                  </div>

                  <div className="text-[11px] text-muted-foreground flex items-center gap-4 border-t border-border/50 pt-2">
                    <span>Created: {new Date(ann.createdAt).toLocaleDateString()}</span>
                    {ann.publishedAt && (
                      <span className="text-emerald-400 font-medium">
                        Published: {new Date(ann.publishedAt).toLocaleDateString()} {new Date(ann.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {ann.scheduledAt && ann.status === 'SCHEDULED' && (
                      <span className="text-amber-400 font-medium">
                        Scheduled for: {new Date(ann.scheduledAt).toLocaleDateString()} {new Date(ann.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CREATE ANNOUNCEMENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-primary" />
                Create Gym Announcement
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-destructive/15 border border-destructive/30 rounded-xl text-xs text-destructive">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateAnnouncement} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Gym closed tomorrow due to maintenance"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Message Body</label>
                <textarea
                  rows={4}
                  placeholder="Due to maintenance work, the gym will remain closed tomorrow..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Audience</label>
                  <select
                    value={audienceType}
                    onChange={(e) => setAudienceType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="ALL_MEMBERS">All Members</option>
                    <option value="BRANCH_MEMBERS">Branch Members</option>
                  </select>
                </div>

                {audienceType === 'BRANCH_MEMBERS' && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Target Branch</label>
                    <select
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {branches.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <label className="block text-xs font-bold uppercase text-muted-foreground">Publish Option</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                    <input
                      type="radio"
                      name="publishOption"
                      checked={publishOption === 'NOW'}
                      onChange={() => setPublishOption('NOW')}
                    />
                    <span>Publish Now</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                    <input
                      type="radio"
                      name="publishOption"
                      checked={publishOption === 'SCHEDULED'}
                      onChange={() => setPublishOption('SCHEDULED')}
                    />
                    <span>Schedule for Later</span>
                  </label>
                </div>

                {publishOption === 'SCHEDULED' && (
                  <div className="mt-2">
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      required
                      className="w-full px-4 py-2 bg-secondary/50 border border-border rounded-xl text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:bg-primary/90 transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Creating...' : publishOption === 'NOW' ? 'Publish Now' : 'Schedule Announcement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
