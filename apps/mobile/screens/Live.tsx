import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconShield, IconShieldAlert, IconZap } from '../components/Icons';
import { ActionButton, CapBar, StageCard, StateStepper, WellBox } from '../components/ui';
import {
  BiphasicWaveform,
  ClosedLoopPipeline,
  EarbudTwin,
  LiveSignalScope,
  VitalityRing,
} from '../components/Visuals';
import { useStore } from '../lib/store';
import { color, font, LIMITS, radius, space, STATE_META, tabular } from '../lib/theme';

export default function Live() {
  const { tel, ppgWave, eegWave, connected, linkKnown, clearReview } = useStore();
  const down = linkKnown && !connected;

  if (!tel) {
    return (
      <StageCard>
        <Text style={s.waitTitle}>Connecting to earbud core…</Text>
        <Text style={s.waitSub}>
          Waiting for live PPG, auricular EEG, and safety state frames on the telemetry stream.
        </Text>
      </StageCard>
    );
  }

  const meta = STATE_META[tel.state];
  const delta =
    tel.hr != null && tel.hr_baseline != null ? Math.round(tel.hr - tel.hr_baseline) : null;
  const hrAlert = delta != null && delta <= -15;
  const locked = tel.state === 'locked' || tel.state === 'safe_mode';
  const showLockBanner = tel.lock_reasons.length > 0 || tel.review_required;
  const highImp = tel.impedance_kohm != null && tel.impedance_kohm > LIMITS.impMaxKohm;
  const stim = tel.stimulating && tel.stim ? tel.stim : null;
  const activeInj = new Set(tel.injections ?? []);
  const eegBurst = activeInj.has('seizure') || tel.state === 'stim';

  const heroTone = locked ? 'danger' : stim ? 'accent' : 'default';

  return (
    <View style={[s.root, down && { opacity: 0.72 }]}>
      {/* Primary Live Telemetry Stage */}
      <StageCard tone={heroTone}>
        {/* State Headline + Note */}
        <View style={s.stateHead}>
          <View style={s.stateTitleRow}>
            <Text
              style={[
                s.stateTitle,
                tel.state === 'stim' && { color: color.accent },
                locked && { color: color.red },
              ]}
            >
              {meta.label}
            </Text>
            <Text style={[s.scenarioTag, tabular]} numberOfLines={1}>
              {tel.live_mode ? 'Live baseline' : tel.scenario.replace(/_/g, ' ')}
            </Text>
          </View>
          <Text style={s.stateNote}>{meta.note}</Text>
        </View>

        {/* 5-State Safety Machine Stepper */}
        <StateStepper current={tel.state} />

        {/* Safety Interlock / Manual Review Alert */}
        {showLockBanner && (
          <View style={s.lockBox}>
            <View style={s.lockHeader}>
              <IconShieldAlert size={16} stroke={color.red} />
              <Text style={s.lockTitle}>
                {tel.review_required
                  ? 'Manual review required'
                  : 'Safety interlock active'}
              </Text>
            </View>
            <Text style={s.lockDesc}>
              {tel.lock_reasons.length > 0
                ? tel.lock_reasons.join(' · ')
                : 'Stimulation is held until clinician or user clears manual review.'}
            </Text>
            {tel.review_required && (
              <ActionButton
                label="Clear review"
                variant="warn"
                compact
                disabled={down}
                onPress={clearReview}
                style={{ alignSelf: 'flex-start', marginTop: 8 }}
              />
            )}
          </View>
        )}

        {/* Vitality Dial + Constant Vitals Well */}
        <WellBox style={s.dialWell}>
          <VitalityRing
            hr={tel.hr}
            baseline={tel.hr_baseline}
            state={tel.state}
            stimAmp={stim ? stim.amp_mA : null}
            hrAlert={hrAlert}
            size={186}
          />
          <View style={s.vitalsRow}>
            <View style={s.vitalCell}>
              <Text style={s.vitalK}>Impedance</Text>
              <Text style={[s.vitalV, tabular, highImp && { color: color.red }]}>
                {tel.impedance_kohm != null ? `${tel.impedance_kohm.toFixed(1)} kΩ` : '--'}
              </Text>
            </View>
            <View style={s.vitalDivider} />
            <View style={s.vitalCell}>
              <Text style={s.vitalK}>IMU Motion</Text>
              <Text style={[s.vitalV, tabular]}>
                {tel.imu_g != null ? `${tel.imu_g.toFixed(2)} g` : '--'}
              </Text>
            </View>
            <View style={s.vitalDivider} />
            <View style={s.vitalCell}>
              <Text style={s.vitalK}>Packet Loss</Text>
              <Text style={[s.vitalV, tabular, tel.lost > 0 && { color: color.red }]}>
                {tel.lost}
              </Text>
            </View>
          </View>
        </WellBox>

        {/* Active Biphasic Stimulation Module (Promoted when active) */}
        {stim ? (
          <WellBox leftAccent={color.accent} style={s.stimWell}>
            <View style={s.stimHead}>
              <View style={s.stimTitleRow}>
                <IconZap size={14} stroke={color.accent} />
                <Text style={s.stimTitle}>Active taVNS</Text>
              </View>
              <Text style={s.stimSite} numberOfLines={1}>
                {stim.site} · {stim.reason}
              </Text>
            </View>

            <BiphasicWaveform
              amp_mA={stim.amp_mA}
              freq_Hz={stim.freq_Hz}
              pw_us={stim.pw_us}
              height={44}
            />

            <View style={s.dosageGrid}>
              <View style={s.dosageItem}>
                <Text style={s.dosageK}>Amplitude</Text>
                <Text style={[s.dosageV, tabular]}>{stim.amp_mA.toFixed(1)} mA</Text>
                <CapBar ratio={stim.amp_mA / LIMITS.ampMax} />
              </View>
              <View style={s.dosageItem}>
                <Text style={s.dosageK}>Frequency</Text>
                <Text style={[s.dosageV, tabular]}>{stim.freq_Hz} Hz</Text>
                <CapBar ratio={stim.freq_Hz / LIMITS.fMax} />
              </View>
              <View style={s.dosageItem}>
                <Text style={s.dosageK}>Pulse width</Text>
                <Text style={[s.dosageV, tabular]}>{stim.pw_us} µs</Text>
                <CapBar ratio={stim.pw_us / LIMITS.pwMax} />
              </View>
              <View style={s.dosageItem}>
                <Text style={s.dosageK}>Duration</Text>
                <Text style={[s.dosageV, tabular]}>{stim.duration_s} s</Text>
                <Text style={s.dosageNote}>Single train</Text>
              </View>
            </View>
          </WellBox>
        ) : (
          <WellBox style={s.standbyWell}>
            <View style={s.standbyLeft}>
              <IconShield size={16} stroke={locked ? color.red : color.green} />
              <View style={{ flex: 1 }}>
                <Text style={s.standbyTitle}>Output stage isolated</Text>
                <Text style={s.standbySub}>No stimulation active</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.standbyCapLabel}>Hard limits</Text>
              <Text style={[s.standbyCap, tabular]}>5.0 mA · 30 Hz · 500 µs</Text>
            </View>
          </WellBox>
        )}
      </StageCard>

      {/* Live Biometric Oscilloscopes */}
      <StageCard style={{ gap: 10 }}>
        <View style={s.cardTopRow}>
          <Text style={s.cardLabel}>Live biosignals</Text>
          <Text style={[s.cardMeta, tabular]}>
            {tel.link_ok ? 'CRC32 stream OK' : 'Stream interrupted'}
          </Text>
        </View>

        <LiveSignalScope
          title="Cardiac PPG pulse"
          meta={tel.hr != null ? `${tel.hr.toFixed(0)} bpm · 48 Hz` : 'No pulse'}
          metaColor={hrAlert || locked ? color.red : color.muted}
          samples={ppgWave}
          fixedRange={[-1.4, 1.4]}
          stroke={hrAlert || locked ? color.red : '#F2F2F7'}
          emptyText="Waiting for optical PPG pulse…"
          gradId="ppgGrad"
        />

        <LiveSignalScope
          title="Auricular EEG signal"
          meta={
            eegBurst
              ? '18 Hz ictal burst'
              : activeInj.has('chewing')
                ? 'EMG artefact rejected'
                : 'Alpha baseline · 256 Hz'
          }
          metaColor={
            eegBurst
              ? color.accent
              : activeInj.has('chewing')
                ? color.amber
                : color.muted
          }
          samples={eegWave}
          stroke={
            eegBurst
              ? color.accent
              : activeInj.has('chewing')
                ? color.amber
                : '#A1A1B0'
          }
          emptyText="Waiting for auricular EEG stream…"
          gradId="eegGrad"
        />
      </StageCard>

      {/* Schematic Earbud & Closed-Loop Pipeline */}
      <StageCard style={{ gap: 12 }}>
        <View style={s.cardTopRow}>
          <Text style={s.cardLabel}>Earbud hardware twin</Text>
          <Text style={s.cardMeta}>{stim ? 'Electrode active' : 'Cymba conchae'}</Text>
        </View>
        <WellBox style={{ paddingVertical: 8, paddingHorizontal: 6 }}>
          <EarbudTwin tel={tel} down={down} height={192} />
        </WellBox>
        <ClosedLoopPipeline tel={tel} down={down} />
      </StageCard>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    gap: 2,
  },
  waitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: color.ink,
    marginBottom: 4,
  },
  waitSub: {
    fontSize: 13,
    color: color.muted,
    lineHeight: 19,
  },
  stateHead: {
    gap: 4,
    marginBottom: 14,
  },
  stateTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
  },
  stateTitle: {
    fontSize: 27,
    fontWeight: '600',
    letterSpacing: -0.9,
    lineHeight: 31,
    color: color.ink,
  },
  scenarioTag: {
    fontSize: 11.5,
    color: color.faint,
    fontWeight: '500',
    textTransform: 'capitalize',
    flexShrink: 1,
  },
  stateNote: {
    fontSize: 13,
    color: color.muted,
    lineHeight: 18.5,
  },
  lockBox: {
    marginTop: 12,
    padding: 13,
    borderRadius: radius.tile,
    backgroundColor: color.redSoft,
    borderWidth: 1,
    borderColor: color.redLine,
    gap: 4,
  },
  lockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  lockTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: color.red,
  },
  lockDesc: {
    fontSize: 12.5,
    color: color.ink2,
    lineHeight: 17.5,
  },
  dialWell: {
    marginTop: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
  },
  vitalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: color.lineSoft,
  },
  vitalCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  vitalDivider: {
    width: 1,
    height: 24,
    backgroundColor: color.lineSoft,
  },
  vitalK: {
    fontSize: 10.5,
    color: color.muted,
    fontWeight: '500',
  },
  vitalV: {
    fontSize: 13.5,
    fontWeight: '600',
    color: color.ink,
  },
  stimWell: {
    marginTop: 12,
    gap: 10,
    borderColor: color.lineStrong,
  },
  stimHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stimTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stimTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: color.ink,
  },
  stimSite: {
    fontSize: 11.5,
    fontWeight: '600',
    color: color.accent,
  },
  dosageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: color.lineSoft,
  },
  dosageItem: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: 1,
  },
  dosageK: {
    fontSize: 11,
    color: color.muted,
  },
  dosageV: {
    fontSize: 14.5,
    fontWeight: '600',
    color: color.ink,
  },
  dosageNote: {
    fontSize: 10.5,
    color: color.faint,
    marginTop: 3,
  },
  standbyWell: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 11,
  },
  standbyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
  },
  standbyTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: color.ink,
  },
  standbySub: {
    fontSize: 11,
    color: color.muted,
    marginTop: 1,
  },
  standbyCapLabel: {
    fontSize: 10,
    color: color.faint,
    fontWeight: '500',
  },
  standbyCap: {
    fontSize: 11,
    color: color.ink2,
    fontWeight: '600',
    marginTop: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cardLabel: {
    fontSize: 14.5,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: color.ink,
  },
  cardMeta: {
    fontSize: 11.5,
    color: color.muted,
    fontWeight: '500',
  },
});
