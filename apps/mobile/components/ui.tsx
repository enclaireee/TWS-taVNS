import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { color, font, radius, shadow, space, STATE_META, tabular, type DeviceState } from '../lib/theme';

export function StageCard({
  children,
  style,
  tone,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  tone?: 'default' | 'accent' | 'danger';
}) {
  return (
    <View
      style={[
        s.stage,
        tone === 'accent' && { borderColor: color.accentLine },
        tone === 'danger' && { borderColor: color.redLine },
        style,
      ]}
    >
      <View style={s.topSheen} pointerEvents="none" />
      {children}
    </View>
  );
}

export function WellBox({
  children,
  style,
  leftAccent,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  leftAccent?: string;
}) {
  return (
    <View
      style={[
        s.well,
        leftAccent ? { borderLeftWidth: 2.5, borderLeftColor: leftAccent } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionHeader({
  title,
  right,
  subtitle,
}: {
  title: string;
  right?: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <View style={s.secHead}>
      <View style={{ flex: 1 }}>
        <Text style={s.secTitle}>{title}</Text>
        {subtitle ? <Text style={s.secSub}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function StatusPill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'ok' | 'accent' | 'warn' | 'danger' | 'neutral';
}) {
  const palette = {
    ok: { bg: color.greenSoft, border: color.greenLine, fg: color.green },
    accent: { bg: color.accentSoft, border: color.accentLine, fg: color.accent },
    warn: { bg: color.amberSoft, border: color.amberLine, fg: color.amber },
    danger: { bg: color.redSoft, border: color.redLine, fg: color.red },
    neutral: { bg: color.stage2, border: color.line, fg: color.muted },
  }[tone];

  return (
    <View style={[s.pill, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[s.pillT, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const STEPS: DeviceState[] = ['monitor', 'stim', 'cooldown', 'locked', 'safe_mode'];

export function StateStepper({ current }: { current: DeviceState }) {
  return (
    <View style={s.stepper}>
      {STEPS.map((st) => {
        const active = st === current;
        const meta = STATE_META[st];
        return (
          <View
            key={st}
            style={[
              s.stepNode,
              active && { backgroundColor: meta.bg, borderColor: meta.border, borderWidth: 1 },
            ]}
          >
            <Text
              style={[
                s.stepText,
                active && { color: meta.fg, fontWeight: '600' },
              ]}
              numberOfLines={1}
            >
              {meta.short}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function CapBar({
  ratio,
  barColor = color.accent,
}: {
  ratio: number;
  barColor?: string;
}) {
  const pct = `${Math.max(4, Math.min(100, Math.round(ratio * 100)))}%` as const;
  return (
    <View style={s.capTrack}>
      <View style={[s.capFill, { width: pct, backgroundColor: barColor }]} />
    </View>
  );
}

export function MetricRow({
  label,
  value,
  valueColor,
  sub,
  last,
}: {
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
  last?: boolean;
}) {
  return (
    <View style={[s.mRow, last && { borderBottomWidth: 0, paddingBottom: 2 }]}>
      <View style={{ flex: 1 }}>
        <Text style={s.mLabel}>{label}</Text>
        {sub ? <Text style={s.mSub}>{sub}</Text> : null}
      </View>
      <Text style={[s.mVal, tabular, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

export function ActionButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  compact,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'warn' | 'danger';
  disabled?: boolean;
  compact?: boolean;
  style?: ViewStyle;
}) {
  const stylesByVariant = {
    primary: { bg: color.ink, border: color.ink, fg: color.bg },
    secondary: { bg: color.stage2, border: color.lineStrong, fg: color.ink },
    accent: { bg: color.accentSoft, border: color.accentLine, fg: color.accent },
    warn: { bg: color.amberSoft, border: color.amberLine, fg: color.amber },
    danger: { bg: color.red, border: 'rgba(255,255,255,0.14)', fg: '#FFFFFF' },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        compact && s.btnCompact,
        {
          backgroundColor: stylesByVariant.bg,
          borderColor: stylesByVariant.border,
        },
        disabled && { opacity: 0.4 },
        pressed && !disabled && { opacity: 0.82, transform: [{ scale: 0.985 }] },
        style,
      ]}
    >
      <Text
        style={[
          s.btnT,
          compact && { fontSize: 12.5 },
          { color: stylesByVariant.fg },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  stage: {
    backgroundColor: color.stage,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.stage,
    padding: space.lg,
    marginBottom: space.md,
    overflow: 'hidden',
    ...shadow.stage,
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: color.sheen,
  },
  well: {
    backgroundColor: color.well,
    borderWidth: 1,
    borderColor: color.lineSoft,
    borderRadius: radius.panel,
    padding: 13,
  },
  secHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  secTitle: {
    fontSize: 15.5,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: color.ink,
  },
  secSub: {
    fontSize: 12,
    color: color.muted,
    marginTop: 2,
    lineHeight: 16.5,
  },
  pill: {
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  pillT: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  stepper: {
    flexDirection: 'row',
    backgroundColor: color.track,
    borderWidth: 1,
    borderColor: color.lineSoft,
    borderRadius: radius.tile,
    padding: 3,
    gap: 2,
  },
  stepNode: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  stepText: {
    fontSize: 10.5,
    fontWeight: '500',
    color: color.faint,
  },
  capTrack: {
    height: 3.5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginTop: 5,
  },
  capFill: {
    height: '100%',
    borderRadius: 3,
  },
  mRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: color.lineSoft,
    gap: 12,
  },
  mLabel: {
    fontSize: 13.5,
    color: color.ink2,
    fontWeight: '500',
  },
  mSub: {
    fontSize: 11.5,
    color: color.muted,
    marginTop: 1,
  },
  mVal: {
    fontSize: 13.5,
    fontWeight: '600',
    color: color.ink,
    textAlign: 'right',
  },
  btn: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: radius.btn,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCompact: {
    minHeight: 33,
    paddingHorizontal: 12,
  },
  btnT: {
    fontSize: 13.5,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
