import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { useLibraryStore } from '@/stores/library-store';
import { usePlayerStore } from '@/stores/player-store';
import { usePlaylistStore } from '@/stores/playlist-store';
import { useSettingsStore } from '@/stores/settings-store';
import type { Track } from '@/types/track';

const track = (id: string, over: Partial<Track> = {}) =>
  ({
    id,
    url: `file:///m/${id}.mp3`,
    title: id,
    artist: 'A',
    album: 'B',
    duration: 100,
    playCount: 0,
    lastPlayedAt: null,
    isFavorite: false,
    ...over,
  }) as Track;

const T = [track('t1'), track('t2'), track('t3')];

const player = usePlayerStore.getState;
const lib = useLibraryStore.getState;
const pl = usePlaylistStore.getState;
const st = useSettingsStore.getState;

describe('stores', () => {
  test('setQueue define currentTrack e index', () => {
    player().setQueue(T, 0);
    assert.equal(player().currentTrack?.id, 't1');
    assert.equal(player().currentIndex, 0);
  });

  test('removeFromQueue antes da atual mantem a faixa tocando', () => {
    player().setQueue(T, 2);
    assert.equal(player().currentTrack?.id, 't3');
    player().removeFromQueue(0);
    assert.equal(player().currentTrack?.id, 't3', 'a mesma faixa deve seguir atual');
    assert.equal(player().currentIndex, 1, 'o indice deve ter deslocado');
  });

  test('moveQueueItem reencontra a faixa atual pela nova posicao', () => {
    player().setQueue(T, 0);
    player().moveQueueItem(0, 2);
    assert.equal(player().currentTrack?.id, 't1');
    assert.equal(player().currentIndex, 2);
  });

  test('moveQueueItem ignora indices invalidos', () => {
    player().setQueue(T, 0);
    const before = player().queue.map((t: { id: string }) => t.id);
    player().moveQueueItem(0, 99);
    assert.deepEqual(
      player().queue.map((t: { id: string }) => t.id),
      before,
    );
  });

  test('addTracks nao duplica por id', () => {
    lib().clear();
    lib().addTracks(T);
    lib().addTracks([track('t1', { title: 'atualizado' })]);
    assert.equal(lib().tracks.length, 3);
    assert.equal(lib().tracks.find((t: { id: string }) => t.id === 't1')?.title, 'atualizado');
  });

  test('toggleFavorite e registerPlay atualizam so a faixa alvo', () => {
    lib().clear();
    lib().setLibrary(T);
    lib().toggleFavorite('t2');
    lib().registerPlay('t2');
    const t2 = lib().tracks.find((t: { id: string }) => t.id === 't2');
    const t1 = lib().tracks.find((t: { id: string }) => t.id === 't1');
    assert.equal(t2?.isFavorite, true);
    assert.equal(t2?.playCount, 1);
    assert.equal(t1?.isFavorite, false);
    assert.equal(t1?.playCount, 0);
  });

  test('CRUD de playlist', () => {
    pl().clear();
    const p = pl().createPlaylist('Corrida', 'para treinar');
    pl().addTrackToPlaylist(p.id, 't1');
    pl().addTrackToPlaylist(p.id, 't2');
    pl().addTrackToPlaylist(p.id, 't1'); // duplicata ignorada
    assert.deepEqual(pl().playlists[0].trackIds, ['t1', 't2']);
    pl().renamePlaylist(p.id, 'Treino');
    assert.equal(pl().playlists[0].name, 'Treino');
    pl().reorderPlaylistTracks(p.id, 0, 1);
    assert.deepEqual(pl().playlists[0].trackIds, ['t2', 't1']);
    pl().purgeTrack('t2');
    assert.deepEqual(pl().playlists[0].trackIds, ['t1']);
    pl().deletePlaylist(p.id);
    assert.equal(pl().playlists.length, 0);
  });

  test('IDs de playlist sao unicos', () => {
    pl().clear();
    const ids = new Set(Array.from({ length: 50 }, () => pl().createPlaylist('x').id));
    assert.equal(ids.size, 50);
  });

  test('crossfade e limitado a 0-5s', () => {
    st().setCrossfadeSeconds(99);
    assert.equal(st().crossfadeSeconds, 5);
    st().setCrossfadeSeconds(-3);
    assert.equal(st().crossfadeSeconds, 0);
  });

  test('sleep timer calcula expiresAt, e null para endOfTrack', () => {
    st().startSleepTimer(15);
    const t = st().sleepTimer!;
    assert.ok(t.expiresAt! > Date.now() + 14 * 60_000);
    st().startSleepTimer('endOfTrack');
    assert.equal(st().sleepTimer!.expiresAt, null);
    st().cancelSleepTimer();
    assert.equal(st().sleepTimer, null);
  });

  test('ciclo de repeat: off -> track -> queue -> off', () => {
    player().reset();
    assert.equal(player().repeatMode, 'off');
    player().cycleRepeatMode();
    assert.equal(player().repeatMode, 'track');
    player().cycleRepeatMode();
    assert.equal(player().repeatMode, 'queue');
    player().cycleRepeatMode();
    assert.equal(player().repeatMode, 'off');
  });

  test('shuffle mantém a faixa atual na posição 0', () => {
    player().setQueue(T, 1);
    assert.equal(player().currentTrack?.id, 't2');
    player().toggleShuffle();
    assert.equal(player().shuffleMode, true);
    assert.equal(player().queue[0].id, 't2', 'a faixa que toca não pode ser trocada');
    assert.equal(player().currentIndex, 0);
  });

  test('shuffle preserva todas as faixas, sem perder nem duplicar', () => {
    player().setQueue(T, 0);
    player().toggleShuffle();
    const ids = player()
      .queue.map((t: { id: string }) => t.id)
      .sort();
    assert.deepEqual(ids, ['t1', 't2', 't3']);
  });

  test('desligar o shuffle restaura a ordem original', () => {
    player().reset();
    player().setQueue(T, 1);
    player().toggleShuffle();
    player().toggleShuffle();
    assert.equal(player().shuffleMode, false);
    assert.deepEqual(
      player().queue.map((t: { id: string }) => t.id),
      ['t1', 't2', 't3'],
    );
    assert.equal(player().currentTrack?.id, 't2', 'a faixa atual é reencontrada na ordem original');
    assert.equal(player().currentIndex, 1);
  });

  test('shuffle embaralha de fato (não é identidade em 30 tentativas)', () => {
    const muitas = Array.from({ length: 12 }, (_, i) => track(`s${i}`));
    let diferente = false;
    for (let i = 0; i < 30 && !diferente; i++) {
      player().reset();
      player().setQueue(muitas, 0);
      player().toggleShuffle();
      const ordem = player().queue.map((t: { id: string }) => t.id);
      if (ordem.join() !== muitas.map((t) => t.id).join()) diferente = true;
    }
    assert.ok(diferente, 'a ordem deveria mudar em pelo menos uma tentativa');
  });

  test('shuffle é uma permutação completa — nenhuma faixa repete antes de esgotar', () => {
    const muitas = Array.from({ length: 40 }, (_, i) => track(`p${i}`));
    player().reset();
    player().setQueue(muitas, 0);
    player().toggleShuffle();
    const ids = player().queue.map((t: { id: string }) => t.id);
    assert.equal(new Set(ids).size, 40, 'sem duplicatas na fila embaralhada');
    assert.equal(ids.length, 40, 'sem faixas perdidas');
  });

  test('setQueue descarta a ordem original de um shuffle anterior', () => {
    player().reset();
    player().setQueue(T, 0);
    player().toggleShuffle();
    player().setQueue(T, 0);
    assert.equal(player().originalOrder, null);
  });
});
