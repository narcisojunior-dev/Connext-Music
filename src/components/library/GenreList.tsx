import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Box } from '@/components/ui/box';
import { useContentBottomInset } from '@/hooks/use-content-inset';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import type { GenreGroup } from '@/utils/library-helpers';
import { formatTotalDuration } from '@/utils/formatters';

/**
 * Gera uma cor a partir do nome do gênero.
 */
function genreColor(genre: string): string {
  let hash = 0;
  for (let i = 0; i < genre.length; i++) {
    hash = genre.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 50%, 35%)`;
}

export interface GenreListProps {
  genres: GenreGroup[];
  refreshing: boolean;
  onRefresh: () => void;
  /** Chamado ao tocar um gênero. A tela pode reproduzir todas as faixas do gênero. */
  onGenrePress: (genre: GenreGroup) => void;
  header?: React.ReactNode;
}

const ITEM_HEIGHT = 64;

function GenreRow({ genre, onPress }: { genre: GenreGroup; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${genre.name}, ${genre.trackCount} músicas`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderRadius: theme.radius.card },
        pressed && { backgroundColor: theme.colors.surface },
      ]}
    >
      <View
        style={[
          styles.icon,
          { backgroundColor: genreColor(genre.name), borderRadius: theme.radius.card },
        ]}
      >
        <Ionicons name="musical-notes" size={20} color="rgba(255,255,255,0.7)" />
      </View>
      <View style={styles.textBlock}>
        <Text variant="title" color="textPrimary" numberOfLines={1}>
          {genre.name}
        </Text>
        <Text variant="caption" color="textSecondary">
          {genre.trackCount} {genre.trackCount === 1 ? 'música' : 'músicas'} ·{' '}
          {formatTotalDuration(genre.totalDuration)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
    </Pressable>
  );
}

/**
 * Lista de gêneros com contagem de faixas e duração total.
 *
 * Ordenada por contagem decrescente (gêneros mais populares no topo).
 */
export function GenreList({ genres, refreshing, onRefresh, onGenrePress, header }: GenreListProps) {
  const bottomInset = useContentBottomInset();
  const renderItem = useCallback(
    ({ item }: { item: GenreGroup }) => (
      <GenreRow genre={item} onPress={() => onGenrePress(item)} />
    ),
    [onGenrePress],
  );

  const keyExtractor = useCallback((item: GenreGroup) => item.id, []);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const listHeader = useMemo(
    () => (
      <Box gap="sm" style={styles.listHeader}>
        <Text variant="caption" color="textSecondary">
          {genres.length} {genres.length === 1 ? 'gênero' : 'gêneros'}
        </Text>
        {header}
      </Box>
    ),
    [genres.length, header],
  );

  const listEmpty = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Text variant="body" color="textMuted" style={styles.emptyText}>
          Nenhum gênero encontrado.
        </Text>
      </View>
    ),
    [],
  );

  return (
    <FlatList
      data={genres}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      contentContainerStyle={[styles.list, { paddingBottom: bottomInset }]}
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
    height: ITEM_HEIGHT,
  },
  icon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  emptyContainer: {
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});
