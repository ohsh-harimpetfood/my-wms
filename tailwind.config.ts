import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      // ✨ 여기에 우리가 필요한 애니메이션을 정의합니다.
      animation: {
        'spin-reverse': 'spin-reverse 1s linear infinite',
        'progress-loading': 'progress 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'spin-reverse': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(-360deg)' },
        },
        progress: {
          '0%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
        }
      },
    },
  },
  plugins: [],
};
export default config;