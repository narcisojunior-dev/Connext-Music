// Varredura do sistema de arquivos, metadados e importacao.
export {
  cleanFileName,
  collectAudioFiles,
  isAudioFile,
  MIN_FILE_SIZE,
  processAudioFile,
  removeDuplicates,
  scanMusicLibrary,
  shouldSkipDirectory,
  SUPPORTED_EXTENSIONS,
} from '@/services/file/file-scanner';
export type { ScanProgressCallback, ScanResult } from '@/services/file/file-scanner';
