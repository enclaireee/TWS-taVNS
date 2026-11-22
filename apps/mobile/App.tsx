import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BrandLogoMark,
  IconEarbud,
  IconFlask,
  IconPulse,
  IconSliders,
  IconTimeline,
} from './components/Icons';
import { ActionButton, StatusPill } from './components/ui';
import { formatClock } from './lib/api';
import { type Tab, useStore } from './lib/store';
import { color, radius, shadow, space, tabular } from './lib/theme';
import Demo from './screens/Demo';
import Device from './screens/Device';
import Events from './screens/Events';
import Live from './screens/Live';
import Therapy from './screens/Therapy';

const SCREENS: Record<Tab, React.ComponentType> = {
  Live,
  Events,
  Therapy,
  Demo,
  Device,
};

const TAB_ITEMS: {
  key: Tab;
  label: string;
  Icon: React.ComponentType<{ size?: number; stroke?: string; strokeWidth?: number }>;
}[] = [
  { key: 'Live', label: 'Live', Icon: IconPulse },
  { key: 'Events', label: 'Events', Icon: IconTimeline },
  { key: 'Therapy', label: 'Therapy', Icon: IconSliders },
  { key: 'Demo', label: 'Lab', Icon: IconFlask },
  { key: 'Device', label: 'Device', Icon: IconEarbud },
];

export default function App() {
  const { tab, setTab, connect, connected, linkKnown, tel, abort, clearReview } = useStore();

  useEffect(() => {
    connect();
  }, [connect]);

  const Screen = SCREENS[tab];
  const down = linkKnown && !connected;

  const connLabel = down
    ? 'Autonomous'
    : connected
      ? tel?.live_mode
        ? 'Live'
        : 'Replay'
      : 'Connecting';

  const connTone = down
    ? 'warn'
    : connected
      ? tel?.live_mode
        ? 'ok'
        : 'accent'
      : 'neutral';

  return (
    <View style={s.appShell}>
      <StatusBar style="light" />

      {/* Top Machined Obsidian Header */}
      <SafeAreaView style={s.headerSafe}>
        <View style={s.header}>
          <View style={s.brandCluster}>
            <BrandLogoMark size={22} />
            <Text style={s.wordmark}>taVNS</Text>
            <StatusPill label={connLabel} tone={connTone} />
          </View>

          <View style={s.headerRight}>
            {tel ? (
              <Text style={[s.clock, tabular]}>{formatClock(tel.t)}</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abort stimulation immediately"
              onPress={abort}
              style={({ pressed }) => [
                s.abortBtn,
                pressed && { backgroundColor: color.redHover, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={s.abortText}>Abort</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* Autonomous Link Banner */}
      {down && (
        <View style={s.autoBanner}>
          <Text style={s.autoBannerText}>
            <Text style={{ fontWeight: '700' }}>Device autonomous</Text> — therapy & safety locks
            continue safely on the earbud.
          </Text>
        </View>
      )}

      {/* Global Manual Review Banner (when on non-Live tabs so user never misses it) */}
      {tel?.review_required && tab !== 'Live' && (
        <View style={s.reviewBanner}>
          <Text style={s.reviewText}>Manual review required before stimulation resumes</Text>
          <ActionButton
            label="Clear"
            variant="warn"
            compact
            disabled={down}
            onPress={clearReview}
          />
        </View>
      )}

      {/* Main Scroll Viewport */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Screen />
          <Text style={s.footnote}>
            Synthetic demo telemetry · Closed-loop safety layer · Abort always wins
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Machined Obsidian Tab Bar */}
      <SafeAreaView style={s.tabSafe}>
        <View style={s.tabBar}>
          {TAB_ITEMS.map(({ key, label, Icon }) => {
            const active = key === tab;
            return (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setTab(key)}
                style={s.tabItem}
              >
                <View style={[s.tabIndicator, active && s.tabIndicatorOn]} />
                <Icon
                  size={20}
                  stroke={active ? color.accent : color.muted}
                  strokeWidth={active ? 2.1 : 1.75}
                />
                <Text style={[s.tabLabel, active && s.tabLabelOn]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: color.bg,
  },
  headerSafe: {
    backgroundColor: color.bg,
    borderBottomWidth: 1,
    borderBottomColor: color.lineSoft,
  },
  header: {
    height: 54,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  brandCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  wordmark: {
    fontSize: 17.5,
    fontWeight: '700',
    letterSpacing: -0.45,
    color: color.ink,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clock: {
    fontSize: 12.5,
    fontWeight: '500',
    color: color.muted,
  },
  abortBtn: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: radius.btn,
    backgroundColor: color.red,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  abortText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.15,
  },
  autoBanner: {
    backgroundColor: color.amberSoft,
    borderBottomWidth: 1,
    borderBottomColor: color.amberLine,
    paddingHorizontal: space.lg,
    paddingVertical: 9,
  },
  autoBannerText: {
    fontSize: 12,
    color: color.amber,
    lineHeight: 16.5,
  },
  reviewBanner: {
    backgroundColor: color.redSoft,
    borderBottomWidth: 1,
    borderBottomColor: color.redLine,
    paddingHorizontal: space.lg,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  reviewText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: color.red,
  },
  scrollContent: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: 28,
  },
  footnote: {
    textAlign: 'center',
    fontSize: 11,
    color: color.faint,
    marginTop: 6,
    marginBottom: 8,
  },
  tabSafe: {
    backgroundColor: color.stage,
    borderTopWidth: 1,
    borderTopColor: color.line,
    ...shadow.bar,
  },
  tabBar: {
    flexDirection: 'row',
    height: 58,
    paddingHorizontal: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  tabIndicatorOn: {
    backgroundColor: color.accent,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '500',
    color: color.muted,
    letterSpacing: 0.1,
  },
  tabLabelOn: {
    color: color.ink,
    fontWeight: '600',
  },
});
