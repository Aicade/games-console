/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        custom: ["Custom"]
      },
      colors: {
        customBlue: "#0F67FE",
        customRed: "#FA4D5E",
        customGray: "#CCCCCC",
        customDarkGray: "#5D6A85",
        customLightGray: "#F2F5F9",
        customBlack: "#242E49",
      },
    },
  },
  plugins: [],
}

