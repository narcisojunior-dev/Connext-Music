import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import {
  buildFolderTree,
  collectFolderTracks,
  findFolder,
  folderTrail,
  ROOT_FOLDER_LABEL,
} from '@/services/library/folders';
import { folderPathOf } from '@/services/file/file-scanner';
import type { Track } from '@/types/track';

function track(id: string, folderPath: string, title = id): Track {
  return {
    id,
    url: `file:///Documents/${folderPath ? folderPath + '/' : ''}${id}.mp3`,
    title,
    artist: 'A',
    album: 'B',
    genre: '',
    year: null,
    trackNumber: null,
    duration: 100,
    artwork: null,
    fileName: `${id}.mp3`,
    fileSize: 1,
    extension: '.mp3',
    modifiedDate: 0,
    playCount: 0,
    lastPlayedAt: null,
    isFavorite: false,
    addedAt: 0,
    folderPath,
  } as Track;
}

describe('caminho da pasta a partir do uri', () => {
  const docs = 'file:///var/mobile/Containers/Data/Application/ABC/Documents';

  test('faixa na raiz não tem pasta', () => {
    assert.equal(folderPathOf(`${docs}/musica.mp3`, docs), '');
  });

  test('um nível', () => {
    assert.equal(folderPathOf(`${docs}/Rock/musica.mp3`, docs), 'Rock');
  });

  test('vários níveis', () => {
    assert.equal(folderPathOf(`${docs}/MPB/1970/musica.mp3`, docs), 'MPB/1970');
  });

  test('aceita a raiz com barra no fim', () => {
    assert.equal(folderPathOf(`${docs}/Rock/m.mp3`, `${docs}/`), 'Rock');
  });

  test('decodifica acento e espaço vindos do uri', () => {
    assert.equal(folderPathOf(`${docs}/Shows%20ao%20vivo/m.mp3`, docs), 'Shows ao vivo');
    assert.equal(folderPathOf(`${docs}/Cl%C3%A1ssica/m.mp3`, docs), 'Clássica');
  });

  test('arquivo fora de Documents não inventa pasta', () => {
    assert.equal(folderPathOf('file:///outro/lugar/m.mp3', docs), '');
  });
});

describe('árvore de pastas', () => {
  test('a coleção do critério de aceite aparece com as três pastas', () => {
    const tree = buildFolderTree([track('a', 'Rock'), track('b', 'MPB/1970'), track('c', 'Shows')]);

    assert.deepEqual(
      tree.children.map((c) => c.name),
      ['MPB/1970', 'Rock', 'Shows'],
    );
  });

  test('faixas na raiz ficam num nó próprio, sem pasta inventada', () => {
    const tree = buildFolderTree([track('a', ''), track('b', 'Rock')]);

    assert.equal(tree.name, ROOT_FOLDER_LABEL);
    assert.deepEqual(
      tree.tracks.map((t) => t.id),
      ['a'],
    );
    assert.equal(tree.children.length, 1);
  });

  test('conta as faixas de tudo que está abaixo', () => {
    const tree = buildFolderTree([
      track('a', 'Rock'),
      track('b', 'Rock/Anos 80'),
      track('c', 'Rock/Anos 90'),
      track('d', ''),
    ]);

    assert.equal(tree.totalTracks, 4);
    const rock = tree.children.find((c) => c.name === 'Rock')!;
    assert.equal(rock.totalTracks, 3);
    assert.equal(rock.tracks.length, 1, 'só a faixa solta em Rock/ conta como própria');
  });

  test('colapsa pasta de passagem', () => {
    // `MPB/` só contém `1970/` e nada solto: navegar exigiria um toque a mais
    // por um nível que não organiza nada.
    const tree = buildFolderTree([track('a', 'MPB/1970')]);

    assert.equal(tree.children.length, 1);
    assert.equal(tree.children[0].name, 'MPB/1970');
    assert.equal(tree.children[0].path, 'MPB/1970');
  });

  test('colapsa vários níveis seguidos', () => {
    const tree = buildFolderTree([track('a', 'a/b/c')]);
    assert.equal(tree.children[0].name, 'a/b/c');
  });

  test('não colapsa quando o nível tem faixa própria', () => {
    const tree = buildFolderTree([track('a', 'MPB'), track('b', 'MPB/1970')]);

    const mpb = tree.children[0];
    assert.equal(mpb.name, 'MPB');
    assert.equal(mpb.children.length, 1);
    assert.equal(mpb.children[0].name, '1970');
  });

  test('não colapsa quando há duas subpastas', () => {
    const tree = buildFolderTree([track('a', 'MPB/1970'), track('b', 'MPB/1980')]);

    assert.equal(tree.children[0].name, 'MPB');
    assert.equal(tree.children[0].children.length, 2);
  });

  test('ordena ignorando acento', () => {
    const tree = buildFolderTree([track('a', 'Zabumba'), track('b', 'Água'), track('c', 'Bossa')]);

    assert.deepEqual(
      tree.children.map((c) => c.name),
      ['Água', 'Bossa', 'Zabumba'],
    );
  });

  test('biblioteca vazia devolve uma raiz vazia, sem quebrar', () => {
    const tree = buildFolderTree([]);
    assert.equal(tree.totalTracks, 0);
    assert.deepEqual(tree.children, []);
  });

  test('faixa sem folderPath (biblioteca de schema antigo) cai na raiz', () => {
    const semCampo = { ...track('a', ''), folderPath: undefined } as unknown as Track;
    const tree = buildFolderTree([semCampo]);
    assert.equal(tree.tracks.length, 1);
  });
});

