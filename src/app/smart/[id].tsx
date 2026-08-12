import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { TrackList } from '@/components/library/TrackList';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { playQueue } from '@/services/player/queue-manager';
import { findSmartPlaylist } from '@/services/library/smart-playlists';
import { useLibraryStore } from '@/stores/library-store';
import { usePlayerStore } from '@/stores/player-store';
import type { Track } from '@/types/track';
import { formatTotalDuration } from '@/utils/formatters';

/**
 * Detalhe de uma lista automática.
 *
 * Rota separada de `/playlist/[id]` de propósito: aquela tela existe para
 * editar — renomear, arrastar para reordenar, remover faixa. Nada disso faz
 * sentido aqui, porque o conteúdo vem de uma regra, e ramificar a tela de
 * edição em "modo somente leitura" espalharia condicionais por ela inteira.
 */
export default function SmartPlaylistScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const tracks = useLibraryStore((s) => s.tracks);
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id ?? null);

  const playlist = useMemo(() => findSmartPlaylist(tracks, id ?? ''), [tracks, id]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: playlist?.name ?? 'Playlist' });
  }, [navigation, playlist?.name]);

  const handlePress = useCallback(
    (_track: Track, index: number) => {
      if (playlist) void playQueue(playlist.tracks, index);
    },
    [playlist],
  );

  if (!playlist) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="body" color="textMuted">
          Esta lista não existe.
        </Text>
      </View>
    );
  }

  const duration = playlist.tracks.reduce((n, t) => n + t.duration, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TrackList
        tracks={playlist.tracks}
        currentTrackId={currentTrackId}
        refreshing={false}
        onRefresh={() => {}}
        onTrackPress={handlePress}
        emptyText="Nenhuma faixa se encaixa nesta regra ainda."
        header={
          <View style={styles.header}>
            <Text variant="caption" color="textSecondary">
              {playlist.rule}
            </Text>
            <Text variant="overline" color="textMuted">
              {playlist.tracks.length} {playlist.tracks.length === 1 ? 'faixa' : 'faixas'}
              {duration > 0 ? ` · ${formatTotalDuration(duration)}` : ''}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 2,
  },
});
