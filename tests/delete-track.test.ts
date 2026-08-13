import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';

// @ts-expect-error — o stub expõe controles que o módulo real não tem.
import { mockFiles } from 'expo-file-system';
import { deleteTrackArtwork, deleteTrackFile } from '@/services/file/library-maintenance';

const MUSICA = 'file:///mock/Documents/Music/01 - Faixa.mp3';
const CAPA = 'file:///mock/Caches/artworks/abc.jpg';

describe('apagar a faixa do aparelho', () => {
  beforeEach(() => {
    mockFiles.clear();
    mockFiles.failNextDelete = false;
  });

  test('apaga o arquivo e confirma', () => {
    mockFiles.add(MUSICA);

    assert.equal(deleteTrackFile(MUSICA), true);
    assert.equal(mockFiles.has(MUSICA), false);
  });

  test('arquivo que já não existe conta como sucesso', () => {
    // O objetivo de quem chamou — que o arquivo suma — já está satisfeito.
    // Tratar como falha só produziria um alerta confuso.
    assert.equal(deleteTrackFile(MUSICA), true);
  });

  test('falha de permissão devolve false, sem lançar', () => {
    mockFiles.add(MUSICA);
    mockFiles.failNextDelete = true;

    assert.equal(deleteTrackFile(MUSICA), false);
    // A faixa continua no disco, e a UI precisa poder dizer isso.
    assert.equal(mockFiles.has(MUSICA), true);
  });

  test('a capa em cache vai junto', () => {
    mockFiles.add(CAPA);
    deleteTrackArtwork(CAPA);
    assert.equal(mockFiles.has(CAPA), false);
  });

  test('faixa sem capa não quebra', () => {
    assert.doesNotThrow(() => deleteTrackArtwork(null));
  });

  test('falha ao apagar a capa é silenciosa', () => {
    // A capa é derivada; o pior caso são alguns kilobytes órfãos.
    mockFiles.add(CAPA);
    mockFiles.failNextDelete = true;
    assert.doesNotThrow(() => deleteTrackArtwork(CAPA));
  });
});
