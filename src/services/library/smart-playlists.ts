import type { Track } from '@/types/track';

/** Quantas faixas cada lista automática mostra. */
export const SMART_PLAYLIST_LIMIT = 50;

export type SmartPlaylistId = 'favorites' | 'recently-added' | 'most-played' | 'never-played';

export interface SmartPlaylist {
  id: SmartPlaylistId;
  name: string;
  /** Frase curta que explica a regra, mostrada abaixo do nome. */
  rule: string;
  icon: string;
  tracks: Track[];
}

/**
 * Listas derivadas da biblioteca.
 *
 * Nada aqui é salvo: as quatro são calculadas a partir de `tracks` na hora em
 * que a tela renderiza. Guardá-las no `playlist-store` significaria mantê-las
 * em dia a cada favorito e a cada reprodução — e uma lista "Mais Tocadas"
 * desatualizada é pior que nenhuma. Como consequência elas não aceitam edição,
 * o que é o comportamento certo: quem define o conteúdo é a regra.
 */
export function buildSmartPlaylists(tracks: Track[]): SmartPlaylist[] {
  return [
    {
      id: 'favorites',
      name: 'Favoritas',
      rule: 'Faixas marcadas com coração',
      icon: 'heart',
      tracks: tracks.filter((t) => t.isFavorite),
    },
    {
      id: 'recently-added',
      name: 'Recentemente Adicionadas',
      rule: `As ${SMART_PLAYLIST_LIMIT} últimas que entraram na biblioteca`,
      icon: 'sparkles',
      tracks: [...tracks].sort((a, b) => b.addedAt - a.addedAt).slice(0, SMART_PLAYLIST_LIMIT),
    },
    {
      id: 'most-played',
      name: 'Mais Tocadas',
      rule: `Top ${SMART_PLAYLIST_LIMIT} por número de reproduções`,
      icon: 'flame',
      // Faixas nunca tocadas ficam de fora: com a biblioteca recém-escaneada
      // todas empatam em zero, e a lista viraria uma cópia arbitrária da
      // biblioteca em vez de um ranking.
      tracks: tracks
        .filter((t) => t.playCount > 0)
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, SMART_PLAYLIST_LIMIT),
    },
    {
      id: 'never-played',
      name: 'Nunca Tocadas',
      rule: 'Faixas que você ainda não ouviu',
      icon: 'moon',
      tracks: tracks.filter((t) => t.playCount === 0),
    },
  ];
}

/** Busca uma lista automática por id, ou `null` se o id não existe. */
export function findSmartPlaylist(tracks: Track[], id: string): SmartPlaylist | null {
  return buildSmartPlaylists(tracks).find((p) => p.id === id) ?? null;
}
