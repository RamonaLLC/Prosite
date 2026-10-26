import React, { useState, useMemo } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin, 
  InfoWindow 
} from '@vis.gl/react-google-maps';
import { 
  MapPin, Navigation, HardHat, Phone, Mail, 
  Calendar, CheckCircle2, Layers, Compass, Eye, Filter
} from 'lucide-react';
import { Job, WorkerProfile } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

interface JobSiteMapViewProps {
  jobs: Job[];
  workers: WorkerProfile[];
  onSelectJob?: (jobId: string) => void;
}

// Fallback Coordinates for Known Demo Addresses
const DEFAULT_COORDINATES: Record<string, { lat: number; lng: number }> = {
  '1': { lat: 37.7749, lng: -122.4194 }, // SF / Main Remodel
  '2': { lat: 37.7833, lng: -122.4167 }, // SF Downtown
  '3': { lat: 37.7651, lng: -122.4241 }, // Mission District
  '4': { lat: 37.7900, lng: -122.4000 }, // Financial District
};

export const JobSiteMapView: React.FC<JobSiteMapViewProps> = ({
  jobs,
  workers,
  onSelectJob
}) => {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'in-progress' | 'planning' | 'completed'>('all');
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');

  // Google Maps API Key: from environment variable or Firebase applet configuration
  const apiKey = ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string) || firebaseConfig.apiKey || '';

  // Filtered jobs
  const visibleJobs = useMemo(() => {
    if (filterStatus === 'all') return jobs;
    return jobs.filter(j => j.status === filterStatus);
  }, [jobs, filterStatus]);

  // Derive coordinates for jobs (using mapped index coordinates or consistent hash)
  const jobsWithCoordinates = useMemo(() => {
    return visibleJobs.map((job, idx) => {
      const fallback = DEFAULT_COORDINATES[job.id] || {
        lat: 37.7749 + (idx * 0.015) - 0.02,
        lng: -122.4194 + (idx * 0.018) - 0.02,
      };
      return {
        ...job,
        coords: fallback,
      };
    });
  }, [visibleJobs]);

  const defaultCenter = jobsWithCoordinates.length > 0
    ? jobsWithCoordinates[0].coords
    : { lat: 37.7749, lng: -122.4194 };

  const getStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'in-progress':
        return { bg: '#3b82f6', border: '#1d4ed8', text: 'text-blue-400' };
      case 'planning':
        return { bg: '#f59e0b', border: '#d97706', text: 'text-amber-400' };
      case 'completed':
        return { bg: '#10b981', border: '#047857', text: 'text-emerald-400' };
      default:
        return { bg: '#64748b', border: '#475569', text: 'text-slate-400' };
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
      {/* Top Header & Map Controls */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Google Maps Job Site Dispatch
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono">
                {visibleJobs.length} Sites Active
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Interactive live location view and geofenced site boundaries</p>
          </div>
        </div>

        {/* Filters and View Mode Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Filter */}
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                filterStatus === 'all' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('in-progress')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                filterStatus === 'in-progress' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus('planning')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                filterStatus === 'planning' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Planning
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                filterStatus === 'completed' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Completed
            </button>
          </div>

          {/* Map Type Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setMapType('roadmap')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                mapType === 'roadmap' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Map
            </button>
            <button
              onClick={() => setMapType('satellite')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                mapType === 'satellite' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setMapType('hybrid')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                mapType === 'hybrid' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hybrid
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="relative w-full h-[480px] bg-slate-950">
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={defaultCenter}
            defaultZoom={13}
            mapId="DEMO_MAP_ID"
            mapTypeId={mapType}
            gestureHandling="greedy"
            disableDefaultUI={false}
            internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
            className="w-full h-full"
          >
            {jobsWithCoordinates.map((job) => {
              const statusStyle = getStatusColor(job.status);
              const assigned = workers.filter(w => job.assignedWorkers?.includes(w.id));

              return (
                <AdvancedMarker
                  key={job.id}
                  position={job.coords}
                  onClick={() => setSelectedJob(job)}
                  title={job.title}
                >
                  <Pin
                    background={statusStyle.bg}
                    borderColor={statusStyle.border}
                    glyphColor="#ffffff"
                    scale={selectedJob?.id === job.id ? 1.25 : 1.0}
                  />
                </AdvancedMarker>
              );
            })}

            {/* InfoWindow for Clicked Job Site */}
            {selectedJob && (
              <InfoWindow
                position={
                  jobsWithCoordinates.find(j => j.id === selectedJob.id)?.coords || defaultCenter
                }
                onCloseClick={() => setSelectedJob(null)}
              >
                <div className="p-2 max-w-xs text-slate-900 font-sans">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h4 className="font-bold text-sm text-slate-900 truncate">{selectedJob.title}</h4>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {selectedJob.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mb-2 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <span>{selectedJob.address}</span>
                  </p>

                  <div className="text-xs text-slate-700 bg-slate-50 p-2 rounded mb-2 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Client:</span>
                      <span className="font-medium">{selectedJob.clientName}</span>
                    </div>
                    {selectedJob.jobValue && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Value:</span>
                        <span className="font-bold text-emerald-700">${selectedJob.jobValue.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Assigned Crew:</span>
                      <span className="font-medium">{selectedJob.assignedWorkers?.length || 0} Workers</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedJob.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-1.5 px-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition"
                    >
                      <Navigation className="w-3 h-3" />
                      Get Directions
                    </a>
                    {onSelectJob && (
                      <button
                        onClick={() => {
                          onSelectJob(selectedJob.id);
                          setSelectedJob(null);
                        }}
                        className="py-1.5 px-2.5 rounded bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-semibold transition"
                      >
                        View Details
                      </button>
                    )}
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700 p-2.5 rounded-xl shadow-lg text-[11px] space-y-1 text-slate-300">
          <div className="font-bold text-white text-[10px] uppercase font-mono tracking-wider mb-1">
            Site Status Legend
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>In Progress ({jobs.filter(j => j.status === 'in-progress').length})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Planning ({jobs.filter(j => j.status === 'planning').length})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Completed ({jobs.filter(j => j.status === 'completed').length})</span>
          </div>
        </div>
      </div>
    </div>
  );
};
