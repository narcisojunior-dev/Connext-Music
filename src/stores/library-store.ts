import { create } from 'zustand';

import type { Track } from '@/types/track';

export interface ScanProgress {
  current: number;
  total: number;
  /** Arquivo sendo processado agora, para dar sinal de vida na UI. */
  fileName: string;
}

export interface LibraryState {
  tracks: Track[];
  isScanning: boolean;
  scanProgress: ScanProgress | null;
  /** Timestamp do ultimo scan concluido, ou null se a biblioteca nunca foi varrida. */
  lastScanAt: number | null;
}

export interface LibraryActions {
  /** Substitui a biblioteca inteira — usado ao carregar do disco e ao fim de um scan completo. */
  setLibrary: (tracks: Track[]) => void;
  /** Faz merge sem duplicar: faixas com `id` ja conhecido sao atualizadas, nao repetidas. */
  addTracks: (tracks: Track[]) => void;
  removeTrack: (id: string) => void;
  toggleFavorite: (id: string) => void;
  /** Registra uma reproducao: incrementa `playCount` e carimba `lastPlayedAt` (Issue #17). */
  registerPlay: (id: string) => void;
  setScanning: (isScanning: boolean) => void;
  setScanProgress: (progress: ScanProgress | null) => void;
  clear: () => void;
}

export type LibraryStore = LibraryState & LibraryActions;

const initialState: LibraryState = {
  tracks: [],
  isScanning: false,
  scanProgress: null,
  lastScanAt: null,
};

/**
 * A biblioteca de musicas.
 *
 * Guarda as faixas em memoria para a UI ler. A persistencia em disco chega na
 * Issue #7 e o scanner que popula isto, na Issue #5.
 */
export const useLibraryStore = create<LibraryStore>()((set) => ({
  ...initialState,

  setLibrary: (tracks) => set({ tracks, lastScanAt: Date.now() }),

  addTracks: (incoming) =>
    set((s) => {
      // Indexar por id evita o O(n*m) de um `find` por faixa: um scan de 1000
      // arquivos sobre uma biblioteca de 1000 faria um milhao de comparacoes.
      const byId = new Map(s.tracks.map((t) => [t.id, t]));
      for (const track of incoming) {
        byId.set(track.id, track);
      }
      return { tracks: [...byId.values()], lastScanAt: Date.now() };
    }),

  removeTrack: (id) => set((s) => ({ tracks: s.tracks.filter((t) => t.id !== id) })),

  toggleFavorite: (id) =>
    set((s) => ({
      tracks: s.tracks.map((t) => (t.id === id ? { ...t, isFavorite: !t.isFavorite } : t)),
    })),

  registerPlay: (id) =>
    set((s) => ({
      tracks: s.tracks.map((t) =>
        t.id === id ? { ...t, playCount: t.playCount + 1, lastPlayedAt: Date.now() } : t,
      ),
    })),

  // Zera o progresso ao ligar e ao desligar: um scan novo nao deve herdar a
  // barra do anterior, e um scan encerrado nao deve deixar numeros na tela.
  setScanning: (isScanning) => set({ isScanning, scanProgress: null }),
  setScanProgress: (scanProgress) => set({ scanProgress }),

  clear: () => set(initialState),
}));
