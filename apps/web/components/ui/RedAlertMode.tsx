"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useAegisStore } from "@/lib/store";

const THRESHOLD = 85;

export function RedAlertMode() {
  const globalThreatScore = useAegisStore(s => s.globalThreatScore);
  const [acknowledged, setAcknowledged] = useState(false);
  const [prevScore, setPrevScore] = useState(globalThreatScore);
  const active = globalThreatScore >= THRESHOLD && !acknowledged;

  // Reset ack when score drops back below threshold
  useEffect(() => {
    if (globalThreatScore < THRESHOLD) setAcknowledged(false);
  }, [globalThreatScore]);

  // Re-trigger if score jumps higher
  useEffect(() => {
    if (globalThreatScore > prevScore && globalThreatScore >= THRESHOLD) {
      setAcknowledged(false);
    }
    setPrevScore(globalThreatScore);
  }, [globalThreatScore, prevScore]);

  if (!active) return null;

  return (
    <>
      {/* Pulsing red border around entire screen */}
      <motion.div
        className="fixed inset-0 z-[150] pointer-events-none border-2 border-aegis-red rounded-none"
        animate={{ opacity: [0.9, 0.3, 0.9] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        style={{ boxShadow: "inset 0 0 40px rgba(239,68,68,0.15)" }}
      />

      {/* Corner flashes */}
      {(["tl","tr","bl","br"] as const).map(pos => (
        <motion.div
          key={pos}
          className="fixed z-[151] pointer-events-none w-16 h-16"
          style={{
            ...(pos.includes("t") ? { top: 0 } : { bottom: 0 }),
            ...(pos.includes("l") ? { left: 0 } : { right: 0 }),
            background: pos.includes("t")
              ? pos.includes("l")
                ? "radial-gradient(circle at 0% 0%, rgba(239,68,68,0.25), transparent 70%)"
                : "radial-gradient(circle at 100% 0%, rgba(239,68,68,0.25), transparent 70%)"
              : pos.includes("l")
                ? "radial-gradient(circle at 0% 100%, rgba(239,68,68,0.25), transparent 70%)"
                : "radial-gradient(circle at 100% 100%, rgba(239,68,68,0.25), transparent 70%)",
          }}
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.6, ease: "easeInOut" }}
        />
      ))}

      {/* DEFCON banner — top center */}
      <AnimatePresence>
        <motion.div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[152] pointer-events-auto"
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <div
            className="flex items-center gap-3 px-5 py-2.5 rounded-sm"
            style={{
              background: "rgba(8,15,28,0.95)",
              border: "1px solid rgba(239,68,68,0.6)",
              boxShadow: "0 0 30px rgba(239,68,68,0.3), 0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              <AlertTriangle className="w-4 h-4 text-aegis-red" />
            </motion.div>
            <span className="text-[10px] font-mono font-bold text-aegis-red tracking-[0.2em]">
              THREAT INDEX CRITICAL — {globalThreatScore}/100
            </span>
            <motion.span
              className="text-[8px] font-mono text-aegis-red/70 tracking-widest"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              ● DEFCON ELEVATED
            </motion.span>
            <button
              onClick={() => setAcknowledged(true)}
              className="text-[8px] font-mono text-aegis-red/60 hover:text-aegis-red border border-aegis-red/30 hover:border-aegis-red/60 px-2 py-0.5 rounded-sm transition-all ml-2"
            >
              ACK
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
