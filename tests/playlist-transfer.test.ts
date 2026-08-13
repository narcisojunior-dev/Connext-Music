import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  describeImport,
  matchTracks,
  parsePlaylistFile,
  playlistFileName,
  serializePlaylist,
  PLAYLIST_FILE_VERSION,
  type ExportedTrack,
} from '@/services/playlist/playlist-transfer';
import type { Playlist } from '@/types/playlist';
import type { Track } from '@/types/track';

function track(id: string, title: string, artist: string, over: Partial<Track> = {}): Track {
  return {
    id,
    url: `/m/${id}.mp3`,
    title,
    artist,
    album: 'Álbum',
    genre: '',
    year: null,
    trackNumber: null,
    duration: 210,
    artwork: null,
    fileName: `${id}.mp3`,
    fileSize: 1,
    extension: '.mp3',
    modifiedDate: 0,
    playCount: 0,
    lastPlayedAt: null,
    isFavorite: false,
    addedAt: 0,
    ...over,
  } as Track;
}

function playlist(trackIds: string[], over: Partial<Playlist> = {}): Playlist {
  return {
    id: 'p1',
    name: 'Corrida',
    trackIds,
    createdAt: 0,
    updatedAt: 0,
    ...over,
  };
}

const LIBRARY = [
  track('a', 'Águas de Março', 'Elis Regina'),
  track('b', 'Construção', 'Chico Buarque'),
  track('c', 'Mas Que Nada', 'Jorge Ben Jor'),
];

describe('exportar playlist', () => {
  it('grava o que identifica a faixa, não o id local', () => {
    const file = serializePlaylist(playlist(['a', 'b']), LIBRARY);

    assert.equal(file.app, 'connext-music');
    assert.equal(file.version, PLAYLIST_FILE_VERSION);
    assert.deepEqual(
      file.tracks.map((t) => t.title),
      ['Águas de Março', 'Construção'],
    );
    // O id é um hash de caminho + data de modificação; não significa nada em
    // outro aparelho e não deve viajar.
    assert.ok(!JSON.stringify(file).includes('"id"'));
  });

  it('preserva a ordem da playlist, não a da biblioteca', () => {
    const file = serializePlaylist(playlist(['c', 'a']), LIBRARY);
    assert.deepEqual(
      file.tracks.map((t) => t.title),
      ['Mas Que Nada', 'Águas de Março'],
    );
  });

  it('descarta ids órfãos em vez de exportar entradas vazias', () => {
    const file = serializePlaylist(playlist(['a', 'sumiu', 'b']), LIBRARY);
    assert.equal(file.tracks.length, 2);
  });
});

describe('nome do arquivo', () => {
  it('tira acento e espaço, e mantém legível', () => {
    assert.equal(playlistFileName('Café da Manhã'), 'Cafe-da-Manha.connextplaylist.json');
  });

  it('remove o que quebraria um caminho', () => {
    assert.ok(!playlistFileName('Rock/Metal: 2020').includes('/'));
    assert.ok(!playlistFileName('Rock/Metal: 2020').includes(':'));
  });

  it('não gera nome vazio quando sobra nada', () => {
    assert.equal(playlistFileName('🎵🎶'), 'playlist.connextplaylist.json');
  });
});

describe('ler arquivo de playlist', () => {
  const valid = JSON.stringify({
    version: 1,
    app: 'connext-music',
    name: 'Corrida',
    exportedAt: 123,
    tracks: [{ title: 'Construção', artist: 'Chico Buarque', album: 'A', duration: 300 }],
  });

  it('aceita um arquivo válido', () => {
    const result = parsePlaylistFile(valid);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.playlist.name, 'Corrida');
      assert.equal(result.playlist.tracks.length, 1);
    }
  });

  it('separa "não é JSON" de "não é nosso"', () => {
    const brokenJson = parsePlaylistFile('{ isto não fecha');
    assert.equal(brokenJson.ok, false);
    if (!brokenJson.ok) assert.match(brokenJson.reason, /JSON/);

    const otherApp = parsePlaylistFile('{"app":"outro","tracks":[]}');
    assert.equal(otherApp.ok, false);
    if (!otherApp.ok) assert.match(otherApp.reason, /Connext Music/);
  });

  it('recusa arquivo de versão futura, explicando o motivo', () => {
    const future = parsePlaylistFile(
      JSON.stringify({ version: 99, app: 'connext-music', name: 'X', tracks: [] }),
    );
    assert.equal(future.ok, false);
    if (!future.ok) assert.match(future.reason, /mais nova/);
  });

  it('descarta entradas malformadas sem invalidar o resto', () => {
    const mixed = parsePlaylistFile(
      JSON.stringify({
        version: 1,
        app: 'connext-music',
        name: 'X',
        tracks: [
          { title: 'Boa', artist: 'Alguém', album: '', duration: 1 },
          { title: 42 },
          null,
          { artist: 'sem título' },
        ],
      }),
    );
    assert.equal(mixed.ok, true);
    if (mixed.ok) assert.equal(mixed.playlist.tracks.length, 1);
  });

  it('recusa arquivo sem nome ou sem lista', () => {
    assert.equal(
      parsePlaylistFile(JSON.stringify({ version: 1, app: 'connext-music', tracks: [] })).ok,
      false,
    );
    assert.equal(
      parsePlaylistFile(JSON.stringify({ version: 1, app: 'connext-music', name: 'X' })).ok,
      false,
    );
  });

  it('não engasga com JSON que não é objeto', () => {
    assert.equal(parsePlaylistFile('null').ok, false);
    assert.equal(parsePlaylistFile('[1,2,3]').ok, false);
    assert.equal(parsePlaylistFile('"texto"').ok, false);
  });
});

