/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1440px" },
    },
    extend: {
      fontFamily: {
        sans: ["Manrope", "Segoe UI", "sans-serif"],
        display: ["Sora", "Segoe UI", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        hud: "0 24px 80px -44px rgba(0, 0, 0, 0.86), inset 0 1px 0 rgba(255,255,255,0.06)",
        "hud-lg":
          "0 38px 120px -56px rgba(0, 0, 0, 0.92), inset 0 1px 0 rgba(255,255,255,0.08)",
        cyan: "0 0 30px rgba(34, 211, 238, 0.28)",
        magenta: "0 0 30px rgba(236, 72, 153, 0.26)",
      },
      keyframes: {
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        "page-enter": {
          from: { opacity: "0", transform: "translateY(18px) scale(0.992)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.8s ease-in-out infinite",
        "page-enter": "page-enter 0.42s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
}
