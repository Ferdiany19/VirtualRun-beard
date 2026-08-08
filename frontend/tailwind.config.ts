import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--color-background) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-muted": "rgb(var(--color-surface-muted) / <alpha-value>)",
        foreground: "rgb(var(--color-foreground) / <alpha-value>)",
        "foreground-muted": "rgb(var(--color-foreground-muted) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        primary: "rgb(var(--color-primary-teal) / <alpha-value>)",
        "primary-hover": "rgb(var(--color-primary-teal-hover) / <alpha-value>)",
        navy: "rgb(var(--color-navy) / <alpha-value>)",
        "navy-muted": "rgb(var(--color-navy-muted) / <alpha-value>)",
        action: "rgb(var(--color-action-orange) / <alpha-value>)",
        "action-hover": "rgb(var(--color-action-orange-hover) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        info: "rgb(var(--color-info) / <alpha-value>)",
        brand: "rgb(var(--color-brand) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        "landing-paper": "var(--color-landing-paper)",
        "landing-paper-2": "var(--color-landing-paper-2)",
        "landing-ink": "var(--color-landing-ink)",
        "landing-ink-2": "var(--color-landing-ink-2)",
        "landing-rule": "var(--color-landing-rule)",
        "landing-teal": "var(--color-landing-teal)",
        "landing-teal-dark": "var(--color-landing-teal-dark)",
        "landing-orange": "var(--color-landing-orange)",
        "landing-accent-ink": "var(--color-landing-accent-ink)",
        "landing-white": "var(--color-landing-white)",
      },
      borderRadius: {
        app: "var(--radius-app)",
        section: "var(--radius-section)",
      },
      fontFamily: {
        display: ["var(--font-oswald)", "Arial Narrow", "sans-serif"],
        sans: [
          "var(--font-montserrat)",
          "Montserrat",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        floating: "0 18px 48px rgb(2 34 72 / 0.14)",
      },
    },
  },
  plugins: [],
};

export default config;
