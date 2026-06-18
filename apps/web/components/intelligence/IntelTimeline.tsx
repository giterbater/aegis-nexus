"use client";

import { motion } from "framer-motion";
import { useAegisStore } from "@/lib/store";
import { ThreatBadge } from "@/components/ui/ThreatBadge";
import { threatColor, formatTimestamp } from "@/lib/utils";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, string> = {
  MILITARY:      "⚔",
  CYBER:         "⚡",
  GEOPOLITICAL:  "🌐",
  ECONOMIC:      "📊",
  HUMANITARIAN:  "🏥",
  INTELLIGENCE:  "🔍",
  NATURAL:       "🌪",
  HEALTH:        "💊",
  SPACE:         "🛸",
  NUCLEAR:       "☢",
};

export function IntelTimeline() {
  const { timeline } = useAegisStore();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-aegis-border shrink-0">
        <span className="text-[10px] font-mono text-aegis-cyan uppercase tracking-widest">
          INTELLIGENCE TIMELINE
        </span>
        <span className="text-[9px] font-mono text-aegis-text-secondary">
          {timeline.length} ENTRIES
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-aegis-border" />

          <div className="space-y-6">
            {timeline.map((entry, i) => {
              const color = threatColor(entry.threat);
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="relative pl-10"
                >
                  {/* Timeline dot */}
                  <div
                    className="absolute left-[13px] top-1.5 w-3 h-3 rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor: color,
                      backgroundColor: entry.isKeyEvent ? color : "rgba(3,7,18,0.9)",
                      boxShadow: entry.isKeyEvent ? `0 0 8px ${color}` : `0 0 4px ${color}40`,
                    }}
                  >
                    {entry.isKeyEvent && (
                      <span className="w-1 h-1 rounded-full bg-white" />
                    )}
                  </div>

                  {/* Content */}
                  <div
                    className={cn(
                      "glass-panel border rounded-sm p-3",
                      entry.isKeyEvent
                        ? "border-opacity-40"
                        : "border-aegis-border/40"
                    )}
                    style={entry.isKeyEvent ? { borderColor: color + "40" } : {}}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none">
                          {CATEGORY_ICONS[entry.category] ?? "●"}
                        </span>
                        <ThreatBadge level={entry.threat} size="sm" pulse={entry.isKeyEvent} />
                        {entry.isKeyEvent && (
                          <span className="text-[9px] font-mono border border-aegis-amber/40 text-aegis-amber px-1 rounded-sm">
                            KEY EVENT
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-aegis-text-dim shrink-0">
                        {formatTimestamp(entry.timestamp).slice(11, 19)} UTC
                      </span>
                    </div>

                    <h4 className="text-xs font-display font-semibold text-aegis-text-primary leading-snug mb-1.5">
                      {entry.title}
                    </h4>
                    <p className="text-[10px] text-aegis-text-secondary leading-relaxed">
                      {entry.description}
                    </p>

                    <div className="flex items-center gap-2 mt-2 text-[8px] font-mono text-aegis-text-dim">
                      <span>{entry.category}</span>
                      <span>·</span>
                      <span>{formatTimestamp(entry.timestamp).slice(0, 10)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
