import { Directory, File, Paths } from 'expo-file-system';

import type { Track } from '@/types/track';

/** Mesma pasta usada pelo extrator de metadados. */
const ARTWORK_DIRECTORY = 'artworks';

export interface LibrarySummary {
  trackCount: number;
  /** Soma do tamanho dos arquivos de áudio, em bytes. */
  totalBytes: number;
  /** Soma das durações, em segundos. */
  totalSeconds: number;
  /** Tamanho do cache de capas, em bytes. */
  artworkBytes: number;
}

/**
 * Números do "Gerenciamento da biblioteca".
 *
 * O tamanho das faixas sai de `fileSize`, já lido no scan — percorrer o disco
 * de novo só para somar bytes deixaria a tela de Ajustes lenta à toa. Só o
 * cache de capas é medido na hora, porque ninguém guarda esse total.
 */
export function summarizeLibrary(tracks: Track[]): LibrarySummary {
  let totalBytes = 0;
  let totalSeconds = 0;

  for (const track of tracks) {
    totalBytes += track.fileSize;
    totalSeconds += track.duration;
  }

  return {
    trackCount: tracks.length,
    totalBytes,
    totalSeconds,
    artworkBytes: artworkCacheSize(),
  };
}

/** Soma o tamanho das capas em cache. Devolve 0 se a pasta ainda não existe. */
export function artworkCacheSize(): number {
  try {
    const directory = new Directory(Paths.cache, ARTWORK_DIRECTORY);
    if (!directory.exists) return 0;

    let total = 0;
    for (const entry of directory.list()) {
      if (entry instanceof File) total += entry.size ?? 0;
    }
    return total;
  } catch (error) {
    console.warn('[manutenção] não foi possível medir o cache de capas:', error);
    return 0;
  }
}

/**
 * Apaga o cache de capas.
 *
 * As faixas continuam apontando para caminhos que deixaram de existir, então o
 * chamador **precisa** reescanear em seguida — é por isso que a tela oferece as
 * duas coisas no mesmo botão. Devolve quantos bytes foram liberados.
 */
export function clearArtworkCache(): number {
  const freed = artworkCacheSize();
  try {
    const directory = new Directory(Paths.cache, ARTWORK_DIRECTORY);
    if (directory.exists) directory.delete();
  } catch (error) {
    console.warn('[manutenção] não foi possível limpar o cache de capas:', error);
    return 0;
  }
  return freed;
}

/**
 * Separa as faixas cujo arquivo ainda existe das que sumiram.
 *
 * Um arquivo pode sair do disco pelo app Arquivos sem o app saber; a faixa fica
 * na biblioteca e falha ao tocar. Isto acha essas faixas sem reescanear tudo.
 */
export function partitionMissing(tracks: Track[]): { present: Track[]; missing: Track[] } {
  const present: Track[] = [];
  const missing: Track[] = [];

  for (const track of tracks) {
    let exists = false;
    try {
      exists = new File(track.url).exists;
    } catch {
      // Caminho inválido conta como ausente: de qualquer forma não vai tocar.
      exists = false;
    }
    (exists ? present : missing).push(track);
  }

  return { present, missing };
}

/** `1234567` → `1,2 MB`. Usa base decimal, como o iOS mostra no Ajustes. */
export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;

  const units = ['kB', 'MB', 'GB', 'TB'];
  let value = bytes / 1000;
  let unit = 0;

  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }

  return `${value.toFixed(value < 10 ? 1 : 0).replace('.', ',')} ${units[unit]}`;
}
