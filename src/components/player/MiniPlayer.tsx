import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { trackColor } from '@/components/player/NowPlayingArtwork';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { skipToNext, skipToPrevious, stop, togglePlay } from '@/services/player/queue-manager';
import { usePlayerStore } from '@/stores/player-store';

/** Altura da barra, sem contar a tab bar embaixo. */
export const MINI_PLAYER_HEIGHT = 60;

/** Altura da tab bar do iOS, usada para posicionar a barra logo acima dela. */
export const TAB_BAR_HEIGHT = Platform.select({ ios: 49, default: 56 });

/** Deslocamento horizontal, em pixels, que conta como "pular faixa". */
const SWIPE_DISTANCE = 60;

/**
 * Barra de reprodução acima da tab bar.
 *
 * Só existe quando há faixa ativa — some sozinha quando a reprodução é
 * encerrada, porque lê `currentTrack` do store.
 *
 * Gestos: toque abre o player, arrasto horizontal pula faixa, arrasto para
 * baixo encerra. **Encerrar para de fato a reprodução** em vez de só esconder a
 * barra: esconder deixaria música tocando sem nenhum controle na tela, e o
 * usuário não teria como voltar a ela.
 */
export function MiniPlayer() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);

  const open = useCallback(() => router.push('/player'), []);

  const onSwipe = useCallback((direction: 'left' | 'right' | 'down') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (direction === 'left') void skipToNext();
    else if (direction === 'right') void skipToPrevious();
    else void stop();
  }, []);

  const pan = Gesture.Pan()
    .minDistance(20)
    .onEnd((e) => {
      if (e.translationY > SWIPE_DISTANCE && Math.abs(e.translationY) > Math.abs(e.translationX)) {
        runOnJS(onSwipe)('down');
      } else if (e.translationX < -SWIPE_DISTANCE) {
        runOnJS(onSwipe)('left');
      } else if (e.translationX > SWIPE_DISTANCE) {
        runOnJS(onSwipe)('right');
      }
    });

  if (!currentTrack) return null;

  const progress = duration > 0 ? Math.min(1, Math.max(0, position / duration)) : 0;

  return (
    <Animated.View
      entering={SlideInDown.duration(theme.duration.base)}
      exiting={SlideOutDown.duration(theme.duration.base)}
      style={[
        styles.container,
        {
          bottom: TAB_BAR_HEIGHT + insets.bottom,
          borderTopColor: theme.colors.border,
        },
      ]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView tint="dark" intensity={80} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.surface }]} />
      )}

      {/* Barra fina de progresso, no topo da própria barra. */}
      <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceElevated }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%`, backgroundColor: theme.colors.primary },
          ]}
        />
      </View>

      <GestureDetector gesture={pan}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Abrir player: ${currentTrack.title}, ${currentTrack.artist}`}
          onPress={open}
          style={styles.row}
        >
          {currentTrack.artwork ? (
            <Image
              source={{ uri: currentTrack.artwork }}
              style={[styles.artwork, { borderRadius: theme.radius.card }]}
              contentFit="cover"
              recyclingKey={currentTrack.id}
            />
          ) : (
            <View
              style={[
                styles.artwork,
                styles.artworkPlaceholder,
                {
                  backgroundColor: trackColor(currentTrack.id),
                  borderRadius: theme.radius.card,
                },
              ]}
            >
              <Ionicons name="musical-note" size={16} color="rgba(255,255,255,0.5)" />
            </View>
          )}

          <View style={styles.info}>
            <Text variant="caption" numberOfLines={1} style={styles.title}>
              {currentTrack.title}
            </Text>
            <Text variant="overline" color="textSecondary" numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>

          <IconButton
            name={isPlaying ? 'pause' : 'play'}
            accessibilityLabel={isPlaying ? 'Pausar' : 'Reproduzir'}
            size="sm"
            onPress={() => void togglePlay()}
          />
          <IconButton
            name="play-skip-forward"
            accessibilityLabel="Próxima faixa"
            size="sm"
            onPress={() => void skipToNext()}
          />
        </Pressable>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: MINI_PLAYER_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  progressTrack: {
    height: 2,
  },
  progressFill: {
    height: '100%',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  artwork: {
    width: 40,
    height: 40,
  },
  artworkPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontWeight: '600',
  },
});
