// ─────────────────────────────────────────────────────────────
// API Base URL Configuration
// ─────────────────────────────────────────────────────────────
// In development (__DEV__ = true), point to your local machine.
// In production builds (APK / App Store), point to the deployed backend.
//
// Local dev options:
//   Web browser:           http://localhost:3000
//   Android emulator:      http://10.0.2.2:3000
//   Physical device (LAN): http://<YOUR_LOCAL_IP>:3000
//
// Production:
//   Render.com backend URL (set EXPO_PUBLIC_API_URL in eas.json env or here)
// ─────────────────────────────────────────────────────────────

const PRODUCTION_URL = 'https://carelink-backend-wenq.onrender.com';
const DEV_URL = 'http://10.0.2.2:3000'; // Android emulator default

// process.env.EXPO_PUBLIC_API_URL allows overriding via EAS environment variables
export const API_BASE_URL: string =
  (process.env.EXPO_PUBLIC_API_URL as string) ||
  (process.env.NODE_ENV === 'production' || !__DEV__ ? PRODUCTION_URL : DEV_URL);
