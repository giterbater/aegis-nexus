"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Satellite, Map, Target, Plus, Crosshair } from "lucide-react";
import { useAegisStore } from "@/lib/store";
import type { Mission, MissionWaypoint } from "@/lib/types";

type MapboxMap = import("mapbox-gl").Map;
type MapboxMarker = import("mapbox-gl").Marker;

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const STYLES = {
  tactical:  "mapbox://styles/mapbox/dark-v11",
  satellite: "mapbox://styles/mapbox/satellite-v9",
};

const MISSION_COLORS: Record<string, string> = {
  ACTIVE:      "#00d9ff",
  PLANNING:    "#8b5cf6",
  ON_HOLD:     "#ffb700",
  COMPLETE:    "#10b981",
  COMPROMISED: "#ef4444",
  ABORTED:     "#64748b",
};

const TYPE_ICONS: Record<string, string> = {
  RECONNAISSANCE: "👁",
  EXTRACTION:     "🚁",
  SURVEILLANCE:   "📡",
  CYBER_OPS:      "💻",
  DIPLOMATIC:     "🤝",
  STRIKE:         "⚡",
};

interface MissionGlobeProps {
  addWaypointMode: boolean;
  onWaypointAdd: (lat: number, lng: number) => void;
  activeMission: Mission | null;
}

