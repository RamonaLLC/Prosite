import React, { useState } from 'react';
import { Job, Worker, CompanySettings } from '../types';
import { 
  Search, Plus, MapPin, Clock, Check, AlertTriangle, 
  ChevronRight, Calendar, User, DollarSign, EyeOff, FileText, CheckCircle
} from 'lucide-react';
import { formatMDY, renderColoredJobDate } from '../utils/dateFormatter';
import { getJobCardBgClass, getJobStatusBadge } from '../utils/jobStatusHelper';

interface AdminJobsHubProps {
  jobs: Job[];
  workers: Worker[];
  onSelectJob: (job: Job) => void;
  onOpenAddJob: () => void;
  companySettings?: CompanySettings;
  userRole?: string;
}

export const AdminJobsHub: React.FC<AdminJobsHubProps> = ({
  jobs,
  workers,
  onSelectJob,
  onOpenAddJob,
  companySettings,
  userRole = 'company'
}) => {
  const [activeSubFilter, setActiveSubFilter] = useState<'all' | 'active' | 'inspections' | 'open_jobs' | 'open_bids' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 2-Hour Open Job Delay Helper:
  // Open Jobs are hidden from normal companies for 2 hours unless company paid $5 to promote (isPromoted)
  const isEligibleOpenJob = (j: Job): boolean => {
    if (!j.isOpenJob && j.status !== 'open-bid' && j.status !== 'pending') return true;
    if (j.acceptedOfferCompanyId) return true;
    if (j.isPromoted) return true; // Early-access granted via $5 Promote
    const postedTime = j.openJobPostedAt || j.createdAt || j.startDate;
    if (!postedTime) return true;
    try {
      const postedMs = new Date(postedTime).getTime();
      const diffHours = (Date.now() - postedMs) / (1000 * 60 * 60);
      return diffHours >= 2;
    } catch {
      return true;
    }
  };

  // Counts for pills
  const activeCount = jobs.filter(j => (j.status === 'in-progress' && (j.hasInitialGeofenceArrival || j.isActualStarted)) || (j.status as string) === 'active').length;
  const inspectionsCount = jobs.filter(j => j.inspectionStatus || j.inspectionRequest || j.title.toLowerCase().includes('inspection')).length;
  const openJobsCount = jobs.filter(j => (j.isOpenJob || j.status === 'open-bid' || j.status === 'pending') && isEligibleOpenJob(j)).length;
  const openBidsCount = jobs.filter(j => (j.bids && j.bids.length > 0) || j.status === 'open-bid').length;
  const completedCount = jobs.filter(j => j.status === 'completed').length;

  const filteredJobs = jobs.filter(j => {
    // 2-hour delay on open jobs for company view
    if ((j.isOpenJob || j.status === 'open-bid') && !isEligibleOpenJob(j)) {
      return false;
    }

    // Category filter
    if (activeSubFilter === 'active') {
      if (j.status !== 'in-progress' || (!j.hasInitialGeofenceArrival && !j.isActualStarted)) return false;
    } else if (activeSubFilter === 'inspections') {
      if (!j.inspectionStatus && !j.inspectionRequest && !j.title.toLowerCase().includes('inspection')) return false;
    } else if (activeSubFilter === 'open_jobs') {
      if (!j.isOpenJob && j.status !== 'open-bid' && j.status !== 'pending') return false;
    } else if (activeSubFilter === 'open_bids') {
      if ((!j.bids || j.bids.length === 0) && j.status !== 'open-bid') return false;
    } else if (activeSubFilter === 'completed') {
      if (j.status !== 'completed') return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (j.title || '').toLowerCase().includes(q);
      const matchAddress = (j.address || '').toLowerCase().includes(q);
      const matchClient = (j.clientName || '').toLowerCase().includes(q);
      if (!matchTitle && !matchAddress && !matchClient) return false;
    }

    return true;
  });

  return (
    <div className="space-y-5">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 shadow-sm">
        {/* Navigation Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-mono font-bold">
          {[
            { id: 'all', label: 'All Jobs', count: jobs.length },
            { id: 'active', label: 'Active Jobs', count: activeCount, color: 'text-amber-400' },
            { id: 'inspections', label: 'Inspections', count: inspectionsCount, color: 'text-purple-400' },
            { id: 'open_jobs', label: 'Open Jobs', count: openJobsCount, color: 'text-blue-400' },
            { id: 'open_bids', label: 'Open Bids', count: openBidsCount, color: 'text-emerald-400' },
            { id: 'completed', label: 'Completed', count: completedCount, color: 'text-slate-400' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSubFilter === tab.id
                  ? 'bg-blue-600 text-white shadow font-black'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeSubFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Right Search Input & Book Job Action */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search address, client..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 text-xs text-white placeholder:text-slate-500 rounded-xl border border-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={onOpenAddJob}
            className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow transition flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Book Job
          </button>
        </div>
      </div>

      {/* Grid of Job Cards (Mobile-first, NO white backgrounds, Click opens Popup Modal) */}
      {filteredJobs.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <p className="text-sm font-bold text-slate-400">No jobs found matching your criteria.</p>
          <p className="text-xs text-slate-500">Try adjusting the filter tab or search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredJobs.map((j) => {
            const isInspection = !!(j.inspectionStatus || j.inspectionRequest || j.title.toLowerCase().includes('inspection'));
            const isOpenJob = !!(j.isOpenJob || j.status === 'open-bid');
            const assignedWorkerProfiles = workers.filter(w => (j.assignedWorkers || []).includes(w.id));
            const completedTasks = (j.checklist || []).filter(t => t.status === 'completed').length;
            const totalTasks = (j.checklist || []).length;
            const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            // Address Privacy: mask exact street number for unaccepted open jobs
            const isOpenJobUnaccepted = isOpenJob && !j.acceptedOfferCompanyId;
            const displayAddress = isOpenJobUnaccepted
              ? `[Address Protected] • ${j.address.split(',').slice(-2).join(',').trim() || 'Service Region'}`
              : j.address;

            const badge = getJobStatusBadge(j);

            return (
              <div
                key={j.id}
                onClick={() => onSelectJob(j)}
                className={`p-4 rounded-2xl transition shadow-md flex flex-col justify-between gap-3 cursor-pointer group ${getJobCardBgClass(j)}`}
              >
                <div className="space-y-2.5">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Mandated Color Scheme: RED = NOT STARTED, ORANGE = ACTIVE, GREEN = COMPLETED */}
                      <span className={badge.badgeClass}>
                        {badge.label}
                      </span>

                      {isInspection && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-purple-900/80 text-purple-200 border border-purple-400/40">
                          Inspection
                        </span>
                      )}

                      {isOpenJob && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-blue-900/80 text-blue-200 border border-blue-400/40">
                          Open Job
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-white/90 font-mono font-bold bg-black/30 px-2 py-0.5 rounded">
                      {formatMDY(j.startDate)}
                    </span>
                  </div>

                  {/* Universal Job Identifier: [Job Address] — [Customer Name] */}
                  <div>
                    <h4 className="font-black text-white text-sm leading-snug group-hover:text-amber-200 transition line-clamp-1 drop-shadow-xs">
                      {displayAddress} — {j.clientName}
                    </h4>
                    <p className="text-xs text-white/80 mt-0.5 line-clamp-1 font-medium">
                      {j.title}
                    </p>
                  </div>

                  {/* Inspections Breakdown */}
                  {isInspection ? (
                    <div className="p-2.5 bg-black/40 rounded-xl border border-white/15 space-y-1 text-xs text-white">
                      <div className="flex justify-between text-white/80">
                        <span>Customer:</span>
                        <strong className="text-white">{j.clientName}</strong>
                      </div>
                      <div className="flex justify-between text-white/80">
                        <span>Date & Time:</span>
                        <strong className="text-amber-300 font-mono">{formatMDY(j.inspectionDate || j.startDate)} at {j.inspectionTime || '10:00 AM'}</strong>
                      </div>
                      <div className="flex justify-between text-white/80">
                        <span>Company:</span>
                        <span className="text-white/90 truncate max-w-[150px]">{j.companyName || companySettings?.companyName || 'ABC Construction'}</span>
                      </div>
                      <div className="flex justify-between text-white/80">
                        <span>Assigned Inspector:</span>
                        <span className="text-sky-300 font-bold">
                          {assignedWorkerProfiles.length > 0 ? assignedWorkerProfiles.map(w => w.name).join(', ') : 'Unassigned'}
                        </span>
                      </div>
                      <div className="flex justify-between text-white/80 pt-0.5 border-t border-white/10">
                        <span>Inspection Fee:</span>
                        <strong className="text-emerald-300 font-mono">${j.inspectionFee || 150} Paid</strong>
                      </div>
                    </div>
                  ) : isOpenJob ? (
                    /* Open Job Breakdown */
                    <div className="p-2.5 bg-black/40 rounded-xl border border-white/15 space-y-1 text-xs text-white">
                      <div className="flex justify-between text-white/80">
                        <span>Offered Budget:</span>
                        <strong className="text-emerald-300 font-mono">${(j.offeredPrice || j.jobValue || 2500).toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between text-white/80">
                        <span>Expected Start:</span>
                        <strong className="text-white font-mono">{formatMDY(j.expectedStartDate || j.startDate)}</strong>
                      </div>
                      {isOpenJobUnaccepted && (
                        <div className="text-[10px] text-amber-300 flex items-center gap-1 font-mono pt-0.5">
                          <EyeOff className="w-3 h-3" /> Address disclosed upon acceptance
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Active / Standard Job Info */
                    <div className="space-y-1.5 text-xs text-white/80 bg-black/40 p-2.5 rounded-xl border border-white/15">
                      <p className="line-clamp-2 text-white/90 text-[11px] leading-relaxed">
                        {j.description}
                      </p>
                      {totalTasks > 0 && (
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[10px] font-mono text-white/90">
                            <span>Checklist ({completedTasks}/{totalTasks})</span>
                            <span className="text-sky-300 font-bold">{progressPct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
                            <div className="h-full bg-sky-400" style={{ width: `${progressPct}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Action Trigger */}
                <div className="pt-2 border-t border-white/15 flex items-center justify-between text-xs font-black text-white group-hover:text-amber-200">
                  <span>{isInspection ? 'Open Inspection Workspace →' : isOpenJob ? 'Review Open Job & Bid →' : 'View Job Details Popup →'}</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
