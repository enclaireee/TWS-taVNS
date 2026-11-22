import React from 'react';
import { Text, View } from 'react-native';
import { Callout, Card, Chip, Row, Section } from '../components/ui';
import { useStore } from '../lib/store';
import { color, font } from '../lib/theme';

const stateColor: Record<string, string> = { monitor: color.ok, stim: color.purple500, cooldown: color.warn, locked: color.danger, safe_mode: color.danger };

export default function Live() {
  const { tel, connected } = useStore();
  if (!tel) return <Card><Text style={{ color: color.muted }}>Waiting for telemetry…</Text></Card>;
  const delta = tel.hr != null && tel.hr_baseline != null ? tel.hr - tel.hr_baseline : null;
  return (
    <View>
      <Card>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Chip label={connected ? 'CONNECTED' : 'OFFLINE'} bg={connected ? color.ok : color.warn} fg="#fff" />
          <Chip label={tel.state.toUpperCase()} bg={stateColor[tel.state] ?? color.purple500} fg="#fff" />
        </View>
      </Card>
      <Section n={1} title="Heart rate" />
      <Card>
        <Text style={{ fontSize: font.xl, fontWeight: '700', color: color.ink }}>{tel.hr != null ? `${tel.hr.toFixed(0)} bpm` : '--'}</Text>
        <Row k="Baseline" v={tel.hr_baseline != null ? `${tel.hr_baseline.toFixed(0)} bpm` : '--'} />
        <Row k="Delta" v={delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(0)} bpm` : '--'} />
      </Card>
      <Section n={2} title="Lock reasons" />
      {tel.lock_reasons.length > 0 ? (
        <Callout danger>{tel.lock_reasons.map((r) => <Text key={r} style={{ color: color.danger, fontSize: font.md }}>• {r}</Text>)}</Callout>
      ) : (
        <Callout><Text style={{ color: color.muted, fontSize: font.md }}>No locks</Text></Callout>
      )}
      {tel.review_required && <Callout danger><Text style={{ color: color.danger, fontWeight: '700' }}>Review required before therapy resumes</Text></Callout>}
      <Section n={3} title="Sensor link" />
      <Card>
        <Row k="Link" v={tel.link_ok ? 'OK' : 'LOST'} />
        <Row k="Lost packets" v={String(tel.lost)} />
      </Card>
      {tel.stimulating && tel.stim && (
        <>
          <Section n={4} title="Current stimulation" />
          <Card>
            <Row k="Amplitude" v={`${tel.stim.amp_mA} mA`} />
            <Row k="Frequency" v={`${tel.stim.freq_Hz} Hz`} />
            <Row k="Pulse width" v={`${tel.stim.pw_us} µs`} />
            <Row k="Duration" v={`${tel.stim.duration_s} s`} />
            <Row k="Site" v={tel.stim.site} />
            <Row k="Reason" v={tel.stim.reason} />
          </Card>
        </>
      )}
    </View>
  );
}
