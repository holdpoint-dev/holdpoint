/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0F172A",
        node: "#1E293B",
        "node-border": "#334155",
        accent: "#4F46E5",
        "accent-amber": "#F59E0B",
      },
      animation: {
        "edge-pulse": "edge-pulse 2s ease-in-out infinite",
      },
      keyframes: {
        "edge-pulse": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
