import React, { useState } from 'react';
import { 
  Job, Role, JobOffer, InspectionRequest, 
  ChangeOrder, WorkerProfile, CompanySettings 
} from '../types';
import { 
  Briefcase, CheckCircle2, Clock, Calendar, DollarSign, 
  FileText, AlertTriangle, ArrowRight, Eye, Plus, 
  Search, Filter, ChevronRight, User, MapPin, X, 
  Image as ImageIcon, Sparkles, Check, HardHat, Shield
} from 'lucide-react';
import { formatMDY } from '../utils/dateFormatter';
import { getJobCardBgClass, getJobStatusBadge } from '../utils/jobStatusHelper';

interface UnifiedJobsHubProps {
  role: Role; // 'customer' | 'client' | 'company' | 'admin' | 'manager'
  jobs: Job[];
  workers: WorkerProfile[];
  companySettings?: CompanySettings;
  onUpdateJobs: (updated: Job[]) => void;
  onSelectJob: (job: Job) => void;
  onOpenPendingRequests?: () => void;
  onOpenCreateJob?: () => void;
  onOpenDispatch?: () => void;
  onSendNotification?: (title: string, message: string, type: any, jobId?: string) => void;
}

export const UnifiedJobsHub: React.FC<UnifiedJobsHubProps> = ({
  role,
  jobs,
  workers,
  companySettings,
  onUpdateJobs,
  onSelectJob,
  onOpenPendingRequests,
  onOpenCreateJob,
  onOpenDispatch,
  onSendNotification
}) => {
  const isCustomer = role === 'customer' || role === 'client';
  const isCompanyOrManager = role === 'company' || role === 'admin' || role === 'manager';

  // Sub-section filters
  const [activeSection, setActiveSection] = useState<string>('active');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Gallery enlargement modal
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  // Groupings:
  // 1. Active Jobs
  const activeJobs = jobs.filter(j => j.status === 'in-progress');
  
  // 2. Open Jobs / Listings
  const openJobs = jobs.filter(j => j.status === 'open-bid' || j.status === 'pending');

  // 3. Job Offers (sent or received)
  const allJobOffers: { job: Job; offer: JobOffer }[] = [];
  jobs.forEach(j => {
    if (j.jobOffers) {
      j.jobOffers.forEach(o => {
        allJobOffers.push({ job: j, offer: o });
      });
    }
  });

  // 4. Pending Inspections
  const pendingInspections = jobs.filter(j => 
    j.inspectionStatus === 'proposed' || 
    j.inspectionStatus === 'scheduled' || 
    (j.inspectionRequest && j.inspectionRequest.status === 'pending')
  );

  // 5. Change Orders
  const allChangeOrders: { job: Job; changeOrder: ChangeOrder }[] = [];
  jobs.forEach(j => {
    if (j.changeOrders) {
      j.changeOrders.forEach(co => {
        allChangeOrders.push({ job: j, changeOrder: co });
      });
    }
  });

  // 6. Completed Jobs / Job History
  const completedJobs = jobs.filter(j => j.status === 'completed');

  // Customer sections vs Company sections
  const sections = isCustomer ? [
    { id: 'active', label: 'Active Jobs', count: activeJobs.length, color: 'text-emerald-400', badgeBg: 'bg-emerald-500/20 text-emerald-300' },
    { id: 'open', label: 'Open Jobs', count: openJobs.length, color: 'text-blue-400', badgeBg: 'bg-blue-500/20 text-blue-300' },
    { id: 'offers', label: 'Job Offers', count: allJobOffers.length, color: 'text-amber-400', badgeBg: 'bg-amber-500/20 text-amber-300' },
    { id: 'inspections', label: 'Pending Inspections', count: pendingInspections.length, color: 'text-indigo-400', badgeBg: 'bg-indigo-500/20 text-indigo-300' },
    { id: 'history', label: 'Job History', count: completedJobs.length, color: 'text-slate-400', badgeBg: 'bg-slate-700/50 text-slate-300' },
  ] : [
    { id: 'active', label: 'Active Jobs', count: activeJobs.length, color: 'text-emerald-400', badgeBg: 'bg-emerald-500/20 text-emerald-300' },
    { id: 'open', label: 'Open Job Listings', count: openJobs.length, color: 'text-blue-400', badgeBg: 'bg-blue-500/20 text-blue-300' },
    { id: 'offers', label: 'Job Offers', count: allJobOffers.length, color: 'text-amber-400', badgeBg: 'bg-amber-500/20 text-amber-300' },
    { id: 'inspections', label: 'Pending Inspections', count: pendingInspections.length, color: 'text-indigo-400', badgeBg: 'bg-indigo-500/20 text-indigo-300' },
    { id: 'change_orders', label: 'Change Orders', count: allChangeOrders.length, color: 'text-purple-400', badgeBg: 'bg-purple-500/20 text-purple-300' },
    { id: 'history', label: 'Job History', count: completedJobs.length, color: 'text-slate-400', badgeBg: 'bg-slate-700/50 text-slate-300' },
  ];

  // Helper filter
  const filterList = (list: Job[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(j => 
      j.title.toLowerCase().includes(q) || 
      j.address.toLowerCase().includes(q) || 
      j.clientName.toLowerCase().includes(q)
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Centralized Jobs Hub Header */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2.5">
                Centralized Jobs Hub
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-bold border border-slate-700">
                  {isCustomer ? 'Customer Portal' : 'Contractor Command'}
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Consolidated management for all active jobs, bids, offers, inspections, and project history
              </p>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {isCustomer && onOpenCreateJob && (
            <button
              onClick={onOpenCreateJob}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg transition cursor-pointer w-full md:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              Post New Project
            </button>
          )}

          {isCompanyOrManager && onOpenPendingRequests && (
            <button
              onClick={onOpenPendingRequests}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg transition cursor-pointer w-full md:w-auto justify-center"
            >
              <Clock className="w-4 h-4" />
              Pending Requests Inbox
            </button>
          )}
        </div>
      </div>

      {/* Large visual status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {sections.map(sec => {
          const isSelected = activeSection === sec.id;
          return (
            <div
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected 
                  ? 'bg-slate-800 border-blue-500 ring-2 ring-blue-500/40 shadow-lg' 
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <span className="text-[11px] font-bold text-slate-400 truncate">
                {sec.label}
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className={`text-2xl font-black font-mono ${sec.color}`}>
                  {sec.count}
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${sec.badgeBg}`}>
                  {sec.count === 1 ? '1 Item' : `${sec.count} Items`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${sections.find(s => s.id === activeSection)?.label || 'jobs'} by title, address, or customer...`}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-inner"
        />
      </div>

      {/* ========================================================================= */}
      {/* SECTION CONTENTS */}
      {/* ========================================================================= */}

      {/* 1. ACTIVE JOBS */}
      {activeSection === 'active' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              Active Construction Jobs ({activeJobs.length})
            </h3>
            {isCompanyOrManager && onOpenDispatch && (
              <button
                onClick={onOpenDispatch}
                className="text-xs text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                Go to Employee & Dispatch Matrix
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {filterList(activeJobs).length === 0 ? (
            <div className="text-center py-12 bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
              No active jobs matching your search criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filterList(activeJobs).map(job => {
                const badge = getJobStatusBadge(job);
                return (
                  <div
                    key={job.id}
                    onClick={() => onSelectJob(job)}
                    className={`p-5 rounded-2xl transition-all shadow-md flex flex-col justify-between group cursor-pointer ${getJobCardBgClass(job)}`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className={badge.badgeClass}>
                          {badge.label}
                        </span>
                        <span className="text-sm font-mono font-black text-amber-300 bg-black/30 px-2 py-0.5 rounded">
                          ${job.jobValue?.toLocaleString() || '24,000'}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-white group-hover:text-amber-200 transition">
                          {job.title}
                        </h4>
                        <p className="text-xs text-white/80 flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-white/60" />
                          {job.address}
                        </p>
                      </div>

                      <p className="text-xs text-white/90 line-clamp-2">
                        {job.description}
                      </p>

                      {/* Progress */}
                      <div className="space-y-1 bg-black/30 p-2.5 rounded-xl border border-white/10">
                        <div className="flex justify-between text-[11px] font-mono text-white/80">
                          <span>Milestone Progress</span>
                          <span className="text-emerald-300 font-bold">
                            {job.checklist && job.checklist.length > 0
                              ? Math.round((job.checklist.filter(c => c.status === 'completed').length / job.checklist.length) * 100)
                              : 45}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-400 rounded-full" 
                            style={{ 
                              width: `${job.checklist && job.checklist.length > 0
                                ? Math.round((job.checklist.filter(c => c.status === 'completed').length / job.checklist.length) * 100)
                                : 45}%` 
                            }} 
                          />
                        </div>
                      </div>

                      {/* Assigned Employees */}
                      <div className="pt-2 border-t border-white/15 flex items-center justify-between text-xs text-white/80">
                        <div className="flex items-center gap-1.5">
                          <HardHat className="w-3.5 h-3.5 text-amber-300" />
                          <span>{job.assignedWorkers?.length || 0} Assigned</span>
                        </div>
                        <span className="text-[11px] font-mono">
                          Client: <strong className="text-white">{job.clientName}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectJob(job);
                        }}
                        className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Job Details (Modal)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. OPEN JOBS */}
      {activeSection === 'open' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            Open Job Listings & Bid Requests ({openJobs.length})
          </h3>

          {filterList(openJobs).length === 0 ? (
            <div className="text-center py-12 bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
              No open job postings currently available.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filterList(openJobs).map(job => (
                <div
                  key={job.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/60 transition shadow-md flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 uppercase">
                        Open For Bids
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        Budget: {job.jobValue ? `$${job.jobValue.toLocaleString()}` : 'Flexible'}
                      </span>
                    </div>

                    <h4 className="text-base font-black text-white">
                      {job.title}
                    </h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {job.address}
                    </p>
                    <p className="text-xs text-slate-300">
                      {job.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => onSelectJob(job)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Review & Bid
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. JOB OFFERS */}
      {activeSection === 'offers' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            Job Offers & Counter Bids ({allJobOffers.length})
          </h3>

          {allJobOffers.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
              No active job offers or proposals recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {allJobOffers.map(({ job, offer }) => (
                <div
                  key={offer.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 uppercase">
                        {offer.status}
                      </span>
                      <span className="text-sm font-mono font-black text-white">
                        ${offer.proposedPrice?.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        From: {offer.senderName} ({offer.senderRole})
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-white">{offer.jobTitle}</h5>
                    <p className="text-xs text-slate-300">{offer.scopeSummary}</p>
                  </div>

                  <button
                    onClick={() => onSelectJob(job)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 self-end sm:self-auto cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Open Offer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. PENDING INSPECTIONS */}
      {activeSection === 'inspections' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
            Inspection Requests ({pendingInspections.length})
          </h3>

          {pendingInspections.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
              No pending inspection requests currently recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingInspections.map(job => (
                <div
                  key={job.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 uppercase">
                        {job.inspectionStatus || 'Pending Inspection'}
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        Fee: ${job.inspectionFee || 150} (Paid)
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-white">{job.title}</h5>
                    <p className="text-xs text-slate-400">{job.address}</p>
                    <p className="text-[11px] font-mono text-amber-300">
                      Slot: {job.inspectionDate || '2026-06-25'} at {job.inspectionTime || '10:00 AM'}
                    </p>
                  </div>

                  <button
                    onClick={() => onSelectJob(job)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 self-end sm:self-auto cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Inspect Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. CHANGE ORDERS (COMPANY ONLY) */}
      {activeSection === 'change_orders' && isCompanyOrManager && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
            Active Change Orders ({allChangeOrders.length})
          </h3>

          {allChangeOrders.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
              No change orders currently submitted.
            </div>
          ) : (
            <div className="space-y-3">
              {allChangeOrders.map(({ job, changeOrder }) => (
                <div
                  key={changeOrder.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 uppercase">
                        {changeOrder.status}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-400">
                        +${changeOrder.costImpact.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        +{changeOrder.timeImpactDays} Days
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-white">{changeOrder.title}</h5>
                    <p className="text-xs text-slate-300">{changeOrder.description}</p>
                  </div>

                  <button
                    onClick={() => onSelectJob(job)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Review Scope
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. JOB HISTORY (COMPLETED JOBS WITH PICTURE ENLARGEMENT) */}
      {activeSection === 'history' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            Completed Job History & Gallery ({completedJobs.length})
          </h3>

          {filterList(completedJobs).length === 0 ? (
            <div className="text-center py-12 bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
              No completed jobs in history.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filterList(completedJobs).map(job => (
                <div
                  key={job.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-bold border border-emerald-500/30 uppercase flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Completed Project
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Closed: {job.completedAt || 'Recent'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-white">{job.title}</h4>
                    <p className="text-xs text-slate-400">{job.address}</p>
                  </div>

                  {/* Completed Project Gallery with Click-to-Enlarge */}
                  {job.beforeAfterPhotos && job.beforeAfterPhotos.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      <span className="text-[10px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        Completed Project Gallery (Click to Enlarge)
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {job.beforeAfterPhotos.slice(0, 3).map((photo, i) => {
                          const imgUrl = photo.afterImage || photo.beforeImage;
                          if (!imgUrl) return null;
                          return (
                            <div
                              key={photo.id || i}
                              onClick={() => setEnlargedImage(imgUrl)}
                              className="aspect-video rounded-lg overflow-hidden border border-slate-700 bg-slate-950 cursor-pointer hover:border-blue-400 transition group relative"
                            >
                              <img
                                src={imgUrl}
                                alt={photo.title || 'Project photo'}
                                className="w-full h-full object-cover group-hover:scale-105 transition"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => onSelectJob(job)}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Archival Record
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PICTURE ENLARGEMENT MODAL */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in cursor-pointer"
          onClick={() => setEnlargedImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={enlargedImage}
              alt="Enlarged completed project preview"
              className="w-full h-auto max-h-[85vh] object-contain"
            />
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/80 text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
