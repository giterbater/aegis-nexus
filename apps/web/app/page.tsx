"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { SideNav } from "@/components/layout/SideNav";
import { CommandCenter } from "@/components/layout/CommandCenter";
import { ParticleField } from "@/components/layout/ParticleField";
import { NewsTicker } from "@/components/layout/NewsTicker";
import { CriticalAlertOverlay } from "@/components/ui/CriticalAlertOverlay";
import { RedAlertMode } from "@/components/ui/RedAlertMode";
import { useIntelStream } from "@/lib/hooks/useIntelStream";
import { useAutoScan } from "@/lib/hooks/useAutoScan";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { useLiveAgentOps } from "@/lib/hooks/useLiveAgentOps";

const BOOT_LINES = [
  "INITIALIZING AEGIS NEXUS v4.2.1...",
  "LOADING INTELLIGENCE MODULES...",
  "CONNECTING TO GLOBAL SENSOR NETWORK...",
  "AUTHENTICATING SECURE CHANNELS...",
  "SPAWNING AI AGENT CLUSTER...",
  "INDEXING VECTOR KNOWLEDGE BASE...",
  "CALIBRATING THREAT DETECTION SYSTEMS...",
  "SYNCHRONIZING REAL-TIME DATA FEEDS...",
  "ESTABLISHING WEBSOCKET CONNECTIONS...",
  "SYSTEM ONLINE — THREAT LEVEL: ELEVATED",
];

function BootScreen({ onComplete }: { onComplete: () => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < BOOT_LINES.length) {
        const line = BOOT_LINES[i];
        if (typeof line === "string") {
          setLines((prev) => [...prev, line]);
          setProgress(Math.round(((i + 1) / BOOT_LINES.length) * 100));
        }
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setDone(true);
          setTimeout(onComplete, 600);
        }, 400);
      }
    }, 160);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 bg-aegis-bg flex flex-col items-center justify-center z-50"
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.5 }}
    >
      <ParticleField />

      {/* Background grid */}
      <div className="absolute inset-0 tactical-grid pointer-events-none" />

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,217,255,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-full max-w-lg px-8">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="mb-8 relative"
        >
          <div className="relative">
            <Shield
              className="w-16 h-16 text-aegis-cyan"
              style={{ filter: "drop-shadow(0 0 20px rgba(0,217,255,0.8))" }}
            />
            {/* Rotating ring */}
            <motion.div
              className="absolute inset-[-8px] rounded-full border border-aegis-cyan/30"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              style={{ borderTopColor: "rgba(0,217,255,0.8)" }}
            />
            <motion.div
              className="absolute inset-[-16px] rounded-full border border-aegis-cyan/15"
              animate={{ rotate: -360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              style={{ borderTopColor: "rgba(0,217,255,0.4)" }}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-8"
        >
          <h1
            className="text-3xl font-display font-bold text-aegis-cyan tracking-[0.3em] mb-1"
            style={{ textShadow: "0 0 30px rgba(0,217,255,0.6), 0 0 60px rgba(0,217,255,0.3)" }}
          >
            AEGIS NEXUS
          </h1>
          <p className="text-[11px] font-mono text-aegis-text-secondary tracking-[0.2em] uppercase">
            Global AI Intelligence Platform
          </p>
        </motion.div>

        {/* Boot log */}
        <div className="w-full font-mono text-[11px] space-y-1 mb-6 min-h-[180px]">
          <AnimatePresence>
            {lines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className={
                  i === lines.length - 1
                    ? line?.includes("ONLINE")
                      ? "text-aegis-green text-glow-cyan"
                      : "text-aegis-cyan"
                    : "text-aegis-text-secondary"
                }
              >
                <span className="text-aegis-text-dim mr-2">›</span>
                {line ?? ""}
                {i === lines.length - 1 && !done && (
                  <span className="ml-1 text-aegis-cyan animate-pulse">_</span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div className="w-full">
          <div className="flex justify-between text-[9px] font-mono text-aegis-text-dim mb-1">
            <span>BOOT SEQUENCE</span>
            <span className="text-aegis-cyan">{progress}%</span>
          </div>
          <div className="h-1 bg-aegis-border rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #8b5cf6, #00d9ff)",
                boxShadow: "0 0 8px rgba(0,217,255,0.6)",
              }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.15 }}
            />
          </div>
        </div>

        {done && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-[10px] font-mono text-aegis-green text-glow-cyan"
          >
            ALL SYSTEMS OPERATIONAL
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

/** Inner shell — only mounts after boot so SSE never fires during loading */
function AppShell() {
  useIntelStream({ autoConnect: true });
  useAutoScan();
  useKeyboardShortcuts();
  useLiveAgentOps();
  return (
    <motion.div
      key="app"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="relative z-10 flex flex-col h-screen overflow-hidden"
    >
      <TopBar />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <SideNav />
        <CommandCenter />
      </div>
      <NewsTicker />
      <CriticalAlertOverlay />
      <RedAlertMode />
    </motion.div>
  );
}

export default function Home() {
  const [booted, setBooted] = useState(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-aegis-bg">
      <ParticleField />
      <div className="absolute inset-0 tactical-grid pointer-events-none z-0" />
      <div className="absolute inset-0 scanlines pointer-events-none z-0" />

      <AnimatePresence>
        {!booted && <BootScreen key="boot" onComplete={() => setBooted(true)} />}
      </AnimatePresence>

      <AnimatePresence>
        {booted && <AppShell key="app" />}
      </AnimatePresence>
    </div>
  );
}
