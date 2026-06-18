"use client";

import { useEffect } from "react";
import { useAegisStore } from "@/lib/store";

type Panel = "map" | "agents" | "network" | "timeline" | "reports" | "world" | "missions" | "terminal" | "economy" | "sigint" | "review";

const PANEL_KEYS: Record<string, Panel> = {
  "1": "map",
  "2": "agents",
  "3": "terminal",
  "4": "economy",
  "5": "world",
  "6": "missions",
  "7": "sigint",
  "8": "network",
  "9": "timeline",
  "0": "reports",
  "w": "review",
  "W": "review",
  "Escape": "map",
};

export function useKeyboardShortcuts() {
  const setActivePanel = useAegisStore(s => s.setActivePanel);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in an input or textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

      const panel = PANEL_KEYS[e.key];
      if (panel) {
        e.preventDefault();
        setActivePanel(panel);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setActivePanel]);
}
