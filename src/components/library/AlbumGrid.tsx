import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useMemo } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { Box } from '@/components/ui/box';
import { useContentBottomInset } from '@/hooks/use-content-inset';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import type { Album } from '@/types/album';

const NUM_COLUMNS = 2;
const HORIZONTAL_PADDING = 16;
const GAP = 12;

/**
 * Gera uma cor a partir do nome do álbum (para placeholders sem artwork).
 */
function hashColor(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 40%, 25%)`;
}

export interface AlbumGridProps {
  albums: Album[];
  refreshing: boolean;
  onRefresh: () => void;
  /** Chamado ao tocar um álbum. A tela principal decide se toca ou abre detalhe. */
  onAlbumPress: (album: Album) => void;
  header?: React.ReactNode;
}

function AlbumCard({ album, size, onPress }: { album: Album; size: number; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${album.name}, ${album.artist}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { width: size }, pressed && { opacity: 0.8 }]}
    >
      {album.artwork ? (
        <Image
          source={{ uri: album.artwork }}
          style={[styles.artwork, { width: size, height: size, borderRadius: theme.radius.card }]}
          contentFit="cover"
          recyclingKey={album.id}
          // Capas nao mudam: manter em memoria e em disco evita reler o
          // arquivo a cada vez que a linha volta para a viewport.
          cachePolicy="memory-disk"
        />
      ) : (
        <View
          style={[
            styles.artwork,
            {
              width: size,
              height: size,
              borderRadius: theme.radius.card,
              backgroundColor: hashColor(album.name),
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <Ionicons name="disc" size={40} color="rgba(255,255,255,0.3)" />
        </View>
      )}
      <Text variant="caption" color="textPrimary" numberOfLines={1} style={styles.albumName}>
        {album.name}
      </Text>
      <Text variant="overline" color="textMuted" numberOfLines={1}>
        {album.artist} · {album.tracks.length} {album.tracks.length === 1 ? 'faixa' : 'faixas'}
      </Text>
    </Pressable>
  );
}

/**
 * Grid de álbuns em 2 colunas com artwork quadrado.
 *
 * Calcula o tamanho dos cards a partir da largura da tela para que sempre caibam
 * duas colunas com o gap definido.
 */
export function AlbumGrid({ albums, refreshing, onRefresh, onAlbumPress, header }: AlbumGridProps) {
  const bottomInset = useContentBottomInset();
  const { width: screenWidth } = useWindowDimensions();
  const cardSize = Math.floor((screenWidth - HORIZONTAL_PADDING * 2 - GAP) / NUM_COLUMNS);

  const renderItem = useCallback(
    ({ item }: { item: Album }) => (
      <AlbumCard album={item} size={cardSize} onPress={() => onAlbumPress(item)} />
    ),
    [cardSize, onAlbumPress],
  );

  const listHeader = useMemo(
    () => (
      <Box gap="sm" style={styles.listHeader}>
        <Text variant="caption" color="textSecondary">
          {albums.length} {albums.length === 1 ? 'álbum' : 'álbuns'}
        </Text>
        {header}
      </Box>
    ),
    [albums.length, header],
  );

  const listEmpty = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Text variant="body" color="textMuted" style={styles.emptyText}>
          Nenhum álbum encontrado.
        </Text>
      </View>
    ),
    [],
  );

  return (
    <FlatList
      data={albums}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={NUM_COLUMNS}
      columnWrapperStyle={styles.row}
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
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  listHeader: {
    paddingVertical: 12,
  },
  row: {
    gap: GAP,
    marginBottom: GAP,
  },
  card: {
    gap: 4,
  },
  artwork: {
    aspectRatio: 1,
  },
  albumName: {
    marginTop: 4,
  },
  emptyContainer: {
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});
