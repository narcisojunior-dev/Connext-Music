import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';

import { PlaylistFormModal } from '@/components/playlist/PlaylistFormModal';
import { PlaylistMosaic } from '@/components/playlist/PlaylistMosaic';
import { trackColor } from '@/components/player/NowPlayingArtwork';
import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { useContentBottomInset } from '@/hooks/use-content-inset';
import { usePlaylistTransfer } from '@/hooks/use-playlist-transfer';
import { useTheme } from '@/hooks/use-theme';
import { playQueue, toggleShuffle } from '@/services/player/queue-manager';
import { useLibraryStore } from '@/stores/library-store';
import { usePlayerStore } from '@/stores/player-store';
import { usePlaylistStore } from '@/stores/playlist-store';
import type { Track } from '@/types/track';
import { formatDuration, formatTotalDuration } from '@/utils/formatters';

const HEADER_MOSAIC = 160;

export default function PlaylistDetailScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const bottomInset = useContentBottomInset();
  const { id } = useLocalSearchParams<{ id: string }>();

  const playlist = usePlaylistStore((s) => s.playlists.find((p) => p.id === id));
  const renamePlaylist = usePlaylistStore((s) => s.renamePlaylist);
  const updateDescription = usePlaylistStore((s) => s.updateDescription);
  const deletePlaylist = usePlaylistStore((s) => s.deletePlaylist);
  const removeTrackFromPlaylist = usePlaylistStore((s) => s.removeTrackFromPlaylist);
  const reorderPlaylistTracks = usePlaylistStore((s) => s.reorderPlaylistTracks);

  const libraryTracks = useLibraryStore((s) => s.tracks);
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id ?? null);

  const { exportPlaylist } = usePlaylistTransfer();

  const [editing, setEditing] = useState(false);

  const byId = useMemo(() => new Map(libraryTracks.map((t) => [t.id, t])), [libraryTracks]);

  /**
   * Faixas da playlist, na ordem salva.
   *
   * IDs sem faixa correspondente são ignorados: o arquivo pode ter saído do
   * disco desde que foi adicionado, e a playlist não deve quebrar por isso.
   */
  const tracks = useMemo(
    () => (playlist?.trackIds ?? []).map((tid) => byId.get(tid)).filter((t): t is Track => !!t),
    [playlist?.trackIds, byId],
  );

  const totalDuration = tracks.reduce((n, t) => n + t.duration, 0);

  useLayoutEffect(() => {
    navigation.setOptions({ title: playlist?.name ?? 'Playlist' });
  }, [navigation, playlist?.name]);

  // A playlist pode ter sido excluída nesta tela; sair evita renderizar vazio.
  useEffect(() => {
    if (id && !playlist) router.back();
  }, [id, playlist]);

  const handlePlay = useCallback(
    (startIndex = 0) => {
      if (tracks.length === 0) return;
      router.push('/player');
      playQueue(tracks, startIndex).catch((error) =>
        console.warn('[playlist] não foi possível reproduzir:', error),
      );
    },
    [tracks],
  );

  const handleShuffle = useCallback(async () => {
    if (tracks.length === 0) return;
    router.push('/player');
    await playQueue(tracks, 0);
    // Liga o shuffle depois de a fila existir — antes disso não há o que embaralhar.
    if (!usePlayerStore.getState().shuffleMode) await toggleShuffle();
  }, [tracks]);

  const handleDelete = useCallback(() => {
    if (!playlist) return;
    Alert.alert(
      'Excluir playlist',
      `Excluir "${playlist.name}"? As músicas continuam na biblioteca.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            deletePlaylist(playlist.id);
            router.back();
          },
        },
      ],
    );
  }, [playlist, deletePlaylist]);

  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<Track>) => {
      const index = getIndex() ?? 0;
      return (
        <Pressable
          accessibilityRole="button"
          onPress={() => handlePlay(index)}
          onLongPress={drag}
          disabled={isActive}
          style={[
            styles.row,
            { borderRadius: theme.radius.card },
            isActive && { backgroundColor: theme.colors.surfaceElevated },
          ]}
        >
          <View
            style={[
              styles.thumb,
              { backgroundColor: trackColor(item.id), borderRadius: theme.radius.card },
            ]}
          />
          <View style={styles.rowText}>
            <Text
              variant="title"
              color={item.id === currentTrackId ? 'primary' : 'textPrimary'}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {item.artist} · {formatDuration(item.duration)}
            </Text>
          </View>

          <IconButton
            name="remove-circle-outline"
            accessibilityLabel={`Remover ${item.title} da playlist`}
            size="sm"
            color="textMuted"
            onPress={() => playlist && removeTrackFromPlaylist(playlist.id, index)}
          />
          {/* Alça de arraste: o toque longo em qualquer ponto da linha também
              inicia o arraste, mas a alça torna a ação descobrível. */}
          <Pressable onLongPress={drag} delayLongPress={120} hitSlop={8}>
            <Ionicons name="reorder-three" size={22} color={theme.colors.textMuted} />
          </Pressable>
        </Pressable>
      );
    },
    [theme, currentTrackId, handlePlay, playlist, removeTrackFromPlaylist],
  );

  if (!playlist) return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <DraggableFlatList
        data={tracks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={({ from, to }) => reorderPlaylistTracks(playlist.id, from, to)}
        contentContainerStyle={[styles.list, { paddingBottom: bottomInset }]}
        ListHeaderComponent={
          <Box gap="lg" style={styles.header}>
            <PlaylistMosaic tracks={tracks} size={HEADER_MOSAIC} />
            <Box gap="xs" style={styles.headerText}>
              <Text variant="heading" style={styles.center}>
                {playlist.name}
              </Text>
              {playlist.description ? (
                <Text variant="caption" color="textSecondary" style={styles.center}>
                  {playlist.description}
                </Text>
              ) : null}
              <Text variant="overline" color="textMuted">
                {tracks.length} {tracks.length === 1 ? 'faixa' : 'faixas'}
                {totalDuration > 0 ? ` · ${formatTotalDuration(totalDuration)}` : ''}
              </Text>
            </Box>

            <View style={styles.actions}>
              <Button
                title="Tocar tudo"
                onPress={() => handlePlay(0)}
                disabled={tracks.length === 0}
                style={styles.action}
              />
              <Button
                title="Aleatório"
                variant="secondary"
                onPress={() => void handleShuffle()}
                disabled={tracks.length === 0}
                style={styles.action}
              />
            </View>

            <View style={styles.secondaryActions}>
              <Button title="Editar" variant="ghost" onPress={() => setEditing(true)} />
              <Button
                title="Compartilhar"
                variant="ghost"
                onPress={() => playlist && void exportPlaylist(playlist)}
              />
              <Button title="Excluir" variant="ghost" onPress={handleDelete} />
            </View>
          </Box>
        }
        ListEmptyComponent={
          <Text variant="body" color="textMuted" style={styles.empty}>
            Playlist vazia. Adicione músicas segurando uma faixa na Biblioteca.
          </Text>
        }
      />

      <PlaylistFormModal
        visible={editing}
        initialName={playlist.name}
        initialDescription={playlist.description ?? ''}
        onSubmit={(name, description) => {
          renamePlaylist(playlist.id, name);
          updateDescription(playlist.id, description);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
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
    alignItems: 'center',
    paddingVertical: 16,
  },
  headerText: {
    alignItems: 'center',
  },
  center: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'stretch',
  },
  action: {
    flex: 1,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  thumb: {
    width: 44,
    height: 44,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  empty: {
    textAlign: 'center',
    paddingTop: 40,
  },
});
