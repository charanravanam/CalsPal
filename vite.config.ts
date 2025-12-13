import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Simple helper to get env vars
  const getVar = (key: string) => process.env[key] || env[key] || "";
  
  // Key obfuscation logic matching the frontend decoding
  const obfuscate = (str: string) => {
    if (!str) return "";
    try {
        const reversed = str.split('').reverse().join('');
        // Simple base64 encoding compatible with Node/Vite build
        return Buffer.from(reversed).toString('base64');
    } catch (e) {
        return "";
    }
  };

  return {
    plugins: [react()],
    base: './', // Ensures assets are linked relatively
    define: {
      // Inject obfuscated keys expected by services/*.ts
      '__GEMINI_KEY__': JSON.stringify(obfuscate(getVar('API_KEY'))),
      '__FIREBASE_KEY__': JSON.stringify(obfuscate(getVar('FIREBASE_API_KEY'))),
      '__RAZORPAY_KEY__': JSON.stringify(obfuscate(getVar('RAZORPAY_KEY_ID'))),
      '__RAZORPAY_PLAN_ID__': JSON.stringify(obfuscate(getVar('RAZORPAY_PLAN_ID'))),
      '__RAZORPAY_SUBSCRIPTION_ID__': JSON.stringify(obfuscate(getVar('RAZORPAY_SUBSCRIPTION_ID'))),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    server: {
      host: true
    }
  };
});