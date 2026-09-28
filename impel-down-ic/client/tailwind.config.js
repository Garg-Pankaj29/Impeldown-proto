/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        seastone: '#1b2430',
        marine: '#1e3a8a',
        magma: '#ff6b1a',
        buster: '#f5c542',
        alert: '#e11d48'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        pirata: ['"Pirata One"', 'cursive']
      }
    },
  },
  plugins: [],
}
