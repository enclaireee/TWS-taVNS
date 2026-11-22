import React from 'react';
import { View } from 'react-native';
import { Card, Row, Section } from '../components/ui';
import { LIMITS } from '../lib/theme';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
// Read-only: display values only, no controls.
const amp = clamp(1.0, 0, LIMITS.ampMax);
const freq = clamp(25, LIMITS.fMin, LIMITS.fMax);
const pw = clamp(250, 0, LIMITS.pwMax);

export default function Therapy() {
  return (
    <View>
      <Section n={1} title="Settings (read-only)" />
      <Card>
        <Row k="Responsive therapy" v="On" />
        <Row k="Amplitude" v={`${amp.toFixed(1)} mA`} />
        <Row k="Frequency" v={`${freq} Hz`} />
        <Row k="Pulse width" v={`${pw} µs`} />
        <Row k="Duration" v="30 s" />
        <Row k="Cooldown" v="120 s" />
      </Card>
      <Section n={2} title="Hard limits" />
      <Card>
        <Row k="Max amplitude" v={`${LIMITS.ampMax} mA`} />
        <Row k="Max pulse width" v={`${LIMITS.pwMax} µs`} />
        <Row k="Frequency" v={`${LIMITS.fMin}–${LIMITS.fMax} Hz`} />
      </Card>
    </View>
  );
}
