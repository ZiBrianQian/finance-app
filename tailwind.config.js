/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class', // Explicitly start manual toggling via class
    theme: {
        extend: {
            colors: {
                // Mapping CSS variables for convenience if needed, 
                // though index.css @theme handles main ones.
                // keeping this minimal.
            },
        },
    },
    plugins: [],
}
