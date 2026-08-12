import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { PlaceholderScreen } from '@/components/ui/placeholder-screen';

export default function PlaylistsScreen() {
  return (
    <View style={styles.container}>
      <PlaceholderScreen
        title="Playlists"
        description="Crie playlists, reordene faixas e toque tudo em sequência."
        icon="list-outline"
        issue="Issue #14"
      />
      {/* Ponto de entrada temporario para validar a rota dinamica (Issue #3). */}
      <View style={styles.actions}>
        <Button
          title="Abrir playlist de exemplo"
          variant="secondary"
          onPress={() => router.push('/playlist/exemplo')}
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
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 110,
  },
});
