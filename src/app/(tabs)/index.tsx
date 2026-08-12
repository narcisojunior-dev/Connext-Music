import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AlbumGrid,
  ArtistSection,
  GenreList,
  LibraryTabs,
  ScanProgress,
  TrackList,
  type LibraryTab,
} from '@/components/library';
import { TrackActionsSheet } from '@/components/track/TrackActionsSheet';
import { Button } from '@/components/ui/button';
import { PlaceholderScreen } from '@/components/ui/placeholder-screen';
import { useLibraryScanner } from '@/hooks/use-library-scanner';
import { useMusicImport } from '@/hooks/use-music-import';
import { playQueue } from '@/services/player/queue-manager';
import { useLibraryStore } from '@/stores/library-store';
import { usePlayerStore } from '@/stores/player-store';
import type { Album } from '@/types/album';
import type { Track } from '@/types/track';
import {
  groupByAlbum,
  groupByArtist,
  groupByGenre,
  sortByTitle,
  type GenreGroup,
} from '@/utils/library-helpers';

/**
 * Tela principal — Biblioteca.
 *
 * Exibe a coleção de músicas do usuário em 4 modos:
 * - **Todas** — lista flat alfabética com `TrackList`
 * - **Artistas** — `SectionList` agrupada com `ArtistSection`
 * - **Álbuns** — grid 2 colunas com `AlbumGrid`
 * - **Gêneros** — lista com contagem com `GenreList`
 *
 * Pull-to-refresh inicia o scan em qualquer aba. A barra de progresso animada
 * (`ScanProgress`) aparece no topo de todas as listas.
 */
export default function LibraryScreen() {
  const tracks = useLibraryStore((s) => s.tracks);
  const isScanning = useLibraryStore((s) => s.isScanning);
  const isHydrated = useLibraryStore((s) => s.isHydrated);
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id ?? null);
  const { scan } = useLibraryScanner();
  const { importFiles, isImporting, progress } = useMusicImport();

  const [activeTab, setActiveTab] = useState<LibraryTab>('all');

  // ──────────────────────────────────────────────────── dados derivados

  const sortedTracks = useMemo(() => sortByTitle(tracks), [tracks]);
  const favorites = useMemo(() => sortedTracks.filter((t) => t.isFavorite), [sortedTracks]);

  /** Faixa cujo toque longo abriu a folha de ações; `null` mantém fechada. */
  const [actionsTrack, setActionsTrack] = useState<Track | null>(null);
  const artists = useMemo(() => groupByArtist(tracks), [tracks]);
  const albums = useMemo(() => groupByAlbum(tracks), [tracks]);
  const genres = useMemo(() => groupByGenre(tracks), [tracks]);

  // ──────────────────────────────────────────────────── callbacks

  const handleRefresh = useCallback(() => {
    scan();
  }, [scan]);

  /**
   * Toca a partir da faixa tocada.
   *
   * `list` existe porque a fila precisa ser a lista **visível** — tocar uma
   * favorita deve enfileirar só as favoritas, não a biblioteca inteira.
   */
  const handleTrackPress = useCallback(
    (_track: Track, index: number, list: Track[] = sortedTracks) => {
      // Navega ao player imediatamente; o áudio carrega em paralelo.
      router.push('/player');
      playQueue(list, index).catch((error) =>
        console.warn('[player] não foi possível iniciar a reprodução:', error),
      );
    },
    [sortedTracks],
  );

  /** Ao tocar numa faixa dentro de um artista, toca todas as faixas daquele contexto. */
  const handleArtistTrackPress = useCallback(
    (_track: Track, allTracks: Track[], indexInAll: number) => {
      router.push('/player');
      playQueue(allTracks, indexInAll).catch((error) =>
        console.warn('[player] não foi possível iniciar a reprodução:', error),
      );
    },
    [],
  );

  /** Tocar no álbum reproduz todas as faixas dele. */
  const handleAlbumPress = useCallback((album: Album) => {
    if (album.tracks.length === 0) return;
    router.push('/player');
    playQueue(album.tracks, 0).catch((error) =>
      console.warn('[player] não foi possível iniciar a reprodução:', error),
    );
  }, []);

  /** Tocar no gênero reproduz todas as faixas dele. */
  const handleGenrePress = useCallback((genre: GenreGroup) => {
    if (genre.tracks.length === 0) return;
    router.push('/player');
    playQueue(genre.tracks, 0).catch((error) =>
      console.warn('[player] não foi possível iniciar a reprodução:', error),
    );
  }, []);

  // ──────────────────────────────────────────────────── scan progress header

  const scanHeader = useMemo(() => <ScanProgress />, []);

  // ──────────────────────────────────────────────────── guards

  // Sem este guarda, a tela de "nenhuma música" pisca a cada abertura antes de
  // a biblioteca salva terminar de carregar.
  if (!isHydrated) {
    return <View style={styles.container} />;
  }

  if (tracks.length === 0 && !isScanning) {
    return (
      <View style={styles.container}>
        <PlaceholderScreen
          title="Biblioteca"
          description="Nenhuma música encontrada. Puxe para baixo para escanear a pasta Documents do app."
          icon="musical-notes-outline"
          issue="Issue #10"
        />
        <View style={styles.actions}>
          {/* Importar vem primeiro: numa biblioteca vazia, escanear nao tem o
              que achar — o usuario precisa antes colocar musica no aparelho. */}
          <Button
            title={
              progress && progress.total > 0
                ? `Importando ${progress.current}/${progress.total}…`
                : isImporting
                  ? 'Importando…'
                  : 'Importar músicas'
            }
            onPress={() => void importFiles()}
            disabled={isImporting}
          />
          <Button title="Escanear biblioteca" variant="secondary" onPress={() => scan()} />
        </View>
      </View>
    );
  }

  // ──────────────────────────────────────────────────── render

  return (
    <View style={styles.container}>
      <LibraryTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'all' && (
        <TrackList
          tracks={sortedTracks}
          currentTrackId={currentTrackId}
          refreshing={isScanning}
          onRefresh={handleRefresh}
          onTrackPress={handleTrackPress}
          onTrackLongPress={setActionsTrack}
          header={scanHeader}
        />
      )}

      {activeTab === 'favorites' && (
        <TrackList
          tracks={favorites}
          currentTrackId={currentTrackId}
          refreshing={isScanning}
          onRefresh={handleRefresh}
          onTrackPress={(track, index) => handleTrackPress(track, index, favorites)}
          onTrackLongPress={setActionsTrack}
          emptyText={'Nenhuma favorita ainda.\nToque no coração de uma música.'}
        />
      )}

      {activeTab === 'artists' && (
        <ArtistSection
          artists={artists}
          currentTrackId={currentTrackId}
          refreshing={isScanning}
          onRefresh={handleRefresh}
          onTrackPress={handleArtistTrackPress}
          header={scanHeader}
        />
      )}

      {activeTab === 'albums' && (
        <AlbumGrid
          albums={albums}
          refreshing={isScanning}
          onRefresh={handleRefresh}
          onAlbumPress={handleAlbumPress}
          header={scanHeader}
        />
      )}

      {activeTab === 'genres' && (
        <GenreList
          genres={genres}
          refreshing={isScanning}
          onRefresh={handleRefresh}
          onGenrePress={handleGenrePress}
          header={scanHeader}
        />
      )}
      <TrackActionsSheet track={actionsTrack} onClose={() => setActionsTrack(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actions: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 110,
  },
});
