import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleRegister() {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      Alert.alert('Missing fields', 'Please fill in your name, email, and password.');
      return;
    }
    if (form.password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim() || undefined,
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#050B18', '#0B1120', '#131D31']} style={StyleSheet.absoluteFill} />

      {/* Decorative circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoSection}>
          <LinearGradient colors={['#4E8EFF', '#9B7FEA']} style={styles.logoGradient}>
            <Text style={styles.logoIcon}>🏥</Text>
          </LinearGradient>
          <Text style={styles.brandName}>CareLink</Text>
          <Text style={styles.tagline}>Create your caregiver account</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Get Started</Text>
          <Text style={styles.subtitle}>Join CareLink and care smarter</Text>

          {[
            { key: 'name', label: 'Full Name *', placeholder: 'e.g. Sarah Mitchell', icon: '👤', type: 'default' as const, secure: false },
            { key: 'email', label: 'Email Address *', placeholder: 'your@email.com', icon: '✉️', type: 'email-address' as const, secure: false },
            { key: 'phone', label: 'Phone (optional)', placeholder: '+1-555-0100', icon: '📱', type: 'phone-pad' as const, secure: false },
            { key: 'password', label: 'Password *', placeholder: '••••••••', icon: '🔒', type: 'default' as const, secure: true },
            { key: 'confirmPassword', label: 'Confirm Password *', placeholder: '••••••••', icon: '🔐', type: 'default' as const, secure: true },
          ].map((field) => (
            <View key={field.key} style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{field.label}</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>{field.icon}</Text>
                <TextInput
                  style={styles.input}
                  value={form[field.key as keyof typeof form]}
                  onChangeText={(v) => update(field.key as keyof typeof form, v)}
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.textMuted}
                  keyboardType={field.type}
                  secureTextEntry={field.secure}
                  autoCapitalize={field.key === 'name' ? 'words' : 'none'}
                  autoComplete={field.key === 'email' ? 'email' : field.key === 'password' ? 'password' : 'off'}
                />
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={['#4E8EFF', '#9B7FEA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.registerBtnGradient}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerBtnText}>Create Account →</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footer}>© 2026 CareLink · Powered by Gemini AI</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, paddingTop: 60, paddingBottom: 40 },
  circle1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(78,142,255,0.06)', top: -80, right: -80 },
  circle2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(155,127,234,0.06)', bottom: 60, left: -60 },
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoGradient: { width: 70, height: 70, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  logoIcon: { fontSize: 32 },
  brandName: { fontSize: 32, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  tagline: { fontSize: 13, color: Colors.textSecondary, marginTop: 6 },
  card: { width: '100%', maxWidth: 420, backgroundColor: Colors.surface, borderRadius: 24, padding: 28, borderWidth: 1, borderColor: Colors.border },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 7, fontWeight: '500' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14 },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, color: Colors.text, fontSize: 15, paddingVertical: 13 },
  registerBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  registerBtnGradient: { paddingVertical: 16, alignItems: 'center' },
  registerBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  loginText: { color: Colors.textSecondary, fontSize: 14 },
  loginLink: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  footer: { color: Colors.textMuted, fontSize: 12, marginTop: 32, marginBottom: 20 },
});
