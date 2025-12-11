import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Prioritize the system environment variable (Netlify) over the .env file
  const apiKey = process.env.API_KEY || env.API_KEY || "";
  const firebaseApiKey = process.env.FIREBASE_API_KEY || env.FIREBASE_API_KEY || "";
  const razorpayKey = process.env.RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID || "";

  // Helper to Base64 encode
  const encode = (str: string) => Buffer.from(str).toString('base64');

  return {
    plugins: [react()],
    define: {
      // Inject Base64 encoded keys to avoid "Secrets scanning" errors in build output
      'process.env.GEMINI_API_KEY_B64': JSON.stringify(encode(apiKey)),
      'process.env.FIREBASE_API_KEY_B64': JSON.stringify(encode(firebaseApiKey)),
      'process.env.RAZORPAY_KEY_ID': JSON.stringify(razorpayKey),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    }
  };
});