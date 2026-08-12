import type { Track } from '@/types/track';

/**
 * Um album da biblioteca (Issue #10, seção "Álbuns").
 *
 * **Derivado, nunca armazenado.** Albuns nao existem como registro proprio: sao
 * o resultado de agrupar as faixas por album + artista. Guardar uma copia
 * exigiria mante-la em sincronia a cada scan, e a fonte de verdade continua
 * sendo o conjunto de arquivos em disco.
 */
export interface Album {
  /** `album|artist` normalizado. Dois albuns homonimos de artistas distintos nao colidem. */
  id: string;
  name: string;
  artist: string;
  year: number | null;
  /** Capa da primeira faixa que tiver uma. */
  artwork: string | null;
  tracks: Track[];
  /** Soma da duracao das faixas, em segundos. */
  totalDuration: number;
}
