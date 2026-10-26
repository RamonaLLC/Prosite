import React, { useState } from 'react';
import { Job, WorkerProfile, ExpensePurchase, AppNotification } from '../types';
import { 
  TrendingUp, DollarSign, Calendar, Star, Users, Clock, 
  CheckCircle, ArrowUpRight, BarChart3, PieChart, Activity
} from 'lucide-react';

interface ReportingAnalyticsProps {
  jobs: Job[];
  workers: WorkerProfile[];
  expenses: ExpensePurchase[];
  notifications: AppNotification[];
  userRole?: 'company' | 'manager' | 'admin';
  onSelectJob?: (job: Job) => void;
}

export default function ReportingAnalytics({
  jobs,
  workers,
  expenses,
  notifications,
  userRole = 'company',
  onSelectJob
}: ReportingAnalyticsProps) {
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>('all');
  const isManager = userRole === 'manager';

  // 1. Helper calculations
  const totalIncurredCost = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalOngoingValue = jobs.reduce((sum, j) => sum + (j.jobValue || 24000), 0);
  
  // Jobs count details
  const activeCount = jobs.filter(j => j.status === 'in-progress').length;
  const completedCount = jobs.filter(j => j.status === 'completed').length;
  const planningCount = jobs.filter(j => j.status === 'planning').length;

  // Bid & Offer Stats
  const offersAccepted = 14;
  const offersDenied = 3;
  const inspectionsCompleted = 28;
  const schedulingEfficiencyPct = 96.4;

  // Filtered jobs array
  const filteredJobs = selectedJobFilter === 'all' 
    ? jobs 
    : jobs.filter(j => j.id === selectedJobFilter);

  // Compute stats per job
  const jobStats = filteredJobs.map(job => {
    // Estimations
    const start = new Date(job.startDate + 'T00:00:00');
    const end = new Date(job.endDate + 'T00:00:00');
    const estimatedDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);

    // Actual Days Worked (Green dots)
    const actualDaysWorked = Object.values(job.workDayLogs || {}).filter(dayLog => dayLog.worked).length;

    // Expenses
    const jobExpensesList = expenses.filter(e => e.jobId === job.id);
    const jobCost = jobExpensesList.reduce((sum, e) => sum + e.amount, 0);

    // Review Score
    const rating = job.review ? job.review.rating : null;

    return {
      id: job.id,
      title: job.title,
      clientName: job.clientName,
      status: job.status,
      estimatedDays,
      actualDaysWorked,
      totalExpenses: jobCost,
      rating,
      expensesByCategory: {
        Materials: jobExpensesList.filter(e => e.category === 'Materials').reduce((s, e) => s + e.amount, 0),
        Fuel: jobExpensesList.filter(e => e.category === 'Fuel').reduce((s, e) => s + e.amount, 0),
        Tools: jobExpensesList.filter(e => e.category === 'Tools').reduce((s, e) => s + e.amount, 0),
        Permits: jobExpensesList.filter(e => e.category === 'Permits').reduce((s, e) => s + e.amount, 0),
        Other: jobExpensesList.filter(e => e.category === 'Other').reduce((s, e) => s + e.amount, 0),
      }
    };
  });

  // Calculate global averages
  const completedWithReviews = jobs.filter(j => j.status === 'completed' && j.review);
  const averageReviewScore = completedWithReviews.length > 0
    ? (completedWithReviews.reduce((sum, j) => sum + (j.review?.rating || 0), 0) / completedWithReviews.length).toFixed(1)
    : '5.0';

  // 2. Compute Worker performance
  const workerStats = workers.map(w => {
    const workerExpenses = expenses.filter(e => e.workerId === w.id);
    const totalExpensesLogged = workerExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    // Check-in counts from notifications db
    const checkInsList = notifications.filter(n => n.workerId === w.id && n.type === 'check-in');
    const checkOutsList = notifications.filter(n => n.workerId === w.id && n.type === 'check-out');

    return {
      id: w.id,
      name: w.name,
      avatar: w.avatar,
      position: w.position,
      totalCheckIns: checkInsList.length + (w.isAtJob ? 1 : 0), // Include live check-in
      totalCheckOuts: checkOutsList.length,
      totalExpensesLogged,
      isAtJob: w.isAtJob,
      lastCheckInAt: w.lastCheckInAt
    };
  });

  // Category summary sums
  const sumByCategory = {
    Materials: expenses.filter(e => e.category === 'Materials').reduce((s, e) => s + e.amount, 0),
    Fuel: expenses.filter(e => e.category === 'Fuel').reduce((s, e) => s + e.amount, 0),
    Tools: expenses.filter(e => e.category === 'Tools').reduce((s, e) => s + e.amount, 0),
    Permits: expenses.filter(e => e.category === 'Permits').reduce((s, e) => s + e.amount, 0),
    Other: expenses.filter(e => e.category === 'Other').reduce((s, e) => s + e.amount, 0),
  };

  return (
    <div className="space-y-6">
      {/* Filters and Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 border border-slate-200 rounded-xl shadow-xs gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5.5 h-5.5 text-blue-650" />
            Reporting & Performance Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Track estimate deviation ratios, worker site attendance, and material costs breakdown.</p>
        </div>

        {/* Job selector tab filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-505 font-bold">Select Scope Filter:</span>
          <select
            value={selectedJobFilter}
            onChange={(e) => setSelectedJobFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 hover:border-slate-350 px-3 py-1.5 rounded-lg text-slate-800 font-bold cursor-pointer outline-none transition"
          >
            <option value="all">ALL SITE LOCATIONS</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.title.split(' ')[0]} - {j.clientName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-650 rounded-lg shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Operational Ratio</span>
            <span className="text-lg font-black text-slate-900 block leading-tight">
              {activeCount} Active / {jobs.length} Sites
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Over {planningCount} in schedule pipeline</span>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center gap-3">
          <div className={`p-3 rounded-lg shrink-0 ${isManager ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {isManager ? <Activity className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">
              {isManager ? 'Dispatch Efficiency' : 'Audit Cost Total'}
            </span>
            <span className="text-lg font-black text-slate-900 block leading-tight">
              {isManager ? (
                `${schedulingEfficiencyPct}%`
              ) : (
                `$${(selectedJobFilter === 'all' 
                  ? totalIncurredCost 
                  : expenses.filter(e => e.jobId === selectedJobFilter).reduce((s, e) => s + e.amount, 0)).toLocaleString()}`
              )}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {isManager 
                ? 'Travel & Buffer compliance rate'
                : `Across ${expenses.filter(e => selectedJobFilter === 'all' ? true : e.jobId === selectedJobFilter).length} transactions`}
            </span>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-500 rounded-lg shrink-0">
            <Star className="w-5 h-5 fill-amber-400 stroke-amber-500" />
          </div>
          <div>
            <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Client satisfaction</span>
            <span className="text-lg font-black text-slate-900 block leading-tight">
              {averageReviewScore} / 5.0
            </span>
            <span className="text-[10px] text-slate-405 font-medium">{completedWithReviews.length} client reviews posted</span>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Site Check-In Count</span>
            <span className="text-lg font-black text-slate-900 block leading-tight">
              {notifications.filter(n => n.type === 'check-in').length} Entries
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">{workers.filter(w => w.isAtJob).length} crews currently at site</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Layout Component */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 1: Estimate Ends vs Actual Days worked (Grouped Bar Chart) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4.5 h-4.5 text-blue-650" />
                Job Completion Estimate vs. Actual Worked Days
              </h3>
              <p className="text-[11px] text-slate-500">Scheduled days (estimate duration) compared against actual checked-in field worked days (green dots).</p>
            </div>
            
            <div className="flex gap-4 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-slate-500">
                <span className="w-2.5 h-2.5 bg-blue-150 rounded" /> Scheduled Estimate
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded" /> Actual Days Worked
              </span>
            </div>
          </div>

          {/* Render beautiful custom robust SVG chart */}
          <div className="h-68 w-full border border-slate-100 rounded-lg bg-slate-50/50 p-4 relative flex flex-col justify-between">
            {/* SVG Bars container */}
            <div className="flex-1 flex items-end justify-around pb-6 pt-3 px-2 gap-4">
              {jobStats.map((item, idx) => {
                const maxVal = Math.max(...jobStats.map(s => Math.max(s.estimatedDays, s.actualDaysWorked)), 8);
                const estHeight = `${Math.round((item.estimatedDays / maxVal) * 100)}%`;
                const actHeight = `${Math.round((item.actualDaysWorked / maxVal) * 100)}%`;

                return (
                  <div key={item.id} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* The double bars */}
                    <div className="flex items-end gap-1.5 w-full max-w-[50px] h-full justify-center">
                      {/* Estimate Bar */}
                      <div 
                        className="bg-blue-200 hover:bg-blue-300 w-4.5 rounded-t-sm transition-all relative flex justify-center text-[9px] text-blue-800 font-mono font-bold" 
                        style={{ height: estHeight }}
                      >
                        <span className="absolute -top-4 opacity-0 group-hover:opacity-100 bg-slate-900 text-white p-1 rounded text-[8px] tracking-wider transition font-black whitespace-nowrap z-10 font-mono shadow-md">
                          Est: {item.estimatedDays} days
                        </span>
                      </div>

                      {/* Actual worked days bar */}
                      <div 
                        className="bg-emerald-500 hover:bg-emerald-650 w-4.5 rounded-t-sm transition-all relative flex justify-center text-[10px] text-white font-mono font-bold shadow-xs" 
                        style={{ height: actHeight }}
                      >
                        <span className="absolute -top-4 opacity-0 group-hover:opacity-100 bg-slate-900 text-white p-1 rounded text-[8px] tracking-wider transition font-black whitespace-nowrap z-10 font-mono shadow-md">
                          Worked: {item.actualDaysWorked} days
                        </span>
                      </div>
                    </div>

                    {/* Value tags */}
                    <div 
                      onClick={() => {
                        const targetJob = jobs.find(j => j.id === item.id);
                        if (targetJob && onSelectJob) onSelectJob(targetJob);
                      }}
                      className="mt-2 text-center cursor-pointer group-hover:opacity-100 transition"
                      title="Click to view job details in modal"
                    >
                      <span className="text-[10px] font-bold text-slate-800 block truncate max-w-[110px] group-hover:text-blue-600 underline decoration-dotted">{item.title}</span>
                      <span className="text-[9px] text-slate-400 block font-semibold">{item.clientName}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grid helper lines overlay background */}
            <div className="absolute inset-x-4 bottom-14 h-48 border-b border-dashed border-slate-200 pointer-events-none flex flex-col justify-between text-[8px] font-mono text-slate-400">
              <div className="border-t border-dashed border-slate-100 w-full pt-0.5">Top Capacity</div>
              <div className="border-t border-dashed border-slate-100 w-full pt-0.5">Normal Spacing</div>
              <div className="w-full">Baseline Zero</div>
            </div>
          </div>
        </div>

        {/* Chart 2: Category Cost breakdown circular/pie representations */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <PieChart className="w-4.5 h-4.5 text-blue-650" />
              Expenses Cost Allocation Breakdown
            </h3>
            <p className="text-[11px] text-slate-500">Distribution across supply hardware and permits categories.</p>
          </div>

          <div className="space-y-3.5">
            {/* Cost Progress indicator items */}
            {Object.entries(selectedJobFilter === 'all' ? sumByCategory : jobStats[0]?.expensesByCategory || {}).map(([category, sum]) => {
              const totalSelected = selectedJobFilter === 'all' 
                ? totalIncurredCost 
                : expenses.filter(e => e.jobId === selectedJobFilter).reduce((s, e) => s + e.amount, 0);
              const percentage = totalSelected > 0 ? Math.round((sum / totalSelected) * 100) : 0;

              let color = 'bg-blue-600';
              let textColor = 'text-blue-650';
              if (category === 'Fuel') { color = 'bg-amber-500'; textColor = 'text-amber-600'; }
              if (category === 'Tools') { color = 'bg-emerald-500'; textColor = 'text-emerald-600'; }
              if (category === 'Permits') { color = 'bg-purple-500'; textColor = 'text-purple-600'; }
              if (category === 'Other') { color = 'bg-slate-450'; textColor = 'text-slate-500'; }

              return (
                <div key={category} className="space-y-1 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-extrabold text-slate-700 uppercase tracking-wider">{category === 'Fuel' ? 'Travel & Fuel 🚗' : category}</span>
                    <div className="font-mono space-x-1">
                      <span className="font-black text-slate-900 font-sans">${sum.toLocaleString()}</span>
                      <span className={`text-[10px] font-bold ${textColor}`}>({percentage}%)</span>
                    </div>
                  </div>
                  
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: color === 'bg-blue-600' ? '#2563eb' : color === 'bg-amber-500' ? '#f59e0b' : color === 'bg-emerald-500' ? '#10b981' : color === 'bg-purple-500' ? '#a855f7' : '#64748b' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Bottom detailed statistics ledger split: Reviews analysis and Worker attendance logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Side Panel: Customer Reviews list breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Star className="w-4.5 h-4.5 fill-amber-400 stroke-amber-500" />
              Homeowner Review Feed Scores
            </h3>
            <p className="text-[11px] text-slate-500">Verified platform feedback logged by our direct homeowner clients.</p>
          </div>

          <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
            {jobs.filter(j => j.review).length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">No client satisfaction reviews posted yet.</p>
            ) : (
              jobs.filter(j => j.review).map((j) => (
                <div 
                  key={j.id} 
                  onClick={() => onSelectJob?.(j)}
                  className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-blue-400 rounded-xl space-y-2 text-xs cursor-pointer transition"
                  title="Click to view full job details in popup modal"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <strong className="text-slate-800 text-sm block hover:text-blue-600 underline decoration-dotted">{j.title.split(' ')[0]} Remodel</strong>
                      <span className="text-[10px] text-slate-405 font-medium">Homeowner: {j.clientName}</span>
                    </div>
                    <span className="text-[10.5px] text-slate-400 font-mono font-medium">{j.review?.createdAt}</span>
                  </div>

                  <div className="flex text-amber-500 gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= (j.review?.rating || 0) ? 'fill-current' : 'text-slate-200'}`} />
                    ))}
                  </div>

                  <p className="text-slate-650 italic text-[11.5px] leading-relaxed">"{j.review?.comment}"</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side Panel: Worker Site check-in consistency & cost registry audit */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Users className="w-4.5 h-4.5 text-blue-650" />
              Field Crews Site Attendance & Cost Registry
            </h3>
            <p className="text-[11px] text-slate-500">Track worker check-in events, active operations state, and total material budget incurred.</p>
          </div>

          <div className="space-y-3">
            {workerStats.map((work) => (
              <div key={work.id} className="p-3 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl transition flex items-center justify-between gap-3 text-xs">
                
                {/* Profile */}
                <div className="flex items-center gap-2.5">
                  <img src={work.avatar} alt={work.name} className="w-9 h-9 rounded-full object-cover border border-slate-250 bg-white" />
                  <div>
                    <h4 className="font-extrabold text-slate-800 leading-none">{work.name}</h4>
                    <span className="text-[10px] text-slate-450 font-medium block mt-1">{work.position}</span>
                  </div>
                </div>

                {/* Performance stats */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right font-mono">
                  <div>
                    <span className="text-[9px] text-slate-450 block uppercase tracking-wider font-sans font-bold">Total Check-ins</span>
                    <span className="text-slate-800 font-black text-xs">{work.totalCheckIns} Shifts</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-450 block uppercase tracking-wider font-sans font-bold">
                      {isManager ? 'Active Status' : 'Logged Costs'}
                    </span>
                    <span className="text-blue-600 font-black text-xs">
                      {isManager ? (work.isAtJob ? 'On-Site Active' : 'Available') : `$${work.totalExpensesLogged.toLocaleString()}`}
                    </span>
                  </div>
                </div>

                {/* Status indicator badge */}
                <div className="text-right">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold ${
                    work.isAtJob 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-250' 
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${work.isAtJob ? 'bg-emerald-500 shadow-md' : 'bg-slate-400'}`} />
                    {work.isAtJob ? 'AT SITE' : 'OFFLINE'}
                  </span>
                  
                  {work.isAtJob && work.lastCheckInAt && (
                    <span className="text-[9px] text-slate-400 font-mono font-medium block mt-0.5">
                      Since {new Date(work.lastCheckInAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </span>
                  )}
                </div>

              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
