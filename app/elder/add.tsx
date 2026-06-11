import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { eldersApi } from '@/services/api';
import { Colors } from '@/constants/theme';

export default function AddElderScreen() {
  const [form, setForm] = useState({
    name: '', age: '', phone: '', emergency_contact: '', emergency_phone: '',
    medical_notes: '', address: '',
  });
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      Alert.alert('Required', "Please enter the elder's name.");
      return;
    }
    setLoading(true);
    try {
      const res = await eldersApi.create({
        ...form,
        age: form.age ? parseInt(form.age) : null,
      });
      // Upload photo if selected
      if (photoUri && res.data?.id) {
        try {
          await eldersApi.uploadPhoto(res.data.id, photoUri);
        } catch (photoErr) {
          console.warn('Photo upload failed (non-critical):', photoErr);
        }
      }
      Alert.alert('✅ Success', `${form.name} has been added to your care list.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to add elder.');
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { key: 'name', label: 'Full Name *', placeholder: 'e.g. Margaret Thompson', icon: '👤', keyboardType: 'default' as const },
    { key: 'age', label: 'Age', placeholder: 'e.g. 78', icon: '🎂', keyboardType: 'numeric' as const },
    { key: 'phone', label: 'Phone Number', placeholder: 'e.g. +1-555-0100', icon: '📱', keyboardType: 'phone-pad' as const },
    { key: 'emergency_contact', label: 'Emergency Contact Name', placeholder: 'e.g. Linda Thompson', icon: '🆘', keyboardType: 'default' as const },
    { key: 'emergency_phone', label: 'Emergency Contact Phone', placeholder: 'e.g. +1-555-0200', icon: '📞', keyboardType: 'phone-pad' as const },
    { key: 'address', label: 'Home Address', placeholder: 'e.g. 123 Oak Street, Springfield', icon: '🏠', keyboardType: 'default' as const },
  ];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#050B18', '#0B1120']} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelText}>✕ Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Elder</Text>
          <View style={{ width: 80 }} />
        </View>

        {/* Photo picker */}
        <View style={styles.photoSection}>
          <TouchableOpacity onPress={pickPhoto} activeOpacity={0.8}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.cameraEmoji}>📷</Text>
                <Text style={styles.photoHint}>Add Photo</Text>
              </View>
            )}
            {photoUri && (
              <View style={styles.cameraOverlay}>
                <Text style={styles.cameraIcon}>📷</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
              <Text style={styles.photoBtnText}>📂 Library</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
              <Text style={styles.photoBtnText}>📸 Camera</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          {fields.map((field) => (
            <View key={field.key} style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{field.icon} {field.label}</Text>
              <TextInput
                style={styles.fieldInput}
                value={form[field.key as keyof typeof form]}
                onChangeText={(v) => update(field.key as keyof typeof form, v)}
                placeholder={field.placeholder}
                placeholderTextColor={Colors.textMuted}
                keyboardType={field.keyboardType}
              />
            </View>
          ))}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>🏥 Medical Notes</Text>
            <TextInput
              style={[styles.fieldInput, styles.textArea]}
              value={form.medical_notes}
              onChangeText={(v) => update('medical_notes', v)}
              placeholder="Medications, conditions, allergies, special instructions..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          <LinearGradient colors={['#4E8EFF', '#9B7FEA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitGradient}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>✓ Add Elder to Care List</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingTop: 56, paddingBottom: 80 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  cancelBtn: { backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  cancelText: { color: Colors.textSecondary, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text },
  photoSection: { alignItems: 'center', marginBottom: 24 },
  photo: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: Colors.primary },
  photoPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.surfaceHigh, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed' },
  cameraEmoji: { fontSize: 28 },
  photoHint: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  cameraOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.primary, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cameraIcon: { fontSize: 14 },
  photoButtons: { flexDirection: 'row', gap: 12, marginTop: 12 },
  photoBtn: { backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  photoBtnText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  card: { backgroundColor: Colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.border, marginBottom: 24 },
  fieldGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', marginBottom: 8 },
  fieldInput: { backgroundColor: Colors.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, color: Colors.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
  textArea: { minHeight: 100, paddingTop: 12 },
  submitBtn: { borderRadius: 16, overflow: 'hidden' },
  submitGradient: { padding: 18, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
