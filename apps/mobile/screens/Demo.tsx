import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { IconCheck, IconPlay } from '../components/Icons';
import { ActionButton, SectionHeader, StageCard, StatusPill } from '../components/ui';
import { splitScenarioTitle, type LiveInjection } from '../lib/api';
import { useStore } from '../lib/store';
import { color, radius, space, tabular } from '../lib/theme';

const SPEEDS = [1, 5, 10, 25] as const;

const LIVE_TRIGGERS: {
  key: LiveInjection;
  label: string;
  hint: string;
  tone: 'accent' | 'danger' | 'neutral';
}[] = [
  { key: 'seizure', label: 'Trigger seizure', hint: '18 Hz EEG + clonic', tone: 'accent' },
  { key: 'hr_drop', label: 'HR drop', hint: '36 bpm lock', tone: 'danger' },
  { key: 'fall', label: 'Simulate fall', hint: 'Impact + still', tone: 'danger' },
  { key: 'chewing', label: 'Chewing artefact', hint: 'Rejected by DSP', tone: 'neutral' },
  { key: 'electrode_off', label: 'Electrode off', hint: '250 kΩ hold', tone: 'neutral' },
  { key: 'drop_link', label: 'Drop link', hint: 'Enter safe mode', tone: 'danger' },
  { key: 'normal', label: 'Reset normal', hint: 'Calm baseline', tone: 'neutral' },
];

