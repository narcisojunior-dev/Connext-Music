import type { Album } from '@/types/album';
import type { Artist } from '@/types/artist';
import type { Track } from '@/types/track';

export type SearchFilter = 'all' | 'tracks' | 'artists' | 'albums' | 'genres';
export type SearchSort = 'relevance' | 'alphabetical' | 'recent';

/**
 * Normaliza texto para comparação.
 *
 * Remove acentos além de baixar a caixa: em português isso é obrigatório —
 * quem procura por "coracao" espera achar "Coração", e quem digita no teclado
 * do iPhone raramente acentua ao buscar.
 */
export function normalizeSearch(text: string): string {
  return foldText(text).trim();
}

/**
 * Baixa a caixa e remove acentos **sem alterar o comprimento**.
 *
 * Cada caractere precomposto (é) vira base + diacrítico na decomposição NFD e
 * volta a um caractere quando o diacrítico sai. Preservar o comprimento é o que
 * permite ao destaque usar índices calculados sobre o texto normalizado para
 * recortar o texto original — por isso o `trim()` fica de fora daqui.
 */
function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Peso de cada campo na relevância.
 *
 * O título vale mais que o artista, que vale mais que o álbum: quem digita
 * quase sempre está procurando uma música específica, não navegando.
 */
const FIELD_WEIGHT = { title: 8, artist: 5, album: 3, genre: 1 } as const;

/**
 * Pontua um campo contra o termo buscado.
 *
 * Casar do início vale mais que casar no meio — "lua" deve trazer "Luar" antes
 * de "Aluado". Retorna 0 quando não casa.
 */
function scoreField(value: string, query: string): number {
  if (!value) return 0;
  const index = value.indexOf(query);
  if (index < 0) return 0;
  if (value === query) return 3;
  if (index === 0) return 2;
  // Início de palavra conta quase como início do campo.
  if (value[index - 1] === ' ') return 1.5;
  return 1;
}

/** Faixa com os campos já normalizados, para não repetir o trabalho a cada tecla. */
export interface IndexedTrack {
  track: Track;
  title: string;
  artist: string;
  album: string;
  genre: string;
}

/**
 * Prepara a biblioteca para busca.
 *
 * Normalizar 1000 faixas × 4 campos a cada tecla digitada seria o gargalo da
 * tela. O índice é construído uma vez por mudança da biblioteca e reaproveitado
 * em todas as buscas.
 */
export function buildSearchIndex(tracks: Track[]): IndexedTrack[] {
  return tracks.map((track) => ({
    track,
    title: normalizeSearch(track.title),
    artist: normalizeSearch(track.artist),
    album: normalizeSearch(track.album),
    genre: normalizeSearch(track.genre),
  }));
}

export interface SearchResults {
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  genres: string[];
}

const EMPTY: SearchResults = { tracks: [], artists: [], albums: [], genres: [] };

function sortTracks(scored: { track: Track; score: number }[], sort: SearchSort): Track[] {
  const ordered = [...scored];

  if (sort === 'alphabetical') {
    ordered.sort((a, b) => a.track.title.localeCompare(b.track.title, 'pt-BR'));
  } else if (sort === 'recent') {
    // "Recente" é data de modificação do arquivo, não última reprodução:
    // `lastPlayedAt` é null na maioria das faixas de uma biblioteca nova, o que
    // deixaria a ordenação praticamente arbitrária.
    ordered.sort((a, b) => b.track.modifiedDate - a.track.modifiedDate);
  } else {
    ordered.sort(
      (a, b) => b.score - a.score || a.track.title.localeCompare(b.track.title, 'pt-BR'),
    );
  }

  return ordered.map((s) => s.track);
}

/**
 * Busca em títulos, artistas, álbuns e gêneros.
 *
 * `artists` e `albums` trazem só aqueles cujo **nome** casa com o termo — e não
 * todos os artistas das faixas encontradas, que encheria a seção de ruído.
 */
