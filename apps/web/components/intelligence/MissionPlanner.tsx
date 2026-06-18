"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Target, Radio, Eye, Shield, Cpu, Handshake,
  Zap, Clock, AlertTriangle, CheckCircle, XCircle, PauseCircle,
  ChevronRight, MapPin, Users, Edit3, Save, X, Lock, FileText,
} from "lucide-react";
import { useAegisStore } from "@/lib/store";
import { MissionGlobe } from "@/components/globe/MissionGlobe";
import type { Mission, MissionType, MissionStatus, MissionWaypoint } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<MissionStatus, { icon: React.ElementType; color: string; label: string }> = {
  ACTIVE:      { icon: Radio,       color: "#00d9ff", label: "ACTIVE"      },
  PLANNING:    { icon: FileText,    color: "#8b5cf6", label: "PLANNING"    },
  ON_HOLD:     { icon: PauseCircle, color: "#ffb700", label: "ON HOLD"     },
  COMPLETE:    { icon: CheckCircle, color: "#10b981", label: "COMPLETE"    },
  COMPROMISED: { icon: AlertTriangle,color: "#ef4444",label: "COMPROMISED" },
  ABORTED:     { icon: XCircle,     color: "#64748b", label: "ABORTED"     },
};

const TYPE_META: Record<MissionType, { icon: React.ElementType; label: string }> = {
  RECONNAISSANCE: { icon: Eye,       label: "RECON"     },
  EXTRACTION:     { icon: Shield,    label: "EXTRACTION" },
  SURVEILLANCE:   { icon: Radio,     label: "SURV"      },
  CYBER_OPS:      { icon: Cpu,       label: "CYBER OPS" },
  DIPLOMATIC:     { icon: Handshake, label: "DIPL"      },
  STRIKE:         { icon: Zap,       label: "STRIKE"    },
};

const PRIORITY_COLORS = { FLASH: "#ef4444", URGENT: "#ffb700", ROUTINE: "#10b981" };

const CLASS_COLORS: Record<string, string> = {
  "TOP SECRET":   "#ef4444",
  "SECRET":       "#f97316",
  "CONFIDENTIAL": "#ffb700",
  "UNCLASSIFIED": "#10b981",
};

function formatRelTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  if (diff < 60000)      return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000)    return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000)   return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// ─── Mission card ─────────────────────────────────────────────────────────────

