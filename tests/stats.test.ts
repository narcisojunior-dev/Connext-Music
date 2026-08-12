import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPlayTracker } from '@/services/player/play-tracking';
import { buildSmartPlaylists, findSmartPlaylist } from '@/services/library/smart-playlists';
import { computeStats, formatListeningTime } from '@/utils/stats';
import type { Track } from '@/types/track';

const DAY = 24 * 60 * 60 * 1000;

function track(over: Partial<Track> & { id: string }): Track {
  return {
    title: `Faixa ${over.id}`,
    artist: 'Artista',
    album: 'Álbum',
    genre: null,
    year: null,
    trackNumber: null,
    duration: 200,
    artwork: null,
    fileName: `${over.id}.mp3`,
    fileSize: 1000,
    extension: '.mp3',
    modifiedDate: 0,
    playCount: 0,
    lastPlayedAt: null,
    isFavorite: false,
    addedAt: 0,
    ...over,
  } as Track;
}

describe('contagem de reprodução', () => {
  it('só conta depois de metade da faixa', () => {
    const tracker = createPlayTracker();
    const at = (position: number) =>
      tracker.onProgress({ trackId: 'a', position, duration: 200 });

    assert.equal(at(10), false);
    assert.equal(at(99), false);
    assert.equal(at(100), true);
  });

  it('conta uma vez só, mesmo voltando e passando de novo', () => {
    const tracker = createPlayTracker();
    const at = (position: number) =>
      tracker.onProgress({ trackId: 'a', position, duration: 200 });

    assert.equal(at(120), true);
    assert.equal(at(130), false);
    // Usuário arrasta o slider para trás e ouve o trecho de novo.
    assert.equal(at(60), false);
    assert.equal(at(150), false);
  });

  it('conta de novo quando a mesma faixa reinicia (repeat one)', () => {
    const tracker = createPlayTracker();
    assert.equal(tracker.onProgress({ trackId: 'a', position: 120, duration: 200 }), true);

    tracker.onPlaybackStart();
    assert.equal(tracker.onProgress({ trackId: 'a', position: 120, duration: 200 }), true);
  });

  it('ignora duração zero, que é o estado antes de a faixa carregar', () => {
    const tracker = createPlayTracker();
    assert.equal(tracker.onProgress({ trackId: 'a', position: 0, duration: 0 }), false);
  });
});

describe('playlists inteligentes', () => {
  const tracks = [
    track({ id: 'a', playCount: 5, isFavorite: true, addedAt: 300 }),
    track({ id: 'b', playCount: 0, addedAt: 500 }),
    track({ id: 'c', playCount: 9, addedAt: 100 }),
    track({ id: 'd', playCount: 0, isFavorite: true, addedAt: 400 }),
  ];

  const get = (id: string) => findSmartPlaylist(tracks, id)!;

  it('Favoritas traz só o que está marcado', () => {
    assert.deepEqual(
      get('favorites').tracks.map((t) => t.id),
      ['a', 'd'],
    );
  });

  it('Recentemente Adicionadas ordena da mais nova para a mais velha', () => {
    assert.deepEqual(
      get('recently-added').tracks.map((t) => t.id),
      ['b', 'd', 'a', 'c'],
    );
  });

  it('Mais Tocadas ranqueia e exclui quem nunca tocou', () => {
    assert.deepEqual(
      get('most-played').tracks.map((t) => t.id),
      ['c', 'a'],
    );
  });

  it('Nunca Tocadas traz exatamente o complemento', () => {
    assert.deepEqual(
      get('never-played').tracks.map((t) => t.id),
      ['b', 'd'],
    );
  });

  it('não altera o array recebido', () => {
    const original = tracks.map((t) => t.id);
    buildSmartPlaylists(tracks);
    assert.deepEqual(
      tracks.map((t) => t.id),
      original,
      'buildSmartPlaylists ordenou a biblioteca no lugar',
    );
  });

  it('devolve null para um id que não existe', () => {
    assert.equal(findSmartPlaylist(tracks, 'inventado'), null);
  });
});

describe('estatísticas da biblioteca', () => {
  const now = new Date('2026-08-12T15:00:00').getTime();

  it('soma reproduções e estima o tempo ouvido', () => {
    const stats = computeStats(
      [
        track({ id: 'a', playCount: 3, duration: 100 }),
        track({ id: 'b', playCount: 2, duration: 200 }),
        track({ id: 'c', playCount: 0, duration: 300 }),
      ],
      now,
    );

    assert.equal(stats.totalPlays, 5);
    assert.equal(stats.estimatedSeconds, 3 * 100 + 2 * 200);
    assert.equal(stats.playedTracks, 2);
    assert.equal(stats.totalTracks, 3);
  });

  it('agrupa artistas e ordena por reproduções', () => {
    const stats = computeStats(
      [
        track({ id: 'a', artist: 'Tim', playCount: 2, duration: 100 }),
        track({ id: 'b', artist: 'Tim', playCount: 3, duration: 100 }),
        track({ id: 'c', artist: 'Elis', playCount: 4, duration: 50 }),
        track({ id: 'd', artist: 'Nunca', playCount: 0 }),
      ],
      now,
    );

    assert.deepEqual(
      stats.topArtists.map((a) => [a.artist, a.plays, a.trackCount, a.seconds]),
      [
        ['Tim', 5, 2, 500],
        ['Elis', 4, 1, 200],
      ],
    );
  });

  it('a janela semanal tem sempre 7 dias, incluindo os vazios', () => {
    const stats = computeStats([track({ id: 'a', playCount: 1, lastPlayedAt: now })], now);

    assert.equal(stats.lastWeek.length, 7);
    assert.equal(stats.lastWeek.at(-1)!.plays, 1, 'hoje deveria contar a faixa');
    assert.equal(stats.lastWeek[0].plays, 0);
  });

  it('ignora reprodução mais velha que a janela', () => {
    const stats = computeStats(
      [track({ id: 'a', playCount: 1, lastPlayedAt: now - 30 * DAY })],
      now,
    );

    assert.deepEqual(
      stats.lastWeek.map((d) => d.plays),
      [0, 0, 0, 0, 0, 0, 0],
    );
  });

  it('não quebra com a biblioteca vazia', () => {
    const stats = computeStats([], now);
    assert.equal(stats.totalPlays, 0);
    assert.equal(stats.lastWeek.length, 7);
    assert.deepEqual(stats.topTracks, []);
  });
});

describe('formatListeningTime', () => {
  it('escolhe a unidade conforme a grandeza', () => {
    assert.equal(formatListeningTime(45), '45s');
    assert.equal(formatListeningTime(90), '1min');
    assert.equal(formatListeningTime(3600), '1h');
    assert.equal(formatListeningTime(3600 * 4 + 60 * 32), '4h 32min');
  });
});
