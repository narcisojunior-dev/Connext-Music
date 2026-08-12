import { create } from 'zustand';

import type { Playlist } from '@/types/playlist';
import { generateUUID } from '@/utils/id-generator';

export interface PlaylistState {
  playlists: Playlist[];
}

export interface PlaylistActions {
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
export const usePlaylistStore = create<PlaylistStore>()((set) => ({
  playlists: [],

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

  setPlaylists: (playlists) => set({ playlists }),
  clear: () => set({ playlists: [] }),
}));