export function searchLibrary(
  index: IndexedTrack[],
  rawQuery: string,
  options: { filter?: SearchFilter; sort?: SearchSort } = {},
): SearchResults {
  const query = normalizeSearch(rawQuery);
  if (!query) return EMPTY;

  const { filter = 'all', sort = 'relevance' } = options;

  const scored: { track: Track; score: number }[] = [];
  const artistMap = new Map<string, Track[]>();
  const albumMap = new Map<string, { name: string; artist: string; tracks: Track[] }>();
  const genreSet = new Map<string, string>();

  for (const item of index) {
    const score =
      scoreField(item.title, query) * FIELD_WEIGHT.title +
      scoreField(item.artist, query) * FIELD_WEIGHT.artist +
      scoreField(item.album, query) * FIELD_WEIGHT.album +
      scoreField(item.genre, query) * FIELD_WEIGHT.genre;

    if (score > 0) scored.push({ track: item.track, score });

    if (scoreField(item.artist, query) > 0) {
      const list = artistMap.get(item.artist) ?? [];
      list.push(item.track);
      artistMap.set(item.artist, list);
    }
    if (scoreField(item.album, query) > 0) {
      const key = `${item.album}|${item.artist}`;
      const entry = albumMap.get(key) ?? {
        name: item.track.album,
        artist: item.track.artist,
        tracks: [],
      };
      entry.tracks.push(item.track);
      albumMap.set(key, entry);
    }
    if (item.genre && scoreField(item.genre, query) > 0) {
      genreSet.set(item.genre, item.track.genre);
    }
  }

  const tracks = sortTracks(scored, sort);

  const artists: Artist[] = [...artistMap.entries()]
    .map(([key, list]) => ({
      id: key,
      name: list[0].artist,
      albums: [],
      tracks: list,
      totalDuration: list.reduce((n, t) => n + t.duration, 0),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const albums: Album[] = [...albumMap.entries()]
    .map(([key, entry]) => ({
      id: key,
      name: entry.name,
      artist: entry.artist,
      year: entry.tracks.find((t) => t.year)?.year ?? null,
      artwork: entry.tracks.find((t) => t.artwork)?.artwork ?? null,
      tracks: entry.tracks,
      totalDuration: entry.tracks.reduce((n, t) => n + t.duration, 0),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const genres = [...genreSet.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  // O filtro esvazia as outras seções em vez de mudar a forma do retorno: a
  // tela continua lendo os mesmos campos, sem ramificar por filtro.
  return {
    tracks: filter === 'all' || filter === 'tracks' ? tracks : [],
    artists: filter === 'all' || filter === 'artists' ? artists : [],
    albums: filter === 'all' || filter === 'albums' ? albums : [],
    genres: filter === 'all' || filter === 'genres' ? genres : [],
  };
}

/** `true` quando nenhuma seção tem resultado. */
export function isEmptyResults(results: SearchResults): boolean {
  return (
    results.tracks.length === 0 &&
    results.artists.length === 0 &&
    results.albums.length === 0 &&
    results.genres.length === 0
  );
}

/**
 * Trechos de um texto separando o que casa com o termo.
 *
 * A comparação é feita sobre o texto normalizado, mas os trechos devolvidos são
 * do texto **original** — é o que permite destacar "Coração" quando o usuário
 * digitou "coracao", sem exibir o texto sem acento na tela.
 */
export function splitHighlight(text: string, rawQuery: string): { text: string; match: boolean }[] {
  const query = normalizeSearch(rawQuery);
  if (!query) return [{ text, match: false }];

  // `foldText`, e não `normalizeSearch`: este último apara as pontas, e um
  // título com espaço à esquerda deslocaria todos os índices do destaque.
  const normalized = foldText(text);
  const parts: { text: string; match: boolean }[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const found = normalized.indexOf(query, cursor);
    if (found < 0) {
      parts.push({ text: text.slice(cursor), match: false });
      break;
    }
    if (found > cursor) parts.push({ text: text.slice(cursor, found), match: false });
    parts.push({ text: text.slice(found, found + query.length), match: true });
    cursor = found + query.length;
  }

  return parts.filter((p) => p.text.length > 0);
}
