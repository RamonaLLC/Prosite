import React, { useState, useMemo } from 'react';
import { AppNotification, Role, Job } from '../types';
import { 
  Bell, CheckCircle2, XCircle, AlertTriangle, Clock, 
  Calendar, ShieldAlert, Check, X, Search, Filter, 
  Sparkles, Building, HardHat, FileText, ArrowRight, MessageSquare
} from 'lucide-react';

interface NotificationsCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  jobs: Job[];
  workers?: any[];
  currentUserRole?: Role;
  activeRole?: Role;
  onUpdateNotifications?: (updated: AppNotification[]) => void;
  onMarkAsRead?: (id: string) => void;
  onClearAll?: () => void;
  onSelectJob?: (jobId: string) => void;
  onActionComplete?: (notifId: string, action: 'accepted' | 'denied' | 'completed', details?: any) => void;
  onNotificationClick?: (notification: AppNotification) => void;
}

export const NotificationsCenterModal: React.FC<NotificationsCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  jobs,
  currentUserRole,
  activeRole,
  onUpdateNotifications,
  onMarkAsRead,
  onClearAll,
  onSelectJob,
  onActionComplete,
  onNotificationClick
}) => {
  const [activeTab, setActiveTab] = useState<'action_required' | 'history'>('action_required');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'actioned'>('all');

  const effectiveRole = currentUserRole || activeRole || 'company';
  const isCustomer = effectiveRole === 'customer' || effectiveRole === 'client';

  // Customer only gets notifications for any bidding, adjustments, messages or job completion
  // All job execution logs (check-ins, check-outs, worker GPS, expenses, to-do checklist tasks, internal assignments) are removed for customers!
  const roleFilteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (isCustomer) {
        if (n.targetRole && n.targetRole !== 'customer' && n.targetRole !== 'all') {
          return false;
        }
        const allowedTypes = ['bid', 'offer', 'estimate', 'inspection', 'change_order', 'message', 'comment', 'completion'];
        const allowedActionTypes = ['job_offer', 'estimate_response', 'inspection_confirm', 'change_order'];
        return allowedTypes.includes(n.type) || (n.actionType && allowedActionTypes.includes(n.actionType));
      } else if (effectiveRole === 'worker' || effectiveRole === 'employee') {
        if (n.targetRole && n.targetRole !== 'employee' && n.targetRole !== 'all') {
          return false;
        }
        return true;
      } else {
        if (n.targetRole === 'customer') return false;
        return true;
      }
    });
  }, [notifications, isCustomer, effectiveRole]);

  // Destination meta helper
  const getDestinationLabel = (notif: AppNotification) => {
    if (notif.type === 'completion') {
      return isCustomer ? 'Confirm Completion & Release Escrow →' : 'View Completed Job →';
    }
    if (notif.type === 'message' || notif.type === 'comment') {
      return 'Open Message Screen →';
    }
    if (notif.type === 'bid' || notif.type === 'offer' || notif.type === 'estimate' || notif.type === 'inspection') {
      return isCustomer ? 'View Bids & Proposals →' : 'Review Pending Requests →';
    }
    if (notif.type === 'change_order') {
      return isCustomer ? 'View Scope Adjustment →' : 'Manage Change Order →';
    }
    if (notif.type === 'check-in' || notif.type === 'check-out') {
      return 'View GPS & Dispatch Logs →';
    }
    if (notif.type === 'expense') {
      return 'View Expense Ledger →';
    }
    return 'View Job Details →';
  };

  const handleCardClick = (notif: AppNotification) => {
    if (onMarkAsRead) {
      onMarkAsRead(notif.id);
    } else if (onUpdateNotifications) {
      const updated = notifications.map(n => n.id === notif.id ? { ...n, isRead: true } : n);
      onUpdateNotifications(updated);
    }
    onClose();
    if (onNotificationClick) {
      onNotificationClick(notif);
    } else if (onSelectJob && notif.jobId) {
      onSelectJob(notif.jobId);
    }
  };

  // Calculate age and priority color based on exact hours
  const getNotificationUrgency = (timestamp: string): {
    color: 'green' | 'neutral' | 'orange' | 'red';
    label: string;
    hoursOld: number;
    badgeClass: string;
    borderClass: string;
  } => {
    const created = new Date(timestamp).getTime();
    const now = Date.now();
    const diffHours = Math.max(0, (now - created) / (1000 * 60 * 60));

    if (diffHours < 24) {
      return {
        color: 'green',
        label: 'Active (< 24h)',
        hoursOld: Math.round(diffHours),
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        borderClass: 'border-emerald-500/60 ring-1 ring-emerald-500/30'
      };
    } else if (diffHours <= 48) {
      return {
        color: 'neutral',
        label: 'Normal (24-48h)',
        hoursOld: Math.round(diffHours),
        badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        borderClass: 'border-blue-500/40'
      };
    } else if (diffHours <= 72) {
      return {
        color: 'orange',
        label: 'Urgent (> 48h)',
        hoursOld: Math.round(diffHours),
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse',
        borderClass: 'border-amber-500/80 ring-1 ring-amber-500/50'
      };
    } else {
      return {
        color: 'red',
        label: 'Critical Overdue (> 72h)',
        hoursOld: Math.round(diffHours),
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse',
        borderClass: 'border-rose-500 ring-2 ring-rose-500/60'
      };
    }
  };

  // Filter 31-day notifications
  const thirtyOneDaysAgo = useMemo(() => {
    return Date.now() - 31 * 24 * 60 * 60 * 1000;
  }, []);

  const historyNotifications = useMemo(() => {
    return roleFilteredNotifications.filter(n => {
      const time = new Date(n.timestamp).getTime();
      return isNaN(time) || time >= thirtyOneDaysAgo;
    });
  }, [roleFilteredNotifications, thirtyOneDaysAgo]);

  // Action-required unresolved notifications (cannot be deleted until resolved)
  const actionRequiredNotifications = useMemo(() => {
    return roleFilteredNotifications.filter(n => {
      // Must be marked actionRequired and still pending
      return n.actionRequired && n.actionStatus !== 'accepted' && n.actionStatus !== 'denied' && n.actionStatus !== 'completed';
    });
  }, [roleFilteredNotifications]);

  // Filtered history list
  const filteredHistory = useMemo(() => {
    return historyNotifications.filter(n => {
      if (filterType !== 'all' && n.type !== filterType) return false;
      if (filterStatus === 'unread' && n.isRead) return false;
      if (filterStatus === 'actioned' && !n.actionDecisionAt) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = n.title?.toLowerCase().includes(q);
        const matchesMsg = n.message?.toLowerCase().includes(q);
        const matchesSender = n.senderName?.toLowerCase().includes(q);
        const relJob = jobs.find(j => j.id === n.jobId);
        const matchesJob = relJob?.title.toLowerCase().includes(q) || relJob?.address.toLowerCase().includes(q);
        return matchesTitle || matchesMsg || matchesSender || matchesJob;
      }
      return true;
    });
  }, [historyNotifications, filterType, filterStatus, searchQuery, jobs]);

  if (!isOpen) return null;

  const handleResolveAction = (notifId: string, decision: 'accepted' | 'denied') => {
    const updated = notifications.map(n => {
      if (n.id === notifId) {
        return {
          ...n,
          actionStatus: decision,
          actionDecisionAt: new Date().toISOString(),
          isRead: true
        };
      }
      return n;
    });
    if (onUpdateNotifications) {
      onUpdateNotifications(updated);
    }
    if (onActionComplete) {
      onActionComplete(notifId, decision);
    }
  };

  const handleMarkAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    if (onUpdateNotifications) {
      onUpdateNotifications(updated);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                Notification Center
                {actionRequiredNotifications.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono font-bold animate-pulse">
                    {actionRequiredNotifications.length} Action Needed
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Action-required queue with priority highlighting & 31-day history
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllAsRead}
              className="px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition"
            >
              Mark All Read
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="px-6 pt-3 bg-slate-950/50 border-b border-slate-800 flex gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('action_required')}
            className={`pb-3 px-1 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'action_required'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Action Required Queue
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              actionRequiredNotifications.length > 0 ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {actionRequiredNotifications.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-1 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            Notification History — Last 31 Days
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono">
              {historyNotifications.length}
            </span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* TAB 1: ACTION REQUIRED UNRESOLVED QUEUE */}
          {activeTab === 'action_required' && (
            <div className="space-y-4">
              {/* Priority Legend */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  Urgency Priority Scale:
                </span>
                <div className="flex items-center gap-3 font-mono">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Green: &lt; 24h
                  </span>
                  <span className="flex items-center gap-1 text-blue-400">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    Normal: 24-48h
                  </span>
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Orange: &gt; 48h
                  </span>
                  <span className="flex items-center gap-1 text-rose-400 font-black">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    Red: &gt; 72h Overdue
                  </span>
                </div>
              </div>

              {actionRequiredNotifications.length === 0 ? (
                <div className="text-center py-12 px-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-90" />
                  <h3 className="text-base font-bold text-white">All Action Items Resolved</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    There are no pending requests, bids, or inspections currently awaiting your confirmation.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {actionRequiredNotifications.map(notif => {
                    const urgency = getNotificationUrgency(notif.timestamp);
                    const relatedJob = jobs.find(j => j.id === notif.jobId);

                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleCardClick(notif)}
                        className={`p-4 rounded-xl bg-slate-950 border transition-all cursor-pointer hover:bg-slate-900/90 group ${urgency.borderClass}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md border ${urgency.badgeClass}`}>
                                {urgency.label} ({urgency.hoursOld}h ago)
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold uppercase border border-slate-700">
                                {notif.type}
                              </span>
                              {notif.senderName && (
                                <span className="text-[11px] text-slate-400 font-medium">
                                  From: <strong className="text-white">{notif.senderName}</strong> ({notif.senderRole || 'Client'})
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm font-black text-white group-hover:text-blue-300 transition-colors">
                              {notif.title}
                            </h4>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {notif.message}
                            </p>

                            {relatedJob && (
                              <div className="mt-2 text-[11px] font-mono text-slate-400 bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800 inline-block">
                                Site: <strong className="text-slate-200">{relatedJob.title}</strong> — {relatedJob.address}
                              </div>
                            )}

                            <div className="pt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCardClick(notif);
                                }}
                                className="text-xs font-bold text-blue-400 group-hover:text-blue-300 flex items-center gap-1.5 py-1 px-2 rounded-lg bg-blue-950/60 border border-blue-800/60 hover:bg-blue-900/60 transition cursor-pointer"
                              >
                                <span>{getDestinationLabel(notif)}</span>
                                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                              </button>
                            </div>
                          </div>

                          {/* Action Controls */}
                          <div className="flex sm:flex-col items-center gap-2 shrink-0 pt-2 sm:pt-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResolveAction(notif.id, 'accepted');
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer w-full justify-center"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Accept / Confirm
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResolveAction(notif.id, 'denied');
                              }}
                              className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer w-full justify-center"
                            >
                              <X className="w-3.5 h-3.5" />
                              Deny / Decline
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>Received: {new Date(notif.timestamp).toLocaleString()}</span>
                          <span className="text-amber-400 font-bold">Action mandatory before closing queue</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: 31-DAY NOTIFICATION HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="relative sm:col-span-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search past 31 days..."
                    className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {isCustomer ? (
                      <>
                        <option value="all">All Allowed Notifications</option>
                        <option value="completion">Job Completions</option>
                        <option value="message">Messages & Comments</option>
                        <option value="bid">Bids & Proposals</option>
                        <option value="change_order">Scope Adjustments</option>
                      </>
                    ) : (
                      <>
                        <option value="all">All Notification Types</option>
                        <option value="check-in">Check-Ins / GPS</option>
                        <option value="inspection">Inspection Requests</option>
                        <option value="bid">Bids & Proposals</option>
                        <option value="offer">Job Offers</option>
                        <option value="change_order">Change Orders</option>
                        <option value="expense">Expenses & Budgets</option>
                        <option value="todo">Task Completion</option>
                        <option value="comment">Comments & Messages</option>
                        <option value="completion">Job Completions</option>
                        <option value="system">System Alerts</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="unread">Unread Only</option>
                    <option value="actioned">Action Recorded Only</option>
                  </select>
                </div>
              </div>

              {/* History List */}
              <div className="space-y-2">
                {filteredHistory.length === 0 ? (
                  <div className="text-center py-10 bg-slate-950/40 rounded-xl border border-slate-800">
                    <p className="text-xs text-slate-400">No notifications found in the 31-day history matching criteria.</p>
                  </div>
                ) : (
                  filteredHistory.map(notif => {
                    const relatedJob = jobs.find(j => j.id === notif.jobId);

                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleCardClick(notif)}
                        className={`p-3.5 rounded-xl border transition cursor-pointer hover:bg-slate-900/90 hover:border-blue-500/60 group ${
                          notif.isRead 
                            ? 'bg-slate-950/60 border-slate-800/80' 
                            : 'bg-slate-950 border-blue-500/40 ring-1 ring-blue-500/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-bold border border-slate-700">
                                {notif.type}
                              </span>
                              {notif.senderName && (
                                <span className="text-[10px] text-slate-400">
                                  From: <strong className="text-slate-200">{notif.senderName}</strong>
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(notif.timestamp).toLocaleString()}
                              </span>
                            </div>

                            <h5 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                              {notif.title}
                            </h5>
                            <p className="text-xs text-slate-300">
                              {notif.message}
                            </p>

                            {relatedJob && (
                              <p className="text-[10px] font-mono text-slate-400">
                                Job: {relatedJob.title} ({relatedJob.address})
                              </p>
                            )}

                            {notif.actionDecisionAt && (
                              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Action recorded: <strong>{notif.actionStatus?.toUpperCase()}</strong> on {new Date(notif.actionDecisionAt).toLocaleString()}
                              </div>
                            )}

                            {/* Destination Action Link */}
                            <div className="pt-2 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCardClick(notif);
                                }}
                                className="text-[11px] font-bold text-blue-400 group-hover:text-blue-300 flex items-center gap-1 py-1 px-2 rounded-lg bg-blue-950/40 border border-blue-900/40 hover:bg-blue-900/60 transition cursor-pointer"
                              >
                                <span>{getDestinationLabel(notif)}</span>
                                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                              </button>
                              <span className="text-[9px] text-slate-500 font-mono">Click to navigate</span>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onMarkAsRead) {
                                onMarkAsRead(notif.id);
                              } else if (onUpdateNotifications) {
                                const updated = notifications.map(n => n.id === notif.id ? { ...n, isRead: !n.isRead } : n);
                                onUpdateNotifications(updated);
                              }
                            }}
                            className={`text-[10px] font-mono px-2 py-1 rounded transition cursor-pointer ${
                              notif.isRead ? 'text-slate-500 hover:text-slate-300' : 'text-blue-400 font-bold hover:underline'
                            }`}
                          >
                            {notif.isRead ? 'Mark Unread' : 'Mark Read'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs font-mono text-slate-400">
          <span>Active Role: <strong className="text-white uppercase">{effectiveRole}</strong></span>
          <span>Automatic 31-day cycle preservation</span>
        </div>

      </div>
    </div>
  );
};
