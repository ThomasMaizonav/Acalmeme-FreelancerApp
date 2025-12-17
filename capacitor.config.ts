import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.acalmeme.web',
  appName: 'AcalmeMe',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
