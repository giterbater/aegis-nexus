"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAegisStore } from "@/lib/store";
import { ThreatBadge } from "@/components/ui/ThreatBadge";
import { threatColor, formatRelativeTime } from "@/lib/utils";
import type { GeoEvent } from "@/lib/types";

// ── Mapbox lazy import (client-only, avoids SSR crash) ───────────────────────
// CSS is loaded via app/globals.css @import
type MapboxMap = import("mapbox-gl").Map;

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// AEGIS dark tactical style — overrides on dark-v11
const AEGIS_STYLE = "mapbox://styles/mapbox/dark-v11";

export function MapboxGlobe() {
  const containerRef                  = useRef<HTMLDivElement>(null);
  const mapRef                        = useRef<MapboxMap | null>(null);
  const { geoEvents, selectedEventId, setSelectedEvent } = useAegisStore();
  const [selectedEvent, setLocalSelected] = useState<GeoEvent | null>(null);
  const [mapReady, setMapReady]       = useState(false);

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import("mapbox-gl").then(({ default: mapboxgl }) => {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container:  containerRef.current!,
        style:      AEGIS_STYLE,
        projection: "globe",
        center:     [15, 20],
        zoom:       1.4,
        pitch:      0,
        bearing:    0,
        antialias:  true,
      });
      mapRef.current = map;

      map.on("load", () => {
        // ── Atmosphere / fog ──────────────────────────────────────────────────
        map.setFog({
          color:           "rgb(3, 7, 18)",
          "high-color":    "rgb(0, 40, 80)",
          "horizon-blend": 0.04,
          "space-color":   "rgb(3, 7, 18)",
          "star-intensity": 0.35,
        });

        // ── Style overrides to match Aegis theme ──────────────────────────────
        // Ocean
        map.setPaintProperty("water", "fill-color", "rgba(0, 30, 60, 0.95)");
        // Land
        if (map.getLayer("land")) {
          map.setPaintProperty("land", "background-color", "rgba(8, 20, 40, 1)");
        }
        // Country borders
        if (map.getLayer("admin-1-boundary")) {
          map.setPaintProperty("admin-1-boundary", "line-color", "rgba(0, 217, 255, 0.08)");
        }
        if (map.getLayer("admin-0-boundary")) {
          map.setPaintProperty("admin-0-boundary", "line-color", "rgba(0, 217, 255, 0.2)");
          map.setPaintProperty("admin-0-boundary", "line-width", 0.5);
        }

        // ── GeoJSON source for events ─────────────────────────────────────────
        map.addSource("aegis-events", {
          type: "geojson",
          data: buildGeoJSON(geoEvents),
        });

        // Threat zone fill circles
        map.addLayer({
          id:     "threat-zones",
          type:   "circle",
          source: "aegis-events",
          paint:  {
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              1, ["*", ["get", "zoneRadius"], 0.08],
              4, ["*", ["get", "zoneRadius"], 0.3],
            ],
            "circle-color":   ["get", "color"],
            "circle-opacity": 0.06,
            "circle-blur":    1,
          },
        });

        // Outer pulse ring
        map.addLayer({
          id:     "event-pulse",
          type:   "circle",
          source: "aegis-events",
          paint:  {
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              1, ["case", ["==", ["get", "criticalOrHigh"], true], 18, 12],
              6, ["case", ["==", ["get", "criticalOrHigh"], true], 40, 25],
            ],
            "circle-color":   ["get", "color"],
            "circle-opacity": 0.12,
            "circle-blur":    0.5,
          },
        });

        // Core dot
        map.addLayer({
          id:     "event-dots",
          type:   "circle",
          source: "aegis-events",
          paint:  {
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              1, ["case", ["==", ["get", "critical"], true], 5, 3],
              6, ["case", ["==", ["get", "critical"], true], 12, 8],
            ],
            "circle-color":        ["get", "color"],
            "circle-stroke-width": 1,
            "circle-stroke-color": ["get", "color"],
            "circle-opacity":      0.92,
          },
        });

        // Labels on zoom
        map.addLayer({
          id:     "event-labels",
          type:   "symbol",
          source: "aegis-events",
          minzoom: 3,
          layout: {
            "text-field":         ["get", "category"],
            "text-font":          ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
            "text-size":          10,
            "text-offset":        [0, -1.5],
            "text-anchor":        "bottom",
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": ["get", "color"],
            "text-halo-color": "rgba(3, 7, 18, 0.8)",
            "text-halo-width": 1,
          },
        });

        // ── Click handler ──────────────────────────────────────────────────────
        map.on("click", "event-dots", (e) => {
          const feature = e.features?.[0];
          if (!feature) return;
          const eventId = feature.properties?.id as string;
          const ev = geoEvents.find((g) => g.id === eventId) ?? null;
          setLocalSelected(ev);
          setSelectedEvent(eventId);
        });

        map.on("mouseenter", "event-dots", () => {
          map.getCanvas().style.cursor = "crosshair";
        });
        map.on("mouseleave", "event-dots", () => {
          map.getCanvas().style.cursor = "";
        });

        // Close on map click
        map.on("click", (e) => {
          if (!e.features?.length) {
            setLocalSelected(null);
            setSelectedEvent(null);
          }
        });

        setMapReady(true);
      });

      // Slow auto-rotation
      let userInteracting = false;
      map.on("mousedown",  () => { userInteracting = true; });
      map.on("mouseup",    () => { userInteracting = false; });
      map.on("touchstart", () => { userInteracting = true; });
      map.on("touchend",   () => { userInteracting = false; });

      function autoRotate() {
        if (!userInteracting && map.getZoom() < 2.5) {
          map.easeTo({ bearing: map.getBearing() + 0.08, duration: 0, easing: (t) => t });
        }
        requestAnimationFrame(autoRotate);
      }
      autoRotate();
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update GeoJSON when events change ───────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const source = map.getSource("aegis-events") as import("mapbox-gl").GeoJSONSource | undefined;
    source?.setData(buildGeoJSON(geoEvents));
  }, [geoEvents, mapReady]);

  // ── Fly to selected event ────────────────────────────────────────────────────
  useEffect(() => {
    const ev = geoEvents.find((e) => e.id === selectedEventId);
    if (ev && mapRef.current) {
      mapRef.current.flyTo({
        center: [ev.lng, ev.lat],
        zoom:   4,
        duration: 1200,
        essential: true,
      });
      setLocalSelected(ev);
    }
  }, [selectedEventId, geoEvents]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Map container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Scanline overlay */}
      <div className="absolute inset-0 scanlines pointer-events-none" style={{ opacity: 0.4 }} />

      {/* Tactical HUD corners */}
      <div className="absolute inset-0 pointer-events-none">
        <span className="absolute top-0 left-0 w-8 h-px bg-aegis-cyan opacity-60" />
        <span className="absolute top-0 left-0 w-px h-8 bg-aegis-cyan opacity-60" />
        <span className="absolute top-0 right-0 w-8 h-px bg-aegis-cyan opacity-60" />
        <span className="absolute top-0 right-0 w-px h-8 bg-aegis-cyan opacity-60" />
        <span className="absolute bottom-0 left-0 w-8 h-px bg-aegis-cyan opacity-60" />
        <span className="absolute bottom-0 left-0 w-px h-8 bg-aegis-cyan opacity-60" />
        <span className="absolute bottom-0 right-0 w-8 h-px bg-aegis-cyan opacity-60" />
        <span className="absolute bottom-0 right-0 w-px h-8 bg-aegis-cyan opacity-60" />
      </div>

      {/* Selected event panel */}
      <AnimatePresence>
        {selectedEvent && (
          <EventDetailPanel
            event={selectedEvent}
            onClose={() => { setLocalSelected(null); setSelectedEvent(null); }}
          />
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 glass-panel border border-aegis-border rounded-sm p-2 space-y-1 pointer-events-none">
        {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((level) => (
          <div key={level} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: threatColor(level), boxShadow: `0 0 4px ${threatColor(level)}` }}
            />
            <span className="text-[9px] font-mono text-aegis-text-secondary">{level}</span>
          </div>
        ))}
      </div>

      {/* Event count */}
      <div className="absolute top-3 right-3 text-[9px] font-mono text-aegis-text-secondary pointer-events-none">
        {geoEvents.length} ACTIVE EVENTS
      </div>

      {/* Globe watermark */}
      <div className="absolute bottom-3 left-3 text-[8px] font-mono text-aegis-text-dim pointer-events-none">
        AEGIS GLOBE v4 · MAPBOX GL
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildGeoJSON(events: GeoEvent[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: events.map((ev) => ({
      type:     "Feature",
      geometry: { type: "Point", coordinates: [ev.lng, ev.lat] },
      properties: {
        id:            ev.id,
        title:         ev.title,
        category:      ev.category.slice(0, 3),
        threat:        ev.threat,
        color:         threatColor(ev.threat),
        critical:      ev.threat === "CRITICAL",
        criticalOrHigh: ev.threat === "CRITICAL" || ev.threat === "HIGH",
        zoneRadius:    ev.threat === "CRITICAL" ? 120 : ev.threat === "HIGH" ? 80 : 50,
      },
    })),
  };
}