export function MissionGlobe({ addWaypointMode, onWaypointAdd, activeMission }: MissionGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<MapboxMap | null>(null);
  const markersRef   = useRef<MapboxMarker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapStyle, setMapStyle] = useState<"tactical" | "satellite">("tactical");
  const [coords, setCoords]     = useState<{ lat: number; lng: number } | null>(null);
  const { missions, selectedMissionId, setSelectedMission } = useAegisStore();

  // ── Init map ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !MAPBOX_TOKEN) return;

    import("mapbox-gl").then(({ default: mapboxgl }) => {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container:  containerRef.current!,
        style:      STYLES.tactical,
        projection: "globe",
        center:     [25, 35],
        zoom:       2.2,
        pitch:      0,
        antialias:  true,
      });
      mapRef.current = map;

      map.on("load", () => {
        map.setFog({
          color:           "rgb(3, 7, 18)",
          "high-color":    "rgb(0, 30, 60)",
          "horizon-blend": 0.03,
          "space-color":   "rgb(3, 7, 18)",
          "star-intensity": 0.6,
        });

        // ── Mission route source ──────────────────────────────────────────────
        map.addSource("mission-routes", {
          type: "geojson",
          data: buildRouteGeoJSON(missions),
        });

        // Route lines
        map.addLayer({
          id:     "route-lines",
          type:   "line",
          source: "mission-routes",
          layout: { "line-cap": "round", "line-join": "round" },
          paint:  {
            "line-color":   ["get", "color"],
            "line-width":   1.5,
            "line-opacity": 0.7,
            "line-dasharray": [2, 2],
          },
        });

        // Active route highlight
        map.addLayer({
          id:     "route-lines-active",
          type:   "line",
          source: "mission-routes",
          filter: ["==", ["get", "active"], true],
          layout: { "line-cap": "round", "line-join": "round" },
          paint:  {
            "line-color":   "#00d9ff",
            "line-width":   2.5,
            "line-opacity": 1,
          },
        });

        setMapReady(true);
      });

      // Coordinate tracker
      map.on("mousemove", (e) => {
        setCoords({ lat: +e.lngLat.lat.toFixed(4), lng: +e.lngLat.lng.toFixed(4) });
      });
      map.on("mouseleave", () => setCoords(null));

      // Auto rotate
      let interacting = false;
      map.on("mousedown",  () => { interacting = true; });
      map.on("mouseup",    () => { interacting = false; });
      function rotate() {
        if (!interacting && map.getZoom() < 2.5) {
          map.easeTo({ bearing: map.getBearing() + 0.05, duration: 0, easing: t => t });
        }
        requestAnimationFrame(rotate);
      }
      rotate();
    });

    return () => { mapRef.current?.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Style switcher ─────────────────────────────────────────────────────────
  const switchStyle = useCallback((style: "tactical" | "satellite") => {
    const map = mapRef.current;
    if (!map) return;
    setMapStyle(style);
    setMapReady(false);
    map.setStyle(STYLES[style]);
    map.once("style.load", () => {
      if (style === "tactical") {
        map.setFog({
          color: "rgb(3, 7, 18)", "high-color": "rgb(0, 30, 60)",
          "horizon-blend": 0.03, "space-color": "rgb(3, 7, 18)", "star-intensity": 0.6,
        });
      }
      // Re-add route layers after style swap
      if (!map.getSource("mission-routes")) {
        map.addSource("mission-routes", { type: "geojson", data: buildRouteGeoJSON(missions) });
      }
      if (!map.getLayer("route-lines")) {
        map.addLayer({ id: "route-lines", type: "line", source: "mission-routes",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": ["get", "color"], "line-width": 1.5, "line-opacity": 0.7, "line-dasharray": [2, 2] },
        });
        map.addLayer({ id: "route-lines-active", type: "line", source: "mission-routes",
          filter: ["==", ["get", "active"], true],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#00d9ff", "line-width": 2.5, "line-opacity": 1 },
        });
      }
      setMapReady(true);
    });
  }, [missions]);

  // ── Update routes when missions change ─────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const src = map.getSource("mission-routes") as import("mapbox-gl").GeoJSONSource | undefined;
    src?.setData(buildRouteGeoJSON(missions));
  }, [missions, mapReady]);

  // ── Waypoint markers ───────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    import("mapbox-gl").then(({ default: mapboxgl }) => {
      // Clear existing markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      missions.forEach((mission) => {
        const color = MISSION_COLORS[mission.status] ?? "#00d9ff";
        const isSelected = mission.id === selectedMissionId;

        mission.waypoints.forEach((wp) => {
          const el = document.createElement("div");
          el.className = "mission-waypoint";
          el.innerHTML = `
            <div style="
              width: ${isSelected ? 14 : 10}px;
              height: ${isSelected ? 14 : 10}px;
              border-radius: 50%;
              background: ${color};
              border: 2px solid ${color};
              box-shadow: 0 0 ${isSelected ? 12 : 6}px ${color};
              cursor: pointer;
              position: relative;
            ">
              ${isSelected ? `<div style="position:absolute;top:-18px;left:50%;transform:translateX(-50%);font-size:8px;font-family:monospace;color:${color};white-space:nowrap;background:rgba(3,7,18,0.9);padding:1px 4px;border-radius:2px;">${wp.label}</div>` : ""}
            </div>
          `;

          el.addEventListener("click", () => setSelectedMission(mission.id));

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([wp.lng, wp.lat])
            .addTo(map);
          markersRef.current.push(marker);
        });
      });
    });
  }, [missions, mapReady, selectedMissionId, setSelectedMission]);

  // ── Fly to active mission ──────────────────────────────────────────────────
  useEffect(() => {
    if (!activeMission || !mapRef.current) return;
    const wps = activeMission.waypoints;
    if (wps.length === 0) return;
    const center = wps[Math.floor(wps.length / 2)];
    mapRef.current.flyTo({
      center: [center.lng, center.lat],
      zoom:   4.5,
      duration: 1400,
      essential: true,
    });
  }, [activeMission]);

  // ── Click to add waypoint ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (e: { lngLat: { lat: number; lng: number } }) => {
      if (addWaypointMode) onWaypointAdd(+e.lngLat.lat.toFixed(4), +e.lngLat.lng.toFixed(4));
    };
    if (addWaypointMode) {
      map.getCanvas().style.cursor = "crosshair";
      map.on("click", handler);
    } else {
      map.getCanvas().style.cursor = "";
    }
    return () => { map.off("click", handler); };
  }, [addWaypointMode, onWaypointAdd]);

  const hasMB = Boolean(MAPBOX_TOKEN);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {!hasMB && (
        <div className="absolute inset-0 flex items-center justify-center bg-aegis-bg">
          <div className="text-center space-y-2">
            <Satellite className="w-12 h-12 text-aegis-text-dim mx-auto" />
            <p className="text-[11px] font-mono text-aegis-text-dim">
              ADD NEXT_PUBLIC_MAPBOX_TOKEN TO .env.local<br/>TO ENABLE SATELLITE & MISSION GLOBE
            </p>
          </div>
        </div>
      )}

      {/* Map container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Satellite scanlines overlay */}
      {mapStyle === "satellite" && (
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 3px)",
            mixBlendMode: "overlay",
          }}
        />
      )}

      {/* Tactical scanlines */}
      <div className="absolute inset-0 scanlines pointer-events-none" style={{ opacity: 0.3 }} />

      {/* HUD corners */}
      <div className="absolute inset-0 pointer-events-none">
        {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
          <span key={i} className={`absolute ${pos} w-6 h-6`}>
            <span className={`absolute ${i < 2 ? "top-0" : "bottom-0"} ${i % 2 === 0 ? "left-0" : "right-0"} w-5 h-px bg-aegis-cyan opacity-50`} />
            <span className={`absolute ${i < 2 ? "top-0" : "bottom-0"} ${i % 2 === 0 ? "left-0" : "right-0"} w-px h-5 bg-aegis-cyan opacity-50`} />
          </span>
        ))}
      </div>

      {/* Style toggle */}
      <div className="absolute top-3 left-3 flex gap-1 z-10">
        <button
          onClick={() => switchStyle("tactical")}
          className={`flex items-center gap-1.5 text-[9px] font-mono px-2 py-1 rounded-sm border transition-all ${
            mapStyle === "tactical"
              ? "border-aegis-cyan/60 text-aegis-cyan bg-aegis-cyan/15"
              : "border-aegis-border text-aegis-text-dim hover:border-aegis-cyan/30 bg-aegis-bg/80"
          }`}
        >
          <Map className="w-3 h-3" />TACTICAL
        </button>
        <button
          onClick={() => switchStyle("satellite")}
          className={`flex items-center gap-1.5 text-[9px] font-mono px-2 py-1 rounded-sm border transition-all ${
            mapStyle === "satellite"
              ? "border-aegis-amber/60 text-aegis-amber bg-aegis-amber/10"
              : "border-aegis-border text-aegis-text-dim hover:border-aegis-amber/30 bg-aegis-bg/80"
          }`}
        >
          <Satellite className="w-3 h-3" />SATELLITE
        </button>
      </div>

      {/* Waypoint mode indicator */}
      <AnimatePresence>
        {addWaypointMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[10px] font-mono text-aegis-amber border border-aegis-amber/40 bg-aegis-bg/90 px-3 py-1.5 rounded-sm z-10"
          >
            <Crosshair className="w-3 h-3 animate-pulse" />
            CLICK MAP TO DROP WAYPOINT
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mission count */}
      <div className="absolute top-3 right-3 text-[9px] font-mono text-aegis-text-secondary pointer-events-none z-10">
        {missions.filter(m => m.status === "ACTIVE").length} ACTIVE OPS
      </div>

      {/* Coordinate readout */}
      <AnimatePresence>
        {coords && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-mono text-aegis-text-secondary bg-aegis-bg/80 px-2 py-1 rounded-sm border border-aegis-border/50 pointer-events-none z-10"
          >
            {coords.lat > 0 ? "N" : "S"}{Math.abs(coords.lat)}° {coords.lng > 0 ? "E" : "W"}{Math.abs(coords.lng)}°
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mission legend */}
      <div className="absolute bottom-3 right-3 glass-panel border border-aegis-border/60 rounded-sm p-2 space-y-1 z-10 pointer-events-none">
        {Object.entries(MISSION_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }} />
            <span className="text-[7px] font-mono text-aegis-text-dim">{status}</span>
          </div>
        ))}
      </div>

      {/* Mission type icons floating */}
      {activeMission && (
        <div className="absolute bottom-3 left-3 glass-panel border border-aegis-cyan/30 rounded-sm px-3 py-2 z-10 pointer-events-none">
          <div className="text-[8px] font-mono text-aegis-text-dim mb-1">ACTIVE OP</div>
          <div className="flex items-center gap-2">
            <span className="text-base">{TYPE_ICONS[activeMission.type] ?? "◈"}</span>
            <div>
              <div className="text-[10px] font-mono text-aegis-cyan">{activeMission.codename}</div>
              <div className="text-[8px] font-mono text-aegis-text-dim">{activeMission.type}</div>
            </div>
          </div>
        </div>
      )}

      {/* Satellite watermark */}
      {mapStyle === "satellite" && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[8px] font-mono text-aegis-amber/40 pointer-events-none z-10 tracking-widest">
          ⚠ CLASSIFIED SATELLITE IMAGERY — AEGIS NEXUS EYES ONLY
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildRouteGeoJSON(missions: import("@/lib/types").Mission[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  missions.forEach((mission) => {
    if (mission.waypoints.length < 2) return;
    const sorted = [...mission.waypoints].sort((a, b) => a.order - b.order);
    const coords = sorted.map((wp) => [wp.lng, wp.lat] as [number, number]);
    features.push({
      type:     "Feature",
      geometry: { type: "LineString", coordinates: coords },
      properties: {
        id:     mission.id,
        color:  MISSION_COLORS[mission.status] ?? "#00d9ff",
        active: mission.id === mission.id, // will be filtered client-side
      },
    });
  });

  return { type: "FeatureCollection", features };
}
