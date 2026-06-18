"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { MOCK_ACTIVITY_DATA } from "@/lib/mock-data";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel-intense border border-aegis-border rounded-sm px-3 py-2 text-[10px] font-mono">
      <p className="text-aegis-text-secondary mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name.toUpperCase()}: {p.value}
        </p>
      ))}
    </div>
  );
};

export function ActivityChart() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-aegis-border shrink-0">
        <span className="text-[10px] font-mono text-aegis-cyan uppercase tracking-widest">
          24H ACTIVITY
        </span>
        <div className="flex items-center gap-3 text-[8px] font-mono">
          <span className="text-aegis-cyan">— EVENTS</span>
          <span className="text-red-500">— THREATS</span>
          <span className="text-purple-400">— CYBER OPS</span>
        </div>
      </div>

      <div className="flex-1 px-2 py-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={MOCK_ACTIVITY_DATA} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="eventsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d9ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00d9ff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="threatsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="cyberGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 7, fill: "#334155", fontFamily: "JetBrains Mono" }}
              tickLine={false}
              axisLine={{ stroke: "#0d2040" }}
              interval={3}
            />
            <YAxis
              tick={{ fontSize: 7, fill: "#334155", fontFamily: "JetBrains Mono" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="events"
              name="events"
              stroke="#00d9ff"
              strokeWidth={1.5}
              fill="url(#eventsGrad)"
            />
            <Area
              type="monotone"
              dataKey="threats"
              name="threats"
              stroke="#ef4444"
              strokeWidth={1.5}
              fill="url(#threatsGrad)"
            />
            <Area
              type="monotone"
              dataKey="cyberOps"
              name="cyber"
              stroke="#8b5cf6"
              strokeWidth={1.5}
              fill="url(#cyberGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
