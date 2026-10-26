import { Job } from '../types';

export type CanonicalJobStatus = 'NOT STARTED' | 'ACTIVE' | 'COMPLETED';

/**
 * Derives the canonical status according to ProSite rules:
 * - COMPLETED: Job is marked finished/completed.
 * - ACTIVE: Job is in-progress AND the assigned worker has arrived at the job-site via geofence.
 * - NOT STARTED: Any other state (planning, awaiting start, assigned, open bid, or in-progress before geofence arrival).
 */
export function getCanonicalJobStatus(job: Job): CanonicalJobStatus {
  if (job.status === 'completed') {
    return 'COMPLETED';
  }
  // A job becomes ACTIVE only when the established job-site geofence detects an assigned employee at the job site
  if (job.status === 'in-progress' && (job.hasInitialGeofenceArrival || job.isActualStarted)) {
    return 'ACTIVE';
  }
  return 'NOT STARTED';
}

/**
 * Returns background and border Tailwind classes for job cards.
 * MANDATED:
 * - RED = NOT STARTED
 * - ORANGE = ACTIVE
 * - GREEN = COMPLETED
 * - NEVER use white backgrounds for job cards.
 */
export function getJobCardBgClass(job: Job): string {
  const status = getCanonicalJobStatus(job);
  switch (status) {
    case 'NOT STARTED':
      return 'bg-gradient-to-br from-red-950/95 via-rose-950/90 to-red-900/90 border-2 border-red-600/80 text-white hover:border-red-400 shadow-md';
    case 'ACTIVE':
      return 'bg-gradient-to-br from-amber-950/95 via-orange-950/90 to-amber-900/90 border-2 border-orange-500/80 text-white hover:border-orange-300 shadow-md';
    case 'COMPLETED':
      return 'bg-gradient-to-br from-emerald-950/95 via-green-950/90 to-teal-950/90 border-2 border-emerald-500/80 text-white hover:border-emerald-300 shadow-md';
  }
}

/**
 * Returns badge styling for canonical statuses.
 */
export function getJobStatusBadge(job: Job): { label: CanonicalJobStatus; badgeClass: string; iconColor: string } {
  const status = getCanonicalJobStatus(job);
  switch (status) {
    case 'NOT STARTED':
      return {
        label: 'NOT STARTED',
        badgeClass: 'bg-red-600 text-white font-black px-2.5 py-0.5 rounded-full text-[10px] tracking-wide uppercase border border-red-300 shadow-xs flex items-center gap-1',
        iconColor: 'text-white'
      };
    case 'ACTIVE':
      return {
        label: 'ACTIVE',
        badgeClass: 'bg-orange-500 text-white font-black px-2.5 py-0.5 rounded-full text-[10px] tracking-wide uppercase border border-orange-200 shadow-xs flex items-center gap-1',
        iconColor: 'text-white'
      };
    case 'COMPLETED':
      return {
        label: 'COMPLETED',
        badgeClass: 'bg-emerald-600 text-white font-black px-2.5 py-0.5 rounded-full text-[10px] tracking-wide uppercase border border-emerald-300 shadow-xs flex items-center gap-1',
        iconColor: 'text-white'
      };
  }
}
