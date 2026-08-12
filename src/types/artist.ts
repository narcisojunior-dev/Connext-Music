import type { Album } from '@/types/album';
import type { Track } from '@/types/track';

/**
 * Um artista da biblioteca (Issue #10, seção "Artistas").
 *
 * Como `Album`, e derivado do agrupamento das faixas — ver a nota em `album.ts`.
 */
export interface Artist {
  /** Nome normalizado (minusculas, sem espacos nas pontas). */
  id: string;
  name: string;
  albums: Album[];
  tracks: Track[];
  totalDuration: number;
}
