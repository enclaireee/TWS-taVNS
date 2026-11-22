import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Btn } from './components/ui';
import Demo from './screens/Demo';
import Device from './screens/Device';
import Events from './screens/Events';
import Live from './screens/Live';
import Therapy from './screens/Therapy';
import { Tab, useStore } from './lib/store';
import { color, font, gradient, space } from './lib/theme';

const screens: Record<Tab, React.ComponentType> = { Live, Events, Therapy, Device, Demo };

export default function App() {
  const { tab, setTab, connect, connected, tel, abort, clearReview } = useStore();
  useEffect(() => { connect(); }, [connect]);
  const Screen = screens[tab];
  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <StatusBar style="light" />
      <LinearGradient colors={[...gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <SafeAreaView>
          <View style={{ padding: space.lg }}>
            <Text style={{ color: '#fff', fontSize: font.lg, fontWeight: '700' }}>taVNS</Text>
            <Text style={{ color: '#fff', fontSize: font.md }}>{tab}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
      {!connected && (
        <View style={{ backgroundColor: color.warn, padding: space.sm }}>
          <Text style={{ color: color.ink, fontWeight: '700', textAlign: 'center', fontSize: font.sm }}>Device autonomous: therapy continues on the earbud</Text>
        </View>
      )}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: space.lg }} keyboardShouldPersistTaps="handled">
          <Screen />
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={s.abortBar}>
        <View style={{ flex: 1, minWidth: 0 }}><Btn danger label="ABORT" onPress={abort} /></View>
        {tel?.review_required && <View style={{ flex: 1, minWidth: 0 }}><Btn label="Clear review" onPress={clearReview} /></View>}
      </View>
      <SafeAreaView style={{ backgroundColor: color.card }}>
        <View style={s.tabs}>
          {(Object.keys(screens) as Tab[]).map((t) => (
            <Pressable key={t} accessibilityRole="tab" onPress={() => setTab(t)} style={s.tab}>
              <Text style={{ fontSize: font.sm, fontWeight: '700', color: t === tab ? color.purple700 : color.muted }}>{t}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  abortBar: { flexDirection: 'row', gap: space.sm, padding: space.sm, backgroundColor: color.bg },
  tabs: { flexDirection: 'row' },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
