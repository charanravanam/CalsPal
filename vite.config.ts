import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Prioritize the system environment variable (Netlify) over the .env file
  const apiKey = process.env.API_KEY || env.API_KEY || "";
  const firebaseApiKey = process.env.FIREBASE_API_KEY || env.FIREBASE_API_KEY || "";
  const razorpayKey = process.env.RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID || "";

  return {
    plugins: [react()],
    define: {
      // Define process.env variables so they are replaced at build time with the string value.
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.FIREBASE_API_KEY': JSON.stringify(firebaseApiKey),
      'process.env.RAZORPAY_KEY_ID': JSON.stringify(razorpayKey),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    }
  };
});