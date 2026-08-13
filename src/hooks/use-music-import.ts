import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useLibraryScanner } from '@/hooks/use-library-scanner';
import {
  describeImport,
  importMusicFiles,
  type ImportProgress,
} from '@/services/file/file-importer';

/**
 * Importar músicas, do seletor até a biblioteca atualizada.
 *
 * O scan vem depois da cópia porque é ele que lê as tags e gera as faixas — sem
 * ele os arquivos estariam no disco mas invisíveis no app. É incremental, então
 * relê só o que entrou.
 *
 * O alerta de resultado aparece antes do scan de propósito: a cópia é a parte
 * que o usuário está esperando, e segurar o aviso até o fim da varredura faria
 * parecer que nada aconteceu.
 */
export function useMusicImport() {
  const { scan } = useLibraryScanner();
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  const importFiles = useCallback(
    async (subfolder?: string | null) => {
      // Um segundo seletor por cima do primeiro trava a interface no iOS.
      if (progress) return;

      setProgress({ current: 0, total: 0, fileName: '' });
      try {
        const result = await importMusicFiles(setProgress, subfolder);

        if (result.canceled) return;

        Alert.alert('Importação', describeImport(result));

        // Nada copiado, nada a reescanear.
        if (result.imported > 0) await scan();
      } catch (error) {
        console.warn('[import] falha inesperada:', error);
        Alert.alert('Importação', 'Não foi possível importar os arquivos.');
      } finally {
        setProgress(null);
      }
    },
    [progress, scan],
  );

  return {
    importFiles,
    /** Progresso da cópia, ou null quando não há importação em curso. */
    progress,
    isImporting: progress !== null,
  };
}
