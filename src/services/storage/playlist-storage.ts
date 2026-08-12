import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Playlist } from '@/types/playlist';

const PLAYLISTS_KEY = '@connext/playlists';

/** Ver a nota sobre versionamento em `library-storage.ts`. */
const SCHEMA_VERSION = 1;

interface StoredPlaylists {
  version: number;
  savedAt: number;
  playlists: Playlist[];
}

/** Descarta entradas que não têm a forma de uma `Playlist`. */
function isPlaylist(value: unknown): value is Playlist {
  const p = value as Playlist;
  return (
    !!p &&
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    Array.isArray(p.trackIds) &&
    p.trackIds.every((id) => typeof id === 'string')
  );
}

export async function savePlaylists(playlists: Playlist[]): Promise<void> {
  const payload: StoredPlaylists = { version: SCHEMA_VERSION, savedAt: Date.now(), playlists };
  try {
    await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('[storage] não foi possível salvar as playlists:', error);
  }
}

/**
 * Restaura as playlists salvas.
 *
 * Entradas malformadas são descartadas individualmente, em vez de invalidarem
 * o arquivo inteiro: perder uma playlist corrompida é melhor que perder todas.
 */
export async function loadPlaylists(): Promise<Playlist[]> {
  try {
    const raw = await AsyncStorage.getItem(PLAYLISTS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as Partial<StoredPlaylists>;
    if (parsed?.version !== SCHEMA_VERSION || !Array.isArray(parsed.playlists)) {
      console.warn('[storage] formato de playlists incompatível, descartando');
      return [];
    }
    return parsed.playlists.filter(isPlaylist);
  } catch (error) {
    console.warn('[storage] não foi possível carregar as playlists:', error);
    return [];
  }
}

export async function clearPlaylists(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PLAYLISTS_KEY);
  } catch (error) {
    console.warn('[storage] não foi possível limpar as playlists:', error);
  }
}
