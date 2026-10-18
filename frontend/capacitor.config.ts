import type {CapacitorConfig} from '@capacitor/cli'

// The Android and iOS apps are this web app (dist/) in a native WebView.
const config: CapacitorConfig = {
  appId: 'dev.matswuuu.hse',
  appName: 'HSE Competition',
  webDir: 'dist',
}

export default config
