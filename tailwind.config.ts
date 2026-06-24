import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0B1F33",
          50: "#F1F6F8",
          100: "#DDE9EE",
          200: "#B8CED8",
          300: "#89AABB",
          400: "#5C849A",
          500: "#3F687F",
          600: "#315269",
          700: "#294355",
          800: "#233847",
          900: "#0B1F33",
          950: "#071521",
          mid: "#123B52",
          light: "#2A6074",
        },
        cream: {
          50: "#FFFCF4",
          100: "#F8F1DF",
          200: "#EFE2BF",
        },
        gold: {
          DEFAULT: "#D4AF37",
          deep: "#C9A84C",
          dark: "#8F7423",
          soft: "#F2E4B0",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "Poppins",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        display: [
          "Georgia",
          "Cambria",
          "\"Times New Roman\"",
          "serif",
        ],
      },
      boxShadow: {
        soft: "0 18px 50px rgba(11, 31, 51, 0.09)",
        card: "0 24px 70px rgba(11, 31, 51, 0.12)",
        glow: "0 18px 48px rgba(212, 175, 55, 0.2)",
      },
      backgroundImage: {
        "hero-grid":
          "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
