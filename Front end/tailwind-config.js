// ── Shared Tailwind Config ─────────────────────────────────────────────
// Loaded after the Tailwind CDN to extend the default theme with
// HMS brand colors, surfaces, and font families.

tailwind.config = {
  theme: {
    extend: {
      colors: {
        gold:    { DEFAULT: "#B8962E", light: "#D4AF54", dark: "#8A6E1A" },
        slate:   { 950: "#0C0F1A" },
        surface: { DEFAULT: "#12172B", card: "#1A2040", sidebar: "#0E1322", input: "#0C0F1A" },
      },
      fontFamily: {
        display: ["Playfair Display", "serif"],
        body:    ["Inter", "sans-serif"],
      },
    },
  },
};