export default function Demo() {
  const {
    tel,
    connected,
    linkKnown,
    scenarios,
    results,
    runningResults,
    speed,
    actionMsg,
    setSpeed,
    injectLive,
    startLive,
    playScenario,
    runAllResults,
    refreshScenarios,
  } = useStore();

  useEffect(() => {
    if (scenarios.length === 0) refreshScenarios();
  }, [scenarios.length, refreshScenarios]);

  const down = linkKnown && !connected;
  const activeInj = new Set(tel?.injections ?? []);
  const passed = results?.filter((r) => r.pass).length ?? 0;
  const total = results?.length ?? 0;
  const resultMap = new Map(results?.map((r) => [r.key, r.pass]) ?? []);

  return (
    <View>
      {actionMsg ? (
        <View style={s.errBanner}>
          <Text style={s.errText}>{actionMsg}</Text>
        </View>
      ) : null}

      {/* Interactive Live Patient Simulator */}
      <StageCard>
        <SectionHeader
          title="Live patient simulator"
          subtitle={
            tel?.live_mode
              ? 'Continuous baseline active — inject events live to test safety gates'
              : tel?.scenario
                ? `Replaying scenario: ${tel.scenario.replace(/_/g, ' ')}`
                : 'Inject synthetic biosignal events in real time'
          }
          right={
            tel && !tel.live_mode ? (
              <ActionButton
                label="Return live"
                variant="secondary"
                compact
                disabled={down}
                onPress={startLive}
              />
            ) : (
              <StatusPill label="Live mode" tone="ok" />
            )
          }
        />

        <View style={s.triggerGrid}>
          {LIVE_TRIGGERS.map((tr) => {
            const active = activeInj.has(tr.key);
            return (
              <Pressable
                key={tr.key}
                disabled={down}
                onPress={() => injectLive(tr.key)}
                style={({ pressed }) => [
                  s.triggerBtn,
                  tr.tone === 'accent' && s.triggerAccent,
                  active && tr.tone === 'accent' && s.triggerAccentActive,
                  active && tr.tone === 'danger' && s.triggerDangerActive,
                  active && tr.tone === 'neutral' && s.triggerNeutralActive,
                  down && { opacity: 0.4 },
                  pressed && !down && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={[
                    s.trLabel,
                    tr.tone === 'accent' && { color: color.accent },
                    active && tr.tone === 'danger' && { color: color.red },
                    active && tr.tone === 'neutral' && { color: color.amber },
                  ]}
                  numberOfLines={1}
                >
                  {tr.label}
                </Text>
                <Text style={[s.trHint, active && { color: color.ink2, fontWeight: '500' }]}>
                  {active ? 'Active now' : tr.hint}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </StageCard>

      {/* Automated Verification Suite */}
      <StageCard>
        <SectionHeader
          title="Verification suite"
          subtitle="Scripted clinical and safety boundary tests"
        />

        {/* Speed Selector + Verify All 9 CTA */}
        <View style={s.controlsBar}>
          <View style={s.speedGroup}>
            {SPEEDS.map((sp) => {
              const on = speed === sp;
              return (
                <Pressable
                  key={sp}
                  onPress={() => setSpeed(sp)}
                  style={[s.speedOpt, on && s.speedOptOn]}
                >
                  <Text style={[s.speedText, tabular, on && s.speedTextOn]}>{sp}×</Text>
                </Pressable>
              );
            })}
          </View>

          <ActionButton
            label={runningResults ? 'Verifying…' : 'Verify all 9'}
            variant="primary"
            compact
            disabled={runningResults || down}
            onPress={runAllResults}
          />
        </View>

        {/* Pass/Fail Summary Banner */}
        {results && total > 0 && (
          <View
            style={[
              s.scoreBanner,
              passed !== total && { backgroundColor: color.redSoft, borderColor: color.redLine },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  s.scoreTitle,
                  passed !== total && { color: color.red },
                ]}
              >
                {passed} of {total} scenarios passed
              </Text>
              <Text style={s.scoreSub}>
                Seizure detection and safety interlock rules verified
              </Text>
            </View>
            <Text
              style={[
                s.scorePct,
                tabular,
                passed !== total && { color: color.red },
              ]}
            >
              {Math.round((passed / total) * 100)}%
            </Text>
          </View>
        )}

        {/* Scenario Cards */}
        <View style={s.scnList}>
          {scenarios.map((sc) => {
            const on = !tel?.live_mode && tel?.scenario === sc.key && !tel?.done;
            const [cond, expected] = splitScenarioTitle(sc.title);
            const passState = resultMap.get(sc.key);

            return (
              <Pressable
                key={sc.key}
                disabled={down}
                onPress={() => playScenario(sc.key)}
                style={({ pressed }) => [
                  s.scnCard,
                  on && s.scnCardOn,
                  down && { opacity: 0.45 },
                  pressed && !down && { backgroundColor: color.stageHover },
                ]}
              >
                <View style={s.scnTop}>
                  <View style={s.scnStatusRow}>
                    <IconPlay size={11} stroke={on ? color.accent : color.faint} />
                    <Text style={[s.scnStatus, on && { color: color.accent, fontWeight: '600' }]}>
                      {on ? 'Playing' : 'Replay'}
                    </Text>
                  </View>

                  {passState === true && (
                    <View style={s.passBadge}>
                      <IconCheck size={12} stroke={color.green} />
                      <Text style={s.passText}>Passed</Text>
                    </View>
                  )}
                  {passState === false && <Text style={s.failText}>Failed</Text>}
                </View>

                <Text style={s.scnName}>{cond}</Text>
                {expected ? <Text style={s.scnExpect}>{expected}</Text> : null}
              </Pressable>
            );
          })}

          {scenarios.length === 0 && (
            <Text style={s.emptyText}>No verification scenarios loaded.</Text>
          )}
        </View>
      </StageCard>
    </View>
  );
}

const s = StyleSheet.create({
  errBanner: {
    backgroundColor: color.redSoft,
    borderWidth: 1,
    borderColor: color.redLine,
    borderRadius: radius.tile,
    padding: 12,
    marginBottom: space.md,
  },
  errText: {
    fontSize: 12.5,
    color: color.red,
    lineHeight: 17,
  },
  triggerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  triggerBtn: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: color.stage2,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.tile,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 2,
  },
  triggerAccent: {
    borderColor: color.accentLine,
  },
  triggerAccentActive: {
    backgroundColor: color.accentSoft,
    borderColor: color.accent,
  },
  triggerDangerActive: {
    backgroundColor: color.redSoft,
    borderColor: color.red,
  },
  triggerNeutralActive: {
    backgroundColor: color.amberSoft,
    borderColor: color.amber,
  },
  trLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: color.ink,
  },
  trHint: {
    fontSize: 11.5,
    color: color.muted,
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  speedGroup: {
    flexDirection: 'row',
    backgroundColor: color.track,
    borderWidth: 1,
    borderColor: color.lineSoft,
    borderRadius: radius.btn,
    padding: 2,
    gap: 2,
  },
  speedOpt: {
    height: 29,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedOptOn: {
    backgroundColor: color.stage3,
  },
  speedText: {
    fontSize: 12,
    color: color.muted,
    fontWeight: '500',
  },
  speedTextOn: {
    color: color.ink,
    fontWeight: '600',
  },
  scoreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: color.greenSoft,
    borderWidth: 1,
    borderColor: color.greenLine,
    borderRadius: radius.tile,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 12,
  },
  scoreTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: color.green,
  },
  scoreSub: {
    fontSize: 11.5,
    color: color.ink2,
    marginTop: 1,
  },
  scorePct: {
    fontSize: 20,
    fontWeight: '700',
    color: color.green,
  },
  scnList: {
    gap: 8,
  },
  scnCard: {
    backgroundColor: color.stage2,
    borderWidth: 1,
    borderColor: color.lineSoft,
    borderRadius: radius.tile,
    paddingHorizontal: 13,
    paddingVertical: 11,
    gap: 4,
  },
  scnCardOn: {
    backgroundColor: color.stage3,
    borderColor: color.lineStrong,
    borderLeftWidth: 2.5,
    borderLeftColor: color.accent,
  },
  scnTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  scnStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  scnStatus: {
    fontSize: 11.5,
    fontWeight: '500',
    color: color.faint,
  },
  passBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  passText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: color.green,
  },
  failText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: color.red,
  },
  scnName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: color.ink,
    lineHeight: 18,
  },
  scnExpect: {
    fontSize: 12,
    color: color.muted,
    lineHeight: 17,
  },
  emptyText: {
    fontSize: 13,
    color: color.muted,
    paddingVertical: 12,
  },
});
