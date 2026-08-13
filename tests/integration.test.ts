import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  loadLibrary,
  saveLibrary,
} from '@/services/storage/library-storage';
import { loadPlaylists, savePlaylists } from '@/services/storage/playlist-storage';
import { clearSettings, loadSettings, saveSettings } from '@/services/storage/settings-storage';
import { buildSmartPlaylists } from '@/services/library/smart-playlists';
import { useLibraryStore } from '@/stores/library-store';
import { usePlaylistStore } from '@/stores/playlist-store';
import type { Track } from '@/types/track';

function track(id: string, over: Partial<Track> = {}): Track {
  return {
    id,
    url: `file:///Documents/${id}.mp3`,
    title: `Título ${id}`,
    artist: 'Artista',
    album: 'Álbum',
    genre: 'MPB',
    year: 2020,
    trackNumber: 1,
    duration: 200,
    artwork: null,
    fileName: `${id}.mp3`,
    fileSize: 5_000_000,
    extension: '.mp3',
    modifiedDate: 1_000,
    playCount: 0,
    lastPlayedAt: null,
    isFavorite: false,
    addedAt: 1_000,
    ...over,
  } as Track;
}

/**
 * Fluxos que atravessam mais de uma camada.
 *
 * Os testes unitários cobrem cada peça isolada; estes existem para as costuras
 * — o ponto em que um store fala com o storage, ou em que uma escolha do
 * usuário precisa sobreviver a um recarregamento. Foi numa costura dessas que
 * a Issue #17 achou um bug de meses: favoritar mexia só na memória, porque a
 * biblioteca só era gravada ao fim de um scan.
 */
describe('fluxo: escanear → salvar → recarregar', () => {
  test('a biblioteca sobrevive a um recarregamento', async () => {
    const scanned = [track('a'), track('b'), track('c')];

    await saveLibrary(scanned);
    const reloaded = await loadLibrary();

    assert.equal(reloaded.length, 3);
    assert.deepEqual(
      reloaded.map((t) => t.id),
      ['a', 'b', 'c'],
    );
  });

  test('os campos do usuário voltam intactos', async () => {
    // playCount e isFavorite sao o que se perde primeiro quando a
    // serializacao muda: nao vem do arquivo, so existem no que foi salvo.
    await saveLibrary([track('a', { playCount: 7, isFavorite: true, lastPlayedAt: 99 })]);
    const [reloaded] = await loadLibrary();

    assert.equal(reloaded.playCount, 7);
    assert.equal(reloaded.isFavorite, true);
    assert.equal(reloaded.lastPlayedAt, 99);
    assert.equal(reloaded.addedAt, 1_000);
  });

  test('hidratar o store traz o que foi salvo', async () => {
    useLibraryStore.getState().clear();
    await saveLibrary([track('x'), track('y')]);

    await useLibraryStore.getState().hydrate();

    assert.equal(useLibraryStore.getState().isHydrated, true);
    assert.equal(useLibraryStore.getState().tracks.length, 2);
  });
});