describe('casar faixas com a biblioteca local', () => {
  const entry = (title: string, artist: string): ExportedTrack => ({
    title,
    artist,
    album: '',
    duration: 0,
  });

  it('encontra pelo título e artista, na ordem do arquivo', () => {
    const result = matchTracks(
      [entry('Construção', 'Chico Buarque'), entry('Mas Que Nada', 'Jorge Ben Jor')],
      LIBRARY,
    );
    assert.deepEqual(result.trackIds, ['b', 'c']);
    assert.deepEqual(result.missing, []);
  });

  it('ignora acento e caixa, como a busca', () => {
    const result = matchTracks([entry('AGUAS DE MARCO', 'elis regina')], LIBRARY);
    assert.deepEqual(result.trackIds, ['a']);
  });

  it('devolve o que faltou, para a tela poder dizer quais', () => {
    const result = matchTracks(
      [entry('Construção', 'Chico Buarque'), entry('Inexistente', 'Ninguém')],
      LIBRARY,
    );
    assert.deepEqual(result.trackIds, ['b']);
    assert.equal(result.missing.length, 1);
    assert.equal(result.missing[0].title, 'Inexistente');
  });

  it('não casa título certo com artista errado', () => {
    const result = matchTracks([entry('Construção', 'Outra Pessoa')], LIBRARY);
    assert.deepEqual(result.trackIds, []);
  });

  it('com duplicatas na biblioteca, escolhe sempre a mesma', () => {
    const dupes = [...LIBRARY, track('a2', 'Águas de Março', 'Elis Regina')];
    const first = matchTracks([entry('Águas de Março', 'Elis Regina')], dupes);
    const second = matchTracks([entry('Águas de Março', 'Elis Regina')], dupes);
    assert.deepEqual(first.trackIds, second.trackIds);
    assert.deepEqual(first.trackIds, ['a']);
  });
});

describe('resumo da importação', () => {
  const entry = (title: string): ExportedTrack => ({ title, artist: 'X', album: '', duration: 0 });

  it('diz quando veio tudo', () => {
    assert.match(describeImport('Corrida', { trackIds: ['a', 'b'], missing: [] }), /2 faixas/);
  });

  it('avisa quando a biblioteca não tem nada da lista', () => {
    const text = describeImport('Corrida', { trackIds: [], missing: [entry('X'), entry('Y')] });
    assert.match(text, /Nenhuma das 2/);
    assert.match(text, /vazia/);
  });

  it('lista exemplos do que faltou, sem despejar tudo', () => {
    const missing = ['A', 'B', 'C', 'D', 'E'].map(entry);
    const text = describeImport('Corrida', { trackIds: ['a'], missing });
    assert.match(text, /1 de 6 faixas/);
    assert.match(text, /e mais 2/);
  });
});

describe('ida e volta', () => {
  it('exportar e importar de volta reproduz a mesma playlist', () => {
    // O caminho completo do recurso, sem tocar em disco: e aqui que um
    // descasamento entre o que se grava e o que se le apareceria.
    const original = playlist(['c', 'a', 'b']);

    const file = serializePlaylist(original, LIBRARY);
    const parsed = parsePlaylistFile(JSON.stringify(file, null, 2));
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;

    const match = matchTracks(parsed.playlist.tracks, LIBRARY);

    assert.equal(parsed.playlist.name, original.name);
    assert.deepEqual(match.trackIds, original.trackIds);
    assert.deepEqual(match.missing, []);
  });

  it('numa biblioteca parcial, traz o que existe e reporta o resto', () => {
    const file = serializePlaylist(playlist(['a', 'b', 'c']), LIBRARY);
    const parsed = parsePlaylistFile(JSON.stringify(file));
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;

    // Aparelho do amigo, que so tem uma das tres.
    const match = matchTracks(parsed.playlist.tracks, [LIBRARY[1]]);
    assert.deepEqual(match.trackIds, ['b']);
    assert.deepEqual(
      match.missing.map((t) => t.title),
      ['Águas de Março', 'Mas Que Nada'],
    );
  });
});
