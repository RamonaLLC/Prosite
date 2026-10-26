import React from 'react';
import { SchedulingConflict, WorkerProfile } from '../types';
import { 
  AlertTriangle, Clock, MapPin, ArrowRight, ShieldAlert, 
  CheckCircle2, UserCheck, RefreshCw, X, AlertCircle
} from 'lucide-react';
import { formatTime12Hour } from '../services/travelTimeService';

interface TravelTimeConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflict: SchedulingConflict | null;
  workers: WorkerProfile[];
  onAdjustTime: (newStartTime: string) => void;
  onContinueAnyway?: () => void;
  onOpenReassignWorker?: (workerId: string) => void;
}

export const TravelTimeConflictModal: React.FC<TravelTimeConflictModalProps> = ({
  isOpen,
  onClose,
  conflict,
  workers,
  onAdjustTime,
  onContinueAnyway,
  onOpenReassignWorker
}) => {
  if (!isOpen || !conflict) return null;

  const worker = workers.find(w => w.id === conflict.workerId);
  const isHardViolation = !conflict.canOverride || conflict.severity === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between border-b ${
          isHardViolation 
            ? 'bg-red-950/70 border-red-800/80 text-red-300' 
            : 'bg-amber-950/70 border-amber-800/80 text-amber-300'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isHardViolation 
                ? 'bg-red-500/20 border-red-400/40 text-red-400' 
                : 'bg-amber-500/20 border-amber-400/40 text-amber-400'
            }`}>
              {isHardViolation ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                Travel Time Conflict
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold border ${
                  isHardViolation 
                    ? 'bg-red-500/20 text-red-300 border-red-500/30' 
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {isHardViolation ? 'BUFFER VIOLATION' : 'TRAVEL TIME ISSUE'}
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                {isHardViolation 
                  ? 'Mandatory 30-minute minimum buffer violated. Adjustment required.' 
                  : 'Insufficient travel time between scheduled job locations.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          
          {/* Worker Info Card */}
          {worker && (
            <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
              <img 
                src={worker.avatar} 
                alt={worker.name} 
                className="w-10 h-10 rounded-full object-cover border border-slate-700 bg-slate-800 shrink-0" 
              />
              <div className="text-xs">
                <div className="font-bold text-white text-sm">{worker.name}</div>
                <div className="text-slate-400 font-mono text-[11px]">{worker.position} • Base: {worker.address || 'Company Base'}</div>
              </div>
            </div>
          )}

          {/* Conflict Narrative Explanation */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed font-mono">
            {conflict.message}
          </div>

          {/* Visual Route & Timing Comparison */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-[11px] font-black uppercase text-slate-400 font-mono tracking-wider">
              Location & Travel Breakdown
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Previous Job */}
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Previous Job Location</div>
                <div className="text-xs font-bold text-white truncate">
                  {conflict.previousJob?.title || 'Prior Scheduled Site'}
                </div>
                <div className="text-[11px] text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">{conflict.previousJob?.address || 'Designated Base'}</span>
                </div>
                <div className="text-[11px] text-emerald-400 font-mono font-bold pt-1">
                  End Time: {conflict.previousJob?.endTime ? formatTime12Hour(conflict.previousJob.endTime) : 'N/A'}
                </div>
              </div>

              {/* Next / Proposed Job */}
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Proposed Next Job</div>
                <div className="text-xs font-bold text-white truncate">
                  {conflict.currentJob.title}
                </div>
                <div className="text-[11px] text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">{conflict.currentJob.address}</span>
                </div>
                <div className="text-[11px] text-amber-400 font-mono font-bold pt-1">
                  Proposed Start: {formatTime12Hour(conflict.currentJob.startTime)}
                </div>
              </div>
            </div>

            {/* Travel Stats Metrics */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center font-mono">
              <div className="p-2 bg-slate-900/90 rounded-lg">
                <div className="text-[10px] text-slate-400">Estimated Travel</div>
                <div className="text-sm font-black text-blue-400">{conflict.estimatedTravelTimeMinutes} mins</div>
              </div>
              <div className="p-2 bg-slate-900/90 rounded-lg">
                <div className="text-[10px] text-slate-400">Available Gap</div>
                <div className={`text-sm font-black ${conflict.availableGapMinutes < 30 ? 'text-red-400' : 'text-amber-400'}`}>
                  {conflict.availableGapMinutes} mins
                </div>
              </div>
              <div className="p-2 bg-slate-900/90 rounded-lg">
                <div className="text-[10px] text-slate-400">Required Gap</div>
                <div className="text-sm font-black text-emerald-400">{conflict.requiredGapMinutes} mins</div>
              </div>
            </div>
          </div>

          {/* Recommended Resolution Banner */}
          <div className="p-4 bg-blue-950/40 border border-blue-500/40 rounded-xl flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-black text-blue-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-400" />
                Recommended Earliest Start Time
              </div>
              <p className="text-xs text-slate-300">
                Adjusting to <strong>{formatTime12Hour(conflict.recommendedEarliestStart)}</strong> satisfies the required {conflict.requiredGapMinutes}-minute travel buffer.
              </p>
            </div>
            <button
              onClick={() => onAdjustTime(conflict.recommendedEarliestStart)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Adjust Time
            </button>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div>
            {onOpenReassignWorker && (
              <button
                type="button"
                onClick={() => onOpenReassignWorker(conflict.workerId)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                Reassign Employee
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
            >
              Cancel
            </button>

            {/* Continue Anyway Button (Strictly DISABLED if gap < mandatory 30-min buffer) */}
            {onContinueAnyway && (
              <button
                type="button"
                disabled={isHardViolation}
                onClick={onContinueAnyway}
                title={isHardViolation ? 'Cannot continue: Mandatory 30-minute buffer is violated.' : 'Override recommended travel time and continue'}
                className={`px-4 py-2 text-xs font-black rounded-xl transition flex items-center gap-1.5 ${
                  isHardViolation
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow cursor-pointer'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Continue Anyway
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
