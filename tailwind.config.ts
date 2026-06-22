import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
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
      },
      boxShadow: {
        soft: "0 18px 50px rgba(17, 24, 39, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
