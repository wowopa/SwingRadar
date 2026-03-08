import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./types/**/*.{ts,tsx}"
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px"
      }
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        positive: "hsl(var(--positive))",
        neutral: "hsl(var(--neutral))",
        caution: "hsl(var(--caution))"
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      backgroundImage: {
        "radar-grid": "radial-gradient(circle at top, hsl(var(--primary) / 0.18), transparent 42%), linear-gradient(hsl(var(--foreground) / 0.03) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.03) 1px, transparent 1px)",
        "panel-sheen": "linear-gradient(135deg, hsl(var(--primary) / 0.14), transparent 35%, transparent 65%, hsl(var(--foreground) / 0.03))"
      },
      backgroundSize: {
        "radar-grid": "auto, 32px 32px, 32px 32px"
      },
      boxShadow: {
        glow: "0 0 0 1px hsl(var(--primary) / 0.10), 0 20px 60px hsl(220 50% 4% / 0.45)",
        panel: "0 12px 30px hsl(220 50% 4% / 0.35)"
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;