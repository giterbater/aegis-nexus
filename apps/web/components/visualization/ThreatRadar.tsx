"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { MOCK_REGION_THREATS } from "@/lib/mock-data";

export function ThreatRadar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const angleRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 10;

    // Blip positions (normalized 0-1 within radar circle)
    const blips = [
      { a: 0.18, d: 0.7, size: 3, color: "#ef4444", pulse: true },
      { a: 0.85, d: 0.5, size: 4, color: "#ef4444", pulse: true },
      { a: 0.42, d: 0.82, size: 3, color: "#f97316", pulse: false },
      { a: 0.61, d: 0.35, size: 2, color: "#f97316", pulse: false },
      { a: 0.28, d: 0.45, size: 2, color: "#ffb700", pulse: false },
      { a: 0.74, d: 0.68, size: 2, color: "#ffb700", pulse: false },
      { a: 0.55, d: 0.22, size: 1.5, color: "#10b981", pulse: false },
      { a: 0.93, d: 0.78, size: 1.5, color: "#10b981", pulse: false },
    ];

    let trailData: { x: number; y: number; opacity: number }[] = [];

    function draw() {
      if (!ctx || !canvas) return;
      const size = canvas.width;
      ctx.clearRect(0, 0, size, size);

      // Background
      ctx.fillStyle = "rgba(3, 7, 18, 0.95)";
      ctx.beginPath();
      ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
      ctx.fill();

      // Radial grid rings
      const rings = 4;
      for (let i = 1; i <= rings; i++) {
        const ri = (r * i) / rings;
        ctx.beginPath();
        ctx.arc(cx, cy, ri, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 217, 255, ${0.06 + i * 0.015})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Range label
        ctx.fillStyle = "rgba(0, 217, 255, 0.25)";
        ctx.font = "8px JetBrains Mono, monospace";
        ctx.textAlign = "left";
        ctx.fillText(`${i * 25}%`, cx + ri + 3, cy - 3);
      }

      // Cross lines
      ctx.strokeStyle = "rgba(0, 217, 255, 0.08)";
      ctx.lineWidth = 0.5;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        ctx.stroke();
      }

      // Sweep gradient (trail)
      const sweepAngle = angleRef.current;
      const trailLength = Math.PI / 1.8;
      // Conic gradient unused — sweep is drawn via arc fill below

      // Manual trail using arc fill
      const trailGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      trailGrad.addColorStop(0, "rgba(0,217,255,0.03)");
      trailGrad.addColorStop(1, "rgba(0,217,255,0)");

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, sweepAngle - trailLength, sweepAngle);
      ctx.closePath();
      ctx.fillStyle = trailGrad;
      ctx.fill();
      ctx.restore();

      // Sweep line
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(sweepAngle) * r,
        cy + Math.sin(sweepAngle) * r
      );
      ctx.strokeStyle = "rgba(0, 217, 255, 0.9)";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#00d9ff";
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();

      // Blips
      blips.forEach((blip) => {
        const bAngle = blip.a * Math.PI * 2;
        const bDist = blip.d * r;
        const bx = cx + Math.cos(bAngle) * bDist;
        const by = cy + Math.sin(bAngle) * bDist;

        // Check if sweep is near blip
        const angleDiff = ((sweepAngle - bAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const fadeIn = angleDiff < 0.3 ? 1 : angleDiff > Math.PI * 1.8 ? 0.2 + (Math.PI * 2 - angleDiff) / (Math.PI * 2) * 0.8 : 0.15;

        ctx.save();
        ctx.globalAlpha = fadeIn;

        if (blip.pulse) {
          const pulseR = blip.size * (1 + Math.sin(Date.now() / 600) * 0.5);
          ctx.beginPath();
          ctx.arc(bx, by, pulseR * 3, 0, Math.PI * 2);
          ctx.strokeStyle = blip.color;
          ctx.lineWidth = 0.5;
          ctx.globalAlpha = fadeIn * 0.3;
          ctx.stroke();
        }

        ctx.globalAlpha = fadeIn;
        ctx.beginPath();
        ctx.arc(bx, by, blip.size, 0, Math.PI * 2);
        ctx.fillStyle = blip.color;
        ctx.shadowColor = blip.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
      });

      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 217, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Cardinal labels
      ctx.fillStyle = "rgba(0, 217, 255, 0.4)";
      ctx.font = "7px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText("N", cx, cy - r + 14);
      ctx.fillText("S", cx, cy + r - 6);
      ctx.textAlign = "center";
      ctx.fillText("E", cx + r - 8, cy + 3);
      ctx.fillText("W", cx - r + 8, cy + 3);

      // Center cross
      ctx.strokeStyle = "rgba(0, 217, 255, 0.3)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy);
      ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 6);
      ctx.stroke();

      angleRef.current = (angleRef.current + 0.018) % (Math.PI * 2);
      frameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-aegis-border shrink-0">
        <span className="text-[10px] font-mono text-aegis-cyan uppercase tracking-widest">
          THREAT RADAR
        </span>
        <span className="text-[9px] font-mono text-aegis-red animate-pulse">
          ● SCANNING
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-3 gap-3">
        <canvas
          ref={canvasRef}
          width={180}
          height={180}
          className="rounded-full"
        />

        {/* Regional threat bars */}
        <div className="w-full space-y-1.5">
          {MOCK_REGION_THREATS.slice(0, 4).map((region) => (
            <div key={region.region} className="space-y-0.5">
              <div className="flex justify-between text-[9px] font-mono">
                <span className="text-aegis-text-secondary truncate">{region.region.toUpperCase()}</span>
                <span className={region.score >= 80 ? "text-red-500" : region.score >= 60 ? "text-orange-500" : "text-amber-400"}>
                  {region.score}
                </span>
              </div>
              <div className="h-0.5 bg-aegis-border rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: region.score >= 80 ? "#ef4444" : region.score >= 60 ? "#f97316" : "#ffb700",
                    boxShadow: `0 0 4px ${region.score >= 80 ? "#ef4444" : region.score >= 60 ? "#f97316" : "#ffb700"}`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${region.score}%` }}
                  transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
