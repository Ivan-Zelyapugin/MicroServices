module.exports = {
  safelist: [
    'list-disc',
    'list-square',
    'list-dash',
    'list-decimal-level-1',
    'list-decimal-level-2',
    'list-decimal-level-3',
  ],
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      breakAfter: {
        page: 'page',
      },
      breakBefore: {
        page: 'page',
      },
      breakInside: {
        avoid: 'avoid',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: true,
  },
};
