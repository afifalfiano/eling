module.exports = {
  content: ['./apps/web/src/**/*.{ts,html}'],
  theme: {
    extend: {
      colors: {
        bg: '#FAFAF8',
        surface: '#FFFFFF',
        text: '#1F1E1C',
        muted: '#6B6760',
        faint: '#9A9588',
        border: '#E7E3DA',
        loop: '#D85A30',
        done: '#3B6D11',
        'ctx-kerja': '#378ADD',
        'ctx-pribadi': '#BA7517',
        'ctx-other': '#888780',
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
      },
    },
  },
  plugins: [],
};
