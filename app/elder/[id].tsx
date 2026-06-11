import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router, Stack, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { eldersApi, callsApi, alertsApi, reportsApi } from '@/services/api';
import { Colors } from '@/constants/theme';

// ─── Compliance Chart (simple horizontal bars) ──────────────
function ComplianceChart({ data }: { data: Array<{ call_date: string; avg_score: number }> }) {
  if (!data || data.length === 0) {
    return <Text style={{ color: Colors.textMuted, fontSize: 13 }}>No call history yet</Text>;
  }
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return (
    <View style={chartStyles.container}>
      {data.map((d) => {
        const score = Number(d.avg_score) || 0;
        const barColor = score >= 80 ? Colors.success : score >= 50 ? Colors.warning : Colors.danger;
        const dayName = days[new Date(d.call_date).getDay()];
        return (
          <View key={d.call_date} style={chartStyles.barRow}>
            <Text style={chartStyles.dayLabel}>{dayName}</Text>
            <View style={chartStyles.barBg}>
              <View style={[chartStyles.bar, { width: `${score}%`, backgroundColor: barColor }]} />
            </View>
            <Text style={[chartStyles.score, { color: barColor }]}>{score}%</Text>
          </View>
        );
      })}
    </View>
  );
}
const chartStyles = StyleSheet.create({
  container: { gap: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayLabel: { width: 32, fontSize: 12, color: Colors.textSecondary, textAlign: 'right' },
  barBg: { flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 4 },
  score: { width: 36, fontSize: 12, fontWeight: '600', textAlign: 'right' },
});

// ─── Meal Status Row ─────────────────────────────────────────
function MealRow({ label, status }: { label: string; status: string }) {
  const map: Record<string, { color: string; icon: string }> = {
    eaten: { color: Colors.success, icon: '✅' },
    skipped: { color: Colors.danger, icon: '❌' },
    partial: { color: Colors.warning, icon: '🟡' },
    na: { color: Colors.textMuted, icon: '—' },
  };
  const s = map[status] || map.na;
  return (
    <View style={mealStyles.row}>
      <Text style={mealStyles.icon}>{s.icon}</Text>
      <Text style={mealStyles.label}>{label}</Text>
      <Text style={[mealStyles.status, { color: s.color }]}>{status === 'na' ? 'N/A' : status.charAt(0).toUpperCase() + status.slice(1)}</Text>
    </View>
  );
}
const mealStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  icon: { fontSize: 16, width: 28 },
  label: { flex: 1, color: Colors.text, fontSize: 14 },
  status: { fontSize: 13, fontWeight: '600' },
});

// ─── Schedule Item ────────────────────────────────────────────
function ScheduleItem({ item }: { item: any }) {
  const icons: Record<string, string> = { medication: '💊', meal: '🍽️', activity: '🏃' };
  return (
    <View style={schedStyles.item}>
      <Text style={schedStyles.icon}>{icons[item.type] || '📋'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={schedStyles.label}>{item.label}</Text>
        {item.notes && <Text style={schedStyles.note}>{item.notes}</Text>}
      </View>
      <Text style={schedStyles.time}>{item.scheduled_time?.slice(0, 5)}</Text>
    </View>
  );
}
const schedStyles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  icon: { fontSize: 20 },
  label: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  note: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  time: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
});

