"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  accent?: "cyan" | "red" | "purple" | "amber" | "green";
  glow?: boolean;
  animate?: boolean;
  corners?: boolean;
  onClick?: () => void;
}

const accentStyles = {
  cyan:   { border: "border-aegis-cyan/20",   glow: "glow-cyan",   dot: "bg-aegis-cyan",   title: "text-aegis-cyan" },
  red:    { border: "border-aegis-red/20",    glow: "glow-red",    dot: "bg-aegis-red",    title: "text-aegis-red" },
  purple: { border: "border-aegis-purple/20", glow: "glow-purple", dot: "bg-aegis-purple", title: "text-aegis-purple" },
  amber:  { border: "border-aegis-amber/20",  glow: "glow-amber",  dot: "bg-aegis-amber",  title: "text-aegis-amber" },
  green:  { border: "border-aegis-green/20",  glow: "glow-green",  dot: "bg-aegis-green",  title: "text-aegis-green" },
};

export function GlassCard({
  children,
  className,
  title,
  subtitle,
  accent = "cyan",
  glow = false,
  animate = true,
  corners = true,
  onClick,
}: GlassCardProps) {
  const style = accentStyles[accent];

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 8 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "relative glass-panel rounded-sm overflow-hidden",
        style.border,
        glow && style.glow,
        onClick && "cursor-pointer hover:border-opacity-50 transition-all duration-200",
        className
      )}
      onClick={onClick}
    >
      {/* Corner accents */}
      {corners && (
        <>
          <span className={cn("absolute top-0 left-0 w-3 h-px", style.dot.replace("bg-", "bg-"))} style={{ boxShadow: "none" }} />
          <span className={cn("absolute top-0 left-0 w-px h-3", style.dot.replace("bg-", "bg-"))} style={{ boxShadow: "none" }} />
          <span className={cn("absolute bottom-0 right-0 w-3 h-px", style.dot.replace("bg-", "bg-"))} style={{ boxShadow: "none" }} />
          <span className={cn("absolute bottom-0 right-0 w-px h-3", style.dot.replace("bg-", "bg-"))} style={{ boxShadow: "none" }} />
        </>
      )}

      {/* Header */}
      {(title || subtitle) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-aegis-border/50">
          <div className="flex items-center gap-2">
            <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", style.dot)} />
            {title && (
              <span className={cn("text-xs font-mono font-medium uppercase tracking-widest", style.title)}>
                {title}
              </span>
            )}
          </div>
          {subtitle && (
            <span className="text-xs text-aegis-text-secondary font-mono">
              {subtitle}
            </span>
          )}
        </div>
      )}

      {children}
    </motion.div>
  );
}
