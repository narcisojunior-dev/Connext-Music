import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { TrackItem } from '@/components/library/TrackItem';
import { Text } from '@/components/ui/text';
import { useContentBottomInset } from '@/hooks/use-content-inset';
import { useTheme } from '@/hooks/use-theme';
import {
  buildFolderTree,
  collectFolderTracks,
  findFolder,
  folderTrail,
  type FolderNode,
} from '@/services/library/folders';
import type { Track } from '@/types/track';

const FOLDER_ROW_HEIGHT = 60;

export interface FolderListProps {
  tracks: Track[];
  currentTrackId: string | null;
  /** Recebe a fila já montada e o índice da faixa tocada. */
  onTrackPress: (queue: Track[], index: number) => void;
  onTrackLongPress?: (track: Track) => void;
  /** Abre o seletor de arquivos para trazer uma nova pasta. */
  onImport?: () => void;
  /** Enquanto true, o botão de importar fica desabilitado e mostra o progresso. */
  isImporting?: boolean;
  /** Texto do botão durante a cópia, ex. "Importando 3/12…". */
  importLabel?: string;
}

type Row = { kind: 'folder'; node: FolderNode } | { kind: 'track'; track: Track; index: number };

/**
 * A biblioteca vista como o disco, e não como as tags.
 *
 * Quem organiza a coleção em `Rock/` ou `MPB/1970/` já fez um trabalho de
 * classificação, com um critério próprio que nenhuma tag reproduz. Esta aba
 * mostra esse trabalho.
 *
 * A navegação é por estado interno, não por rota: descer numa pasta não deveria
 * empilhar entradas no botão de voltar do sistema — sair da aba tem que sair da
 * aba, não desfazer sete níveis de pasta.
 */
export function FolderList({
  tracks,
  currentTrackId,
  onTrackPress,
  onTrackLongPress,
  onImport,
  isImporting = false,
  importLabel,
}: FolderListProps) {
  const theme = useTheme();
  const bottomInset = useContentBottomInset();
  const [path, setPath] = useState('');

  const tree = useMemo(() => buildFolderTree(tracks), [tracks]);

  // Uma pasta pode sumir entre dois scans; cair na raiz é melhor que uma tela
  // vazia sem explicação.
  const current = findFolder(tree, path) ?? tree;
  const trail = useMemo(() => folderTrail(tree, current.path), [tree, current.path]);

  const rows = useMemo<Row[]>(
    () => [
      ...current.children.map((node): Row => ({ kind: 'folder', node })),
      ...current.tracks.map((track, index): Row => ({ kind: 'track', track, index })),
    ],
    [current],
  );

  /**
   * A fila é a pasta inteira, incluindo subpastas.
   *
   * Quem abre `Rock/` e toca a primeira faixa espera ouvir `Rock/`, e não parar
   * quando a faixa acabar.
   */
  const handleTrackPress = useCallback(
    (track: Track) => {
      const queue = collectFolderTracks(current);
      const index = queue.findIndex((t) => t.id === track.id);
      onTrackPress(queue, Math.max(0, index));
    },
    [current, onTrackPress],
  );

  const breadcrumb =
    trail.length > 1 ? (
      <View style={styles.breadcrumb}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar uma pasta"
          onPress={() => setPath(trail[trail.length - 2].path)}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={18} color={theme.colors.primary} />
          <Text variant="caption" color="primary" numberOfLines={1}>
            {trail[trail.length - 2].name}
          </Text>
        </Pressable>

        <Text variant="overline" color="textMuted" numberOfLines={1} style={styles.crumbPath}>
          {current.path || ''}
        </Text>
      </View>
    ) : null;

  /**
   * Importar fica aqui, e nao so em Ajustes.
   *
   * Depois da primeira pasta a tela de biblioteca vazia — o unico outro lugar
   * com o botao — nunca mais aparece, e trazer a segunda pasta virava uma
   * caca em Ajustes. A aba Pastas e onde o usuario pensa em pastas.
   */
  const importRow = onImport ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Importar pasta de músicas"
      accessibilityState={{ disabled: isImporting }}
      disabled={isImporting}
      onPress={onImport}
      style={({ pressed }) => [
        styles.importRow,
        {
          borderRadius: theme.radius.card,
          borderColor: theme.colors.primary,
          opacity: isImporting ? 0.6 : 1,
        },
        pressed && { backgroundColor: theme.colors.surface },
      ]}
    >
      <Ionicons name="add-circle-outline" size={22} color={theme.colors.primary} />
      <Text variant="body" color="primary" numberOfLines={1} style={styles.importText}>
        {isImporting ? (importLabel ?? 'Importando…') : 'Importar pasta'}
      </Text>
    </Pressable>
  ) : null;

  const header =
    importRow || breadcrumb ? (
      <View>
        {importRow}
        {breadcrumb}
      </View>
    ) : null;

  // Devolve o `FlatList` direto, sem envolver num `View`, como as outras abas.
  // Envolvido, ele nao ocupava o espaco disponivel e ficava colado na base da
  // tela, com um vazio de uns 800px acima. O breadcrumb entra como cabecalho da
  // propria lista.
  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => (row.kind === 'folder' ? `d:${row.node.path}` : `t:${row.track.id}`)}
      contentContainerStyle={{ paddingBottom: bottomInset }}
      ListHeaderComponent={header}
      maxToRenderPerBatch={15}
      windowSize={7}
      ListEmptyComponent={
        <Text variant="caption" color="textMuted" style={styles.empty}>
          Nenhuma música nesta pasta.
        </Text>
      }
      renderItem={({ item }) => {
        if (item.kind === 'track') {
          return (
            <TrackItem
              track={item.track}
              isActive={item.track.id === currentTrackId}
              onPress={() => handleTrackPress(item.track)}
              onLongPress={onTrackLongPress ? () => onTrackLongPress(item.track) : undefined}
            />
          );
        }

        const { node } = item;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Pasta ${node.name}, ${node.totalTracks} faixas`}
            onPress={() => setPath(node.path)}
            style={({ pressed }) => [
              styles.folderRow,
              { borderRadius: theme.radius.card },
              pressed && { backgroundColor: theme.colors.surface },
            ]}
          >
            <Ionicons name="folder" size={22} color={theme.colors.primary} />
            <View style={styles.folderText}>
              <Text variant="body" numberOfLines={1}>
                {node.name}
              </Text>
              <Text variant="overline" color="textMuted">
                {node.totalTracks} {node.totalTracks === 1 ? 'faixa' : 'faixas'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 1,
  },
  crumbPath: {
    flexShrink: 1,
    textAlign: 'right',
  },
  importRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  importText: {
    flexShrink: 1,
  },
  folderRow: {
    height: FOLDER_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  folderText: {
    flex: 1,
    gap: 1,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: 32,
  },
});
