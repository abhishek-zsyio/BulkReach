import type { Config } from "tailwindcss";

function withOpacity(variableName: string): any {
  return ({ opacityValue }: { opacityValue?: string }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}-rgb), ${opacityValue})`;
    }
    return `var(${variableName})`;
  };
}

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        surface: {
          DEFAULT: withOpacity("--color-surface"),
          50: withOpacity("--color-overlay"),
          100: withOpacity("--color-overlay"),
          200: withOpacity("--color-base"),
        },
        "rose-base": withOpacity("--color-base"),
        "rose-surface": withOpacity("--color-surface"),
        "rose-overlay": withOpacity("--color-overlay"),
        "rose-muted": withOpacity("--color-muted"),
        "rose-subtle": withOpacity("--color-subtle"),
        "rose-text": withOpacity("--color-text"),
        "rose-border": withOpacity("--color-border"),
        "rose-shadow": withOpacity("--color-shadow"),
        "rose-love": withOpacity("--color-love"),
        "rose-gold": withOpacity("--color-gold"),
        "rose-rose": withOpacity("--color-rose"),
        "rose-pine": withOpacity("--color-pine"),
        "rose-foam": withOpacity("--color-foam"),
        "rose-iris": withOpacity("--color-iris"),
        "rose-hl-low": withOpacity("--color-hl-low"),
        "rose-hl-med": withOpacity("--color-hl-med"),
        "rose-hl-high": withOpacity("--color-hl-high"),
      },
      boxShadow: {
        "rose-sm": "none",
        "rose-md": "none",
        "rose-lg": "none",
        "rose-glow": "none",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-brand": "linear-gradient(135deg, var(--color-pine) 0%, var(--color-iris) 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.35s ease-out",
        "slide-up": "slideUp 0.35s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "-200% center" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
