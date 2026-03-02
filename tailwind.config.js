import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    deepBlue: '#1e3a8a',
                    profGreen: '#15803d',
                    accent: '#2563eb',
                    primary: '#059669', // Emerald 600
                    secondary: '#1e40af', // Blue 800
                }
            }
        },
    },
    plugins: [
        forms,
        containerQueries,
    ],
}
