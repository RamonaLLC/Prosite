import React from 'react';

/**
 * Formats a date string (YYYY-MM-DD or ISO) into standard MONTH/DAY/YEAR (MM/DD/YYYY) format.
 * Adheres strictly to Requirement 27: Consistent Month/Day/Year display across the entire app.
 */
export function formatDMY(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const cleanDay = day.split('T')[0];
    return `${month}/${cleanDay}/${year}`;
  }
  // Fallback if it contains a timestamp
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    }
  } catch (e) {
    // Ignore
  }
  return dateStr;
}

/**
 * Formats date into standard MM/DD/YYYY.
 */
export function formatMDY(dateStr: string | undefined | null): string {
  return formatDMY(dateStr);
}

/**
 * Formats date and month in colors based on number of days from base simulated date '2026-06-22'
 * (Green if within 3 days, Orange if 4-7 days, Red if longer than 7 days) and keeps the year White.
 * Format is strictly MONTH/DAY/YEAR: MM/DD in color, /YYYY in white.
 */
export function renderColoredJobDate(startDateStr: string | undefined | null, customLabel?: string) {
  if (!startDateStr) return null;
  const parts = startDateStr.split('-');
  if (parts.length !== 3) {
    return <span className="text-white font-mono">{startDateStr}</span>;
  }

  const [year, month, rawDay] = parts;
  const day = rawDay.split('T')[0];
  const today = new Date('2026-06-22T00:00:00');
  const dStart = new Date(startDateStr + 'T00:00:00');
  
  // Calculate absolute difference in calendar days
  const diffTime = dStart.getTime() - today.getTime();
  const diffDays = Math.abs(Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  let colorClass = 'text-red-500 font-bold'; // Default if longer (> 7)
  if (diffDays <= 3) {
    colorClass = 'text-emerald-500 font-bold';
  } else if (diffDays >= 4 && diffDays <= 7) {
    colorClass = 'text-orange-500 font-bold';
  }

  return (
    <span className="font-mono bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-[11px] leading-none select-none inline-flex items-center gap-0.5 shadow-xs w-fit">
      {customLabel && <span className="text-[9px] text-slate-400 uppercase tracking-tight mr-0.5">{customLabel}:</span>}
      <span className={colorClass}>{month}/{day}</span>
      <span className="text-white">/{year}</span>
    </span>
  );
}

/**
 * Renders individual day logs inside day trackers with custom color scheme in MM/DD/YYYY:
 * Month/Day in color, Year in White.
 */
export function renderColoredDayLogDate(dayStr: string, activeJobStartStr: string) {
  const parts = dayStr.split('-');
  if (parts.length !== 3) {
    return <span className="text-white font-mono">{dayStr}</span>;
  }

  const [year, month, rawDay] = parts;
  const day = rawDay.split('T')[0];
  const today = new Date('2026-06-22T00:00:00');
  const dStart = new Date(activeJobStartStr + 'T00:00:00');
  
  const diffTime = dStart.getTime() - today.getTime();
  const diffDays = Math.abs(Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  let colorClass = 'text-red-500 font-bold';
  if (diffDays <= 3) {
    colorClass = 'text-emerald-500 font-bold';
  } else if (diffDays >= 4 && diffDays <= 7) {
    colorClass = 'text-orange-500 font-bold';
  }

  return (
    <span className="font-mono text-center">
      <span className={colorClass + " block text-[11px]"}>{month}/{day}</span>
      <span className="text-white block text-[9px]">/{year}</span>
    </span>
  );
}
