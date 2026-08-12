import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { hapticControl } from '@/utils/haptics';
import { formatDuration } from '@/utils/formatters';

const TRACK_HEIGHT = 6;
const THUMB_SIZE = 16;

export interface ProgressSliderProps {
  /** Posição atual, em segundos. */
  position: number;
  /** Duração da faixa, em segundos. */
  duration: number;
  /** Chamado ao soltar, com a posição escolhida em segundos. */
  onSeek: (seconds: number) => void;
}

/**
 * Barra de progresso arrastável.
 *
 * Escrita com gesture-handler + reanimated em vez de
 * `@react-native-community/slider`: o gesto roda na thread de UI, então o
 * indicador acompanha o dedo mesmo com o JS ocupado — e evita mais um módulo
 * nativo de terceiros, como o que já observamos no Track Player.
 *
 * Enquanto o usuário arrasta, o componente ignora o `position` que chega do
 * player. Sem isso, cada atualização de progresso (1×/s) puxaria o indicador de
 * volta e o arrasto ficaria travado.
 */
export function ProgressSlider({ position, duration, onSeek }: ProgressSliderProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(0);

  const dragX = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const shown = scrubbing ? scrubPosition : position;
  const ratio = duration > 0 ? Math.min(1, Math.max(0, shown / duration)) : 0;

  const beginScrub = useCallback(() => {
    setScrubbing(true);
    hapticControl();
  }, []);

  const updateScrub = useCallback(
    (x: number) => {
      if (width <= 0 || duration <= 0) return;
      setScrubPosition((Math.min(width, Math.max(0, x)) / width) * duration);
    },
    [width, duration],
  );

  const endScrub = useCallback(
    (x: number) => {
      setScrubbing(false);
      if (width <= 0 || duration <= 0) return;
      onSeek((Math.min(width, Math.max(0, x)) / width) * duration);
    },
    [width, duration, onSeek],
  );

  const pan = Gesture.Pan()
    // Reconhece o toque parado também, para um tap simples posicionar a faixa.
    .minDistance(0)
    .onBegin((e) => {
      isDragging.value = true;
      dragX.value = e.x;
      runOnJS(beginScrub)();
      runOnJS(updateScrub)(e.x);
    })
    .onUpdate((e) => {
      dragX.value = e.x;
      runOnJS(updateScrub)(e.x);
    })
    .onEnd((e) => {
      isDragging.value = false;
      runOnJS(endScrub)(e.x);
    })
    .onFinalize(() => {
      isDragging.value = false;
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isDragging.value ? 1.3 : 1 }],
  }));

  return (
    <View style={styles.container}>
      <GestureDetector gesture={pan}>
        {/* A área de toque é maior que a barra: 6px de altura seria um alvo
            pequeno demais para o dedo. */}
        <View style={styles.hitArea} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          <View style={[styles.track, { backgroundColor: theme.colors.surfaceElevated }]}>
            <View
              style={[
                styles.fill,
                { width: `${ratio * 100}%`, backgroundColor: theme.colors.primary },
              ]}
            />
          </View>
          <Animated.View
            style={[
              styles.thumb,
              thumbStyle,
              {
                left: Math.max(0, ratio * width - THUMB_SIZE / 2),
                backgroundColor: theme.colors.textPrimary,
              },
            ]}
          />
        </View>
      </GestureDetector>

      <View style={styles.times}>
        <Text variant="overline" color={scrubbing ? 'textPrimary' : 'textMuted'}>
          {formatDuration(shown)}
        </Text>
        <Text variant="overline" color="textMuted">
          {formatDuration(duration)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  hitArea: {
    height: 32,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
