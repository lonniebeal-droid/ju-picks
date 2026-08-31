/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        jp: {
          bg: "#0a0a0b",
          card: "#141416",
          border: "#27272a",
          accent: "#10b981",
          muted: "#a1a1aa",
        },
      },
    },
  },
  plugins: [],
};
