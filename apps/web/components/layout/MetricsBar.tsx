"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { MOCK_SYSTEM_METRICS } from "@/lib/mock-data";

export function MetricsBar() {
  return (
    <div className="flex items-center gap-0 border-b border-aegis-border glass-panel-intense shrink-0">
      {MOCK_SYSTEM_METRICS.map((metric, i) => (
        <div
          key={metric.label}
          className="flex-1 flex flex-col items-center justify-center py-2.5 border-r border-aegis-border last:border-r-0"
        >
          <div className="flex items-center gap-1.5">
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`text-lg font-mono font-bold leading-none ${
                metric.label === "Threat Score"
                  ? metric.value >= 80 ? "text-red-500" : metric.value >= 60 ? "text-orange-500" : "text-amber-400"
                  : "text-aegis-cyan"
              }`}
            >
              {metric.value.toLocaleString()}
              {metric.unit}
            </motion.span>
            <TrendIcon trend={metric.trend} />
          </div>
          <span className="text-[8px] font-mono text-aegis-text-dim uppercase tracking-widest mt-0.5">
            {metric.label}
          </span>

          {/* Mini progress bar for threat score */}
          {metric.label === "Threat Score" && (
            <div className="w-16 h-0.5 bg-aegis-border rounded-full mt-1 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: metric.value >= 80 ? "#ef4444" : metric.value >= 60 ? "#f97316" : "#ffb700",
                  boxShadow: "0 0 4px currentColor",
                }}
                initial={{ width: 0 }}
                animate={{ width: `${(metric.value / metric.max) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TrendIcon({ trend }: { trend: "UP" | "DOWN" | "STABLE" }) {
  if (trend === "UP") return <TrendingUp className="w-3 h-3 text-aegis-green" />;
  if (trend === "DOWN") return <TrendingDown className="w-3 h-3 text-aegis-red" />;
  return <Minus className="w-3 h-3 text-aegis-text-secondary" />;
}
