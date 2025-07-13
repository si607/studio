
import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'], // Assuming you might want a manual dark mode toggle later
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        headline: ['Inter', 'sans-serif'], // Can be same or different
        code: ['monospace', 'monospace'], 
      },
      colors: {
        // Theme variables will be primarily driven by globals.css
        // These are fallbacks or can be used if needed directly
        background: 'var(--background)', // This will be a gradient
        foreground: 'rgb(var(--foreground))',
        card: {
          DEFAULT: 'var(--card)', // This will be rgba with blur
          foreground: 'rgb(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'rgb(var(--popover-foreground))',
        },
        primary: { // For solid primary color if not using gradient
          DEFAULT: 'var(--primary)', 
          foreground: 'rgb(var(--primary-text))',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary))',
          foreground: 'rgb(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'rgb(var(--muted))',
          foreground: 'rgb(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'var(--accent)', 
          foreground: 'rgb(var(--accent-foreground))', 
        },
        destructive: {
          DEFAULT: 'rgb(var(--destructive))',
          foreground: 'rgb(var(--destructive-foreground))',
        },
        border: 'var(--border)',
        input: {
          DEFAULT: 'var(--input)',
          border: 'var(--input-border)',
        },
        ring: 'rgb(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)', // from globals
        xl: 'calc(var(--radius) + 4px)', // For larger cards
        '2xl': 'calc(var(--radius) + 8px)', // For even larger elements like main cards
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        gradientShift: { // Added from user HTML
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        gradientShift: 'gradientShift 4s ease infinite', // Added
      },
      backdropBlur: { // For glassmorphism
        xl: '20px',
        '2xl': '40px',
      }
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;

