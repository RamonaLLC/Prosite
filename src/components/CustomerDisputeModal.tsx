import React, { useState } from 'react';
import { Job, JobDisputeRecord } from '../types';
import { 
  AlertTriangle, ShieldAlert, Check, X, Upload, 
  FileText, Building, MapPin, User, DollarSign, Camera, Clock, HelpCircle, ShieldCheck
} from 'lucide-react';

interface CustomerDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  customerName: string;
  customerEmail: string;
  onSubmitDispute: (dispute: JobDisputeRecord) => void;
}

export const DISPUTE_REASONS = [
  'Work Not Completed',
  'Quality / Defect Issues',
  'Damage to Property',
  'Unauthorized Charges / Scope Discrepancy',
  'Safety Hazard / Code Non-Compliance',
  'Other'
];

export const REQUESTED_RESOLUTIONS = [
  'Full Refund',
  'Partial Refund',
  'Re-work / Correction by Company',
  'Customer Service Arbitration'
];

export const CustomerDisputeModal: React.FC<CustomerDisputeModalProps> = ({
  isOpen,
  onClose,
  job,
  customerName,
  customerEmail,
  onSubmitDispute
}) => {
  // Step 1: Warning Popup, Step 2: Dispute Form
  const [step, setStep] = useState<'warning' | 'form'>('warning');
  const [truthCertified, setTruthCertified] = useState(false);
  
  // Form fields
  const [disputeReason, setDisputeReason] = useState<string>('Work Not Completed');
  const [complaint, setComplaint] = useState('');
  const [requestedResolution, setRequestedResolution] = useState<string>('Re-work / Correction by Company');
  const [requestedRefundAmount, setRequestedRefundAmount] = useState<number>(job.jobValue || 5000);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotos(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint.trim()) {
      setErrorMsg('Please provide a detailed description of your dispute.');
      return;
    }

    setIsSubmitting(true);
    const disputeId = `disp-${Date.now()}`;
    const heldAmt = job.jobValue || job.paymentAmount || 18500;

    // Calculate response deadline (7 business days ~ 9 calendar days)
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 9);
    const responseDeadline = deadlineDate.toISOString().split('T')[0];

    const newRecord: JobDisputeRecord = {
      id: disputeId,
      jobId: job.id,
      jobTitle: job.title,
      jobAddress: job.address,
      customerName: customerName || job.clientName,
      customerEmail: customerEmail || job.clientEmail || 'devinjjenkins90@gmail.com',
      companyName: job.companyName || 'Contractor HQ',
      companyId: job.companyId,
      reason: disputeReason,
      complaint: complaint.trim(),
      requestedResolution,
      requestedRefundAmount: requestedResolution === 'Partial Refund' ? requestedRefundAmount : (requestedResolution === 'Full Refund' ? heldAmt : undefined),
      customerPhotos: photos.length > 0 ? photos : undefined,
      reportedAt: new Date().toISOString(),
      sentToCustomerServiceEmail: 'devinjjenkins90@gmail.com',
      responseDeadline,
      status: 'open',
      fundsHeld: true,
      heldAmount: heldAmt
    };

    onSubmitDispute(newRecord);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto">
        
        {/* ========================================================================= */}
        {/* STEP 1: MANDATORY TRUTHFUL-INFORMATION WARNING POPUP                      */}
        {/* ========================================================================= */}
        {step === 'warning' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-rose-600 border-b border-rose-100 pb-3">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <ShieldAlert className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-500">
                  Mandatory Legal Notice
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  Truthful & Accurate Dispute Warning
                </h3>
              </div>
            </div>

            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2.5 text-xs text-rose-950 leading-relaxed">
              <p className="font-bold">
                Please read carefully before submitting a formal job dispute:
              </p>
              <p>
                You must provide truthful and accurate information. Knowingly submitting fraudulent, false, or intentionally misleading dispute claims is strictly prohibited, violates the Terms of Service, and may result in penalties, account termination, forfeiture of dispute protections, and potential legal action.
              </p>
              <div className="p-2.5 bg-white/80 rounded-lg border border-rose-200 text-slate-800">
                Opening this dispute will immediately place the project funds 
                (<strong>${(job.jobValue || 18500).toLocaleString()}</strong>) in a protected 
                <strong> "Disputed / Funds Held"</strong> status and route the complete claim file directly to Customer Service at <strong className="font-mono text-rose-700">devinjjenkins90@gmail.com</strong>.
              </div>
            </div>

            {/* Mandatory Checkbox */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
              <input
                id="certify-dispute-truth"
                type="checkbox"
                checked={truthCertified}
                onChange={(e) => setTruthCertified(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-rose-600 rounded cursor-pointer"
              />
              <label htmlFor="certify-dispute-truth" className="text-xs text-slate-800 font-bold leading-snug cursor-pointer select-none">
                I certify under penalty of perjury/terms violation that this dispute is truthful, accurate, and submitted in good faith.
              </label>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!truthCertified}
                onClick={() => setStep('form')}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Acknowledge and Proceed
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: FORMAL DISPUTE SUBMISSION FORM                                    */}
        {/* ========================================================================= */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-600 block">
                  Dispute Filing & Escrow Hold
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Customer Dispute Form
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Read-only Job & Parties Metadata */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 font-medium text-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Customer:</span>
                <span className="font-bold text-slate-900">{customerName || job.clientName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Company:</span>
                <span className="font-bold text-slate-900">{job.companyName || 'ABC Construction HQ'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Job Address:</span>
                <span className="font-bold text-slate-900 text-right truncate max-w-[240px]">{job.address}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-1 text-rose-700 font-bold">
                <span>Funds to Hold in Escrow:</span>
                <span className="font-mono text-sm">${(job.jobValue || 18500).toLocaleString()}</span>
              </div>
            </div>

            {/* Dispute Reason Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Dispute Reason <span className="text-rose-600">*</span>
              </label>
              <select
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-medium text-slate-800"
              >
                {DISPUTE_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Detailed Description / Complaint */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Detailed Description of Dispute <span className="text-rose-600">*</span></span>
                <span className="text-[10px] text-slate-400 font-normal">Required</span>
              </label>
              <textarea
                required
                rows={4}
                value={complaint}
                onChange={e => {
                  setComplaint(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Detail the unfinished work, substandard craftsmanship, property damage, unauthorized deviations, or failure to perform..."
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-hidden leading-relaxed"
              />
              {errorMsg && (
                <p className="text-[11px] text-rose-600 font-bold">{errorMsg}</p>
              )}
            </div>

            {/* Requested Resolution Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Requested Resolution <span className="text-rose-600">*</span>
              </label>
              <select
                value={requestedResolution}
                onChange={(e) => setRequestedResolution(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-medium text-slate-800"
              >
                {REQUESTED_RESOLUTIONS.map((res) => (
                  <option key={res} value={res}>{res}</option>
                ))}
              </select>

              {requestedResolution === 'Partial Refund' && (
                <div className="pt-2">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Requested Refund Amount ($):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={job.jobValue || 18500}
                    value={requestedRefundAmount}
                    onChange={(e) => setRequestedRefundAmount(Number(e.target.value))}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
              )}
            </div>

            {/* Photo / Document Evidence Upload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Photo / Document Evidence
                </label>
                <span className="text-[10px] text-slate-400">Photos help customer service verify</span>
              </div>

              <div className="flex items-center gap-2">
                <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5 transition">
                  <Camera className="w-3.5 h-3.5 text-slate-600" />
                  <span>Upload Photos / Docs</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  {photos.length} item{photos.length !== 1 ? 's' : ''} attached
                </span>
              </div>

              {photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {photos.map((p, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square bg-slate-100">
                      <img src={p} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1 right-1 p-1 bg-slate-900/80 hover:bg-rose-600 text-white rounded-md transition cursor-pointer"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submission Routing Notice */}
            <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-xl text-[11px] text-blue-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-blue-900">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                Customer Service Ticket Routed Automatically
              </div>
              <p>
                Full case evidence will be sent to <strong className="font-mono text-blue-900">devinjjenkins90@gmail.com</strong>.
                The contractor will receive notice with <strong>7 business days</strong> to respond.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <AlertTriangle className="w-4 h-4" />
                {isSubmitting ? 'Submitting Dispute...' : 'Submit Dispute & Hold Funds'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default CustomerDisputeModal;
