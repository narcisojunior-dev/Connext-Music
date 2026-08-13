import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NowPlayingArtwork, trackColor } from '@/components/player/NowPlayingArtwork';
import { PlayerControls } from '@/components/player/PlayerControls';
import { ProgressSlider } from '@/components/player/ProgressSlider';
import { QueueSheet } from '@/components/player/QueueSheet';
import { sleepTimerLabel } from '@/components/settings/SleepTimerModal';
import { FavoriteButton } from '@/components/track/FavoriteButton';
import { IconButton } from '@/components/ui/icon-button';
import { EmptyState } from '@/components/ui/empty-state';
import { MarqueeText } from '@/components/ui/marquee-text';
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
import { useSettingsStore } from '@/stores/settings-store';
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
  const sleepTimer = useSettingsStore((s) => s.sleepTimer);
  // O favorito vem da biblioteca, nao da faixa da fila: a fila e uma copia do
  // momento em que a reproducao comecou e nao reflete favoritar depois disso.
  const isFavorite = useLibraryStore(
    (s) => s.tracks.find((t) => t.id === currentTrack?.id)?.isFavorite ?? false,
  );

  const [queueOpen, setQueueOpen] = useState(false);

  const handleSeek = useCallback((seconds: number) => void seekTo(seconds), []);

  if (!currentTrack) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.topBar}>
            <IconButton name="chevron-down" accessibilityLabel="Fechar" onPress={dismiss} />
          </View>
        </SafeAreaView>
        <EmptyState
          icon="play-circle-outline"
          title="Nada tocando"
          description="Escolha uma música na Biblioteca para começar."
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
      {/* O gradiente é remontado a cada faixa com um fade de entrada: animar a
          cor em si exigiria interpolar entre dois gradientes, e o cruzamento de
          duas camadas dá o mesmo resultado por muito menos. */}
      <Animated.View
        key={currentTrack.id}
        entering={FadeIn.duration(theme.duration.spring)}
        style={StyleSheet.absoluteFill}
      >
        <LinearGradient
          colors={[tint, theme.colors.background, theme.colors.background]}
          locations={[0, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <View style={styles.topSlot}>
            <IconButton
              name="chevron-down"
              accessibilityLabel="Minimizar player"
              onPress={dismiss}
            />
          </View>
          {/* O timer substitui a contagem da fila em vez de somar mais um
              elemento: e a informacao mais urgente enquanto esta ativo, e a
              barra superior nao tem espaco para as duas. */}
          {sleepTimer ? (
            <View style={styles.timerBadge}>
              <Ionicons name="moon" size={12} color={theme.colors.primary} />
              <Text variant="overline" color="primary">
                {sleepTimerLabel(sleepTimer.option).toUpperCase()}
              </Text>
            </View>
          ) : (
            <Text variant="overline" color="textMuted">
              {currentIndex + 1} DE {queueLength}
            </Text>
          )}
          <View style={styles.topSlot} />
        </View>

        <View style={styles.artworkArea}>
          <NowPlayingArtwork
            artwork={currentTrack.artwork}
            seed={currentTrack.id}
            size={artworkSize}
            isPlaying={isPlaying}
          />
        </View>

        <View style={styles.bottom}>
          <View style={styles.info}>
            <MarqueeText text={currentTrack.title} variant="heading" style={styles.center} />
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

          <View style={styles.extras}>
            <FavoriteButton
              isFavorite={isFavorite}
              onToggle={() => currentTrack && toggleFavorite(currentTrack.id)}
              size={20}
            />
            <IconButton
              name="list"
              accessibilityLabel="Fila de reprodução"
              size="sm"
              onPress={() => setQueueOpen(true)}
            />
            <IconButton
              name="car-sport"
              accessibilityLabel="Modo carro"
              size="sm"
              onPress={() => router.push('/car-mode')}
            />
          </View>
        </View>
      </SafeAreaView>

      <QueueSheet visible={queueOpen} onClose={() => setQueueOpen(false)} />
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
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topSlot: {
    // Os dois lados ocupam a mesma largura para o texto do meio ficar
    // centralizado na tela, e nao no espaco que sobra.
    flex: 1,
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
    alignItems: 'center',
    justifyContent: 'space-around',
  },
});
