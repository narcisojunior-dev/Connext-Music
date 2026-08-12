import { create } from 'zustand';

import { loadLibrary } from '@/services/storage/library-storage';
import type { Track } from '@/types/track';

export interface ScanProgress {
  current: number;
  total: number;
  /** Arquivo sendo processado agora, para dar sinal de vida na UI. */
  fileName: string;
}

export interface LibraryState {
  tracks: Track[];
  /**
   * `false` ate a biblioteca salva ser lida do disco.
   *
   * A UI precisa distinguir "ainda carregando" de "biblioteca vazia": sem isto,
   * a tela de "nenhuma música encontrada" pisca por um instante toda vez que o
   * app abre, mesmo para quem tem 500 faixas salvas.
   */
  isHydrated: boolean;
  isScanning: boolean;
  scanProgress: ScanProgress | null;
  /** Timestamp do ultimo scan concluido, ou null se a biblioteca nunca foi varrida. */
  lastScanAt: number | null;
}

export interface LibraryActions {
  /** Carrega a biblioteca salva. Chamado uma vez, na abertura do app. */
  hydrate: () => Promise<void>;
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
  isHydrated: false,
  isScanning: false,
  scanProgress: null,
  lastScanAt: null,
};

/**
 * Leitura do disco em andamento.
 *
 * Existe fora do store porque duas telas podem pedir a hidratacao no mesmo
 * frame de montagem. Guardar a promessa faz as duas esperarem a *mesma*
 * leitura: sem isso, ambas passariam pelo guarda `isHydrated` — que e checado
 * antes do `await` — e cada uma escreveria no store ao terminar.
 */
let hydration: Promise<void> | null = null;

/**
 * A biblioteca de musicas.
 *
 * Guarda as faixas em memoria para a UI ler. O scanner que popula isto esta na
 * Issue #5 e a persistencia, na Issue #7.
 */
export const useLibraryStore = create<LibraryStore>()((set, get) => ({
  ...initialState,

  hydrate: () => {
    if (get().isHydrated) return Promise.resolve();

    hydration ??= loadLibrary()
      .then((tracks) => {
        // Um scan pode ter terminado enquanto o disco era lido — pelo botao de
        // escanear, por exemplo. Nesse caso o resultado dele e mais recente que
        // o cache, e sobrescrever com o cache faria as faixas recem-encontradas
        // desaparecerem da tela.
        if (get().lastScanAt !== null) {
          set({ isHydrated: true });
          return;
        }
        set({ tracks, isHydrated: true });
      })
      .finally(() => {
        hydration = null;
      });

    return hydration;
  },

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
