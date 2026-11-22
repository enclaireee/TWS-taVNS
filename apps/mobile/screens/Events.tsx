import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Card, Chip, Section } from '../components/ui';
import { EventItem, getEvents } from '../lib/api';
import { useStore } from '../lib/store';
import { color, font } from '../lib/theme';

const danger = ['abort', 'lock', 'safe_mode', 'reject'];

export default function Events() {
  const baseUrl = useStore((s) => s.baseUrl);
  const [ev, setEv] = useState<EventItem[]>([]);
  const [err, setErr] = useState(false);
  useEffect(() => {
    const load = () => getEvents(baseUrl).then((e) => { setEv(e); setErr(false); }).catch(() => setErr(true));
    load();
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, [baseUrl]);
  return (
    <View>
      <Section n={1} title="Timeline" />
      {err && <Text style={{ color: color.danger, marginBottom: 8 }}>Cannot reach core</Text>}
      {ev.length === 0 && <Card><Text style={{ color: color.muted }}>No events yet</Text></Card>}
      {[...ev].reverse().map((e, i) => (
        <Card key={i} style={{ padding: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Chip label={e.kind} bg={danger.includes(e.kind) ? color.dangerBg : color.purple100} fg={danger.includes(e.kind) ? color.danger : color.purple700} />
            <Text style={{ color: color.muted, fontSize: font.sm }}>{e.t.toFixed(1)} s</Text>
          </View>
          <Text style={{ color: color.ink, fontSize: font.md, marginTop: 6 }}>{e.detail}</Text>
        </Card>
      ))}
    </View>
  );
}
