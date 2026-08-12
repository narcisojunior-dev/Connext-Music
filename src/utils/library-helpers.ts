/**
 * Funções de agrupamento da biblioteca.
 *
 * Álbuns, artistas e gêneros são **derivados** do array de faixas, nunca
 * armazenados separadamente — a fonte de verdade é sempre o conjunto de
 * arquivos em disco (ver nota em `types/album.ts`).
 */
import type { Album } from '@/types/album';
import type { Artist } from '@/types/artist';
import type { Track } from '@/types/track';

// ──────────────────────────────────────────────────────────────── helpers

/** Chave normalizada para evitar colisões entre artistas/álbuns homônimos. */
function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

// ──────────────────────────────────────────────────────────────── albums

/** Agrupa as faixas por álbum + artista. */
export function groupByAlbum(tracks: Track[]): Album[] {
  const map = new Map<string, Album>();

  for (const track of tracks) {
    const key = `${normalizeKey(track.album)}|${normalizeKey(track.artist)}`;

    const existing = map.get(key);
    if (existing) {
      existing.tracks.push(track);
      existing.totalDuration += track.duration;
      if (!existing.artwork && track.artwork) {
        existing.artwork = track.artwork;
      }
      if (!existing.year && track.year) {
        existing.year = track.year;
      }
    } else {
      map.set(key, {
        id: key,
        name: track.album || 'Álbum Desconhecido',
        artist: track.artist || 'Artista Desconhecido',
        year: track.year,
        artwork: track.artwork,
        tracks: [track],
        totalDuration: track.duration,
      });
    }
  }

  // Ordena por nome do álbum.
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

// ──────────────────────────────────────────────────────────────── artists

/** Agrupa as faixas por artista. */
export function groupByArtist(tracks: Track[]): Artist[] {
  const map = new Map<string, { tracks: Track[]; totalDuration: number }>();

  for (const track of tracks) {
    const key = normalizeKey(track.artist || 'Artista Desconhecido');
    const existing = map.get(key);
    if (existing) {
      existing.tracks.push(track);
      existing.totalDuration += track.duration;
    } else {
      map.set(key, { tracks: [track], totalDuration: track.duration });
    }
  }

  return [...map.entries()]
    .map(([key, { tracks: artistTracks, totalDuration }]) => ({
      id: key,
      name: artistTracks[0].artist || 'Artista Desconhecido',
      albums: groupByAlbum(artistTracks),
      tracks: artistTracks,
      totalDuration,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

// ──────────────────────────────────────────────────────────────── genres

export interface GenreGroup {
  id: string;
  name: string;
  trackCount: number;
  tracks: Track[];
  totalDuration: number;
}

/** Agrupa as faixas por gênero. */
export function groupByGenre(tracks: Track[]): GenreGroup[] {
  const map = new Map<string, GenreGroup>();

  for (const track of tracks) {
    const genre = track.genre || 'Sem Gênero';
    const key = normalizeKey(genre);
    const existing = map.get(key);
    if (existing) {
      existing.tracks.push(track);
      existing.trackCount++;
      existing.totalDuration += track.duration;
    } else {
      map.set(key, {
        id: key,
        name: genre,
        trackCount: 1,
        tracks: [track],
        totalDuration: track.duration,
      });
    }
  }

  // Ordena por contagem decrescente, depois por nome.
  return [...map.values()].sort(
    (a, b) => b.trackCount - a.trackCount || a.name.localeCompare(b.name, 'pt-BR'),
  );
}

// ──────────────────────────────────────────────────────────────── sort

/** Ordena faixas alfabeticamente por título. */
export function sortByTitle(tracks: Track[]): Track[] {
  return [...tracks].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
}
