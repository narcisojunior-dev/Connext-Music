import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { PlaceholderScreen } from '@/components/ui/placeholder-screen';

export default function LibraryScreen() {
  return (
    <View style={styles.container}>
      <PlaceholderScreen
        title="Biblioteca"
        description="Suas músicas aparecem aqui. Puxe para baixo para escanear a pasta Documents do app."
        icon="musical-notes-outline"
        issue="Issue #10"
      />
      {/* Ponto de entrada temporario para validar a navegacao do modal (Issue #3). */}
      <View style={styles.actions}>
        <Button title="Abrir player" variant="secondary" onPress={() => router.push('/player')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actions: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 110,
  },
});