describe('fluxo: criar playlist → adicionar faixa → reproduzir', () => {
  test('a playlist resolve as faixas na ordem salva', async () => {
    usePlaylistStore.getState().clear();
    useLibraryStore.getState().clear();

    const library = [track('a'), track('b'), track('c')];
    useLibraryStore.getState().setLibrary(library);

    const playlist = usePlaylistStore.getState().createPlaylist('Corrida');
    usePlaylistStore.getState().addTrackToPlaylist(playlist.id, 'c');
    usePlaylistStore.getState().addTrackToPlaylist(playlist.id, 'a');

    const saved = usePlaylistStore.getState().playlists[0];
    const byId = new Map(library.map((t) => [t.id, t]));

    // É isto que a tela de detalhe faz para montar a fila: a ordem da
    // playlist manda, não a da biblioteca.
    const queue = saved.trackIds.map((id) => byId.get(id));

    assert.deepEqual(
      queue.map((t) => t?.id),
      ['c', 'a'],
    );
  });

  test('a playlist sobrevive a um recarregamento', async () => {
    usePlaylistStore.getState().clear();
    const created = usePlaylistStore.getState().createPlaylist('Treino', 'para correr');
    usePlaylistStore.getState().addTrackToPlaylist(created.id, 'a');

    await savePlaylists(usePlaylistStore.getState().playlists);
    const reloaded = await loadPlaylists();

    assert.equal(reloaded.length, 1);
    assert.equal(reloaded[0].name, 'Treino');
    assert.equal(reloaded[0].description, 'para correr');
    assert.deepEqual(reloaded[0].trackIds, ['a']);
  });

  test('remover uma faixa da biblioteca não deixa a playlist quebrada', () => {
    usePlaylistStore.getState().clear();
    useLibraryStore.getState().clear();
    useLibraryStore.getState().setLibrary([track('a'), track('b')]);

    const playlist = usePlaylistStore.getState().createPlaylist('X');
    usePlaylistStore.getState().addTrackToPlaylist(playlist.id, 'a');
    usePlaylistStore.getState().addTrackToPlaylist(playlist.id, 'b');

    usePlaylistStore.getState().purgeTrack('a');

    assert.deepEqual(usePlaylistStore.getState().playlists[0].trackIds, ['b']);
  });
});

describe('fluxo: favoritar → aparecer em Favoritas', () => {
  test('favoritar coloca a faixa na lista automática', () => {
    useLibraryStore.getState().clear();
    useLibraryStore.getState().setLibrary([track('a'), track('b'), track('c')]);

    useLibraryStore.getState().toggleFavorite('b');

    const favoritas = buildSmartPlaylists(useLibraryStore.getState().tracks).find(
      (p) => p.id === 'favorites',
    );

    assert.deepEqual(favoritas?.tracks.map((t) => t.id), ['b']);
  });

  test('desfavoritar tira da lista', () => {
    useLibraryStore.getState().clear();
    useLibraryStore.getState().setLibrary([track('a', { isFavorite: true })]);

    useLibraryStore.getState().toggleFavorite('a');

    const favoritas = buildSmartPlaylists(useLibraryStore.getState().tracks).find(
      (p) => p.id === 'favorites',
    );

    assert.deepEqual(favoritas?.tracks, []);
  });

  test('o favorito sobrevive a um recarregamento', async () => {
    useLibraryStore.getState().clear();
    useLibraryStore.getState().setLibrary([track('a'), track('b')]);
    useLibraryStore.getState().toggleFavorite('a');

    // A gravação do store é debounced; o teste exercita o caminho do storage
    // diretamente, que é o que ela acaba chamando.
    await saveLibrary(useLibraryStore.getState().tracks);
    const reloaded = await loadLibrary();

    assert.equal(reloaded.find((t) => t.id === 'a')?.isFavorite, true);
    assert.equal(reloaded.find((t) => t.id === 'b')?.isFavorite, false);
  });
});

describe('fluxo: preferências', () => {
  test('as preferências sobrevivem a um recarregamento', async () => {
    await saveSettings({ fadeEnabled: true, fadeSeconds: 4, normalizationEnabled: true });
    const reloaded = await loadSettings();

    assert.deepEqual(reloaded, {
      fadeEnabled: true,
      fadeSeconds: 4,
      normalizationEnabled: true,
    });
  });

  test('sem nada salvo, devolve null para o store usar os padrões', async () => {
    await clearSettings();
    assert.equal(await loadSettings(), null);
  });

  test('um valor corrompido não vira `undefined` no store', async () => {
    // Um campo undefined tornaria o interruptor da tela não-controlado, e o
    // React reclama disso em runtime.
    await saveSettings({
      fadeEnabled: 'sim' as unknown as boolean,
      fadeSeconds: 'muito' as unknown as number,
      normalizationEnabled: true,
    });

    const reloaded = await loadSettings();
    assert.equal(typeof reloaded?.fadeEnabled, 'boolean');
    assert.equal(typeof reloaded?.fadeSeconds, 'number');
    assert.equal(reloaded?.normalizationEnabled, true);
  });
});
