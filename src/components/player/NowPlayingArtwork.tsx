import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

/**
 * Cor derivada de uma string.
 *
 * Usada no placeholder e no gradiente do fundo. **Não** é a cor dominante da
 * artwork — extrair isso exige processar a imagem, e é escopo da Issue #16
 * ("glassmorphism animado baseado nas cores da artwork"). Até lá, derivar do
 * hash já dá a cada faixa uma identidade visual estável e distinta.
 */
export function trackColor(seed: string, saturation = 45, lightness = 30): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, ${saturation}%, ${lightness}%)`;
}

export interface NowPlayingArtworkProps {
  /** Caminho da capa em cache, ou null. */
  artwork: string | null;
  /** Semente da cor do placeholder — normalmente o id da faixa. */
  seed: string;
  size: number;
  /** Ativa o pulso sutil enquanto toca. */
  isPlaying?: boolean;
  style?: ViewStyle;
}

/** Amplitude do pulso: 1.5% é perceptível sem parecer que a tela está tremendo. */
const PULSE_SCALE = 1.015;
const PULSE_MS = 2000;

/**
 * Capa grande do player.
 *
 * Quando a faixa não tem capa embutida, mostra um bloco na cor da faixa com um
 * ícone de nota — em vez de um retângulo cinza igual para todas.
 */
export function NowPlayingArtwork({
  artwork,
  seed,
  size,
  isPlaying = false,
  style,
}: NowPlayingArtworkProps) {
  const theme = useTheme();
  const pulse = useSharedValue(1);

  // Reatribuir durante a renderização liga e desliga o laço conforme o estado,
  // sem um efeito que rodaria um quadro atrasado.
  pulse.value = isPlaying
    ? withRepeat(
        withTiming(PULSE_SCALE, { duration: PULSE_MS, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      )
    : withTiming(1, { duration: 300 });

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const box: ViewStyle = {
    width: size,
    height: size,
    borderRadius: theme.radius.modal,
  };

  return (
    <Animated.View
      // A `key` remonta o bloco a cada troca de faixa, o que dispara o
      // `entering` — é o crossfade entre capas.
      key={seed}
      entering={FadeIn.duration(theme.duration.spring)}
      style={[styles.shadow, box, theme.shadow.card, pulseStyle, style]}
    >
      {artwork ? (
        <Image
          source={{ uri: artwork }}
          style={[styles.fill, { borderRadius: theme.radius.modal }]}
          contentFit="cover"
          recyclingKey={seed}
          // Capas nao mudam: manter em memoria e em disco evita reler o
          // arquivo a cada vez que a linha volta para a viewport.
          cachePolicy="memory-disk"
          transition={200}
        />
      ) : (
        <View
          style={[
            styles.fill,
            styles.placeholder,
            { backgroundColor: trackColor(seed), borderRadius: theme.radius.modal },
          ]}
        >
          <Ionicons name="musical-notes" size={size * 0.28} color="rgba(255,255,255,0.35)" />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    // A sombra precisa de um fundo opaco no iOS; sem isso ela vaza por baixo
    // de uma imagem com cantos arredondados.
    backgroundColor: '#161B2E',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
