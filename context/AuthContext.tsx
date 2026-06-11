import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { authApi } from '@/services/api';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface Caregiver {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
}

interface AuthContextType {
  caregiver: Caregiver | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null; // Simulators can't receive push

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    // Android: create notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('carelink-alerts', {
        name: 'CareLink Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4E8EFF',
        sound: 'default',
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'carelink-app', // Replace with your Expo project ID if publishing
    });
    return tokenData.data;
  } catch (err) {
    console.warn('Push notification setup failed (non-critical):', err);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedCaregiver] = await Promise.all([
          AsyncStorage.getItem('carelink_token'),
          AsyncStorage.getItem('carelink_caregiver'),
        ]);
        if (storedToken && storedCaregiver) {
          setToken(storedToken);
          setCaregiver(JSON.parse(storedCaregiver));
          // Re-register push token on app start
          registerForPushNotifications().then(pushToken => {
            if (pushToken) authApi.savePushToken(pushToken).catch(() => {});
          });
        }
      } catch (e) {
        console.error('Auth load error:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const res = await authApi.login(email, password);
    const { token: t, caregiver: c } = res.data;
    await AsyncStorage.multiSet([
      ['carelink_token', t],
      ['carelink_caregiver', JSON.stringify(c)],
    ]);
    setToken(t);
    setCaregiver(c);
    // Register push token after login
    const pushToken = await registerForPushNotifications();
    if (pushToken) authApi.savePushToken(pushToken).catch(() => {});
  }

  async function register(data: { name: string; email: string; password: string; phone?: string }) {
    const res = await authApi.register(data);
    const { token: t, caregiver: c } = res.data;
    await AsyncStorage.multiSet([
      ['carelink_token', t],
      ['carelink_caregiver', JSON.stringify(c)],
    ]);
    setToken(t);
    setCaregiver(c);
    // Register push token after registration
    const pushToken = await registerForPushNotifications();
    if (pushToken) authApi.savePushToken(pushToken).catch(() => {});
  }

  async function logout() {
    await AsyncStorage.multiRemove(['carelink_token', 'carelink_caregiver']);
    setToken(null);
    setCaregiver(null);
  }

  return (
    <AuthContext.Provider value={{ caregiver, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
