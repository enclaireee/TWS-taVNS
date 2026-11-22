import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Btn, Card, Section } from '../components/ui';
import { getScenarios, Scenario, startScenario } from '../lib/api';
import { useStore } from '../lib/store';
import { color } from '../lib/theme';

export default function Demo() {
  const baseUrl = useStore((s) => s.baseUrl);
  const [list, setList] = useState<Scenario[]>([]);
  const [err, setErr] = useState(false);
  useEffect(() => { getScenarios(baseUrl).then((l) => { setList(l); setErr(false); }).catch(() => setErr(true)); }, [baseUrl]);
  return (
    <View>
      <Section n={1} title="Scenarios (10x)" />
      {err && <Text style={{ color: color.danger }}>Cannot reach core</Text>}
      {list.map((sc) => (
        <Card key={sc.key} style={{ padding: 12 }}>
          <Text style={{ color: color.ink, marginBottom: 8, fontWeight: '600' }}>{sc.title}</Text>
          <Btn label="Play" onPress={() => { startScenario(baseUrl, sc.key, 10).catch(() => setErr(true)); }} />
        </Card>
      ))}
    </View>
  );
}
