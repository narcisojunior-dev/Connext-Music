import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { control } from './stubs/async-storage.mjs';
import { clearPlaylists, loadPlaylists, savePlaylists } from '@/services/storage/playlist-storage';
import { usePlaylistStore } from '@/stores/playlist-store';
import type { Playlist } from '@/types/playlist';

function playlist(over: Partial<Playlist> = {}): Playlist {
  return {
    id: `p${Math.random()}`,
    name: 'Treino',
    trackIds: ['a', 'b'],
    createdAt: 1,
    updatedAt: 1,
    ...over,
  };
}

describe('persistência de playlists', () => {
  test('save + load faz round-trip preservando a ordem das faixas', async () => {
    await clearPlaylists();
    await savePlaylists([playlist({ id: 'p1', trackIds: ['c', 'a', 'b'] })]);
    const out = await loadPlaylists();
    assert.equal(out.length, 1);
    assert.deepEqual(out[0].trackIds, ['c', 'a', 'b'], 'a ordem é o conteúdo da playlist');
  });

  test('sem nada salvo devolve lista vazia', async () => {
    await clearPlaylists();
    assert.deepEqual(await loadPlaylists(), []);
  });

  test('JSON corrompido devolve vazio em vez de lançar', async () => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem('@connext/playlists', '{quebrado');
    assert.deepEqual(await loadPlaylists(), []);
  });

  test('versão de esquema incompatível descarta o cache', async () => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(
      '@connext/playlists',
      JSON.stringify({ version: 99, savedAt: 0, playlists: [playlist()] }),
    );
    assert.deepEqual(await loadPlaylists(), []);
  });

  test('uma playlist malformada não derruba as outras', async () => {
    // Perder uma entrada corrompida é melhor que perder todas.
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(
      '@connext/playlists',
      JSON.stringify({
        version: 1,
        savedAt: 0,
        playlists: [playlist({ id: 'boa' }), { id: 'ruim' }, null, { trackIds: [1, 2] }],
      }),
    );
    const out = await loadPlaylists();
    assert.equal(out.length, 1);
    assert.equal(out[0].id, 'boa');
  });
});

describe('hidratação das playlists', () => {
  test('carrega as playlists salvas', async () => {
    await clearPlaylists();
    await savePlaylists([playlist({ id: 'salva', name: 'Do disco' })]);
    usePlaylistStore.setState({ playlists: [], isHydrated: false });

    await usePlaylistStore.getState().hydrate();
    assert.equal(usePlaylistStore.getState().playlists[0]?.name, 'Do disco');
  });

  test('playlist criada durante a leitura do disco não é sobrescrita', async () => {
    // Mesma classe de corrida corrigida na biblioteca (Issue #7): sem esse
    // guarda, a playlist recém-criada sumiria quando o cache chegasse.
    await clearPlaylists();
    await savePlaylists([playlist({ id: 'doDisco' })]);
    usePlaylistStore.setState({ playlists: [], isHydrated: false });

    control.delayMs = 50;
    const pendente = usePlaylistStore.getState().hydrate();
    await new Promise((r) => setTimeout(r, 10));
    usePlaylistStore.getState().createPlaylist('Recém-criada');
    await pendente;
    control.delayMs = 0;

    const nomes = usePlaylistStore.getState().playlists.map((p) => p.name);
    assert.deepEqual(nomes, ['Recém-criada'], 'o que o usuário acabou de criar tem precedência');
  });

  test('hidratar duas vezes lê o disco uma vez só', async () => {
    await clearPlaylists();
    await savePlaylists([playlist()]);
    usePlaylistStore.setState({ playlists: [], isHydrated: false });

    control.reads = 0;
    control.delayMs = 30;
    await Promise.all([
      usePlaylistStore.getState().hydrate(),
      usePlaylistStore.getState().hydrate(),
    ]);
    control.delayMs = 0;

    assert.equal(control.reads, 1);
  });
});
