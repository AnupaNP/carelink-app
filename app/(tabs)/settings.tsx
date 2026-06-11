import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';

export default function SettingsScreen() {
  const { caregiver, logout } = useAuth();

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  }

  const items = [
    { icon: '👤', label: 'Account', sub: caregiver?.name || '' },
    { icon: '✉️', label: 'Email', sub: caregiver?.email || '' },
    { icon: '📱', label: 'Phone', sub: caregiver?.phone || 'Not set' },
    { icon: 'ℹ️', label: 'App Version', sub: '1.0.0 (Prototype)' },
    { icon: '🤖', label: 'AI Engine', sub: 'Gemini 2.0 Flash' },
    { icon: '🗄️', label: 'Database', sub: 'Neon PostgreSQL (Cloud)' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#050B18', '#0B1120']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Settings ⚙️</Text>

        <View style={styles.avatarSection}>
          <LinearGradient colors={['#4E8EFF', '#9B7FEA']} style={styles.avatar}>
            <Text style={styles.avatarInitial}>{caregiver?.name?.[0] || 'C'}</Text>
          </LinearGradient>
          <Text style={styles.caregiverName}>{caregiver?.name}</Text>
          <Text style={styles.caregiverRole}>CareLink Caregiver</Text>
        </View>

        <View style={styles.section}>
          {items.map((item) => (
            <View key={item.label} style={styles.settingsRow}>
              <Text style={styles.rowIcon}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowSub}>{item.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>CareLink Prototype · Built with Gemini AI + Neon DB</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 24, paddingTop: 60, paddingBottom: 120 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 32 },
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarInitial: { fontSize: 36, fontWeight: '800', color: '#fff' },
  caregiverName: { fontSize: 22, fontWeight: '700', color: Colors.text },
  caregiverRole: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  section: { backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: 24 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowIcon: { fontSize: 20, width: 28 },
  rowLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
  rowSub: { fontSize: 15, color: Colors.text, fontWeight: '500' },
  logoutBtn: { backgroundColor: Colors.dangerGlow, borderRadius: 16, borderWidth: 1, borderColor: Colors.danger, padding: 16, alignItems: 'center', marginBottom: 24 },
  logoutText: { color: Colors.danger, fontSize: 16, fontWeight: '700' },
  footer: { textAlign: 'center', color: Colors.textMuted, fontSize: 12 },
});
