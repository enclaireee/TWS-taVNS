import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { IconRadio, IconShield } from '../components/Icons';
import {
  ActionButton,
  MetricRow,
  SectionHeader,
  StageCard,
  StatusPill,
  WellBox,
} from '../components/ui';
import { EarbudTwin } from '../components/Visuals';
import { useStore } from '../lib/store';
import { color, LIMITS, radius, space, tabular } from '../lib/theme';

export default function Device() {
  const { baseUrl, setBaseUrl, connected, linkKnown, tel } = useStore();
  const [url, setUrl] = useState(baseUrl);
  const down = linkKnown && !connected;
  const highImp = tel?.impedance_kohm != null && tel.impedance_kohm > LIMITS.impMaxKohm;

  return (
    <View>
      {/* Hardware Twin & Sensor Telemetry */}
      <StageCard>
        <SectionHeader
          title="TWS-taVNS Earbud"
          subtitle="Left cymba conchae · Closed-loop hardware"
          right={
            <StatusPill
              label={connected ? 'Connected' : 'Autonomous'}
              tone={connected ? 'ok' : 'warn'}
            />
          }
        />

        <WellBox style={{ paddingVertical: 8, paddingHorizontal: 6, marginBottom: 12 }}>
          <EarbudTwin tel={tel} down={down} height={198} />
        </WellBox>

        <View style={s.sensorGrid}>
          <View style={s.sensorTile}>
            <Text style={s.tileK}>Contact impedance</Text>
            <Text style={[s.tileV, tabular, highImp && { color: color.red }]}>
              {tel?.impedance_kohm != null ? `${tel.impedance_kohm.toFixed(1)} kΩ` : '--'}
            </Text>
            <Text style={s.tileHint}>
              {highImp ? `Above ${LIMITS.impMaxKohm} kΩ limit` : 'Safe skin contact'}
            </Text>
          </View>

          <View style={s.sensorTile}>
            <Text style={s.tileK}>3-Axis IMU</Text>
            <Text style={[s.tileV, tabular]}>
              {tel?.imu_g != null ? `${tel.imu_g.toFixed(2)} g` : '--'}
            </Text>
            <Text style={s.tileHint}>Clonic & fall sensing</Text>
          </View>

          <View style={s.sensorTile}>
            <Text style={s.tileK}>Sensor transport</Text>
            <Text
              style={[
                s.tileV,
                { color: tel?.link_ok ? color.green : color.red },
              ]}
            >
              {tel?.link_ok ? 'CRC32 OK' : 'Link lost'}
            </Text>
            <Text style={s.tileHint}>PPG 48 Hz · EEG 256 Hz</Text>
          </View>

          <View style={s.sensorTile}>
            <Text style={s.tileK}>Packets lost</Text>
            <Text style={[s.tileV, tabular, (tel?.lost ?? 0) > 0 && { color: color.red }]}>
              {tel?.lost ?? 0}
            </Text>
            <Text style={s.tileHint}>Zero-queue contract</Text>
          </View>
        </View>
      </StageCard>

      {/* Autonomous Fail-Safe Guarantee */}
      <StageCard>
        <View style={s.safeHeader}>
          <IconShield size={18} stroke={color.green} />
          <Text style={s.safeTitle}>Autonomous fail-safe architecture</Text>
        </View>
        <Text style={s.safeBody}>
          Phone connectivity is strictly observational. If Bluetooth or Wi-Fi drops, seizure
          detection, cardiac safety locks, and biphasic stimulation limits continue running
          autonomously on the earbud with zero queued commands.
        </Text>
      </StageCard>

      {/* Core Endpoint Configuration */}
      <StageCard>
        <SectionHeader
          title="Core telemetry link"
          subtitle="Connect over local network to the taVNS core API"
          right={<IconRadio size={17} stroke={connected ? color.green : color.amber} />}
        />

        <Text style={s.inputLabel}>Core API endpoint</Text>
        <TextInput
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="http://localhost:8000"
          placeholderTextColor={color.faint}
          accessibilityLabel="Core API URL"
          style={s.input}
        />

        <ActionButton
          label="Apply & reconnect"
          variant="primary"
          onPress={() => setBaseUrl(url)}
          style={{ marginBottom: 14 }}
        />

        <WellBox style={{ paddingVertical: 4 }}>
          <MetricRow
            label="Operating mode"
            value={connected ? 'Live companion' : 'Device autonomous'}
            valueColor={connected ? color.green : color.amber}
          />
          <MetricRow label="Contract version" value="v1.0" />
          <MetricRow label="Stimulation authority" value="Earbud firmware only" last />
        </WellBox>
      </StageCard>
    </View>
  );
}

const s = StyleSheet.create({
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sensorTile: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: color.well,
    borderWidth: 1,
    borderColor: color.lineSoft,
    borderRadius: radius.tile,
    padding: 12,
    gap: 2,
  },
  tileK: {
    fontSize: 11,
    color: color.muted,
    fontWeight: '500',
  },
  tileV: {
    fontSize: 16,
    fontWeight: '600',
    color: color.ink,
    marginTop: 2,
  },
  tileHint: {
    fontSize: 11,
    color: color.faint,
    marginTop: 1,
  },
  safeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  safeTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: color.ink,
    letterSpacing: -0.2,
  },
  safeBody: {
    fontSize: 13,
    color: color.muted,
    lineHeight: 19,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: color.ink2,
    marginBottom: 6,
  },
  input: {
    minHeight: 44,
    backgroundColor: color.well,
    borderWidth: 1,
    borderColor: color.lineStrong,
    borderRadius: radius.btn,
    paddingHorizontal: 13,
    color: color.ink,
    fontSize: 13.5,
    marginBottom: 12,
  },
});
