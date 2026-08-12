import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  buildSearchIndex,
  isEmptyResults,
  normalizeSearch,
  searchLibrary,
  splitHighlight,
} from '@/utils/search';
import type { Track } from '@/types/track';

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

const BIBLIOTECA = [
  track({ title: 'Coração Partido', artist: 'João Café', album: 'Travessia', genre: 'Bossa Nova' }),
  track({ title: 'Luar do Sertão', artist: 'Ana Vilar', album: 'Raízes', genre: 'Folk' }),
  track({ title: 'Aluado', artist: 'Trio Norte', album: 'Noite', genre: 'Jazz' }),
  track({ title: 'Samba de Verão', artist: 'João Café', album: 'Travessia', genre: 'Bossa Nova' }),
];
const INDICE = buildSearchIndex(BIBLIOTECA);
const busca = (q: string, o = {}) => searchLibrary(INDICE, q, o);

describe('normalização', () => {
  test('remove acentos e baixa a caixa', () => {
    assert.equal(normalizeSearch('CORAÇÃO'), 'coracao');
    assert.equal(normalizeSearch('João Café'), 'joao cafe');
    assert.equal(normalizeSearch('  Ímã  '), 'ima');
  });
});

describe('busca', () => {
  test('encontra sem acento o que está acentuado', () => {
    // O caso central em português: ninguém acentua ao buscar no teclado do iPhone.
    const r = busca('coracao');
    assert.equal(r.tracks.length, 1);
    assert.equal(r.tracks[0].title, 'Coração Partido');
  });

  test('encontra por artista, álbum e gênero', () => {
    assert.equal(busca('joao').tracks.length, 2);
    assert.equal(busca('travessia').tracks.length, 2);
    assert.equal(busca('bossa').tracks.length, 2);
  });

  test('termo vazio não devolve a biblioteca inteira', () => {
    assert.ok(isEmptyResults(busca('')));
    assert.ok(isEmptyResults(busca('   ')));
  });

  test('casar do início vence casar no meio', () => {
    // "Luar" começa com "lua"; "Aluado" só contém.
    const titulos = busca('lua').tracks.map((t) => t.title);
    assert.deepEqual(titulos, ['Luar do Sertão', 'Aluado']);
  });

  test('título pesa mais que artista', () => {
    const lib = [
      track({ title: 'Norte', artist: 'Outro', album: 'X', genre: '' }),
      track({ title: 'Outra', artist: 'Trio Norte', album: 'X', genre: '' }),
    ];
    const r = searchLibrary(buildSearchIndex(lib), 'norte');
    assert.equal(r.tracks[0].title, 'Norte', 'o título deve vir primeiro');
  });
});

describe('agrupamento', () => {
  test('artistas e álbuns só entram quando o nome casa', () => {
    // "coracao" casa só o título; a seção de artistas não deve herdar "João Café".
    const r = busca('coracao');
    assert.equal(r.artists.length, 0);
    assert.equal(r.albums.length, 0);
  });

  test('artista casado aparece uma vez, com todas as suas faixas', () => {
    const r = busca('joao');
    assert.equal(r.artists.length, 1);
    assert.equal(r.artists[0].name, 'João Café');
    assert.equal(r.artists[0].tracks.length, 2);
  });

  test('álbum casado agrega as faixas', () => {
    const r = busca('travessia');
    assert.equal(r.albums.length, 1);
    assert.equal(r.albums[0].tracks.length, 2);
  });

  test('gênero aparece sem duplicar', () => {
    assert.deepEqual(busca('bossa').genres, ['Bossa Nova']);
  });
});

describe('filtros', () => {
  test('cada filtro esvazia as demais seções', () => {
    const r = busca('joao', { filter: 'artists' as const });
    assert.equal(r.artists.length, 1);
    assert.equal(r.tracks.length, 0, 'músicas devem sair quando o filtro é artistas');
  });

  test('filtro "all" mantém todas as seções', () => {
    const r = busca('joao', { filter: 'all' as const });
    assert.ok(r.tracks.length > 0 && r.artists.length > 0);
  });
});

describe('ordenação', () => {
  test('alfabética ignora a relevância', () => {
    const titulos = busca('a', { sort: 'alphabetical' as const }).tracks.map((t) => t.title);
    assert.deepEqual(
      titulos,
      [...titulos].sort((x, y) => x.localeCompare(y, 'pt-BR')),
    );
  });

  test('recente ordena por data de modificação, da mais nova para a mais antiga', () => {
    const lib = [
      track({ title: 'Antiga', artist: 'Z', modifiedDate: 100 }),
      track({ title: 'Nova', artist: 'Z', modifiedDate: 900 }),
    ];
    const r = searchLibrary(buildSearchIndex(lib), 'z', { sort: 'recent' });
    assert.deepEqual(
      r.tracks.map((t) => t.title),
      ['Nova', 'Antiga'],
    );
  });

  test('filtro e ordenação funcionam juntos', () => {
    const r = busca('a', { filter: 'tracks' as const, sort: 'alphabetical' as const });
    assert.ok(r.tracks.length > 0);
    assert.equal(r.artists.length, 0);
  });
});

describe('destaque do termo', () => {
  test('destaca o trecho acentuado quando a busca vem sem acento', () => {
    // O trecho devolvido é do texto original, não do normalizado.
    const partes = splitHighlight('Coração Partido', 'coracao');
    assert.deepEqual(partes, [
      { text: 'Coração', match: true },
      { text: ' Partido', match: false },
    ]);
  });

  test('espaço à esquerda não desloca os índices', () => {
    // `trim()` na normalização quebraria o alinhamento com o texto original.
    const partes = splitHighlight('  Luar', 'luar');
    assert.deepEqual(partes, [
      { text: '  ', match: false },
      { text: 'Luar', match: true },
    ]);
  });

  test('destaca todas as ocorrências', () => {
    const partes = splitHighlight('la la la', 'la');
    assert.equal(partes.filter((p) => p.match).length, 3);
  });

  test('sem termo, devolve o texto inteiro sem destaque', () => {
    assert.deepEqual(splitHighlight('Qualquer', ''), [{ text: 'Qualquer', match: false }]);
  });

  test('os trechos recompõem exatamente o texto original', () => {
    const original = 'Ímã de Coração';
    const partes = splitHighlight(original, 'a');
    assert.equal(partes.map((p) => p.text).join(''), original);
  });
});

describe('desempenho', () => {
  test('1000 faixas buscam em menos de 100ms', () => {
    const muitas = Array.from({ length: 1000 }, (_, i) =>
      track({ title: `Faixa ${i}`, artist: `Artista ${i % 50}`, album: `Álbum ${i % 100}` }),
    );
    const indice = buildSearchIndex(muitas);

    const inicio = Date.now();
    const r = searchLibrary(indice, 'artista 7');
    const decorrido = Date.now() - inicio;

    assert.ok(r.tracks.length > 0);
    assert.ok(decorrido < 100, `buscou em ${decorrido}ms, limite 100ms`);
  });
});
