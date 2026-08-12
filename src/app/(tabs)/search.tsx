import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { trackColor } from '@/components/player/NowPlayingArtwork';
import { HighlightedText } from '@/components/search/HighlightedText';
import { SearchBar } from '@/components/search/SearchBar';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { useContentBottomInset } from '@/hooks/use-content-inset';
import { useTheme } from '@/hooks/use-theme';
import { playQueue } from '@/services/player/queue-manager';
import {
  addSearchTerm,
  clearSearchHistory,
  loadSearchHistory,
  removeSearchTerm,
} from '@/services/storage/search-history';
import { useLibraryStore } from '@/stores/library-store';
import { usePlayerStore } from '@/stores/player-store';
import { formatDuration } from '@/utils/formatters';
import {
  buildSearchIndex,
  isEmptyResults,
  searchLibrary,
  type SearchFilter,
  type SearchSort,
} from '@/utils/search';

/** Espera antes de buscar, para não recalcular a cada tecla. */
const DEBOUNCE_MS = 300;

const FILTERS: { key: SearchFilter; label: string }[] = [
  { key: 'all', label: 'Tudo' },
  { key: 'tracks', label: 'Músicas' },
  { key: 'artists', label: 'Artistas' },
  { key: 'albums', label: 'Álbuns' },
  { key: 'genres', label: 'Gêneros' },
];

