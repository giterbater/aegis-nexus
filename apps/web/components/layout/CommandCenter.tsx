"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useAegisStore } from "@/lib/store";
import { WorldIntelMap } from "@/components/globe/WorldIntelMap";
import { EventStream } from "@/components/intelligence/EventStream";
import { AIAgentPanel } from "@/components/intelligence/AIAgentPanel";
import { ThreatRadar } from "@/components/visualization/ThreatRadar";
import { ActivityChart } from "@/components/visualization/ActivityChart";
import { NetworkGraph } from "@/components/visualization/NetworkGraph";
import { IntelTimeline } from "@/components/intelligence/IntelTimeline";
import { ReportsPanel } from "@/components/intelligence/ReportsPanel";
import { WorldAnalyzer } from "@/components/intelligence/WorldAnalyzer";
import { MissionPlanner } from "@/components/intelligence/MissionPlanner";
import { CommandTerminal } from "@/components/intelligence/CommandTerminal";
import { EconomyPanel } from "@/components/intelligence/EconomyPanel";
import { SigintPanel } from "@/components/visualization/SigintPanel";
import { WebReviewer } from "@/components/intelligence/WebReviewer";
import { GlassCard } from "@/components/ui/GlassCard";
import { MetricsBar } from "@/components/layout/MetricsBar";

export function CommandCenter() {
  const { activePanel } = useAegisStore();

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* Metrics strip */}
      <MetricsBar />

      {/* Main workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <AnimatePresence mode="wait">
          {activePanel === "map"      && <MapWorkspace      key="map" />}
          {activePanel === "agents"   && <AgentsWorkspace   key="agents" />}
          {activePanel === "terminal" && <TerminalWorkspace key="terminal" />}
          {activePanel === "economy"  && <EconomyWorkspace  key="economy" />}
          {activePanel === "world"    && <WorldWorkspace    key="world" />}
          {activePanel === "missions" && <MissionsWorkspace key="missions" />}
          {activePanel === "sigint"   && <SigintWorkspace   key="sigint" />}
          {activePanel === "review"   && <ReviewWorkspace   key="review" />}
          {activePanel === "network"  && <NetworkWorkspace  key="network" />}
          {activePanel === "timeline" && <TimelineWorkspace key="timeline" />}
          {activePanel === "reports"  && <ReportsWorkspace  key="reports" />}
        </AnimatePresence>
      </div>
    </div>
  );
}

const panelVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: "easeOut" } },
  exit:    { opacity: 0, scale: 0.98, transition: { duration: 0.15 } },
};

function MapWorkspace() {
  return (
    <motion.div
      variants={panelVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex-1 flex gap-2 p-2 overflow-hidden min-h-0"
    >
      {/* Left: Radar + Agent summary */}
      <div className="w-52 flex flex-col gap-2 shrink-0">
        <GlassCard accent="red" glow className="flex-1" corners={false}>
          <ThreatRadar />
        </GlassCard>
        <GlassCard accent="cyan" className="h-40 shrink-0" corners={false}>
          <div className="flex flex-col h-full">
            <div className="px-3 py-2 border-b border-aegis-border">
              <span className="text-[10px] font-mono text-aegis-cyan uppercase tracking-widest">
                SYSTEM STATUS
              </span>
            </div>
            <div className="flex-1 px-3 py-2 space-y-2">
              <StatusRow label="PIPELINE" value="NOMINAL" ok />
              <StatusRow label="AI AGENTS" value="4/12 ACTIVE" ok />
              <StatusRow label="KAFKA LAG" value="0.3s" ok />
              <StatusRow label="ALERT QUEUE" value="7 PENDING" warn />
              <StatusRow label="VECTOR DB" value="SYNCED" ok />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Center: World map */}
      <GlassCard accent="cyan" glow className="flex-1 min-w-0" title="GLOBAL INTELLIGENCE MAP" subtitle="LIVE · 10 EVENTS" corners>
        <div className="h-[calc(100%-44px)]">
          <WorldIntelMap />
        </div>
      </GlassCard>

      {/* Right: Event stream */}
      <div className="w-64 flex flex-col gap-2 shrink-0">
        <GlassCard accent="cyan" className="flex-1 min-h-0" corners={false}>
          <EventStream />
        </GlassCard>
      </div>
    </motion.div>
  );
}

