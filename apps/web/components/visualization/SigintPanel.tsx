"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Lock, Unlock, Eye, EyeOff, Wifi, Activity } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Intercept {
  id:        string;
  freq:      string;
  band:      string;
  strength:  number; // 0-100
  encrypted: boolean;
  decoded:   string;
  origin:    string;
  type:      string;
  timestamp: Date;
}

// ─── Fake intel data generators ──────────────────────────────────────────────

const BANDS    = ["HF", "VHF", "UHF", "SHF", "EHF", "SATCOM", "MILSAT", "DARKNET"];
const TYPES    = ["VOICE", "DATA", "ENCRYPTED", "BURST", "SPREAD-SPECTRUM", "COVERT"];
const ORIGINS  = ["EASTERN FRONT", "PERSIAN GULF", "SOUTH CHINA SEA", "ARCTIC CIRCLE",
                  "SAHEL REGION", "KOREAN PENINSULA", "CYBERSPACE", "DEEP ORBIT"];

const DECODED_MSGS = [
  "UNIT ALPHA MOVING TO GRID 447-229 …",
  "AUTHORIZATION CODE: ████ ████ ████",
  "ASSET COMPROMISED — ABORT PROTOCOL SIGMA",
  "PAYLOAD CONFIRMED — AWAITING EXTRACTION",
  "SATELLITE UPLINK ESTABLISHED ON BAND C-7",
  "THREAT VECTOR DELTA: NEUTRALIZED",
  "ENCRYPTION LAYER 3 BYPASS IN PROGRESS…",
  "SIGINT SOURCE: CONFIRMED HOSTILE STATE ACTOR",
  "INTERCEPT PRIORITY ALPHA — RELAY TO COMMAND",
  "NUCLEAR AUTHENTICATION CODE REQUEST DETECTED",
  "APT-41 LATERAL MOVEMENT DETECTED",
  "TRAFFIC ANALYSIS: 47 ENCRYPTED NODES",
  "COVERT CHANNEL IDENTIFIED — STEGANOGRAPHIC",
  "BURST TRANSMISSION — DURATION 0.003s",
];

const HEX_CHARS = "0123456789ABCDEF";
function randomHex(len: number) {
  return Array.from({ length: len }, () => HEX_CHARS[Math.floor(Math.random() * 16)]).join("");
}

