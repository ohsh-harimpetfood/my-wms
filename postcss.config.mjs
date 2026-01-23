// postcss.config.mjs
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},  // <--- 여기가 핵심 변경 사항!
    autoprefixer: {},
  },
};

export default config;