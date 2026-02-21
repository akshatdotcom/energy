import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    {
      pattern: /(bg|fill|stroke|text|border|ring)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900)/,
      variants: ["dark", "hover", "ui-selected"],
    },
  ],
  theme: {
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
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        tremor: {
          brand: {
            faint: "#ecfeff",
            muted: "#a5f3fc",
            subtle: "#22d3ee",
            DEFAULT: "#06b6d4",
            emphasis: "#0891b2",
            inverted: "#ffffff",
          },
          background: {
            muted: "#f8fafc",
            subtle: "#f1f5f9",
            DEFAULT: "#ffffff",
            emphasis: "#334155",
          },
          border: {
            DEFAULT: "#e2e8f0",
          },
          ring: {
            DEFAULT: "#cbd5e1",
          },
          content: {
            subtle: "#94a3b8",
            DEFAULT: "#64748b",
            emphasis: "#334155",
            strong: "#0f172a",
            inverted: "#ffffff",
          },
        },
        "dark-tremor": {
          brand: {
            faint: "#083344",
            muted: "#155e75",
            subtle: "#0891b2",
            DEFAULT: "#06b6d4",
            emphasis: "#67e8f9",
            inverted: "#0f172a",
          },
          background: {
            muted: "#0f172a",
            subtle: "#1e293b",
            DEFAULT: "#020617",
            emphasis: "#cbd5e1",
          },
          border: {
            DEFAULT: "#334155",
          },
          ring: {
            DEFAULT: "#334155",
          },
          content: {
            subtle: "#475569",
            DEFAULT: "#94a3b8",
            emphasis: "#e2e8f0",
            strong: "#f8fafc",
            inverted: "#0f172a",
          },
        }
      },
      boxShadow: {
        "tremor-input": "0 1px 2px 0 rgb(15 23 42 / 0.08)",
        "dark-tremor-input": "0 1px 2px 0 rgb(0 0 0 / 0.45)",
        "tremor-card": "0 1px 3px 0 rgb(15 23 42 / 0.08), 0 1px 2px -1px rgb(15 23 42 / 0.1)",
        "dark-tremor-card": "0 1px 3px 0 rgb(0 0 0 / 0.35), 0 1px 2px -1px rgb(0 0 0 / 0.4)",
        "tremor-dropdown": "0 10px 20px -8px rgb(15 23 42 / 0.18)",
        "dark-tremor-dropdown": "0 10px 20px -8px rgb(0 0 0 / 0.6)",
      },
      borderRadius: {
        "tremor-small": "0.375rem",
        "tremor-default": "0.5rem",
        "tremor-full": "9999px",
      },
      fontSize: {
        "tremor-label": ["0.75rem", { lineHeight: "1rem" }],
        "tremor-default": ["0.875rem", { lineHeight: "1.25rem" }],
        "tremor-title": ["1.125rem", { lineHeight: "1.75rem" }],
        "tremor-metric": ["1.875rem", { lineHeight: "2.25rem" }],
      }
    }
  },
  plugins: []
};

export default config;