describe('navegação', () => {
  const tree = buildFolderTree([
    track('a', 'Rock'),
    track('b', 'Rock/Anos 80'),
    track('c', 'MPB/1970'),
    track('d', ''),
  ]);

  test('encontra um nó pelo caminho', () => {
    assert.equal(findFolder(tree, 'Rock')?.name, 'Rock');
    assert.equal(findFolder(tree, 'Rock/Anos 80')?.name, 'Anos 80');
    assert.equal(findFolder(tree, '')?.name, ROOT_FOLDER_LABEL);
  });

  test('encontra um nó colapsado pelo caminho completo', () => {
    // O nó fundido não corresponde a nenhum nível intermediário, então buscar
    // dividindo o caminho por `/` falharia.
    assert.equal(findFolder(tree, 'MPB/1970')?.name, 'MPB/1970');
    assert.equal(findFolder(tree, 'MPB'), null);
  });

  test('caminho inexistente devolve null', () => {
    assert.equal(findFolder(tree, 'Jazz'), null);
  });

  test('o trilho vai da raiz até o nó', () => {
    assert.deepEqual(
      folderTrail(tree, 'Rock/Anos 80').map((n) => n.path),
      ['', 'Rock', 'Rock/Anos 80'],
    );
  });

  test('tocar numa pasta enfileira o que está abaixo dela também', () => {
    const rock = findFolder(tree, 'Rock')!;
    assert.deepEqual(
      collectFolderTracks(rock).map((t) => t.id),
      ['a', 'b'],
    );
  });
});

/**
 * Importar precisa estar ao alcance na aba Pastas.
 *
 * Antes ele só existia na tela de biblioteca vazia — que some para sempre
 * depois da primeira pasta — e em Ajustes, onde ninguém procura na hora de
 * trazer a segunda. O teste lê o fonte porque o que se garante é a ligação
 * entre a tela e o componente, não um comportamento executável.
 */
describe('atalho de importar na aba Pastas', () => {
  const read = (rel: string) => readFileSync(join(import.meta.dirname, '..', 'src', rel), 'utf8');

  test('FolderList expõe o botão de importar', () => {
    const code = read(join('components', 'library', 'FolderList.tsx'));
    assert.match(code, /onImport/);
    assert.match(code, /Importar pasta/);
  });

  test('a tela da biblioteca liga o botão ao seletor de arquivos', () => {
    const code = read(join('app', '(tabs)', 'index.tsx'));
    assert.match(code, /onImport=\{importWithPrompt\}/);
  });
});
