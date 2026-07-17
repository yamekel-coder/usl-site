/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.ejs"],
  theme: {
    extend: {
      colors: {
        darker: '#050505',
        dark: '#0A0A0A',
        'dark-2': '#111111',
        'dark-3': '#171717',
        'dark-4': '#202020',
        'gray-1': '#2D2D2D',
        'gray-2': '#444444',
        'gray-3': '#777777',
        'gray-4': '#BFBFBF',
        'gray-5': '#E5E5E5',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      animation: {
        'float': 'float 20s ease-in-out infinite',
        'float-slow': 'float 30s ease-in-out infinite reverse',
        'pulse-glow': 'pulseGlow 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '25%': { transform: 'translate(30px, -40px) rotate(90deg)' },
          '50%': { transform: 'translate(-20px, -80px) rotate(180deg)' },
          '75%': { transform: 'translate(-40px, -20px) rotate(270deg)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.03' },
          '50%': { opacity: '0.06' },
        },
      },
    },
  },
  plugins: [],
};
