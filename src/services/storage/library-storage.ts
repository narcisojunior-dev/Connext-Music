import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Track } from '@/types/track';

const LIBRARY_KEY = '@connext/library';

/**
 * Versao do formato salvo.
 *
 * Guardar isto e o que permite mudar a forma de `Track` no futuro sem quebrar
 * o app de quem ja tem biblioteca salva: se a versao nao bate, descartamos o
 * cache e reescaneamos, em vez de entregar objetos com campos faltando para a
 * UI. Reescanear e barato; um crash na abertura, nao.
 */
// 2: `Track.addedAt` (Issue #17).
// 3: `Track.folderPath` (Issue #28). Bibliotecas antigas sao descartadas e
// reescaneadas — mais barato que inventar dados que nao existem no cache.
const SCHEMA_VERSION = 3;

interface StoredLibrary {
  version: number;
  savedAt: number;
  tracks: Track[];
}

/** Serializa e grava a biblioteca inteira. */
export async function saveLibrary(tracks: Track[]): Promise<void> {
  const payload: StoredLibrary = { version: SCHEMA_VERSION, savedAt: Date.now(), tracks };
  try {
    await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(payload));
  } catch (error) {
    // Falha de escrita nao pode derrubar o app: o pior caso e reescanear na
    // proxima abertura.
    console.warn('[storage] não foi possível salvar a biblioteca:', error);
  }
}

/**
 * Restaura a biblioteca salva.
 *
 * Devolve `[]` quando nao ha nada salvo, quando o formato mudou de versao ou
 * quando o JSON esta corrompido — sempre um array valido, nunca uma excecao.
 */
export async function loadLibrary(): Promise<Track[]> {
  try {
    const raw = await AsyncStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as Partial<StoredLibrary>;
    if (parsed?.version !== SCHEMA_VERSION || !Array.isArray(parsed.tracks)) {
      console.warn('[storage] formato salvo incompatível, descartando cache');
      return [];
    }
    return parsed.tracks;
  } catch (error) {
    console.warn('[storage] não foi possível carregar a biblioteca:', error);
    return [];
  }
}

/**
 * Junta novas faixas as ja salvas, sem duplicar.
 *
 * Faixas com `id` conhecido sao substituidas pela versao nova. Devolve a
 * biblioteca resultante.
 */
export async function addTracksToLibrary(newTracks: Track[]): Promise<Track[]> {
  const existing = await loadLibrary();
  const byId = new Map(existing.map((t) => [t.id, t]));
  for (const track of newTracks) {
    byId.set(track.id, track);
  }

  const merged = [...byId.values()];
  await saveLibrary(merged);
  return merged;
}

/** Apaga a biblioteca salva. */
export async function clearLibrary(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LIBRARY_KEY);
  } catch (error) {
    console.warn('[storage] não foi possível limpar a biblioteca:', error);
  }
}
