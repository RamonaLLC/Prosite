import React, { useState } from 'react';
import { CompanySettings } from '../types';
import { Settings, Building, Phone, Mail, MapPin, Award, CheckSquare, X, Save, Moon, Sun, Palette } from 'lucide-react';

interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CompanySettings;
  onSaveSettings: (updated: CompanySettings) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export default function CompanySettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  isDarkMode,
  onToggleDarkMode
}: CompanySettingsModalProps) {
  const [formData, setFormData] = useState<CompanySettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 bg-slate-850 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 border border-blue-400/30 rounded-xl">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">
                Company & Workflow Settings
              </h2>
              <p className="text-xs text-slate-400">
                Configure company metadata, licensing, and field verification prompt customization.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {savedSuccess && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500 rounded-xl text-emerald-300 text-xs font-mono font-bold">
              Settings updated successfully!
            </div>
          )}

          {/* Global Dark Mode Preference Section */}
          {onToggleDarkMode && (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}>
                    {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-white font-mono flex items-center gap-2">
                      Global Slate Dark Mode
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono ${
                        isDarkMode ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isDarkMode ? 'ACTIVE' : 'OFF'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Overrides the role-based light cards with a unified, high-contrast slate color palette across the entire application.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                    isDarkMode ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isDarkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Section 1: Completion Prompt Customization */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-400">
              <CheckSquare className="w-4 h-4" />
              <label className="text-xs font-bold uppercase tracking-wider font-mono">
                Field Completion Confirmation Prompt Wording
              </label>
            </div>
            <p className="text-[11px] text-slate-400">
              This exact question will be prompted to employees when checking off all job To-Do items in the field.
            </p>
            <input
              type="text"
              required
              value={formData.completionPromptWording}
              onChange={(e) => setFormData({ ...formData, completionPromptWording: e.target.value })}
              placeholder="Are all jobs/tasks completed?"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Section 2: Company Profile Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono">
              Company Credentials
            </h4>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Company Legal Name</label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Business Phone</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Dispatch Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Operating Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">License / Bond #</label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Smart Travel-Time & Scheduling Settings (Specs 77-95) */}
          <div className="p-4 bg-slate-950 rounded-xl border border-blue-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400">
                <Settings className="w-4 h-4" />
                <h4 className="text-xs font-black uppercase tracking-wider font-mono text-white">
                  Smart Travel-Time & Dispatch Rules
                </h4>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-bold">
                MANDATORY 30M BUFFER
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              Configure automatic drive time calculations, mandatory buffer thresholds, and employee base routing.
            </p>

            {/* Minimum Buffer Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  Mandatory Minimum Buffer (Minutes)
                  <span className="text-amber-400">*</span>
                </label>
                <input
                  type="number"
                  min={30}
                  step={5}
                  value={formData.minSchedulingBufferMinutes ?? 30}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    minSchedulingBufferMinutes: Math.max(30, parseInt(e.target.value, 10) || 30) 
                  })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-500">Default & minimum threshold is 30 minutes.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Default Working Hours</label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={formData.defaultWorkDayStart || '08:00'}
                    onChange={(e) => setFormData({ ...formData, defaultWorkDayStart: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white font-mono"
                  />
                  <span className="text-slate-500 text-xs">to</span>
                  <input
                    type="time"
                    value={formData.defaultWorkDayEnd || '18:00'}
                    onChange={(e) => setFormData({ ...formData, defaultWorkDayEnd: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Toggle Options */}
            <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
              
              {/* Toggle 1: Smart Travel Time */}
              <label className="flex items-center justify-between cursor-pointer group">
                <div>
                  <div className="font-bold text-white group-hover:text-blue-400 transition">
                    Enable Smart Travel-Time Calculations
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Automatically computes estimated driving time between consecutive job addresses.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.smartTravelTimeEnabled !== false}
                  onChange={(e) => setFormData({ ...formData, smartTravelTimeEnabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded bg-slate-900 border-slate-700 focus:ring-blue-500"
                />
              </label>

              {/* Toggle 2: Use Employee Home/Base Location */}
              <label className="flex items-center justify-between cursor-pointer group">
                <div>
                  <div className="font-bold text-white group-hover:text-blue-400 transition">
                    Use Employee Home/Base Location for Travel-Time Scheduling
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Calculates reachable travel time from employee base address to the first job of the day.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.useEmployeeBaseLocation !== false}
                  onChange={(e) => setFormData({ ...formData, useEmployeeBaseLocation: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded bg-slate-900 border-slate-700 focus:ring-blue-500"
                />
              </label>

              {/* Toggle 3: Calculate Return to Base */}
              <label className="flex items-center justify-between cursor-pointer group">
                <div>
                  <div className="font-bold text-white group-hover:text-blue-400 transition">
                    Calculate Return to Base for Final Job of the Day
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Checks transit time from the employee's last job back to home/operating base.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.calculateReturnToBase === true}
                  onChange={(e) => setFormData({ ...formData, calculateReturnToBase: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded bg-slate-900 border-slate-700 focus:ring-blue-500"
                />
              </label>

              {/* Toggle 4: Manager Permissions */}
              <label className="flex items-center justify-between cursor-pointer group">
                <div>
                  <div className="font-bold text-white group-hover:text-blue-400 transition">
                    Allow Managers to Modify Schedules & Reassign Crew
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Empowers field managers to resolve travel conflicts and reassign workers.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.allowManagerScheduleOverrides !== false}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    allowManagerScheduleOverrides: e.target.checked,
                    allowManagerEmployeeReassignment: e.target.checked
                  })}
                  className="w-4 h-4 text-blue-600 rounded bg-slate-900 border-slate-700 focus:ring-blue-500"
                />
              </label>

            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-xs font-bold text-slate-300 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-black text-white rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Save Settings
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
