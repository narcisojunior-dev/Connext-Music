import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { skipToNext, skipToPrevious, togglePlay } from '@/services/player/queue-manager';

const ACTIONS: Record<string, () => Promise<void>> = {
  toggle: togglePlay,
  next: skipToNext,
  previous: skipToPrevious,
};

/**
 * Destino dos botões do widget.
 *
 * O widget roda em outro processo e não alcança o player, então cada botão é um
 * deep link (`connextmusic://widget/toggle`) que abre o app aqui, executa a
 * ação e segue para o player. Esta tela nunca chega a ser vista.
 *
 * Uma rota dinâmica em vez de três arquivos quase idênticos: o que muda entre
 * elas é só qual função chamar.
 */
export default function WidgetActionScreen() {
  const { action } = useLocalSearchParams<{ action: string }>();

  useEffect(() => {
    const run = ACTIONS[action ?? ''];

    // `replace`, e não `push`: esta rota não pode sobrar na pilha, senão o
    // botão de voltar do player cairia numa tela vazia.
    const finish = () => router.replace('/player');

    if (!run) {
      finish();
      return;
    }

    run().then(finish, (error) => {
      console.warn(`[widget] ação "${action}" falhou:`, error);
      finish();
    });
  }, [action]);

  return <View />;
}
