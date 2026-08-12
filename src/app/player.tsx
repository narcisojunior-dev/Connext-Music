import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NowPlayingArtwork, trackColor } from '@/components/player/NowPlayingArtwork';
import { PlayerControls } from '@/components/player/PlayerControls';
import { ProgressSlider } from '@/components/player/ProgressSlider';
import { FavoriteButton } from '@/components/track/FavoriteButton';
import { IconButton } from '@/components/ui/icon-button';
import { PlaceholderScreen } from '@/components/ui/placeholder-screen';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import {
  cycleRepeatMode,
  seekTo,
  skipBackward,
  skipForward,
  skipToNext,
  skipToPrevious,
  togglePlay,
  toggleShuffle,
} from '@/services/player/queue-manager';
import { useLibraryStore } from '@/stores/library-store';
import { usePlayerStore } from '@/stores/player-store';

/** Maior lado que a capa pode ocupar, respeitando telas estreitas. */
const MAX_ARTWORK = 320;

/**
 * Fecha o player.
 *
 * `router.back()` sozinho nao basta: o player tambem e alcancavel por deep link
 * (`connextmusic://player`) e por notificacao da lock screen, casos em que ele e
 * a unica tela da pilha e o back vira um no-op — o usuario ficaria preso na
 * tela. Nesses casos caimos para a Biblioteca.
 */
function dismiss() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/');
}

export default function PlayerScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const shuffleMode = usePlayerStore((s) => s.shuffleMode);
  const queueLength = usePlayerStore((s) => s.queue.length);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
  // O favorito vem da biblioteca, nao da faixa da fila: a fila e uma copia do
  // momento em que a reproducao comecou e nao reflete favoritar depois disso.
  const isFavorite = useLibraryStore(
    (s) => s.tracks.find((t) => t.id === currentTrack?.id)?.isFavorite ?? false,
  );

  const handleSeek = useCallback((seconds: number) => void seekTo(seconds), []);

  if (!currentTrack) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.topBar}>
            <IconButton name="chevron-down" accessibilityLabel="Fechar" onPress={dismiss} />
          </View>
        </SafeAreaView>
        <PlaceholderScreen
          title="Player"
          description="Nada tocando. Escolha uma música na Biblioteca."
          icon="play-circle-outline"
          issue="Issue #11"
        />
      </View>
    );
  }

  const artworkSize = Math.min(MAX_ARTWORK, width - theme.spacing.xl * 2);
  // Cor derivada do id da faixa. A cor real da capa chega na Issue #16.
  const tint = trackColor(currentTrack.id, 55, 22);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Glassmorphism: um gradiente na cor da faixa, desfocado por cima. É o
          blur que impede o gradiente de competir com a artwork. */}
      <LinearGradient
        colors={[tint, theme.colors.background, theme.colors.background]}
        locations={[0, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
      <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <IconButton name="chevron-down" accessibilityLabel="Minimizar player" onPress={dismiss} />
          <Text variant="overline" color="textMuted">
            {currentIndex + 1} DE {queueLength}
          </Text>
          <View style={styles.topRight}>
            <FavoriteButton
              isFavorite={isFavorite}
              onToggle={() => currentTrack && toggleFavorite(currentTrack.id)}
            />
            <IconButton name="ellipsis-horizontal" accessibilityLabel="Opções da faixa" />
          </View>
        </View>

        <View style={styles.artworkArea}>
          <NowPlayingArtwork
            artwork={currentTrack.artwork}
            seed={currentTrack.id}
            size={artworkSize}
          />
        </View>

        <View style={styles.bottom}>
          <View style={styles.info}>
            <Text variant="heading" numberOfLines={2} style={styles.center}>
              {currentTrack.title}
            </Text>
            <Text variant="body" color="textSecondary" numberOfLines={1} style={styles.center}>
              {currentTrack.artist}
            </Text>
            {currentTrack.album ? (
              <Text variant="caption" color="textMuted" numberOfLines={1} style={styles.center}>
                {currentTrack.album}
              </Text>
            ) : null}
          </View>

          <ProgressSlider position={position} duration={duration} onSeek={handleSeek} />

          <PlayerControls
            isPlaying={isPlaying}
            shuffleMode={shuffleMode}
            repeatMode={repeatMode}
            onTogglePlay={() => void togglePlay()}
            onPrevious={() => void skipToPrevious()}
            onNext={() => void skipToNext()}
            onSkipBackward={() => void skipBackward()}
            onSkipForward={() => void skipForward()}
            onToggleShuffle={() => void toggleShuffle()}
            onCycleRepeat={() => void cycleRepeatMode()}
          />

          {/* Fila, volume e AirPlay chegam nas Issues #12 e #21. */}
          <View style={styles.extras}>
            <IconButton name="list" accessibilityLabel="Fila de reprodução" size="sm" />
            <IconButton name="volume-medium" accessibilityLabel="Volume" size="sm" />
            <IconButton name="radio" accessibilityLabel="AirPlay" size="sm" />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  artworkArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 24,
  },
  info: {
    alignItems: 'center',
    gap: 4,
  },
  center: {
    textAlign: 'center',
  },
  extras: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});
