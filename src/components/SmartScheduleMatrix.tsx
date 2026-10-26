import React, { useState, useMemo } from 'react';
import { Job, WorkerProfile, CompanySettings, SchedulingConflict } from '../types';
import { 
  Calendar, Clock, MapPin, AlertTriangle, ShieldCheck, 
  Users, ChevronRight, RefreshCw, Car, ArrowRight, XCircle,
  Sliders, Plus, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { 
  getWorkerScheduleForDate, 
  checkEmployeeSlotConflicts, 
  getEstimatedTravelTime,
  formatTime12Hour,
  minutesToTime,
  findAvailableRescheduleSlots,
  AvailableRescheduleOption
} from '../services/travelTimeService';
import { TravelTimeConflictModal } from './TravelTimeConflictModal';

interface SmartScheduleMatrixProps {
  jobs: Job[];
  workers: WorkerProfile[];
  settings?: CompanySettings;
  onUpdateJobs: (updatedJobs: Job[]) => void;
  onSelectJob?: (jobId: string) => void;
  onSendNotification?: (title: string, message: string, type: any, jobId?: string, workerId?: string) => void;
}

export const SmartScheduleMatrix: React.FC<SmartScheduleMatrixProps> = ({
  jobs,
  workers,
  settings,
  onUpdateJobs,
  onSelectJob,
  onSendNotification
}) => {
  const [selectedDate, setSelectedDate] = useState('2026-06-25');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('all');
  const [activeConflictForModal, setActiveConflictForModal] = useState<SchedulingConflict | null>(null);

  // Smart Reschedule Finder State
  const [finderOpen, setFinderOpen] = useState(true);
  const [finderDuration, setFinderDuration] = useState(3);
  const [finderWorkers, setFinderWorkers] = useState<string[]>([workers[0]?.id || '']);
  const [finderAddress, setFinderAddress] = useState('425 Grandview Dr, San Francisco');
  const [finderResults, setFinderResults] = useState<AvailableRescheduleOption[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const minBuffer = settings?.minSchedulingBufferMinutes ?? 30;
  const isSmartTravel = settings?.smartTravelTimeEnabled !== false;

  // Compute daily schedules and travel buffers for all workers
  const workerDailyMatrix = useMemo(() => {
    return workers.map((worker) => {
      const schedule = getWorkerScheduleForDate(worker.id, selectedDate, jobs);
      
      // Calculate transitions between consecutive jobs
      const transitions: {
        from: { title: string; address: string; endTime: string };
        to: { title: string; address: string; startTime: string };
        travelMinutes: number;
        availableGapMinutes: number;
        requiredGapMinutes: number;
        status: 'valid' | 'warning' | 'error';
        conflictDetails?: SchedulingConflict;
      }[] = [];

      // Check first job of the day from base
      let baseTravelInfo = null;
      if (schedule.length > 0 && worker.address) {
        const firstJob = schedule[0];
        const travel = getEstimatedTravelTime(worker.address, firstJob.address);
        baseTravelInfo = {
          baseAddress: worker.address,
          firstJobAddress: firstJob.address,
          travelMinutes: travel.travelTimeMinutes
        };
      }

      // Check consecutive jobs
      for (let i = 0; i < schedule.length - 1; i++) {
        const current = schedule[i];
        const next = schedule[i + 1];

        const gap = next.startMinutes - current.endMinutes;
        const travel = isSmartTravel 
          ? getEstimatedTravelTime(current.address, next.address)
          : { travelTimeMinutes: 15, distanceMiles: 2, originAddress: current.address, destinationAddress: next.address };

        const travelMins = travel.travelTimeMinutes;
        const requiredGap = Math.max(minBuffer, travelMins);

        let status: 'valid' | 'warning' | 'error' = 'valid';
        let conflictDetails: SchedulingConflict | undefined;

        if (gap < minBuffer) {
          status = 'error';
          conflictDetails = {
            type: 'insufficient_buffer',
            severity: 'error',
            workerId: worker.id,
            workerName: worker.name,
            date: selectedDate,
            previousJob: {
              id: current.jobId,
              title: current.jobTitle,
              address: current.address,
              endTime: current.endTime
            },
            currentJob: {
              id: next.jobId,
              title: next.jobTitle,
              address: next.address,
              startTime: next.startTime,
              endTime: next.endTime
            },
            estimatedTravelTimeMinutes: travelMins,
            availableGapMinutes: gap,
            requiredGapMinutes: requiredGap,
            recommendedEarliestStart: minutesToTime(current.endMinutes + requiredGap),
            message: `Mandatory ${minBuffer}-minute buffer violated! Gap is only ${gap} mins (estimated travel: ${travelMins} mins).`,
            canOverride: false
          };
        } else if (gap < travelMins) {
          status = 'warning';
          conflictDetails = {
            type: 'travel_time_conflict',
            severity: 'warning',
            workerId: worker.id,
            workerName: worker.name,
            date: selectedDate,
            previousJob: {
              id: current.jobId,
              title: current.jobTitle,
              address: current.address,
              endTime: current.endTime
            },
            currentJob: {
              id: next.jobId,
              title: next.jobTitle,
              address: next.address,
              startTime: next.startTime,
              endTime: next.endTime
            },
            estimatedTravelTimeMinutes: travelMins,
            availableGapMinutes: gap,
            requiredGapMinutes: requiredGap,
            recommendedEarliestStart: minutesToTime(current.endMinutes + travelMins),
            message: `Employee ${worker.name} needs ${travelMins} minutes to travel between locations, but available gap is ${gap} minutes. Earliest recommended start is ${formatTime12Hour(minutesToTime(current.endMinutes + travelMins))}.`,
            canOverride: true
          };
        }

        transitions.push({
          from: { title: current.jobTitle, address: current.address, endTime: current.endTime },
          to: { title: next.jobTitle, address: next.address, startTime: next.startTime },
          travelMinutes: travelMins,
          availableGapMinutes: gap,
          requiredGapMinutes: requiredGap,
          status,
          conflictDetails
        });
      }

      const hasError = transitions.some(t => t.status === 'error');
      const hasWarning = transitions.some(t => t.status === 'warning');

      return {
        worker,
        schedule,
        transitions,
        baseTravelInfo,
        hasError,
        hasWarning
      };
    });
  }, [workers, jobs, selectedDate, minBuffer, isSmartTravel]);

  // Filtered workers
  const visibleWorkers = selectedWorkerId === 'all' 
    ? workerDailyMatrix 
    : workerDailyMatrix.filter(w => w.worker.id === selectedWorkerId);

  // Overall conflict count
  const totalErrors = workerDailyMatrix.reduce((acc, curr) => acc + (curr.hasError ? 1 : 0), 0);
  const totalWarnings = workerDailyMatrix.reduce((acc, curr) => acc + (curr.hasWarning ? 1 : 0), 0);

  // Run Smart Rescheduling search
  const handleSearchSlots = () => {
    const slots = findAvailableRescheduleSlots(
      finderDuration,
      finderWorkers,
      finderAddress,
      selectedDate,
      7,
      jobs,
      workers,
      settings
    );
    setFinderResults(slots);
    setHasSearched(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Configuration Summary */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-400 border border-blue-400/30 rounded-xl">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                Smart Travel-Time & Scheduling Engine
                <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {minBuffer}-MIN BUFFER ACTIVE
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Calculates real driving times between consecutive job sites and enforces mandatory scheduling buffers.
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector & Employee Scheduling Window */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white">
            <Calendar className="w-4 h-4 text-blue-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent outline-none font-mono text-xs text-white"
            />
          </div>

          {/* Employee Scheduling Window */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white">
            <Clock className="w-4 h-4 text-emerald-400" />
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Scheduling Window:</span>
              <span className="text-emerald-400 font-bold">
                {settings?.employeeSchedulingWindow?.earliestStartTime || settings?.defaultWorkDayStart || '08:00'}
              </span>
              <span className="text-slate-500">–</span>
              <span className="text-emerald-400 font-bold">
                {settings?.employeeSchedulingWindow?.latestEndTime || settings?.defaultWorkDayEnd || '17:00'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
          <span className="text-xs text-slate-400 font-bold">Active Crew Scheduled</span>
          <span className="text-sm font-black text-white">
            {workerDailyMatrix.filter(w => w.schedule.length > 0).length}/{workers.length}
          </span>
        </div>

        <div className={`p-3 rounded-xl border flex items-center justify-between ${
          totalWarnings > 0 
            ? 'bg-amber-950/50 border-amber-500/40 text-amber-300' 
            : 'bg-slate-900 border-slate-800 text-slate-400'
        }`}>
          <span className="text-xs font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Travel Warnings
          </span>
          <span className="text-sm font-black">{totalWarnings}</span>
        </div>

        <div className={`p-3 rounded-xl border flex items-center justify-between ${
          totalErrors > 0 
            ? 'bg-red-950/60 border-red-500 text-red-300' 
            : 'bg-slate-900 border-slate-800 text-slate-400'
        }`}>
          <span className="text-xs font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            Buffer / Overlap Conflicts
          </span>
          <span className="text-sm font-black">{totalErrors}</span>
        </div>
      </div>

      {/* Smart Rescheduling Slot Finder Expandable Drawer */}
      {finderOpen && (
        <div className="p-5 bg-slate-900 border border-blue-500/40 rounded-2xl space-y-4 shadow-lg animate-fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Automatic Multi-Worker Reschedule Slot Finder
              </h3>
              <p className="text-xs text-slate-400">
                Searches for continuous conflict-free windows where all required crew members satisfy travel times and 30-min buffer.
              </p>
            </div>
            <button 
              onClick={() => setFinderOpen(false)}
              className="p-1 text-slate-400 hover:text-white"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">Required Job Duration (Hours)</label>
              <select
                value={finderDuration}
                onChange={(e) => setFinderDuration(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value={1}>1 Hour</option>
                <option value={2}>2 Hours</option>
                <option value={3}>3 Hours (Standard)</option>
                <option value={4}>4 Hours (Half Day)</option>
                <option value={6}>6 Hours</option>
                <option value={8}>8 Hours (Full Day)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">Job Destination Address</label>
              <input
                type="text"
                value={finderAddress}
                onChange={(e) => setFinderAddress(e.target.value)}
                placeholder="Job site address..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">Required Assigned Crew</label>
              <select
                multiple
                value={finderWorkers}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
                  setFinderWorkers(selected);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-xs text-white h-20"
              >
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.position})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleSearchSlots}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              Find Realistic Available Windows
            </button>
          </div>

          {/* Results Grid */}
          {hasSearched && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-300">
                Available Windows Found ({finderResults.length})
              </h4>
              {finderResults.length === 0 ? (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
                  No continuous {finderDuration}-hour windows found for the selected crew without travel or buffer conflicts over the next 7 days. Try adjusting the required crew or duration.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {finderResults.map((slot, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-950 hover:bg-slate-850 border border-emerald-500/40 rounded-xl text-xs space-y-1"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-emerald-400 font-bold">{slot.formattedDate}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                          AVAILABLE
                        </span>
                      </div>
                      <div className="font-bold text-white text-sm">{slot.displayTime}</div>
                      <div className="text-[10px] text-slate-400">
                        {finderWorkers.length} crew verified • {slot.travelBufferMinutes}m buffer cleared
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Worker Daily Schedules & Travel Breakdown */}
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h3 className="text-xs font-black text-slate-400 uppercase font-mono tracking-wider">
            Daily Worker Itineraries & Transit Buffers ({selectedDate})
          </h3>

          <div className="flex gap-2">
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="bg-slate-900 text-xs border border-slate-700 rounded-lg px-3 py-1.5 text-white"
            >
              <option value="all">All Workers ({workers.length})</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Worker Cards List */}
        <div className="space-y-4">
          {visibleWorkers.map(({ worker, schedule, transitions, baseTravelInfo, hasError, hasWarning }) => (
            <div
              key={worker.id}
              className={`p-5 bg-slate-900 rounded-2xl border transition space-y-4 shadow-sm ${
                hasError
                  ? 'border-red-500/80 ring-1 ring-red-500/40'
                  : hasWarning
                  ? 'border-amber-500/70 ring-1 ring-amber-500/30'
                  : 'border-slate-800'
              }`}
            >
              {/* Card Header */}
              <div className="flex justify-between items-center flex-wrap gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <img
                    src={worker.avatar}
                    alt={worker.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-700 bg-slate-800"
                  />
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      {worker.name}
                      {hasError ? (
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-red-400" /> CONFLICT DETECTED
                        </span>
                      ) : hasWarning ? (
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-400" /> TRAVEL WARNING
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" /> SCHEDULE VALID
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {worker.position} • Base: {worker.address || 'Dispatch Center'}
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono text-xs">
                  <span className="text-slate-400">Total Jobs Today: </span>
                  <span className="font-bold text-white">{schedule.length}</span>
                </div>
              </div>

              {/* Base Location Initial Depart Info */}
              {baseTravelInfo && (
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-blue-400" />
                    <span>
                      Depart Base: <strong>{baseTravelInfo.baseAddress}</strong> → 1st Job site
                    </span>
                  </div>
                  <span className="text-blue-300 font-bold">
                    Est. Travel: {baseTravelInfo.travelMinutes} mins
                  </span>
                </div>
              )}

              {/* Schedule Timeline Flow */}
              {schedule.length === 0 ? (
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 text-center text-xs text-slate-400">
                  No scheduled jobs for this employee on {selectedDate}.
                </div>
              ) : (
                <div className="space-y-3">
                  {schedule.map((slot, idx) => {
                    const nextTransition = transitions[idx];

                    return (
                      <React.Fragment key={slot.jobId + '-' + idx}>
                        {/* Job Item Box */}
                        <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-xs font-mono font-bold shrink-0">
                              Job #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <h5 className="font-bold text-white text-xs truncate">
                                {slot.jobTitle}
                              </h5>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                                <span className="truncate">{slot.address}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs font-mono font-bold text-emerald-400">
                              {formatTime12Hour(slot.startTime)} – {formatTime12Hour(slot.endTime)}
                            </div>
                            {onSelectJob && (
                              <button
                                onClick={() => onSelectJob(slot.jobId)}
                                className="text-[10px] text-blue-400 hover:text-blue-300 underline font-bold"
                              >
                                View Job Details
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Transition Transit & Buffer Indicator */}
                        {nextTransition && (
                          <div
                            className={`p-3 rounded-xl border text-xs flex items-center justify-between flex-wrap gap-2 transition ${
                              nextTransition.status === 'error'
                                ? 'bg-red-950/60 border-red-500 text-red-300'
                                : nextTransition.status === 'warning'
                                ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                                : 'bg-slate-950/80 border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Car className="w-4 h-4 shrink-0" />
                              <div>
                                <span className="font-bold">
                                  Transit to Job #{idx + 2}:
                                </span>{' '}
                                <span>Est. Travel: {nextTransition.travelMinutes} mins</span> •{' '}
                                <span>Available Gap: {nextTransition.availableGapMinutes} mins</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                nextTransition.status === 'error'
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                  : nextTransition.status === 'warning'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}>
                                {nextTransition.status === 'error'
                                  ? 'BUFFER VIOLATION (<30m)'
                                  : nextTransition.status === 'warning'
                                  ? 'TRAVEL TIME CONFLICT'
                                  : 'BUFFER SATISFIED'}
                              </span>

                              {nextTransition.conflictDetails && (
                                <button
                                  onClick={() => setActiveConflictForModal(nextTransition.conflictDetails!)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-bold cursor-pointer"
                                >
                                  Resolve Issue
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Active Conflict Warning Modal */}
      {activeConflictForModal && (
        <TravelTimeConflictModal
          isOpen={Boolean(activeConflictForModal)}
          onClose={() => setActiveConflictForModal(null)}
          conflict={activeConflictForModal}
          workers={workers}
          onAdjustTime={(newStart) => {
            // Apply recommended time to current job
            const updated = jobs.map((j) => {
              if (j.id === activeConflictForModal.currentJob.id) {
                return {
                  ...j,
                  inspectionTime: newStart,
                  startTime: newStart
                } as any;
              }
              return j;
            });
            onUpdateJobs(updated);
            if (onSendNotification) {
              onSendNotification(
                'Schedule Adjusted for Travel',
                `Job start adjusted to ${formatTime12Hour(newStart)} to satisfy travel buffer.`,
                'system',
                activeConflictForModal.currentJob.id
              );
            }
            setActiveConflictForModal(null);
          }}
          onContinueAnyway={() => {
            setActiveConflictForModal(null);
          }}
          onOpenReassignWorker={(workerId) => {
            setActiveConflictForModal(null);
            if (onSelectJob && activeConflictForModal.currentJob.id) {
              onSelectJob(activeConflictForModal.currentJob.id);
            }
          }}
        />
      )}

    </div>
  );
};
