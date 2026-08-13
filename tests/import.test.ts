import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  describeImport,
  isSupportedAudio,
  sanitizeFolderName,
  uniqueName,
} from '@/services/file/file-importer';

const SRC = join(import.meta.dirname, '..', 'src');

describe('validação de formato na importação', () => {
  it('aceita as extensões que o scanner também encontra', () => {
    for (const name of ['a.mp3', 'b.m4a', 'c.flac', 'd.wav', 'e.aac', 'f.ogg']) {
      assert.equal(isSupportedAudio(name), true, `${name} deveria ser aceito`);
    }
  });

  it('ignora a caixa da extensão', () => {
    assert.equal(isSupportedAudio('Faixa.MP3'), true);
    assert.equal(isSupportedAudio('Faixa.FlAc'), true);
  });

  it('recusa o que o app não sabe tocar', () => {
    assert.equal(isSupportedAudio('capa.jpg'), false);
    assert.equal(isSupportedAudio('lista.txt'), false);
    assert.equal(isSupportedAudio('video.mp4'), false);
  });

  it('recusa arquivo sem extensão', () => {
    assert.equal(isSupportedAudio('README'), false);
    assert.equal(isSupportedAudio(''), false);
  });

  it('não se confunde com ponto no meio do nome', () => {
    assert.equal(isSupportedAudio('Faixa vol.2.mp3'), true);
    assert.equal(isSupportedAudio('Faixa.mp3.bak'), false);
  });
});

describe('nome livre no destino', () => {
  it('mantém o nome quando está livre', () => {
    assert.equal(uniqueName(new Set(), 'Faixa.mp3'), 'Faixa.mp3');
  });

  it('numera a partir de 2 quando já existe', () => {
    assert.equal(uniqueName(new Set(['Faixa.mp3']), 'Faixa.mp3'), 'Faixa (2).mp3');
  });

  it('continua subindo enquanto houver colisão', () => {
    const taken = new Set(['Faixa.mp3', 'Faixa (2).mp3', 'Faixa (3).mp3']);
    assert.equal(uniqueName(taken, 'Faixa.mp3'), 'Faixa (4).mp3');
  });

  it('preserva a extensão ao numerar', () => {
    assert.equal(uniqueName(new Set(['a.flac']), 'a.flac'), 'a (2).flac');
  });

  it('lida com nome sem extensão', () => {
    assert.equal(uniqueName(new Set(['SemPonto']), 'SemPonto'), 'SemPonto (2)');
  });
});

describe('resumo da importação', () => {
  const base = { imported: 0, rejected: [], skipped: [], failed: [], canceled: false };

  it('conta no singular e no plural', () => {
    assert.equal(describeImport({ ...base, imported: 1 }), '1 música importada.');
    assert.equal(describeImport({ ...base, imported: 3 }), '3 músicas importadas.');
  });

  it('junta os casos numa frase só', () => {
    const text = describeImport({
      ...base,
      imported: 2,
      skipped: ['a.mp3'],
      rejected: ['b.jpg'],
    });

    assert.match(text, /2 músicas importadas/);
    assert.match(text, /1 já estava na biblioteca/);
    assert.match(text, /1 em formato não suportado/);
  });

  it('diz algo mesmo quando nada aconteceu', () => {
    assert.equal(describeImport(base), 'Nenhum arquivo importado.');
  });

  it('relata falhas', () => {
    assert.match(describeImport({ ...base, failed: ['x.mp3', 'y.mp3'] }), /2 falharam/);
  });
});

describe('pasta de destino nomeada', () => {
  it('mantém um nome comum como está', () => {
    assert.equal(sanitizeFolderName('Rock dos anos 80'), 'Rock dos anos 80');
  });

  it('remove o que criaria níveis ou quebraria o caminho', () => {
    assert.ok(!sanitizeFolderName('Rock/Metal')!.includes('/'));
    assert.ok(!sanitizeFolderName('Show: ao vivo')!.includes(':'));
  });

  it('recusa nomes que têm significado no sistema de arquivos', () => {
    assert.equal(sanitizeFolderName('.'), null);
    assert.equal(sanitizeFolderName('..'), null);
    assert.equal(sanitizeFolderName('   '), null);
    assert.equal(sanitizeFolderName('///'), null);
  });

  it('limita o tamanho', () => {
    assert.ok(sanitizeFolderName('a'.repeat(200))!.length <= 60);
  });
});

describe('tipos declarados ao seletor de arquivos', () => {
  /**
   * O `expo-document-picker` converte cada tipo com `UTType(mimeType:)` e
   * descarta com `compactMap` o que não converter. Uma lista de UTIs vira uma
   * lista vazia, e o `UIDocumentPickerViewController` abre com **nada
   * selecionável** — o usuário vê as próprias músicas acinzentadas.
   *
   * Como o defeito é o formato de uma constante, e não um comportamento, o
   * teste lê o fonte.
   */
  const arquivos = [
    join(SRC, 'services', 'file', 'file-importer.ts'),
    join(SRC, 'hooks', 'use-playlist-transfer.ts'),
  ];

  it('usa MIME types, nunca UTIs', () => {
    const ofensores: string[] = [];

    for (const arquivo of arquivos) {
      const fonte = readFileSync(arquivo, 'utf8');
      for (const bloco of fonte.matchAll(
        /type:\s*(\[[\s\S]*?\])|ACCEPTED_TYPES\s*=\s*(\[[\s\S]*?\])/g,
      )) {
        const lista = bloco[1] ?? bloco[2];
        for (const tipo of lista.matchAll(/'([^']+)'/g)) {
          const valor = tipo[1];
          // Um MIME type sempre tem barra; um UTI é pontuado (`public.audio`).
          if (!valor.includes('/')) {
            ofensores.push(`${arquivo.slice(SRC.length + 1)}: "${valor}"`);
          }
        }
      }
    }

    assert.deepEqual(
      ofensores,
      [],
      `estes tipos não são MIME e o seletor os descartaria:\n  ${ofensores.join('\n  ')}`,
    );
  });

  it('a lista de áudio cobre o guarda-chuva `audio/*`', () => {
    // Se todos os específicos forem descartados por o iOS não conhecê-los,
    // é `audio/*` que mantém o seletor utilizável.
    const fonte = readFileSync(arquivos[0], 'utf8');
    assert.match(fonte, /'audio\/\*'/);
  });
});
