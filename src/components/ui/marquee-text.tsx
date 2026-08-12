import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text, type TextProps } from '@/components/ui/text';

/** Velocidade do deslize, em pixels por segundo. */
const SPEED = 30;

/** Pausa nas pontas, para o texto poder ser lido antes de voltar a andar. */
const PAUSE_MS = 1200;

export interface MarqueeTextProps extends Omit<TextProps, 'children' | 'numberOfLines'> {
  text: string;
}

/**
 * Texto que desliza quando não cabe na largura disponível.
 *
 * Títulos curtos ficam parados: animar o que já é legível só distrai. O
 * deslocamento vai e volta em vez de dar a volta em laço — com laço seria
 * preciso duplicar o texto, e a emenda entre as cópias fica visível em fontes
 * proporcionais.
 */
export function MarqueeText({ text, style, ...rest }: MarqueeTextProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const offset = useSharedValue(0);

  const overflow = textWidth - containerWidth;
  const shouldScroll = overflow > 4;

  const onContainerLayout = (e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width);
  const onTextLayout = (e: LayoutChangeEvent) => setTextWidth(e.nativeEvent.layout.width);

  // O alvo muda quando o texto ou a largura mudam; reatribuir aqui reinicia a
  // animação para o novo tamanho sem precisar de efeito.
  if (shouldScroll) {
    const duration = (overflow / SPEED) * 1000;
    offset.value = withRepeat(
      withSequence(
        withDelay(PAUSE_MS, withTiming(-overflow, { duration, easing: Easing.linear })),
        withDelay(PAUSE_MS, withTiming(0, { duration, easing: Easing.linear })),
      ),
      -1,
      false,
    );
  } else {
    offset.value = 0;
  }

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      <Animated.View style={animatedStyle}>
        <Text {...rest} numberOfLines={1} onLayout={onTextLayout} style={[styles.text, style]}>
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  text: {
    // Sem isto o texto é medido já truncado, e o overflow nunca é detectado.
    alignSelf: 'flex-start',
  },
});
