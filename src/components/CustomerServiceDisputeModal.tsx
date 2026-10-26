import React, { useState } from 'react';
import { Job, JobDisputeRecord } from '../types';
import { 
  ShieldCheck, AlertTriangle, CheckCircle, ArrowLeftRight, 
  DollarSign, User, Building, MapPin, X, FileText, Camera, History, Lock 
} from 'lucide-react';
import { formatMDY } from '../utils/dateFormatter';

interface CustomerServiceDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobsWithDisputes: Job[];
  onResolveDispute: (
    jobId: string, 
    winner: 'company' | 'customer', 
    resolutionNotes: string
  ) => void;
}

export const CustomerServiceDisputeModal: React.FC<CustomerServiceDisputeModalProps> = ({
  isOpen,
  onClose,
  jobsWithDisputes,
  onResolveDispute
}) => {
  const [selectedJobId, setSelectedJobId] = useState<string>(
    jobsWithDisputes[0]?.id || ''
  );
  const [resolutionDecision, setResolutionDecision] = useState<'company' | 'customer' | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const currentJob = jobsWithDisputes.find(j => j.id === selectedJobId) || jobsWithDisputes[0];
  const dispute = currentJob?.disputeRecord || currentJob?.dispute;

  const handleConfirmResolution = () => {
    if (!currentJob || !resolutionDecision || !resolutionNotes.trim()) return;
    setIsProcessing(true);
    onResolveDispute(currentJob.id, resolutionDecision, resolutionNotes.trim());
    setIsProcessing(false);
    setResolutionDecision(null);
    setResolutionNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Customer Service Resolution Center
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Officer: Devin Jenkins (devinjjenkins90@gmail.com)
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                Formal Escrow Dispute Arbitration & Fund Release
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Dispute selector if multiple */}
          {jobsWithDisputes.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-slate-600 shrink-0">Select Job Dispute:</span>
              {jobsWithDisputes.map(j => (
                <button
                  key={j.id}
                  onClick={() => {
                    setSelectedJobId(j.id);
                    setResolutionDecision(null);
                    setResolutionNotes('');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    currentJob?.id === j.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {j.title} ({j.disputeRecord?.status === 'resolved' ? 'Resolved' : 'Active'})
                </button>
              ))}
            </div>
          )}

          {!currentJob || !dispute ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
              No active disputes currently require arbitration.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Job & Financial Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Project</span>
                  <span className="font-bold text-slate-900 block truncate">{currentJob.title}</span>
                  <span className="text-[11px] text-slate-500 block truncate">{currentJob.address}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Parties</span>
                  <span className="font-bold text-slate-800 block truncate">Customer: {dispute.customerName}</span>
                  <span className="text-[11px] text-slate-600 block truncate">Company: {dispute.companyName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Protected Escrow Amount</span>
                  <span className="text-sm font-black text-rose-600 font-mono block">
                    ${(dispute.heldAmount || currentJob.jobValue || 18500).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">
                    Status: {dispute.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Arguments Side by Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Claim */}
                <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-rose-600" />
                      Customer Claim
                    </span>
                    <span className="text-[10px] font-mono text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                      {formatMDY(dispute.reportedAt)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 bg-white p-3 rounded-lg border border-rose-100 whitespace-pre-wrap leading-relaxed">
                    {dispute.complaint}
                  </p>

                  {dispute.customerPhotos && dispute.customerPhotos.length > 0 ? (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-rose-900">
                        Evidence Photos ({dispute.customerPhotos.length})
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {dispute.customerPhotos.map((img, i) => (
                          <div key={i} className="aspect-square rounded-lg overflow-hidden border border-rose-200 bg-slate-100">
                            <img src={img} alt="Customer photo" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No customer photos attached</span>
                  )}
                </div>

                {/* Company Response */}
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-blue-600" />
                      Company Rebuttal
                    </span>
                    {dispute.companyResponse ? (
                      <span className="text-[10px] font-mono text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                        {formatMDY(dispute.companyResponse.submittedAt)}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                        Awaiting Response
                      </span>
                    )}
                  </div>

                  {dispute.companyResponse ? (
                    <>
                      <p className="text-xs text-slate-800 bg-white p-3 rounded-lg border border-blue-100 whitespace-pre-wrap leading-relaxed">
                        {dispute.companyResponse.comments}
                      </p>
                      {dispute.companyResponse.photos && dispute.companyResponse.photos.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-blue-900">
                            Company Verification Photos ({dispute.companyResponse.photos.length})
                          </span>
                          <div className="grid grid-cols-3 gap-2">
                            {dispute.companyResponse.photos.map((p, i) => (
                              <div key={i} className="aspect-square rounded-lg overflow-hidden border border-blue-200 bg-slate-100">
                                <img src={p} alt="Company photo" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <span className="text-[10px] text-slate-500 block">
                        Account responsible: {dispute.companyResponse.accountResponsible}
                      </span>
                    </>
                  ) : (
                    <div className="p-4 bg-white/80 rounded-lg border border-blue-100 text-xs text-slate-500 italic">
                      The company has been notified and may submit evidence before final ruling.
                    </div>
                  )}
                </div>
              </div>

              {/* Resolved State or Active Adjudication */}
              {dispute.status === 'resolved' && dispute.resolution ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Dispute Officially Resolved</span>
                    <span className="text-[10px] font-mono text-emerald-700">
                      ({formatMDY(dispute.resolution.resolvedAt)})
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 font-medium">
                    Ruling:{' '}
                    <strong className="text-emerald-950 uppercase">
                      In favor of {dispute.resolution.resolvedInFavorOf}
                    </strong>
                  </p>
                  <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-emerald-100 whitespace-pre-wrap">
                    {dispute.resolution.resolutionNotes}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-emerald-800 pt-1">
                    <span>Funds action completed: {dispute.resolution.resolvedInFavorOf === 'company' ? 'Disbursed to Company' : 'Refunded to Customer'}</span>
                    <span>Officer: {dispute.resolution.resolvedBy}</span>
                  </div>
                </div>
              ) : (
                /* Resolution Action Box */
                <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-400 block">
                    Adjudication & Funds Transfer Decision
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setResolutionDecision('company')}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        resolutionDecision === 'company'
                          ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                          : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <div className="text-xs font-black">Option A: Resolve in Favor of Company</div>
                      <div className="text-[11px] text-slate-300 mt-1">
                        Disburse and release held ${(dispute.heldAmount || currentJob.jobValue || 18500).toLocaleString()} to the Company.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setResolutionDecision('customer')}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        resolutionDecision === 'customer'
                          ? 'bg-rose-600 border-rose-400 text-white shadow-md'
                          : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <div className="text-xs font-black">Option B: Resolve in Favor of Customer</div>
                      <div className="text-[11px] text-slate-300 mt-1">
                        Refund held ${(dispute.heldAmount || currentJob.jobValue || 18500).toLocaleString()} back to Customer.
                      </div>
                    </button>
                  </div>

                  {resolutionDecision && (
                    <div className="space-y-2 pt-1 animate-in fade-in">
                      <label className="text-xs font-bold text-slate-300 block">
                        Official Resolution Justification & Findings
                      </label>
                      <textarea
                        rows={3}
                        value={resolutionNotes}
                        onChange={e => setResolutionNotes(e.target.value)}
                        placeholder="State findings regarding task completion, contractual scope adherence, or agreed settlement..."
                        className="w-full text-xs p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-blue-400 outline-hidden leading-relaxed"
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          disabled={!resolutionNotes.trim() || isProcessing}
                          onClick={handleConfirmResolution}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-black text-white rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>
                            Confirm & Execute {resolutionDecision === 'company' ? 'Company Disbursement' : 'Customer Refund'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* History trail */}
              {currentJob.history && currentJob.history.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-600 font-bold text-[11px]">
                    <History className="w-3.5 h-3.5" />
                    <span>Associated Job History</span>
                  </div>
                  <div className="space-y-1">
                    {currentJob.history.map(h => (
                      <div key={h.id} className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>• {h.action} ({h.actor})</span>
                        <span className="font-mono text-slate-400">{formatMDY(h.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
