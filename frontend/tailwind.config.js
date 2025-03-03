const config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: "#68B984", // Vibrant green
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#E8E6E1",
          foreground: "#2D2D2D",
        },
        accent: {
          DEFAULT: "#0EA5E9", // Bright blue
          foreground: "#FFFFFF",
        },
        border: "hsl(var(--border, 214.3 31.8% 91.4%))",
        input: "hsl(var(--input, 217.2 32.6% 17.5%))",
        ring: "hsl(var(--ring, 214.3 100% 50%))",
        background: "hsl(var(--background, 0 0% 100%))",
        foreground: "#2D2D2D",
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        heading: ["Inter", "sans-serif"],
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.5s ease-out",
        fadeIn: "fadeIn 0.3s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function ({ addComponents }) {
      addComponents({
        ".border-border": {
          borderColor: "hsl(var(--border, 214.3 31.8% 91.4%))",
        },
      });
    },
  ],
};

export default config;
