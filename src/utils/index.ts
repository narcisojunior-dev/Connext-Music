// Funcoes utilitarias puras.
//
// `mock-tracks.ts` fica fora deste barril de proposito: e uma fixture de
// desenvolvimento, nao utilitario de producao, e sai quando o scanner
// substituir os dados de exemplo.
export { generateTrackId, generateUUID } from '@/utils/id-generator';
export { formatDuration, formatFileSize, formatTotalDuration } from '@/utils/formatters';
export {
  groupByAlbum,
  groupByArtist,
  groupByGenre,
  sortByTitle,
  type GenreGroup,
} from '@/utils/library-helpers';
export {
  buildSearchIndex,
  isEmptyResults,
  normalizeSearch,
  searchLibrary,
  splitHighlight,
} from '@/utils/search';
export type { IndexedTrack, SearchFilter, SearchResults, SearchSort } from '@/utils/search';
