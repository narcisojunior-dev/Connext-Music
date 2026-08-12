/**
 * Uma playlist criada pelo usuario (Issue #14).
 *
 * Guarda apenas `trackIds`, nao as faixas inteiras: a faixa vive na biblioteca,
 * e duplicar o objeto aqui abriria espaco para os dois lados divergirem quando
 * o `playCount` ou o `isFavorite` mudassem. A ordem do array e a ordem de
 * reproducao, entao reordenar por arrastar e so reordenar esta lista.
 */
export interface Playlist {
  /** UUID v4 gerado na criacao. */
  id: string;
  name: string;
  description?: string;
  /** IDs de `Track`, na ordem de reproducao. Pode conter IDs orfaos se o arquivo sumir. */
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
}

/** Playlists automaticas, derivadas da biblioteca em vez de criadas a mao (Issue #17). */
export type SmartPlaylistKind = 'favorites' | 'recentlyAdded' | 'mostPlayed' | 'neverPlayed';
