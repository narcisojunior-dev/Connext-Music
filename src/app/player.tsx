import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/icon-button';
import { PlaceholderScreen } from '@/components/ui/placeholder-screen';

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
 * Enquanto a Issue #11 nao chega, a tela ja carrega os controles de dispensar
 * e opcoes — sao eles que provam que o modal abre e fecha corretamente.
 */
export default function PlayerScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.topBar}>
          <IconButton name="chevron-down" accessibilityLabel="Minimizar player" onPress={dismiss} />
          <IconButton name="ellipsis-horizontal" accessibilityLabel="Opções da faixa" />
        </View>
      </SafeAreaView>

      <PlaceholderScreen
        title="Player"
        description="Artwork, controles de reprodução e barra de progresso da faixa atual."
        icon="play-circle-outline"
        issue="Issue #11"
      />
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
});
