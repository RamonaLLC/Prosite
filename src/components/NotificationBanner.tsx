import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Info, UserCheck, CreditCard, Star } from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationBannerProps {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
  onNotificationClick?: (notification: AppNotification) => void;
}

export default function NotificationBanner({ notifications, onDismiss, onNotificationClick }: NotificationBannerProps) {
  return (
    <div className="fixed top-4 right-4 z-55 max-w-sm w-full space-y-2 pointer-events-none">
      <AnimatePresence>
        {notifications.slice(0, 3).map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: -20, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 50, transition: { duration: 0.2 } }}
            onClick={() => {
              onDismiss(n.id);
              onNotificationClick?.(n);
            }}
            className="pointer-events-auto cursor-pointer bg-white border border-slate-200 p-4 rounded-xl shadow-xl hover:shadow-2xl hover:border-blue-400 transition-all flex items-start gap-3 border-l-4 border-l-blue-600 overflow-hidden relative group"
          >
            {/* Visual background ripple accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
              {n.type === 'check-in' || n.type === 'check-out' ? (
                <UserCheck className="w-4.5 h-4.5" />
              ) : n.type === 'expense' ? (
                <CreditCard className="w-4.5 h-4.5" />
              ) : n.type === 'review' ? (
                <Star className="w-4.5 h-4.5 fill-current text-amber-500" />
              ) : (
                <Bell className="w-4.5 h-4.5" />
              )}
            </div>

            <div className="flex-1 min-w-0 pr-4 space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
                <span>Push Site Alert</span>
                <span className="font-semibold text-blue-600">Just Now</span>
              </span>
              <h4 className="font-bold text-slate-900 text-xs leading-tight truncate group-hover:text-blue-600 transition-colors">{n.title}</h4>
              <p className="text-slate-600 text-[11px] leading-snug">{n.message}</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 pt-1">
                Click to open screen &rarr;
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(n.id);
              }}
              className="text-slate-400 hover:text-slate-600 transition shrink-0 p-1 hover:bg-slate-100 rounded mt-0.5 cursor-pointer"
              title="Dismiss alert"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
