import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { deleteTrackArtwork, deleteTrackFile } from '@/services/file/library-maintenance';
import { addToQueue, stop } from '@/services/player/queue-manager';
import { useLibraryStore } from '@/stores/library-store';
import { usePlayerStore } from '@/stores/player-store';
import { usePlaylistStore } from '@/stores/playlist-store';
import type { Track } from '@/types/track';
import { formatDuration, formatFileSize } from '@/utils/formatters';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface TrackActionsSheetProps {
  /** Faixa alvo; `null` mantém a folha fechada. */
  track: Track | null;
  onClose: () => void;
}

function Row({
  icon,
  label,
  destructive,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderRadius: theme.radius.card },
        pressed && { backgroundColor: theme.colors.surfaceElevated },
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={destructive ? theme.colors.error : theme.colors.textSecondary}
      />
      <Text variant="body" color={destructive ? 'error' : 'textPrimary'}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Folha de ações do toque longo em uma faixa.
 *
 * Tem três telas internas — ações, escolha de playlist e detalhes — em vez de
 * empilhar modais. Modal sobre modal no iOS deixa a animação travada e o gesto
 * de fechar ambíguo.
 */
export function TrackActionsSheet({ track, onClose }: TrackActionsSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<'actions' | 'playlists' | 'details'>('actions');

  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
  const removeTrack = useLibraryStore((s) => s.removeTrack);
  const playlists = usePlaylistStore((s) => s.playlists);
  const addTrackToPlaylist = usePlaylistStore((s) => s.addTrackToPlaylist);
  const createPlaylist = usePlaylistStore((s) => s.createPlaylist);
  const purgeTrack = usePlaylistStore((s) => s.purgeTrack);

  const close = useCallback(() => {
    setView('actions');
    onClose();
  }, [onClose]);

  const handleShare = useCallback(async () => {
    if (!track) return;
    close();
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Indisponível', 'Compartilhamento não está disponível neste aparelho.');
        return;
      }
      await Sharing.shareAsync(track.url);
    } catch (error) {
      console.warn('[track] não foi possível compartilhar:', error);
    }
  }, [track, close]);

  const handleRemove = useCallback(() => {
    if (!track) return;
    Alert.alert(
      'Remover da biblioteca',
      `Tirar "${track.title}" da lista? O arquivo continua no aparelho e volta no próximo scan.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            // Também sai das playlists: deixá-lo lá criaria um id órfão que
            // some da tela sem explicação.
            purgeTrack(track.id);
            removeTrack(track.id);
            close();
          },
        },
      ],
    );
  }, [track, removeTrack, purgeTrack, close]);

  /**
   * Apaga o arquivo do aparelho.
   *
   * Dois passos de confirmacao, e nao um: e a unica acao do app que destroi
   * algo que o usuario nao tem como recuperar — o sandbox do iOS nao tem
   * lixeira. O primeiro alerta explica, o segundo pede a intencao de novo.
   */
  const handleDeleteFile = useCallback(() => {
    if (!track) return;

    const apagar = () => {
      const apagou = deleteTrackFile(track.url);

      if (!apagou) {
        Alert.alert(
          'Não foi possível apagar',
          'O arquivo pode estar em uso ou protegido. Ele continua na sua biblioteca.',
        );
        return;
      }

      // Parar antes de remover, se for a faixa tocando: o player seguiria com
      // um arquivo que nao existe mais, e o proximo comando falharia sem
      // explicacao na tela.
      if (usePlayerStore.getState().currentTrack?.id === track.id) {
        void stop();
      }

      deleteTrackArtwork(track.artwork);
      purgeTrack(track.id);
      removeTrack(track.id);
      close();
    };

    Alert.alert(
      'Apagar do aparelho',
      `"${track.title}" será apagada permanentemente do seu iPhone. Não dá para desfazer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Tem certeza?', 'O arquivo será apagado para sempre.', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Apagar mesmo assim', style: 'destructive', onPress: apagar },
            ]),
        },
      ],
    );
  }, [track, removeTrack, purgeTrack, close]);

  if (!track) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
        onPress={close}
      >
        {/* O toque no conteúdo não pode fechar a folha; só o toque no fundo. */}
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Box
            background="surface"
            padding="lg"
            gap="md"
            style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          >
            <View style={styles.handle} />

            <Box gap="xxs">
              <Text variant="title" numberOfLines={1}>
                {track.title}
              </Text>
              <Text variant="caption" color="textSecondary" numberOfLines={1}>
                {track.artist} · {track.album}
              </Text>
            </Box>

            {view === 'actions' && (
              <Box gap="xxs">
                <Row
                  icon="add-circle-outline"
                  label="Adicionar à fila"
                  onPress={() => {
                    void addToQueue(track);
                    close();
                  }}
                />
                <Row
                  icon="list-outline"
                  label="Adicionar à playlist"
                  onPress={() => setView('playlists')}
                />
                <Row
                  icon={track.isFavorite ? 'heart' : 'heart-outline'}
                  label={track.isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
                  onPress={() => {
                    toggleFavorite(track.id);
                    close();
                  }}
                />
                <Row
                  icon="information-circle-outline"
                  label="Ver detalhes"
                  onPress={() => setView('details')}
                />
                <Row
                  icon="share-outline"
                  label="Compartilhar arquivo"
                  onPress={() => void handleShare()}
                />
                <Row icon="eye-off-outline" label="Remover da biblioteca" onPress={handleRemove} />
                <Row
                  icon="trash-outline"
                  label="Apagar do aparelho"
                  destructive
                  onPress={handleDeleteFile}
                />
              </Box>
            )}

            {view === 'playlists' && (
              <Box gap="xxs">
                <Row
                  icon="add"
                  label="Nova playlist com esta faixa"
                  onPress={() => {
                    const playlist = createPlaylist(track.title);
                    addTrackToPlaylist(playlist.id, track.id);
                    close();
                  }}
                />
                {playlists.length === 0 ? (
                  <Text variant="caption" color="textMuted" style={styles.hint}>
                    Nenhuma playlist ainda.
                  </Text>
                ) : (
                  <ScrollView style={styles.playlistList}>
                    {playlists.map((playlist) => (
                      <Row
                        key={playlist.id}
                        icon={
                          playlist.trackIds.includes(track.id)
                            ? 'checkmark-circle'
                            : 'ellipse-outline'
                        }
                        label={playlist.name}
                        onPress={() => {
                          addTrackToPlaylist(playlist.id, track.id);
                          close();
                        }}
                      />
                    ))}
                  </ScrollView>
                )}
              </Box>
            )}

            {view === 'details' && (
              <Box gap="xs">
                {(
                  [
                    ['Título', track.title],
                    ['Artista', track.artist],
                    ['Álbum', track.album],
                    ['Gênero', track.genre || '—'],
                    ['Ano', track.year ? String(track.year) : '—'],
                    ['Faixa', track.trackNumber ? String(track.trackNumber) : '—'],
                    ['Duração', formatDuration(track.duration)],
                    ['Formato', track.extension],
                    ['Tamanho', formatFileSize(track.fileSize)],
                    ['Reproduções', String(track.playCount)],
                    ['Arquivo', track.fileName],
                  ] as const
                ).map(([label, value]) => (
                  <View key={label} style={styles.detailRow}>
                    <Text variant="caption" color="textMuted">
                      {label}
                    </Text>
                    <Text variant="caption" numberOfLines={1} style={styles.detailValue}>
                      {value}
                    </Text>
                  </View>
                ))}
              </Box>
            )}

            {view !== 'actions' && (
              <Row icon="chevron-back" label="Voltar" onPress={() => setView('actions')} />
            )}
          </Box>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  playlistList: {
    maxHeight: 220,
  },
  hint: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 3,
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
  },
});
