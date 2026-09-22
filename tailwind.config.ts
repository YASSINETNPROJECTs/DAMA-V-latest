import type { Config } from "tailwindcss";

// DAMA design tokens — dark premium esports. One system, every surface.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#04070d",
          900: "#070b14",
        },
        arena: {
          950: "#070b14",
          900: "#0b1120",
          800: "#111a2e",
          700: "#1a2540",
          600: "#243356",
        },
        accent: {
          DEFAULT: "#22d3ee",
          soft: "#67e8f9",
          strong: "#0891b2",
        },
        gold: {
          DEFAULT: "#f5c542",
          soft: "#fde68a",
        },
        win: "#34d399",
        loss: "#f87171",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 34px rgba(0,0,0,0.38)",
        glow: "0 0 26px rgba(34,211,238,0.16)",
        "glow-strong": "0 0 38px rgba(34,211,238,0.30)",
        "glow-gold": "0 0 26px rgba(245,197,66,0.20)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-9px)" },
        },
        radar: {
          "0%": { transform: "scale(0.35)", opacity: "0.9" },
          "100%": { transform: "scale(1.5)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-420px 0" },
          "100%": { backgroundPosition: "420px 0" },
        },
        "pulse-soft": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.55s cubic-bezier(0.22,1,0.36,1) both",
        float: "float 5.5s ease-in-out infinite",
        radar: "radar 2.2s cubic-bezier(0,0,0.2,1) infinite",
        shimmer: "shimmer 1.6s linear infinite",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
