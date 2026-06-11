import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { insightsApi } from '@/services/api';
import { Colors } from '@/constants/theme';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;

// ─── Mini bar chart for compliance trend ─────────────────────
function ComplianceTrend({ data }: { data: Array<{ call_date: string; avg_score: number; call_count: number }> }) {
  if (!data || data.length === 0) {
    return (
      <View style={chartStyles.empty}>
        <Text style={chartStyles.emptyText}>No call data yet in the last 14 days</Text>
      </View>
    );
  }
  const max = 100;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return (
    <View style={chartStyles.wrap}>
      {data.map((d) => {
        const score = Number(d.avg_score) || 0;
        const barH = Math.max(4, (score / max) * 80);
        const barColor = score >= 80 ? Colors.success : score >= 50 ? Colors.warning : Colors.danger;
        const dayName = days[new Date(d.call_date).getDay()];
        return (
          <View key={d.call_date} style={chartStyles.barCol}>
            <Text style={[chartStyles.barLabel, { color: barColor, fontWeight: '700' }]}>{score}%</Text>
            <View style={chartStyles.barBg}>
              <View style={[chartStyles.bar, { height: barH, backgroundColor: barColor }]} />
            </View>
            <Text style={chartStyles.dayLabel}>{dayName}</Text>
          </View>
        );
      })}
    </View>
  );
}
const chartStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 120, paddingTop: 28 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barBg: { width: '100%', height: 80, justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '70%', borderRadius: 4 },
  barLabel: { fontSize: 9, color: Colors.textMuted },
  dayLabel: { fontSize: 9, color: Colors.textMuted, textAlign: 'center' },
  empty: { alignItems: 'center', paddingVertical: 20 },
  emptyText: { color: Colors.textMuted, fontSize: 13 },
});

// ─── Status ring (simple visual breakdown) ───────────────────
function StatusRing({ critical, warning, ok, total }: { critical: number; warning: number; ok: number; total: number }) {
  return (
    <View style={ringStyles.row}>
      {[
        { label: 'Urgent', count: critical, color: Colors.statusCritical, emoji: '🔴' },
        { label: 'Attention', count: warning, color: Colors.statusWarning, emoji: '🟡' },
        { label: 'All Good', count: ok, color: Colors.statusOk, emoji: '🟢' },
      ].map((item) => (
        <View key={item.label} style={ringStyles.cell}>
          <Text style={ringStyles.emoji}>{item.emoji}</Text>
          <Text style={[ringStyles.count, { color: item.color }]}>{item.count}</Text>
          <Text style={ringStyles.label}>{item.label}</Text>
          <Text style={ringStyles.pct}>{total > 0 ? Math.round((item.count / total) * 100) : 0}%</Text>
        </View>
      ))}
    </View>
  );
}
const ringStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  cell: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  emoji: { fontSize: 22, marginBottom: 6 },
  count: { fontSize: 28, fontWeight: '800' },
  label: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  pct: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
});