// ─── Call Row ────────────────────────────────────────────────
function CallRow({ call }: { call: any }) {
  const moodIcons: Record<string, string> = { positive: '😊', neutral: '😐', low: '😟', distressed: '😰' };
  const score = call.compliance_score ?? null;
  const scoreColor = score !== null ? (score >= 80 ? Colors.success : score >= 50 ? Colors.warning : Colors.danger) : Colors.textMuted;
  return (
    <TouchableOpacity style={callStyles.row} onPress={() => router.push(`/call/${call.id}`)} activeOpacity={0.7}>
      <Text style={callStyles.icon}>{moodIcons[call.mood] || '📞'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={callStyles.time}>{new Date(call.call_timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
        <Text style={callStyles.summary} numberOfLines={1}>{call.summary || 'Analysis pending...'}</Text>
      </View>
      {score !== null && <Text style={[callStyles.score, { color: scoreColor }]}>{score}%</Text>}
      {call.distress_flag && <Text>🚨</Text>}
      <Text style={callStyles.arrow}>›</Text>
    </TouchableOpacity>
  );
}
const callStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  icon: { fontSize: 22 },
  time: { fontSize: 13, color: Colors.textSecondary },
  summary: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  score: { fontSize: 14, fontWeight: '700' },
  arrow: { color: Colors.textMuted, fontSize: 18 },
});

// ─── MAIN SCREEN ──────────────────────────────────────────────
export default function ElderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [elder, setElder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await eldersApi.get(id!);
      setElder(res.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load elder details');
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <LinearGradient colors={['#050B18', '#0B1120']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!elder) return null;

  const statusColor = elder.status === 'critical' ? Colors.statusCritical : elder.status === 'warning' ? Colors.statusWarning : Colors.statusOk;
  const lastCall = elder.recent_calls?.[0];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#050B18', '#0B1120']} style={StyleSheet.absoluteFill} />

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.primary} />}>
        {/* Hero section */}
        <View style={styles.hero}>
          <LinearGradient colors={['rgba(5,11,24,0)', 'rgba(11,17,32,1)']} style={styles.heroGradient} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>← Back</Text>
          </TouchableOpacity>

          <View style={[styles.heroPhoto, { borderColor: statusColor, shadowColor: statusColor }]}>
            {elder.photo_url ? (
              <Image source={{ uri: elder.photo_url }} style={styles.heroPhotoImg} resizeMode="cover" />
            ) : (
              <View style={styles.heroPhotoFallback}>
                <Text style={styles.heroPhotoInitial}>{elder.name[0]}</Text>
              </View>
            )}
          </View>

          <Text style={styles.heroName}>{elder.name}</Text>
          <Text style={styles.heroUID}>{elder.elder_uid} · Age {elder.age}</Text>

          <View style={[styles.heroStatusPill, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
            <View style={[styles.heroStatusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.heroStatusText, { color: statusColor }]}>
              {elder.status === 'critical' ? '⚠️ Needs Immediate Attention' : elder.status === 'warning' ? '🔔 Needs Attention' : '✅ Doing Well'}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* Quick actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.qaBtn} onPress={() => router.push(`/elder/scheduler/${elder.id}`)}>
              <Text style={styles.qaIcon}>📅</Text>
              <Text style={styles.qaLabel}>Schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.qaBtn} onPress={() => elder.phone && Alert.alert('Call', `Calling ${elder.name} at ${elder.phone}`)}>
              <Text style={styles.qaIcon}>📱</Text>
              <Text style={styles.qaLabel}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.qaBtn} onPress={() => router.push(`/elder/edit/${elder.id}`)}>
              <Text style={styles.qaIcon}>✏️</Text>
              <Text style={styles.qaLabel}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.qaBtn} onPress={async () => {
              const url = reportsApi.getElderReportUrl(elder.id);
              await WebBrowser.openBrowserAsync(url);
            }}>
              <Text style={styles.qaIcon}>📄</Text>
              <Text style={styles.qaLabel}>Report</Text>
            </TouchableOpacity>
          </View>

          {/* Last LLM Analysis */}
          {lastCall?.mood && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 Latest Call Analysis</Text>
              <View style={styles.analysisCard}>
                <View style={styles.analysisRow}>
                  <View style={styles.analysisStat}>
                    <Text style={styles.analysisStatNum}>{lastCall.compliance_score ?? '—'}%</Text>
                    <Text style={styles.analysisStatLabel}>Compliance</Text>
                  </View>
                  <View style={styles.analysisDivider} />
                  <View style={styles.analysisStat}>
                    <Text style={styles.analysisStatNum}>{
                      { positive: '😊', neutral: '😐', low: '😟', distressed: '😰' }[lastCall.mood as string] || '—'
                    }</Text>
                    <Text style={styles.analysisStatLabel}>Mood</Text>
                  </View>
                  <View style={styles.analysisDivider} />
                  <View style={styles.analysisStat}>
                    <Text style={[styles.analysisStatNum, { fontSize: 18 }]}>{lastCall.distress_flag ? '🚨' : '✅'}</Text>
                    <Text style={styles.analysisStatLabel}>Distress</Text>
                  </View>
                </View>
                {lastCall.summary && <Text style={styles.analysisSummary}>{lastCall.summary}</Text>}
              </View>

              {/* Meal status */}
              {lastCall.llm_analysis && (
                <View style={styles.mealSection}>
                  <Text style={styles.subTitle}>Meals</Text>
                  <MealRow label="Breakfast" status={lastCall.llm_analysis?.meals?.breakfast || 'na'} />
                  <MealRow label="Lunch" status={lastCall.llm_analysis?.meals?.lunch || 'na'} />
                  <MealRow label="Dinner" status={lastCall.llm_analysis?.meals?.dinner || 'na'} />
                </View>
              )}
            </View>
          )}

          {/* Unread Alerts */}
          {elder.unread_alerts?.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🚨 Active Alerts ({elder.unread_alerts.length})</Text>
                <TouchableOpacity onPress={async () => { await alertsApi.markAllRead(elder.id); loadData(); }}>
                  <Text style={styles.sectionAction}>Mark all read</Text>
                </TouchableOpacity>
              </View>
              {elder.unread_alerts.slice(0, 3).map((alert: any) => (
                <View key={alert.id} style={[styles.alertRow, {
                  borderLeftColor: alert.severity === 'URGENT' ? Colors.danger : alert.severity === 'HIGH' ? '#F97316' : alert.severity === 'MEDIUM' ? Colors.warning : Colors.primary
                }]}>
                  <Text style={styles.alertSeverity}>{alert.severity}</Text>
                  <Text style={styles.alertMsg} numberOfLines={2}>{alert.message}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Weekly Compliance Chart */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📈 7-Day Compliance</Text>
            <ComplianceChart data={elder.weekly_compliance || []} />
          </View>

          {/* Medical Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏥 Medical Information</Text>
            {[
              { label: 'Phone', value: elder.phone || 'Not set' },
              { label: 'Address', value: elder.address || 'Not set' },
              { label: 'Emergency Contact', value: elder.emergency_contact || 'Not set' },
              { label: 'Emergency Phone', value: elder.emergency_phone || 'Not set' },
            ].map(({ label, value }) => (
              <View key={label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
              </View>
            ))}
            {elder.medical_notes && (
              <View style={[styles.infoRow, { flexDirection: 'column', gap: 4 }]}>
                <Text style={styles.infoLabel}>Medical Notes</Text>
                <Text style={[styles.infoValue, { textAlign: 'left' }]}>{elder.medical_notes}</Text>
              </View>
            )}
          </View>

          {/* Daily Schedule */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📅 Schedule</Text>
              <TouchableOpacity onPress={() => router.push(`/elder/scheduler/${elder.id}`)}>
                <Text style={styles.sectionAction}>Manage →</Text>
              </TouchableOpacity>
            </View>
            {elder.schedules?.length > 0
              ? elder.schedules.map((s: any) => <ScheduleItem key={s.id} item={s} />)
              : <Text style={styles.emptyText}>No schedule set up yet</Text>}
          </View>

          {/* Recent Calls */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📞 Recent Calls</Text>
            {elder.recent_calls?.length > 0
              ? elder.recent_calls.map((c: any) => <CallRow key={c.id} call={c} />)
              : <Text style={styles.emptyText}>No calls recorded yet</Text>}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: { alignItems: 'center', paddingTop: 60, paddingBottom: 32, position: 'relative' },
  heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  backBtn: { position: 'absolute', top: 56, left: 20, zIndex: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(11,17,32,0.8)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  backIcon: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
  heroPhoto: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, overflow: 'hidden', marginBottom: 16, shadowOpacity: 0.8, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 12 },
  heroPhotoImg: { width: 104, height: 104, borderRadius: 52 },
  heroPhotoFallback: { width: 104, height: 104, borderRadius: 52, backgroundColor: Colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  heroPhotoInitial: { fontSize: 44, color: Colors.text, fontWeight: '700' },
  heroName: { fontSize: 28, fontWeight: '800', color: Colors.text },
  heroUID: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, marginBottom: 12 },
  heroStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  heroStatusDot: { width: 8, height: 8, borderRadius: 4 },
  heroStatusText: { fontSize: 13, fontWeight: '700' },
  body: { padding: 20, paddingBottom: 80 },
  quickActions: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  qaBtn: { flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  qaIcon: { fontSize: 24, marginBottom: 4 },
  qaLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  sectionAction: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  subTitle: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, marginTop: 12 },
  analysisCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  analysisRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  analysisStat: { flex: 1, alignItems: 'center' },
  analysisStatNum: { fontSize: 28, fontWeight: '800', color: Colors.text },
  analysisStatLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  analysisDivider: { width: 1, height: 50, backgroundColor: Colors.border },
  analysisSummary: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  mealSection: { marginTop: 12 },
  alertRow: { borderLeftWidth: 3, backgroundColor: Colors.surface, padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  alertSeverity: { fontSize: 10, fontWeight: '800', color: Colors.danger, letterSpacing: 0.5, marginBottom: 4 },
  alertMsg: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 13, color: Colors.textMuted, flex: 1 },
  infoValue: { fontSize: 14, color: Colors.text, fontWeight: '500', flex: 2, textAlign: 'right' },
  emptyText: { color: Colors.textMuted, fontSize: 14, fontStyle: 'italic' },
});
