import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import {
  describeImport,
  matchTracks,
  parsePlaylistFile,
  playlistFileName,
  serializePlaylist,
} from '@/services/playlist/playlist-transfer';
import { useLibraryStore } from '@/stores/library-store';
import { usePlaylistStore } from '@/stores/playlist-store';
import type { Playlist } from '@/types/playlist';

/**
 * Pasta temporária dos arquivos gerados para compartilhar.
 *
 * Fica no cache, e não em `Documents/`: o arquivo só precisa existir até a
 * folha de compartilhamento terminar de copiá-lo, e em `Documents/` ele
 * apareceria junto das músicas no app Arquivos.
 */
const EXPORT_DIRECTORY = 'playlist-exports';

export function usePlaylistTransfer() {
  const library = useLibraryStore((s) => s.tracks);
  const playlists = usePlaylistStore((s) => s.playlists);
  const setPlaylists = usePlaylistStore((s) => s.setPlaylists);
  const createPlaylist = usePlaylistStore((s) => s.createPlaylist);

  const exportPlaylist = useCallback(
    async (playlist: Playlist) => {
      try {
        if (!(await Sharing.isAvailableAsync())) {
          Alert.alert('Indisponível', 'Compartilhamento não está disponível neste aparelho.');
          return;
        }

        const payload = serializePlaylist(playlist, library);

        if (payload.tracks.length === 0) {
          Alert.alert(
            'Playlist vazia',
            'Não há faixas para exportar. Adicione músicas antes de compartilhar.',
          );
          return;
        }

        const directory = new Directory(Paths.cache, EXPORT_DIRECTORY);
        if (!directory.exists) directory.create({ intermediates: true });

        const file = new File(directory, playlistFileName(playlist.name));
        if (file.exists) file.delete();
        file.create();
        // Indentado: o arquivo é aberto por gente, não só pelo app, e a issue
        // pede um JSON legível.
        file.write(JSON.stringify(payload, null, 2));

        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: `Compartilhar “${playlist.name}”`,
          UTI: 'public.json',
        });
      } catch (error) {
        console.warn('[playlist] falha ao exportar:', error);
        Alert.alert('Exportação', 'Não foi possível exportar esta playlist.');
      }
    },
    [library],
  );

  const importPlaylist = useCallback(async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        // MIME types, não UTIs: o módulo converte com `UTType(mimeType:)` e
        // descarta o que não converter, então uma lista de UTIs chegaria vazia
        // ao seletor e nada ficaria selecionável.
        //
        // `*/*` é rede de segurança: um arquivo de playlist que o iOS tipar
        // como genérico ficaria inalcançável, e um recurso que não dá para
        // usar é pior que um seletor pouco filtrado. Quem decide de fato é a
        // validação do conteúdo, que rejeita o que não for nosso com uma
        // mensagem clara.
        type: ['application/json', '*/*'],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (picked.canceled || !picked.assets?.length) return;

      const asset = picked.assets[0];
      let contents: string;
      try {
        contents = new File(asset.uri).textSync();
      } catch (error) {
        console.warn('[playlist] falha ao ler o arquivo:', error);
        Alert.alert('Importação', 'Não foi possível ler o arquivo escolhido.');
        return;
      }

      const parsed = parsePlaylistFile(contents);
      if (!parsed.ok) {
        Alert.alert('Importação', parsed.reason);
        return;
      }

      const match = matchTracks(parsed.playlist.tracks, library);

      // `createPlaylist` cuida do id e dos timestamps; preencher as faixas
      // exige um segundo passo porque ele nasce vazio.
      const created = createPlaylist(parsed.playlist.name, parsed.playlist.description);
      setPlaylists(
        usePlaylistStore
          .getState()
          .playlists.map((p) =>
            p.id === created.id ? { ...p, trackIds: match.trackIds, updatedAt: Date.now() } : p,
          ),
      );

      Alert.alert('Importação', describeImport(parsed.playlist.name, match));
    } catch (error) {
      console.warn('[playlist] falha ao importar:', error);
      Alert.alert('Importação', 'Não foi possível importar a playlist.');
    }
  }, [library, createPlaylist, setPlaylists]);

  return { exportPlaylist, importPlaylist, playlistCount: playlists.length };
}
