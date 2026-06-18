"use client";

import { motion } from "framer-motion";
import { FileText, Lock, Shield, AlertTriangle } from "lucide-react";
import { ThreatBadge } from "@/components/ui/ThreatBadge";

const MOCK_REPORTS = [
  {
    id: "rpt-001",
    title: "East Asia Escalation Assessment: Taiwan Strait Crisis",
    classification: "TOP SECRET",
    threat: "CRITICAL" as const,
    summary: "Multi-vector analysis of PRC force posture changes suggests coordinated pressure campaign coinciding with US election cycle. Three independent AI agents converged on coordinated-action hypothesis.",
    regions: ["East Asia", "Taiwan", "Pacific Command"],
    generatedAt: new Date(Date.now() - 1000 * 60 * 15),
    confidence: 87,
    keyFindings: [
      "22+ aircraft intrusions represent largest single-day incursion since 2022",
      "PLAAF rotation patterns suggest sustained pressure campaign, not one-off demonstration",
      "Economic indicators suggest PRC believes current window is strategically optimal",
      "US carrier group repositioning detected 6h prior to intrusion",
    ],
  },
  {
    id: "rpt-002",
    title: "APT-41 Infrastructure Campaign: Critical Sector Analysis",
    classification: "SECRET",
    threat: "CRITICAL" as const,
    summary: "Deep-dive analysis of APT-41 TTPs reveals systematic campaign against critical infrastructure. Novel evasion techniques suggest retooling for long-term persistence.",
    regions: ["North America", "Western Europe", "East Asia"],
    generatedAt: new Date(Date.now() - 1000 * 60 * 67),
    confidence: 94,
    keyFindings: [
      "6 SCADA networks compromised across 3 countries in 90-day window",
      "New implant detected: 'WINTERHAWK' — undetected by major AV vendors",
      "C2 infrastructure shares IP ranges with PLA Unit 61398",
      "Attack vector: supply chain compromise via HVAC management software update",
    ],
  },
  {
    id: "rpt-003",
    title: "Global Information Environment Assessment — Weekly",
    classification: "CONFIDENTIAL",
    threat: "HIGH" as const,
    summary: "Coordinated disinformation operations detected across 47 state-affiliated media outlets. AI-generated synthetic media volume increased 340% in past 72 hours.",
    regions: ["Global", "Eastern Europe", "Southeast Asia"],
    generatedAt: new Date(Date.now() - 1000 * 60 * 130),
    confidence: 91,
    keyFindings: [
      "Three distinct influence operation campaigns sharing technical infrastructure",
      "Narrative injection targeting NATO solidarity — 12 member states affected",
      "Deepfake video of senior official circulating on 23 platforms",
      "Bot network activation correlates with Taiwan Strait escalation",
    ],
  },
];

const CLASS_COLORS: Record<string, string> = {
  "TOP SECRET": "text-red-500 border-red-500/40",
  "SECRET": "text-orange-500 border-orange-500/40",
  "CONFIDENTIAL": "text-amber-400 border-amber-400/40",
  "UNCLASSIFIED": "text-aegis-text-secondary border-aegis-border",
};

export function ReportsPanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-aegis-border shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-3 h-3 text-aegis-cyan" />
          <span className="text-[10px] font-mono text-aegis-cyan uppercase tracking-widest">
            INTELLIGENCE REPORTS
          </span>
        </div>
        <button className="text-[9px] font-mono text-aegis-cyan border border-aegis-cyan/30 px-2 py-0.5 rounded-sm hover:bg-aegis-cyan/10 transition-colors">
          + NEW BRIEF
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {MOCK_REPORTS.map((report, i) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel border border-aegis-border rounded-sm p-4 cursor-pointer hover:border-aegis-cyan/20 transition-all group"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[9px] font-mono border px-1.5 py-0.5 rounded-sm flex items-center gap-1 ${CLASS_COLORS[report.classification]}`}>
                  <Lock className="w-2.5 h-2.5" />
                  {report.classification}
                </span>
                <ThreatBadge level={report.threat} size="sm" />
              </div>
              <span className="text-[9px] font-mono text-aegis-text-dim shrink-0">
                {Math.round((Date.now() - report.generatedAt.getTime()) / 60000)}m ago
              </span>
            </div>

            <h3 className="text-xs font-display font-semibold text-aegis-text-primary leading-snug mb-2 group-hover:text-aegis-cyan transition-colors">
              {report.title}
            </h3>
            <p className="text-[10px] text-aegis-text-secondary leading-relaxed mb-3">
              {report.summary}
            </p>

            {/* Key Findings */}
            <div className="space-y-1 mb-3">
              <span className="text-[8px] font-mono text-aegis-text-dim uppercase tracking-widest">KEY FINDINGS</span>
              {report.keyFindings.slice(0, 3).map((f, j) => (
                <div key={j} className="flex items-start gap-1.5">
                  <Shield className="w-2.5 h-2.5 text-aegis-cyan mt-0.5 shrink-0" />
                  <span className="text-[10px] text-aegis-text-secondary leading-snug">{f}</span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-aegis-border/50">
              <div className="flex items-center gap-2">
                {report.regions.slice(0, 2).map((r) => (
                  <span key={r} className="text-[8px] font-mono text-aegis-text-dim border border-aegis-border px-1 py-0.5 rounded-sm">
                    {r}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-mono">
                <AlertTriangle className={`w-2.5 h-2.5 ${report.confidence > 85 ? "text-aegis-green" : "text-aegis-amber"}`} />
                <span className={report.confidence > 85 ? "text-aegis-green" : "text-aegis-amber"}>
                  {report.confidence}% CONFIDENCE
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
