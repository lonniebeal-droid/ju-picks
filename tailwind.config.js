/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        jp: {
          bg: "#07080c",
          card: "#12141c",
          elevated: "#1a1d28",
          border: "#2a2f3d",
          accent: "#00e5a8",
          accent2: "#ffb800",
          danger: "#ff4d6d",
          muted: "#9aa3b5",
          text: "#f4f6fb",
        },
      },
      boxShadow: {
        "jp-card": "0 10px 30px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.04)",
        "jp-glow": "0 0 24px rgba(0,229,168,.25)",
      },
      borderRadius: {
        "jp": "16px",
      },
      fontFamily: {
        jp: ['"Segoe UI"', "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
