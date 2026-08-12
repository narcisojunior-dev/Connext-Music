import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { SettingsRow, SettingsSection } from '@/components/settings/SettingsRow';
import { SleepTimerModal, sleepTimerLabel } from '@/components/settings/SleepTimerModal';
import { Text } from '@/components/ui/text';
import { useContentBottomInset } from '@/hooks/use-content-inset';
import { useLibraryScanner } from '@/hooks/use-library-scanner';
import { useTheme } from '@/hooks/use-theme';
import {
  clearArtworkCache,
  formatBytes,
  partitionMissing,
  summarizeLibrary,
} from '@/services/file/library-maintenance';
import { useLibraryStore } from '@/stores/library-store';
import { FADE_MAX_SECONDS, useSettingsStore } from '@/stores/settings-store';
import { formatTotalDuration } from '@/utils/formatters';

export default function SettingsScreen() {
  const theme = useTheme();
  const bottomInset = useContentBottomInset();
  const { scan, isScanning } = useLibraryScanner();

  const tracks = useLibraryStore((s) => s.tracks);
  const setLibrary = useLibraryStore((s) => s.setLibrary);

  const fadeEnabled = useSettingsStore((s) => s.fadeEnabled);
  const fadeSeconds = useSettingsStore((s) => s.fadeSeconds);
  const normalizationEnabled = useSettingsStore((s) => s.normalizationEnabled);
  const sleepTimer = useSettingsStore((s) => s.sleepTimer);
  const setFadeEnabled = useSettingsStore((s) => s.setFadeEnabled);
  const setFadeSeconds = useSettingsStore((s) => s.setFadeSeconds);
  const setNormalizationEnabled = useSettingsStore((s) => s.setNormalizationEnabled);

  const [timerOpen, setTimerOpen] = useState(false);

  // Medir o cache de capas toca o disco, então só quando a biblioteca muda.
  const summary = useMemo(() => summarizeLibrary(tracks), [tracks]);

  const handleRescan = useCallback(() => {
    Alert.alert(
      'Reescanear biblioteca',
      'Todas as faixas serão lidas de novo, ignorando o cache. Pode levar alguns minutos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Reescanear', onPress: () => void scan({ full: true }) },
      ],
    );
  }, [scan]);

  const handleClearArtwork = useCallback(() => {
    Alert.alert(
      'Limpar cache de capas',
      'As capas serão apagadas e lidas de novo dos arquivos. A biblioteca será reescaneada em seguida.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: () => {
            const freed = clearArtworkCache();
            // Reescaneia logo depois porque as faixas ficaram apontando para
            // capas que não existem mais; sem isso a biblioteca fica sem
            // nenhuma imagem até o próximo scan.
            void scan({ full: true }).then(() => {
              Alert.alert('Cache limpo', `${formatBytes(freed)} liberados.`);
            });
          },
        },
      ],
    );
  }, [scan]);

  const handleRemoveMissing = useCallback(() => {
    const { present, missing } = partitionMissing(tracks);

    if (missing.length === 0) {
      Alert.alert('Nada a remover', 'Todos os arquivos da biblioteca existem no disco.');
      return;
    }

    Alert.alert(
      'Excluir músicas não encontradas',
      `${missing.length} ${missing.length === 1 ? 'faixa aponta' : 'faixas apontam'} para arquivos que não existem mais. Remover da biblioteca?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          // Só a biblioteca é alterada; os arquivos em si não são tocados —
          // eles já não estão lá.
          onPress: () => setLibrary(present),
        },
      ],
    );
  }, [tracks, setLibrary]);

  const version = Constants.expoConfig?.version ?? '—';

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 24 }]}
    >
      <SettingsSection title="Reprodução">
        <SettingsRow
          title="Fade entre faixas"
          description={`Baixa o volume nos últimos ${fadeSeconds}s da faixa`}
          icon="swap-horizontal"
          value={fadeEnabled}
          onValueChange={setFadeEnabled}
        />
        <SettingsRow
          title="Duração do fade"
          description="Toque para variar entre 0 e 5 segundos"
          icon="timer-outline"
          detail={`${fadeSeconds}s`}
          disabled={!fadeEnabled}
          // Passo circular em vez de slider: são seis valores inteiros, e um
          // slider de 5px de curso seria mais difícil de acertar que um toque.
          onPress={() => setFadeSeconds((fadeSeconds + 1) % (FADE_MAX_SECONDS + 1))}
        />
        <SettingsRow
          title="Normalizar volume"
          description="Usa o ReplayGain gravado no arquivo, quando existe"
          icon="options-outline"
          value={normalizationEnabled}
          onValueChange={setNormalizationEnabled}
        />
      </SettingsSection>

      <SettingsSection title="Sleep Timer">
        <SettingsRow
          title={sleepTimer ? 'Timer ativo' : 'Programar timer'}
          description={
            sleepTimer
              ? `${sleepTimerLabel(sleepTimer.option)} — toque para alterar`
              : 'Pausa a música sozinha, com fade-out'
          }
          icon="moon-outline"
          onPress={() => setTimerOpen(true)}
        />
      </SettingsSection>

      <SettingsSection title="Biblioteca">
        <SettingsRow
          title="Faixas"
          detail={String(summary.trackCount)}
          icon="musical-notes-outline"
        />
        <SettingsRow
          title="Espaço ocupado"
          detail={formatBytes(summary.totalBytes)}
          icon="folder-outline"
        />
        <SettingsRow
          title="Duração total"
          detail={formatTotalDuration(summary.totalSeconds)}
          icon="hourglass-outline"
        />
        <SettingsRow
          title="Cache de capas"
          detail={formatBytes(summary.artworkBytes)}
          icon="image-outline"
        />
        <SettingsRow
          title={isScanning ? 'Escaneando…' : 'Reescanear biblioteca'}
          icon="refresh-outline"
          disabled={isScanning}
          onPress={handleRescan}
        />
        <SettingsRow
          title="Limpar cache de capas"
          icon="trash-outline"
          disabled={isScanning}
          onPress={handleClearArtwork}
        />
        <SettingsRow
          title="Excluir músicas não encontradas"
          icon="alert-circle-outline"
          destructive
          disabled={isScanning}
          onPress={handleRemoveMissing}
        />
      </SettingsSection>

      <SettingsSection title="Como adicionar músicas">
        <View style={styles.faq}>
          <Text variant="caption" color="textSecondary">
            Conecte o iPhone ao computador, abra o dispositivo no Finder, vá em Arquivos e arraste
            suas músicas para o Connext Music. Pelo próprio iPhone, o app Arquivos também funciona:
            copie os arquivos para a pasta do Connext Music em “No meu iPhone”.
          </Text>
          <Text variant="caption" color="textSecondary">
            Formatos aceitos: MP3, M4A, AAC, FLAC, WAV e OGG. Depois de copiar, use “Reescanear
            biblioteca” acima.
          </Text>
        </View>
      </SettingsSection>

      <SettingsSection title="Sobre">
        <SettingsRow title="Versão" detail={version} icon="information-circle-outline" />
        <SettingsRow
          title="Reprodução"
          detail="react-native-track-player"
          icon="hardware-chip-outline"
        />
        <SettingsRow
          title="Estatísticas"
          icon="stats-chart-outline"
          onPress={() => router.push('/stats')}
        />
        <SettingsRow
          title="Design System"
          icon="color-palette-outline"
          onPress={() => router.push('/design-system')}
        />
      </SettingsSection>

      <SleepTimerModal visible={timerOpen} onClose={() => setTimerOpen(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 20,
  },
  faq: {
    paddingVertical: 10,
    gap: 8,
  },
});
