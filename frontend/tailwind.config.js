/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#22C55E',
        'primary-dark': '#16A34A',
        sidebar: '#FAFAFA',
        border: '#E5E7EB',
      },
    },
  },
  plugins: [],
};
