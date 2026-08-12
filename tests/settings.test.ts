import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fadeMultiplier, parseGainDb, replayGain } from '@/services/player/audio-levels';
import { formatBytes, summarizeLibrary } from '@/services/file/library-maintenance';
import type { Track } from '@/types/track';

function track(over: Partial<Track> & { id: string }): Track {
  return {
    url: `/music/${over.id}.mp3`,
    title: 'Faixa',
    artist: 'Artista',
    album: 'Álbum',
    genre: '',
    year: null,
    trackNumber: null,
    duration: 200,
    artwork: null,
    fileName: `${over.id}.mp3`,
    fileSize: 5_000_000,
    extension: '.mp3',
    modifiedDate: 0,
    playCount: 0,
    lastPlayedAt: null,
    isFavorite: false,
    addedAt: 0,
    ...over,
  } as Track;
}

describe('ReplayGain', () => {
  it('lê o ganho nas duas grafias que aparecem na prática', () => {
    assert.equal(parseGainDb('-7.25 dB'), -7.25);
    assert.equal(parseGainDb('-7.25'), -7.25);
    assert.equal(parseGainDb('+3 DB'), 3);
  });

  it('recusa lixo em vez de virar NaN', () => {
    assert.equal(parseGainDb('muito alto'), null);
    assert.equal(parseGainDb(''), null);
    // Tag corrompida: um ganho desses emudeceria ou estouraria a faixa.
    assert.equal(parseGainDb('-999 dB'), null);
  });

  it('converte dB negativo em atenuação', () => {
    const gain = replayGain({ REPLAYGAIN_TRACK_GAIN: '-6.02 dB' });
    // -6 dB é metade da amplitude.
    assert.ok(Math.abs(gain - 0.5) < 0.01, `esperado ~0.5, veio ${gain}`);
  });

  it('nunca amplifica acima do volume cheio', () => {
    // O player não tem headroom acima de 1; amplificar causaria clipping.
    assert.equal(replayGain({ REPLAYGAIN_TRACK_GAIN: '+6 dB' }), 1);
  });

  it('faixa sem a tag fica em volume cheio', () => {
    assert.equal(replayGain(undefined), 1);
    assert.equal(replayGain({}), 1);
    assert.equal(replayGain({ TITLE: 'nada a ver' }), 1);
  });

  it('cai para o ganho de álbum quando não há o de faixa', () => {
    assert.ok(replayGain({ REPLAYGAIN_ALBUM_GAIN: '-6.02 dB' }) < 1);
  });
});

describe('fade de fim de faixa', () => {
  it('fica em volume cheio fora da janela', () => {
    assert.equal(fadeMultiplier(0, 200, 5), 1);
    assert.equal(fadeMultiplier(190, 200, 5), 1);
  });

  it('desce proporcionalmente dentro da janela', () => {
    assert.equal(fadeMultiplier(197.5, 200, 5), 0.5);
    assert.equal(fadeMultiplier(200, 200, 5), 0);
  });

  it('não faz fade em faixa curta demais', () => {
    // 10s com 5s de fade passaria metade da faixa abaixando o volume.
    assert.equal(fadeMultiplier(9, 10, 5), 1);
  });

  it('desligado (0s) nunca mexe no volume', () => {
    assert.equal(fadeMultiplier(199.9, 200, 0), 1);
  });
});

describe('resumo da biblioteca', () => {
  it('soma tamanho e duração das faixas', () => {
    const summary = summarizeLibrary([
      track({ id: 'a', fileSize: 1_000_000, duration: 100 }),
      track({ id: 'b', fileSize: 2_000_000, duration: 200 }),
    ]);

    assert.equal(summary.trackCount, 2);
    assert.equal(summary.totalBytes, 3_000_000);
    assert.equal(summary.totalSeconds, 300);
  });

  it('não quebra com biblioteca vazia', () => {
    const summary = summarizeLibrary([]);
    assert.equal(summary.trackCount, 0);
    assert.equal(summary.totalBytes, 0);
  });
});

describe('formatBytes', () => {
  it('escolhe a unidade e usa vírgula decimal', () => {
    assert.equal(formatBytes(512), '512 B');
    assert.equal(formatBytes(1_500), '1,5 kB');
    assert.equal(formatBytes(5_400_000), '5,4 MB');
    assert.equal(formatBytes(2_300_000_000), '2,3 GB');
  });

  it('omite a casa decimal a partir de 10 unidades', () => {
    assert.equal(formatBytes(45_000_000), '45 MB');
  });
});
