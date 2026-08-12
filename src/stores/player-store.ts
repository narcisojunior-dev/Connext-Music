import { create } from 'zustand';

import type { Track } from '@/types/track';

export type RepeatMode = 'off' | 'track' | 'queue';

export interface PlayerState {
  /** Faixa tocando agora, ou null quando nada foi iniciado. */
  currentTrack: Track | null;
  /** Fila na ordem de reproducao. Com shuffle ligado, ja vem embaralhada. */
  queue: Track[];
  /** Indice de `currentTrack` dentro de `queue`, ou -1 se a fila estiver vazia. */
  currentIndex: number;
  isPlaying: boolean;
  repeatMode: RepeatMode;
  shuffleMode: boolean;
  /** Posicao atual em segundos. */
  position: number;
  /** Duracao da faixa atual em segundos. */
  duration: number;
}

export interface PlayerActions {
  /** Substitui a fila e comeca a tocar a partir de `startIndex`. */
  setQueue: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  /** Move um item da fila — usado pelo drag & drop (Issue #9). */
  moveQueueItem: (from: number, to: number) => void;

  setCurrentIndex: (index: number) => void;
  next: () => void;
  previous: () => void;

  setIsPlaying: (isPlaying: boolean) => void;
  togglePlay: () => void;
  /** Cicla off -> track -> queue -> off. */
  cycleRepeatMode: () => void;
  toggleShuffle: () => void;
  setProgress: (position: number, duration?: number) => void;
  reset: () => void;
}

export type PlayerStore = PlayerState & PlayerActions;

const initialState: PlayerState = {
  currentTrack: null,
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  repeatMode: 'off',
  shuffleMode: false,
  position: 0,
  duration: 0,
};

/** Mantem `currentTrack` e `currentIndex` coerentes: um so deriva do outro. */
function withIndex(
  queue: Track[],
  index: number,
): Pick<PlayerState, 'currentIndex' | 'currentTrack'> {
  const valid = index >= 0 && index < queue.length;
  return {
    currentIndex: valid ? index : -1,
    currentTrack: valid ? queue[index] : null,
  };
}

const REPEAT_CYCLE: Record<RepeatMode, RepeatMode> = {
  off: 'track',
  track: 'queue',
  queue: 'off',
};

/**
 * Estado da reproducao: o que toca agora, a fila e os modos.
 *
 * Este store e a fonte de verdade da UI. A Issue #8 conecta o Track Player, que
 * passa a empurrar as mudancas reais (fim de faixa, controle da lock screen)
 * para ca — por isso as acoes ja sao granulares, para o servico nativo poder
 * atualizar so o que mudou sem re-renderizar o app inteiro.
 */
export const usePlayerStore = create<PlayerStore>()((set, get) => ({
  ...initialState,

  setQueue: (tracks, startIndex = 0) =>
    set({ queue: tracks, position: 0, ...withIndex(tracks, startIndex) }),

  addToQueue: (track) => set((s) => ({ queue: [...s.queue, track] })),

  removeFromQueue: (index) =>
    set((s) => {
      const queue = s.queue.filter((_, i) => i !== index);
      // Remover um item antes da faixa atual desloca o indice dela em 1.
      const nextIndex = index < s.currentIndex ? s.currentIndex - 1 : s.currentIndex;
      return { queue, ...withIndex(queue, nextIndex) };
    }),

  clearQueue: () => set({ queue: [], currentIndex: -1, currentTrack: null }),

  moveQueueItem: (from, to) =>
    set((s) => {
      if (from === to || from < 0 || from >= s.queue.length || to < 0 || to >= s.queue.length) {
        return s;
      }
      const queue = [...s.queue];
      const [moved] = queue.splice(from, 1);
      queue.splice(to, 0, moved);
      // A faixa atual pode ter mudado de posicao; reencontra pelo objeto.
      const nextIndex = s.currentTrack ? queue.indexOf(s.currentTrack) : -1;
      return { queue, ...withIndex(queue, nextIndex) };
    }),

  setCurrentIndex: (index) => set((s) => ({ position: 0, ...withIndex(s.queue, index) })),

  next: () => {
    const { queue, currentIndex, repeatMode } = get();
    if (queue.length === 0) return;
    if (repeatMode === 'track') {
      set({ position: 0 });
      return;
    }
    const candidate = currentIndex + 1;
    if (candidate >= queue.length) {
      // Fim da fila: com repeat 'queue' volta ao inicio, senao para.
      if (repeatMode === 'queue') {
        set({ position: 0, ...withIndex(queue, 0) });
      } else {
        set({ isPlaying: false });
      }
      return;
    }
    set({ position: 0, ...withIndex(queue, candidate) });
  },

  previous: () => {
    const { queue, currentIndex, position, repeatMode } = get();
    if (queue.length === 0) return;
    // Convencao dos players: depois de 3s, "anterior" reinicia a faixa atual.
    if (position > 3) {
      set({ position: 0 });
      return;
    }
    const candidate = currentIndex - 1;
    if (candidate < 0) {
      if (repeatMode === 'queue') {
        set({ position: 0, ...withIndex(queue, queue.length - 1) });
      } else {
        set({ position: 0 });
      }
      return;
    }
    set({ position: 0, ...withIndex(queue, candidate) });
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  cycleRepeatMode: () => set((s) => ({ repeatMode: REPEAT_CYCLE[s.repeatMode] })),
  toggleShuffle: () => set((s) => ({ shuffleMode: !s.shuffleMode })),

  setProgress: (position, duration) => set((s) => ({ position, duration: duration ?? s.duration })),

  reset: () => set(initialState),
}));
