import { create } from 'zustand';

import type { Track } from '@/types/track';

export type RepeatMode = 'off' | 'track' | 'queue';

export interface PlayerState {
  /** Faixa tocando agora, ou null quando nada foi iniciado. */
  currentTrack: Track | null;
  /** Fila na ordem de reproducao. Com shuffle ligado, ja vem embaralhada. */
  queue: Track[];
  /**
   * Ordem antes do shuffle, para poder ser restaurada ao desligar.
   *
   * `null` enquanto o shuffle nunca foi ligado. Sem guardar isto, desligar o
   * shuffle deixaria o usuario preso na ordem aleatoria.
   */
  originalOrder: Track[] | null;
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
  originalOrder: null,
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

/**
 * Fisher-Yates.
 *
 * Uma permutacao completa, nao sorteios independentes: e isso que garante que
 * toda faixa toque uma vez antes de qualquer repeticao. Sortear a proxima faixa
 * a cada troca repetiria musicas e deixaria outras de fora.
 */
function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
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
    set({ queue: tracks, originalOrder: null, position: 0, ...withIndex(tracks, startIndex) }),

  addToQueue: (track) => set((s) => ({ queue: [...s.queue, track] })),

  removeFromQueue: (index) =>
    set((s) => {
      const queue = s.queue.filter((_, i) => i !== index);
      // Remover um item antes da faixa atual desloca o indice dela em 1.
      const nextIndex = index < s.currentIndex ? s.currentIndex - 1 : s.currentIndex;
      return { queue, ...withIndex(queue, nextIndex) };
    }),

  clearQueue: () => set({ queue: [], originalOrder: null, currentIndex: -1, currentTrack: null }),

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

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  cycleRepeatMode: () => set((s) => ({ repeatMode: REPEAT_CYCLE[s.repeatMode] })),
  toggleShuffle: () =>
    set((s) => {
      if (s.queue.length === 0) return { shuffleMode: !s.shuffleMode };

      if (s.shuffleMode) {
        // Desligando: volta a ordem original e reencontra a faixa atual nela.
        const queue = s.originalOrder ?? s.queue;
        const index = s.currentTrack ? queue.indexOf(s.currentTrack) : -1;
        return { shuffleMode: false, queue, originalOrder: null, ...withIndex(queue, index) };
      }

      // Ligando: a faixa atual continua tocando, entao ela fica na posicao 0 e
      // so o que vem depois e embaralhado.
      const rest = s.queue.filter((_, i) => i !== s.currentIndex);
      const shuffled = shuffle(rest);
      const queue = s.currentTrack ? [s.currentTrack, ...shuffled] : shuffled;
      return {
        shuffleMode: true,
        queue,
        originalOrder: s.queue,
        ...withIndex(queue, s.currentTrack ? 0 : -1),
      };
    }),

  setProgress: (position, duration) => set((s) => ({ position, duration: duration ?? s.duration })),

  reset: () => set(initialState),
}));
