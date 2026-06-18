import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        aegis: {
          bg:        "#030712",
          panel:     "#060d1f",
          border:    "#0d2040",
          cyan:      "#00d9ff",
          "cyan-dim": "#0099cc",
          purple:    "#8b5cf6",
          magenta:   "#e040fb",
          amber:     "#ffb700",
          red:       "#ef4444",
          orange:    "#f97316",
          green:     "#10b981",
          "green-bright": "#00ff88",
          blue:      "#3b82f6",
          "text-primary":   "#e2e8f0",
          "text-secondary": "#64748b",
          "text-dim":       "#334155",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scan": "scan 4s linear infinite",
        "sweep": "sweep 4s linear infinite",
        "flicker": "flicker 0.15s infinite",
        "data-stream": "dataStream 2s linear infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "ping-slow": "ping 3s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        sweep: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
        dataStream: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-50%)" },
        },
        glow: {
          "0%": { textShadow: "0 0 10px rgba(0, 217, 255, 0.5)" },
          "100%": { textShadow: "0 0 30px rgba(0, 217, 255, 1), 0 0 60px rgba(0, 217, 255, 0.5)" },
        },
      },
      backgroundImage: {
        "grid-pattern": "linear-gradient(rgba(0, 217, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 217, 255, 0.03) 1px, transparent 1px)",
        "radial-glow": "radial-gradient(ellipse at center, rgba(0, 217, 255, 0.15) 0%, transparent 70%)",
        "panel-gradient": "linear-gradient(135deg, rgba(0, 217, 255, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)",
      },
      backgroundSize: {
        "grid": "40px 40px",
      },
      boxShadow: {
        "glow-cyan": "0 0 20px rgba(0, 217, 255, 0.3), inset 0 0 20px rgba(0, 217, 255, 0.05)",
        "glow-red": "0 0 20px rgba(239, 68, 68, 0.4), inset 0 0 20px rgba(239, 68, 68, 0.05)",
        "glow-purple": "0 0 20px rgba(139, 92, 246, 0.3), inset 0 0 20px rgba(139, 92, 246, 0.05)",
        "glow-amber": "0 0 20px rgba(255, 183, 0, 0.3), inset 0 0 20px rgba(255, 183, 0, 0.05)",
        "panel": "0 4px 30px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255,255,255,0.03)",
      },
      backdropBlur: {
        "xs": "2px",
      },
    },
  },
  plugins: [],
};

export default config;
