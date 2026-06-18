"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MOCK_NETWORK_NODES } from "@/lib/mock-data";
import { threatColor } from "@/lib/utils";
import type { NetworkNode } from "@/lib/types";

export function NetworkGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const [selected, setSelected] = useState<NetworkNode | null>(null);
  const nodesRef = useRef(MOCK_NETWORK_NODES.map((n) => ({
    ...n,
    x: n.x ?? Math.random() * 600 + 50,
    y: n.y ?? Math.random() * 320 + 30,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
  })));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    function draw() {
      if (!ctx || !canvas) return;
      timeRef.current += 0.01;
      const t = timeRef.current;

      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = "rgba(3, 7, 18, 0.97)";
      ctx.fillRect(0, 0, W, H);

      const nodes = nodesRef.current;

      // Gentle drift
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 30 || n.x > W - 30) n.vx *= -1;
        if (n.y < 20 || n.y > H - 20) n.vy *= -1;
      });

      // Draw edges
      nodes.forEach((node) => {
        node.connections.forEach((targetId) => {
          const target = nodes.find((n) => n.id === targetId);
          if (!target) return;

          const isHighlighted = node.threat === "CRITICAL" || target.threat === "CRITICAL";

          // Animated data packet
          const progress = (Math.sin(t * 1.5 + node.id.length) + 1) / 2;
          const px = node.x + (target.x - node.x) * progress;
          const py = node.y + (target.y - node.y) * progress;

          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = isHighlighted
            ? "rgba(239, 68, 68, 0.2)"
            : "rgba(0, 217, 255, 0.12)";
          ctx.lineWidth = isHighlighted ? 1 : 0.5;
          ctx.stroke();

          // Data packet dot
          ctx.beginPath();
          ctx.arc(px, py, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = isHighlighted ? "#ef4444" : "#00d9ff";
          ctx.shadowColor = isHighlighted ? "#ef4444" : "#00d9ff";
          ctx.shadowBlur = 4;
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      });

      // Draw nodes
      nodes.forEach((node) => {
        const color = node.threat ? threatColor(node.threat) : "#3b82f6";
        const size = 4 + node.weight * 0.8;
        const pulse = 1 + Math.sin(t * 2 + node.id.length) * (node.threat === "CRITICAL" ? 0.3 : 0.1);

        // Outer glow ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, size * 2 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = color + "20";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Middle ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, size * 1.3, 0, Math.PI * 2);
        ctx.strokeStyle = color + "40";
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Core
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        ctx.fillStyle = "rgba(226, 232, 240, 0.75)";
        ctx.font = "9px JetBrains Mono, monospace";
        ctx.textAlign = "center";
        ctx.fillText(node.label, node.x, node.y + size + 12);
      });

      frameRef.current = requestAnimationFrame(draw);
    }

    draw();

    // Click handler
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      const hit = nodesRef.current.find((n) => {
        const dx = n.x - mx;
        const dy = n.y - my;
        return Math.sqrt(dx * dx + dy * dy) < 14;
      });
      setSelected(hit ?? null);
    };

    canvas.addEventListener("click", handleClick);

    return () => {
      cancelAnimationFrame(frameRef.current);
      canvas.removeEventListener("click", handleClick);
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-aegis-border shrink-0">
        <span className="text-[10px] font-mono text-aegis-cyan uppercase tracking-widest">
          THREAT NETWORK
        </span>
        <span className="text-[9px] font-mono text-aegis-text-secondary">
          {MOCK_NETWORK_NODES.length} NODES · {MOCK_NETWORK_NODES.reduce((s, n) => s + n.connections.length, 0)} EDGES
        </span>
      </div>

      <div className="relative flex-1">
        <canvas
          ref={canvasRef}
          width={700}
          height={420}
          className="w-full h-full cursor-crosshair"
          style={{ imageRendering: "crisp-edges" }}
        />

        {/* Selected node info */}
        {selected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute bottom-3 left-3 glass-panel-intense border border-aegis-border rounded-sm p-3 w-52"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-medium text-aegis-text-primary">
                {selected.label}
              </span>
              <button
                className="text-aegis-text-dim text-xs"
                onClick={() => setSelected(null)}
              >✕</button>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] font-mono">
              <span className="text-aegis-text-dim">TYPE</span>
              <span className="text-aegis-text-secondary">{selected.type}</span>
              <span className="text-aegis-text-dim">THREAT</span>
              <span style={{ color: selected.threat ? threatColor(selected.threat) : "#64748b" }}>
                {selected.threat ?? "N/A"}
              </span>
              <span className="text-aegis-text-dim">LINKS</span>
              <span className="text-aegis-cyan">{selected.connections.length}</span>
              <span className="text-aegis-text-dim">WEIGHT</span>
              <span className="text-aegis-text-secondary">{selected.weight}/10</span>
            </div>
          </motion.div>
        )}

        <div className="absolute top-2 right-2 text-[8px] font-mono text-aegis-text-dim">
          CLICK NODE TO INSPECT
        </div>
      </div>
    </div>
  );
}
