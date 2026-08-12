import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo } from 'react';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';

import { TrackItem } from '@/components/library/TrackItem';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import type { Artist } from '@/types/artist';
import type { Track } from '@/types/track';
import { formatTotalDuration } from '@/utils/formatters';

export interface ArtistSectionProps {
  artists: Artist[];
  currentTrackId: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  onTrackPress: (track: Track, allTracks: Track[], indexInAll: number) => void;
  header?: React.ReactNode;
}

type Section = { title: string; trackCount: number; totalDuration: number; data: Track[] };

/**
 * SectionList agrupada por artista.
 *
 * Cada seção tem um header com o nome do artista, contagem de faixas e duração
 * total. As faixas dentro de cada seção são listadas normalmente com `TrackItem`.
 */
export function ArtistSection({
  artists,
  currentTrackId,
  refreshing,
  onRefresh,
  onTrackPress,
  header,
}: ArtistSectionProps) {
  const theme = useTheme();

  const sections: Section[] = useMemo(
    () =>
      artists.map((artist) => ({
        title: artist.name,
        trackCount: artist.tracks.length,
        totalDuration: artist.totalDuration,
        data: artist.tracks,
      })),
    [artists],
  );

  const allTracks = useMemo(() => artists.flatMap((a) => a.tracks), [artists]);

  const renderItem = useCallback(
    ({ item }: { item: Track }) => {
      const indexInAll = allTracks.indexOf(item);
      return (
        <TrackItem
          track={item}
          isActive={item.id === currentTrackId}
          onPress={() => onTrackPress(item, allTracks, indexInAll)}
        />
      );
    },
    [allTracks, currentTrackId, onTrackPress],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => (
      <Box
        background="background"
        paddingHorizontal="lg"
        paddingVertical="sm"
        style={styles.sectionHeader}
      >
        <View style={styles.sectionTitle}>
          <Ionicons name="person" size={16} color={theme.colors.primary} />
          <Text variant="title" color="textPrimary">
            {section.title}
          </Text>
        </View>
        <Text variant="overline" color="textMuted">
          {section.trackCount} {section.trackCount === 1 ? 'música' : 'músicas'} ·{' '}
          {formatTotalDuration(section.totalDuration)}
        </Text>
      </Box>
    ),
    [theme.colors.primary],
  );

  const listHeader = useMemo(
    () => (
      <Box gap="sm" style={styles.listHeader}>
        <Text variant="caption" color="textSecondary">
          {artists.length} {artists.length === 1 ? 'artista' : 'artistas'}
        </Text>
        {header}
      </Box>
    ),
    [artists.length, header],
  );

  const listEmpty = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Text variant="body" color="textMuted" style={styles.emptyText}>
          Nenhum artista encontrado.
        </Text>
      </View>
    ),
    [],
  );

  return (
    <SectionList
      sections={sections}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled
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
    paddingBottom: 120,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30, 41, 59, 0.5)',
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyContainer: {
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});
