"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Shield, Cpu, Globe, Zap, AlertTriangle } from "lucide-react";
import { useAegisStore } from "@/lib/store";
import { StatusDot } from "@/components/ui/ThreatBadge";

export function TopBar() {
  const { alertCount, globalThreatScore, systemOnline, acknowledgeAlerts } = useAegisStore();
  const [time, setTime] = useState(new Date());
  const [alertFlash, setAlertFlash] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (alertCount > 0) {
      const flash = setInterval(() => setAlertFlash((v) => !v), 800);
      return () => clearInterval(flash);
    }
  }, [alertCount]);

  const threatGrade =
    globalThreatScore >= 80 ? "CRITICAL" :
    globalThreatScore >= 60 ? "ELEVATED" :
    globalThreatScore >= 40 ? "GUARDED" : "LOW";

  const threatGradeColor =
    threatGrade === "CRITICAL" ? "text-red-500" :
    threatGrade === "ELEVATED" ? "text-orange-500" :
    threatGrade === "GUARDED" ? "text-amber-400" : "text-emerald-500";

  return (
    <header className="relative z-50 glass-panel-intense border-b border-aegis-border flex items-center justify-between px-4 h-12 shrink-0">
      {/* Scan line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-aegis-cyan/30 to-transparent"
          animate={{ top: ["-1px", "100%"] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Left — Logo */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Shield className="w-5 h-5 text-aegis-cyan" style={{ filter: "drop-shadow(0 0 6px rgba(0,217,255,0.8))" }} />
          <motion.div
            className="absolute inset-0 rounded-full border border-aegis-cyan/30"
            animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-xs font-display font-bold text-aegis-cyan tracking-[0.25em] uppercase text-glow-cyan">
            AEGIS NEXUS
          </span>
          <span className="text-[9px] font-mono text-aegis-text-secondary tracking-widest">
            GLOBAL INTELLIGENCE PLATFORM v4.2.1
          </span>
        </div>
      </div>

      {/* Center — Status indicators */}
      <div className="flex items-center gap-6">
        <StatusItem
          icon={<Globe className="w-3 h-3" />}
          label="COVERAGE"
          value="247 SOURCES"
          color="cyan"
          active
        />
        <StatusItem
          icon={<Cpu className="w-3 h-3" />}
          label="AGENTS"
          value="4 ACTIVE"
          color="purple"
          active
        />
        <StatusItem
          icon={<Zap className="w-3 h-3" />}
          label="INGEST"
          value="4.8K/HR"
          color="green"
          active
        />

        {/* Global Threat Score */}
        <div className="flex items-center gap-2 px-3 py-1 border border-aegis-border rounded-sm glass-panel">
          <AlertTriangle className={`w-3 h-3 ${threatGradeColor}`} />
          <span className="text-[10px] font-mono text-aegis-text-secondary">THREAT INDEX</span>
          <span className={`text-xs font-mono font-bold ${threatGradeColor}`}>
            {globalThreatScore}/100
          </span>
          <span className={`text-[10px] font-mono ${threatGradeColor} font-medium`}>
            {threatGrade}
          </span>
        </div>
      </div>

      {/* Right — Time + Alerts */}
      <div className="flex items-center gap-4">
        {/* Clock */}
        <div className="text-right hidden md:block">
          <div className="text-xs font-mono text-aegis-cyan font-medium" style={{ letterSpacing: "0.12em" }}>
            {time.toISOString().slice(0, 10)} {time.toISOString().slice(11, 19)}
          </div>
          <div className="text-[9px] font-mono text-aegis-text-secondary tracking-widest">UTC / ZULU</div>
        </div>

        {/* Alert bell */}
        <button
          className="relative flex items-center justify-center w-8 h-8 rounded-sm border border-aegis-border hover:border-aegis-cyan/40 transition-colors"
          onClick={acknowledgeAlerts}
          style={alertCount > 0 && alertFlash ? { borderColor: "rgba(239,68,68,0.6)", boxShadow: "0 0 10px rgba(239,68,68,0.3)" } : {}}
        >
          <Bell className={`w-4 h-4 ${alertCount > 0 ? "text-aegis-red" : "text-aegis-text-secondary"}`} />
          <AnimatePresence>
            {alertCount > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full bg-aegis-red text-[9px] font-mono font-bold text-white flex items-center justify-center px-0.5"
                style={{ boxShadow: "0 0 6px rgba(239,68,68,0.8)" }}
              >
                {alertCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* System status */}
        <div className="flex items-center gap-1.5">
          <StatusDot active={systemOnline} color={systemOnline ? "green" : "red"} />
          <span className={`text-[10px] font-mono ${systemOnline ? "text-aegis-green" : "text-aegis-red"}`}>
            {systemOnline ? "ONLINE" : "DEGRADED"}
          </span>
        </div>
      </div>
    </header>
  );
}

function StatusItem({
  icon,
  label,
  value,
  color,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "cyan" | "purple" | "green" | "red" | "amber";
  active: boolean;
}) {
  const textColors = {
    cyan:   "text-aegis-cyan",
    purple: "text-aegis-purple",
    green:  "text-aegis-green",
    red:    "text-aegis-red",
    amber:  "text-aegis-amber",
  };
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("opacity-60", textColors[color])}>{icon}</span>
      <div>
        <span className="text-[9px] font-mono text-aegis-text-secondary block leading-none">{label}</span>
        <span className={`text-[10px] font-mono font-medium leading-none ${textColors[color]}`}>{value}</span>
      </div>
    </div>
  );
}

function cn(...c: (string | boolean | undefined)[]): string {
  return c.filter(Boolean).join(" ");
}