function AgentsWorkspace() {
  return (
    <motion.div
      variants={panelVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex-1 flex gap-2 p-2 overflow-hidden min-h-0"
    >
      <GlassCard accent="purple" className="w-80 shrink-0" corners={false}>
        <AIAgentPanel />
      </GlassCard>
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <GlassCard accent="cyan" className="flex-1" corners={false}>
          <ActivityChart />
        </GlassCard>
        <GlassCard accent="cyan" className="h-48 shrink-0" corners={false}>
          <EventStream />
        </GlassCard>
      </div>
    </motion.div>
  );
}

function NetworkWorkspace() {
  return (
    <motion.div
      variants={panelVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex-1 flex gap-2 p-2 overflow-hidden min-h-0"
    >
      <GlassCard accent="cyan" glow className="flex-1 min-w-0" title="THREAT NETWORK GRAPH" subtitle="LIVE" corners>
        <div className="h-[calc(100%-44px)]">
          <NetworkGraph />
        </div>
      </GlassCard>
      <div className="w-64 flex flex-col gap-2 shrink-0">
        <GlassCard accent="red" className="flex-1" corners={false}>
          <ThreatRadar />
        </GlassCard>
      </div>
    </motion.div>
  );
}

function TimelineWorkspace() {
  return (
    <motion.div
      variants={panelVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex-1 flex gap-2 p-2 overflow-hidden min-h-0"
    >
      <GlassCard accent="cyan" className="flex-1 min-w-0" corners={false}>
        <IntelTimeline />
      </GlassCard>
      <div className="w-64 flex flex-col gap-2 shrink-0">
        <GlassCard accent="cyan" className="flex-1" corners={false}>
          <EventStream />
        </GlassCard>
      </div>
    </motion.div>
  );
}

function ReportsWorkspace() {
  return (
    <motion.div
      variants={panelVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex-1 flex gap-2 p-2 overflow-hidden min-h-0"
    >
      <GlassCard accent="cyan" className="flex-1 max-w-3xl" corners={false}>
        <ReportsPanel />
      </GlassCard>
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <GlassCard accent="purple" className="flex-1" corners={false}>
          <AIAgentPanel />
        </GlassCard>
      </div>
    </motion.div>
  );
}

function WorldWorkspace() {
  return (
    <motion.div
      variants={panelVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex-1 flex gap-2 p-2 overflow-hidden min-h-0"
    >
      {/* Main analyzer — full width */}
      <GlassCard accent="cyan" glow className="flex-1 min-w-0 overflow-hidden" corners>
        <WorldAnalyzer />
      </GlassCard>

      {/* Right sidebar */}
      <div className="w-64 flex flex-col gap-2 shrink-0">
        <GlassCard accent="red" className="h-48 shrink-0" corners={false}>
          <ThreatRadar />
        </GlassCard>
        <GlassCard accent="cyan" className="flex-1 min-h-0" corners={false}>
          <EventStream />
        </GlassCard>
      </div>
    </motion.div>
  );
}

function MissionsWorkspace() {
  return (
    <motion.div variants={panelVariants} initial="initial" animate="animate" exit="exit"
      className="flex-1 overflow-hidden min-h-0">
      <GlassCard accent="cyan" glow className="h-full" corners>
        <MissionPlanner />
      </GlassCard>
    </motion.div>
  );
}

function TerminalWorkspace() {
  return (
    <motion.div variants={panelVariants} initial="initial" animate="animate" exit="exit"
      className="flex-1 flex gap-2 p-2 overflow-hidden min-h-0">
      <GlassCard accent="cyan" glow className="flex-1 min-w-0 overflow-hidden" corners>
        <CommandTerminal />
      </GlassCard>
      <div className="w-60 flex flex-col gap-2 shrink-0">
        <GlassCard accent="red" className="h-48 shrink-0" corners={false}>
          <ThreatRadar />
        </GlassCard>
        <GlassCard accent="cyan" className="flex-1 min-h-0" corners={false}>
          <EventStream />
        </GlassCard>
      </div>
    </motion.div>
  );
}

function EconomyWorkspace() {
  return (
    <motion.div variants={panelVariants} initial="initial" animate="animate" exit="exit"
      className="flex-1 flex gap-2 p-2 overflow-hidden min-h-0">
      <GlassCard accent="green" glow className="flex-1 min-w-0 overflow-hidden" corners>
        <EconomyPanel />
      </GlassCard>
      <div className="w-60 flex flex-col gap-2 shrink-0">
        <GlassCard accent="cyan" className="flex-1 min-h-0" corners={false}>
          <EventStream />
        </GlassCard>
      </div>
    </motion.div>
  );
}

function ReviewWorkspace() {
  return (
    <motion.div variants={panelVariants} initial="initial" animate="animate" exit="exit"
      className="flex-1 overflow-hidden min-h-0">
      <GlassCard accent="cyan" glow className="h-full" corners>
        <WebReviewer />
      </GlassCard>
    </motion.div>
  );
}

function SigintWorkspace() {
  return (
    <motion.div variants={panelVariants} initial="initial" animate="animate" exit="exit"
      className="flex-1 flex gap-2 p-2 overflow-hidden min-h-0">
      <GlassCard accent="red" glow className="flex-1 min-w-0 overflow-hidden" corners>
        <SigintPanel />
      </GlassCard>
      <div className="w-60 flex flex-col gap-2 shrink-0">
        <GlassCard accent="red" className="h-48 shrink-0" corners={false}>
          <ThreatRadar />
        </GlassCard>
        <GlassCard accent="cyan" className="flex-1 min-h-0" corners={false}>
          <ActivityChart />
        </GlassCard>
      </div>
    </motion.div>
  );
}

function StatusRow({ label, value, ok, warn }: { label: string; value: string; ok?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[10px] font-mono">
      <span className="text-aegis-text-dim">{label}</span>
      <span className={ok ? "text-aegis-green" : warn ? "text-aegis-amber" : "text-aegis-red"}>
        {value}
      </span>
    </div>
  );
}
