import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { PlaylistFormModal } from '@/components/playlist/PlaylistFormModal';
import { PlaylistMosaic } from '@/components/playlist/PlaylistMosaic';
import { Box } from '@/components/ui/box';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { useContentBottomInset } from '@/hooks/use-content-inset';
import { useTheme } from '@/hooks/use-theme';
import { useLibraryStore } from '@/stores/library-store';
import { usePlaylistStore } from '@/stores/playlist-store';
import type { Playlist } from '@/types/playlist';
import type { Track } from '@/types/track';
import { formatTotalDuration } from '@/utils/formatters';

const MOSAIC_SIZE = 64;

export default function PlaylistsScreen() {
  const theme = useTheme();
  const bottomInset = useContentBottomInset();

  const playlists = usePlaylistStore((s) => s.playlists);
  const createPlaylist = usePlaylistStore((s) => s.createPlaylist);
  const tracks = useLibraryStore((s) => s.tracks);

  const [creating, setCreating] = useState(false);

  // Índice por id: resolver `trackIds` varrendo o array a cada playlist seria
  // O(playlists × faixas) numa tela que só quer mostrar quatro capas.
  const byId = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);

  const resolve = useCallback(
    (playlist: Playlist): Track[] =>
      playlist.trackIds.map((id) => byId.get(id)).filter((t): t is Track => !!t),
    [byId],
  );

  const handleCreate = useCallback(
    (name: string, description: string) => {
      const playlist = createPlaylist(name, description || undefined);
      setCreating(false);
      router.push(`/playlist/${playlist.id}`);
    },
    [createPlaylist],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: bottomInset }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="caption" color="textSecondary">
              {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'}
            </Text>
            <IconButton
              name="add"
              accessibilityLabel="Criar playlist"
              size="sm"
              background="primary"
              onPress={() => setCreating(true)}
            />
          </View>
        }
        ListEmptyComponent={
          <Box gap="md" style={styles.empty}>
            <Ionicons name="list-outline" size={48} color={theme.colors.textMuted} />
            <Text variant="body" color="textMuted" style={styles.center}>
              Nenhuma playlist ainda.{'\n'}Toque em + para criar a primeira.
            </Text>
          </Box>
        }
        renderItem={({ item }) => {
          const playlistTracks = resolve(item);
          const duration = playlistTracks.reduce((n, t) => n + t.duration, 0);

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Playlist ${item.name}`}
              onPress={() => router.push(`/playlist/${item.id}`)}
              style={({ pressed }) => [
                styles.row,
                { borderRadius: theme.radius.card },
                pressed && { backgroundColor: theme.colors.surface },
              ]}
            >
              <PlaylistMosaic tracks={playlistTracks} size={MOSAIC_SIZE} />
              <View style={styles.rowText}>
                <Text variant="title" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text variant="caption" color="textSecondary" numberOfLines={1}>
                  {item.trackIds.length} {item.trackIds.length === 1 ? 'faixa' : 'faixas'}
                  {duration > 0 ? ` · ${formatTotalDuration(duration)}` : ''}
                </Text>
                {item.description ? (
                  <Text variant="overline" color="textMuted" numberOfLines={1}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </Pressable>
          );
        }}
      />

      <PlaylistFormModal
        visible={creating}
        onSubmit={handleCreate}
        onCancel={() => setCreating(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  center: {
    textAlign: 'center',
  },
});
