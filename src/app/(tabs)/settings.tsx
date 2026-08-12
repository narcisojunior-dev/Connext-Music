import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { PlaceholderScreen } from '@/components/ui/placeholder-screen';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <PlaceholderScreen
        title="Ajustes"
        description="Crossfade, sleep timer, gerenciamento da biblioteca e informações do app."
        icon="settings-outline"
        issue="Issue #18"
      />
      <View style={styles.actions}>
        <Button title="Estatísticas" onPress={() => router.push('/stats')} />
        <Button
          title="Design System"
          variant="ghost"
          onPress={() => router.push('/design-system')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actions: {
    gap: 8,
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 110,
  },
});
