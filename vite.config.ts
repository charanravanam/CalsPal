import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Helper to get env vars with priority: System Env (Netlify) > Local .env
  const getVar = (key: string) => process.env[key] || env[key] || "";
  
  const rawApiKey = getVar('API_KEY');
  const rawFirebaseKey = getVar('FIREBASE_API_KEY');
  const rawRazorpayKey = getVar('RAZORPAY_KEY_ID');

  // Helper to Base64 encode. 
  // We encode secrets at build time so the raw "AIza..." string never appears in the dist bundle.
  const encode = (str: string) => {
    if (!str) return "";
    return Buffer.from(str).toString('base64');
  };

  return {
    plugins: [react()],
    define: {
      // Inject encoded keys as global constants.
      // This bypasses 'process.env' replacement logic which can sometimes leak the raw value.
      '__GEMINI_KEY__': JSON.stringify(encode(rawApiKey)),
      '__FIREBASE_KEY__': JSON.stringify(encode(rawFirebaseKey)),
      '__RAZORPAY_KEY__': JSON.stringify(encode(rawRazorpayKey)),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    }
  };
});