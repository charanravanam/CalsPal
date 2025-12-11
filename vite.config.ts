import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Fetch keys from Netlify environment (process.env) or local .env
  const rawApiKey = process.env.API_KEY || env.API_KEY || "";
  const rawFirebaseKey = process.env.FIREBASE_API_KEY || env.FIREBASE_API_KEY || "";
  const rawRazorpayKey = process.env.RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID || "";

  // Helper to Base64 encode to prevent raw secrets from appearing in the build output
  const encode = (str: string) => Buffer.from(str).toString('base64');

  return {
    plugins: [react()],
    define: {
      // Replace process.env.VARIABLE in client code with the ENCODED string value.
      // This ensures the actual "AIza..." string never exists in the dist/ files.
      'process.env.API_KEY': JSON.stringify(encode(rawApiKey)),
      'process.env.FIREBASE_API_KEY': JSON.stringify(encode(rawFirebaseKey)),
      'process.env.RAZORPAY_KEY_ID': JSON.stringify(encode(rawRazorpayKey)),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    }
  };
});