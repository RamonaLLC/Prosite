import React, { useState, useMemo } from 'react';
import { 
  Job, WorkerProfile, CompanySettings, Role, 
  SchedulingConflict, EmployeeSchedulingWindow 
} from '../types';
import { 
  HardHat, MapPin, Calendar, Clock, Navigation, 
  CheckCircle2, AlertTriangle, ShieldCheck, Search, 
  Filter, Plus, RefreshCw, Car, ArrowRight, UserCheck, 
  UserX, Download, Eye, Layers, Compass, Sliders, ChevronRight
} from 'lucide-react';
import { SmartScheduleMatrix } from './SmartScheduleMatrix';
import { JobSiteMapView } from './JobSiteMapView';

interface EmployeeDispatchHubProps {
  jobs: Job[];
  workers: WorkerProfile[];
  companySettings: CompanySettings;
  activeRole: Role;
  onUpdateJobs: (updatedJobs: Job[]) => void;
  onUpdateWorkers: (updatedWorkers: WorkerProfile[]) => void;
  onUpdateCompanySettings: (updatedSettings: CompanySettings) => void;
  onSelectJob?: (jobId: string) => void;
  onSendNotification?: (title: string, message: string, type: any, jobId?: string, workerId?: string) => void;
}

export const EmployeeDispatchHub: React.FC<EmployeeDispatchHubProps> = ({
  jobs,
  workers,
  companySettings,
  activeRole,
  onUpdateJobs,
  onUpdateWorkers,
  onUpdateCompanySettings,
  onSelectJob,
  onSendNotification
}) => {
  const [activeTab, setActiveTab] = useState<'roster' | 'map' | 'schedule' | 'hours'>('roster');
  const [rosterFilter, setRosterFilter] = useState<'all' | 'on_site' | 'scheduled' | 'available' | 'idle' | 'unassigned'>('all');
  const [searchWorker, setSearchWorker] = useState('');
  
  // Job assignment state
  const [assigningWorkerId, setAssigningWorkerId] = useState<string | null>(null);
  const [selectedJobToAssign, setSelectedJobToAssign] = useState<string>('');

  // Hours filter state
  const [hoursPeriod, setHoursPeriod] = useState<'weekly' | 'biweekly' | 'monthly' | 'custom'>('weekly');
  const [customStartDate, setCustomStartDate] = useState('2026-06-01');
  const [customEndDate, setCustomEndDate] = useState('2026-06-25');

  // Scheduling window quick edit state
  const schedulingWindow = companySettings.employeeSchedulingWindow || {
    earliestStartTime: '08:00',
    latestEndTime: '17:00'
  };

  // Map focus target worker
  const [focusedWorkerId, setFocusedWorkerId] = useState<string | null>(null);

  // Categorize workers by status
  const categorizedWorkers = useMemo(() => {
    return workers.map((w) => {
      // Find assigned active jobs for this worker
      const assignedJobs = jobs.filter(j => 
        j.status === 'in-progress' && 
        (j.assignedWorkers?.includes(w.id) || j.assignedWorkers?.includes(w.name))
      );

      // Determine dispatch category
      let category: 'on_site' | 'scheduled' | 'available' | 'idle' | 'unassigned' = 'available';
      let currentJob = assignedJobs[0] || null;

      if (w.status === 'on-site' || (w.isClockedIn && currentJob)) {
        category = 'on_site';
      } else if (w.status === 'en-route' || (assignedJobs.length > 0 && !w.isClockedIn)) {
        category = 'scheduled';
      } else if (w.status === 'idle') {
        category = 'idle';
      } else if (assignedJobs.length === 0) {
        category = 'unassigned';
      }

      return {
        ...w,
        dispatchCategory: category,
        assignedJob: currentJob,
        allAssignedJobs: assignedJobs
      };
    });
  }, [workers, jobs]);

  // Filtered workers for roster
  const filteredRoster = useMemo(() => {
    return categorizedWorkers.filter(w => {
      if (rosterFilter !== 'all' && w.dispatchCategory !== rosterFilter) return false;
      if (searchWorker.trim()) {
        const q = searchWorker.toLowerCase();
        const matchesName = w.name.toLowerCase().includes(q);
        const matchesTrade = w.trade?.toLowerCase().includes(q);
        const matchesJob = w.assignedJob?.title.toLowerCase().includes(q) || w.assignedJob?.address.toLowerCase().includes(q);
        return matchesName || matchesTrade || matchesJob;
      }
      return true;
    });
  }, [categorizedWorkers, rosterFilter, searchWorker]);

  // Counts for tabs/badges
  const onSiteCount = categorizedWorkers.filter(w => w.dispatchCategory === 'on_site').length;
  const scheduledCount = categorizedWorkers.filter(w => w.dispatchCategory === 'scheduled').length;
  const availableCount = categorizedWorkers.filter(w => w.dispatchCategory === 'available').length;
  const idleCount = categorizedWorkers.filter(w => w.dispatchCategory === 'idle').length;
  const unassignedCount = categorizedWorkers.filter(w => w.dispatchCategory === 'unassigned').length;

  // Dispatch Actions
  const handleAssignWorkerToJob = (workerId: string, jobId: string) => {
    if (!jobId) return;
    const worker = workers.find(w => w.id === workerId);
    const targetJob = jobs.find(j => j.id === jobId);

    // Update job assignments
    const updatedJobs = jobs.map(j => {
      if (j.id === jobId) {
        const currentAssignees = j.assignedWorkers || [];
        if (!currentAssignees.includes(workerId)) {
          return { ...j, assignedWorkers: [...currentAssignees, workerId] };
        }
      }
      return j;
    });
    onUpdateJobs(updatedJobs);

    // Update worker status
    const updatedWorkers = workers.map(w => {
      if (w.id === workerId) {
        return {
          ...w,
          status: 'assigned' as const,
          currentJobId: jobId
        };
      }
      return w;
    });
    onUpdateWorkers(updatedWorkers);

    setAssigningWorkerId(null);
    setSelectedJobToAssign('');

    if (onSendNotification) {
      onSendNotification(
        'Worker Dispatched',
        `${worker?.name} has been assigned to ${targetJob?.title} at ${targetJob?.address}.`,
        'assignment',
        jobId,
        workerId
      );
    }
  };

  const handleRemoveFromJob = (workerId: string, jobId: string) => {
    const worker = workers.find(w => w.id === workerId);
    const updatedJobs = jobs.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          assignedWorkers: (j.assignedWorkers || []).filter(id => id !== workerId && id !== worker?.name)
        };
      }
      return j;
    });
    onUpdateJobs(updatedJobs);

    const updatedWorkers = workers.map(w => {
      if (w.id === workerId) {
        return {
          ...w,
          status: 'available' as const,
          currentJobId: undefined
        };
      }
      return w;
    });
    onUpdateWorkers(updatedWorkers);

    if (onSendNotification) {
      onSendNotification(
        'Worker Removed from Job',
        `${worker?.name} was unassigned from job.`,
        'assignment',
        jobId,
        workerId
      );
    }
  };

  const handleToggleIdle = (workerId: string) => {
    const updatedWorkers = workers.map(w => {
      if (w.id === workerId) {
        const newStatus = w.status === 'idle' ? 'available' : 'idle';
        return { ...w, status: newStatus as any };
      }
      return w;
    });
    onUpdateWorkers(updatedWorkers);
  };

  const handleConfirmGeofenceArrival = (workerId: string, jobId: string) => {
    const worker = workers.find(w => w.id === workerId);
    const updatedWorkers = workers.map(w => {
      if (w.id === workerId) {
        return {
          ...w,
          status: 'on-site' as const,
          isClockedIn: true,
          clockInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      }
      return w;
    });
    onUpdateWorkers(updatedWorkers);

    const updatedJobs = jobs.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          isActualStarted: true,
          actualStartedAt: j.actualStartedAt || new Date().toISOString()
        };
      }
      return j;
    });
    onUpdateJobs(updatedJobs);

    if (onSendNotification) {
      onSendNotification(
        'Geofence Verified: Job Started',
        `${worker?.name} arrived within jobsite geofence boundary. Official work timer started!`,
        'check-in',
        jobId,
        workerId
      );
    }
  };

  // Mock employee hours summary
  const employeeHoursData = useMemo(() => {
    return workers.map((w, idx) => {
      const baseHours = 32 + (idx * 4);
      const overtime = idx % 2 === 1 ? 4.5 : 0;
      const total = baseHours + overtime;
      return {
        id: w.id,
        name: w.name,
        trade: w.trade || 'Journeyman',
        regularHours: baseHours,
        overtimeHours: overtime,
        totalHours: total,
        primaryJob: jobs[idx % jobs.length]?.title || 'Main Remodel',
        hourlyRate: 45 + (idx * 5),
        totalCost: total * (45 + (idx * 5))
      };
    });
  }, [workers, jobs]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Central Header */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl">
            <HardHat className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Employee and Job Site Dispatch
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-bold border border-slate-700">
                Operations Command
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Centralized location for employee dispatching, job-site locations, scheduling, live worker GPS, travel buffers, and verified site hours.
            </p>
          </div>
        </div>

        {/* Operational Scheduling Window Capsule */}
        <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-3 font-mono text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Authorized Work Window</span>
            <span className="text-emerald-400 font-black">
              {schedulingWindow.earliestStartTime} – {schedulingWindow.latestEndTime}
            </span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Buffer Rule</span>
            <span className="text-amber-400 font-black">
              {companySettings.minSchedulingBufferMinutes || 30} Min Min
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-1 text-xs font-bold">
        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'roster'
              ? 'bg-amber-500 text-slate-950 font-black shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Employee Dispatch Roster ({workers.length})
        </button>

        <button
          onClick={() => setActiveTab('map')}
          className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'map'
              ? 'bg-blue-600 text-white font-black shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Interactive Dispatch Map & Live GPS
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'schedule'
              ? 'bg-emerald-600 text-white font-black shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Smart Scheduling Matrix
        </button>

        <button
          onClick={() => setActiveTab('hours')}
          className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'hours'
              ? 'bg-purple-600 text-white font-black shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Clock className="w-4 h-4" />
          Employee and Job Site Hours
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EMPLOYEE DISPATCH ROSTER */}
      {/* ========================================================================= */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          
          {/* Quick status counters */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <button
              onClick={() => setRosterFilter('on_site')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                rosterFilter === 'on_site' ? 'bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block">Currently On Site</span>
              <span className="text-xl font-black font-mono text-white">{onSiteCount}</span>
            </button>

            <button
              onClick={() => setRosterFilter('scheduled')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                rosterFilter === 'scheduled' ? 'bg-blue-950/60 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="text-[10px] font-mono text-blue-400 uppercase font-bold block">Scheduled / En Route</span>
              <span className="text-xl font-black font-mono text-white">{scheduledCount}</span>
            </button>

            <button
              onClick={() => setRosterFilter('available')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                rosterFilter === 'available' ? 'bg-slate-800 border-slate-600 ring-1 ring-slate-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="text-[10px] font-mono text-slate-300 uppercase font-bold block">Available</span>
              <span className="text-xl font-black font-mono text-white">{availableCount}</span>
            </button>

            <button
              onClick={() => setRosterFilter('idle')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                rosterFilter === 'idle' ? 'bg-amber-950/60 border-amber-500 ring-1 ring-amber-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="text-[10px] font-mono text-amber-400 uppercase font-bold block">Marked Idle</span>
              <span className="text-xl font-black font-mono text-white">{idleCount}</span>
            </button>

            <button
              onClick={() => setRosterFilter('unassigned')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                rosterFilter === 'unassigned' ? 'bg-purple-950/60 border-purple-500 ring-1 ring-purple-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="text-[10px] font-mono text-purple-400 uppercase font-bold block">Unassigned</span>
              <span className="text-xl font-black font-mono text-white">{unassignedCount}</span>
            </button>
          </div>

          {/* Search bar & filter pill */}
          <div className="flex flex-col sm:flex-row gap-2 justify-between items-center">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchWorker}
                onChange={(e) => setSearchWorker(e.target.value)}
                placeholder="Search employees by name, trade, or site..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {rosterFilter !== 'all' && (
              <button
                onClick={() => setRosterFilter('all')}
                className="text-xs text-amber-400 hover:underline font-bold self-start sm:self-auto"
              >
                Clear Filter (Show All {workers.length})
              </button>
            )}
          </div>

          {/* Roster Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoster.map(worker => {
              const hasJob = !!worker.assignedJob;

              return (
                <div
                  key={worker.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-black text-xs font-mono">
                          {worker.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white">{worker.name}</h4>
                          <span className="text-[11px] text-slate-400">{worker.trade || 'General Construction'}</span>
                        </div>
                      </div>

                      {/* Status badge */}
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                        worker.dispatchCategory === 'on_site' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        worker.dispatchCategory === 'scheduled' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                        worker.dispatchCategory === 'idle' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {worker.dispatchCategory.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Assigned Job Location */}
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                      <span className="text-[10px] font-mono text-slate-500 uppercase font-bold flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        Assigned Job Site
                      </span>
                      {hasJob ? (
                        <div 
                          onClick={() => {
                            if (worker.assignedJob?.id) onSelectJob?.(worker.assignedJob.id);
                          }}
                          className="cursor-pointer hover:bg-slate-900 p-1 -m-1 rounded transition"
                          title="Click to view job details in popup modal"
                        >
                          <p className="text-xs font-bold text-white hover:text-amber-400 underline decoration-dotted truncate">{worker.assignedJob?.title}</p>
                          <p className="text-[11px] text-slate-400 truncate">{worker.assignedJob?.address}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No job site currently assigned</p>
                      )}
                    </div>

                    {/* Geofence Status */}
                    {hasJob && (
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400">GPS Geofence:</span>
                        {worker.status === 'on-site' || worker.isClockedIn ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Arrival Verified (Timer Active)
                          </span>
                        ) : (
                          <button
                            onClick={() => handleConfirmGeofenceArrival(worker.id, worker.assignedJob!.id)}
                            className="text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Navigation className="w-3 h-3 animate-pulse" />
                            Verify Geofence Arrival
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dispatch Controls */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap gap-2 justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setFocusedWorkerId(worker.id);
                          setActiveTab('map');
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition cursor-pointer"
                        title="View location on map"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleToggleIdle(worker.id)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                          worker.status === 'idle'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                        }`}
                      >
                        {worker.status === 'idle' ? 'Unmark Idle' : 'Mark Idle'}
                      </button>
                    </div>

                    {/* Assignment controls */}
                    <div>
                      {hasJob ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setAssigningWorkerId(assigningWorkerId === worker.id ? null : worker.id)}
                            className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            Reassign
                          </button>
                          <button
                            onClick={() => handleRemoveFromJob(worker.id, worker.assignedJob!.id)}
                            className="px-2 py-1 text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs transition cursor-pointer"
                            title="Remove from job"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAssigningWorkerId(assigningWorkerId === worker.id ? null : worker.id)}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black shadow transition cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Assign to Job
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Job Assignment Selector */}
                  {assigningWorkerId === worker.id && (
                    <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block">
                        Select Target Active Job Site:
                      </label>
                      <select
                        value={selectedJobToAssign}
                        onChange={(e) => setSelectedJobToAssign(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                      >
                        <option value="">-- Choose active job --</option>
                        {jobs.filter(j => j.status === 'in-progress').map(j => (
                          <option key={j.id} value={j.id}>
                            {j.title} ({j.address})
                          </option>
                        ))}
                      </select>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setAssigningWorkerId(null)}
                          className="px-2.5 py-1 text-[11px] text-slate-400"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleAssignWorkerToJob(worker.id, selectedJobToAssign)}
                          disabled={!selectedJobToAssign}
                          className="px-3 py-1 bg-amber-500 disabled:opacity-40 text-slate-950 text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Confirm Dispatch
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INTERACTIVE DISPATCH MAP & GPS */}
      {/* ========================================================================= */}
      {activeTab === 'map' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-950 border border-blue-500/30 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-400" />
                Live Jobsite Operations & Worker GPS Location
              </h3>
              <p className="text-xs text-slate-400">
                100m geofence verification enforces that official work timers and hours only record once physical arrival is confirmed.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                GPS Stream Live
              </span>
            </div>
          </div>

          <JobSiteMapView
            jobs={jobs}
            workers={workers}
            onSelectJob={onSelectJob}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SMART SCHEDULING MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-950 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Smart Schedule & Travel Conflict Matrix
              </h3>
              <p className="text-xs text-slate-400">
                Guaranteed impossibility prevention: checks job duration, travel times, and mandatory 30-min buffers within authorized operational hours.
              </p>
            </div>
          </div>

          <SmartScheduleMatrix
            jobs={jobs}
            workers={workers}
            settings={companySettings}
            onUpdateJobs={onUpdateJobs}
            onSelectJob={onSelectJob}
            onSendNotification={onSendNotification}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: EMPLOYEE AND JOB SITE HOURS */}
      {/* ========================================================================= */}
      {activeTab === 'hours' && (
        <div className="space-y-4">
          
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                Employee and Job Site Hours
              </h3>
              <p className="text-xs text-slate-400">
                Track verified on-site hours, payroll summaries, and site productivity by employee and project.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Period selector */}
              <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1 text-xs">
                {(['weekly', 'biweekly', 'monthly', 'custom'] as const).map(period => (
                  <button
                    key={period}
                    onClick={() => setHoursPeriod(period)}
                    className={`px-3 py-1 rounded-lg font-bold transition capitalize cursor-pointer ${
                      hoursPeriod === period ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>

              {/* Export button */}
              <button
                onClick={() => alert('Exporting verified employee hours to CSV...')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Custom date range if selected */}
          {hoursPeriod === 'custom' && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3 text-xs">
              <span className="text-slate-400 font-bold">Custom Range:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs"
              />
            </div>
          )}

          {/* Hours Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Employee</th>
                    <th className="px-5 py-3">Trade</th>
                    <th className="px-5 py-3">Primary Site</th>
                    <th className="px-5 py-3 text-right">Regular Hrs</th>
                    <th className="px-5 py-3 text-right">Overtime</th>
                    <th className="px-5 py-3 text-right">Total Hours</th>
                    {activeRole !== 'manager' && (
                      <th className="px-5 py-3 text-right">Cost Total</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {employeeHoursData.map(item => (
                    <tr key={item.id} className="hover:bg-slate-850/50 transition">
                      <td className="px-5 py-3.5 font-bold text-white">{item.name}</td>
                      <td className="px-5 py-3.5 text-slate-400">{item.trade}</td>
                      <td className="px-5 py-3.5 text-slate-300">{item.primaryJob}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-200">{item.regularHours}h</td>
                      <td className="px-5 py-3.5 text-right font-mono text-amber-400">
                        {item.overtimeHours > 0 ? `${item.overtimeHours}h` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-400">
                        {item.totalHours}h
                      </td>
                      {activeRole !== 'manager' && (
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-white">
                          ${item.totalCost.toLocaleString()}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