function MissionCard({ mission, selected, onClick }: { mission: Mission; selected: boolean; onClick: () => void }) {
  const sm   = STATUS_META[mission.status];
  const tm   = TYPE_META[mission.type];
  const Icon = sm.icon;
  const TypeIcon = tm.icon;

  return (
    <motion.button
      layout
      onClick={onClick}
      className={`w-full text-left p-3 rounded-sm border transition-all ${
        selected
          ? "border-aegis-cyan/50 bg-aegis-cyan/8"
          : "border-aegis-border/60 bg-aegis-panel/40 hover:bg-aegis-panel/70 hover:border-aegis-border"
      }`}
      style={selected ? { boxShadow: "0 0 12px rgba(0,217,255,0.12)" } : {}}
    >
      <div className="flex items-start gap-2">
        <div
          className="w-7 h-7 rounded-sm flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: sm.color + "18", border: `1px solid ${sm.color}44` }}
        >
          <TypeIcon className="w-3.5 h-3.5" style={{ color: sm.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[11px] font-display font-bold text-aegis-text-primary truncate">
              {mission.codename}
            </span>
            <span
              className="text-[7px] font-mono px-1 py-0 rounded-sm shrink-0"
              style={{ color: PRIORITY_COLORS[mission.priority], background: PRIORITY_COLORS[mission.priority] + "18" }}
            >
              {mission.priority}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[8px] font-mono" style={{ color: sm.color }}>
              <Icon className="w-2.5 h-2.5" />
              {sm.label}
            </span>
            <span className="text-[8px] font-mono text-aegis-text-dim">·</span>
            <span className="text-[8px] font-mono text-aegis-text-dim">{tm.label}</span>
            <span className="ml-auto text-[8px] font-mono text-aegis-text-dim">
              {mission.waypoints.length} WP
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-[7px] font-mono px-1 py-0 rounded-sm"
              style={{ color: CLASS_COLORS[mission.classification], background: CLASS_COLORS[mission.classification] + "18" }}
            >
              {mission.classification}
            </span>
            <span className="text-[8px] font-mono text-aegis-text-dim ml-auto">
              {formatRelTime(mission.updatedAt)}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// ─── Mission detail panel ─────────────────────────────────────────────────────

function MissionDetail({ mission }: { mission: Mission }) {
  const { updateMission, deleteMission, setSelectedMission, addMission } = useAegisStore();
  const [editing, setEditing]     = useState(false);
  const [briefing, setBriefing]   = useState(mission.briefing);
  const [objective, setObjective] = useState(mission.objective);

  const sm = STATUS_META[mission.status];
  const tm = TYPE_META[mission.type];

  const cycleStatus = () => {
    const order: MissionStatus[] = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETE", "COMPROMISED", "ABORTED"];
    const next = order[(order.indexOf(mission.status) + 1) % order.length];
    updateMission(mission.id, { status: next });
  };

  const handleSave = () => {
    updateMission(mission.id, { briefing, objective });
    setEditing(false);
  };

  const handleDelete = () => {
    deleteMission(mission.id);
    setSelectedMission(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-aegis-border shrink-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[8px] font-mono px-1.5 py-0.5 rounded-sm border"
                style={{ color: CLASS_COLORS[mission.classification], borderColor: CLASS_COLORS[mission.classification] + "44", background: CLASS_COLORS[mission.classification] + "12" }}
              >
                <Lock className="w-2 h-2 inline mr-0.5" />{mission.classification}
              </span>
              <span
                className="text-[8px] font-mono px-1.5 py-0.5 rounded-sm border"
                style={{ color: PRIORITY_COLORS[mission.priority], borderColor: PRIORITY_COLORS[mission.priority] + "44", background: PRIORITY_COLORS[mission.priority] + "12" }}
              >
                {mission.priority}
              </span>
            </div>
            <h2 className="text-base font-display font-bold text-aegis-text-primary tracking-wide">
              OP {mission.codename}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-mono text-aegis-text-dim flex items-center gap-1">
                <tm.icon className="w-3 h-3" />{tm.label}
              </span>
              <span className="text-aegis-text-dim text-[9px]">·</span>
              <span className="text-[9px] font-mono text-aegis-text-dim">ID: {mission.id}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditing(v => !v)}
              className={`p-1.5 rounded-sm border transition-all ${editing ? "border-aegis-cyan/50 text-aegis-cyan bg-aegis-cyan/10" : "border-aegis-border text-aegis-text-dim hover:text-aegis-text-secondary"}`}
            >
              <Edit3 className="w-3 h-3" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-sm border border-aegis-border text-aegis-text-dim hover:text-aegis-red hover:border-aegis-red/40 transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={cycleStatus}
            className="flex items-center gap-1.5 text-[9px] font-mono rounded-sm border px-2 py-1 transition-all hover:opacity-80"
            style={{ color: sm.color, borderColor: sm.color + "44", background: sm.color + "12" }}
          >
            <sm.icon className="w-3 h-3" />{sm.label} <ChevronRight className="w-2.5 h-2.5" />
          </button>
          {mission.eta && (
            <span className="flex items-center gap-1 text-[9px] font-mono text-aegis-text-secondary">
              <Clock className="w-3 h-3" />ETA: {mission.eta}
            </span>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

        {/* Objective */}
        <section>
          <div className="flex items-center gap-2 mb-1.5">
            <Target className="w-3 h-3 text-aegis-cyan" />
            <span className="text-[9px] font-mono text-aegis-cyan uppercase tracking-widest">OBJECTIVE</span>
          </div>
          {editing ? (
            <textarea
              value={objective}
              onChange={e => setObjective(e.target.value)}
              rows={2}
              className="w-full bg-aegis-bg border border-aegis-cyan/30 rounded-sm px-2 py-1.5 text-[10px] font-mono text-aegis-text-primary focus:outline-none focus:border-aegis-cyan/60 resize-none"
            />
          ) : (
            <p className="text-[10px] font-mono text-aegis-text-secondary leading-relaxed">{mission.objective}</p>
          )}
        </section>

        {/* Briefing */}
        <section>
          <div className="flex items-center gap-2 mb-1.5">
            <FileText className="w-3 h-3 text-aegis-purple" />
            <span className="text-[9px] font-mono text-aegis-purple uppercase tracking-widest">BRIEFING</span>
          </div>
          {editing ? (
            <textarea
              value={briefing}
              onChange={e => setBriefing(e.target.value)}
              rows={4}
              className="w-full bg-aegis-bg border border-aegis-purple/30 rounded-sm px-2 py-1.5 text-[10px] font-mono text-aegis-text-primary focus:outline-none focus:border-aegis-purple/60 resize-none"
            />
          ) : (
            <p className="text-[11px] text-aegis-text-secondary leading-relaxed">{mission.briefing}</p>
          )}
          {editing && (
            <div className="flex gap-2 mt-2">
              <button onClick={handleSave} className="flex items-center gap-1 text-[9px] font-mono text-aegis-green border border-aegis-green/40 px-2 py-1 rounded-sm hover:bg-aegis-green/10">
                <Save className="w-3 h-3" />SAVE
              </button>
              <button onClick={() => { setEditing(false); setBriefing(mission.briefing); setObjective(mission.objective); }}
                className="flex items-center gap-1 text-[9px] font-mono text-aegis-text-dim border border-aegis-border px-2 py-1 rounded-sm hover:text-aegis-text-secondary">
                <X className="w-3 h-3" />CANCEL
              </button>
            </div>
          )}
        </section>

        {/* Waypoints */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-3 h-3 text-aegis-amber" />
            <span className="text-[9px] font-mono text-aegis-amber uppercase tracking-widest">
              WAYPOINTS ({mission.waypoints.length})
            </span>
          </div>
          <div className="space-y-1">
            {mission.waypoints.length === 0 && (
              <p className="text-[9px] font-mono text-aegis-text-dim">No waypoints — click globe to add</p>
            )}
            {[...mission.waypoints].sort((a,b)=>a.order-b.order).map((wp, i) => (
              <div key={wp.id} className="flex items-center gap-2 text-[9px] font-mono">
                <span className="w-4 h-4 rounded-full border border-aegis-cyan/40 flex items-center justify-center text-[8px] text-aegis-cyan shrink-0">
                  {i + 1}
                </span>
                <span className="text-aegis-text-primary">{wp.label}</span>
                <span className="text-aegis-text-dim ml-auto">
                  {wp.lat}°, {wp.lng}°
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Assigned agents */}
        <section>
          <div className="flex items-center gap-2 mb-1.5">
            <Users className="w-3 h-3 text-aegis-green" />
            <span className="text-[9px] font-mono text-aegis-green uppercase tracking-widest">
              ASSIGNED ({mission.assignedAgents.length})
            </span>
          </div>
          {mission.assignedAgents.length === 0 ? (
            <p className="text-[9px] font-mono text-aegis-text-dim">No agents assigned</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {mission.assignedAgents.map(a => (
                <span key={a} className="text-[8px] font-mono text-aegis-green border border-aegis-green/30 bg-aegis-green/8 px-1.5 py-0.5 rounded-sm">{a}</span>
              ))}
            </div>
          )}
        </section>

        {/* Timestamps */}
        <section className="border-t border-aegis-border/50 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[7px] font-mono text-aegis-text-dim block uppercase tracking-wider">CREATED</span>
              <span className="text-[9px] font-mono text-aegis-text-secondary">{formatRelTime(mission.createdAt)}</span>
            </div>
            <div>
              <span className="text-[7px] font-mono text-aegis-text-dim block uppercase tracking-wider">UPDATED</span>
              <span className="text-[9px] font-mono text-aegis-text-secondary">{formatRelTime(mission.updatedAt)}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── New mission form ─────────────────────────────────────────────────────────

function NewMissionForm({ onClose, pendingWaypoints, onClearWaypoints }: {
  onClose: () => void;
  pendingWaypoints: { lat: number; lng: number }[];
  onClearWaypoints: () => void;
}) {
  const { addMission, setSelectedMission } = useAegisStore();
  const [codename, setCodename] = useState("");
  const [type,     setType]     = useState<MissionType>("SURVEILLANCE");
  const [priority, setPriority] = useState<"FLASH" | "URGENT" | "ROUTINE">("URGENT");
  const [cls,      setCls]      = useState<Mission["classification"]>("SECRET");
  const [briefing, setBriefing] = useState("");
  const [objective,setObjective]= useState("");

  const handleCreate = () => {
    if (!codename.trim()) return;
    const id = `msn-${Date.now()}`;
    const waypoints: MissionWaypoint[] = pendingWaypoints.map((wp, i) => ({
      id:    `wp-${id}-${i}`,
      lat:   wp.lat,
      lng:   wp.lng,
      label: `WP-${String(i + 1).padStart(2, "0")}`,
      order: i + 1,
    }));
    const mission: Mission = {
      id, codename: codename.toUpperCase(), type, status: "PLANNING",
      priority, threat: priority === "FLASH" ? "CRITICAL" : priority === "URGENT" ? "HIGH" : "MEDIUM",
      classification: cls, briefing, objective, waypoints,
      assignedAgents: [], createdAt: new Date(), updatedAt: new Date(),
    };
    addMission(mission);
    setSelectedMission(id);
    onClearWaypoints();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-aegis-border">
        <div className="flex items-center gap-2">
          <Plus className="w-3.5 h-3.5 text-aegis-cyan" />
          <span className="text-[10px] font-mono text-aegis-cyan uppercase tracking-widest">NEW OPERATION</span>
        </div>
        <button onClick={onClose} className="text-aegis-text-dim hover:text-aegis-text-secondary transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Codename */}
        <div>
          <label className="block text-[8px] font-mono text-aegis-text-dim uppercase tracking-wider mb-1">OPERATION CODENAME</label>
          <input
            type="text"
            placeholder="e.g. IRON SHADOW"
            value={codename}
            onChange={e => setCodename(e.target.value)}
            className="w-full bg-aegis-bg border border-aegis-border rounded-sm px-2 py-1.5 text-[11px] font-mono text-aegis-text-primary placeholder-aegis-text-dim focus:outline-none focus:border-aegis-cyan/50 uppercase"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-[8px] font-mono text-aegis-text-dim uppercase tracking-wider mb-1">TYPE</label>
          <div className="grid grid-cols-3 gap-1">
            {(Object.keys(TYPE_META) as MissionType[]).map(t => {
              const TypeIcon = TYPE_META[t].icon;
              return (
                <button key={t} onClick={() => setType(t)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-sm border text-[8px] font-mono transition-all ${type === t ? "border-aegis-cyan/50 text-aegis-cyan bg-aegis-cyan/10" : "border-aegis-border text-aegis-text-dim hover:border-aegis-border/80"}`}>
                  <TypeIcon className="w-2.5 h-2.5" />{TYPE_META[t].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Priority + Classification */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[8px] font-mono text-aegis-text-dim uppercase tracking-wider mb-1">PRIORITY</label>
            <select value={priority} onChange={e => setPriority(e.target.value as typeof priority)}
              className="w-full bg-aegis-bg border border-aegis-border rounded-sm px-2 py-1.5 text-[10px] font-mono text-aegis-text-primary focus:outline-none focus:border-aegis-cyan/50">
              <option>FLASH</option><option>URGENT</option><option>ROUTINE</option>
            </select>
          </div>
          <div>
            <label className="block text-[8px] font-mono text-aegis-text-dim uppercase tracking-wider mb-1">CLASSIFICATION</label>
            <select value={cls} onChange={e => setCls(e.target.value as typeof cls)}
              className="w-full bg-aegis-bg border border-aegis-border rounded-sm px-2 py-1.5 text-[10px] font-mono text-aegis-text-primary focus:outline-none focus:border-aegis-cyan/50">
              <option>TOP SECRET</option><option>SECRET</option><option>CONFIDENTIAL</option><option>UNCLASSIFIED</option>
            </select>
          </div>
        </div>

        {/* Objective */}
        <div>
          <label className="block text-[8px] font-mono text-aegis-text-dim uppercase tracking-wider mb-1">OBJECTIVE</label>
          <input type="text" placeholder="Primary mission objective…" value={objective}
            onChange={e => setObjective(e.target.value)}
            className="w-full bg-aegis-bg border border-aegis-border rounded-sm px-2 py-1.5 text-[10px] font-mono text-aegis-text-primary placeholder-aegis-text-dim focus:outline-none focus:border-aegis-cyan/50" />
        </div>

        {/* Briefing */}
        <div>
          <label className="block text-[8px] font-mono text-aegis-text-dim uppercase tracking-wider mb-1">BRIEFING</label>
          <textarea rows={3} placeholder="Operational briefing…" value={briefing}
            onChange={e => setBriefing(e.target.value)}
            className="w-full bg-aegis-bg border border-aegis-border rounded-sm px-2 py-1.5 text-[10px] font-mono text-aegis-text-primary placeholder-aegis-text-dim focus:outline-none focus:border-aegis-cyan/50 resize-none" />
        </div>

        {/* Pending waypoints */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-3 h-3 text-aegis-amber" />
            <span className="text-[8px] font-mono text-aegis-amber uppercase tracking-wider">
              WAYPOINTS ({pendingWaypoints.length})
            </span>
            <span className="text-[8px] font-mono text-aegis-text-dim">— click globe to add</span>
          </div>
          {pendingWaypoints.length > 0 && (
            <div className="space-y-0.5">
              {pendingWaypoints.map((wp, i) => (
                <div key={i} className="flex items-center gap-2 text-[9px] font-mono text-aegis-text-secondary">
                  <span className="w-3.5 h-3.5 rounded-full border border-aegis-amber/40 flex items-center justify-center text-[7px] text-aegis-amber shrink-0">{i+1}</span>
                  {wp.lat}°, {wp.lng}°
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-aegis-border shrink-0">
        <button
          onClick={handleCreate}
          disabled={!codename.trim()}
          className="w-full flex items-center justify-center gap-2 text-[10px] font-mono text-aegis-bg bg-aegis-cyan hover:bg-aegis-cyan/90 disabled:bg-aegis-border disabled:text-aegis-text-dim py-2 rounded-sm transition-all uppercase tracking-widest"
        >
          <Plus className="w-3 h-3" />CREATE OPERATION
        </button>
      </div>
    </motion.div>
  );
}

// ─── Stats strip ──────────────────────────────────────────────────────────────

function MissionStats() {
  const { missions } = useAegisStore();
  const counts = useMemo(() => ({
    active:      missions.filter(m => m.status === "ACTIVE").length,
    planning:    missions.filter(m => m.status === "PLANNING").length,
    complete:    missions.filter(m => m.status === "COMPLETE").length,
    compromised: missions.filter(m => m.status === "COMPROMISED").length,
  }), [missions]);

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-aegis-border shrink-0 bg-aegis-panel/30">
      {[
        { label: "ACTIVE",  value: counts.active,  color: "#00d9ff" },
        { label: "PLANNING",value: counts.planning, color: "#8b5cf6" },
        { label: "DONE",    value: counts.complete, color: "#10b981" },
        { label: "COMPROMISED",value:counts.compromised,color:"#ef4444"},
      ].map(s => (
        <div key={s.label} className="flex items-center gap-1.5">
          <span className="text-sm font-display font-bold" style={{ color: s.color }}>{s.value}</span>
          <span className="text-[8px] font-mono text-aegis-text-dim">{s.label}</span>
        </div>
      ))}
      <div className="ml-auto text-[8px] font-mono text-aegis-text-dim">
        TOTAL: {missions.length} OPS
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MissionPlanner() {
  const { missions, selectedMissionId, setSelectedMission } = useAegisStore();
  const [showNewForm, setShowNewForm]         = useState(false);
  const [addWaypointMode, setAddWaypointMode] = useState(false);
  const [pendingWaypoints, setPendingWaypoints] = useState<{ lat: number; lng: number }[]>([]);

  const selectedMission = useMemo(
    () => missions.find(m => m.id === selectedMissionId) ?? null,
    [missions, selectedMissionId]
  );

  const handleWaypointAdd = useCallback((lat: number, lng: number) => {
    setPendingWaypoints(prev => [...prev, { lat, lng }]);
  }, []);

  const handleClearWaypoints = useCallback(() => {
    setPendingWaypoints([]);
    setAddWaypointMode(false);
  }, []);

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left panel: Mission list ─────────────────────────────────────────── */}
      <div className="w-64 flex flex-col border-r border-aegis-border shrink-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-aegis-border shrink-0">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-aegis-cyan" />
            <span className="text-sm font-display font-semibold text-aegis-text-primary">OPS CENTER</span>
          </div>
          <button
            onClick={() => { setShowNewForm(v => !v); if (!showNewForm) setAddWaypointMode(false); }}
            className={`flex items-center gap-1 text-[9px] font-mono px-2 py-1 rounded-sm border transition-all ${
              showNewForm
                ? "border-aegis-red/40 text-aegis-red bg-aegis-red/10"
                : "border-aegis-cyan/40 text-aegis-cyan hover:bg-aegis-cyan/10"
            }`}
          >
            {showNewForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showNewForm ? "CANCEL" : "NEW OP"}
          </button>
        </div>

        <MissionStats />

        {/* New mission form / list */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {showNewForm ? (
              <NewMissionForm
                key="form"
                onClose={() => setShowNewForm(false)}
                pendingWaypoints={pendingWaypoints}
                onClearWaypoints={handleClearWaypoints}
              />
            ) : (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="p-2 space-y-1.5">
                {missions.map(m => (
                  <MissionCard
                    key={m.id}
                    mission={m}
                    selected={m.id === selectedMissionId}
                    onClick={() => {
                      setSelectedMission(m.id === selectedMissionId ? null : m.id);
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Waypoint mode toggle */}
        {(showNewForm || selectedMission) && (
          <div className="p-3 border-t border-aegis-border shrink-0">
            <button
              onClick={() => setAddWaypointMode(v => !v)}
              className={`w-full flex items-center justify-center gap-2 text-[9px] font-mono py-1.5 rounded-sm border transition-all ${
                addWaypointMode
                  ? "border-aegis-amber/50 text-aegis-amber bg-aegis-amber/10 animate-pulse"
                  : "border-aegis-border text-aegis-text-secondary hover:border-aegis-amber/30 hover:text-aegis-amber"
              }`}
            >
              <MapPin className="w-3 h-3" />
              {addWaypointMode ? "CLICK GLOBE TO DROP WP" : "ADD WAYPOINT ON GLOBE"}
            </button>
          </div>
        )}
      </div>

      {/* ── Center: Globe ────────────────────────────────────────────────────── */}
      <div className="flex-1 relative min-w-0 overflow-hidden">
        <MissionGlobe
          addWaypointMode={addWaypointMode}
          onWaypointAdd={handleWaypointAdd}
          activeMission={selectedMission}
        />
      </div>

      {/* ── Right panel: Mission detail ──────────────────────────────────────── */}
      <AnimatePresence>
        {selectedMission && !showNewForm && (
          <motion.div
            key={selectedMission.id}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-l border-aegis-border overflow-hidden shrink-0"
          >
            <div className="w-70 h-full" style={{ width: 280 }}>
              <MissionDetail mission={selectedMission} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
