import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.drfoodie.app',
  appName: 'Dr Foodie',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;