function genIntercept(): Intercept {
  const freqMHz = (Math.random() * 3000 + 30).toFixed(3);
  const band    = BANDS[Math.floor(Math.random() * BANDS.length)];
  const enc     = Math.random() > 0.4;
  return {
    id:        `ic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    freq:      `${freqMHz} MHz`,
    band,
    strength:  Math.floor(Math.random() * 60 + 40),
    encrypted: enc,
    decoded:   enc
      ? `[ENCRYPTED — ${randomHex(8)} ${randomHex(8)} ${randomHex(8)}]`
      : DECODED_MSGS[Math.floor(Math.random() * DECODED_MSGS.length)],
    origin:    ORIGINS[Math.floor(Math.random() * ORIGINS.length)],
    type:      TYPES[Math.floor(Math.random() * TYPES.length)],
    timestamp: new Date(),
  };
}

// ─── Waveform canvas ──────────────────────────────────────────────────────────

function WaveformCanvas({ active, color = "#00d9ff" }: { active: boolean; color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  const tRef      = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function draw() {
      const w = canvas!.width  = canvas!.offsetWidth;
      const h = canvas!.height = canvas!.offsetHeight;
      ctx!.clearRect(0, 0, w, h);

      if (!active) {
        // Flat line
        ctx!.strokeStyle = color + "40";
        ctx!.lineWidth   = 1;
        ctx!.beginPath();
        ctx!.moveTo(0, h / 2);
        ctx!.lineTo(w, h / 2);
        ctx!.stroke();
        frameRef.current = requestAnimationFrame(draw);
        return;
      }

      tRef.current += 0.04;
      const t = tRef.current;

      // Glow effect
      ctx!.shadowColor = color;
      ctx!.shadowBlur  = 6;
      ctx!.strokeStyle = color;
      ctx!.lineWidth   = 1.5;
      ctx!.beginPath();

      for (let x = 0; x < w; x++) {
        const phase = (x / w) * Math.PI * 12 + t * 3;
        const noise = Math.sin(phase) * 0.6
          + Math.sin(phase * 2.3 + t) * 0.25
          + Math.sin(phase * 0.7 - t * 2) * 0.15
          + (Math.random() - 0.5) * 0.08;
        const y = h / 2 + noise * (h * 0.35);
        x === 0 ? ctx!.moveTo(x, y) : ctx!.lineTo(x, y);
      }
      ctx!.stroke();

      // Frequency domain bars at bottom
      ctx!.shadowBlur = 0;
      const barCount = 32;
      const barW     = w / barCount;
      for (let i = 0; i < barCount; i++) {
        const barH = Math.abs(Math.sin(i * 0.7 + t * 2 + i * 0.3)) * h * 0.3 + 2;
        const alpha = 0.3 + Math.sin(i * 0.5 + t) * 0.2;
        ctx!.fillStyle = color + Math.floor(alpha * 255).toString(16).padStart(2, "0");
        ctx!.fillRect(i * barW, h - barH, barW - 1, barH);
      }

      frameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [active, color]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

// ─── Frequency scanner ────────────────────────────────────────────────────────

function FreqScanner({ scanning }: { scanning: boolean }) {
  const FREQS = [28.5, 88.0, 144.2, 433.9, 915.0, 1090.0, 2400.0, 5800.0];
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!scanning) return;
    const id = setInterval(() => setActive(i => (i + 1) % FREQS.length), 600);
    return () => clearInterval(id);
  }, [scanning, FREQS.length]);

  return (
    <div className="flex gap-1 items-end h-8">
      {FREQS.map((f, i) => {
        const isActive = i === active;
        const h = 30 + Math.sin(i * 1.3) * 20;
        return (
          <div key={f} className="flex flex-col items-center gap-0.5 flex-1">
            <motion.div
              animate={{ height: scanning ? (isActive ? "100%" : `${h}%`) : "20%" }}
              transition={{ duration: 0.2 }}
              className="w-full rounded-sm"
              style={{
                background: isActive ? "#00d9ff" : "#0d2040",
                boxShadow:  isActive ? "0 0 6px #00d9ff" : "none",
                minHeight: 2,
              }}
            />
            <span className="text-[6px] font-mono text-aegis-text-dim">{f > 999 ? (f/1000).toFixed(1)+"G" : f+"M"}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Intercept card ───────────────────────────────────────────────────────────

function InterceptCard({ item }: { item: Intercept }) {
  const [reveal, setReveal] = useState(false);
  const [decoding, setDecoding] = useState(false);
  const [decodedText, setDecodedText] = useState("");

  const decode = () => {
    if (!item.encrypted) return;
    setDecoding(true);
    const target = DECODED_MSGS[Math.floor(Math.random() * DECODED_MSGS.length)];
    let i = 0;
    const id = setInterval(() => {
      // Scramble animation
      const scramble = Array.from({ length: target.length }, (_, j) =>
        j <= i ? target[j] : HEX_CHARS[Math.floor(Math.random() * 16)]
      ).join("");
      setDecodedText(scramble);
      i++;
      if (i > target.length) {
        clearInterval(id);
        setDecodedText(target);
        setDecoding(false);
        setReveal(true);
      }
    }, 30);
  };

  const strengthColor = item.strength > 70 ? "#ef4444" : item.strength > 50 ? "#ffb700" : "#10b981";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="border border-aegis-border/60 rounded-sm p-3 bg-aegis-panel/40 hover:bg-aegis-panel/60 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-mono text-aegis-cyan border border-aegis-cyan/30 bg-aegis-cyan/10 px-1.5 py-0.5 rounded-sm">
            {item.band}
          </span>
          <span className="text-[9px] font-mono text-aegis-text-primary">{item.freq}</span>
          <span className="text-[8px] font-mono text-aegis-text-dim">{item.type}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-end gap-0.5 h-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="w-1 rounded-sm transition-all"
                style={{
                  height: `${i * 20}%`,
                  backgroundColor: item.strength >= i * 20 ? strengthColor : "#0d2040",
                }}
              />
            ))}
          </div>
          <span className="text-[8px] font-mono" style={{ color: strengthColor }}>
            {item.strength}dB
          </span>
        </div>
      </div>

      <div className="flex items-start gap-2 mb-2">
        <span className="text-[8px] font-mono text-aegis-text-dim shrink-0 mt-0.5">ORIGIN</span>
        <span className="text-[9px] font-mono text-aegis-text-secondary">{item.origin}</span>
      </div>

      <div className="flex items-start gap-2">
        {item.encrypted ? (
          <button
            onClick={reveal ? undefined : decode}
            disabled={decoding}
            className={`text-[8px] font-mono flex items-center gap-1 shrink-0 mt-0.5 transition-colors ${
              reveal ? "text-aegis-green" : "text-aegis-red hover:text-aegis-amber"
            }`}
          >
            {reveal ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
            {decoding ? "DECRYPT" : reveal ? "CLEAR" : "ENCRYPT"}
          </button>
        ) : (
          <span className="text-[8px] font-mono text-aegis-green shrink-0 mt-0.5 flex items-center gap-1">
            <Unlock className="w-2.5 h-2.5" />PLAIN
          </span>
        )}
        <p className={`text-[9px] font-mono leading-relaxed flex-1 ${
          item.encrypted && !reveal && !decoding
            ? "text-aegis-text-dim blur-[2px] select-none"
            : item.encrypted
              ? "text-aegis-amber"
              : "text-aegis-text-primary"
        }`}>
          {decoding ? decodedText : reveal ? decodedText || item.decoded : item.decoded}
        </p>
      </div>

      <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-aegis-border/30">
        <span className="text-[8px] font-mono text-aegis-text-dim ml-auto">
          {item.timestamp.toLocaleTimeString()}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SigintPanel() {
  const [active, setActive]         = useState(false);
  const [intercepts, setIntercepts] = useState<Intercept[]>(() =>
    Array.from({ length: 4 }, genIntercept)
  );
  const [scanBand, setScanBand]     = useState("ALL BANDS");
  const [showRaw, setShowRaw]       = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startScan = useCallback(() => {
    setActive(true);
    timerRef.current = setInterval(() => {
      setIntercepts(prev => [genIntercept(), ...prev].slice(0, 12));
    }, 2800);
  }, []);

  const stopScan = useCallback(() => {
    setActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const BANDS_LIST = ["ALL BANDS", "HF", "VHF", "UHF", "SATCOM", "MILSAT"];
  const filtered   = scanBand === "ALL BANDS" ? intercepts : intercepts.filter(i => i.band === scanBand);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-aegis-border shrink-0">
        <div className="flex items-center gap-2">
          <Radio className={`w-4 h-4 ${active ? "text-aegis-red animate-pulse" : "text-aegis-cyan"}`} />
          <span className="text-sm font-display font-semibold text-aegis-text-primary">SIGINT INTERCEPTOR</span>
          {active && (
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}
              className="text-[8px] font-mono text-aegis-red border border-aegis-red/40 bg-aegis-red/10 px-1.5 py-0.5 rounded-sm">
              ● SCANNING
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowRaw(v => !v)}
            className={`p-1.5 rounded-sm border transition-all ${showRaw ? "border-aegis-cyan/50 text-aegis-cyan" : "border-aegis-border text-aegis-text-dim"}`}>
            {showRaw ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>
          <button
            onClick={active ? stopScan : startScan}
            className={`flex items-center gap-1.5 text-[9px] font-mono px-3 py-1.5 rounded-sm border transition-all ${
              active
                ? "border-aegis-red/50 text-aegis-red bg-aegis-red/10 hover:bg-aegis-red/20"
                : "border-aegis-cyan/50 text-aegis-cyan bg-aegis-cyan/10 hover:bg-aegis-cyan/20"
            }`}
          >
            <Wifi className="w-3 h-3" />
            {active ? "HALT SCAN" : "INITIATE SCAN"}
          </button>
        </div>
      </div>

      {/* Waveform */}
      <div className="h-24 px-4 pt-3 pb-1 border-b border-aegis-border shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[8px] font-mono text-aegis-text-dim">SIGNAL SPECTRUM</span>
          <span className="text-[8px] font-mono text-aegis-cyan">{scanBand}</span>
        </div>
        <WaveformCanvas active={active} color={active ? "#ef4444" : "#00d9ff"} />
      </div>

      {/* Freq scanner */}
      <div className="px-4 py-2 border-b border-aegis-border shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[8px] font-mono text-aegis-text-dim uppercase tracking-wider">FREQUENCY SWEEP</span>
          <Activity className={`w-3 h-3 ${active ? "text-aegis-red animate-pulse" : "text-aegis-text-dim"}`} />
        </div>
        <FreqScanner scanning={active} />
      </div>

      {/* Band filter */}
      <div className="flex gap-1 px-3 py-2 border-b border-aegis-border shrink-0 overflow-x-auto">
        {BANDS_LIST.map(b => (
          <button key={b} onClick={() => setScanBand(b)}
            className={`text-[8px] font-mono px-2 py-0.5 rounded-sm border whitespace-nowrap transition-all shrink-0 ${
              scanBand === b
                ? "border-aegis-cyan/50 text-aegis-cyan bg-aegis-cyan/10"
                : "border-aegis-border text-aegis-text-dim hover:border-aegis-border/70"
            }`}>
            {b}
          </button>
        ))}
        <span className="ml-auto text-[8px] font-mono text-aegis-text-dim shrink-0 self-center">
          {filtered.length} INTERCEPTS
        </span>
      </div>

      {/* Intercept list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 gap-2">
            <Radio className="w-6 h-6 text-aegis-text-dim" />
            <span className="text-[10px] font-mono text-aegis-text-dim">
              {active ? "SCANNING…" : "INITIATE SCAN TO BEGIN"}
            </span>
          </div>
        )}

        <AnimatePresence>
          {filtered.map(item => <InterceptCard key={item.id} item={item} />)}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-4 py-1.5 border-t border-aegis-border/60 shrink-0 flex items-center justify-between">
        <span className="text-[8px] font-mono text-aegis-text-dim">
          AEGIS SIGINT v3.1 · {active ? "ACTIVE MONITORING" : "STANDBY"}
        </span>
        <span className="text-[8px] font-mono text-aegis-text-dim">
          CLASSIFICATION: TOP SECRET//SI//TK//NOFORN
        </span>
      </div>
    </div>
  );
}
