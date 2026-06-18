"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Bot, RefreshCw, Radio, Server } from "lucide-react";
import { useAegisStore } from "@/lib/store";
import { ThreatBadge } from "@/components/ui/ThreatBadge";
import { formatRelativeTime, threatColor } from "@/lib/utils";
import type { StreamEvent } from "@/lib/types";

const TYPE_CONFIG = {
  ALERT:    { icon: AlertTriangle, color: "text-aegis-red",    bg: "border-l-aegis-red/50",    label: "ALERT" },
  UPDATE:   { icon: RefreshCw,     color: "text-aegis-cyan",   bg: "border-l-aegis-cyan/40",   label: "UPDATE" },
  ANALYSIS: { icon: Bot,           color: "text-aegis-purple", bg: "border-l-aegis-purple/40", label: "ANALYSIS" },
  AGENT:    { icon: Bot,           color: "text-aegis-amber",  bg: "border-l-aegis-amber/40",  label: "AGENT" },
  SYSTEM:   { icon: Server,        color: "text-aegis-text-secondary", bg: "border-l-aegis-text-dim/30", label: "SYSTEM" },
};

export function EventStream() {
  const { streamEvents } = useAegisStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top on new event
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [streamEvents.length]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-aegis-border shrink-0">
        <div className="flex items-center gap-2">
          <Radio className="w-3 h-3 text-aegis-cyan animate-pulse" />
          <span className="text-[10px] font-mono text-aegis-cyan uppercase tracking-widest">
            INTELLIGENCE STREAM
          </span>
        </div>
        <span className="text-[9px] font-mono text-aegis-text-secondary">
          {streamEvents.length} EVENTS
        </span>
      </div>

      {/* Stream */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5"
      >
        <AnimatePresence initial={false}>
          {streamEvents.map((event, i) => (
            <StreamItem key={event.id} event={event} isFirst={i === 0} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StreamItem({ event, isFirst }: { event: StreamEvent; isFirst: boolean }) {
  const config = TYPE_CONFIG[event.type];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={isFirst ? { opacity: 0, y: -12, height: 0 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`
        relative rounded-sm border-l-2 ${config.bg} border border-aegis-border/40
        bg-aegis-panel/60 px-3 py-2 overflow-hidden
        ${event.isNew ? "ring-1 ring-aegis-cyan/20" : ""}
      `}
      style={
        event.threat
          ? { borderLeftColor: threatColor(event.threat) + "80" }
          : {}
      }
    >
      {event.isNew && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0.2 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          style={{ background: "rgba(0,217,255,0.05)" }}
        />
      )}

      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-2.5 h-2.5 shrink-0 ${config.color}`} />
          <span className={`text-[9px] font-mono uppercase tracking-widest ${config.color}`}>
            {config.label}
          </span>
          {event.isNew && (
            <span className="text-[8px] font-mono text-aegis-cyan border border-aegis-cyan/30 px-1 rounded-sm">
              NEW
            </span>
          )}
        </div>
        <span className="text-[9px] font-mono text-aegis-text-dim shrink-0">
          {formatRelativeTime(event.timestamp)}
        </span>
      </div>

      <p className="text-[11px] font-display font-medium text-aegis-text-primary leading-snug mb-1">
        {event.title}
      </p>
      <p className="text-[10px] text-aegis-text-secondary leading-relaxed">
        {event.body}
      </p>

      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[9px] font-mono text-aegis-text-dim">
          SRC: {event.source}
        </span>
        {event.threat && <ThreatBadge level={event.threat} size="sm" pulse={event.isNew} />}
      </div>
    </motion.div>
  );
}