const SORTS: { key: SearchSort; label: string }[] = [
  { key: 'relevance', label: 'Relevância' },
  { key: 'alphabetical', label: 'A-Z' },
  { key: 'recent', label: 'Recente' },
];

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          borderRadius: theme.radius.pill,
          backgroundColor: active ? theme.colors.primary : theme.colors.surface,
        },
        pressed && !active && { backgroundColor: theme.colors.surfaceElevated },
      ]}
    >
      <Text variant="caption" color={active ? 'textPrimary' : 'textSecondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function SearchScreen() {
  const theme = useTheme();
  const bottomInset = useContentBottomInset();

  const tracks = useLibraryStore((s) => s.tracks);
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id ?? null);

  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [sort, setSort] = useState<SearchSort>('relevance');
  const [history, setHistory] = useState<string[]>([]);

  // O índice só é reconstruído quando a biblioteca muda — normalizar todas as
  // faixas a cada tecla seria o gargalo da tela.
  const index = useMemo(() => buildSearchIndex(tracks), [tracks]);

  const results = useMemo(
    () => searchLibrary(index, query, { filter, sort }),
    [index, query, filter, sort],
  );

  useEffect(() => {
    loadSearchHistory().then(setHistory);
  }, []);

  // Debounce: o termo digitado só vira busca depois da pausa.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(input), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  // Guarda no histórico só quando o usuário para de digitar em um termo com
  // resultado — salvar a cada tecla encheria a lista com prefixos inúteis.
  const lastSaved = useRef('');
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2 || term === lastSaved.current) return;
    if (isEmptyResults(results)) return;
    lastSaved.current = term;
    addSearchTerm(term).then(setHistory);
  }, [query, results]);

  const playTrackAt = useCallback(
    (index_: number, list = results.tracks) => {
      router.push('/player');
      playQueue(list, index_).catch((error) =>
        console.warn('[search] não foi possível reproduzir:', error),
      );
    },
    [results.tracks],
  );

  const showHistory = query.trim().length === 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <SearchBar value={input} onChangeText={setInput} />

        {!showHistory && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pills}
            >
              {FILTERS.map((f) => (
                <Pill
                  key={f.key}
                  label={f.label}
                  active={filter === f.key}
                  onPress={() => setFilter(f.key)}
                />
              ))}
            </ScrollView>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pills}
            >
              {SORTS.map((s) => (
                <Pill
                  key={s.key}
                  label={s.label}
                  active={sort === s.key}
                  onPress={() => setSort(s.key)}
                />
              ))}
            </ScrollView>
          </>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
        keyboardDismissMode="on-drag"
      >
        {showHistory ? (
          history.length > 0 ? (
            <Box gap="sm">
              <View style={styles.sectionHeader}>
                <Text variant="overline" color="textMuted">
                  BUSCAS RECENTES
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    clearSearchHistory().then(() => setHistory([]));
                  }}
                >
                  <Text variant="overline" color="secondary">
                    LIMPAR
                  </Text>
                </Pressable>
              </View>
              {history.map((term) => (
                <View key={term} style={styles.historyRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Buscar ${term}`}
                    onPress={() => setInput(term)}
                    style={styles.historyTerm}
                  >
                    <Ionicons name="time-outline" size={16} color={theme.colors.textMuted} />
                    <Text variant="body" numberOfLines={1}>
                      {term}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remover ${term} do histórico`}
                    hitSlop={8}
                    onPress={() => {
                      removeSearchTerm(term).then(setHistory);
                    }}
                  >
                    <Ionicons name="close" size={16} color={theme.colors.textMuted} />
                  </Pressable>
                </View>
              ))}
            </Box>
          ) : (
            <Text variant="body" color="textMuted" style={styles.center}>
              Busque por título, artista, álbum ou gênero.
            </Text>
          )
        ) : isEmptyResults(results) ? (
          <Text variant="body" color="textMuted" style={styles.center}>
            Nada encontrado para “{query}”.
          </Text>
        ) : (
          <Box gap="xl">
            {results.tracks.length > 0 && (
              <Box gap="sm">
                <Text variant="overline" color="textMuted">
                  MÚSICAS · {results.tracks.length}
                </Text>
                {results.tracks.map((item, i) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() => playTrackAt(i)}
                    style={styles.row}
                  >
                    <View
                      style={[
                        styles.thumb,
                        { backgroundColor: trackColor(item.id), borderRadius: theme.radius.card },
                      ]}
                    />
                    <View style={styles.rowText}>
                      <HighlightedText
                        text={item.title}
                        query={query}
                        variant="title"
                        color={item.id === currentTrackId ? 'primary' : 'textPrimary'}
                        numberOfLines={1}
                      />
                      <HighlightedText
                        text={`${item.artist} · ${item.album}`}
                        query={query}
                        variant="caption"
                        color="textSecondary"
                        numberOfLines={1}
                      />
                    </View>
                    <Text variant="overline" color="textMuted">
                      {formatDuration(item.duration)}
                    </Text>
                  </Pressable>
                ))}
              </Box>
            )}

            {results.artists.length > 0 && (
              <Box gap="sm">
                <Text variant="overline" color="textMuted">
                  ARTISTAS · {results.artists.length}
                </Text>
                {results.artists.map((artist) => (
                  <Pressable
                    key={artist.id}
                    accessibilityRole="button"
                    onPress={() => playTrackAt(0, artist.tracks)}
                    style={styles.row}
                  >
                    <View
                      style={[
                        styles.thumb,
                        styles.centered,
                        { backgroundColor: theme.colors.surface, borderRadius: theme.radius.pill },
                      ]}
                    >
                      <Ionicons name="person" size={18} color={theme.colors.primary} />
                    </View>
                    <View style={styles.rowText}>
                      <HighlightedText
                        text={artist.name}
                        query={query}
                        variant="title"
                        numberOfLines={1}
                      />
                      <Text variant="caption" color="textSecondary">
                        {artist.tracks.length} {artist.tracks.length === 1 ? 'música' : 'músicas'}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </Box>
            )}

            {results.albums.length > 0 && (
              <Box gap="sm">
                <Text variant="overline" color="textMuted">
                  ÁLBUNS · {results.albums.length}
                </Text>
                {results.albums.map((album) => (
                  <Pressable
                    key={album.id}
                    accessibilityRole="button"
                    onPress={() => playTrackAt(0, album.tracks)}
                    style={styles.row}
                  >
                    <View
                      style={[
                        styles.thumb,
                        { backgroundColor: trackColor(album.id), borderRadius: theme.radius.card },
                      ]}
                    />
                    <View style={styles.rowText}>
                      <HighlightedText
                        text={album.name}
                        query={query}
                        variant="title"
                        numberOfLines={1}
                      />
                      <Text variant="caption" color="textSecondary" numberOfLines={1}>
                        {album.artist} · {album.tracks.length}{' '}
                        {album.tracks.length === 1 ? 'faixa' : 'faixas'}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </Box>
            )}

            {results.genres.length > 0 && (
              <Box gap="sm">
                <Text variant="overline" color="textMuted">
                  GÊNEROS · {results.genres.length}
                </Text>
                {results.genres.map((genre) => (
                  <View key={genre} style={styles.row}>
                    <View
                      style={[
                        styles.thumb,
                        styles.centered,
                        { backgroundColor: trackColor(genre), borderRadius: theme.radius.card },
                      ]}
                    >
                      <Ionicons name="musical-notes" size={18} color="rgba(255,255,255,0.6)" />
                    </View>
                    <HighlightedText text={genre} query={query} variant="title" />
                  </View>
                ))}
              </Box>
            )}
          </Box>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  pills: {
    gap: 8,
    paddingVertical: 2,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  historyTerm: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  thumb: {
    width: 44,
    height: 44,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  center: {
    textAlign: 'center',
    paddingTop: 40,
  },
});
