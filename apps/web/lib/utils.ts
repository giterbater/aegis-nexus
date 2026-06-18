import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ThreatLevel } from "./types";

/**
 * Utility to merge Tailwind CSS classes with clsx and tailwind-merge.
 * This ensures that conflicting classes are resolved correctly.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns a hex color string associated with a specific threat level.
 */
export function threatColor(level: ThreatLevel): string {
  switch (level) {
    case "CRITICAL": return "#ef4444";
    case "HIGH":     return "#f97316";
    case "MEDIUM":   return "#ffb700";
    case "LOW":      return "#10b981";
    case "NOMINAL":  return "#3b82f6";
    default:         return "#94a3b8";
  }
}

/**
 * Returns the CSS class names for text coloring and glow effects based on threat level.
 */
export function threatTextClass(level: ThreatLevel): string {
  switch (level) {
    case "CRITICAL": return "text-red-500 text-glow-red";
    case "HIGH":     return "text-orange-500";
    case "MEDIUM":   return "text-amber-400 text-glow-amber";
    case "LOW":      return "text-emerald-500";
    case "NOMINAL":  return "text-blue-400";
    default:         return "text-slate-400";
  }
}

/**
 * Returns the CSS class names for background and border styling based on threat level.
 */
export function threatBgClass(level: ThreatLevel): string {
  switch (level) {
    case "CRITICAL": return "bg-red-500/10 border-red-500/30";
    case "HIGH":     return "bg-orange-500/10 border-orange-500/30";
    case "MEDIUM":   return "bg-amber-400/10 border-amber-400/30";
    case "LOW":      return "bg-emerald-500/10 border-emerald-500/30";
    case "NOMINAL":  return "bg-blue-400/10 border-blue-400/30";
    default:         return "bg-slate-500/10 border-slate-500/30";
  }
}

/**
 * Formats a Date object into a human-readable relative time string (e.g., "5m ago").
 */
export function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Formats a Date object into a standardized UTC timestamp string.
 */
export function formatTimestamp(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}
