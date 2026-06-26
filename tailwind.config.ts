import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#102B1E",
          50: "#EBF9F2",
          100: "#C0EDD5",
          200: "#7DD4A4",
          300: "#5ABF88",
          400: "#3DB872",
          500: "#2E8A5A",
          600: "#1E5C40",
          700: "#194E37",
          800: "#14402E",
          900: "#102B1E",
          950: "#0A1E14",
          mid: "#1E5C40",
          light: "#2E8A5A",
        },
        cream: {
          50: "#FFFCF4",
          100: "#F8F1DF",
          200: "#EFE2BF",
        },
        gold: {
          DEFAULT: "#3DB872",
          deep: "#2E8A5A",
          dark: "#1E5C40",
          soft: "#C0EDD5",
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
        soft: "0 18px 50px rgba(16, 43, 30, 0.09)",
        card: "0 24px 70px rgba(16, 43, 30, 0.12)",
        glow: "0 18px 48px rgba(61, 184, 114, 0.25)",
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
