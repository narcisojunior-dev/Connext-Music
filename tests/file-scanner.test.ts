import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  cleanFileName,
  isAudioFile,
  MIN_FILE_SIZE,
  removeDuplicates,
  shouldSkipDirectory,
  SUPPORTED_EXTENSIONS,
} from '@/services/file/file-scanner';
import { generateTrackId, generateUUID } from '@/utils/id-generator';
import type { Track } from '@/types/track';

const track = (id: string, over: Partial<Track> = {}) => ({ id, title: id, ...over }) as Track;

describe('scanner de arquivos', () => {
  test('aceita todas as extensoes suportadas, em qualquer caixa', () => {
    for (const ext of SUPPORTED_EXTENSIONS) {
      assert.equal(isAudioFile(`musica${ext}`), true, ext);
      assert.equal(isAudioFile(`musica${ext.toUpperCase()}`), true, ext.toUpperCase());
    }
  });

  test('rejeita nao-audio, arquivos sem extensao e ocultos', () => {
    for (const name of ['leiame.txt', 'capa.jpg', 'README', 'musica', '.mp3', '.DS_Store']) {
      assert.equal(isAudioFile(name), false, name);
    }
  });

  test('rejeita extensao parecida mas nao suportada', () => {
    assert.equal(isAudioFile('audio.mp4'), false);
    assert.equal(isAudioFile('audio.mp3.txt'), false);
    assert.equal(isAudioFile('audio.wma'), false);
  });

  test('nome com ponto no meio usa a ultima extensao', () => {
    assert.equal(isAudioFile('Sr. Ninguem - faixa.mp3'), true);
  });

  test('pula pastas de sistema e ocultas', () => {
    for (const d of ['node_modules', '.git', '__MACOSX', 'Caches', 'tmp', 'artworks', '.hidden']) {
      assert.equal(shouldSkipDirectory(d), true, d);
    }
  });

  test('nao pula pastas normais de musica', () => {
    for (const d of ['Music', 'Rock', 'Downloads', 'Singles', 'Pop']) {
      assert.equal(shouldSkipDirectory(d), false, d);
    }
  });

  test('remove extensao, numero de faixa e separadores', () => {
    assert.equal(cleanFileName('01 - Nome da Musica.mp3'), 'Nome da Musica');
    assert.equal(cleanFileName('03_Outra_Cancao.flac'), 'Outra Cancao');
    assert.equal(cleanFileName('12.Terceira.m4a'), 'Terceira');
    assert.equal(cleanFileName('Sem Numero.wav'), 'Sem Numero');
  });

  test('nao destroi titulos que comecam com numero significativo', () => {
    // "1979" nao e numero de faixa: nao ha separador depois dele.
    assert.equal(cleanFileName('1979.mp3'), '1979');
  });

  test('colapsa separadores repetidos', () => {
    assert.equal(cleanFileName('a--b__c.mp3'), 'a b c');
  });

  test('remove ids repetidos preservando o primeiro', () => {
    const out = removeDuplicates([
      track('a', { title: 'primeiro' }),
      track('b', { title: 'outro' }),
      track('a', { title: 'repetido' }),
    ]);
    assert.equal(out.length, 2);
    assert.equal(out[0].title, 'primeiro');
  });

  test('mesmo caminho e data geram o mesmo id', () => {
    assert.equal(generateTrackId('/m/a.mp3', 123), generateTrackId('/m/a.mp3', 123));
  });

  test('data diferente muda o id (scan incremental depende disso)', () => {
    assert.notEqual(generateTrackId('/m/a.mp3', 123), generateTrackId('/m/a.mp3', 124));
  });

  test('caminho diferente muda o id', () => {
    assert.notEqual(generateTrackId('/m/a.mp3', 123), generateTrackId('/m/b.mp3', 123));
  });

  test('id tem 16 hex (64 bits), nao 32', () => {
    const id = generateTrackId('/m/a.mp3', 123);
    assert.match(id, /^[0-9a-f]{16}$/);
  });

  test('sem colisao em 20 mil caminhos realistas', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 20000; i++) {
      ids.add(generateTrackId(`file:///mock/Documents/Music/Album ${i % 200}/faixa ${i}.mp3`, i));
    }
    assert.equal(ids.size, 20000);
  });

  test('generateUUID produz v4 unicos', () => {
    const ids = new Set(Array.from({ length: 500 }, () => generateUUID()));
    assert.equal(ids.size, 500);
    assert.match(
      [...ids][0],
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  test('MIN_FILE_SIZE e 1KB', () => {
    assert.equal(MIN_FILE_SIZE, 1024);
  });
});
