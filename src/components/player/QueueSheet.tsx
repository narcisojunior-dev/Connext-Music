import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';

import { trackColor } from '@/components/player/NowPlayingArtwork';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import {
  clearQueue,
  moveQueueItem,
  playQueue,
  removeFromQueue,
} from '@/services/player/queue-manager';
import { usePlayerStore } from '@/stores/player-store';
import type { Track } from '@/types/track';
import { formatDuration } from '@/utils/formatters';
import { hapticControl, hapticLongPress } from '@/utils/haptics';

const ROW_HEIGHT = 60;

export interface QueueSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Fila de reprodução, aberta a partir do player.
 *
 * É um modal sobre o player, e não uma rota: sair daqui tem que devolver
 * exatamente a tela de onde se veio, e a fila é uma consulta rápida — empilhar
 * mais uma rota faria o botão de voltar do player passar por ela.
 *
 * A ordem é editável por arrasto porque a fila **é** a ordem; sem isso o único
 * jeito de adiantar uma faixa seria pulando até ela.
 */
export function QueueSheet({ visible, onClose }: QueueSheetProps) {
  const theme = useTheme();

  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id ?? null);

  const handleDragEnd = useCallback(({ from, to }: { from: number; to: number }) => {
    if (from === to) return;
    void moveQueueItem(from, to);
  }, []);

  const renderItem = useCallback(
    ({ item, getIndex, drag, isActive }: RenderItemParams<Track>) => {
      const index = getIndex() ?? 0;
      const isCurrent = item.id === currentTrackId;
      // Faixas já tocadas ficam esmaecidas: a fila mostra a ordem inteira, e
      // sem essa distinção não dá para saber o que ainda vem.
      const played = index < currentIndex;

      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.title}, ${item.artist}`}
          accessibilityState={{ selected: isCurrent }}
          onPress={() => {
            hapticControl();
            void playQueue(queue, index);
          }}
          onLongPress={() => {
            hapticLongPress();
            drag();
          }}
          disabled={isActive}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: isActive
                ? theme.colors.surfaceElevated
                : pressed
                  ? theme.colors.surface
                  : 'transparent',
              borderRadius: theme.radius.card,
            },
          ]}
        >
          {item.artwork ? null : (
            <View
              style={[
                styles.thumb,
                { backgroundColor: trackColor(item.id), borderRadius: theme.radius.card },
              ]}
            />
          )}

          <View style={styles.text}>
            <Text
              variant="caption"
              color={isCurrent ? 'primary' : played ? 'textMuted' : 'textPrimary'}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text variant="overline" color="textMuted" numberOfLines={1}>
              {item.artist}
            </Text>
          </View>

          {isCurrent ? (
            <Ionicons name="volume-medium" size={16} color={theme.colors.primary} />
          ) : (
            <Text variant="overline" color="textMuted">
              {formatDuration(item.duration)}
            </Text>
          )}

          {/* A faixa tocando não pode ser removida daqui: tirá-la exigiria
              decidir o que tocar em seguida, e essa é a função dos botões de
              pular, não da lista. */}
          {isCurrent ? (
            <View style={styles.removeSlot} />
          ) : (
            <IconButton
              name="close"
              accessibilityLabel={`Remover ${item.title} da fila`}
              size="sm"
              onPress={() => void removeFromQueue(index)}
            />
          )}
        </Pressable>
      );
    },
    [queue, currentIndex, currentTrackId, theme],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar fila">
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.background,
              borderTopLeftRadius: theme.radius.modal,
              borderTopRightRadius: theme.radius.modal,
            },
          ]}
        >
          <View style={styles.header}>
            <View>
              <Text variant="title">Fila</Text>
              <Text variant="overline" color="textMuted">
                {queue.length} {queue.length === 1 ? 'faixa' : 'faixas'} · segure para reordenar
              </Text>
            </View>
            <View style={styles.headerActions}>
              <IconButton
                name="trash-outline"
                accessibilityLabel="Limpar fila"
                size="sm"
                onPress={() => {
                  void clearQueue();
                  onClose();
                }}
              />
              <IconButton name="chevron-down" accessibilityLabel="Fechar" onPress={onClose} />
            </View>
          </View>

          <DraggableFlatList
            data={queue}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={renderItem}
            onDragEnd={handleDragEnd}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text variant="caption" color="textMuted" style={styles.empty}>
                A fila está vazia.
              </Text>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    // Não ocupa a tela inteira: a faixa e a capa continuam visíveis por cima,
    // o que deixa claro que a fila é uma camada sobre o player.
    maxHeight: '75%',
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 32,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
  },
  thumb: {
    width: 36,
    height: 36,
  },
  text: {
    flex: 1,
    gap: 1,
  },
  removeSlot: {
    // Mesma largura do botão de remover, para as linhas não dançarem quando a
    // faixa atual muda.
    width: 32,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: 32,
  },
});
