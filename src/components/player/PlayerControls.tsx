import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { JUMP_SECONDS } from '@/services/player/constants';
import { hapticControl } from '@/utils/haptics';
import type { RepeatMode } from '@/stores/player-store';

export interface PlayerControlsProps {
  isPlaying: boolean;
  shuffleMode: boolean;
  repeatMode: RepeatMode;
  onTogglePlay: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
}

/** Ícone do repeat: `repeat-outline` distingue "repetir uma faixa" de "repetir a fila". */
function repeatIcon(mode: RepeatMode) {
  return mode === 'track' ? ('repeat-outline' as const) : ('repeat' as const);
}

/**
 * Linha de controles do player.
 *
 * Os saltos de {@link JUMP_SECONDS} usam `play-back`/`play-forward` com o número
 * sobreposto — de propósito diferentes de `play-skip-back`/`play-skip-forward`,
 * que são faixa anterior/próxima. Confundir os dois é frustrante: um perde a
 * posição da música, o outro não.
 */
export function PlayerControls({
  isPlaying,
  shuffleMode,
  repeatMode,
  onTogglePlay,
  onPrevious,
  onNext,
  onSkipBackward,
  onSkipForward,
  onToggleShuffle,
  onCycleRepeat,
}: PlayerControlsProps) {
  // Recuo e volta no play/pause. Fica so no botao principal: o `IconButton` ja
  // encolhe enquanto pressionado, e esta animacao e o eco *depois* do toque —
  // repetida em cada controle viraria ruido.
  const playScale = useSharedValue(1);

  // Único controle fora do `withHaptics`, porque também dispara a animação.
  //
  // Este handler precisa vir **antes** do `useAnimatedStyle` abaixo: se o hook
  // que lê `playScale` aparece primeiro, o React Compiler passa a considerar o
  // valor congelado e `react-hooks/immutability` recusa a escrita aqui.
  const handleTogglePlay = () => {
    hapticControl();
    playScale.value = withSequence(
      withSpring(0.85, { damping: 14, stiffness: 400 }),
      withSpring(1, { damping: 12, stiffness: 260 }),
    );
    onTogglePlay();
  };

  const playStyle = useAnimatedStyle(() => ({ transform: [{ scale: playScale.value }] }));

  /** Todo controle de transporte usa o mesmo toque leve — ver `utils/haptics`. */
  const withHaptics = useCallback(
    (action: () => void) => () => {
      hapticControl();
      action();
    },
    [],
  );

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <IconButton
          name="shuffle"
          accessibilityLabel={shuffleMode ? 'Desativar modo aleatório' : 'Ativar modo aleatório'}
          size="sm"
          active={shuffleMode}
          onPress={withHaptics(onToggleShuffle)}
        />

        <IconButton
          name="play-skip-back"
          accessibilityLabel="Faixa anterior"
          onPress={withHaptics(onPrevious)}
        />

        <View>
          <IconButton
            name="play-back"
            accessibilityLabel={`Retroceder ${JUMP_SECONDS} segundos`}
            onPress={withHaptics(onSkipBackward)}
          />
          <Text variant="overline" color="textMuted" style={styles.jumpLabel} pointerEvents="none">
            {JUMP_SECONDS}
          </Text>
        </View>

        <Animated.View style={playStyle}>
          <IconButton
            name={isPlaying ? 'pause' : 'play'}
            accessibilityLabel={isPlaying ? 'Pausar' : 'Reproduzir'}
            size="lg"
            background="primary"
            onPress={handleTogglePlay}
          />
        </Animated.View>

        <View>
          <IconButton
            name="play-forward"
            accessibilityLabel={`Avançar ${JUMP_SECONDS} segundos`}
            onPress={withHaptics(onSkipForward)}
          />
          <Text variant="overline" color="textMuted" style={styles.jumpLabel} pointerEvents="none">
            {JUMP_SECONDS}
          </Text>
        </View>

        <IconButton
          name="play-skip-forward"
          accessibilityLabel="Próxima faixa"
          onPress={withHaptics(onNext)}
        />

        <IconButton
          name={repeatIcon(repeatMode)}
          accessibilityLabel={`Repetir: ${repeatMode}`}
          size="sm"
          active={repeatMode !== 'off'}
          onPress={withHaptics(onCycleRepeat)}
        />
      </View>

      {/* Estado do repeat por extenso: o ícone sozinho não distingue os modos. */}
      {repeatMode !== 'off' && (
        <Text variant="overline" color="primary" style={styles.modeLabel}>
          {repeatMode === 'track' ? 'REPETINDO A FAIXA' : 'REPETINDO A FILA'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  jumpLabel: {
    position: 'absolute',
    bottom: 2,
    alignSelf: 'center',
    fontSize: 9,
  },
  modeLabel: {
    textAlign: 'center',
  },
});
