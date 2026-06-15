// ─────────────────────────────────────────────────────────────
// API Base URL Configuration
// ─────────────────────────────────────────────────────────────
// Production (EAS build):  uses EXPO_PUBLIC_API_URL injected at build time
// Local dev on emulator:   http://10.0.2.2:3000
// Local dev on device:     http://localhost:3000  (requires: adb reverse tcp:3000 tcp:3000)
//                          OR use your computer's LAN IP: http://192.168.x.x:3000
// ─────────────────────────────────────────────────────────────

const PRODUCTION_URL = 'https://carelink-backend-wenq.onrender.com';

// ← Change this to your computer's LAN IP if testing on a physical device without adb reverse
//   e.g. 'http://192.168.1.5:3000'
//   Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) to find your IP.
//   For emulator: keep as 'http://10.0.2.2:3000'
//   For physical device with USB + adb reverse: keep as 'http://localhost:3000'
const DEV_URL = 'http://localhost:3000';

// process.env.EXPO_PUBLIC_API_URL allows overriding via EAS environment variables
export const API_BASE_URL: string =
  (process.env.EXPO_PUBLIC_API_URL as string) ||
  (process.env.NODE_ENV === 'production' || !__DEV__ ? PRODUCTION_URL : DEV_URL);
