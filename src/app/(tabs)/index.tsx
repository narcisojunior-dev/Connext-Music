import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { PlaceholderScreen } from '@/components/ui/placeholder-screen';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useLibraryStore } from '@/stores/library-store';
import { usePlayerStore } from '@/stores/player-store';
import type { Track } from '@/types/track';
import { createMockTracks } from '@/utils/mock-tracks';

/** mm:ss. A versao definitiva vira em `utils/formatters.ts` na Issue #5. */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function TrackRow({ track, index }: { track: Track; index: number }) {
  const theme = useTheme();
  const tracks = useLibraryStore((s) => s.tracks);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const registerPlay = useLibraryStore((s) => s.registerPlay);
  const isCurrent = usePlayerStore((s) => s.currentTrack?.id === track.id);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        setQueue(tracks, index);
        setIsPlaying(true);
        registerPlay(track.id);
        router.push('/player');
      }}
      style={({ pressed }) => [
        styles.row,
        { borderRadius: theme.radius.card },
        pressed && { backgroundColor: theme.colors.surface },
      ]}
    >
      <View
        style={[
          styles.thumb,
          { backgroundColor: theme.colors.surface, borderRadius: theme.radius.card },
        ]}
      />
      <View style={styles.rowText}>
        <Text variant="title" color={isCurrent ? 'primary' : 'textPrimary'} numberOfLines={1}>
          {track.title}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {track.artist} · {track.album}
        </Text>
      </View>
      <Text variant="overline" color="textMuted">
        {formatDuration(track.duration)}
      </Text>
    </Pressable>
  );
}

export default function LibraryScreen() {
  const tracks = useLibraryStore((s) => s.tracks);
  const setLibrary = useLibraryStore((s) => s.setLibrary);

  if (tracks.length === 0) {
    return (
      <View style={styles.container}>
        <PlaceholderScreen
          title="Biblioteca"
          description="Suas músicas aparecem aqui. Puxe para baixo para escanear a pasta Documents do app."
          icon="musical-notes-outline"
          issue="Issue #10"
        />
        {/* Semeia os stores enquanto o scanner nao existe (Issue #5). */}
        <View style={styles.actions}>
          <Button
            title="Carregar dados de exemplo"
            variant="secondary"
            onPress={() => setLibrary(createMockTracks())}
          />
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={tracks}
      keyExtractor={(t) => t.id}
      renderItem={({ item, index }) => <TrackRow track={item} index={index} />}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <Box gap="xxs" style={styles.listHeader}>
          <Text variant="caption" color="textSecondary">
            {tracks.length} {tracks.length === 1 ? 'música' : 'músicas'}
          </Text>
        </Box>
      }
      ListFooterComponent={
        <Box paddingVertical="lg">
          <Button title="Limpar biblioteca" variant="ghost" onPress={() => setLibrary([])} />
        </Box>
      }
    />
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
  list: {
    paddingHorizontal: 16,
    // A tab bar flutua sobre o conteudo (position: absolute), entao o ultimo
    // item precisa deste respiro para nao ficar escondido atras dela.
    paddingBottom: 120,
  },
  listHeader: {
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  thumb: {
    width: 48,
    height: 48,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
