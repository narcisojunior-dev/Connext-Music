// Persistencia local da biblioteca e preferencias.
export {
  addTracksToLibrary,
  clearLibrary,
  loadLibrary,
  saveLibrary,
} from '@/services/storage/library-storage';

export {
  addSearchTerm,
  clearSearchHistory,
  loadSearchHistory,
  MAX_HISTORY,
  removeSearchTerm,
} from '@/services/storage/search-history';
