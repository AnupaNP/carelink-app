import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { callsApi } from '@/services/api';
import { Colors } from '@/constants/theme';

function MedBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; icon: string; label: string }> = {
    taken:  { color: Colors.success, bg: Colors.successGlow, icon: '✅', label: 'Taken' },
    missed: { color: Colors.danger,  bg: Colors.dangerGlow,  icon: '❌', label: 'Missed' },
    na:     { color: Colors.textMuted, bg: Colors.border,    icon: '—',  label: 'N/A' },
  };
  const s = map[status] || map.na;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: s.bg, borderColor: s.color }]}>
      <Text style={badgeStyles.icon}>{s.icon}</Text>
      <Text style={[badgeStyles.label, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}
const badgeStyles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  icon: { fontSize: 12 },
  label: { fontSize: 12, fontWeight: '700' },
});

function TurnBubble({ turn }: { turn: { speaker: string; text: string; timestamp?: string } }) {
  const isElder = turn.speaker === 'ELDER';
  return (
    <View style={[bubbleStyles.row, isElder && bubbleStyles.elderRow]}>
      {!isElder && <Text style={bubbleStyles.speakerIcon}>🤖</Text>}
      <View style={[bubbleStyles.bubble, isElder ? bubbleStyles.elderBubble : bubbleStyles.aiBubble]}>
        <Text style={[bubbleStyles.speaker, isElder && bubbleStyles.elderSpeakerColor]}>
          {isElder ? '👴 Elder' : 'AI Assistant'}
        </Text>
        <Text style={[bubbleStyles.text, isElder && bubbleStyles.elderText]}>{turn.text}</Text>
        {turn.timestamp && <Text style={bubbleStyles.timestamp}>{turn.timestamp}</Text>}
      </View>
      {isElder && <Text style={bubbleStyles.speakerIcon}>👴</Text>}
    </View>
  );
}
const bubbleStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 14 },
  elderRow: { flexDirection: 'row-reverse' },
  speakerIcon: { fontSize: 22, marginBottom: 4 },
  bubble: { maxWidth: '80%', borderRadius: 18, padding: 12 },
  aiBubble: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 4 },
  elderBubble: { backgroundColor: Colors.primaryGlow, borderWidth: 1, borderColor: Colors.primary, borderBottomRightRadius: 4 },
  speaker: { fontSize: 11, color: Colors.textMuted, marginBottom: 4, fontWeight: '600' },
  elderSpeakerColor: { color: Colors.primaryLight },
  text: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  elderText: { color: Colors.text },
  timestamp: { fontSize: 10, color: Colors.textMuted, marginTop: 4, textAlign: 'right' },
});

export default function CallDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [call, setCall] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await callsApi.get(id!);
        setCall(res.data);
      } catch (err) {
        Alert.alert('Error', 'Failed to load call details');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <LinearGradient colors={['#050B18', '#0B1120']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!call) return null;

  const analysis = call.llm_analysis;
  const turns = call.raw_transcript?.turns || [];
  const duration = call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s` : 'N/A';
  const moodIcon: Record<string, string> = { positive: '😊', neutral: '😐', low: '😟', distressed: '😰' };
  const scoreColor = analysis?.compliance_score >= 80 ? Colors.success : analysis?.compliance_score >= 50 ? Colors.warning : Colors.danger;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#050B18', '#0B1120']} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Call Summary</Text>
          <Text style={styles.subtitle}>{call.elder_name} · {new Date(call.call_timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
        </View>

        {/* Call Meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaCard}><Text style={styles.metaNum}>{duration}</Text><Text style={styles.metaLabel}>Duration</Text></View>
          <View style={styles.metaCard}><Text style={[styles.metaNum, { color: scoreColor }]}>{analysis?.compliance_score ?? '—'}%</Text><Text style={styles.metaLabel}>Compliance</Text></View>
          <View style={styles.metaCard}><Text style={styles.metaNum}>{moodIcon[analysis?.mood] || '—'}</Text><Text style={styles.metaLabel}>Mood</Text></View>
          <View style={styles.metaCard}><Text style={styles.metaNum}>{analysis?.distress_flag ? '🚨' : '✅'}</Text><Text style={styles.metaLabel}>Distress</Text></View>
        </View>

        {/* Summary */}
        {analysis?.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 AI Summary</Text>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>{analysis.summary}</Text>
              {analysis._source === 'keyword_fallback' && (
                <Text style={styles.fallbackNote}>⚡ Keyword analysis (Gemini quota exceeded)</Text>
              )}
            </View>
          </View>
        )}

        {/* Medications */}
        {analysis?.medications?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💊 Medications</Text>
            {analysis.medications.map((med: any, i: number) => (
              <View key={i} style={styles.medRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medTime}>{med.scheduled_time?.slice(0, 5)}</Text>
                </View>
                <MedBadge status={med.status} />
              </View>
            ))}
          </View>
        )}

        {/* Meals */}
        {analysis?.meals && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🍽️ Meals</Text>
            {Object.entries(analysis.meals).map(([meal, status]) => {
              const s = status as string;
              const mealIcon = meal === 'breakfast' ? '🌅' : meal === 'lunch' ? '☀️' : '🌙';
              const statusColor = s === 'eaten' ? Colors.success : s === 'skipped' ? Colors.danger : s === 'partial' ? Colors.warning : Colors.textMuted;
              return (
                <View key={meal} style={styles.mealRow}>
                  <Text style={styles.mealIcon}>{mealIcon}</Text>
                  <Text style={styles.mealLabel}>{meal.charAt(0).toUpperCase() + meal.slice(1)}</Text>
                  <Text style={[styles.mealStatus, { color: statusColor }]}>{s === 'na' ? 'N/A' : s.charAt(0).toUpperCase() + s.slice(1)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Concerns */}
        {analysis?.raw_concerns?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ Concerns Noted</Text>
            {analysis.raw_concerns.map((c: string, i: number) => (
              <View key={i} style={styles.concernRow}>
                <Text style={styles.concernDot}>•</Text>
                <Text style={styles.concernText}>{c}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Transcript */}
        {turns.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎙️ Call Transcript</Text>
            <View style={styles.transcriptCard}>
              {turns.map((turn: any, i: number) => <TurnBubble key={i} turn={turn} />)}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 80 },
  header: { paddingTop: 56, marginBottom: 24 },
  backBtn: { backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, alignSelf: 'flex-start', marginBottom: 16 },
  backText: { color: Colors.primary, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  metaCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  metaNum: { fontSize: 22, fontWeight: '800', color: Colors.text },
  metaLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  summaryCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  summaryText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  fallbackNote: { fontSize: 11, color: Colors.textMuted, marginTop: 8, fontStyle: 'italic' },
  medRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  medName: { fontSize: 14, color: Colors.text, fontWeight: '600' },
  medTime: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  mealRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  mealIcon: { fontSize: 20, width: 30 },
  mealLabel: { flex: 1, fontSize: 14, color: Colors.text, fontWeight: '500' },
  mealStatus: { fontSize: 13, fontWeight: '600' },
  concernRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  concernDot: { color: Colors.warning, fontSize: 18, lineHeight: 22 },
  concernText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 22 },
  transcriptCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
});
