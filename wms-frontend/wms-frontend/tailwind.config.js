/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: "#14171A",
          900: "#1D2125",
          800: "#262B30",
          700: "#333A41",
          600: "#454E57",
        },
        steel: {
          500: "#6B7885",
          400: "#8B98A5",
          300: "#B2BCC5",
        },
        paper: "#F4F6F8",
        signal: {
          amber: "#F5A524",
          "amber-dim": "#8A6113",
          red: "#E5484D",
          "red-dim": "#5C2426",
          teal: "#2DD4BF",
          "teal-dim": "#155048",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'IBM Plex Sans'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};
