import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { FavoriteButton } from '@/components/track/FavoriteButton';
import { Text } from '@/components/ui/text';
import { useLibraryStore } from '@/stores/library-store';
import { hapticLongPress } from '@/utils/haptics';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/utils/formatters';
import type { Track } from '@/types/track';

/**
 * Gera uma cor vibrante mas discreta a partir de uma string qualquer.
 *
 * O placeholder das faixas sem artwork usa essa cor como fundo, para que cada
 * faixa tenha um quadrado visualmente distinto — em vez de todos cinza.
 */
function hashColor(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 30%)`;
}

export interface TrackItemProps {
  track: Track;
  /** Se `true`, pinta o título com `primary` (indica a faixa tocando agora). */
  isActive?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

/**
 * Uma linha da lista de músicas.
 *
 * - Artwork 48×48: imagem real se houver, ou placeholder com cor derivada do
 *   hash da faixa + ícone de nota musical.
 * - Título + artista · álbum + duração mm:ss.
 * - Feedback de toque via escurecimento do fundo.
 */
export function TrackItem({ track, isActive = false, onPress, onLongPress }: TrackItemProps) {
  const theme = useTheme();
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${track.title}, ${track.artist}`}
      onPress={onPress}
      onLongPress={
        onLongPress
          ? () => {
              // O toque longo abre um menu; a vibração confirma que ele foi
              // reconhecido antes de a folha aparecer.
              hapticLongPress();
              onLongPress();
            }
          : undefined
      }
      style={({ pressed }) => [
        styles.row,
        { borderRadius: theme.radius.card },
        pressed && { backgroundColor: theme.colors.surface },
      ]}
    >
      {/* Artwork ou placeholder colorido */}
      {track.artwork ? (
        <Image
          source={{ uri: track.artwork }}
          style={[styles.artwork, { borderRadius: theme.radius.card }]}
          contentFit="cover"
          recyclingKey={track.id}
          // Capas nao mudam: manter em memoria e em disco evita reler o
          // arquivo a cada vez que a linha volta para a viewport.
          cachePolicy="memory-disk"
        />
      ) : (
        <View
          style={[
            styles.artwork,
            {
              backgroundColor: hashColor(track.id),
              borderRadius: theme.radius.card,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <Ionicons name="musical-note" size={20} color="rgba(255,255,255,0.5)" />
        </View>
      )}

      {/* Título e subtítulo */}
      <View style={styles.textBlock}>
        <Text
          variant="title"
          color={isActive ? 'primary' : 'textPrimary'}
          numberOfLines={1}
          style={styles.title}
        >
          {track.title}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {track.artist}
          {track.album ? ` · ${track.album}` : ''}
        </Text>
      </View>

      {/* Duração */}
      <Text variant="overline" color="textMuted">
        {formatDuration(track.duration)}
      </Text>

      <FavoriteButton
        isFavorite={track.isFavorite}
        onToggle={() => toggleFavorite(track.id)}
        size={18}
      />
    </Pressable>
  );
}

/** Altura fixa para `getItemLayout` — precisa bater com padding + artwork + gap. */
export const TRACK_ITEM_HEIGHT = 64;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    height: TRACK_ITEM_HEIGHT,
  },
  artwork: {
    width: 48,
    height: 48,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
  },
});
