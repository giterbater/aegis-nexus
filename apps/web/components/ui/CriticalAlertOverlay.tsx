"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Radio, Shield, X } from "lucide-react";
import { useAegisStore } from "@/lib/store";
import type { StreamEvent } from "@/lib/types";

const THREAT_COLORS: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH:     "#f97316",
  MEDIUM:   "#ffb700",
  LOW:      "#10b981",
};

export function CriticalAlertOverlay() {
  const { criticalAlert, setCriticalAlert } = useAegisStore();

  const dismiss = useCallback(() => setCriticalAlert(null), [setCriticalAlert]);

  // Auto-dismiss after 18 seconds
  useEffect(() => {
    if (!criticalAlert) return;
    const t = setTimeout(dismiss, 18_000);
    return () => clearTimeout(t);
  }, [criticalAlert, dismiss]);

  // ESC key dismissal
  useEffect(() => {
    if (!criticalAlert) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [criticalAlert, dismiss]);

  return (
    <AnimatePresence>
      {criticalAlert && <AlertModal alert={criticalAlert} onDismiss={dismiss} />}
    </AnimatePresence>
  );
}

function AlertModal({ alert, onDismiss }: { alert: StreamEvent; onDismiss: () => void }) {
  const color = THREAT_COLORS[alert.threat ?? "HIGH"] ?? "#ef4444";
  const isCritical = alert.threat === "CRITICAL";

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[200] pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${color}12 0%, transparent 70%)`,
        }}
      />

      {/* Flashing border */}
      {isCritical && (
        <motion.div
          className="fixed inset-0 z-[199] pointer-events-none border-4 rounded-none"
          style={{ borderColor: color }}
          animate={{ opacity: [0.8, 0.2, 0.8] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Panel */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center pointer-events-none">
        <motion.div
          className="pointer-events-auto w-full max-w-xl mx-4"
          initial={{ scale: 0.85, opacity: 0, y: -30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: -20 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          {/* Shake on mount for CRITICAL */}
          <motion.div
            animate={isCritical ? {
              x: [0, -6, 6, -4, 4, -2, 2, 0],
            } : {}}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div
              className="relative rounded-sm overflow-hidden"
              style={{
                background: "rgba(8,15,28,0.97)",
                border: `2px solid ${color}`,
                boxShadow: `0 0 40px ${color}40, 0 0 80px ${color}20, inset 0 0 40px ${color}08`,
              }}
            >
              {/* Top accent bar */}
              <motion.div
                className="h-1 w-full"
                style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
                animate={{ opacity: isCritical ? [1, 0.4, 1] : 1 }}
                transition={{ duration: 1, repeat: isCritical ? Infinity : 0 }}
              />

              {/* Header */}
              <div
                className="flex items-center gap-3 px-5 py-3 border-b"
                style={{ borderColor: `${color}30`, background: `${color}10` }}
              >
                <motion.div
                  animate={isCritical ? { scale: [1, 1.2, 1], opacity: [1, 0.7, 1] } : {}}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  <AlertTriangle className="w-5 h-5 shrink-0" style={{ color }} />
                </motion.div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[9px] font-mono font-bold tracking-[0.25em] px-2 py-0.5 rounded-sm"
                      style={{ color, background: `${color}20`, border: `1px solid ${color}40` }}
                    >
                      {alert.threat} THREAT DETECTED
                    </span>
                    <span className="text-[9px] font-mono text-aegis-text-dim">AUTONOMOUS SCANNER</span>
                    <motion.div
                      className="flex items-center gap-1"
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-[8px] font-mono" style={{ color }}>LIVE</span>
                    </motion.div>
                  </div>
                  <div className="text-[9px] font-mono text-aegis-text-secondary">
                    {new Date().toISOString().replace("T", " ").slice(0, 19)} UTC
                  </div>
                </div>

                <button
                  onClick={onDismiss}
                  className="shrink-0 p-1 rounded-sm hover:bg-white/10 transition-colors"
                  style={{ color: `${color}80` }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-3">
                {/* Title */}
                <div className="flex items-start gap-2">
                  <Radio className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color }} />
                  <p className="text-sm font-display font-semibold text-aegis-text-primary leading-snug">
                    {alert.title.replace("[AUTO-SCAN] ", "")}
                  </p>
                </div>

                {/* Body detail */}
                {alert.body && (
                  <div
                    className="text-[10px] font-mono text-aegis-text-secondary leading-relaxed px-3 py-2 rounded-sm"
                    style={{ background: `${color}08`, borderLeft: `2px solid ${color}40` }}
                  >
                    {alert.body}
                  </div>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <StatChip label="SOURCE" value={alert.source} color={color} />
                  <StatChip label="TYPE" value={alert.type} color={color} />
                  <StatChip label="STATUS" value="UNACKNOWLEDGED" color={color} />
                </div>
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-between gap-3 px-5 py-3 border-t"
                style={{ borderColor: `${color}30` }}
              >
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3" style={{ color: `${color}60` }} />
                  <span className="text-[8px] font-mono text-aegis-text-dim uppercase tracking-widest">
                    AEGIS NEXUS AUTONOMOUS THREAT DETECTION
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={onDismiss}
                    className="text-[9px] font-mono px-3 py-1.5 rounded-sm transition-all hover:brightness-110"
                    style={{
                      color: "#080f1c",
                      background: color,
                      boxShadow: `0 0 12px ${color}60`,
                    }}
                  >
                    ACKNOWLEDGE
                  </button>
                </div>
              </div>

              {/* Corner decorations */}
              <CornerDec pos="tl" color={color} />
              <CornerDec pos="tr" color={color} />
              <CornerDec pos="bl" color={color} />
              <CornerDec pos="br" color={color} />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-[7px] font-mono text-aegis-text-dim uppercase tracking-widest mb-0.5">{label}</div>
      <div className="text-[9px] font-mono font-semibold truncate" style={{ color }}>{value}</div>
    </div>
  );
}

function CornerDec({ pos, color }: { pos: "tl" | "tr" | "bl" | "br"; color: string }) {
  const styles: Record<string, React.CSSProperties> = {
    tl: { top: 6, left: 6, borderTop: `1px solid ${color}`, borderLeft: `1px solid ${color}` },
    tr: { top: 6, right: 6, borderTop: `1px solid ${color}`, borderRight: `1px solid ${color}` },
    bl: { bottom: 6, left: 6, borderBottom: `1px solid ${color}`, borderLeft: `1px solid ${color}` },
    br: { bottom: 6, right: 6, borderBottom: `1px solid ${color}`, borderRight: `1px solid ${color}` },
  };
  return (
    <div
      className="absolute w-3 h-3 pointer-events-none"
      style={styles[pos]}
    />
  );
}