function EventDetailPanel({ event, onClose }: { event: GeoEvent; onClose: () => void }) {
  return (
    <motion.div
      key={event.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="absolute bottom-4 left-4 w-72 glass-panel-intense border border-aegis-border rounded-sm p-4 z-10"
      style={{ boxShadow: `0 0 20px ${threatColor(event.threat)}18` }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <ThreatBadge level={event.threat} />
        <span className="text-[10px] font-mono text-aegis-text-secondary">
          {formatRelativeTime(event.timestamp)}
        </span>
      </div>
      <h3 className="text-xs font-display font-semibold text-aegis-text-primary leading-snug mb-2">
        {event.title}
      </h3>
      <p className="text-[11px] text-aegis-text-secondary leading-relaxed mb-3">
        {event.summary}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-aegis-border pt-2">
        {[
          ["COUNTRY",    event.country],
          ["CONFIDENCE", `${event.confidence}%`],
          ["CATEGORY",   event.category],
          ["SOURCES",    String(event.sources.length)],
        ].map(([label, val]) => (
          <div key={label}>
            <span className="text-[8px] font-mono text-aegis-text-dim block uppercase tracking-widest">{label}</span>
            <span className="text-[10px] font-mono text-aegis-text-primary">{val}</span>
          </div>
        ))}
      </div>
      {event.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {event.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-[9px] font-mono text-aegis-text-secondary border border-aegis-border px-1.5 py-0.5 rounded-sm">
              {tag}
            </span>
          ))}
        </div>
      )}
      <button
        className="absolute top-2 right-2 text-aegis-text-dim hover:text-aegis-text-secondary text-xs"
        onClick={onClose}
      >
        ✕
      </button>
    </motion.div>
  );
}
