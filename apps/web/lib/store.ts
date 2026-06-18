"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { GeoEvent, AIAgent, StreamEvent, ThreatZone, TimelineEntry, Mission } from "./types";
import {
  MOCK_GEO_EVENTS,
  MOCK_AGENTS,
  MOCK_STREAM_EVENTS,
  MOCK_THREAT_ZONES,
  MOCK_TIMELINE,
  MOCK_MISSIONS,
} from "./mock-data";

/**
 * AEGIS Central State Store
 * Manages all real-time intelligence data, UI state, and global mission parameters.
 */
interface AegisStore {
  // --- Data State ---
  geoEvents: GeoEvent[];
  agents: AIAgent[];
  streamEvents: StreamEvent[];
  threatZones: ThreatZone[];
  timeline: TimelineEntry[];
  missions: Mission[];

  // --- Alert Overlay ---
  /** Current high-priority alert that requires immediate attention */
  criticalAlert: StreamEvent | null;

  // --- UI & Global State ---
  selectedEventId: string | null;
  selectedMissionId: string | null;
  /** Currently active side panel in the dashboard */
  activePanel: "map" | "agents" | "network" | "timeline" | "reports" | "world" | "missions" | "terminal" | "economy" | "sigint" | "review";
  systemOnline: boolean;
  /** Number of unacknowledged alerts */
  alertCount: number;
  /** Overall global threat score (0-100) */
  globalThreatScore: number;

  // --- Actions ---
  setCriticalAlert: (event: StreamEvent | null) => void;
  setSelectedEvent: (id: string | null) => void;
  setActivePanel: (panel: AegisStore["activePanel"]) => void;
  addStreamEvent: (event: StreamEvent) => void;
  updateAgentProgress: (id: string, progress: number) => void;
  acknowledgeAlerts: () => void;
  addMission: (mission: Mission) => void;
  updateMission: (id: string, patch: Partial<Mission>) => void;
  deleteMission: (id: string) => void;
  setSelectedMission: (id: string | null) => void;
}

/**
 * Main hook for accessing and interacting with the AEGIS global state.
 */
export const useAegisStore = create<AegisStore>()(
  subscribeWithSelector((set) => ({
    // Initial State (Populated from mock data)
    geoEvents: MOCK_GEO_EVENTS,
    agents: MOCK_AGENTS,
    streamEvents: MOCK_STREAM_EVENTS,
    threatZones: MOCK_THREAT_ZONES,
    timeline: MOCK_TIMELINE,
    missions: MOCK_MISSIONS,

    selectedEventId: null,
    selectedMissionId: null,
    criticalAlert: null,
    activePanel: "map",
    systemOnline: true,
    alertCount: 7,
    globalThreatScore: 78,

    // Actions
    setCriticalAlert: (event) => set({ criticalAlert: event }),
    setSelectedEvent: (id) => set({ selectedEventId: id }),
    setActivePanel: (panel) => set({ activePanel: panel }),
    setSelectedMission: (id) => set({ selectedMissionId: id }),

    /** Adds a new event to the stream and increments alert count. */
    addStreamEvent: (event) =>
      set((state) => ({
        streamEvents: [event, ...state.streamEvents].slice(0, 50),
        alertCount: state.alertCount + 1,
      })),

    /** Updates the progress metric for a specific AI agent. */
    updateAgentProgress: (id, progress) =>
      set((state) => ({
        agents: state.agents.map((a) =>
          a.id === id ? { ...a, progress } : a
        ),
      })),

    /** Resets the alert count to zero. */
    acknowledgeAlerts: () => set({ alertCount: 0 }),

    /** Registers a new mission in the system. */
    addMission: (mission) =>
      set((state) => ({ missions: [mission, ...state.missions] })),

    /** Updates an existing mission with partial data. */
    updateMission: (id, patch) =>
      set((state) => ({
        missions: state.missions.map((m) =>
          m.id === id ? { ...m, ...patch, updatedAt: new Date() } : m
        ),
      })),

    /** Removes a mission from the system by its ID. */
    deleteMission: (id) =>
      set((state) => ({ missions: state.missions.filter((m) => m.id !== id) })),
  }))
);
