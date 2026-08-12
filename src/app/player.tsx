import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { IconButton } from '@/components/ui/icon-button';
import { PlaceholderScreen } from '@/components/ui/placeholder-screen';
import { Text } from '@/components/ui/text';
import { usePlayerStore } from '@/stores/player-store';

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

/**
 * Player fullscreen, apresentado como `fullScreenModal` pelo Stack raiz.
 *
 * O layout definitivo (artwork, slider, controles) chega na Issue #11. Por ora
 * a tela ja le a faixa atual e os modos do `usePlayerStore` — e o que mostra o
 * estado global sendo compartilhado entre telas.
 */
export default function PlayerScreen() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const queueLength = usePlayerStore((s) => s.queue.length);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const shuffleMode = usePlayerStore((s) => s.shuffleMode);

  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const cycleRepeatMode = usePlayerStore((s) => s.cycleRepeatMode);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.topBar}>
          <IconButton name="chevron-down" accessibilityLabel="Minimizar player" onPress={dismiss} />
          <IconButton name="ellipsis-horizontal" accessibilityLabel="Opções da faixa" />
        </View>
      </SafeAreaView>

      {currentTrack ? (
        <View style={styles.body}>
          <Box gap="xs" style={styles.info}>
            <Text variant="overline" color="textMuted">
              TOCANDO AGORA · {currentIndex + 1} DE {queueLength}
            </Text>
            <Text variant="display" numberOfLines={2} style={styles.center}>
              {currentTrack.title}
            </Text>
            <Text variant="body" color="textSecondary" style={styles.center}>
              {currentTrack.artist} · {currentTrack.album}
            </Text>
          </Box>

          <Box background="surface" padding="lg" radius="card" style={styles.controls} elevated>
            <IconButton
              name="shuffle"
              accessibilityLabel="Modo aleatório"
              size="sm"
              active={shuffleMode}
              onPress={toggleShuffle}
            />
            <IconButton
              name="play-skip-back"
              accessibilityLabel="Faixa anterior"
              onPress={previous}
            />
            <IconButton
              name={isPlaying ? 'pause' : 'play'}
              accessibilityLabel={isPlaying ? 'Pausar' : 'Reproduzir'}
              size="lg"
              background="primary"
              onPress={togglePlay}
            />
            <IconButton
              name="play-skip-forward"
              accessibilityLabel="Próxima faixa"
              onPress={next}
            />
            <IconButton
              name={repeatMode === 'track' ? 'repeat-outline' : 'repeat'}
              accessibilityLabel="Repetir"
              size="sm"
              active={repeatMode !== 'off'}
              onPress={cycleRepeatMode}
            />
          </Box>

          <Text variant="overline" color="textMuted" style={styles.center}>
            REPEAT: {repeatMode.toUpperCase()} · SHUFFLE: {shuffleMode ? 'ON' : 'OFF'}
          </Text>
        </View>
      ) : (
        <PlaceholderScreen
          title="Player"
          description="Nada tocando. Escolha uma música na Biblioteca."
          icon="play-circle-outline"
          issue="Issue #11"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 32,
  },
  info: {
    alignItems: 'center',
  },
  center: {
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
