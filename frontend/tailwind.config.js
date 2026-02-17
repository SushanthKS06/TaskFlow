/** @type {import('tailwindcss').Config} */
import colors from 'tailwindcss/colors';

export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            colors: {
                // Using Zinc for a premium, neutral dark mode
                surface: colors.zinc,
                // Using Violet for a modern, vibrant accent
                primary: colors.violet,
                // Success/Error/Warning
                success: colors.emerald,
                danger: colors.rose,
                warning: colors.amber,
            },
            animation: {
                'fade-in': 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                'slide-up': 'slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                'slide-in': 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideIn: {
                    '0%': { opacity: '0', transform: 'translateX(-10px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                slideInRight: {
                    '0%': { opacity: '0', transform: 'translateX(10px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            },
        },
    },
    plugins: [],
};
