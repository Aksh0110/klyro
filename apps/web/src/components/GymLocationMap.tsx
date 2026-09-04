'use client';

import React, { useState } from 'react';
import { Dumbbell, Plus, Minus, ShieldCheck } from 'lucide-react';

interface GymLocationMapProps {
  latitude?: number | string;
  longitude?: number | string;
  radiusMeters?: number;
  gymName?: string;
  className?: string;
}

export const GymLocationMap: React.FC<GymLocationMapProps> = ({
  latitude,
  longitude,
  radiusMeters = 100,
  gymName = 'Gym Branch Location',
  className = '',
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(16);

  const parsedLat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
  const parsedLng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;

  const hasValidCoords =
    parsedLat !== undefined &&
    parsedLng !== undefined &&
    !isNaN(parsedLat) &&
    !isNaN(parsedLng) &&
    parsedLat >= -90 &&
    parsedLat <= 90 &&
    parsedLng >= -180 &&
    parsedLng <= 180;

  if (!hasValidCoords) {
    return (
      <div className={`w-full h-36 rounded-2xl bg-secondary/30 border border-dashed border-border flex flex-col items-center justify-center p-4 text-center space-y-1.5 ${className}`}>
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Dumbbell className="w-4 h-4" />
        </div>
        <h4 className="text-xs font-bold text-foreground">No Location Configured</h4>
        <p className="text-[11px] text-muted-foreground max-w-xs">
          Click &ldquo;Detect Gym Location&rdquo; above to automatically save your gym coordinates.
        </p>
      </div>
    );
  }

  // Google Maps embed URL based on zoom level
  const mapSrc = `https://maps.google.com/maps?q=${parsedLat},${parsedLng}&z=${zoomLevel}&output=embed`;

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-border bg-card shadow-md ${className}`}>
      {/* Top Map Header Bar - Clean & Non-technical */}
      <div className="bg-card/95 backdrop-blur-md px-4 py-3 border-b border-border flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Dumbbell className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">{gymName}</h4>
            <span className="text-xs text-muted-foreground">Gym Location Preview</span>
          </div>
        </div>

        <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Active Check-In Area
        </span>
      </div>

      {/* Map Display Container */}
      <div className="relative w-full h-72 sm:h-80 bg-secondary/30 overflow-hidden">
        <iframe
          key={`${parsedLat}-${parsedLng}-${zoomLevel}`}
          title="Gym Location Preview Map"
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight={0}
          marginWidth={0}
          src={mapSrc}
          className="w-full h-full pointer-events-none"
        />

        {/* Custom Gym Pointer Pin at Center */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          {/* Geofence Perimeter Ripple */}
          <div className="w-32 h-32 rounded-full border-2 border-emerald-500/40 bg-emerald-500/10 animate-ping absolute" />
          <div className="w-24 h-24 rounded-full border border-emerald-500/50 bg-emerald-500/15 absolute" />

          {/* Gym Pin Marker */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="px-2.5 py-1 bg-gray-950/90 text-white rounded-full text-[11px] font-bold shadow-xl border border-white/20 mb-1 flex items-center gap-1.5 backdrop-blur-sm">
              <Dumbbell className="w-3.5 h-3.5 text-indigo-400" />
              <span>Gym Location</span>
            </div>

            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-primary to-violet-500 text-white shadow-2xl flex items-center justify-center border-2 border-white">
              <Dumbbell className="w-6 h-6" />
            </div>

            {/* Pin pointer tip */}
            <div className="w-3 h-3 bg-violet-600 rotate-45 -mt-1.5 rounded-sm border-r border-b border-white" />
            <div className="w-3 h-1 bg-black/40 rounded-full blur-[1px] mt-0.5" />
          </div>
        </div>

        {/* Zoom In / Zoom Out Controls */}
        <div className="absolute right-3 bottom-3 flex flex-col gap-1.5 z-10">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(z + 1, 18))}
            className="w-9 h-9 rounded-xl bg-card/95 backdrop-blur-md border border-border text-foreground hover:bg-secondary flex items-center justify-center shadow-lg transition-all active:scale-95 text-base font-bold"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(z - 1, 12))}
            className="w-9 h-9 rounded-xl bg-card/95 backdrop-blur-md border border-border text-foreground hover:bg-secondary flex items-center justify-center shadow-lg transition-all active:scale-95 text-base font-bold"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Clean Simple Footer Note */}
      <div className="bg-secondary/40 px-4 py-2.5 border-t border-border flex items-center justify-center text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 text-center font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          Members can self check-in when physically present at this gym location
        </span>
      </div>
    </div>
  );
};

