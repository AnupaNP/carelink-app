import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, Image, ActivityIndicator, Dimensions, Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { eldersApi, callsApi } from '@/services/api';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

function StatusDot({ status }: { status: string }) {
  const color = status === 'critical' ? Colors.statusCritical : status === 'warning' ? Colors.statusWarning : Colors.statusOk;
  return <View style={[styles.statusDot, { backgroundColor: color }]} />;
}

function ElderCard({ elder, onPress, onMenu }: any) {
  const statusColor = elder.status === 'critical' ? Colors.statusCritical : elder.status === 'warning' ? Colors.statusWarning : Colors.statusOk;
  const statusGlow = elder.status === 'critical' ? 'rgba(239,68,68,0.2)' : elder.status === 'warning' ? 'rgba(245,158,11,0.2)' : 'rgba(62,207,142,0.2)';
  const compliance = elder.last_compliance_score ?? null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.cardInner, { borderColor: statusColor, shadowColor: statusColor }]}>
        {/* Photo with status ring */}
        <View style={styles.photoSection}>
          <View style={[styles.photoRing, { borderColor: statusColor, shadowColor: statusColor, shadowOpacity: 0.6 }]}>
            {elder.photo_url ? (
              <Image source={{ uri: elder.photo_url }} style={styles.photo} resizeMode="cover" />
            ) : (
              <View style={[styles.photoFallback, { backgroundColor: Colors.surfaceHigh }]}>
                <Text style={styles.photoInitial}>{elder.name[0]}</Text>
              </View>
            )}
          </View>
          {elder.unread_alerts > 0 && (
            <View style={[styles.alertBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.alertBadgeText}>{elder.unread_alerts > 9 ? '9+' : elder.unread_alerts}</Text>
            </View>
          )}
        </View>

        {/* Name & UID */}
        <Text style={styles.elderName} numberOfLines={1}>{elder.name}</Text>
        <Text style={styles.elderUID}>{elder.elder_uid}</Text>

        {/* Status pill */}
        <View style={[styles.statusPill, { backgroundColor: statusGlow }]}>
          <View style={[styles.statusPillDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusPillText, { color: statusColor }]}>
            {elder.status === 'critical' ? 'URGENT' : elder.status === 'warning' ? 'Needs Attention' : 'All Good'}
          </Text>
        </View>

        {/* Compliance bar */}
        {compliance !== null && (
          <View style={styles.complianceSection}>
            <View style={styles.complianceBar}>
              <View style={[styles.complianceFill, {
                width: `${compliance}%`,
                backgroundColor: compliance >= 80 ? Colors.success : compliance >= 50 ? Colors.warning : Colors.danger,
              }]} />
            </View>
            <Text style={styles.complianceText}>{compliance}% compliance</Text>
          </View>
        )}

        {/* Last call */}
        {elder.last_call_at && (
          <Text style={styles.lastCall}>
            📞 {formatRelativeTime(elder.last_call_at)}
          </Text>
        )}

        {/* Menu button */}
        <TouchableOpacity style={styles.menuBtn} onPress={() => onMenu(elder)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Text style={styles.menuBtnText}>···</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function formatRelativeTime(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'Just now';
}

function ElderMenuModal({ elder, visible, onClose, onSimulate }: any) {
  if (!elder) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
        <View style={styles.menuModal}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>{elder.name}</Text>
            <Text style={styles.menuSub}>{elder.elder_uid}</Text>
          </View>
          {[
            { icon: '👁️', label: 'View Full Details', action: () => { onClose(); router.push(`/elder/${elder.id}`); } },
            { icon: '📊', label: 'Last Call Summary', action: () => { onClose(); router.push(`/elder/${elder.id}`); } },
            { icon: '🤖', label: 'Simulate Check-in Call', action: () => { onClose(); onSimulate(elder); } },
            { icon: '📅', label: 'Manage Schedule', action: () => { onClose(); router.push(`/elder/scheduler/${elder.id}`); } },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.action} activeOpacity={0.7}>
              <Text style={styles.menuItemIcon}>{item.icon}</Text>
              <Text style={styles.menuItemLabel}>{item.label}</Text>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function SimulateModal({ elder, visible, onClose, onDone }: any) {
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState('positive');
  if (!elder) return null;

  const scenarios = [
    { key: 'positive', label: '😊 Positive check-in', desc: 'All meds taken, good mood' },
    { key: 'concerned', label: '😟 Missed medications', desc: 'Skipped meds, low mood' },
    { key: 'urgent', label: '🚨 Urgent distress', desc: 'Chest pain, needs help' },
    { key: 'mixed', label: '😐 Mixed result', desc: 'Some meds, feels lonely' },
  ];

  async function runSimulation() {
    setLoading(true);
    try {
      await callsApi.simulate(elder.id, selected);
      Alert.alert('✅ Call Simulated', 'Gemini AI is analysing the transcript. Check back in a moment for the results.', [{ text: 'OK', onPress: () => { onClose(); onDone(); } }]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.menuModal, { maxWidth: 380 }]}>
          <Text style={styles.menuTitle}>🤖 Simulate AI Call</Text>
          <Text style={styles.menuSub}>{elder.name} · {elder.elder_uid}</Text>
          <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: 16 }} />
          {scenarios.map((s) => (
            <TouchableOpacity key={s.key} style={[styles.scenarioRow, selected === s.key && styles.scenarioSelected]} onPress={() => setSelected(s.key)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.scenarioLabel}>{s.label}</Text>
                <Text style={styles.scenarioDesc}>{s.desc}</Text>
              </View>
              {selected === s.key && <Text style={{ color: Colors.primary, fontSize: 18 }}>✓</Text>}
            </TouchableOpacity>
          ))}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalConfirmBtn} onPress={runSimulation} disabled={loading}>
              <LinearGradient colors={['#4E8EFF', '#9B7FEA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalConfirmGradient}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalConfirmText}>Run Simulation</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function DashboardScreen() {
  const { caregiver } = useAuth();
  const [elders, setElders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuElder, setMenuElder] = useState<any>(null);
  const [simulateElder, setSimulateElder] = useState<any>(null);

  const loadElders = useCallback(async () => {
    try {
      const res = await eldersApi.list();
      setElders(res.data);
    } catch (err) {
      console.error('Failed to load elders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadElders(); }, [loadElders]));

  const onRefresh = () => { setRefreshing(true); loadElders(); };

  const urgentCount = elders.filter(e => e.status === 'critical').length;
  const warningCount = elders.filter(e => e.status === 'warning').length;

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <LinearGradient colors={['#050B18', '#0B1120']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.loadingText, { marginTop: 16 }]}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#050B18', '#0B1120', '#0B1120']} style={StyleSheet.absoluteFill} />

      <FlatList
        data={elders}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.headerGreeting}>Good {getTimeOfDay()},</Text>
                <Text style={styles.headerName}>{caregiver?.name?.split(' ')[0]} 👋</Text>
              </View>
              <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/alerts')}>
                <Text style={styles.notifIcon}>🔔</Text>
                {(urgentCount + warningCount) > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{urgentCount + warningCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Status Summary */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNum}>{elders.length}</Text>
                <Text style={styles.summaryLabel}>Elders</Text>
              </View>
              <View style={[styles.summaryCard, urgentCount > 0 && { borderColor: Colors.statusCritical }]}>
                <Text style={[styles.summaryNum, { color: urgentCount > 0 ? Colors.danger : Colors.textSecondary }]}>{urgentCount}</Text>
                <Text style={styles.summaryLabel}>Urgent 🔴</Text>
              </View>
              <View style={[styles.summaryCard, warningCount > 0 && { borderColor: Colors.statusWarning }]}>
                <Text style={[styles.summaryNum, { color: warningCount > 0 ? Colors.warning : Colors.textSecondary }]}>{warningCount}</Text>
                <Text style={styles.summaryLabel}>Attention 🟡</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Elders</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/elder/add')}>
                <LinearGradient colors={['#4E8EFF', '#9B7FEA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addBtnGradient}>
                  <Text style={styles.addBtnText}>+ Add Elder</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <ElderCard
            elder={item}
            onPress={() => router.push(`/elder/${item.id}`)}
            onMenu={(e: any) => setMenuElder(e)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👴</Text>
            <Text style={styles.emptyTitle}>No elders yet</Text>
            <Text style={styles.emptyText}>Add your first elder to get started</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/elder/add')}>
              <LinearGradient colors={['#4E8EFF', '#9B7FEA']} style={styles.emptyBtnGradient}>
                <Text style={styles.emptyBtnText}>+ Add Elder</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />

      <ElderMenuModal
        elder={menuElder}
        visible={!!menuElder}
        onClose={() => setMenuElder(null)}
        onSimulate={(e: any) => { setMenuElder(null); setTimeout(() => setSimulateElder(e), 300); }}
      />
      <SimulateModal
        elder={simulateElder}
        visible={!!simulateElder}
        onClose={() => setSimulateElder(null)}
        onDone={loadElders}
      />
    </View>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 120 },
  row: { gap: 16, marginBottom: 16 },
  loadingText: { color: Colors.textSecondary, fontSize: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 56, marginBottom: 24 },
  headerGreeting: { fontSize: 15, color: Colors.textSecondary },
  headerName: { fontSize: 28, fontWeight: '800', color: Colors.text, marginTop: 2 },
  notifBtn: { position: 'relative', width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderRadius: 22, borderWidth: 1, borderColor: Colors.border },
  notifIcon: { fontSize: 20 },
  notifBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: Colors.danger, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  notifBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  summaryNum: { fontSize: 28, fontWeight: '800', color: Colors.text },
  summaryLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  addBtn: { borderRadius: 20, overflow: 'hidden' },
  addBtnGradient: { paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  card: { width: CARD_WIDTH },
  cardInner: { backgroundColor: Colors.surface, borderRadius: 20, padding: 16, borderWidth: 1.5, alignItems: 'center', ...Shadow.card },
  photoSection: { position: 'relative', marginBottom: 12 },
  photoRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, overflow: 'hidden', shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  photo: { width: 74, height: 74, borderRadius: 37 },
  photoFallback: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center' },
  photoInitial: { fontSize: 30, fontWeight: '700', color: Colors.text },
  alertBadge: { position: 'absolute', top: -4, right: -4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.background },
  alertBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  elderName: { fontSize: 14, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  elderUID: { fontSize: 11, color: Colors.textMuted, marginTop: 2, marginBottom: 8 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 10 },
  statusPillDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  complianceSection: { width: '100%', marginBottom: 8 },
  complianceBar: { width: '100%', height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  complianceFill: { height: '100%', borderRadius: 2 },
  complianceText: { fontSize: 10, color: Colors.textMuted, marginTop: 4 },
  lastCall: { fontSize: 10, color: Colors.textMuted },
  menuBtn: { position: 'absolute', top: 10, right: 10, padding: 4 },
  menuBtnText: { fontSize: 18, color: Colors.textMuted, fontWeight: '700', letterSpacing: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 20, paddingHorizontal: 16 },
  menuModal: { width: '100%', maxWidth: 400, backgroundColor: Colors.surface, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: Colors.border },
  menuHeader: { marginBottom: 16 },
  menuTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  menuSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuItemIcon: { fontSize: 20, width: 28 },
  menuItemLabel: { flex: 1, color: Colors.text, fontSize: 15, fontWeight: '500' },
  menuItemArrow: { color: Colors.textMuted, fontSize: 20 },
  scenarioRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceElevated },
  scenarioSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryGlow },
  scenarioLabel: { color: Colors.text, fontWeight: '600', fontSize: 14 },
  scenarioDesc: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalCancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  modalCancelText: { color: Colors.textSecondary, fontWeight: '600' },
  modalConfirmBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  modalConfirmGradient: { padding: 14, alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 16 },
  emptyText: { color: Colors.textSecondary, marginTop: 8, marginBottom: 24 },
  emptyBtn: { borderRadius: 20, overflow: 'hidden' },
  emptyBtnGradient: { paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
});
