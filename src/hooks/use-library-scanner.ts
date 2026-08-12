import { useCallback } from 'react';

import { scanMusicLibrary, type ScanResult } from '@/services/file/file-scanner';
import { saveLibrary } from '@/services/storage/library-storage';
import { useLibraryStore } from '@/stores/library-store';
import { usePlaylistStore } from '@/stores/playlist-store';

/**
 * Dispara o scan da biblioteca, mantem o `useLibraryStore` em dia e persiste
 * o resultado.
 *
 * A UI le progresso e resultado do store, nao daqui — assim a barra de
 * progresso pode viver em qualquer tela sem precisar do hook.
 */
export function useLibraryScanner() {
  const setScanning = useLibraryStore((s) => s.setScanning);
  const setScanProgress = useLibraryStore((s) => s.setScanProgress);
  const setLibrary = useLibraryStore((s) => s.setLibrary);
  const isScanning = useLibraryStore((s) => s.isScanning);
  const remapTrackIds = usePlaylistStore((s) => s.remapTrackIds);

  const scan = useCallback(
    async (options?: { full?: boolean }): Promise<ScanResult | undefined> => {
      // Um segundo scan em paralelo so duplicaria trabalho e embaralharia o progresso.
      if (useLibraryStore.getState().isScanning) return;

      setScanning(true);
      try {
        // Sem `knownTracks` o scan e completo: toda faixa e relida. E o que
        // "Reescanear biblioteca" (Issue #18) precisa fazer quando o usuario
        // suspeita que o cache esta errado.
        const knownTracks = options?.full ? [] : useLibraryStore.getState().tracks;

        const result = await scanMusicLibrary({
          knownTracks,
          onProgress: (current, total, fileName) => setScanProgress({ current, total, fileName }),
        });

        setLibrary(result.tracks);
        // As playlists guardam ids; arquivos reeditados ganharam ids novos.
        remapTrackIds(result.remappedIds);
        await saveLibrary(result.tracks);

        console.log(
          `[scanner] ${result.tracks.length} faixas em ${result.elapsedMs}ms ` +
            `(${result.reused} reaproveitadas, ${result.processed} lidas, ${result.removed} removidas` +
            (result.failed > 0 ? `, ${result.failed} falharam` : '') +
            ')',
        );
        return result;
      } finally {
        // No `finally` para a UI nao ficar presa em "escaneando" se algo estourar.
        setScanning(false);
      }
    },
    [setScanning, setScanProgress, setLibrary, remapTrackIds],
  );

  return { scan, isScanning };
}
