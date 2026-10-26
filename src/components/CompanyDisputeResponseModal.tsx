import React, { useState } from 'react';
import { Job, JobDisputeRecord } from '../types';
import { 
  ShieldAlert, AlertTriangle, Check, X, Camera, 
  Building, User, MapPin, DollarSign, Clock, FileText, Lock,
  Handshake, Send, ArrowRight, ShieldCheck, Mail
} from 'lucide-react';
import { formatMDY } from '../utils/dateFormatter';

interface CompanyDisputeResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  dispute: JobDisputeRecord;
  companyName: string;
  accountResponsible: string;
  onSubmitResponse: (
    jobId: string, 
    action: 'accept_resolution' | 'alternative_offer' | 'reject_dispute',
    comments: string, 
    alternativeOfferDetails?: string,
    photos?: string[]
  ) => void;
  onEscalateToCustomerService?: (jobId: string, notes?: string) => void;
}

export const CompanyDisputeResponseModal: React.FC<CompanyDisputeResponseModalProps> = ({
  isOpen,
  onClose,
  job,
  dispute,
  companyName,
  accountResponsible,
  onSubmitResponse,
  onEscalateToCustomerService
}) => {
  const isAlreadySubmitted = Boolean(dispute.companyResponse);

  const [responseAction, setResponseAction] = useState<'accept_resolution' | 'alternative_offer' | 'reject_dispute'>('reject_dispute');
  const [comments, setComments] = useState(dispute.companyResponse?.comments || '');
  const [alternativeOffer, setAlternativeOffer] = useState(dispute.companyResponse?.alternativeOfferDetails || '');
  const [photos, setPhotos] = useState<string[]>(dispute.companyResponse?.photos || []);
  const [showWarning, setShowWarning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isEscalating, setIsEscalating] = useState(false);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isAlreadySubmitted) return;
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

  const handleInitialClickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comments.trim()) {
      setErrorMsg('Please enter your response explanation or reasoning.');
      return;
    }
    if (responseAction === 'alternative_offer' && !alternativeOffer.trim()) {
      setErrorMsg('Please specify the details of your alternative settlement offer.');
      return;
    }
    // Show mandatory warning popup
    setShowWarning(true);
  };

  const handleFinalConfirmSubmit = () => {
    onSubmitResponse(
      job.id, 
      responseAction, 
      comments.trim(), 
      responseAction === 'alternative_offer' ? alternativeOffer.trim() : undefined,
      photos.length > 0 ? photos : undefined
    );
    setShowWarning(false);
    onClose();
  };

  const handleEscalateClick = () => {
    if (onEscalateToCustomerService) {
      onEscalateToCustomerService(job.id, comments || 'Company requested binding arbitration.');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-1.5 text-rose-600 font-mono text-[10px] uppercase tracking-wider font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Escrow Dispute Notice • Funds Held</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              Dispute Response & Arbitration File
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {job.title} — {job.address}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer's Complaint & Details */}
        <div className="p-4 bg-rose-50/80 rounded-xl border border-rose-200 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-rose-600" />
              Customer Complaint from {dispute.customerName}
            </span>
            <div className="flex items-center gap-1.5">
              {dispute.reason && (
                <span className="text-[9px] font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded">
                  Reason: {dispute.reason}
                </span>
              )}
              <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                Filed: {formatMDY(dispute.reportedAt)}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-800 bg-white p-3 rounded-lg border border-rose-100 leading-relaxed font-normal whitespace-pre-wrap">
            {dispute.complaint}
          </p>

          {/* Requested Resolution by Customer */}
          {dispute.requestedResolution && (
            <div className="p-2.5 bg-rose-100/60 rounded-lg border border-rose-200 text-xs text-rose-950 flex items-center justify-between">
              <span>Customer's Requested Resolution:</span>
              <strong className="font-bold text-rose-900">
                {dispute.requestedResolution} {dispute.requestedRefundAmount ? `($${dispute.requestedRefundAmount.toLocaleString()})` : ''}
              </strong>
            </div>
          )}

          {dispute.customerPhotos && dispute.customerPhotos.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-rose-900 block">
                Customer Evidence Photos ({dispute.customerPhotos.length})
              </span>
              <div className="grid grid-cols-4 gap-2">
                {dispute.customerPhotos.map((img, idx) => (
                  <div key={idx} className="rounded-lg overflow-hidden border border-rose-200 aspect-square bg-slate-100 shadow-xs">
                    <img src={img} alt={`Customer Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-rose-200/60 text-xs text-rose-950 font-bold">
            <span>Escrow Funds Under Review:</span>
            <span className="font-mono text-sm text-rose-700 font-black">
              ${(dispute.heldAmount || job.jobValue || 18500).toLocaleString()} (Held)
            </span>
          </div>
        </div>

        {/* Existing Company Response (Locked if submitted) */}
        {isAlreadySubmitted ? (
          <div className="p-4 bg-emerald-50/80 rounded-xl border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Company Response Submitted: <strong className="uppercase font-mono text-[10px] text-emerald-800">{dispute.companyResponse?.action || 'Response Sent'}</strong>
              </span>
              <span className="text-[10px] font-mono text-emerald-700">
                {formatMDY(dispute.companyResponse?.submittedAt)}
              </span>
            </div>
            <p className="text-xs text-slate-800 bg-white p-3 rounded-lg border border-emerald-100 whitespace-pre-wrap leading-relaxed">
              {dispute.companyResponse?.comments}
            </p>

            {dispute.companyResponse?.alternativeOfferDetails && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                <strong>Proposed Alternative Offer:</strong> {dispute.companyResponse.alternativeOfferDetails}
              </div>
            )}

            {dispute.companyResponse?.photos && dispute.companyResponse.photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 pt-1">
                {dispute.companyResponse.photos.map((p, idx) => (
                  <div key={idx} className="rounded-lg overflow-hidden border border-emerald-200 aspect-square">
                    <img src={p} alt={`Company Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {/* Escalate button if cannot reach agreement */}
            <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between">
              <div className="text-[11px] text-slate-600 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                Customer Service: <span className="font-mono font-bold text-slate-800">devinjjenkins90@gmail.com</span>
              </div>
              <button
                type="button"
                onClick={handleEscalateClick}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow transition cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Escalate to Customer Service Arbitration
              </button>
            </div>
          </div>
        ) : (
          /* Response Workflow Form */
          <form onSubmit={handleInitialClickSubmit} className="space-y-4">
            
            {/* 3 Core Actions */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Select Company Action / Position:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setResponseAction('accept_resolution')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    responseAction === 'accept_resolution'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700">
                    <Check className="w-3.5 h-3.5" /> Accept Resolution
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Agree to customer's requested refund or re-work terms.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setResponseAction('alternative_offer')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    responseAction === 'alternative_offer'
                      ? 'bg-blue-50 border-blue-500 text-blue-950 ring-2 ring-blue-500'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-black text-blue-700">
                    <Handshake className="w-3.5 h-3.5" /> Offer Alternative
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Propose partial credit, warranty fix, or modified settlement.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setResponseAction('reject_dispute')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    responseAction === 'reject_dispute'
                      ? 'bg-rose-50 border-rose-500 text-rose-950 ring-2 ring-rose-500'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-black text-rose-700">
                    <X className="w-3.5 h-3.5" /> Reject Dispute
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Dispute claim with proof of completion and full contract specs.
                  </p>
                </button>
              </div>
            </div>

            {/* If Alternative Offer selected */}
            {responseAction === 'alternative_offer' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
                <label className="text-xs font-bold text-blue-950 block">
                  Alternative Settlement Offer Details <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={alternativeOffer}
                  onChange={(e) => setAlternativeOffer(e.target.value)}
                  placeholder="e.g. Will return on Monday to repaint trim and issue $500 goodwill credit"
                  className="w-full text-xs p-2.5 bg-white border border-blue-300 rounded-lg focus:border-blue-600 outline-none"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Explanation & Statement of Facts <span className="text-rose-600">*</span></span>
                <span className="text-[10px] text-slate-400">Required</span>
              </label>
              <textarea
                required
                rows={3}
                value={comments}
                onChange={e => {
                  setComments(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Explain the scope performed, verified milestones, contract compliance, or terms of acceptance..."
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden leading-relaxed"
              />
              {errorMsg && (
                <p className="text-[11px] text-rose-600 font-bold">{errorMsg}</p>
              )}
            </div>

            {/* Optional Photos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Counter-Evidence / Verification Photos
                </label>
                <span className="text-[10px] text-slate-400">Photos of completed work, receipts, or sign-offs</span>
              </div>

              <div className="flex items-center gap-2">
                <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5 transition">
                  <Camera className="w-3.5 h-3.5 text-slate-600" />
                  <span>Attach Evidence</span>
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
                      <img src={p} alt={`Company Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-1 bg-slate-900/80 hover:bg-rose-600 text-white rounded-md transition cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleEscalateClick}
                className="px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                title="Route full case file to devinjjenkins90@gmail.com for binding arbitration"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Escalate to Customer Service
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Submit Response
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* MANDATORY WARNING POPUP FOR COMPANY                                      */}
        {/* ========================================================================= */}
        {showWarning && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3 text-amber-600 border-b border-amber-100 pb-3">
                <div className="p-2.5 bg-amber-100 rounded-xl">
                  <ShieldAlert className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500">
                    Mandatory Truthfulness Notice
                  </span>
                  <h3 className="text-base font-black text-slate-900">
                    Truthful Response Certification
                  </h3>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-2 leading-relaxed">
                <p className="font-bold">
                  Please verify your response before submitting:
                </p>
                <p>
                  You must provide truthful and accurate information. Knowingly submitting fraudulent, 
                  false, or intentionally misleading statements or evidence may result in dispute 
                  forfeiture, suspension of contractor access, and potential legal consequences.
                </p>
                <p className="text-[11px] text-amber-900">
                  This submission will be recorded with timestamp and account: <strong>{accountResponsible}</strong>.
                  Customer service will be notified at <strong className="font-mono">devinjjenkins90@gmail.com</strong>.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWarning(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinalConfirmSubmit}
                  className="px-5 py-2.5 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Certify & Submit Response
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CompanyDisputeResponseModal;
