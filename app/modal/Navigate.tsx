import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const LOCATIONS = [
  'Library',
  'Main Office',
  'Cafeteria',
  'Gym',
  'Auditorium',
];

export default function NavigateScreen() {
  const [listening, setListening] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  function startListening() {
  setListening(true);
  setResults([]); // clear previous results
}

function stopListening() {
  setListening(false);
  setResults(LOCATIONS); // simulate detected locations
}

  function selectLocation() {
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Navigate</ThemedText>

      <Pressable
  style={[styles.mic, listening && styles.active]}
  onPressIn={startListening}
  onPressOut={stopListening}
>
  <ThemedText>
    {listening ? 'Listening...' : 'Hold to Speak'}
  </ThemedText>
</Pressable>

      <FlatList
        data={results}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <Pressable style={styles.item} onPress={selectLocation}>
            <ThemedText>{item}</ThemedText>
          </Pressable>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  mic: {
    marginVertical: 20,
    padding: 20,
    borderRadius: 10,
    backgroundColor: '#ddd',
    alignItems: 'center',
  },
  active: {
    backgroundColor: '#ffcccc',
  },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
});
