/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        pastelBlue: "#A7C7E7",
        pastelLavender: "#C8BFE7",
        pastelPink: "#F5C7D8",
        pastelMint: "#C7EFCF",
        pastelPeach: "#FFD8BE"
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
