import { useCallback, useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { TrackItem, TRACK_ITEM_HEIGHT } from '@/components/library/TrackItem';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import type { Track } from '@/types/track';

export interface TrackListProps {
  tracks: Track[];
  /** ID da faixa tocando agora (ou null). */
  currentTrackId: string | null;
  /** Pull-to-refresh ativo? */
  refreshing: boolean;
  /** Callback do pull-to-refresh. */
  onRefresh: () => void;
  /** Chamado ao tocar em uma faixa. Recebe a faixa e o índice original no array. */
  onTrackPress: (track: Track, index: number) => void;
  /** Chamado ao segurar uma faixa (long-press). */
  onTrackLongPress?: (track: Track) => void;
  /** Componente extra acima da lista (ex: ScanProgress). */
  header?: React.ReactNode;
  /** Texto do empty state. */
  emptyText?: string;
}

/**
 * FlatList otimizada para exibir faixas da biblioteca.
 *
 * Otimizações:
 * - `getItemLayout` fixo — evita medição dinâmica (60fps scroll com 1000+ items).
 * - `removeClippedSubviews` — libera memória de linhas fora da viewport.
 * - `maxToRenderPerBatch` — renderiza 15 itens por frame em vez do default 10.
 * - `windowSize` — mantém 7 "janelas" de itens em memória (default 21 pode ser demais).
 * - `keyExtractor` por id — evita remontagem desnecessária.
 */
export function TrackList({
  tracks,
  currentTrackId,
  refreshing,
  onRefresh,
  onTrackPress,
  onTrackLongPress,
  header,
  emptyText = 'Nenhuma música encontrada.\nPuxe para baixo para escanear.',
}: TrackListProps) {
  const renderItem = useCallback(
    ({ item, index }: { item: Track; index: number }) => (
      <TrackItem
        track={item}
        isActive={item.id === currentTrackId}
        onPress={() => onTrackPress(item, index)}
        onLongPress={onTrackLongPress ? () => onTrackLongPress(item) : undefined}
      />
    ),
    [currentTrackId, onTrackPress, onTrackLongPress],
  );

  const keyExtractor = useCallback((item: Track) => item.id, []);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: TRACK_ITEM_HEIGHT,
      offset: TRACK_ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const listHeader = useMemo(
    () => (
      <Box gap="sm" style={styles.listHeader}>
        <Text variant="caption" color="textSecondary">
          {tracks.length} {tracks.length === 1 ? 'música' : 'músicas'}
        </Text>
        {header}
      </Box>
    ),
    [tracks.length, header],
  );

  const listEmpty = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Text variant="body" color="textMuted" style={styles.emptyText}>
          {emptyText}
        </Text>
      </View>
    ),
    [emptyText],
  );

  return (
    <FlatList
      data={tracks}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      removeClippedSubviews
      maxToRenderPerBatch={15}
      windowSize={7}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#94A3B8" />
      }
      ListHeaderComponent={listHeader}
      ListEmptyComponent={listEmpty}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    // A tab bar flutua sobre o conteúdo (position: absolute), então o último
    // item precisa de padding para não ficar escondido atrás dela.
    paddingBottom: 120,
  },
  listHeader: {
    paddingVertical: 12,
  },
  emptyContainer: {
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});
