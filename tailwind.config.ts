import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-serif)', 'Georgia', 'serif'],
      },
      colors: {
        bg: '#fafaf8',
        fg: '#1a1a18',
        muted: '#888884',
        border: '#e8e8e4',
      },
    },
  },
  plugins: [],
}
export default config
