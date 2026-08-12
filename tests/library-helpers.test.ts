import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { formatDuration, formatFileSize, formatTotalDuration } from '@/utils/formatters';
import { groupByAlbum, groupByArtist, groupByGenre, sortByTitle } from '@/utils/library-helpers';
import type { Track } from '@/types/track';

/** Faixa completa, com os campos relevantes sobrescritos por teste. */
function track(over: Partial<Track> = {}): Track {
  return {
    id: `t${Math.random()}`,
    url: 'file:///m.mp3',
    title: 'T',
    artist: 'A',
    album: 'B',
    genre: 'G',
    year: 2020,
    trackNumber: 1,
    duration: 60,
    artwork: null,
    fileName: 'm.mp3',
    fileSize: 2048,
    extension: '.mp3',
    modifiedDate: 1,
    playCount: 0,
    lastPlayedAt: null,
    isFavorite: false,
    ...over,
  };
}

describe('formatters', () => {
  test('formatDuration usa m:ss com zero-pad', () => {
    assert.equal(formatDuration(195), '3:15');
    assert.equal(formatDuration(65), '1:05');
    assert.equal(formatDuration(59), '0:59');
    assert.equal(formatDuration(3600), '60:00');
  });

  test('formatDuration trata valores inválidos como zero', () => {
    // A duração vem de metadados, que podem faltar ou vir corrompidos: a lista
    // precisa mostrar 0:00 em vez de NaN:NaN.
    assert.equal(formatDuration(0), '0:00');
    assert.equal(formatDuration(-5), '0:00');
    assert.equal(formatDuration(NaN), '0:00');
    assert.equal(formatDuration(Infinity), '0:00');
  });

  test('formatTotalDuration só mostra horas quando existem', () => {
    assert.equal(formatTotalDuration(3661), '1h 1min');
    assert.equal(formatTotalDuration(600), '10min');
    assert.equal(formatTotalDuration(0), '0min');
  });

  test('formatFileSize troca de unidade nos limites', () => {
    assert.equal(formatFileSize(512), '512 B');
    assert.equal(formatFileSize(1024), '1.0 KB');
    assert.equal(formatFileSize(1024 * 1024), '1.0 MB');
    assert.equal(formatFileSize(1536), '1.5 KB');
  });
});

describe('groupByAlbum', () => {
  test('separa álbuns homônimos de artistas diferentes', () => {
    const albums = groupByAlbum([
      track({ album: 'Greatest Hits', artist: 'Banda X' }),
      track({ album: 'Greatest Hits', artist: 'Banda Y' }),
    ]);
    assert.equal(albums.length, 2);
  });

  test('é insensível a caixa e espaços nas pontas', () => {
    const albums = groupByAlbum([
      track({ album: 'Porto', artist: 'Maré' }),
      track({ album: ' porto ', artist: 'MARÉ' }),
    ]);
    assert.equal(albums.length, 1);
    assert.equal(albums[0].tracks.length, 2);
  });

  test('soma a duração e herda a primeira artwork disponível', () => {
    // Uma faixa sem capa não pode impedir o álbum de exibir a capa das outras.
    const albums = groupByAlbum([
      track({ album: 'X', artist: 'A', duration: 100, artwork: null }),
      track({ album: 'X', artist: 'A', duration: 50, artwork: 'file:///capa.jpg' }),
    ]);
    assert.equal(albums[0].totalDuration, 150);
    assert.equal(albums[0].artwork, 'file:///capa.jpg');
  });
});

describe('groupByArtist', () => {
  test('agrupa e expõe os álbuns do artista', () => {
    const artists = groupByArtist([
      track({ artist: 'Lumen', album: 'Primeira Luz' }),
      track({ artist: 'Lumen', album: 'Segunda Luz' }),
      track({ artist: 'Ana', album: 'Piano' }),
    ]);
    assert.equal(artists.length, 2);
    const lumen = artists.find((a) => a.name === 'Lumen');
    assert.equal(lumen?.tracks.length, 2);
    assert.equal(lumen?.albums.length, 2);
  });

  test('ordena com a colação pt-BR', () => {
    // Com colação padrão, "Ápice" iria para o fim da lista.
    const artists = groupByArtist([
      track({ artist: 'Zeca' }),
      track({ artist: 'Ápice' }),
      track({ artist: 'Bruno' }),
    ]);
    assert.deepEqual(
      artists.map((a) => a.name),
      ['Ápice', 'Bruno', 'Zeca'],
    );
  });
});

describe('groupByGenre', () => {
  test('conta e ordena por contagem decrescente', () => {
    const genres = groupByGenre([
      track({ genre: 'Rock' }),
      track({ genre: 'Jazz' }),
      track({ genre: 'Rock' }),
      track({ genre: 'Rock' }),
    ]);
    assert.equal(genres[0].name, 'Rock');
    assert.equal(genres[0].trackCount, 3);
    assert.equal(genres[1].trackCount, 1);
  });

  test('faixa sem gênero cai em "Sem Gênero" em vez de sumir', () => {
    const genres = groupByGenre([track({ genre: '' }), track({ genre: 'Rock' })]);
    const semGenero = genres.find((g) => g.name === 'Sem Gênero');
    assert.ok(semGenero);
    assert.equal(semGenero.trackCount, 1);
  });
});

describe('invariantes de agrupamento', () => {
  test('nenhuma faixa se perde em nenhum dos agrupamentos', () => {
    const tracks = Array.from({ length: 50 }, (_, i) =>
      track({ artist: `A${i % 7}`, album: `Al${i % 5}`, genre: i % 3 ? 'Rock' : '' }),
    );
    const soma = (grupos: { tracks: unknown[] }[]) =>
      grupos.reduce((n, g) => n + g.tracks.length, 0);

    assert.equal(soma(groupByAlbum(tracks)), 50, 'álbuns');
    assert.equal(soma(groupByArtist(tracks)), 50, 'artistas');
    assert.equal(soma(groupByGenre(tracks)), 50, 'gêneros');
  });
});

describe('sortByTitle', () => {
  test('não muta o array recebido', () => {
    // A lista vem do store; ordenar no lugar mutaria o estado do Zustand.
    const original = [track({ title: 'C' }), track({ title: 'A' })];
    const antes = original.map((t) => t.title);
    sortByTitle(original);
    assert.deepEqual(
      original.map((t) => t.title),
      antes,
    );
  });

  test('ordena com acentuação correta', () => {
    const out = sortByTitle([
      track({ title: 'Único' }),
      track({ title: 'Abelha' }),
      track({ title: 'Ímã' }),
    ]);
    assert.deepEqual(
      out.map((t) => t.title),
      ['Abelha', 'Ímã', 'Único'],
    );
  });
});
