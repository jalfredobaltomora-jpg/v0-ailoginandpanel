import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hrpanel.app',
  appName: 'SCA - JAB',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
};

export default config;
