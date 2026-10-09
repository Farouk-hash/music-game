// game/tailwind.config.js
//
// IMPORTANT: no hex values here. Every color maps to a CSS variable
// defined in src/styles/tokens.css. To re-theme the whole app, edit
// tokens.css only — this file stays unchanged.

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:            'var(--bg)',
        surface:       'var(--surface)',
        'surface-2':   'var(--surface-2)',
        border:        'var(--border)',

        ink:           'var(--ink)',
        'ink-muted':   'var(--ink-muted)',
        'ink-subtle':  'var(--ink-subtle)',

        accent:        'var(--accent)',
        'accent-2':    'var(--accent-2)',
        'accent-soft': 'var(--accent-soft)',

        correct:        'var(--correct)',
        'correct-soft': 'var(--correct-soft)',
        wrong:          'var(--wrong)',
        'wrong-soft':   'var(--wrong-soft)',
        highlight:      'var(--highlight)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      fontFamily: {
        sans: ['Cairo', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};