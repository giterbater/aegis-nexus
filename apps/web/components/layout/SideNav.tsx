"use client";

import { motion } from "framer-motion";
import { Globe, Network, Clock, FileText, Bot, BarChart3, Settings, Earth, Crosshair, Terminal, TrendingUp, Radio, MonitorCheck } from "lucide-react";
import { useAegisStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: "map",      label: "Intel Map",      icon: Globe,         badge: 10,   key: "1" },
  { id: "agents",   label: "AI Agents",      icon: Bot,           badge: 4,    key: "2" },
  { id: "terminal", label: "AI Terminal",    icon: Terminal,      badge: null, key: "3" },
  { id: "economy",  label: "Economic Intel", icon: TrendingUp,    badge: null, key: "4" },
  { id: "world",    label: "World Analyzer", icon: Earth,         badge: null, key: "5" },
  { id: "missions", label: "Mission Planner",icon: Crosshair,     badge: 5,    key: "6" },
  { id: "sigint",   label: "SIGINT",         icon: Radio,         badge: null, key: "7" },
  { id: "network",  label: "Threat Net",     icon: Network,       badge: null, key: "8" },
  { id: "timeline", label: "Timeline",       icon: Clock,         badge: null, key: "9" },
  { id: "reports",  label: "Reports",        icon: FileText,      badge: 3,    key: "0" },
  { id: "review",   label: "Web Reviewer",   icon: MonitorCheck,  badge: null, key: "W" },
] as const;

export function SideNav() {
  const { activePanel, setActivePanel } = useAegisStore();

  return (
    <nav className="w-14 glass-panel-intense border-r border-aegis-border flex flex-col items-center py-3 gap-1 shrink-0 z-40">
      {NAV_ITEMS.map((item, i) => {
        const Icon = item.icon;
        const active = activePanel === item.id;
        return (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setActivePanel(item.id)}
            className={cn(
              "relative w-10 h-10 rounded-sm flex flex-col items-center justify-center gap-0.5 transition-all duration-200 group",
              active
                ? "bg-aegis-cyan/10 border border-aegis-cyan/40 text-aegis-cyan"
                : "border border-transparent text-aegis-text-secondary hover:text-aegis-text-primary hover:bg-aegis-panel/60"
            )}
            title={item.label}
            style={active ? { boxShadow: "0 0 12px rgba(0,217,255,0.2)" } : {}}
          >
            {active && (
              <motion.div
                layoutId="nav-active"
                className="absolute inset-0 bg-aegis-cyan/10 rounded-sm border border-aegis-cyan/30"
              />
            )}
            <Icon className="w-4 h-4 relative z-10" />
            <span className="text-[7px] font-mono uppercase tracking-wider relative z-10 hidden group-hover:flex items-center gap-1.5 absolute -right-24 bg-aegis-panel border border-aegis-border px-2 py-1 rounded-sm text-aegis-text-primary whitespace-nowrap">
              {item.label}
              <span className="text-aegis-text-dim border border-aegis-border px-1 rounded-sm">{item.key}</span>
            </span>
            {item.badge !== null && (
              <span className={cn(
                "absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-[8px] font-mono font-bold flex items-center justify-center",
                active ? "bg-aegis-cyan text-aegis-bg" : "bg-aegis-text-dim text-aegis-bg"
              )}>
                {item.badge}
              </span>
            )}
          </motion.button>
        );
      })}

      <div className="flex-1" />

      {/* Bottom icons */}
      <button className="w-10 h-10 rounded-sm flex items-center justify-center text-aegis-text-secondary hover:text-aegis-text-primary border border-transparent hover:border-aegis-border transition-all">
        <BarChart3 className="w-4 h-4" />
      </button>
      <button className="w-10 h-10 rounded-sm flex items-center justify-center text-aegis-text-secondary hover:text-aegis-text-primary border border-transparent hover:border-aegis-border transition-all">
        <Settings className="w-4 h-4" />
      </button>
    </nav>
  );
}
