import React, { useState } from 'react';
import { Job, BeforeAfterPhoto, Role } from '../types';
import { 
  X, Camera, Plus, Trash2, Palette, Image as ImageIcon, 
  CheckCircle2, Sparkles, ZoomIn, ChevronLeft, ChevronRight 
} from 'lucide-react';

interface BeforeAfterModalProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
  userRole: Role;
  onUpdateJobPhotos?: (jobId: string, updatedPhotos: BeforeAfterPhoto[]) => void;
  onUpdateJob?: (updatedJob: Job) => void;
  onAnnotatePhoto?: (jobId: string, photoId: string, isBefore: boolean, imageUrl?: string) => void;
}

export default function BeforeAfterModal({
  job,
  isOpen,
  onClose,
  userRole,
  onUpdateJobPhotos,
  onUpdateJob,
  onAnnotatePhoto
}: BeforeAfterModalProps) {
  const [selectedEnlargedImage, setSelectedEnlargedImage] = useState<{
    url: string;
    label: string;
    type: 'before' | 'after';
  } | null>(null);

  if (!isOpen) return null;

  const notifyUpdate = (updatedPhotos: BeforeAfterPhoto[]) => {
    if (onUpdateJobPhotos) {
      onUpdateJobPhotos(job.id, updatedPhotos);
    }
    if (onUpdateJob) {
      onUpdateJob({ ...job, beforeAfterPhotos: updatedPhotos });
    }
  };

  // Extract or initialize the primary photo group
  const photoGroup: BeforeAfterPhoto = job.beforeAfterPhotos?.[0] || {
    id: `photo-${Date.now()}`,
    title: job.title || 'Project Gallery',
    beforeImage: '',
    afterImage: '',
    beforeImages: [],
    afterImages: [],
    comments: []
  };

  // Compile all before images
  const beforeImages: string[] = (photoGroup.beforeImages && photoGroup.beforeImages.length > 0)
    ? photoGroup.beforeImages
    : (photoGroup.beforeImage ? [photoGroup.beforeImage] : []);

  // Compile all after images
  const afterImages: string[] = (photoGroup.afterImages && photoGroup.afterImages.length > 0)
    ? photoGroup.afterImages
    : (photoGroup.afterImage ? [photoGroup.afterImage] : []);

  // Handle uploading multiple Before pictures
  const handleUploadBeforePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: File[] = Array.from(files);
    const readers: Promise<string>[] = fileList.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(newImages => {
      const updatedBeforeImages = [...beforeImages, ...newImages];
      const updatedGroup: BeforeAfterPhoto = {
        ...photoGroup,
        beforeImage: updatedBeforeImages[0] || '',
        beforeImages: updatedBeforeImages
      };

      const existingPhotos = job.beforeAfterPhotos || [];
      const updatedPhotos = existingPhotos.length > 0
        ? existingPhotos.map((p, idx) => idx === 0 ? updatedGroup : p)
        : [updatedGroup];

      notifyUpdate(updatedPhotos);
    });
  };

  // Handle uploading multiple After pictures
  const handleUploadAfterPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: File[] = Array.from(files);
    const readers: Promise<string>[] = fileList.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(newImages => {
      const updatedAfterImages = [...afterImages, ...newImages];
      const updatedGroup: BeforeAfterPhoto = {
        ...photoGroup,
        afterImage: updatedAfterImages[0] || '',
        afterImages: updatedAfterImages
      };

      const existingPhotos = job.beforeAfterPhotos || [];
      const updatedPhotos = existingPhotos.length > 0
        ? existingPhotos.map((p, idx) => idx === 0 ? updatedGroup : p)
        : [updatedGroup];

      notifyUpdate(updatedPhotos);
    });
  };

  // Delete a specific before photo
  const handleDeleteBeforePhoto = (indexToDelete: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedBeforeImages = beforeImages.filter((_, idx) => idx !== indexToDelete);
    const updatedGroup: BeforeAfterPhoto = {
      ...photoGroup,
      beforeImage: updatedBeforeImages[0] || '',
      beforeImages: updatedBeforeImages
    };

    const existingPhotos = job.beforeAfterPhotos || [];
    const updatedPhotos = existingPhotos.length > 0
      ? existingPhotos.map((p, idx) => idx === 0 ? updatedGroup : p)
      : [updatedGroup];

    notifyUpdate(updatedPhotos);
  };

  // Delete a specific after photo
  const handleDeleteAfterPhoto = (indexToDelete: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedAfterImages = afterImages.filter((_, idx) => idx !== indexToDelete);
    const updatedGroup: BeforeAfterPhoto = {
      ...photoGroup,
      afterImage: updatedAfterImages[0] || '',
      afterImages: updatedAfterImages
    };

    const existingPhotos = job.beforeAfterPhotos || [];
    const updatedPhotos = existingPhotos.length > 0
      ? existingPhotos.map((p, idx) => idx === 0 ? updatedGroup : p)
      : [updatedGroup];

    notifyUpdate(updatedPhotos);
  };

  const isEditable = userRole === 'admin' || userRole === 'worker';

  return (
    <div 
      id="before-after-modal-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
    >
      <div 
        id="before-after-modal-container"
        className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-tight">Before & After Project Photos</h3>
                <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-bold">
                  {beforeImages.length} Before • {afterImages.length} After
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate max-w-lg mt-0.5">
                {job.title} • <span className="text-slate-500">{job.address}</span>
              </p>
            </div>
          </div>

          <button
            id="close-before-after-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1 bg-slate-50">
          
          {/* ========================================================================= */}
          {/* 1. TOP SECTION: BEFORE PICTURES */}
          {/* ========================================================================= */}
          <div id="before-pictures-section" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    Before Pictures
                  </h4>
                  <span className="text-[11px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full">
                    {beforeImages.length} {beforeImages.length === 1 ? 'Photo' : 'Photos'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Initial site conditions, demolition state, and preparation framing prior to construction.
                </p>
              </div>

              {isEditable && (
                <label className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer shrink-0">
                  <Plus className="w-3.5 h-3.5" /> Add Before Photos
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleUploadBeforePhotos}
                  />
                </label>
              )}
            </div>

            {beforeImages.length === 0 ? (
              <div className="p-8 bg-white border-2 border-dashed border-slate-200 rounded-xl text-center flex flex-col items-center justify-center text-slate-400 gap-2">
                <Camera className="w-8 h-8 text-slate-300" />
                <span className="text-xs font-bold text-slate-600">No before photos added yet</span>
                <span className="text-[11px] text-slate-400">Crew or project managers will capture pre-construction photos.</span>
                {isEditable && (
                  <label className="mt-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition border border-slate-300 cursor-pointer">
                    Upload initial before photos
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleUploadBeforePhotos}
                    />
                  </label>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {beforeImages.map((imgUrl, idx) => (
                  <div
                    key={`before-${idx}`}
                    onClick={() => setSelectedEnlargedImage({ url: imgUrl, label: `Before Photo #${idx + 1}`, type: 'before' })}
                    className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition duration-200 flex flex-col cursor-pointer"
                  >
                    <div className="relative h-48 bg-slate-900 overflow-hidden flex items-center justify-center">
                      <img
                        src={imgUrl}
                        alt={`Before view ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <span className="px-2.5 py-1 bg-white/90 text-slate-900 text-xs font-bold rounded-md flex items-center gap-1 shadow">
                          <ZoomIn className="w-3.5 h-3.5" /> Enlarge
                        </span>
                        {isEditable && onAnnotatePhoto && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAnnotatePhoto(job.id, photoGroup.id, true, imgUrl);
                            }}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md flex items-center gap-1 shadow transition"
                            title="Draw on this photo"
                          >
                            <Palette className="w-3.5 h-3.5" /> Markup
                          </button>
                        )}
                      </div>

                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500/90 text-white text-[10px] font-black uppercase font-mono rounded shadow">
                        BEFORE #{idx + 1}
                      </span>

                      {isEditable && (
                        <button
                          onClick={(e) => handleDeleteBeforePhoto(idx, e)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-md bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                          title="Delete photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="p-2.5 bg-white border-t border-slate-100 flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 text-[11px]">Before Project Photo #{idx + 1}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Original State</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 2. BOTTOM SECTION: AFTER PICTURES */}
          {/* ========================================================================= */}
          <div id="after-pictures-section" className="space-y-4 pt-4 border-t-2 border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    After Pictures
                  </h4>
                  <span className="text-[11px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-full">
                    {afterImages.length} {afterImages.length === 1 ? 'Photo' : 'Photos'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Completed work milestones, finished craftsmanship, and finalized site deliverables.
                </p>
              </div>

              {isEditable && (
                <label className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer shrink-0">
                  <Plus className="w-3.5 h-3.5" /> Add After Photos
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleUploadAfterPhotos}
                  />
                </label>
              )}
            </div>

            {afterImages.length === 0 ? (
              <div className="p-8 bg-white border-2 border-dashed border-emerald-200 rounded-xl text-center flex flex-col items-center justify-center text-slate-400 gap-2">
                <Sparkles className="w-8 h-8 text-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-slate-700">Awaiting completion / final after photos</span>
                <span className="text-[11px] text-slate-500 max-w-md">
                  Field workers snap and post finalized photos as construction milestones reach 100% completion.
                </span>
                {isEditable && (
                  <label className="mt-2 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition border border-emerald-300 cursor-pointer flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" /> Upload Completed "After" Photos
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleUploadAfterPhotos}
                    />
                  </label>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {afterImages.map((imgUrl, idx) => (
                  <div
                    key={`after-${idx}`}
                    onClick={() => setSelectedEnlargedImage({ url: imgUrl, label: `After Photo #${idx + 1}`, type: 'after' })}
                    className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition duration-200 flex flex-col cursor-pointer"
                  >
                    <div className="relative h-48 bg-slate-900 overflow-hidden flex items-center justify-center">
                      <img
                        src={imgUrl}
                        alt={`After view ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <span className="px-2.5 py-1 bg-white/90 text-slate-900 text-xs font-bold rounded-md flex items-center gap-1 shadow">
                          <ZoomIn className="w-3.5 h-3.5" /> Enlarge
                        </span>
                        {isEditable && onAnnotatePhoto && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAnnotatePhoto(job.id, photoGroup.id, false, imgUrl);
                            }}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md flex items-center gap-1 shadow transition"
                            title="Draw on this photo"
                          >
                            <Palette className="w-3.5 h-3.5" /> Markup
                          </button>
                        )}
                      </div>

                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-600/90 text-white text-[10px] font-black uppercase font-mono rounded shadow flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> AFTER #{idx + 1}
                      </span>

                      {isEditable && (
                        <button
                          onClick={(e) => handleDeleteAfterPhoto(idx, e)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-md bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                          title="Delete photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="p-2.5 bg-white border-t border-slate-100 flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 text-[11px]">Completed Photo #{idx + 1}</span>
                      <span className="text-[10px] text-emerald-600 font-bold font-mono">Finished Result</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex justify-between items-center shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            {isEditable 
              ? 'Contractor Mode: Add or delete pictures, tap "Markup" to draw on images.' 
              : 'Viewing photo progress timeline.'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow transition cursor-pointer"
          >
            Close Photo Gallery
          </button>
        </div>
      </div>

      {/* High-Resolution Enlarged Lightbox View */}
      {selectedEnlargedImage && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setSelectedEnlargedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[88vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center w-full px-2 py-2 text-white">
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded uppercase ${
                selectedEnlargedImage.type === 'before' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
              }`}>
                {selectedEnlargedImage.label}
              </span>
              <button
                onClick={() => setSelectedEnlargedImage(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={selectedEnlargedImage.url}
              alt={selectedEnlargedImage.label}
              className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
}
