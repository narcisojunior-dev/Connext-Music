import { create } from 'zustand';

import { loadPlaylists, savePlaylists } from '@/services/storage/playlist-storage';
import type { Playlist } from '@/types/playlist';
import { generateUUID } from '@/utils/id-generator';

export interface PlaylistState {
  playlists: Playlist[];
  /** `false` ate as playlists salvas serem lidas do disco. */
  isHydrated: boolean;
}

export interface PlaylistActions {
  /** Carrega as playlists salvas. Chamado uma vez, na abertura do app. */
  hydrate: () => Promise<void>;
  /** Cria e retorna a playlist, para a UI poder navegar direto para ela. */
  createPlaylist: (name: string, description?: string) => Playlist;
  renamePlaylist: (id: string, name: string) => void;
  updateDescription: (id: string, description: string) => void;
  deletePlaylist: (id: string) => void;

  /** Ignora a faixa se ela ja estiver na playlist. */
  addTrackToPlaylist: (playlistId: string, trackId: string) => void;
  removeTrackFromPlaylist: (playlistId: string, index: number) => void;
  reorderPlaylistTracks: (playlistId: string, from: number, to: number) => void;

  /** Remove um `trackId` de todas as playlists — usado quando o arquivo some do disco. */
  purgeTrack: (trackId: string) => void;
  /**
   * Troca ids antigos pelos novos apos um scan.
   *
   * O `id` de uma faixa embute a data de modificacao do arquivo, entao editar
   * as tags de uma musica gera um id novo. Sem este remapeamento, as playlists
   * continuariam apontando para o id antigo e a faixa sumiria delas.
   */
  remapTrackIds: (mapping: Record<string, string>) => void;
  setPlaylists: (playlists: Playlist[]) => void;
  clear: () => void;
}

export type PlaylistStore = PlaylistState & PlaylistActions;

/** Aplica `patch` a uma playlist e carimba `updatedAt`. */
function patchPlaylist(
  playlists: Playlist[],
  id: string,
  patch: (playlist: Playlist) => Partial<Playlist>,
): Playlist[] {
  return playlists.map((p) => (p.id === id ? { ...p, ...patch(p), updatedAt: Date.now() } : p));
}

/**
 * Playlists criadas pelo usuario (Issue #14).
 *
 * As playlists guardam apenas IDs de faixa — ver a nota em `types/playlist.ts`.
 * A persistencia entra na Issue #7.
 */
/** Ver a nota sobre esta deduplicacao em `library-store.ts`. */
let hydration: Promise<void> | null = null;

export const usePlaylistStore = create<PlaylistStore>()((set, get) => ({
  playlists: [],
  isHydrated: false,

  hydrate: () => {
    if (get().isHydrated) return Promise.resolve();

    hydration ??= loadPlaylists()
      .then((playlists) => {
        // Playlists criadas enquanto o disco era lido tem precedencia sobre o
        // cache — sobrescreve-las faria a playlist recem-criada sumir.
        if (get().playlists.length > 0) {
          set({ isHydrated: true });
          return;
        }
        set({ playlists, isHydrated: true });
      })
      .finally(() => {
        hydration = null;
      });

    return hydration;
  },

  createPlaylist: (name, description) => {
    const now = Date.now();
    const playlist: Playlist = {
      id: generateUUID(),
      name,
      description,
      trackIds: [],
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ playlists: [...s.playlists, playlist] }));
    return playlist;
  },

  renamePlaylist: (id, name) =>
    set((s) => ({ playlists: patchPlaylist(s.playlists, id, () => ({ name })) })),

  updateDescription: (id, description) =>
    set((s) => ({ playlists: patchPlaylist(s.playlists, id, () => ({ description })) })),

  deletePlaylist: (id) => set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) })),

  addTrackToPlaylist: (playlistId, trackId) =>
    set((s) => ({
      playlists: patchPlaylist(s.playlists, playlistId, (p) =>
        p.trackIds.includes(trackId) ? {} : { trackIds: [...p.trackIds, trackId] },
      ),
    })),

  removeTrackFromPlaylist: (playlistId, index) =>
    set((s) => ({
      playlists: patchPlaylist(s.playlists, playlistId, (p) => ({
        trackIds: p.trackIds.filter((_, i) => i !== index),
      })),
    })),

  reorderPlaylistTracks: (playlistId, from, to) =>
    set((s) => ({
      playlists: patchPlaylist(s.playlists, playlistId, (p) => {
        if (
          from === to ||
          from < 0 ||
          from >= p.trackIds.length ||
          to < 0 ||
          to >= p.trackIds.length
        ) {
          return {};
        }
        const trackIds = [...p.trackIds];
        const [moved] = trackIds.splice(from, 1);
        trackIds.splice(to, 0, moved);
        return { trackIds };
      }),
    })),

  purgeTrack: (trackId) =>
    set((s) => ({
      playlists: s.playlists.map((p) =>
        p.trackIds.includes(trackId)
          ? { ...p, trackIds: p.trackIds.filter((id) => id !== trackId), updatedAt: Date.now() }
          : p,
      ),
    })),

  remapTrackIds: (mapping) =>
    set((s) => {
      if (Object.keys(mapping).length === 0) return s;
      return {
        playlists: s.playlists.map((p) => {
          if (!p.trackIds.some((id) => id in mapping)) return p;
          return {
            ...p,
            trackIds: p.trackIds.map((id) => mapping[id] ?? id),
            updatedAt: Date.now(),
          };
        }),
      };
    }),

  setPlaylists: (playlists) => set({ playlists }),
  clear: () => set({ playlists: [] }),
}));

/**
 * Persiste as playlists a cada mudanca.
 *
 * Uma assinatura unica evita ter de lembrar de salvar em cada uma das oito
 * acoes que mexem na lista — e de esquecer numa delas. Nao salva durante a
 * hidratacao, que so devolveria ao disco o que acabou de vir dele.
 */
usePlaylistStore.subscribe((state, previous) => {
  if (!state.isHydrated) return;
  if (state.playlists === previous.playlists) return;
  void savePlaylists(state.playlists);
});
