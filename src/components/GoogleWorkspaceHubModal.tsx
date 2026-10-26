import React, { useState, useEffect } from 'react';
import { 
  Calendar, MessageSquare, Video, ExternalLink, Plus, 
  Trash2, RefreshCw, Send, CheckCircle2, Clock, MapPin, 
  Users, AlertCircle, Copy, Check, ShieldCheck, X
} from 'lucide-react';
import { 
  fetchCalendarEvents, 
  createCalendarEvent, 
  deleteCalendarEvent,
  fetchChatSpaces, 
  sendChatMessage,
  createGoogleMeetSpace,
  GoogleCalendarEvent,
  GoogleChatSpace,
  CalendarEventPayload
} from '../services/workspaceService';
import { googleSignIn, getAccessToken, logoutUser } from '../lib/workspaceAuth';
import { Job, Role } from '../types';

interface GoogleWorkspaceHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: Job[];
  activeRole: Role;
  onTriggerAlert: (title: string, message: string, type: 'system' | 'message' | 'check-in') => void;
  onSelectJob?: (jobId: string) => void;
}

export const GoogleWorkspaceHubModal: React.FC<GoogleWorkspaceHubModalProps> = ({
  isOpen,
  onClose,
  jobs,
  activeRole,
  onTriggerAlert,
  onSelectJob,
}) => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'meet' | 'chat'>('calendar');
  const [accessToken, setAccessToken] = useState<string | null>(getAccessToken());
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Calendar state
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [eventSummary, setEventSummary] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventStartDate, setEventStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [eventStartTime, setEventStartTime] = useState('09:00');
  const [eventEndTime, setEventEndTime] = useState('10:30');
  const [eventIncludeMeet, setEventIncludeMeet] = useState(true);
  const [eventAttendeeEmail, setEventAttendeeEmail] = useState('');
  const [selectedJobIdForEvent, setSelectedJobIdForEvent] = useState<string>('');

  // Meet state
  const [activeMeetLink, setActiveMeetLink] = useState<string | null>(null);
  const [isCreatingMeet, setIsCreatingMeet] = useState(false);
  const [copiedMeetLink, setCopiedMeetLink] = useState(false);

  // Chat state
  const [chatSpaces, setChatSpaces] = useState<GoogleChatSpace[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<string>('');
  const [chatMessageText, setChatMessageText] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Destructive / Action Confirmation Dialog State
  const [pendingConfirmAction, setPendingConfirmAction] = useState<{
    title: string;
    description: string;
    confirmButtonText: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    setAccessToken(token);
    if (token && isOpen) {
      loadTabContent(token, activeTab);
    }
  }, [isOpen, activeTab]);

  const loadTabContent = async (token: string, tab: 'calendar' | 'meet' | 'chat') => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      if (tab === 'calendar') {
        const events = await fetchCalendarEvents(token);
        setCalendarEvents(events);
      } else if (tab === 'chat') {
        try {
          const spaces = await fetchChatSpaces(token);
          setChatSpaces(spaces);
          if (spaces.length > 0 && !selectedSpace) {
            setSelectedSpace(spaces[0].name);
          }
        } catch (chatErr) {
          console.warn('Chat spaces list info:', chatErr);
        }
      }
    } catch (error: any) {
      console.error(`Error loading ${tab}:`, error);
      setStatusMessage({ text: error.message || `Failed to load ${tab} data.`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const result = await googleSignIn();
      if (result?.accessToken) {
        setAccessToken(result.accessToken);
        setUserProfile(result.user);
        setStatusMessage({ text: `Connected as ${result.user.email}`, type: 'success' });
        loadTabContent(result.accessToken, activeTab);
        onTriggerAlert('Google Workspace Connected', `Authenticated as ${result.user.displayName || result.user.email}`, 'system');
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setStatusMessage({ text: err.message || 'Google Sign-in failed', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logoutUser();
    setAccessToken(null);
    setUserProfile(null);
    setCalendarEvents([]);
    setChatSpaces([]);
    setActiveMeetLink(null);
    setStatusMessage({ text: 'Signed out of Google Workspace', type: 'success' });
  };

  const handleJobSelectForCalendar = (jobId: string) => {
    setSelectedJobIdForEvent(jobId);
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      setEventSummary(`Job Site Visit: ${job.title}`);
      setEventLocation(job.address);
      setEventDescription(`Client: ${job.clientName} (${job.clientEmail})\nAddress: ${job.address}\nDetails: ${job.description}`);
      setEventAttendeeEmail(job.clientEmail);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setIsLoading(true);
    try {
      const startDateTime = new Date(`${eventStartDate}T${eventStartTime}:00`).toISOString();
      const endDateTime = new Date(`${eventStartDate}T${eventEndTime}:00`).toISOString();

      const payload: CalendarEventPayload = {
        summary: eventSummary || 'ProSite Construction Event',
        description: eventDescription,
        location: eventLocation,
        startDateTime,
        endDateTime,
        createMeetLink: eventIncludeMeet,
        attendees: eventAttendeeEmail ? [eventAttendeeEmail] : [],
      };

      const created = await createCalendarEvent(accessToken, payload);
      setCalendarEvents(prev => [created, ...prev]);
      setShowAddEventModal(false);
      setStatusMessage({ text: 'Calendar event scheduled successfully!', type: 'success' });
      onTriggerAlert('Calendar Event Scheduled', `Added "${payload.summary}" with Google Meet link to your Google Calendar.`, 'system');
    } catch (err: any) {
      console.error('Create event error:', err);
      setStatusMessage({ text: err.message || 'Failed to create event', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const requestDeleteEvent = (eventId: string, summary: string) => {
    setPendingConfirmAction({
      title: 'Delete Google Calendar Event?',
      description: `Are you sure you want to delete the scheduled event "${summary}" from your Google Calendar? This action cannot be undone.`,
      confirmButtonText: 'Confirm & Delete Event',
      onConfirm: async () => {
        if (!accessToken) return;
        setIsLoading(true);
        try {
          await deleteCalendarEvent(accessToken, eventId);
          setCalendarEvents(prev => prev.filter(ev => ev.id !== eventId));
          setStatusMessage({ text: 'Event removed from Google Calendar.', type: 'success' });
          onTriggerAlert('Calendar Event Removed', `Deleted "${summary}" from your Google Calendar.`, 'system');
        } catch (err: any) {
          setStatusMessage({ text: err.message || 'Failed to delete event', type: 'error' });
        } finally {
          setIsLoading(false);
          setPendingConfirmAction(null);
        }
      },
    });
  };

  const handleGenerateInstantMeet = async () => {
    if (!accessToken) return;
    setIsCreatingMeet(true);
    try {
      const meet = await createGoogleMeetSpace(accessToken);
      setActiveMeetLink(meet.meetingUri);
      setStatusMessage({ text: 'Google Meet room created successfully!', type: 'success' });
      onTriggerAlert('Google Meet Room Active', `Join code: ${meet.meetingCode || 'Live'}`, 'system');
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to create Google Meet', type: 'error' });
    } finally {
      setIsCreatingMeet(false);
    }
  };

  const requestSendChatMessage = () => {
    if (!chatMessageText.trim()) return;
    setPendingConfirmAction({
      title: 'Send Google Chat Message?',
      description: `Send this update to the selected Google Chat channel?\n\n"${chatMessageText}"`,
      confirmButtonText: 'Confirm & Send to Google Chat',
      onConfirm: async () => {
        if (!accessToken || !selectedSpace) return;
        setIsSendingChat(true);
        try {
          await sendChatMessage(accessToken, selectedSpace, chatMessageText);
          setChatMessageText('');
          setStatusMessage({ text: 'Message delivered to Google Chat space!', type: 'success' });
          onTriggerAlert('Google Chat Broadcast', 'Update posted to team space.', 'message');
        } catch (err: any) {
          setStatusMessage({ text: err.message || 'Failed to send to Google Chat', type: 'error' });
        } finally {
          setIsSendingChat(false);
          setPendingConfirmAction(null);
        }
      },
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMeetLink(true);
    setTimeout(() => setCopiedMeetLink(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        
        {/* Header with Google Workspace Branding */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Google Workspace Hub
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono">
                  Calendar • Meet • Chat
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Sync job schedules, start live site inspections, and collaborate with teams
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {accessToken ? (
              <button
                onClick={handleSignOut}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              >
                Disconnect
              </button>
            ) : null}
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-2">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs transition cursor-pointer ${
              activeTab === 'calendar' 
                ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Google Calendar
          </button>
          <button
            onClick={() => setActiveTab('meet')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs transition cursor-pointer ${
              activeTab === 'meet' 
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-4 h-4" />
            Google Meet (Live Walkthroughs)
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs transition cursor-pointer ${
              activeTab === 'chat' 
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Google Chat Spaces
          </button>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-center justify-between border ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}>
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {!accessToken ? (
            /* Unauthenticated View: Sign in with Google Button */
            <div className="text-center py-12 px-4 max-w-md mx-auto flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Connect Your Google Workspace</h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Connect your Google Account to schedule site visits directly on Google Calendar, initiate Google Meet video consultations, and post updates to Google Chat with permission from your team.
              </p>

              {/* Official Google Sign-In Button */}
              <button
                onClick={handleSignIn}
                disabled={isLoading}
                className="flex items-center justify-center gap-3 bg-white text-slate-800 font-semibold text-sm px-6 py-3 rounded-xl shadow-lg hover:bg-slate-100 transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                {isLoading ? 'Connecting...' : 'Sign in with Google'}
              </button>
            </div>
          ) : (
            /* Authenticated Hub Views */
            <div>
              {/* TAB 1: GOOGLE CALENDAR */}
              {activeTab === 'calendar' && (
                <div className="space-y-6">
                  {/* Top Bar with actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                    <div>
                      <h4 className="text-sm font-bold text-white">Google Calendar Sync</h4>
                      <p className="text-xs text-slate-400">Scheduled site inspections, project milestones, and meetings</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => accessToken && loadTabContent(accessToken, 'calendar')}
                        disabled={isLoading}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition"
                        title="Refresh calendar"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                      <button
                        onClick={() => setShowAddEventModal(true)}
                        className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Schedule Site Visit
                      </button>
                    </div>
                  </div>

                  {/* Calendar Event Creation Form Modal / Card */}
                  {showAddEventModal && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-blue-500/30 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h5 className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          New Google Calendar Event
                        </h5>
                        <button onClick={() => setShowAddEventModal(false)} className="text-slate-400 hover:text-white text-xs">
                          Cancel
                        </button>
                      </div>

                      <form onSubmit={handleCreateEvent} className="space-y-3">
                        {/* Auto-fill from active ProSite Job */}
                        {jobs.length > 0 && (
                          <div>
                            <label className="block text-[11px] font-mono text-slate-400 mb-1">
                              Import from ProSite Job:
                            </label>
                            <select
                              value={selectedJobIdForEvent}
                              onChange={(e) => handleJobSelectForCalendar(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                            >
                              <option value="">-- Choose Job Site --</option>
                              {jobs.map(j => (
                                <option key={j.id} value={j.id}>{j.title} ({j.address})</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-mono text-slate-400 mb-1">Event Title *</label>
                            <input
                              type="text"
                              required
                              value={eventSummary}
                              onChange={(e) => setEventSummary(e.target.value)}
                              placeholder="e.g. Electrical Pre-Inspection"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-mono text-slate-400 mb-1">Site Location / Address</label>
                            <input
                              type="text"
                              value={eventLocation}
                              onChange={(e) => setEventLocation(e.target.value)}
                              placeholder="e.g. 742 Evergreen Terrace"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-mono text-slate-400 mb-1">Date</label>
                            <input
                              type="date"
                              required
                              value={eventStartDate}
                              onChange={(e) => setEventStartDate(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-mono text-slate-400 mb-1">Start Time</label>
                            <input
                              type="time"
                              required
                              value={eventStartTime}
                              onChange={(e) => setEventStartTime(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-mono text-slate-400 mb-1">End Time</label>
                            <input
                              type="time"
                              required
                              value={eventEndTime}
                              onChange={(e) => setEventEndTime(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-mono text-slate-400 mb-1">Invite Attendee (Client/Worker Email)</label>
                            <input
                              type="email"
                              value={eventAttendeeEmail}
                              onChange={(e) => setEventAttendeeEmail(e.target.value)}
                              placeholder="client@example.com"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div className="flex items-center gap-2 pt-6">
                            <input
                              type="checkbox"
                              id="event-meet-toggle"
                              checked={eventIncludeMeet}
                              onChange={(e) => setEventIncludeMeet(e.target.checked)}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-900 border-slate-700"
                            />
                            <label htmlFor="event-meet-toggle" className="text-xs text-slate-300 select-none cursor-pointer flex items-center gap-1.5">
                              <Video className="w-3.5 h-3.5 text-emerald-400" />
                              Generate Google Meet video call link
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-mono text-slate-400 mb-1">Notes & Scope Details</label>
                          <textarea
                            rows={2}
                            value={eventDescription}
                            onChange={(e) => setEventDescription(e.target.value)}
                            placeholder="Inspection notes, materials review..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowAddEventModal(false)}
                            className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow"
                          >
                            {isLoading ? 'Saving...' : 'Add to Google Calendar'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Events List */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-mono uppercase tracking-wider text-slate-400">Upcoming Synced Events</h5>
                    {calendarEvents.length === 0 ? (
                      <div className="text-center py-8 bg-slate-950/30 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
                        No upcoming events found on your Google Calendar. Schedule a site visit above!
                      </div>
                    ) : (
                      calendarEvents.map((event) => {
                        const startStr = event.start.dateTime 
                          ? new Date(event.start.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                          : event.start.date || 'All Day';
                        const meetLink = event.hangoutLink || event.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri;

                        return (
                          <div 
                            key={event.id}
                            className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <h6 className="text-sm font-semibold text-white flex items-center gap-2">
                                {event.summary || '(No Title)'}
                                {meetLink && (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1 font-mono">
                                    <Video className="w-3 h-3" /> Meet Ready
                                  </span>
                                )}
                              </h6>
                              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                                  {startStr}
                                </span>
                                {event.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                                    {event.location}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                              {meetLink && (
                                <a
                                  href={meetLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 text-xs font-medium flex items-center gap-1.5 transition"
                                >
                                  <Video className="w-3.5 h-3.5" />
                                  Join Meet
                                </a>
                              )}
                              {event.htmlLink && (
                                <a
                                  href={event.htmlLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                  title="Open in Google Calendar"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                onClick={() => requestDeleteEvent(event.id, event.summary || 'event')}
                                className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                                title="Delete from Google Calendar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: GOOGLE MEET */}
              {activeTab === 'meet' && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-emerald-950/40 to-slate-950/60 p-6 rounded-2xl border border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-2 text-center md:text-left">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold">
                        <Video className="w-3.5 h-3.5" />
                        Live Job Site Inspection Room
                      </div>
                      <h4 className="text-base font-bold text-white">Start an Instant Google Meet Video Call</h4>
                      <p className="text-xs text-slate-400 max-w-lg">
                        Conduct virtual walkthroughs with property owners, review blueprinted drawings live on-screen, or run safety syncs with dispatched crews.
                      </p>
                    </div>

                    <button
                      onClick={handleGenerateInstantMeet}
                      disabled={isCreatingMeet}
                      className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950 transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      <Video className="w-4 h-4" />
                      {isCreatingMeet ? 'Launching Meet...' : 'Create Instant Meet Room'}
                    </button>
                  </div>

                  {activeMeetLink && (
                    <div className="p-5 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Active Google Meet Session Created
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <input
                          type="text"
                          readOnly
                          value={activeMeetLink}
                          className="w-full bg-transparent text-xs text-emerald-300 font-mono focus:outline-none"
                        />
                        <button
                          onClick={() => copyToClipboard(activeMeetLink)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 transition"
                        >
                          {copiedMeetLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedMeetLink ? 'Copied' : 'Copy'}
                        </button>
                        <a
                          href={activeMeetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition"
                        >
                          Join Now
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Active Job Site Quick Meet Launches */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-mono uppercase tracking-wider text-slate-400">Launch Video Sync For Active Jobs</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {jobs.slice(0, 4).map(job => (
                        <div key={job.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2">
                          <div 
                            onClick={() => {
                              if (onSelectJob) {
                                onSelectJob(job.id);
                                onClose();
                              }
                            }}
                            className="truncate cursor-pointer group flex-1"
                            title="Click to view job details in popup modal"
                          >
                            <h6 className="text-xs font-bold text-white group-hover:text-blue-400 underline decoration-dotted truncate">{job.title}</h6>
                            <p className="text-[11px] text-slate-400 truncate">{job.clientName} • {job.address}</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedJobIdForEvent(job.id);
                              handleJobSelectForCalendar(job.id);
                              setShowAddEventModal(true);
                              setActiveTab('calendar');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 text-[11px] font-medium flex items-center gap-1 transition whitespace-nowrap"
                          >
                            <Calendar className="w-3 h-3" />
                            Schedule
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: GOOGLE CHAT */}
              {activeTab === 'chat' && (
                <div className="space-y-6">
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-white">Google Chat Integration</h4>
                      <p className="text-xs text-slate-400">Broadcast job alerts and progress summaries to Google Chat spaces</p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-mono text-slate-400 mb-1">
                          Select Google Chat Space / Channel:
                        </label>
                        {chatSpaces.length > 0 ? (
                          <select
                            value={selectedSpace}
                            onChange={(e) => setSelectedSpace(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            {chatSpaces.map(sp => (
                              <option key={sp.name} value={sp.name}>{sp.displayName || sp.name}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={selectedSpace}
                            onChange={(e) => setSelectedSpace(e.target.value)}
                            placeholder="spaces/XXXXXX or team space name"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-slate-400 mb-1">Message Text</label>
                        <textarea
                          rows={3}
                          value={chatMessageText}
                          onChange={(e) => setChatMessageText(e.target.value)}
                          placeholder="e.g. 🏗️ Safety Inspection passed for 742 Evergreen Terrace. Drywall installation begins tomorrow."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                        />
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[11px] text-slate-400">
                          Posting will prompt an explicit confirmation dialog.
                        </span>
                        <button
                          onClick={requestSendChatMessage}
                          disabled={isSendingChat || !chatMessageText.trim()}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {isSendingChat ? 'Sending...' : 'Post to Google Chat'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>ProSite Google Integration Layer</span>
          <span>OAuth 2.0 Client • Firebase Auth</span>
        </div>
      </div>

      {/* Mandatory Explicit Confirmation Dialog for Destructive & External Operations */}
      {pendingConfirmAction && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-slate-900 border border-amber-500/30 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-sm font-bold text-white">{pendingConfirmAction.title}</h3>
            </div>

            <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {pendingConfirmAction.description}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setPendingConfirmAction(null)}
                className="px-3 py-2 rounded-xl border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={pendingConfirmAction.onConfirm}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition"
              >
                {pendingConfirmAction.confirmButtonText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
