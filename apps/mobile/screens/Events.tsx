import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SectionHeader, StageCard } from '../components/ui';
import { describeEvent, formatAgo, type EventKind } from '../lib/api';
import { useStore } from '../lib/store';
import { color, font, radius, space, tabular } from '../lib/theme';

const KINDS: EventKind[] = [
  'stim',
  'candidate',
  'lock',
  'reject',
  'abort',
  'unlock',
  'safe_mode',
  'state',
];

const LABELS: Record<EventKind, string> = {
  candidate: 'Candidate',
  stim: 'Stim',
  reject: 'Reject',
  abort: 'Abort',
  lock: 'Lock',
  unlock: 'Unlock',
  safe_mode: 'Safe mode',
  state: 'State',
};

const DANGER: EventKind[] = ['abort', 'lock', 'safe_mode', 'reject'];

function kindColor(kind: EventKind): string {
  if (DANGER.includes(kind)) return color.red;
  if (kind === 'stim' || kind === 'candidate') return color.accent;
  if (kind === 'unlock') return color.green;
  return color.muted;
}

export default function Events() {
  const { events, eventsErr, tel, refreshEvents } = useStore();
  const [filter, setFilter] = useState<EventKind | 'all'>('all');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    refreshEvents();
    const id = setInterval(refreshEvents, 1500);
    return () => clearInterval(id);
  }, [refreshEvents]);

  const now = Math.max(tel?.t ?? 0, ...events.map((e) => e.t));
  const counts: Partial<Record<EventKind, number>> = {};
  for (const e of events) counts[e.kind] = (counts[e.kind] ?? 0) + 1;

  const stimCount = counts.stim ?? 0;
  const safetyCount =
    (counts.lock ?? 0) + (counts.reject ?? 0) + (counts.abort ?? 0) + (counts.safe_mode ?? 0);

  const filtered = events
    .map((e, i) => ({ e, i }))
    .filter((r) => filter === 'all' || r.e.kind === filter)
    .reverse();

  const shown = showAll ? filtered : filtered.slice(0, 14);
  const filterOpts: Array<'all' | EventKind> = ['all', ...KINDS];

  return (
    <View>
      {/* Compact Audit Summary Strip */}
      <View style={s.summaryGrid}>
        <View style={s.sumCard}>
          <Text style={s.sumK}>Total events</Text>
          <Text style={[s.sumV, tabular]}>{events.length}</Text>
        </View>
        <View style={s.sumCard}>
          <Text style={s.sumK}>Stimulations</Text>
          <Text style={[s.sumV, tabular, stimCount > 0 && { color: color.accent }]}>
            {stimCount}
          </Text>
        </View>
        <View style={s.sumCard}>
          <Text style={s.sumK}>Safety actions</Text>
          <Text style={[s.sumV, tabular, safetyCount > 0 && { color: color.red }]}>
            {safetyCount}
          </Text>
        </View>
      </View>

      {/* Main Audit Log Stage */}
      <StageCard>
        <SectionHeader
          title="Event audit log"
          subtitle="Immutable closed-loop decisions and safety gate transitions"
          right={
            <Text style={[s.countTag, tabular]}>
              {filtered.length} shown
            </Text>
          }
        />

        {/* Horizontal Filter Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
          style={{ marginBottom: 12 }}
        >
          {filterOpts.map((k) => {
            const active = filter === k;
            const c = k === 'all' ? events.length : (counts[k] ?? 0);
            return (
              <Pressable
                key={k}
                onPress={() => setFilter(k)}
                style={[s.chip, active && s.chipActive]}
              >
                <Text style={[s.chipT, active && s.chipTActive]}>
                  {k === 'all' ? 'All' : LABELS[k]}
                </Text>
                {c > 0 && (
                  <Text style={[s.chipCount, tabular, active && s.chipCountActive]}>
                    {c}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {eventsErr && (
          <View style={s.errBox}>
            <Text style={s.errText}>Event feed unreachable — displaying cached log.</Text>
          </View>
        )}

        {shown.length === 0 ? (
          <View style={s.emptyWell}>
            <Text style={s.emptyTitle}>No matching events yet</Text>
            <Text style={s.emptySub}>
              Trigger a live physiological event or replay a verification scenario in the Demo tab.
            </Text>
          </View>
        ) : (
          <View style={s.logList}>
            {shown.map(({ e, i }, idx) => (
              <View
                key={`${e.t}-${e.kind}-${i}`}
                style={[s.logRow, idx === shown.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={s.logTop}>
                  <Text style={[s.logKind, { color: kindColor(e.kind) }]}>
                    {LABELS[e.kind] ?? e.kind}
                  </Text>
                  <View style={s.logTimes}>
                    <Text style={[s.logAgo, tabular]}>
                      {formatAgo(Math.max(0, now - e.t))}
                    </Text>
                    <Text style={[s.logSimT, tabular]}>t={e.t.toFixed(1)}s</Text>
                  </View>
                </View>
                <Text style={s.logBody}>{describeEvent(e, tel)}</Text>
              </View>
            ))}
          </View>
        )}

        {filtered.length > 14 && (
          <Pressable
            onPress={() => setShowAll((v) => !v)}
            style={({ pressed }) => [s.moreBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={s.moreText}>
              {showAll ? 'Show fewer events' : `View all ${filtered.length} events`}
            </Text>
          </Pressable>
        )}
      </StageCard>
    </View>
  );
}

const s = StyleSheet.create({
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: space.md,
  },
  sumCard: {
    flex: 1,
    backgroundColor: color.stage,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.panel,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 2,
  },
  sumK: {
    fontSize: 11,
    color: color.muted,
    fontWeight: '500',
  },
  sumV: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.6,
    color: color.ink,
  },
  countTag: {
    fontSize: 12,
    color: color.muted,
    fontWeight: '500',
  },
  filterRow: {
    gap: 6,
    paddingRight: 4,
  },
  chip: {
    height: 30,
    paddingHorizontal: 11,
    borderRadius: radius.chip,
    backgroundColor: color.stage2,
    borderWidth: 1,
    borderColor: color.lineSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chipActive: {
    backgroundColor: color.ink,
    borderColor: color.ink,
  },
  chipT: {
    fontSize: 12,
    fontWeight: '500',
    color: color.muted,
  },
  chipTActive: {
    color: color.bg,
    fontWeight: '600',
  },
  chipCount: {
    fontSize: 11,
    color: color.faint,
    fontWeight: '600',
  },
  chipCountActive: {
    color: 'rgba(7,7,9,0.65)',
  },
  errBox: {
    backgroundColor: color.redSoft,
    borderWidth: 1,
    borderColor: color.redLine,
    borderRadius: radius.tile,
    padding: 10,
    marginBottom: 10,
  },
  errText: {
    fontSize: 12.5,
    color: color.red,
  },
  emptyWell: {
    backgroundColor: color.well,
    borderWidth: 1,
    borderColor: color.lineSoft,
    borderRadius: radius.panel,
    padding: 20,
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: color.ink2,
  },
  emptySub: {
    fontSize: 12.5,
    color: color.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  logList: {
    backgroundColor: color.well,
    borderWidth: 1,
    borderColor: color.lineSoft,
    borderRadius: radius.panel,
    paddingHorizontal: 13,
  },
  logRow: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: color.lineSoft,
    gap: 3,
  },
  logTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  logKind: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  logTimes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logAgo: {
    fontSize: 11.5,
    color: color.muted,
  },
  logSimT: {
    fontSize: 11,
    color: color.faint,
  },
  logBody: {
    fontSize: 13,
    color: color.ink2,
    lineHeight: 18.5,
  },
  moreBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  moreText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: color.ink2,
  },
});
