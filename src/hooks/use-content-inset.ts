import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MINI_PLAYER_HEIGHT, TAB_BAR_HEIGHT } from '@/components/player/MiniPlayer';
import { usePlayerStore } from '@/stores/player-store';

/** Respiro extra, para o último item não encostar na barra. */
const BREATHING_ROOM = 16;

/**
 * Espaço a reservar no fim de uma lista rolável.
 *
 * A tab bar flutua sobre o conteúdo (`position: absolute`) e o mini player
 * aparece acima dela — os dois cobririam o último item se a lista não
 * reservasse esse espaço. O valor é **dinâmico** de propósito: reservar sempre
 * a altura do mini player deixaria um vão visível quando nada está tocando.
 */
export function useContentBottomInset(): number {
  const insets = useSafeAreaInsets();
  const hasTrack = usePlayerStore((s) => s.currentTrack !== null);

  return TAB_BAR_HEIGHT + insets.bottom + (hasTrack ? MINI_PLAYER_HEIGHT : 0) + BREATHING_ROOM;
}
