import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { trackColor } from '@/components/player/NowPlayingArtwork';
import { useTheme } from '@/hooks/use-theme';
import type { Track } from '@/types/track';

export interface PlaylistMosaicProps {
  /** Faixas da playlist. Só as 4 primeiras entram no mosaico. */
  tracks: Track[];
  size: number;
}

/**
 * Capa de playlist montada com as 4 primeiras faixas.
 *
 * Com menos de 4 faixas mostra um bloco só, em vez de um mosaico com buracos —
 * uma grade pela metade parece defeito, não estilo.
 */
export function PlaylistMosaic({ tracks, size }: PlaylistMosaicProps) {
  const theme = useTheme();
  const radius = theme.radius.card;

  if (tracks.length === 0) {
    return (
      <View
        style={[
          styles.centered,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <Ionicons name="musical-notes-outline" size={size * 0.3} color={theme.colors.textMuted} />
      </View>
    );
  }

  const cells = tracks.slice(0, 4);
  const single = cells.length < 4;
  const cellSize = single ? size : size / 2;

  return (
    <View style={[styles.grid, { width: size, height: size, borderRadius: radius }]}>
      {(single ? cells.slice(0, 1) : cells).map((track) => (
        <View key={track.id} style={{ width: cellSize, height: cellSize }}>
          {track.artwork ? (
            <Image source={{ uri: track.artwork }} style={styles.fill} contentFit="cover" />
          ) : (
            <View style={[styles.fill, { backgroundColor: trackColor(track.id) }]} />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
