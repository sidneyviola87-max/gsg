import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.marketplace.app',
  appName: 'Marketplace',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ec4899',
      showSpinner: false,
    },
  },
};

export default config;
