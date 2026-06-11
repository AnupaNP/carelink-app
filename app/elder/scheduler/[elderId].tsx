import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Modal, TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { schedulesApi, eldersApi } from '@/services/api';
import { Colors } from '@/constants/theme';

const TIME_OPTIONS = ['07:00','08:00','08:30','09:00','10:00','12:00','12:30','13:00','14:00','16:00','18:00','18:30','19:00','20:00','21:00','22:00'];
const RECURRENCES = ['daily', 'weekdays', 'weekends', 'weekly', 'once'];
const TYPES = [
  { key: 'medication', label: 'Medication', icon: '💊' },
  { key: 'meal', label: 'Meal', icon: '🍽️' },
  { key: 'activity', label: 'Activity', icon: '🏃' },
];

function AddScheduleModal({ visible, elderId, onClose, onAdded }: any) {
  const [type, setType] = useState('medication');
  const [label, setLabel] = useState('');
  const [time, setTime] = useState('08:00');
  const [recurrence, setRecurrence] = useState('daily');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (!label.trim()) { Alert.alert('Required', 'Please enter a label.'); return; }
    setLoading(true);
    try {
      await schedulesApi.create({ elder_id: elderId, type, label: label.trim(), scheduled_time: time, recurrence, notes: notes.trim() || null });
      setLabel(''); setNotes(''); setType('medication'); setTime('08:00');
      onAdded();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to add schedule');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Add Schedule Item</Text>

          <Text style={styles.fieldLabel}>Type</Text>
          <View style={styles.typeRow}>
            {TYPES.map(t => (
              <TouchableOpacity key={t.key} style={[styles.typeBtn, type === t.key && styles.typeBtnActive]} onPress={() => setType(t.key)}>
                <Text style={styles.typeBtnIcon}>{t.icon}</Text>
                <Text style={[styles.typeBtnLabel, type === t.key && { color: Colors.primary }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Label / Name</Text>
          <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="e.g. Metformin 500mg" placeholderTextColor={Colors.textMuted} />

          <Text style={styles.fieldLabel}>Time</Text>
          <View style={styles.timeGrid}>
            {TIME_OPTIONS.map(t => (
              <TouchableOpacity key={t} style={[styles.timeChip, time === t && styles.timeChipActive]} onPress={() => setTime(t)}>
                <Text style={[styles.timeChipText, time === t && { color: Colors.primary, fontWeight: '700' }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Recurrence</Text>
          <View style={styles.recurrenceRow}>
            {RECURRENCES.map(r => (
              <TouchableOpacity key={r} style={[styles.recurrenceBtn, recurrence === r && styles.recurrenceBtnActive]} onPress={() => setRecurrence(r)}>
                <Text style={[styles.recurrenceBtnText, recurrence === r && { color: Colors.primary }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Notes (optional)</Text>
          <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="e.g. Take with food" placeholderTextColor={Colors.textMuted} />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={handleAdd} disabled={loading}>
              <LinearGradient colors={['#4E8EFF', '#9B7FEA']} style={styles.addBtnGradient}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addBtnText}>Add Schedule</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function EditScheduleModal({ visible, schedule, onClose, onSaved }: any) {
  const [type, setType] = useState('medication');
  const [label, setLabel] = useState('');
  const [time, setTime] = useState('08:00');
  const [recurrence, setRecurrence] = useState('daily');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (schedule) {
      setType(schedule.type || 'medication');
      setLabel(schedule.label || '');
      setTime(schedule.scheduled_time?.slice(0, 5) || '08:00');
      setRecurrence(schedule.recurrence || 'daily');
      setNotes(schedule.notes || '');
    }
  }, [schedule]);

  async function handleSave() {
    if (!label.trim()) { Alert.alert('Required', 'Please enter a label.'); return; }
    setLoading(true);
    try {
      await schedulesApi.update(schedule.id, { type, label: label.trim(), scheduled_time: time, recurrence, notes: notes.trim() || null });
      onSaved();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to update schedule');
    } finally {
      setLoading(false);
    }
  }

  if (!schedule) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Edit Schedule Item</Text>

          <Text style={styles.fieldLabel}>Type</Text>
          <View style={styles.typeRow}>
            {TYPES.map(t => (
              <TouchableOpacity key={t.key} style={[styles.typeBtn, type === t.key && styles.typeBtnActive]} onPress={() => setType(t.key)}>
                <Text style={styles.typeBtnIcon}>{t.icon}</Text>
                <Text style={[styles.typeBtnLabel, type === t.key && { color: Colors.primary }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Label / Name</Text>
          <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="e.g. Metformin 500mg" placeholderTextColor={Colors.textMuted} />

          <Text style={styles.fieldLabel}>Time</Text>
          <View style={styles.timeGrid}>
            {TIME_OPTIONS.map(t => (
              <TouchableOpacity key={t} style={[styles.timeChip, time === t && styles.timeChipActive]} onPress={() => setTime(t)}>
                <Text style={[styles.timeChipText, time === t && { color: Colors.primary, fontWeight: '700' }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Recurrence</Text>
          <View style={styles.recurrenceRow}>
            {RECURRENCES.map(r => (
              <TouchableOpacity key={r} style={[styles.recurrenceBtn, recurrence === r && styles.recurrenceBtnActive]} onPress={() => setRecurrence(r)}>
                <Text style={[styles.recurrenceBtnText, recurrence === r && { color: Colors.primary }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Notes (optional)</Text>
          <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="e.g. Take with food" placeholderTextColor={Colors.textMuted} />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={handleSave} disabled={loading}>
              <LinearGradient colors={['#4E8EFF', '#9B7FEA']} style={styles.addBtnGradient}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addBtnText}>Save Changes</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function SchedulerScreen() {
  const { elderId } = useLocalSearchParams<{ elderId: string }>();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [elderName, setElderName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editSchedule, setEditSchedule] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      const [schedRes, elderRes] = await Promise.all([
        schedulesApi.list(elderId!),
        eldersApi.get(elderId!),
      ]);
      setSchedules(schedRes.data);
      setElderName(elderRes.data.name);
    } catch (err) {
      Alert.alert('Error', 'Failed to load schedules');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [elderId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  async function deleteSchedule(id: string, label: string) {
    Alert.alert('Delete', `Remove "${label}" from schedule?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await schedulesApi.delete(id);
        setSchedules(prev => prev.filter(s => s.id !== id));
      }},
    ]);
  }

  const icons: Record<string, string> = { medication: '💊', meal: '🍽️', activity: '🏃' };
  const grouped: Record<string, any[]> = { medication: [], meal: [], activity: [] };
  schedules.forEach(s => { if (grouped[s.type]) grouped[s.type].push(s); });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#050B18', '#0B1120']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>📅 Schedule</Text>
          <Text style={styles.subtitle}>{elderName}</Text>
        </View>
        <TouchableOpacity style={styles.addIconBtn} onPress={() => setShowAdd(true)}>
          <LinearGradient colors={['#4E8EFF', '#9B7FEA']} style={styles.addIconGradient}>
            <Text style={styles.addIconText}>+ Add</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={Object.entries(grouped).filter(([, items]) => items.length > 0)}
          keyExtractor={([type]) => type}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.primary} />}
          renderItem={({ item: [type, items] }) => (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>{icons[type]} {type.charAt(0).toUpperCase() + type.slice(1)}s</Text>
              {items.map((s) => (
                <View key={s.id} style={styles.scheduleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scheduleLabel}>{s.label}</Text>
                    <Text style={styles.scheduleMeta}>{s.recurrence} · {s.scheduled_time?.slice(0, 5)}</Text>
                    {s.notes && <Text style={styles.scheduleNote}>{s.notes}</Text>}
                  </View>
                  <TouchableOpacity onPress={() => setEditSchedule(s)} style={styles.editBtn}>
                    <Text style={styles.editText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteSchedule(s.id, s.label)} style={styles.deleteBtn}>
                    <Text style={styles.deleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ fontSize: 44 }}>📅</Text>
              <Text style={[styles.title, { fontSize: 18, marginTop: 12 }]}>No schedules yet</Text>
              <Text style={{ color: Colors.textSecondary, marginTop: 8 }}>Tap + Add to create one</Text>
            </View>
          }
        />
      )}

      <AddScheduleModal visible={showAdd} elderId={elderId} onClose={() => setShowAdd(false)} onAdded={loadData} />
      <EditScheduleModal
        visible={!!editSchedule}
        schedule={editSchedule}
        onClose={() => setEditSchedule(null)}
        onSaved={() => { setEditSchedule(null); loadData(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, paddingTop: 56 },
  backBtn: { backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  backText: { color: Colors.primary, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  addIconBtn: { borderRadius: 20, overflow: 'hidden' },
  addIconGradient: { paddingHorizontal: 16, paddingVertical: 9 },
  addIconText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  list: { padding: 20, paddingBottom: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  group: { marginBottom: 24 },
  groupTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  scheduleLabel: { fontSize: 15, color: Colors.text, fontWeight: '600' },
  scheduleMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  scheduleNote: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  deleteBtn: { backgroundColor: Colors.dangerGlow, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  deleteText: { color: Colors.danger, fontWeight: '700' },
  editBtn: { backgroundColor: Colors.primaryGlow, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  editText: { fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 20 },
  fieldLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: Colors.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, color: Colors.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  typeBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryGlow },
  typeBtnIcon: { fontSize: 22, marginBottom: 4 },
  typeBtnLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: { backgroundColor: Colors.surfaceElevated, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  timeChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryGlow },
  timeChipText: { color: Colors.textSecondary, fontSize: 13 },
  recurrenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recurrenceBtn: { backgroundColor: Colors.surfaceElevated, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: Colors.border },
  recurrenceBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryGlow },
  recurrenceBtnText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: 14, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelText: { color: Colors.textSecondary, fontWeight: '600' },
  addBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  addBtnGradient: { padding: 15, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700' },
});
