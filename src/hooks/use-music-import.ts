import { useCallback, useState } from 'react';
import { Alert, Platform } from 'react-native';

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

  /**
   * Pergunta o nome da pasta antes de abrir o seletor.
   *
   * O seletor do iOS nao informa de que pasta cada arquivo veio, entao a
   * organizacao de origem se perde de qualquer forma. Nomear o lote e o mais
   * perto que da para chegar — e a aba Pastas passa a mostra-lo separado.
   *
   * `Alert.prompt` so existe no iOS; no Android vai direto para o seletor.
   */
  const importWithPrompt = useCallback(() => {
    if (Platform.OS !== 'ios') {
      void importFiles();
      return;
    }

    Alert.prompt(
      'Importar músicas',
      'Nome da pasta para agrupar o que for importado. Deixe em branco para usar “Music”.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Escolher arquivos', onPress: (name?: string) => void importFiles(name?.trim()) },
      ],
      'plain-text',
      '',
    );
  }, [importFiles]);

  return {
    importFiles,
    importWithPrompt,
    /** Progresso da cópia, ou null quando não há importação em curso. */
    progress,
    isImporting: progress !== null,
  };
}
