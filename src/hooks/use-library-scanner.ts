import { useCallback } from 'react';

import { scanMusicLibrary } from '@/services/file/file-scanner';
import { useLibraryStore } from '@/stores/library-store';

/**
 * Dispara o scan da biblioteca e mantem o `useLibraryStore` em dia.
 *
 * A UI le progresso e resultado do store, nao daqui — assim a barra de
 * progresso pode viver em qualquer tela sem precisar do hook. A versao completa
 * (scan incremental, contagem de arquivos removidos) chega nas Issues #7 e #10.
 */
export function useLibraryScanner() {
  const setScanning = useLibraryStore((s) => s.setScanning);
  const setScanProgress = useLibraryStore((s) => s.setScanProgress);
  const setLibrary = useLibraryStore((s) => s.setLibrary);
  const isScanning = useLibraryStore((s) => s.isScanning);

  const scan = useCallback(async () => {
    // Um segundo scan em paralelo so duplicaria trabalho e embaralharia o progresso.
    if (useLibraryStore.getState().isScanning) return;

    setScanning(true);
    try {
      const result = await scanMusicLibrary((current, total, fileName) =>
        setScanProgress({ current, total, fileName }),
      );
      setLibrary(result.tracks);
      console.log(
        `[scanner] ${result.tracks.length} faixas em ${result.elapsedMs}ms` +
          (result.failed > 0 ? ` (${result.failed} falharam)` : ''),
      );
      return result;
    } finally {
      // No `finally` para a UI nao ficar presa em "escaneando" se algo estourar.
      setScanning(false);
    }
  }, [setScanning, setScanProgress, setLibrary]);

  return { scan, isScanning };
}
