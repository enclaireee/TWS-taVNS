import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Btn, Card, Chip, Row, Section } from '../components/ui';
import { useStore } from '../lib/store';
import { color, radius } from '../lib/theme';

export default function Device() {
  const { baseUrl, setBaseUrl, connected } = useStore();
  const [url, setUrl] = useState(baseUrl);
  return (
    <View>
      <Section n={1} title="Core URL" />
      <Card>
        <TextInput
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          accessibilityLabel="Core URL"
          style={{ minHeight: 44, borderWidth: 1.5, borderColor: color.line, borderRadius: radius.chip, paddingHorizontal: 12, color: color.ink, marginBottom: 12 }}
        />
        <Btn label="Apply and reconnect" onPress={() => setBaseUrl(url)} />
      </Card>
      <Section n={2} title="Status" />
      <Card>
        <Chip label={connected ? 'CONNECTED' : 'DEVICE AUTONOMOUS'} bg={connected ? color.ok : color.warn} fg="#fff" />
        <Text style={{ height: 8 }} />
        <Row k="Mode" v={connected ? 'Connected' : 'Autonomous'} />
        <Row k="Contract version" v="1" />
      </Card>
    </View>
  );
}
