/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        navy: {
          deepest: '#020812',
          deep: '#050D1F',
          dark: '#0A1628',
          mid: '#0A2463',
          light: '#1a3a7c',
        },
        blue: {
          electric: '#1E88E5',
          bright: '#42A5F5',
          soft: '#90CAF9',
        },
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(10, 36, 99, 0.25) 0%, rgba(5, 13, 31, 0.4) 100%)',
      },
      animation: {
        'blob-1': 'blobFloat1 12s ease-in-out infinite',
        'blob-2': 'blobFloat2 16s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'bg-shift': 'bgShift 20s ease infinite',
      },
    },
  },
  plugins: [],
};