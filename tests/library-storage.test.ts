import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { control } from './stubs/async-storage.mjs';
import {
  addTracksToLibrary,
  clearLibrary,
  loadLibrary,
  saveLibrary,
} from '@/services/storage/library-storage';
import { useLibraryStore } from '@/stores/library-store';
import { usePlaylistStore } from '@/stores/playlist-store';
import type { Track } from '@/types/track';

const track = (id: string, over: Partial<Track> = {}) =>
  ({
    id,
    url: `file:///m/${id}.mp3`,
    title: id,
    artist: 'A',
    album: 'B',
    duration: 10,
    playCount: 0,
    lastPlayedAt: null,
    isFavorite: false,
    ...over,
  }) as Track;

const pl = usePlaylistStore.getState;

describe('persistência da biblioteca', () => {
  test('save + load faz round-trip', async () => {
    await clearLibrary();
    await saveLibrary([track('a'), track('b')]);
    const out = await loadLibrary();
    assert.equal(out.length, 2);
    assert.equal(out[0].id, 'a');
  });

  test('load sem nada salvo devolve array vazio', async () => {
    await clearLibrary();
    assert.deepEqual(await loadLibrary(), []);
  });

  test('JSON corrompido devolve vazio em vez de lançar', async () => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem('@connext/library', '{isto nao e json');
    assert.deepEqual(await loadLibrary(), []);
  });

  test('versão de esquema incompatível descarta o cache', async () => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(
      '@connext/library',
      JSON.stringify({ version: 999, savedAt: 0, tracks: [track('a')] }),
    );
    assert.deepEqual(await loadLibrary(), [], 'não deve entregar dados de formato desconhecido');
  });

  test('addTracksToLibrary faz merge sem duplicar', async () => {
    await clearLibrary();
    await saveLibrary([track('a'), track('b')]);
    const merged = await addTracksToLibrary([track('b', { title: 'atualizado' }), track('c')]);
    assert.equal(merged.length, 3, 'a, b, c');
    assert.equal(merged.find((t: { id: string }) => t.id === 'b')?.title, 'atualizado');
  });

  test('múltiplos saves não acumulam duplicatas', async () => {
    await clearLibrary();
    for (let i = 0; i < 5; i++) await addTracksToLibrary([track('a'), track('b')]);
    assert.equal((await loadLibrary()).length, 2);
  });

  test('500 faixas carregam em menos de 200ms', async () => {
    await clearLibrary();
    const many = Array.from({ length: 500 }, (_, i) => track(`t${i}`));
    await saveLibrary(many);
    const started = Date.now();
    const out = await loadLibrary();
    const elapsed = Date.now() - started;
    assert.equal(out.length, 500);
    assert.ok(elapsed < 200, `carregou em ${elapsed}ms, limite 200ms`);
    console.log(`      (500 faixas em ${elapsed}ms)`);
  });

  test('remapTrackIds troca ids antigos pelos novos', () => {
    pl().clear();
    const p = pl().createPlaylist('Treino');
    pl().addTrackToPlaylist(p.id, 'antigo1');
    pl().addTrackToPlaylist(p.id, 'estavel');
    pl().addTrackToPlaylist(p.id, 'antigo2');
    pl().remapTrackIds({ antigo1: 'novo1', antigo2: 'novo2' });
    assert.deepEqual(pl().playlists[0].trackIds, ['novo1', 'estavel', 'novo2']);
  });

  test('remapTrackIds preserva a ordem das faixas', () => {
    pl().clear();
    const p = pl().createPlaylist('Ordem');
    ['a', 'b', 'c'].forEach((id) => pl().addTrackToPlaylist(p.id, id));
    pl().remapTrackIds({ b: 'B' });
    assert.deepEqual(pl().playlists[0].trackIds, ['a', 'B', 'c']);
  });

  test('remapTrackIds vazio não altera nada', () => {
    pl().clear();
    const p = pl().createPlaylist('Intacta');
    pl().addTrackToPlaylist(p.id, 'x');
    const before = pl().playlists[0].updatedAt;
    pl().remapTrackIds({});
    assert.equal(pl().playlists[0].updatedAt, before, 'não deve marcar como modificada');
  });

  test('remapTrackIds não toca playlists sem os ids afetados', () => {
    pl().clear();
    const a = pl().createPlaylist('Afetada');
    const b = pl().createPlaylist('Intocada');
    pl().addTrackToPlaylist(a.id, 'velho');
    pl().addTrackToPlaylist(b.id, 'outro');
    const beforeB = pl().playlists[1].updatedAt;
    pl().remapTrackIds({ velho: 'novo' });
    assert.deepEqual(pl().playlists[0].trackIds, ['novo']);
    assert.equal(pl().playlists[1].updatedAt, beforeB);
  });

  test('hydrate concorrente lê o disco uma vez só', async () => {
    await clearLibrary();
    await saveLibrary([track('velho1'), track('velho2')]);
    useLibraryStore.setState({ tracks: [], isHydrated: false, lastScanAt: null });

    control.reads = 0;
    control.delayMs = 30;
    // Duas telas montam no mesmo frame e pedem a hidratação.
    await Promise.all([useLibraryStore.getState().hydrate(), useLibraryStore.getState().hydrate()]);
    control.delayMs = 0;

    assert.equal(control.reads, 1, 'a segunda chamada deve reaproveitar a leitura em andamento');
    assert.equal(useLibraryStore.getState().tracks.length, 2);
  });

  test('scan durante a hidratação não é sobrescrito pelo cache', async () => {
    await clearLibrary();
    await saveLibrary([track('doDisco')]);
    useLibraryStore.setState({ tracks: [], isHydrated: false, lastScanAt: null });

    control.delayMs = 50;
    const pendente = useLibraryStore.getState().hydrate();
    // O usuário toca em "escanear" antes de o disco responder.
    await new Promise((r) => setTimeout(r, 10));
    useLibraryStore.getState().setLibrary([track('doScan1'), track('doScan2')]);
    await pendente;
    control.delayMs = 0;

    const ids = useLibraryStore.getState().tracks.map((t: { id: string }) => t.id);
    assert.deepEqual(ids, ['doScan1', 'doScan2'], 'o resultado do scan é mais recente que o cache');
    assert.equal(useLibraryStore.getState().isHydrated, true);
  });
});
