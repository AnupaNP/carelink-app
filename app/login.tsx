import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

const DEMO_USERS = [
  { name: 'Sarah Mitchell', email: 'sarah@carelink.com', role: '3 Elders' },
  { name: 'James Okafor', email: 'james@carelink.com', role: '1 Elder' },
  { name: 'Priya Sharma', email: 'priya@carelink.com', role: '1 Elder' },
  { name: 'Elena Vasquez', email: 'elena@carelink.com', role: '0 Elders' },
  { name: 'David Chen', email: 'david@carelink.com', role: '0 Elders' },
];

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('sarah@carelink.com');
  const [password, setPassword] = useState('CareLink@123');
  const [loading, setLoading] = useState(false);
  const [showDemoUsers, setShowDemoUsers] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Login failed. Please check your credentials.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  }

  function selectDemoUser(user: typeof DEMO_USERS[0]) {
    setEmail(user.email);
    setPassword('CareLink@123');
    setShowDemoUsers(false);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#050B18', '#0B1120', '#131D31']} style={StyleSheet.absoluteFill} />

      {/* Decorative circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo & Brand */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <LinearGradient colors={['#4E8EFF', '#9B7FEA']} style={styles.logoGradient}>
              <Text style={styles.logoIcon}>🏥</Text>
            </LinearGradient>
          </View>
          <Text style={styles.brandName}>CareLink</Text>
          <Text style={styles.tagline}>AI-Powered Elderly Care Platform</Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.welcomeTitle}>Welcome back</Text>
          <Text style={styles.welcomeSub}>Sign in to your caregiver account</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email address</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                autoComplete="password"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={['#4E8EFF', '#9B7FEA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.loginBtnGradient}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>Sign In →</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Demo Users Section */}
          <TouchableOpacity style={styles.demoToggle} onPress={() => setShowDemoUsers(!showDemoUsers)}>
            <Text style={styles.demoToggleText}>
              {showDemoUsers ? '▲ Hide demo accounts' : '▼ Show demo accounts'}
            </Text>
          </TouchableOpacity>

          {showDemoUsers && (
            <View style={styles.demoList}>
              <Text style={styles.demoListTitle}>Demo Caregivers — Password: CareLink@123</Text>
              {DEMO_USERS.map((user) => (
                <TouchableOpacity key={user.email} style={styles.demoUserRow} onPress={() => selectDemoUser(user)} activeOpacity={0.7}>
                  <View style={styles.demoUserAvatar}>
                    <Text style={styles.demoUserInitial}>{user.name[0]}</Text>
                  </View>
                  <View style={styles.demoUserInfo}>
                    <Text style={styles.demoUserName}>{user.name}</Text>
                    <Text style={styles.demoUserRole}>{user.email} · {user.role}</Text>
                  </View>
                  <Text style={styles.demoUserArrow}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.signUpRow}>
          <Text style={styles.signUpText}>New to CareLink? </Text>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.signUpLink}>Create an account →</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>© 2026 CareLink · Powered by Gemini AI</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, paddingTop: 60 },
  circle1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(78,142,255,0.06)', top: -80, right: -80 },
  circle2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(155,127,234,0.06)', bottom: 100, left: -60 },
  logoSection: { alignItems: 'center', marginBottom: 40 },
  logoContainer: { marginBottom: 16 },
  logoGradient: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  logoIcon: { fontSize: 36 },
  brandName: { fontSize: 36, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: Colors.textSecondary, marginTop: 6, letterSpacing: 0.2 },
  card: { width: '100%', maxWidth: 420, backgroundColor: Colors.surface, borderRadius: 24, padding: 28, borderWidth: 1, borderColor: Colors.border },
  welcomeTitle: { fontSize: 26, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  welcomeSub: { fontSize: 14, color: Colors.textSecondary, marginBottom: 28 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8, fontWeight: '500' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14 },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, color: Colors.text, fontSize: 15, paddingVertical: 14 },
  loginBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  loginBtnGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  demoToggle: { alignItems: 'center', marginTop: 20, paddingVertical: 8 },
  demoToggleText: { color: Colors.primary, fontSize: 13, fontWeight: '500' },
  demoList: { marginTop: 12, gap: 8 },
  demoListTitle: { fontSize: 12, color: Colors.textMuted, marginBottom: 8, textAlign: 'center' },
  demoUserRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  demoUserAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryGlow, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.primary },
  demoUserInitial: { color: Colors.primary, fontWeight: '700', fontSize: 16 },
  demoUserInfo: { flex: 1, marginLeft: 12 },
  demoUserName: { color: Colors.text, fontWeight: '600', fontSize: 14 },
  demoUserRole: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  demoUserArrow: { color: Colors.textMuted, fontSize: 16 },
  footer: { color: Colors.textMuted, fontSize: 12, marginTop: 36, marginBottom: 20 },
  signUpRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  signUpText: { color: Colors.textSecondary, fontSize: 14 },
  signUpLink: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
});