export default function InsightsScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadInsights = useCallback(async () => {
    try {
      const res = await insightsApi.get();
      setData(res.data);
    } catch (err) {
      console.error('Failed to load insights:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadInsights(); }, [loadInsights]));

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <LinearGradient colors={['#050B18', '#0B1120']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Analysing your care data...</Text>
      </View>
    );
  }

  const summary = data?.summary || {};
  const trend = data?.compliance_trend || [];
  const concerns = data?.top_concerns || [];
  const missedMeds = data?.missed_medications || [];
  const elderBreakdown = data?.elder_breakdown || [];
  const complianceColor = summary.avg_compliance == null ? Colors.textMuted
    : summary.avg_compliance >= 80 ? Colors.success
    : summary.avg_compliance >= 50 ? Colors.warning
    : Colors.danger;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#050B18', '#0B1120']} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadInsights(); }} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>AI Insights 🧠</Text>
            <Text style={styles.headerSub}>Last 14 days across {summary.total_elders || 0} elders</Text>
          </View>
        </View>

        {/* Headline stat */}
        <LinearGradient colors={['#0F1B2D', '#1A2940']} style={styles.heroCard}>
          <View style={styles.heroInner}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroLabel}>Avg Compliance Score</Text>
              <Text style={[styles.heroNum, { color: complianceColor }]}>
                {summary.avg_compliance != null ? `${summary.avg_compliance}%` : '—'}
              </Text>
              <Text style={styles.heroSub}>across all elders this week</Text>
            </View>
            <View style={styles.heroRight}>
              <View style={styles.heroStatRow}>
                <Text style={styles.heroStatNum}>{summary.total_elders || 0}</Text>
                <Text style={styles.heroStatLabel}>Elders</Text>
              </View>
              <View style={[styles.heroStatRow, { marginTop: 12 }]}>
                <Text style={[styles.heroStatNum, { color: summary.critical_count > 0 ? Colors.danger : Colors.textMuted }]}>
                  {summary.critical_count || 0}
                </Text>
                <Text style={styles.heroStatLabel}>Urgent</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Status breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Status Breakdown</Text>
          <StatusRing
            critical={summary.critical_count || 0}
            warning={summary.warning_count || 0}
            ok={summary.ok_count || 0}
            total={summary.total_elders || 0}
          />
        </View>

        {/* Compliance trend chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 14-Day Compliance Trend</Text>
          <View style={styles.chartCard}>
            <ComplianceTrend data={trend} />
          </View>
        </View>

        {/* Elders needing attention */}
        {elderBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ Elders Needing Attention</Text>
            {elderBreakdown.map((e: any) => {
              const score = e.avg_score != null ? parseInt(e.avg_score) : null;
              const scoreColor = score == null ? Colors.textMuted : score >= 80 ? Colors.success : score >= 50 ? Colors.warning : Colors.danger;
              return (
                <TouchableOpacity
                  key={e.elder_id}
                  style={styles.elderRow}
                  onPress={() => router.push(`/elder/${e.elder_id}`)}
                  activeOpacity={0.75}
                >
                  <View style={styles.elderInitial}>
                    <Text style={styles.elderInitialText}>{e.elder_name[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.elderName}>{e.elder_name}</Text>
                    <Text style={styles.elderMeta}>{e.total_calls || 0} calls this week</Text>
                  </View>
                  <Text style={[styles.elderScore, { color: scoreColor }]}>
                    {score != null ? `${score}%` : '—'}
                  </Text>
                  <Text style={styles.elderArrow}>›</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Top concerns */}
        {concerns.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💬 Top Concerns This Week</Text>
            {concerns.map((c: any, i: number) => (
              <View key={i} style={styles.concernRow}>
                <View style={styles.concernRank}>
                  <Text style={styles.concernRankText}>{i + 1}</Text>
                </View>
                <Text style={styles.concernText}>{c.concern}</Text>
                <View style={styles.concernBadge}>
                  <Text style={styles.concernCount}>{c.occurrences}×</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Most missed medications */}
        {missedMeds.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💊 Most Missed Medications</Text>
            {missedMeds.map((m: any, i: number) => (
              <View key={i} style={styles.medRow}>
                <Text style={styles.medIcon}>💊</Text>
                <Text style={styles.medName}>{m.medication}</Text>
                <View style={styles.medBadge}>
                  <Text style={styles.medCount}>{m.missed_count} missed</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty state */}
        {concerns.length === 0 && missedMeds.length === 0 && trend.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>All clear!</Text>
            <Text style={styles.emptyText}>Run some AI check-in calls to see insights appear here.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 120 },
  loadingText: { color: Colors.textSecondary, marginTop: 12, fontSize: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 56, marginBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.text },
  headerSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  heroCard: { borderRadius: 20, padding: 22, marginBottom: 24, borderWidth: 1, borderColor: '#1E3A5F' },
  heroInner: { flexDirection: 'row', alignItems: 'center' },
  heroLeft: { flex: 1 },
  heroLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  heroNum: { fontSize: 52, fontWeight: '800', lineHeight: 58 },
  heroSub: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  heroRight: { alignItems: 'center', paddingLeft: 20, borderLeftWidth: 1, borderLeftColor: Colors.border },
  heroStatRow: { alignItems: 'center' },
  heroStatNum: { fontSize: 28, fontWeight: '800', color: Colors.text },
  heroStatLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  chartCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  elderRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  elderInitial: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryGlow, borderWidth: 1, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  elderInitialText: { color: Colors.primary, fontWeight: '700', fontSize: 16 },
  elderName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  elderMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  elderScore: { fontSize: 18, fontWeight: '800' },
  elderArrow: { color: Colors.textMuted, fontSize: 18 },
  concernRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  concernRank: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primaryGlow, alignItems: 'center', justifyContent: 'center' },
  concernRankText: { color: Colors.primary, fontSize: 12, fontWeight: '800' },
  concernText: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  concernBadge: { backgroundColor: Colors.surfaceHigh, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  concernCount: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  medRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  medIcon: { fontSize: 20 },
  medName: { flex: 1, fontSize: 14, color: Colors.text, fontWeight: '500' },
  medBadge: { backgroundColor: Colors.dangerGlow, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.danger },
  medCount: { color: Colors.danger, fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 40 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 16 },
  emptyText: { color: Colors.textSecondary, marginTop: 8, textAlign: 'center' },
});
