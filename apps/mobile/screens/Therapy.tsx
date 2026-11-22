import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconLock, IconShield } from '../components/Icons';
import { CapBar, MetricRow, SectionHeader, StageCard, StatusPill, WellBox } from '../components/ui';
import { BiphasicWaveform } from '../components/Visuals';
import { color, LIMITS, radius, space, tabular } from '../lib/theme';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Read-only firmware prescription: never editable from the mobile companion.
const PRESCRIPTION = {
  amp_mA: clamp(1.0, 0, LIMITS.ampMax),
  freq_Hz: clamp(25, LIMITS.fMin, LIMITS.fMax),
  pw_us: clamp(250, 0, LIMITS.pwMax),
  duration_s: 60,
  cooldown_s: 120,
  site: 'cymba_left',
};

const INTERLOCKS = [
  {
    name: 'Bradycardia guard',
    rule: 'Locks below absolute HR floor or rapid HR drop ≥ 15 bpm vs baseline',
  },
  {
    name: 'Fall + stillness guard',
    rule: 'High-g impact followed by sustained immobility blocks stimulation',
  },
  {
    name: 'Electrode impedance gate',
    rule: `Holds output when skin-electrode impedance exceeds ${LIMITS.impMaxKohm} kΩ`,
  },
  {
    name: 'Transport safe mode',
    rule: 'Late or dropped sensor packets isolate the output stage immediately',
  },
  {
    name: 'Manual abort priority',
    rule: 'Hardware abort overrides every state and requires explicit review clear',
  },
];

export default function Therapy() {
  return (
    <View>
      {/* Firmware-Enforced Prescription Preview */}
      <StageCard>
        <SectionHeader
          title="Stimulation profile"
          subtitle="Charge-balanced biphasic waveform at left cymba conchae"
          right={<StatusPill label="Read-only" tone="accent" />}
        />

        <WellBox leftAccent={color.accent} style={{ gap: 10, marginBottom: 12 }}>
          <View style={s.waveHeader}>
            <Text style={s.waveTitle}>Responsive seizure train</Text>
            <Text style={[s.waveSpec, tabular]}>
              {PRESCRIPTION.amp_mA.toFixed(1)} mA · {PRESCRIPTION.freq_Hz} Hz · {PRESCRIPTION.pw_us} µs
            </Text>
          </View>
          <BiphasicWaveform
            amp_mA={PRESCRIPTION.amp_mA}
            freq_Hz={PRESCRIPTION.freq_Hz}
            pw_us={PRESCRIPTION.pw_us}
            height={50}
          />
          <View style={s.lockNotice}>
            <IconLock size={13} stroke={color.muted} />
            <Text style={s.lockNoticeT}>
              Parameters are locked in earbud firmware and cannot be altered by the phone.
            </Text>
          </View>
        </WellBox>

        {/* Dosage Utilization vs Hardware Hard Limits */}
        <View style={s.envList}>
          <View style={s.envItem}>
            <View style={s.envTop}>
              <Text style={s.envLabel}>Current amplitude</Text>
              <Text style={[s.envVal, tabular]}>
                {PRESCRIPTION.amp_mA.toFixed(1)} mA{' '}
                <Text style={s.envCap}>/ {LIMITS.ampMax.toFixed(1)} mA max</Text>
              </Text>
            </View>
            <CapBar ratio={PRESCRIPTION.amp_mA / LIMITS.ampMax} />
          </View>

          <View style={s.envItem}>
            <View style={s.envTop}>
              <Text style={s.envLabel}>Pulse frequency</Text>
              <Text style={[s.envVal, tabular]}>
                {PRESCRIPTION.freq_Hz} Hz{' '}
                <Text style={s.envCap}>
                  / {LIMITS.fMin}–{LIMITS.fMax} Hz
                </Text>
              </Text>
            </View>
            <CapBar ratio={PRESCRIPTION.freq_Hz / LIMITS.fMax} />
          </View>

          <View style={s.envItem}>
            <View style={s.envTop}>
              <Text style={s.envLabel}>Biphasic pulse width</Text>
              <Text style={[s.envVal, tabular]}>
                {PRESCRIPTION.pw_us} µs{' '}
                <Text style={s.envCap}>/ {LIMITS.pwMax} µs max</Text>
              </Text>
            </View>
            <CapBar ratio={PRESCRIPTION.pw_us / LIMITS.pwMax} />
          </View>
        </View>
      </StageCard>

      {/* Timing & Target Parameters */}
      <StageCard>
        <SectionHeader title="Closed-loop timing" />
        <WellBox style={{ paddingVertical: 4 }}>
          <MetricRow label="Responsive therapy" value="Enabled" valueColor={color.green} />
          <MetricRow
            label="Single train duration"
            sub="Auto-terminates into refractory cooldown"
            value={`${PRESCRIPTION.duration_s} s`}
          />
          <MetricRow
            label="Refractory cooldown"
            sub="Minimum interval between responsive trains"
            value={`${PRESCRIPTION.cooldown_s} s`}
          />
          <MetricRow
            label="Anatomical target"
            sub="Auricular branch of vagus nerve (ABVN)"
            value={PRESCRIPTION.site}
            last
          />
        </WellBox>
      </StageCard>

      {/* Autonomous Firmware Safety Interlocks */}
      <StageCard>
        <SectionHeader
          title="Firmware safety interlocks"
          subtitle="Enforced independently on the earbud safety FSM"
          right={<IconShield size={18} stroke={color.green} />}
        />
        <WellBox style={{ paddingVertical: 4 }}>
          {INTERLOCKS.map((item, idx) => (
            <View
              key={item.name}
              style={[s.guardRow, idx === INTERLOCKS.length - 1 && { borderBottomWidth: 0 }]}
            >
              <Text style={s.guardName}>{item.name}</Text>
              <Text style={s.guardRule}>{item.rule}</Text>
            </View>
          ))}
        </WellBox>
      </StageCard>
    </View>
  );
}

const s = StyleSheet.create({
  waveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  waveTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: color.ink,
  },
  waveSpec: {
    fontSize: 11.5,
    fontWeight: '600',
    color: color.accent,
  },
  lockNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: color.lineSoft,
  },
  lockNoticeT: {
    flex: 1,
    fontSize: 11.5,
    color: color.muted,
    lineHeight: 16,
  },
  envList: {
    gap: 13,
    marginTop: 2,
  },
  envItem: {
    gap: 2,
  },
  envTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  envLabel: {
    fontSize: 13,
    color: color.ink2,
    fontWeight: '500',
  },
  envVal: {
    fontSize: 13.5,
    fontWeight: '600',
    color: color.ink,
  },
  envCap: {
    fontSize: 11.5,
    color: color.faint,
    fontWeight: '500',
  },
  guardRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: color.lineSoft,
    gap: 2,
  },
  guardName: {
    fontSize: 13,
    fontWeight: '600',
    color: color.ink,
  },
  guardRule: {
    fontSize: 12,
    color: color.muted,
    lineHeight: 17,
  },
});
