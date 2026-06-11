import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { alertsApi } from '@/services/api';
import { Colors } from '@/constants/theme';

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { color: string; bg: string; icon: string }> = {
    URGENT: { color: Colors.danger, bg: Colors.dangerGlow, icon: '🚨' },
    HIGH: { color: '#F97316', bg: 'rgba(249,115,22,0.15)', icon: '⚠️' },
    MEDIUM: { color: Colors.warning, bg: Colors.warningGlow, icon: '🔔' },
    LOW: { color: Colors.primary, bg: Colors.primaryGlow, icon: 'ℹ️' },
  };
  const s = map[severity] || map.LOW;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.color }]}>
      <Text style={styles.badgeIcon}>{s.icon}</Text>
      <Text style={[styles.badgeText, { color: s.color }]}>{severity}</Text>
    </View>
  );
}

function AlertItem({ alert, onPress }: any) {
  const borderColor = alert.severity === 'URGENT' ? Colors.danger : alert.severity === 'HIGH' ? '#F97316' : alert.severity === 'MEDIUM' ? Colors.warning : Colors.primary;
  return (
    <TouchableOpacity style={[styles.alertCard, !alert.is_read && styles.alertCardUnread, { borderLeftColor: borderColor }]} onPress={() => onPress(alert)} activeOpacity={0.8}>
      <View style={styles.alertTop}>
        <SeverityBadge severity={alert.severity} />
        <Text style={styles.alertTime}>{formatTime(alert.created_at)}</Text>
      </View>
      <View style={styles.alertElderRow}>
        <Text style={styles.alertElderName}>{alert.elder_name}</Text>
        <Text style={styles.alertElderUID}>{alert.elder_uid}</Text>
      </View>
      <Text style={styles.alertMsg} numberOfLines={3}>{alert.message}</Text>
      {!alert.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

function formatTime(ts: string) {
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  const mins = Math.floor(diff / 60000);
  return mins > 0 ? `${mins}m ago` : 'Just now';
}

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    try {
      const res = await alertsApi.list({ unread_only: false });
      setAlerts(res.data);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadAlerts(); }, [loadAlerts]));

  async function handlePress(alert: any) {
    if (!alert.is_read) {
      await alertsApi.markRead(alert.id);
      setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, is_read: true } : a));
    }
    router.push(`/elder/${alert.elder_id}`);
  }

  async function markAllRead() {
    await alertsApi.markAllRead();
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
  }

  const FILTERS = [null, 'URGENT', 'HIGH', 'MEDIUM', 'LOW'];
  const filtered = filter ? alerts.filter(a => a.severity === filter) : alerts;
  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#050B18', '#0B1120']} style={StyleSheet.absoluteFill} />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAlerts(); }} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>Alert Inbox 🔔</Text>
                <Text style={styles.headerSub}>{unreadCount} unread alerts</Text>
              </View>
              {unreadCount > 0 && (
                <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
                  <Text style={styles.markAllText}>Mark all read</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Filter chips */}
            <View style={styles.filterRow}>
              {FILTERS.map((f) => (
                <TouchableOpacity key={String(f)} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
                  <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                    {f ?? 'All'} {f ? `(${alerts.filter(a => a.severity === f).length})` : `(${alerts.length})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => <AlertItem alert={item} onPress={handlePress} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {loading ? <ActivityIndicator color={Colors.primary} /> : (
              <>
                <Text style={styles.emptyIcon}>✅</Text>
                <Text style={styles.emptyTitle}>No alerts</Text>
                <Text style={styles.emptyText}>All elders are doing well!</Text>
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 56, marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.text },
  headerSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  markAllBtn: { backgroundColor: Colors.surfaceElevated, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  markAllText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primaryGlow, borderColor: Colors.primary },
  filterChipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '500' },
  filterChipTextActive: { color: Colors.primary, fontWeight: '700' },
  alertCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderWidth: 1, borderColor: Colors.border, position: 'relative' },
  alertCardUnread: { backgroundColor: Colors.surfaceElevated },
  alertTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  badgeIcon: { fontSize: 12 },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  alertTime: { fontSize: 12, color: Colors.textMuted },
  alertElderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  alertElderName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  alertElderUID: { fontSize: 12, color: Colors.textMuted, backgroundColor: Colors.surfaceHigh, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  alertMsg: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  unreadDot: { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 16 },
  emptyText: { color: Colors.textSecondary, marginTop: 8 },
});
