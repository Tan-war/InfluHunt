/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors: {
        page: '#F5F5F7',
        ink: '#1D1D1F',
        muted: '#6E6E73',
        line: '#D2D2D7',
        accent: '#0071E3',
      },
      borderRadius: {
        card: '16px',
        input: '12px',
      },
      maxWidth: {
        content: '960px',
      },
    },
  },
  plugins: [],
}
