/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"',
          '"Helvetica Neue"', 'system-ui', 'sans-serif',
        ],
      },
      colors: {
        ap: {
          blue:        '#0071e3',
          'blue-h':    '#0077ed',
          'blue-a':    '#006edb',
          'blue-bg':   '#e3f0fd',
          'blue-txt':  '#0058b0',
          red:         '#ff3b30',
          'red-bg':    '#fff0ef',
          'red-txt':   '#c0392b',
          green:       '#34c759',
          'green-bg':  '#e8f8ed',
          'green-txt': '#1c7737',
          orange:      '#ff9500',
          'orange-bg': '#fff0d9',
          'orange-txt':'#b85e00',
          purple:      '#bf5af2',
          'purple-bg': '#f4eaff',
          'purple-txt':'#7d2fae',
          cyan:        '#32ade6',
          'cyan-bg':   '#e5f6ff',
          'cyan-txt':  '#0073a8',
          g1:  '#f5f5f7',
          g2:  '#f2f2f2',
          g3:  '#e5e5ea',
          g4:  '#d1d1d6',
          g5:  '#aeaeb2',
          g6:  '#8e8e93',
          g7:  '#636366',
          g8:  '#48484a',
          g9:  '#3a3a3c',
          ink: '#1d1d1f',
        },
      },
      borderRadius: {
        card:    '20px',
        'card-sm': '12px',
        pill:    '9999px',
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,0.05)',
        modal: '0 20px 60px rgba(0,0,0,0.18), 0 8px 20px rgba(0,0,0,0.1)',
        seg:   '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
