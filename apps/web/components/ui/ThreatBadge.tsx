"use client";

import { cn, threatTextClass, threatBgClass } from "@/lib/utils";
import type { ThreatLevel } from "@/lib/types";

interface ThreatBadgeProps {
  level: ThreatLevel;
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ThreatBadge({ level, pulse = true, size = "sm", className }: ThreatBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border rounded-sm font-mono font-medium uppercase tracking-wider",
        threatBgClass(level),
        threatTextClass(level),
        size === "sm" && "text-[10px] px-1.5 py-0.5",
        size === "md" && "text-xs px-2 py-1",
        size === "lg" && "text-sm px-3 py-1.5",
        className
      )}
    >
      {pulse && (
        <span
          className={cn(
            "w-1 h-1 rounded-full",
            level === "CRITICAL" && "bg-red-500 animate-pulse",
            level === "HIGH" && "bg-orange-500 animate-pulse",
            level === "MEDIUM" && "bg-amber-400",
            level === "LOW" && "bg-emerald-500",
            level === "NOMINAL" && "bg-blue-400",
          )}
        />
      )}
      {level}
    </span>
  );
}

interface StatusDotProps {
  active?: boolean;
  color?: "cyan" | "red" | "amber" | "green" | "purple";
  pulse?: boolean;
  size?: "sm" | "md";
}

export function StatusDot({ active = true, color = "cyan", pulse = true, size = "sm" }: StatusDotProps) {
  const colors = {
    cyan:   "bg-aegis-cyan shadow-[0_0_6px_rgba(0,217,255,0.8)]",
    red:    "bg-aegis-red shadow-[0_0_6px_rgba(239,68,68,0.8)]",
    amber:  "bg-aegis-amber shadow-[0_0_6px_rgba(255,183,0,0.8)]",
    green:  "bg-aegis-green shadow-[0_0_6px_rgba(16,185,129,0.8)]",
    purple: "bg-aegis-purple shadow-[0_0_6px_rgba(139,92,246,0.8)]",
  };
  return (
    <span
      className={cn(
        "inline-block rounded-full",
        active ? colors[color] : "bg-aegis-text-dim",
        size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2",
        pulse && active && "animate-pulse"
      )}
    />
  );
}
