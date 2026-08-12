import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View, type ViewStyle } from 'react-native';

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
  style?: ViewStyle;
}

/**
 * Capa grande do player.
 *
 * Quando a faixa não tem capa embutida, mostra um bloco na cor da faixa com um
 * ícone de nota — em vez de um retângulo cinza igual para todas.
 */
export function NowPlayingArtwork({ artwork, seed, size, style }: NowPlayingArtworkProps) {
  const theme = useTheme();

  const box: ViewStyle = {
    width: size,
    height: size,
    borderRadius: theme.radius.modal,
  };

  return (
    <View style={[styles.shadow, box, theme.shadow.card, style]}>
      {artwork ? (
        <Image
          source={{ uri: artwork }}
          style={[styles.fill, { borderRadius: theme.radius.modal }]}
          contentFit="cover"
          recyclingKey={seed}
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
    </View>
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
