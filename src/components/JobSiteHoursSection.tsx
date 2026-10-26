import React, { useState } from 'react';
import { WorkerProfile, Job, JobSiteTimeLog } from '../types';
import { 
  Clock, Calendar, Users, Briefcase, Filter, 
  ChevronRight, BarChart2, TrendingUp, Search
} from 'lucide-react';
import { renderColoredJobDate } from '../utils/dateFormatter';

interface JobSiteHoursSectionProps {
  workers: WorkerProfile[];
  jobs: Job[];
  userRole: 'company' | 'manager' | 'admin';
}

export default function JobSiteHoursSection({
  workers,
  jobs,
  userRole
}: JobSiteHoursSectionProps) {
  const [filterPeriod, setFilterPeriod] = useState<'30days' | 'weekly' | 'biweekly' | 'monthly' | 'custom'>('30days');
  const [customStartDate, setCustomStartDate] = useState('2026-05-24');
  const [customEndDate, setCustomEndDate] = useState('2026-06-22');
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState<string>('all');
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>('all');

  // Realistic mock job site session data
  const mockTimeLogs: JobSiteTimeLog[] = [
    {
      id: 'log-1',
      workerId: 'w1',
      workerName: 'Luis Alvarez',
      jobId: 'job-1',
      jobTitle: 'Kitchen Remodel & Cabinetry Reconstruction',
      jobAddress: '425 Grandview Dr, San Francisco',
      date: '2026-06-22',
      arrivalTime: '08:00 AM',
      departureTime: '04:30 PM',
      hours: 8.5
    },
    {
      id: 'log-2',
      workerId: 'w1',
      workerName: 'Luis Alvarez',
      jobId: 'job-1',
      jobTitle: 'Kitchen Remodel & Cabinetry Reconstruction',
      jobAddress: '425 Grandview Dr, San Francisco',
      date: '2026-06-21',
      arrivalTime: '08:00 AM',
      departureTime: '04:00 PM',
      hours: 8.0
    },
    {
      id: 'log-3',
      workerId: 'w3',
      workerName: 'Devin Jenkins',
      jobId: 'job-2',
      jobTitle: 'Modern Backyard Cedar Deck Extension',
      jobAddress: '425 Grandview Dr, San Francisco',
      date: '2026-06-22',
      arrivalTime: '08:15 AM',
      departureTime: '03:45 PM',
      hours: 7.5
    },
    {
      id: 'log-4',
      workerId: 'w3',
      workerName: 'Devin Jenkins',
      jobId: 'job-2',
      jobTitle: 'Modern Backyard Cedar Deck Extension',
      jobAddress: '425 Grandview Dr, San Francisco',
      date: '2026-06-21',
      arrivalTime: '08:30 AM',
      departureTime: '04:30 PM',
      hours: 8.0
    },
    {
      id: 'log-5',
      workerId: 'w2',
      workerName: 'Marcus Chen',
      jobId: 'job-1',
      jobTitle: 'Kitchen Remodel & Cabinetry Reconstruction',
      jobAddress: '425 Grandview Dr, San Francisco',
      date: '2026-06-20',
      arrivalTime: '07:30 AM',
      departureTime: '03:30 PM',
      hours: 8.0
    },
    {
      id: 'log-6',
      workerId: 'w2',
      workerName: 'Marcus Chen',
      jobId: 'job-3',
      jobTitle: 'Luxury Bathroom Marble Mosaic Tiling',
      jobAddress: '109 Pine St, San Francisco',
      date: '2026-06-17',
      arrivalTime: '08:00 AM',
      departureTime: '05:00 PM',
      hours: 9.0
    },
    {
      id: 'log-7',
      workerId: 'w2',
      workerName: 'Marcus Chen',
      jobId: 'job-3',
      jobTitle: 'Luxury Bathroom Marble Mosaic Tiling',
      jobAddress: '109 Pine St, San Francisco',
      date: '2026-06-16',
      arrivalTime: '08:00 AM',
      departureTime: '04:30 PM',
      hours: 8.5
    }
  ];

  // Filter logs based on filters
  const filteredLogs = mockTimeLogs.filter(log => {
    if (selectedWorkerFilter !== 'all' && log.workerId !== selectedWorkerFilter) return false;
    if (selectedJobFilter !== 'all' && log.jobId !== selectedJobFilter) return false;
    return true;
  });

  // Aggregations
  const totalSiteHours = filteredLogs.reduce((acc, log) => acc + log.hours, 0);

  // Group by worker
  const hoursByWorker = workers.map(w => {
    const workerLogs = filteredLogs.filter(l => l.workerId === w.id);
    const hours = workerLogs.reduce((sum, l) => sum + l.hours, 0);
    return { worker: w, hours, sessions: workerLogs.length };
  });

  // Group by job
  const hoursByJob = jobs.map(j => {
    const jobLogs = filteredLogs.filter(l => l.jobId === j.id);
    const hours = jobLogs.reduce((sum, l) => sum + l.hours, 0);
    return { job: j, hours, sessions: jobLogs.length };
  }).filter(item => item.hours > 0);

  return (
    <div className="space-y-6">
      
      {/* Header & Filter Controls */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 border border-blue-400/30 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                Job Site Hours & Field Verification
                {userRole === 'manager' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono font-normal">
                    Operational
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Track verified on-site hours logged by employees through geofence check-ins and field shifts.
              </p>
            </div>
          </div>

          {/* Quick Period Buttons */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              onClick={() => setFilterPeriod('30days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterPeriod === '30days'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Past 30 Days
            </button>
            <button
              onClick={() => setFilterPeriod('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterPeriod === 'weekly'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setFilterPeriod('biweekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterPeriod === 'biweekly'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Bi-Weekly
            </button>
            <button
              onClick={() => setFilterPeriod('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterPeriod === 'monthly'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setFilterPeriod('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterPeriod === 'custom'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Custom Range
            </button>
          </div>
        </div>

        {/* Custom Range Inputs if custom selected */}
        {filterPeriod === 'custom' && (
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center gap-4 text-xs animate-fade-in">
            <span className="font-mono text-slate-400 font-bold uppercase">Date Span:</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Start Date:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">End Date:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Filter by Worker & Job */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase font-mono">Filter by Employee</label>
            <select
              value={selectedWorkerFilter}
              onChange={(e) => setSelectedWorkerFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Employees ({workers.length})</option>
              {workers.map(w => (
                <option key={w.id} value={w.id}>{w.name} — {w.position}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase font-mono">Filter by Job Site</label>
            <select
              value={selectedJobFilter}
              onChange={(e) => setSelectedJobFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Job Sites ({jobs.length})</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.address} — {j.clientName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] font-mono uppercase text-blue-400 font-bold block">Total Job Site Hours</span>
          <span className="text-3xl font-black text-white font-mono">{totalSiteHours.toFixed(1)} <span className="text-sm text-slate-400 font-normal">hrs</span></span>
          <p className="text-[11px] text-slate-400">{filteredLogs.length} verified shift sessions</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] font-mono uppercase text-emerald-400 font-bold block">Average Shift Length</span>
          <span className="text-3xl font-black text-emerald-400 font-mono">
            {filteredLogs.length > 0 ? (totalSiteHours / filteredLogs.length).toFixed(1) : 0} <span className="text-sm text-slate-400 font-normal">hrs</span>
          </span>
          <p className="text-[11px] text-slate-400">Punctual arrival rate 98.4%</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] font-mono uppercase text-amber-400 font-bold block">Active Sites Covered</span>
          <span className="text-3xl font-black text-amber-400 font-mono">{hoursByJob.length} <span className="text-sm text-slate-400 font-normal">sites</span></span>
          <p className="text-[11px] text-slate-400">Full geofence coverage</p>
        </div>
      </div>

      {/* Hours by Employee & Hours by Job site */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Hours By Employee */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" /> Hours by Employee
          </h4>

          <div className="space-y-3">
            {hoursByWorker.map(({ worker, hours, sessions }) => (
              <div key={worker.id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img src={worker.avatar} alt={worker.name} className="w-9 h-9 rounded-full object-cover border border-slate-700" />
                  <div>
                    <span className="text-xs font-bold text-white block">{worker.name}</span>
                    <span className="text-[10px] text-slate-400">{worker.position} • {sessions} Shifts</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-white font-mono block">{hours.toFixed(1)} hrs</span>
                  <span className="text-[9px] text-emerald-400 font-mono font-bold">Verified</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hours By Job Site */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-emerald-400" /> Hours by Job Site
          </h4>

          <div className="space-y-3">
            {hoursByJob.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-950 rounded-xl">No job site hours recorded for this selection.</div>
            ) : (
              hoursByJob.map(({ job, hours, sessions }) => (
                <div key={job.id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">{job.address} — {job.clientName}</span>
                    <span className="text-[10px] text-slate-400 line-clamp-1">{job.title}</span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-emerald-400 font-mono block">{hours.toFixed(1)} hrs</span>
                    <span className="text-[10px] text-slate-400 font-mono">{sessions} shifts</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Detailed Shift Session History Log Table */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-400" /> Individual Shift Logs
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase font-mono text-slate-400">
                <th className="pb-2">Date</th>
                <th className="pb-2">Employee</th>
                <th className="pb-2">Job Address — Customer</th>
                <th className="pb-2">Arrival</th>
                <th className="pb-2">Departure</th>
                <th className="pb-2 text-right">Total Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-850/50 transition">
                  <td className="py-2.5 font-bold text-emerald-400">{renderColoredJobDate(log.date)}</td>
                  <td className="py-2.5 text-white font-sans font-semibold">{log.workerName}</td>
                  <td className="py-2.5 text-slate-300 font-sans">{log.jobAddress}</td>
                  <td className="py-2.5 text-slate-400">{log.arrivalTime}</td>
                  <td className="py-2.5 text-slate-400">{log.departureTime || 'Active'}</td>
                  <td className="py-2.5 text-right font-black text-white">{log.hours.toFixed(1)} hrs</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
