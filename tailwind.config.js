/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './ui.html'],
  theme: {
    extend: {
      colors: {
        wm: {
          bg: '#0D1B2E',
          surface: '#152234',
          panel: '#102030',
          border: '#1E3350',
          'border-light': '#294460',
          text: '#D5E0F0',
          muted: '#6B7A9A',
          accent: '#e85252',
          'accent-hover': '#f06565',
          track: '#0A1624',
          'track-alt': '#122030',
          keyframe: '#f5a623',
          record: '#e85252',
          playhead: '#e85252',
          green: '#4ade80',
        }
      },
      fontSize: {
        '2xs': '10px',
      }
    }
  },
  plugins: []
};
