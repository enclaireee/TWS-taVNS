import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { color, font, radius, shadow, space } from '../lib/theme';

export const Card = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => (
  <View style={[s.card, style]}>{children}</View>
);

export const Section = ({ n, title }: { n: number; title: string }) => (
  <View style={s.pill}>
    <View style={s.badge}><Text style={s.badgeT}>{n}</Text></View>
    <Text style={s.pillT}>{title}</Text>
  </View>
);

export const Callout = ({ children, danger }: { children: React.ReactNode; danger?: boolean }) => (
  <View style={[s.callout, danger && { backgroundColor: color.dangerBg, borderColor: color.danger }]}>{children}</View>
);

export const Row = ({ k, v }: { k: string; v: string }) => (
  <View style={s.row}>
    <Text style={s.k}>{k}</Text>
    <Text style={s.v} numberOfLines={2}>{v}</Text>
  </View>
);

export const Chip = ({ label, bg = color.purple100, fg = color.purple700 }: { label: string; bg?: string; fg?: string }) => (
  <View style={[s.chip, { backgroundColor: bg }]}><Text style={[s.chipT, { color: fg }]}>{label}</Text></View>
);

export const Btn = ({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [s.btn, danger && { backgroundColor: color.danger }, pressed && { opacity: 0.7 }]}
  >
    <Text style={s.btnT}>{label}</Text>
  </Pressable>
);

export const s = StyleSheet.create({
  card: { backgroundColor: color.card, borderRadius: radius.card, padding: space.lg, marginBottom: space.md, ...shadow.card },
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: color.purple100, borderRadius: radius.pill, paddingRight: space.lg, paddingLeft: space.xs, paddingVertical: space.xs, marginBottom: space.sm },
  badge: { width: 24, height: 24, borderRadius: 12, backgroundColor: color.purple700, alignItems: 'center', justifyContent: 'center', marginRight: space.sm },
  badgeT: { color: '#fff', fontSize: font.sm, fontWeight: '700' },
  pillT: { color: color.purple900, fontSize: font.md, fontWeight: '700' },
  callout: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.line, borderRadius: radius.chip, padding: space.md, marginBottom: space.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.xs, gap: space.md },
  k: { color: color.muted, fontSize: font.md },
  v: { color: color.ink, fontSize: font.md, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  chip: { borderRadius: radius.chip, paddingHorizontal: space.sm, paddingVertical: space.xs, alignSelf: 'flex-start' },
  chipT: { fontSize: font.sm, fontWeight: '700' },
  btn: { minHeight: 44, borderRadius: radius.pill, backgroundColor: color.purple700, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  btnT: { color: '#fff', fontWeight: '700', fontSize: font.md },
});
